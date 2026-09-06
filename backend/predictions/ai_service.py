"""
AI Service for Habitability Predictions
=======================================

Thin layer between the Django views and api/habitability_scorer.py. Owns the
singleton scorer and the explainability stack (SHAP, with a LIME fallback and
a deterministic last resort).

Explainability operates on the 25-feature vector defined in api/physics.py.
Because that vector is fully populated from the nine observables the API
accepts, attributions refer to quantities the user actually supplied or that
were derived from them - not to zero-filled placeholder columns.
"""

import logging
from pathlib import Path
import sys

import numpy as np
import pandas as pd

backend_path = Path(__file__).resolve().parent.parent
if str(backend_path) not in sys.path:
    sys.path.insert(0, str(backend_path))

from api import physics as P
from api.habitability_scorer import HabitabilityScorer

logger = logging.getLogger(__name__)

_scorer = None
_shap_module = None
_shap_import_attempted = False
_lime_module = None
_lime_import_attempted = False


# --- Feature presentation ----------------------------------------------------

FEATURE_LABELS = {
    'pl_rade': 'Planet Radius',
    'pl_eqt': 'Equilibrium Temperature',
    'pl_insol': 'Insolation Flux',
    'pl_orbper': 'Orbital Period',
    'pl_orbsmax': 'Orbital Distance',
    'pl_orbeccen': 'Orbital Eccentricity',
    'st_teff': 'Star Temperature',
    'st_rad': 'Star Radius',
    'st_mass': 'Star Mass',
    'st_lum': 'Star Luminosity',
    'pl_orbper_log': 'Orbital Period (log)',
    'pl_orbsmax_log': 'Orbital Distance (log)',
    'pl_insol_log': 'Insolation Flux (log)',
    'planet_star_radius_ratio': 'Planet/Star Radius Ratio',
    'orbit_stellar_radii': 'Orbit Size in Stellar Radii',
    'hz_position': 'Position in Habitable Zone',
}


def _format_feature_name(feature_name):
    """Readable label for a feature key."""
    if feature_name in FEATURE_LABELS:
        return FEATURE_LABELS[feature_name]
    if feature_name.startswith('imputed_'):
        base = feature_name[len('imputed_'):]
        return f"{FEATURE_LABELS.get(base, base)} was estimated"
    return feature_name.replace('_', ' ').title()


def _get_shap_module():
    """Lazy-load SHAP; import failures must not break prediction."""
    global _shap_module, _shap_import_attempted
    if _shap_import_attempted:
        return _shap_module
    _shap_import_attempted = True
    try:
        import shap  # pylint: disable=import-outside-toplevel
        _shap_module = shap
    except BaseException as exc:  # pragma: no cover - environment-specific
        logger.warning(f"SHAP unavailable, falling back: {exc}")
        _shap_module = None
    return _shap_module


def _get_lime_module():
    """Lazy-load LIME."""
    global _lime_module, _lime_import_attempted
    if _lime_import_attempted:
        return _lime_module
    _lime_import_attempted = True
    try:
        from lime import lime_tabular  # pylint: disable=import-outside-toplevel
        _lime_module = lime_tabular
    except BaseException as exc:  # pragma: no cover - environment-specific
        logger.warning(f"LIME unavailable, falling back: {exc}")
        _lime_module = None
    return _lime_module


# --- Service lifecycle -------------------------------------------------------

def get_scorer():
    """Singleton HabitabilityScorer, or None if the models failed to load."""
    global _scorer
    if _scorer is None:
        try:
            logger.info("Initializing HabitabilityScorer...")
            _scorer = HabitabilityScorer()
            if not _scorer.models:
                logger.error("HabitabilityScorer loaded no models.")
                _scorer = None
            else:
                logger.info(f"HabitabilityScorer ready: {sorted(_scorer.models)}")
        except Exception as exc:
            logger.error(f"Failed to initialize HabitabilityScorer: {exc}")
            _scorer = None
    return _scorer


def is_service_available():
    """True when at least one model is loaded and ready."""
    scorer = get_scorer()
    return scorer is not None and bool(scorer.models)


def predict_single(planet_params, mission='auto'):
    """Score one planet. Raises RuntimeError if no model is loaded."""
    scorer = get_scorer()
    if scorer is None:
        raise RuntimeError("AI service is not available. Models not loaded.")
    return scorer.predict_habitability(planet_params, mission=mission)


def predict_batch(planets_list, mission='auto'):
    """Score many planets, isolating per-row failures."""
    scorer = get_scorer()
    if scorer is None:
        raise RuntimeError("AI service is not available. Models not loaded.")

    results = []
    for index, planet_params in enumerate(planets_list):
        try:
            result = scorer.predict_habitability(dict(planet_params), mission=mission)
            result['planet_index'] = index
            result['success'] = True
        except Exception as exc:
            logger.error(f"Error predicting planet {index}: {exc}")
            result = {'planet_index': index, 'success': False, 'error': str(exc)}
        results.append(result)
    return results


def get_models_info():
    """Describe the loaded models, including their honest evaluation numbers."""
    scorer = get_scorer()
    if scorer is None:
        return {'models_loaded': 0, 'missions': [], 'status': 'unavailable'}

    models_data = {}
    for key, metadata in scorer.metadata.items():
        evaluation = metadata.get('evaluation', {})
        models_data[key] = {
            'model_type': metadata.get('model_type'),
            'is_default': bool(metadata.get('is_unified')),
            'features_count': metadata.get('n_features'),
            'training_objects': metadata.get('total_samples'),
            'class_distribution': metadata.get('class_distribution'),
            'oof_macro_f1': evaluation.get('oof_macro_f1'),
            'evaluation_protocol': evaluation.get('protocol'),
        }

    return {
        'models_loaded': len(scorer.models),
        'default_model': scorer.resolve_model_key('auto'),
        'missions': sorted(scorer.models),
        'models': models_data,
        'feature_names': list(P.FEATURE_ORDER),
        'blend': {
            'ml_weight': scorer.ml_weight,
            'physics_weight': round(scorer.physics_weight, 4),
            'thresholds': {
                'habitability_zone': scorer.threshold_hz,
                'potentially_habitable': scorer.threshold_ph,
            },
        },
        'label_source': 'rule-based physics proxy; see /api/models/report/',
        'status': 'operational',
    }


def get_model_report(mission='auto'):
    """Full evaluation record for the model in use."""
    scorer = get_scorer()
    if scorer is None:
        return {'status': 'unavailable'}
    return scorer.model_report(mission)


# --- Explainability ----------------------------------------------------------

def _resolve_shap_values(raw_shap_values, target_index, feature_count):
    """Normalise SHAP output across model types and SHAP versions."""
    if hasattr(raw_shap_values, 'values'):
        raw_shap_values = raw_shap_values.values

    if isinstance(raw_shap_values, list):
        if not raw_shap_values:
            return None
        index = target_index if target_index < len(raw_shap_values) else 0
        return np.asarray(raw_shap_values[index]).ravel()

    array = np.asarray(raw_shap_values)

    if array.ndim == 3:
        # (samples, features, classes)
        if array.shape[1] == feature_count and array.shape[2] > target_index:
            return array[0, :, target_index].ravel()
        # (samples, classes, features)
        if array.shape[2] == feature_count and array.shape[1] > target_index:
            return array[0, target_index, :].ravel()
        if array.shape[1] == feature_count:
            return array[0, :, 0].ravel()
        if array.shape[2] == feature_count:
            return array[0, 0, :].ravel()
        return None

    if array.ndim == 2:
        return array[0].ravel()
    if array.ndim == 1:
        return array.ravel()
    return None


def _target_index(encoder, class_name='POTENTIALLY_HABITABLE'):
    """Index of the class explanations are computed for."""
    classes = list(encoder.classes_)
    if class_name in classes:
        return classes.index(class_name)
    return len(classes) - 1


def _build_lime_background(vector, samples=256):
    """Stable local neighbourhood around the scaled input for LIME."""
    base = np.nan_to_num(np.asarray(vector).ravel().astype(float),
                         nan=0.0, posinf=1.0, neginf=0.0)
    rng = np.random.default_rng(42)
    neighbourhood = rng.uniform(0.0, 1.0, size=(samples, len(base)))
    local = max(samples // 2, 1)
    neighbourhood[:local] = np.tile(base, (local, 1)) + rng.normal(
        0.0, 0.15, size=(local, len(base)))
    neighbourhood[0] = base
    return np.clip(np.nan_to_num(neighbourhood, nan=0.0, posinf=1.0, neginf=0.0),
                   0.0, 1.0)


def _rank(features):
    """Sort by absolute importance and trim near-zero noise."""
    ranked = sorted(features, key=lambda item: item['importance'], reverse=True)
    return [item for item in ranked if item['importance'] > 1e-6][:10]


def _fallback_ranked_features(resolved_params):
    """
    Deterministic attribution when SHAP and LIME are both unavailable.

    Ranks the observables by how far each sits from its Earth value, in units
    of a plausible spread. Crude, but it never lies about which input drove an
    extreme score.
    """
    earth_reference = {
        'pl_rade': (1.0, 2.5), 'pl_eqt': (255.0, 400.0), 'pl_insol': (1.0, 3.0),
        'pl_orbper': (365.25, 2000.0), 'pl_orbsmax': (1.0, 2.0),
        'st_teff': (5772.0, 2200.0), 'st_rad': (1.0, 1.5), 'st_mass': (1.0, 1.2),
    }
    ranked = []
    for key, (earth_value, spread) in earth_reference.items():
        if resolved_params.get(key) is None:
            continue
        deviation = abs(float(resolved_params[key]) - earth_value) / max(spread, 1e-9)
        ranked.append({
            'feature_key': key,
            'feature': _format_feature_name(key),
            'importance': round(float(min(deviation, 1.0)), 6),
            'impact_direction': 'supports' if deviation <= 0.15 else 'reduces',
            'raw_shap': 0.0,
        })
    return sorted(ranked, key=lambda item: item['importance'], reverse=True)[:8]


def _natural_language_explanation(result, ranked_features):
    """One-paragraph summary of the prediction."""
    classification = result.get('classification', 'UNKNOWN').replace('_', ' ').title()
    score_pct = (result.get('habitability_score') or 0.0) * 100
    factors = result.get('contributing_factors', {})

    supports = [item['feature'] for item in ranked_features
                if item.get('impact_direction') == 'supports'][:2]
    reduces = [item['feature'] for item in ranked_features
               if item.get('impact_direction') == 'reduces'][:2]

    sentences = [
        f"This planet scores {score_pct:.1f}% and is classified as {classification}.",
        (f"The score combines the classifier "
         f"({factors.get('ml_weight', 0):.0%} weight, raw {factors.get('ml_score', 0):.2f}) "
         f"with the physics model "
         f"({factors.get('physics_weight', 0):.0%} weight, raw "
         f"{factors.get('physics_score', 0):.2f})."),
    ]
    if supports:
        sentences.append(f"Strongest support comes from {', '.join(supports)}.")
    if reduces:
        sentences.append(f"The largest downward pull comes from {', '.join(reduces)}.")

    derived = result.get('derived_parameters') or []
    if derived:
        readable = ', '.join(_format_feature_name(key) for key in derived[:3])
        sentences.append(
            f"Note that {readable} "
            f"{'was' if len(derived) == 1 else 'were'} derived from other inputs "
            f"rather than measured, so this prediction carries extra uncertainty.")
    return ' '.join(sentences)


def explain_single(planet_params, mission='auto', explanation_method='auto'):
    """Prediction plus per-feature attributions."""
    scorer = get_scorer()
    if scorer is None:
        raise RuntimeError("AI service is not available. Models not loaded.")

    result = scorer.predict_habitability(planet_params, mission=mission)

    key = scorer.resolve_model_key(mission)
    model = scorer.models[key]
    encoder = scorer.encoders[key]
    feature_names = list(P.FEATURE_ORDER)

    frame, _, resolved, _ = scorer.build_feature_frame(planet_params)
    scaled = pd.DataFrame(scorer.scalers[key].transform(frame), columns=feature_names)
    scaled_vector = scaled.to_numpy()[0]
    target = _target_index(encoder)

    requested = str(explanation_method or 'auto').lower()
    if requested not in {'auto', 'shap', 'lime', 'fallback'}:
        requested = 'auto'

    ranked_features = []
    method_used = 'fallback'

    if requested in {'auto', 'shap'}:
        shap_module = _get_shap_module()
        if shap_module is not None:
            try:
                explainer = shap_module.TreeExplainer(model)
                values = _resolve_shap_values(
                    explainer.shap_values(scaled), target, len(feature_names))
                if values is not None and len(values) == len(feature_names):
                    ranked_features = _rank([{
                        'feature_key': name,
                        'feature': _format_feature_name(name),
                        'importance': round(float(abs(value)), 6),
                        'impact_direction': 'supports' if value >= 0 else 'reduces',
                        'raw_shap': round(float(value), 6),
                    } for name, value in zip(feature_names, values)])
                    if ranked_features:
                        method_used = 'shap'
            except Exception as exc:
                logger.warning(f"SHAP explainability failed: {exc}")

    if not ranked_features and requested in {'auto', 'lime'}:
        lime_module = _get_lime_module()
        if lime_module is not None:
            try:
                class_names = [str(label) for label in encoder.classes_]
                explainer = lime_module.LimeTabularExplainer(
                    training_data=_build_lime_background(scaled_vector),
                    feature_names=feature_names, class_names=class_names,
                    mode='classification', discretize_continuous=False,
                    random_state=42,
                )
                explanation = explainer.explain_instance(
                    scaled_vector, model.predict_proba, labels=[target],
                    num_features=min(12, len(feature_names)), num_samples=4000,
                )
                ranked_features = _rank([{
                    'feature_key': feature_names[index],
                    'feature': _format_feature_name(feature_names[index]),
                    'importance': round(abs(float(weight)), 6),
                    'impact_direction': 'supports' if weight >= 0 else 'reduces',
                    'raw_shap': round(float(weight), 6),
                } for index, weight in explanation.local_exp.get(target, [])
                    if 0 <= index < len(feature_names)])
                if ranked_features:
                    method_used = 'lime'
            except Exception as exc:
                logger.warning(f"LIME explainability failed: {exc}")

    if not ranked_features or requested == 'fallback':
        ranked_features = _fallback_ranked_features(resolved)
        method_used = 'fallback'

    return {
        **result,
        'feature_importance': ranked_features,
        'natural_language_explanation': _natural_language_explanation(
            result, ranked_features),
        'explanation_method': method_used,
        'requested_explanation_method': requested,
    }
