"""
Views for Predictions API
==========================

API endpoints for exoplanet habitability predictions.
"""

from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from .serializers import PlanetParametersSerializer, BatchPredictionSerializer
from . import ai_service
import logging
import traceback

logger = logging.getLogger(__name__)


@api_view(['GET'])
def api_root(request):
    """
    API root endpoint.
    
    GET /api/
    """
    if not ai_service.is_service_available():
        return Response(
            {
                'error': 'ML models not loaded',
                'detail': 'Habitability prediction models could not be loaded.',
                'status': 'error'
            },
            status=status.HTTP_503_SERVICE_UNAVAILABLE
        )
    
    return Response({
        'message': 'AI Exoplanet Habitability Prediction API',
        'version': '1.0.0',
        'status': 'operational',
        'endpoints': {
            'predict': '/api/predict/ [POST]',
            'batch_predict': '/api/predict/batch/ [POST]',
            'explain': '/api/explain/ [POST]',
            'models_info': '/api/models/info/ [GET]',
            'health': '/api/health/ [GET]'
        },
        'models_loaded': ai_service.get_models_info()['missions']
    }, status=status.HTTP_200_OK)


@api_view(['GET', 'POST'])
def predict(request):
    """
    Predict habitability for a single exoplanet.
    
    GET /api/predict/ - API documentation
    POST /api/predict/ - Make prediction
    """
    
    if request.method == 'GET':
        return Response({
            'message': 'Habitability Prediction Endpoint',
            'method': 'POST',
            'description': 'Send planet parameters to predict habitability score',
            'example_request': {
                'pl_rade': 1.2,
                'pl_eqt': 288,
                'pl_insol': 1.0,
                'st_teff': 5778,
                'stellar_type': 'G'
            },
            'response_fields': [
                'habitability_score', 'classification', 'probabilities',
                'esi_components', 'contributing_factors', 'mission_used'
            ],
            'related_endpoint': '/api/explain/'
        }, status=status.HTTP_200_OK)
    
    # POST request
    if not ai_service.is_service_available():
        return Response(
            {'error': 'Service unavailable', 'detail': 'ML models not loaded.'},
            status=status.HTTP_503_SERVICE_UNAVAILABLE
        )
    
    # Validate input
    serializer = PlanetParametersSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(
            {
                'error': 'Invalid input',
                'detail': 'Check field errors',
                'field_errors': serializer.errors
            },
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        planet_params = serializer.validated_data
        mission = planet_params.pop('mission', 'auto')
        planet_params.pop('explanation_method', None)
        
        # Make prediction
        result = ai_service.predict_single(planet_params, mission=mission)
        result['input_parameters'] = planet_params
        result['success'] = True
        
        return Response(result, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Prediction error: {str(e)}\n{traceback.format_exc()}")
        return Response(
            {
                'error': 'Prediction failed',
                'detail': str(e),
                'success': False
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
def batch_predict(request):
    """
    Predict habitability for multiple planets.
    
    POST /api/predict/batch/
    """
    
    if not ai_service.is_service_available():
        return Response(
            {'error': 'Service unavailable', 'detail': 'ML models not loaded.'},
            status=status.HTTP_503_SERVICE_UNAVAILABLE
        )
    
    serializer = BatchPredictionSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(
            {'error': 'Invalid input', 'field_errors': serializer.errors},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        planets = serializer.validated_data['planets']
        mission = serializer.validated_data.get('mission', 'auto')
        
        # Remove mission from individual params
        for planet in planets:
            planet.pop('mission', None)
        
        results = ai_service.predict_batch(planets, mission=mission)
        
        return Response(
            {
                'total_planets': len(planets),
                'successful_predictions': sum(1 for r in results if r.get('success')),
                'results': results
            },
            status=status.HTTP_200_OK
        )
        
    except Exception as e:
        logger.error(f"Batch prediction error: {e}")
        return Response(
            {'error': 'Batch prediction failed', 'detail': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
def explain_prediction(request):
    """
    Explain habitability prediction using feature attributions.

    POST /api/explain/
    """
    if not ai_service.is_service_available():
        return Response(
            {'error': 'Service unavailable', 'detail': 'ML models not loaded.'},
            status=status.HTTP_503_SERVICE_UNAVAILABLE
        )

    serializer = PlanetParametersSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(
            {
                'error': 'Invalid input',
                'detail': 'Check field errors',
                'field_errors': serializer.errors
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        planet_params = serializer.validated_data
        mission = planet_params.pop('mission', 'auto')
        explanation_method = planet_params.pop('explanation_method', 'auto')

        explanation = ai_service.explain_single(
            planet_params,
            mission=mission,
            explanation_method=explanation_method,
        )
        explanation['input_parameters'] = planet_params
        explanation['success'] = True

        return Response(explanation, status=status.HTTP_200_OK)

    except Exception as e:
        logger.error(f"Explainability error: {str(e)}\n{traceback.format_exc()}")
        return Response(
            {
                'error': 'Explainability failed',
                'detail': str(e),
                'success': False
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
def models_info(request):
    """
    Get information about loaded ML models.
    
    GET /api/models/info/
    """
    
    if not ai_service.is_service_available():
        return Response(
            {'error': 'Models not loaded', 'models_available': []},
            status=status.HTTP_503_SERVICE_UNAVAILABLE
        )
    
    info = ai_service.get_models_info()
    return Response(info, status=status.HTTP_200_OK)


@api_view(['GET'])
def health_check(request):
    """
    Health check endpoint.
    
    GET /api/health/
    """
    
    is_healthy = ai_service.is_service_available()
    models_info = ai_service.get_models_info()
    
    health_status = {
        'status': 'healthy' if is_healthy else 'unhealthy',
        'models_loaded': is_healthy,
        'missions_available': models_info.get('missions', []),
        'api_version': '1.0.0'
    }
    
    status_code = status.HTTP_200_OK if is_healthy else status.HTTP_503_SERVICE_UNAVAILABLE
    return Response(health_status, status=status_code)

