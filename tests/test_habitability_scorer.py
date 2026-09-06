"""
End-to-end tests for the habitability scorer.

The critical guarantees:
  * train/serve feature alignment (the bug that made the old models useless)
  * Earth classifies as potentially habitable (a regression that shipped once)
  * score and class can never contradict each other
  * every response field the frontend reads is present
"""

import json
import pickle

import numpy as np
import pandas as pd
import pytest

from api import physics as P
from api import scoring as S
from api.habitability_scorer import ALL_MODEL_KEYS, UNIFIED_KEY, HabitabilityScorer

EARTH = {
    'pl_rade': 1.0, 'pl_eqt': 255.0, 'pl_insol': 1.0, 'pl_orbper': 365.25,
    'pl_orbsmax': 1.0, 'st_teff': 5772.0, 'st_rad': 1.0, 'st_mass': 1.0,
}
HOT_JUPITER = {
    'pl_rade': 11.2, 'pl_eqt': 1400.0, 'pl_insol': 900.0, 'pl_orbper': 3.5,
    'pl_orbsmax': 0.045, 'st_teff': 6000.0, 'st_rad': 1.2, 'st_mass': 1.1,
}


# --- Train/serve alignment ---------------------------------------------------

class TestTrainServeAlignment:
    """
    The previous models were trained on 130-270 columns while the API supplied
    9, so 90% of every served vector was a fabricated zero and the scaled input
    contained NaN and values near -5232. These tests make that unrepresentable.
    """

    def test_every_model_matches_the_shared_feature_list(self, scorer):
        assert scorer.models, "no models loaded"
        for key, metadata in scorer.metadata.items():
            assert list(metadata['feature_names']) == list(P.FEATURE_ORDER), (
                f"model '{key}' was trained on a different feature set")
            assert metadata['n_features'] == P.N_FEATURES

    def test_unified_model_is_loaded_and_default(self, scorer):
        assert UNIFIED_KEY in scorer.models
        assert scorer.resolve_model_key('auto') == UNIFIED_KEY
        assert scorer.resolve_model_key('unified') == UNIFIED_KEY

    def test_scaled_vector_is_finite_and_in_range(self, scorer):
        """
        MinMax-scaled features must land in roughly [0, 1]. A wildly
        out-of-range value means the serving path is feeding the model
        something training never saw.
        """
        for params in [EARTH, HOT_JUPITER, {'pl_rade': 1.0}, {}]:
            scaled = scorer.preprocess_features(params)
            assert np.isfinite(scaled).all(), f"non-finite scaled features for {params}"
            assert scaled.min() > -2.0, f"scaled minimum {scaled.min()} far below range"
            assert scaled.max() < 3.0, f"scaled maximum {scaled.max()} far above range"

    def test_stale_model_is_refused_not_silently_used(self, tmp_path, project_root):
        """
        A model trained on an old feature set must be rejected at load time.
        Loading it anyway is precisely how the original skew went unnoticed.
        """
        models_dir = tmp_path / 'models'
        artifacts = tmp_path / 'artifacts' / UNIFIED_KEY
        models_dir.mkdir(parents=True)
        artifacts.mkdir(parents=True)

        real_models = project_root / 'models'
        real_artifacts = project_root / 'artifacts' / UNIFIED_KEY
        (models_dir / f'{UNIFIED_KEY}_model.pkl').write_bytes(
            (real_models / f'{UNIFIED_KEY}_model.pkl').read_bytes())
        for suffix in ('minmax_scaler', 'label_encoder'):
            (artifacts / f'{UNIFIED_KEY}_{suffix}.pkl').write_bytes(
                (real_artifacts / f'{UNIFIED_KEY}_{suffix}.pkl').read_bytes())

        with open(real_artifacts / f'{UNIFIED_KEY}_metadata.pkl', 'rb') as handle:
            metadata = pickle.load(handle)
        metadata['feature_names'] = ['pl_rade', 'in_hz_conservative', 'is_rocky']
        with open(artifacts / f'{UNIFIED_KEY}_metadata.pkl', 'wb') as handle:
            pickle.dump(metadata, handle)

        stale = HabitabilityScorer(models_dir=models_dir,
                                   artifacts_dir=tmp_path / 'artifacts')
        assert UNIFIED_KEY not in stale.models, "stale model was loaded"


# --- Reference planets -------------------------------------------------------

class TestReferencePlanets:
    """Regression guards on the cases a reviewer will type in first."""

    def test_earth_is_potentially_habitable(self, scorer):
        """
        A shipped regression: with redundant similarity features in the model,
        Earth sat outside the training range on all three at once (they
        saturate at exactly 1.0, and no catalogue object reaches 1.0). Earth
        scored HABITABILITY_ZONE while a planet 3% off Earth scored
        POTENTIALLY_HABITABLE.
        """
        result = scorer.predict_habitability(dict(EARTH))
        assert result['classification'] == 'POTENTIALLY_HABITABLE', (
            f"Earth scored {result['habitability_score']} -> "
            f"{result['classification']}")
        assert result['habitability_score'] > 0.75

    def test_earth_neighbourhood_is_continuous(self, scorer):
        """
        No cliff at the reference point: small perturbations around Earth must
        all stay in the same class. This is the test that would have caught the
        extrapolation bug.
        """
        for radius, temperature, flux in [
            (1.00, 255, 1.00), (1.03, 258, 1.02), (1.05, 262, 1.05),
            (1.10, 270, 1.10), (0.95, 250, 0.95), (0.90, 245, 0.90),
        ]:
            result = scorer.predict_habitability({
                **EARTH, 'pl_rade': radius, 'pl_eqt': temperature, 'pl_insol': flux,
            })
            assert result['classification'] == 'POTENTIALLY_HABITABLE', (
                f"R={radius} T={temperature} S={flux} -> "
                f"{result['habitability_score']} {result['classification']}")

    def test_hot_jupiter_is_non_habitable(self, scorer):
        result = scorer.predict_habitability(dict(HOT_JUPITER))
        assert result['classification'] == 'NON_HABITABLE'
        assert result['habitability_score'] < 0.1

    def test_reference_planet_ordering(self, scorer):
        scores = {
            name: scorer.predict_habitability(dict(params))['habitability_score']
            for name, params in S.REFERENCE_PLANETS.items()
        }
        assert scores['Earth'] > scores['Venus (true surface temperature)']
        assert scores['Earth'] > scores['Frozen rock']
        assert scores['Frozen rock'] > scores['Hot Jupiter']

    def test_all_missions_agree_on_the_extremes(self, scorer):
        """Per-mission ablations may differ in detail, never on a hot Jupiter."""
        for key in scorer.models:
            result = scorer.predict_habitability(dict(HOT_JUPITER), mission=key)
            assert result['classification'] == 'NON_HABITABLE', key


# --- Response contract -------------------------------------------------------

class TestResponseContract:
    def test_all_fields_the_frontend_reads_are_present(self, scorer):
        result = scorer.predict_habitability(dict(EARTH))
        for field in ('habitability_score', 'classification', 'confidence',
                      'probabilities', 'esi_components', 'contributing_factors',
                      'mission_used', 'model_type', 'score_thresholds',
                      'resolved_parameters', 'derived_parameters', 'stellar_type'):
            assert field in result, f"missing response field: {field}"

    def test_probabilities_are_a_distribution(self, scorer):
        for params in [EARTH, HOT_JUPITER, {'pl_rade': 2.0}, {}]:
            probabilities = scorer.predict_habitability(params)['probabilities']
            assert set(probabilities) == {
                'non_habitable', 'habitability_zone', 'potentially_habitable'}
            assert sum(probabilities.values()) == pytest.approx(1.0, abs=0.01)
            assert all(0.0 <= value <= 1.0 for value in probabilities.values())

    def test_score_and_class_never_contradict(self, scorer):
        """
        The class is the thresholded score, so they cannot disagree. This
        guards the property the UI depends on: colour band == label.
        """
        rng = np.random.default_rng(0)
        for _ in range(200):
            result = scorer.predict_habitability({
                'pl_rade': float(rng.uniform(0.1, 20)),
                'pl_eqt': float(rng.uniform(50, 2000)),
                'pl_insol': float(rng.uniform(0.001, 1000)),
                'pl_orbper': float(rng.uniform(0.5, 5000)),
                'st_teff': float(rng.uniform(2500, 9000)),
                'st_rad': float(rng.uniform(0.1, 3)),
            })
            score = result['habitability_score']
            thresholds = result['score_thresholds']
            if score >= thresholds['potentially_habitable']:
                expected = 'POTENTIALLY_HABITABLE'
            elif score >= thresholds['habitability_zone']:
                expected = 'HABITABILITY_ZONE'
            else:
                expected = 'NON_HABITABLE'
            assert result['classification'] == expected, (
                f"score {score} labelled {result['classification']}, "
                f"expected {expected}")

    def test_confidence_belongs_to_the_reported_class(self, scorer):
        """Confidence must be the posterior for the class actually shown."""
        key_for = {'NON_HABITABLE': 'non_habitable',
                   'HABITABILITY_ZONE': 'habitability_zone',
                   'POTENTIALLY_HABITABLE': 'potentially_habitable'}
        for params in [EARTH, HOT_JUPITER, {'pl_rade': 1.5, 'pl_eqt': 300}]:
            result = scorer.predict_habitability(params)
            expected = result['probabilities'][key_for[result['classification']]]
            assert result['confidence'] == pytest.approx(expected, abs=1e-4)

    def test_score_is_the_calibrated_blend(self, scorer):
        """The reported score must equal the documented formula."""
        result = scorer.predict_habitability(dict(EARTH))
        factors = result['contributing_factors']
        expected = (factors['ml_weight'] * factors['ml_score']
                    + factors['physics_weight'] * factors['physics_score'])
        assert result['habitability_score'] == pytest.approx(expected, abs=0.01)

    def test_derived_parameters_are_reported(self, scorer):
        """A user must be able to tell a measured flux from an inferred one."""
        result = scorer.predict_habitability(
            {'pl_rade': 1.0, 'pl_orbper': 365.25, 'st_teff': 5772, 'st_rad': 1.0})
        assert 'pl_insol' in result['derived_parameters']
        assert 'pl_eqt' in result['derived_parameters']
        assert 'pl_rade' not in result['derived_parameters']
        assert result['resolved_parameters']['pl_insol'] == pytest.approx(1.0, rel=1e-2)

    def test_blend_weights_sum_to_one(self, scorer):
        assert scorer.ml_weight + scorer.physics_weight == pytest.approx(1.0)
        assert 0.0 <= scorer.ml_weight <= 1.0

    def test_thresholds_are_ordered(self, scorer):
        assert 0.0 < scorer.threshold_hz < scorer.threshold_ph < 1.0


# --- Robustness --------------------------------------------------------------

class TestRobustness:
    @pytest.mark.parametrize('params', [
        {}, {'pl_rade': 0}, {'pl_rade': -5}, {'pl_eqt': 0},
        {'pl_rade': float('nan')}, {'pl_insol': float('inf')},
        {'pl_rade': 1e9, 'pl_eqt': 1e9},
        {'st_teff': 50000, 'st_rad': 100, 'st_mass': 50},
    ])
    def test_degenerate_input_never_raises(self, scorer, params):
        result = scorer.predict_habitability(params)
        assert 0.0 <= result['habitability_score'] <= 1.0
        assert result['classification'] in P.CLASS_NAMES

    def test_partial_input_degrades_gracefully(self, scorer):
        """Progressively withholding observables must not crash or go silly."""
        full = dict(EARTH)
        for key in ['st_mass', 'st_rad', 'pl_orbsmax', 'pl_insol', 'pl_eqt']:
            full.pop(key, None)
            result = scorer.predict_habitability(dict(full))
            assert 0.0 <= result['habitability_score'] <= 1.0
            assert result['classification'] in P.CLASS_NAMES

    def test_prediction_is_deterministic(self, scorer):
        first = scorer.predict_habitability(dict(EARTH))
        second = scorer.predict_habitability(dict(EARTH))
        assert first == second

    def test_unknown_mission_falls_back_to_unified(self, scorer):
        assert scorer.resolve_model_key('does-not-exist') == UNIFIED_KEY
        result = scorer.predict_habitability(dict(EARTH), mission='does-not-exist')
        assert result['mission_used'] == UNIFIED_KEY.upper()

    def test_batch_matches_single(self, scorer):
        batch = scorer.batch_predict([dict(EARTH), dict(HOT_JUPITER)])
        assert len(batch) == 2
        assert batch[0]['habitability_score'] == pytest.approx(
            scorer.predict_habitability(dict(EARTH))['habitability_score'])

    def test_input_dict_is_not_mutated(self, scorer):
        params = dict(EARTH)
        before = dict(params)
        scorer.predict_habitability(params)
        assert params == before


# --- Reported metrics --------------------------------------------------------

class TestReportedMetrics:
    """
    The published numbers must come from the artefacts. This is what stops the
    site quoting a hard-coded "100% accuracy" that nothing can correct.
    """

    def test_report_exposes_honest_evaluation(self, scorer):
        report = scorer.model_report('auto')
        assert report['oof_macro_f1'] is not None
        assert 0.0 <= report['oof_macro_f1'] <= 1.0
        assert report['oof_per_class']
        assert report['degraded_input']
        assert 'out-of-fold' in report['evaluation_protocol']

    def test_report_states_the_label_caveat(self, scorer):
        """A reviewer must be told the labels are a rule, not ground truth."""
        report = scorer.model_report('auto')
        assert 'rule' in report['label_source'].lower()
        assert 'not observed ground truth' in report['caveat']

    def test_rare_class_has_full_support(self, scorer):
        """
        Out-of-fold reporting exists so the rare class is not evaluated on one
        or two rows, as it was under the old single-split protocol.
        """
        report = scorer.model_report('auto')
        habitable = next(row for row in report['oof_per_class']
                         if row['class'] == 'POTENTIALLY_HABITABLE')
        assert habitable['support'] > 50, (
            f"only {habitable['support']} habitable objects evaluated")

    def test_model_beats_the_rule_on_degraded_input(self, scorer):
        """
        The project's actual ML contribution, asserted. With observables
        withheld the rule becomes undefined; the model keeps classifying.
        """
        rows = scorer.model_report('auto')['degraded_input']
        worst = max(rows, key=lambda row: row['observables_withheld'])
        assert worst['observables_withheld'] >= 3
        assert worst['rule_undefined_rate'] > 0.5
        assert worst['model_accuracy'] > worst['rule_accuracy']

    def test_calibration_file_matches_loaded_values(self, scorer, project_root):
        path = project_root / 'models' / 'reports' / 'blend_calibration.json'
        if not path.exists():
            pytest.skip("calibration not generated")
        payload = json.loads(path.read_text(encoding='utf-8'))
        assert scorer.ml_weight == pytest.approx(payload['ml_weight'])
        assert scorer.threshold_ph == pytest.approx(
            payload['threshold_potentially_habitable'])


# --- Catalogue consistency ---------------------------------------------------

class TestCatalogueConsistency:
    """The site's labels and the model's targets must be the same rows."""

    @pytest.fixture(scope='class')
    def catalogue(self, project_root):
        path = project_root / 'data' / 'processed' / 'habitability_catalogue.csv'
        if not path.exists():
            pytest.skip("catalogue not generated")
        return pd.read_csv(path)

    def test_catalogue_labels_match_the_rule(self, catalogue):
        """Recomputing the rule on stored parameters must reproduce the label."""
        sample = catalogue.sample(min(400, len(catalogue)), random_state=0)
        for row in sample.to_dict('records'):
            params = {k: row[k] for k in P.CORE_INPUTS if pd.notna(row.get(k))}
            assert P.assign_label(params) == row['habitability_class'], row['planet_name']

    def test_planet_names_are_unique(self, catalogue):
        """planet_name is a unique column in the database."""
        duplicates = catalogue['planet_name'].duplicated().sum()
        assert duplicates == 0, f"{duplicates} duplicate names would fail to load"

    def test_potentially_habitable_flag_matches_class(self, catalogue):
        expected = catalogue['habitability_class'] == 'POTENTIALLY_HABITABLE'
        assert (catalogue['potentially_habitable'].astype(bool) == expected).all()

    def test_no_false_positives_survived_filtering(self, catalogue):
        """Objects the archives call false positives are not planets."""
        if 'disposition' not in catalogue.columns:
            pytest.skip("disposition not exported")
        banned = {'FALSE POSITIVE', 'REFUTED', 'FP', 'FA'}
        present = set(catalogue['disposition'].dropna().astype(str).str.strip().str.upper())
        assert not (present & banned), present & banned

    def test_scorer_agrees_with_catalogue_on_habitable_objects(self, scorer, catalogue):
        """
        End-to-end: objects the catalogue calls habitable should score high
        through the live API path.
        """
        habitable = catalogue[catalogue.habitability_class == 'POTENTIALLY_HABITABLE']
        sample = habitable.sample(min(40, len(habitable)), random_state=0)
        agreed = 0
        for row in sample.to_dict('records'):
            params = {k: row[k] for k in P.CORE_INPUTS if pd.notna(row.get(k))}
            result = scorer.predict_habitability(params)
            agreed += int(result['classification'] == 'POTENTIALLY_HABITABLE')
        assert agreed / len(sample) >= 0.85, (
            f"only {agreed}/{len(sample)} habitable objects scored as habitable")
