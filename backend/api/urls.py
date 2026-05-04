"""
API URL Configuration
=====================

URL patterns for the habitability prediction API endpoints.
"""

from django.urls import path
from .views import (
    api_root,
    predict,
    batch_predict,
    models_info,
    health_check
)

urlpatterns = [
    # Root endpoint
    path('', api_root, name='api-root'),
    
    # Prediction endpoints
    path('predict/', predict, name='predict'),
    path('predict/batch/', batch_predict, name='batch-predict'),
    
    # Model information
    path('models/info/', models_info, name='models-info'),
    
    # Health check
    path('health/', health_check, name='health-check'),
]


