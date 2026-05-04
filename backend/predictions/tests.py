from unittest.mock import patch
from rest_framework import status
from rest_framework.test import APITestCase


class ExplainPredictionAPITests(APITestCase):
	"""API tests for Phase 6 explainability endpoint."""

	@patch('predictions.views.ai_service.is_service_available', return_value=True)
	@patch('predictions.views.ai_service.explain_single')
	def test_explain_prediction_success(self, mock_explain_single, _mock_available):
		mock_explain_single.return_value = {
			'habitability_score': 0.82,
			'classification': 'POTENTIALLY_HABITABLE',
			'confidence': 0.74,
			'mission_used': 'KEPLER',
			'model_type': 'XGBoost',
			'probabilities': {
				'non_habitable': 0.08,
				'habitability_zone': 0.18,
				'potentially_habitable': 0.74,
			},
			'esi_components': {
				'radius_similarity': 0.95,
				'temperature_similarity': 0.89,
				'flux_similarity': 0.91,
				'overall_esi': 0.92,
			},
			'contributing_factors': {
				'ml_score': 0.71,
				'physics_score': 0.83,
			},
			'feature_importance': [
				{
					'feature_key': 'pl_insol',
					'feature': 'Insolation Flux',
					'importance': 0.4321,
					'impact_direction': 'supports',
					'raw_shap': 0.4321,
				}
			],
			'natural_language_explanation': 'The planet is classified as Potentially Habitable.',
			'explanation_method': 'shap',
		}

		payload = {
			'pl_rade': 1.1,
			'pl_eqt': 270,
			'pl_insol': 0.9,
			'st_teff': 5600,
		}
		response = self.client.post('/api/explain/', payload, format='json')

		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertTrue(response.data.get('success'))
		self.assertIn('feature_importance', response.data)
		self.assertIn('natural_language_explanation', response.data)
		self.assertEqual(response.data.get('classification'), 'POTENTIALLY_HABITABLE')

		mock_explain_single.assert_called_once()

	@patch('predictions.views.ai_service.is_service_available', return_value=False)
	def test_explain_prediction_service_unavailable(self, _mock_available):
		payload = {
			'pl_rade': 1.1,
			'pl_eqt': 270,
		}
		response = self.client.post('/api/explain/', payload, format='json')
		self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
		self.assertEqual(response.data.get('error'), 'Service unavailable')

	@patch('predictions.views.ai_service.is_service_available', return_value=True)
	def test_explain_prediction_validation_error(self, _mock_available):
		response = self.client.post('/api/explain/', {}, format='json')
		self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
		self.assertEqual(response.data.get('error'), 'Invalid input')
