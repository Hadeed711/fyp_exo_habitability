"""
API Views for Exoplanet Habitability Prediction
===============================================

This module contains the API endpoints for the habitability prediction system.
"""

from django.shortcuts import render
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from .habitability_scorer import HabitabilityScorer
from .serializers import (
    PlanetParametersSerializer,
    HabitabilityPredictionSerializer,
    BatchPredictionSerializer,
    ErrorResponseSerializer,
    APIInfoSerializer
)
import logging
import traceback

# Set up logging
logger = logging.getLogger(__name__)

# Initialize scorer once (singleton pattern for performance)
try:
    scorer = HabitabilityScorer()
    logger.info("HabitabilityScorer initialized successfully")
except Exception as e:
    logger.error(f"Failed to initialize HabitabilityScorer: {e}")
    scorer = None


@api_view(['GET'])
def api_root(request):
    """
    API root endpoint - provides information about available endpoints.
    
    GET /api/
    """
    if scorer is None:
        return Response(
            {
                'error': 'ML models not loaded',
                'detail': 'The habitability prediction models could not be loaded. Please check server logs.',
                'status': 'error'
            },
            status=status.HTTP_503_SERVICE_UNAVAILABLE
        )
    
    response_data = {
        'message': 'AI Exoplanet Habitability API',
        'version': '1.0.0',
        'status': 'operational',
        'endpoints': {
            'predict': '/api/predict/ [POST]',
            'batch_predict': '/api/predict/batch/ [POST]',
            'models_info': '/api/models/info/ [GET]',
            'health': '/api/health/ [GET]'
        },
        'models_loaded': list(scorer.models.keys()) if scorer else [],
        'documentation': '/api/docs/'
    }
    
    return Response(response_data, status=status.HTTP_200_OK)


@api_view(['GET', 'POST'])
def predict(request):
    """
    Predict habitability score for a single exoplanet.
    
    GET /api/predict/
    - Returns API usage information
    
    POST /api/predict/
    - Accepts planet parameters in request body
    - Returns habitability prediction with detailed analysis
    
    Example Request Body:
    {
        "pl_rade": 1.2,
        "pl_eqt": 288,
        "pl_insol": 1.0,
        "pl_orbsmax": 1.0,
        "pl_orbper": 365,
        "st_teff": 5778,
        "st_rad": 1.0,
        "st_mass": 1.0,
        "stellar_type": "G"
    }
    """
    
    if request.method == 'GET':
        # Return API usage information
        return Response({
            'message': 'Habitability Prediction API',
            'method': 'POST',
            'description': 'Send planet parameters to get habitability prediction',
            'required_fields': [
                'At least one of: pl_rade, pl_eqt, pl_insol, st_teff'
            ],
            'optional_fields': [
                'pl_masse', 'pl_orbper', 'pl_orbsmax', 'pl_orbeccen',
                'st_rad', 'st_mass', 'st_lum', 'st_logg', 'st_met', 'st_age',
                'stellar_type', 'mission'
            ],
            'example': {
                'pl_rade': 1.2,
                'pl_eqt': 288,
                'pl_insol': 1.0,
                'st_teff': 5778,
                'stellar_type': 'G'
            },
            'missions': ['auto', 'k2', 'kepler', 'tess']
        }, status=status.HTTP_200_OK)
    
    if request.method == 'POST':
        # Check if scorer is available
        if scorer is None:
            return Response(
                {
                    'error': 'Service unavailable',
                    'detail': 'ML models are not loaded. Please contact administrator.'
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
        
        # Validate input data
        serializer = PlanetParametersSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response(
                {
                    'error': 'Invalid input data',
                    'detail': 'Please check the field errors below',
                    'field_errors': serializer.errors
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Get validated data
            planet_params = serializer.validated_data
            mission = planet_params.pop('mission', 'auto')
            
            # Make prediction
            logger.info(f"Making prediction with mission={mission}")
            result = scorer.predict_habitability(planet_params, mission=mission)
            
            # Add metadata
            result['input_parameters'] = planet_params
            result['success'] = True
            
            return Response(result, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Prediction error: {str(e)}")
            logger.error(traceback.format_exc())
            
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
    Predict habitability scores for multiple planets in batch.
    
    POST /api/predict/batch/
    
    Example Request Body:
    {
        "planets": [
            {"pl_rade": 1.2, "pl_eqt": 288, "st_teff": 5778},
            {"pl_rade": 0.8, "pl_eqt": 250, "st_teff": 4500}
        ],
        "mission": "auto"
    }
    """
    
    if scorer is None:
        return Response(
            {
                'error': 'Service unavailable',
                'detail': 'ML models are not loaded.'
            },
            status=status.HTTP_503_SERVICE_UNAVAILABLE
        )
    
    # Validate input
    serializer = BatchPredictionSerializer(data=request.data)
    
    if not serializer.is_valid():
        return Response(
            {
                'error': 'Invalid input data',
                'field_errors': serializer.errors
            },
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        planets = serializer.validated_data['planets']
        mission = serializer.validated_data.get('mission', 'auto')
        
        # Process each planet
        results = []
        for idx, planet_params in enumerate(planets):
            try:
                # Remove mission from individual params if present
                planet_params.pop('mission', None)
                
                result = scorer.predict_habitability(planet_params, mission=mission)
                result['planet_index'] = idx
                result['success'] = True
                results.append(result)
                
            except Exception as e:
                logger.error(f"Error processing planet {idx}: {e}")
                results.append({
                    'planet_index': idx,
                    'success': False,
                    'error': str(e)
                })
        
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
            {
                'error': 'Batch prediction failed',
                'detail': str(e)
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
def models_info(request):
    """
    Get information about loaded ML models.
    
    GET /api/models/info/
    """
    
    if scorer is None:
        return Response(
            {
                'error': 'Models not loaded',
                'models_available': []
            },
            status=status.HTTP_503_SERVICE_UNAVAILABLE
        )
    
    models_data = {}
    
    for mission in scorer.models.keys():
        models_data[mission] = {
            'model_type': 'XGBoost' if mission != 'tess' else 'Random Forest',
            'mission': mission.upper(),
            'features_count': len(scorer.metadata[mission].get('feature_names', [])),
            'scaler_type': 'MinMaxScaler'
        }
    
    return Response(
        {
            'models_loaded': len(scorer.models),
            'missions': list(scorer.models.keys()),
            'models': models_data,
            'status': 'operational'
        },
        status=status.HTTP_200_OK
    )


@api_view(['GET'])
def health_check(request):
    """
    Health check endpoint for monitoring.
    
    GET /api/health/
    """
    
    health_status = {
        'status': 'healthy' if scorer is not None else 'unhealthy',
        'models_loaded': scorer is not None,
        'missions_available': list(scorer.models.keys()) if scorer else [],
        'api_version': '1.0.0'
    }
    
    status_code = status.HTTP_200_OK if scorer else status.HTTP_503_SERVICE_UNAVAILABLE
    
    return Response(health_status, status=status_code)
