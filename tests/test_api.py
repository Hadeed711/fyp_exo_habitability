"""
Django API tests.

Covers the request/response contract the frontend depends on, including the
endpoint that serves published accuracy figures. These run without a database
connection: every endpoint tested here is model-backed, not DB-backed.
"""

import os
import sys
from pathlib import Path

import pytest

PROJECT_ROOT = Path(__file__).resolve().parent.parent
BACKEND = PROJECT_ROOT / 'backend'
if str(BACKEND) not in sys.path:
    sys.path.insert(0, str(BACKEND))

django = pytest.importorskip('django')


@pytest.fixture(scope='module')
def client():
    """Configured DRF test client."""
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
    # 'testserver' is the host the Django test client sends; without it every
    # request is rejected by ALLOWED_HOSTS before reaching a view.
    os.environ['ALLOWED_HOSTS'] = 'localhost,127.0.0.1,testserver'

    previous = os.getcwd()
    os.chdir(BACKEND)
    try:
        django.setup()
    except RuntimeError:
        pass  # already configured by another module
    from rest_framework.test import APIClient
    yield APIClient()
    os.chdir(previous)


EARTH = {
    'pl_rade': 1.0, 'pl_eqt': 255.0, 'pl_insol': 1.0, 'pl_orbper': 365.25,
    'pl_orbsmax': 1.0, 'st_teff': 5772.0, 'st_rad': 1.0, 'st_mass': 1.0,
}
HOT_JUPITER = {'pl_rade': 11.2, 'pl_eqt': 1400.0, 'pl_insol': 900.0, 'pl_orbper': 3.5}


class TestServiceEndpoints:
    def test_root_lists_endpoints(self, client):
        response = client.get('/api/')
        assert response.status_code == 200
        assert 'predict' in response.json()['endpoints']

    def test_health_is_healthy(self, client):
        response = client.get('/api/health/')
        assert response.status_code == 200
        assert response.json()['status'] == 'healthy'

    def test_models_info_reports_the_blend(self, client):
        payload = client.get('/api/models/info/').json()
        assert payload['status'] == 'operational'
        assert payload['default_model'] == 'unified'
        blend = payload['blend']
        assert blend['ml_weight'] + blend['physics_weight'] == pytest.approx(1.0)
        assert len(payload['feature_names']) == payload['models']['unified']['features_count']


class TestPredictEndpoint:
    def test_earth_is_potentially_habitable(self, client):
        response = client.post('/api/predict/', EARTH, format='json')
        assert response.status_code == 200
        payload = response.json()
        assert payload['classification'] == 'POTENTIALLY_HABITABLE'
        assert payload['success'] is True

    def test_hot_jupiter_is_non_habitable(self, client):
        payload = client.post('/api/predict/', HOT_JUPITER, format='json').json()
        assert payload['classification'] == 'NON_HABITABLE'

    def test_response_carries_thresholds_for_the_ui(self, client):
        """
        The frontend colours the score with these; hard-coded bands in the UI
        previously disagreed with the backend's own classification.
        """
        payload = client.post('/api/predict/', EARTH, format='json').json()
        thresholds = payload['score_thresholds']
        assert 0 < thresholds['habitability_zone'] < thresholds['potentially_habitable'] < 1

    def test_partial_input_is_accepted(self, client):
        response = client.post('/api/predict/', {'pl_rade': 1.0, 'pl_eqt': 255},
                               format='json')
        assert response.status_code == 200
        assert response.json()['derived_parameters']

    def test_empty_body_is_rejected(self, client):
        assert client.post('/api/predict/', {}, format='json').status_code == 400

    def test_input_without_a_key_parameter_is_rejected(self, client):
        response = client.post('/api/predict/', {'pl_orbper': 365.25}, format='json')
        assert response.status_code == 400

    def test_negative_radius_is_rejected(self, client):
        response = client.post('/api/predict/', {'pl_rade': -5.0}, format='json')
        assert response.status_code == 400

    def test_mission_choice_is_validated(self, client):
        assert client.post('/api/predict/', dict(EARTH, mission='not-a-mission'),
                           format='json').status_code == 400
        for mission in ('auto', 'unified', 'k2', 'kepler', 'tess'):
            response = client.post('/api/predict/', dict(EARTH, mission=mission),
                                   format='json')
            assert response.status_code == 200, mission

    def test_get_returns_documentation(self, client):
        response = client.get('/api/predict/')
        assert response.status_code == 200
        assert 'example_request' in response.json()


class TestBatchEndpoint:
    def test_batch_scores_every_planet(self, client):
        response = client.post('/api/predict/batch/',
                               {'planets': [EARTH, HOT_JUPITER]}, format='json')
        assert response.status_code == 200
        payload = response.json()
        assert payload['total_planets'] == 2
        assert payload['successful_predictions'] == 2
        assert [row['classification'] for row in payload['results']] == [
            'POTENTIALLY_HABITABLE', 'NON_HABITABLE']

    def test_empty_batch_is_rejected(self, client):
        assert client.post('/api/predict/batch/', {'planets': []},
                           format='json').status_code == 400

    def test_batch_is_capped(self, client):
        response = client.post('/api/predict/batch/',
                               {'planets': [EARTH] * 101}, format='json')
        assert response.status_code == 400


class TestExplainEndpoint:
    def test_explanation_ranks_real_features(self, client):
        payload = client.post('/api/explain/', EARTH, format='json').json()
        assert payload['explanation_method'] in ('shap', 'lime', 'fallback')
        assert payload['feature_importance']

        from api import physics as P
        for item in payload['feature_importance']:
            assert item['feature_key'] in P.FEATURE_ORDER
            assert item['impact_direction'] in ('supports', 'reduces')

    def test_explanation_includes_the_prediction(self, client):
        payload = client.post('/api/explain/', EARTH, format='json').json()
        assert payload['classification'] == 'POTENTIALLY_HABITABLE'
        assert 'natural_language_explanation' in payload

    def test_explanation_flags_derived_inputs(self, client):
        """A user must be told when the explanation rests on inferred values."""
        payload = client.post('/api/explain/', {'pl_rade': 1.0, 'pl_orbper': 365.25,
                                                'st_teff': 5772, 'st_rad': 1.0},
                              format='json').json()
        assert 'derived' in payload['natural_language_explanation'].lower()


class TestModelReportEndpoint:
    """This endpoint is the single source for every published metric."""

    def test_report_serves_out_of_fold_metrics(self, client):
        payload = client.get('/api/models/report/').json()
        assert 0.0 <= payload['oof_macro_f1'] <= 1.0
        assert {row['class'] for row in payload['oof_per_class']} == {
            'HABITABILITY_ZONE', 'NON_HABITABLE', 'POTENTIALLY_HABITABLE'}

    def test_report_states_the_caveat(self, client):
        payload = client.get('/api/models/report/').json()
        assert 'not observed ground truth' in payload['caveat']

    def test_report_includes_the_evidence_of_ml_value(self, client):
        payload = client.get('/api/models/report/').json()
        assert payload['degraded_input']
        assert payload['leave_one_mission_out']

    def test_report_accepts_a_mission(self, client):
        payload = client.get('/api/models/report/?mission=kepler').json()
        assert payload['model_key'] == 'kepler'
