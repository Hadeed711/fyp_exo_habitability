"""
Habitability Scorer
===================

Serving-side entry point for habitability prediction. Combines:

  1. A trained classifier (api/physics.py features -> 3-class posterior)
  2. A deterministic physics score (api/scoring.py)

into one continuous 0-1 habitability score and a class label.

Why a hybrid
------------
The classifier is trained against a documented physics rule
(physics.LABEL_RULE), so on complete inputs it largely reproduces that rule.
Its value is elsewhere: it degrades gracefully when observables are missing,
where the rule simply cannot be evaluated (measured in
models/reports/degraded_input_robustness.csv - with four of eight observables
withheld the rule is undefined for 95% of objects while the model still calls
98% of them correctly).

The physics score contributes a smooth, hand-auditable ranking that the
discrete rule does not provide, and keeps the displayed number anchored to
something a reviewer can verify with a calculator.

The blend weight and the class thresholds are NOT hand-picked. They are
selected by scripts/calibrate_blend.py to maximise macro-F1 against the
physics label over all catalogue objects, using out-of-fold classifier
probabilities, and are loaded from models/reports/blend_calibration.json.

Train/serve alignment
---------------------
Features come from api/physics.build_features, the exact function the
training pipeline calls. The feature vector is always complete and finite -
there is no zero-filling of absent columns, because every feature is
computable from the nine observables the API accepts.

Usage:
    from api.habitability_scorer import HabitabilityScorer
    scorer = HabitabilityScorer()
    result = scorer.predict_habitability({'pl_rade': 1.0, 'pl_eqt': 255, ...})
"""

import json
import logging
import pickle
from pathlib import Path

import numpy as np
import pandas as pd

from . import physics as P
from . import scoring as S

logger = logging.getLogger(__name__)

# Used only if models/reports/blend_calibration.json is absent, so the API
# still starts on a fresh checkout. Values mirror the committed calibration.
DEFAULT_CALIBRATION = {
    'ml_weight': 0.50,
    'threshold_habitability_zone': 0.30,
    'threshold_potentially_habitable': 0.66,
    'source': 'built-in default (calibration file not found)',
}

# 'unified' is the pooled model and the default. The per-mission models are
# ablations, kept so the UI can offer them and so the leave-one-mission-out
# comparison in the report is reproducible.
UNIFIED_KEY = 'unified'
MISSION_KEYS = ['k2', 'kepler', 'tess']
ALL_MODEL_KEYS = [UNIFIED_KEY] + MISSION_KEYS


class HabitabilityScorer:
    """Loads the trained models and scores planets."""

    def __init__(self, models_dir=None, artifacts_dir=None, calibration_path=None):
        project_root = Path(__file__).resolve().parent.parent.parent
        self.models_dir = Path(models_dir) if models_dir else project_root / 'models'
        self.artifacts_dir = Path(artifacts_dir) if artifacts_dir else project_root / 'artifacts'
        self.calibration_path = Path(calibration_path) if calibration_path else (
            project_root / 'models' / 'reports' / 'blend_calibration.json')

        self.models = {}
        self.scalers = {}
        self.encoders = {}
        self.metadata = {}

        self.calibration = self._load_calibration()
        self.ml_weight = float(self.calibration['ml_weight'])
        self.physics_weight = 1.0 - self.ml_weight
        self.threshold_hz = float(self.calibration['threshold_habitability_zone'])
        self.threshold_ph = float(self.calibration['threshold_potentially_habitable'])

        self._load_models()

    # --- Loading -------------------------------------------------------------

    def _load_calibration(self):
        try:
            with open(self.calibration_path, 'r', encoding='utf-8') as handle:
                payload = json.load(handle)
            required = ('ml_weight', 'threshold_habitability_zone',
                        'threshold_potentially_habitable')
            if all(key in payload for key in required):
                payload.setdefault('source', str(self.calibration_path))
                return payload
            logger.warning("Calibration file incomplete; using built-in defaults.")
        except FileNotFoundError:
            logger.info("No calibration file; using built-in defaults.")
        except (json.JSONDecodeError, OSError) as exc:
            logger.warning(f"Could not read calibration ({exc}); using defaults.")
        return dict(DEFAULT_CALIBRATION)

    def _load_models(self):
        for key in ALL_MODEL_KEYS:
            model_file = self.models_dir / f'{key}_model.pkl'
            art = self.artifacts_dir / key
            try:
                with open(model_file, 'rb') as handle:
                    model = pickle.load(handle)
                with open(art / f'{key}_minmax_scaler.pkl', 'rb') as handle:
                    scaler = pickle.load(handle)
                with open(art / f'{key}_label_encoder.pkl', 'rb') as handle:
                    encoder = pickle.load(handle)
                with open(art / f'{key}_metadata.pkl', 'rb') as handle:
                    metadata = pickle.load(handle)
            except FileNotFoundError as exc:
                logger.warning(f"Model '{key}' unavailable: {exc}")
                continue
            except Exception as exc:  # pragma: no cover - corrupt artefact
                logger.error(f"Failed to load model '{key}': {exc}")
                continue

            # A model whose feature list does not match the shared physics
            # module is stale. Refusing it here is what makes train/serve skew
            # impossible rather than merely unlikely.
            trained_features = list(metadata.get('feature_names', []))
            if trained_features != list(P.FEATURE_ORDER):
                logger.error(
                    f"Model '{key}' was trained on a different feature set "
                    f"({len(trained_features)} features vs {P.N_FEATURES}). "
                    f"Refusing to load it - rerun scripts/train_models.py."
                )
                continue

            self.models[key] = model
            self.scalers[key] = scaler
            self.encoders[key] = encoder
            self.metadata[key] = metadata

        if not self.models:
            logger.error("No habitability models could be loaded.")
        else:
            logger.info(f"Loaded models: {', '.join(sorted(self.models))}")

    @property
    def is_ready(self):
        return UNIFIED_KEY in self.models or bool(self.models)

    # --- Model selection -----------------------------------------------------

    def resolve_model_key(self, mission='auto'):
        """
        Pick which model to use.

        'auto' means the pooled model, which is the default and the one the
        reported metrics describe. A named mission selects that ablation if it
        loaded, otherwise falls back to the pooled model.
        """
        key = str(mission or 'auto').strip().lower()
        if key in ('auto', '', 'unified', 'all'):
            return UNIFIED_KEY if UNIFIED_KEY in self.models else next(iter(self.models), None)
        if key in self.models:
            return key
        logger.warning(f"Model '{key}' not loaded; falling back to '{UNIFIED_KEY}'.")
        return UNIFIED_KEY if UNIFIED_KEY in self.models else next(iter(self.models), None)

    # --- Feature preparation -------------------------------------------------

    def build_feature_frame(self, planet_params):
        """
        Build the scaled feature frame for one planet.

        Returns (scaled_frame, raw_vector, resolved_params, imputed_flags).
        """
        vector, resolved, imputed = P.build_features(planet_params)
        frame = pd.DataFrame([vector], columns=P.FEATURE_ORDER)
        return frame, vector, resolved, imputed

    def preprocess_features(self, planet_params, mission='auto'):
        """Scaled numpy feature matrix - used by the explainability layer."""
        key = self.resolve_model_key(mission)
        frame, _, _, _ = self.build_feature_frame(planet_params)
        return self.scalers[key].transform(frame)

    # --- Prediction ----------------------------------------------------------

    def predict_habitability(self, planet_params, mission='auto'):
        """
        Score one planet.

        Accepts any subset of the nine observables in physics.CORE_INPUTS,
        under either canonical (pl_rade) or Kepler (koi_prad) names. Whatever
        is missing is derived from first principles where the physics allows
        and flagged as derived where it does not.
        """
        key = self.resolve_model_key(mission)
        if key is None:
            raise RuntimeError("No habitability model is loaded.")

        frame, _, resolved, imputed = self.build_feature_frame(planet_params)
        scaled = pd.DataFrame(
            self.scalers[key].transform(frame), columns=P.FEATURE_ORDER)

        encoder = self.encoders[key]
        classes = list(encoder.classes_)
        proba = self.models[key].predict_proba(scaled)[0]

        # Index by class name, never by position: a reordered encoder would
        # otherwise silently swap the meaning of every probability.
        probabilities = {name: float(proba[classes.index(name)]) for name in P.CLASS_NAMES}
        prob_ph = probabilities['POTENTIALLY_HABITABLE']
        prob_hz = probabilities['HABITABILITY_ZONE']
        prob_non = probabilities['NON_HABITABLE']

        # Collapse the posterior onto one axis: full credit for potentially
        # habitable, half for habitable-zone, none for non-habitable.
        ml_score = prob_ph * 1.0 + prob_hz * 0.5

        physics_value, physics_breakdown = S.physics_score(resolved, breakdown=True)

        habitability_score = float(np.clip(
            self.ml_weight * ml_score + self.physics_weight * physics_value, 0.0, 1.0))

        if habitability_score >= self.threshold_ph:
            classification = 'POTENTIALLY_HABITABLE'
        elif habitability_score >= self.threshold_hz:
            classification = 'HABITABILITY_ZONE'
        else:
            classification = 'NON_HABITABLE'

        # Confidence is the classifier's posterior for the class that was
        # actually reported, so it can never contradict the label shown.
        confidence = probabilities[classification]

        esi_radius = S.esi_radius(resolved.get('pl_rade'))
        esi_temp = S.esi_temperature(resolved.get('pl_eqt'))
        esi_overall = S.earth_similarity_index(
            resolved.get('pl_rade'), resolved.get('pl_eqt'))

        derived_fields = sorted(k for k, was_derived in imputed.items() if was_derived)

        return {
            'habitability_score': round(habitability_score, 4),
            'classification': classification,
            'confidence': round(float(confidence), 4),

            'probabilities': {
                'non_habitable': round(prob_non, 4),
                'habitability_zone': round(prob_hz, 4),
                'potentially_habitable': round(prob_ph, 4),
            },

            'esi_components': {
                'radius_similarity': round(esi_radius, 4) if esi_radius is not None else None,
                'temperature_similarity': round(esi_temp, 4) if esi_temp is not None else None,
                'flux_similarity': round(physics_breakdown['insol_similarity'], 4),
                'overall_esi': round(esi_overall, 4) if esi_overall is not None else None,
            },

            'contributing_factors': {
                'ml_score': round(ml_score, 4),
                'physics_score': round(physics_value, 4),
                'ml_weight': self.ml_weight,
                'physics_weight': round(self.physics_weight, 4),
                'model_probability_pot_hab': round(prob_ph, 4),
                'model_probability_hz': round(prob_hz, 4),
                'radius_similarity': round(physics_breakdown['radius_similarity'], 4),
                'temp_similarity': round(physics_breakdown['temp_similarity'], 4),
                'insol_similarity': round(physics_breakdown['insol_similarity'], 4),
                'similarity_geometric_mean': physics_breakdown['similarity_geometric_mean'],
                'hz_membership': physics_breakdown['hz_membership'],
                'stellar_factor': physics_breakdown['stellar_factor'],
                'esi_score': round(esi_overall, 4) if esi_overall is not None else None,
            },

            # Everything the score was actually computed from, including the
            # values that were derived rather than supplied. Without this the
            # user cannot tell a measured flux from an inferred one.
            'resolved_parameters': {
                key_name: (round(resolved[key_name], 6)
                           if isinstance(resolved.get(key_name), (int, float)) else None)
                for key_name in P.CORE_INPUTS if resolved.get(key_name) is not None
            },
            'derived_parameters': derived_fields,
            'stellar_type': physics_breakdown['stellar_type'],

            'mission_used': key.upper(),
            'model_type': self.metadata[key].get('model_type', 'unknown'),
            'score_thresholds': {
                'habitability_zone': self.threshold_hz,
                'potentially_habitable': self.threshold_ph,
            },
        }

    def batch_predict(self, planets, mission='auto'):
        """Score a list of parameter dicts or a DataFrame."""
        if isinstance(planets, pd.DataFrame):
            planets = planets.to_dict('records')
        return [self.predict_habitability(dict(p), mission=mission) for p in planets]

    # --- Introspection -------------------------------------------------------

    def model_report(self, mission='auto'):
        """Honest performance figures for the model actually in use."""
        key = self.resolve_model_key(mission)
        if key is None:
            return {}
        metadata = self.metadata[key]
        evaluation = metadata.get('evaluation', {})
        return {
            'model_key': key,
            'model_type': metadata.get('model_type'),
            'is_unified': metadata.get('is_unified', False),
            'n_features': metadata.get('n_features'),
            'training_objects': metadata.get('total_samples'),
            'class_distribution': metadata.get('class_distribution'),
            'evaluation_protocol': evaluation.get('protocol'),
            'oof_macro_f1': evaluation.get('oof_macro_f1'),
            'oof_per_class': evaluation.get('oof_per_class'),
            'degraded_input': evaluation.get('degraded_input'),
            'leave_one_mission_out': evaluation.get('leave_one_mission_out'),
            'label_source': metadata.get('label_source'),
            'caveat': metadata.get('caveat'),
            'blend_calibration': {
                'ml_weight': self.ml_weight,
                'physics_weight': round(self.physics_weight, 4),
                'thresholds': {
                    'habitability_zone': self.threshold_hz,
                    'potentially_habitable': self.threshold_ph,
                },
                'source': self.calibration.get('source'),
                'objective': self.calibration.get('objective'),
                'macro_f1': self.calibration.get('macro_f1'),
            },
        }

    def explain_prediction(self, planet_params, result):
        """Human-readable summary of one prediction."""
        factors = result['contributing_factors']
        derived = result.get('derived_parameters') or []
        lines = [
            "Habitability Analysis",
            "=" * 46,
            f"Score          : {result['habitability_score']:.3f} / 1.000",
            f"Classification : {result['classification'].replace('_', ' ').title()}",
            f"Confidence     : {result['confidence']:.1%}",
            f"Model          : {result['model_type']} ({result['mission_used']})",
            "",
            f"Blend          : {factors['ml_weight']:.0%} classifier "
            f"({factors['ml_score']:.3f}) + {factors['physics_weight']:.0%} physics "
            f"({factors['physics_score']:.3f})",
            "",
            "Physics breakdown",
            "-" * 46,
            f"  Radius similarity      {factors['radius_similarity']:.3f}",
            f"  Temperature similarity {factors['temp_similarity']:.3f}",
            f"  Flux similarity        {factors['insol_similarity']:.3f}",
            f"  Habitable-zone member  {factors['hz_membership']:.3f}",
            f"  Stellar suitability    {factors['stellar_factor']:.3f}",
            f"  Earth Similarity Index {factors['esi_score']}",
        ]
        if derived:
            lines += ["", f"Derived (not measured): {', '.join(derived)}"]
        return "\n".join(lines)
