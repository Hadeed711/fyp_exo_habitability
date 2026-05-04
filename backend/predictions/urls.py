"""
URL Configuration for Predictions API
======================================

All prediction-related endpoints.
"""

from django.urls import path
from . import views

urlpatterns = [
    # Root endpoint
    path('', views.api_root, name='api-root'),
    
    # Prediction endpoints
    path('predict/', views.predict, name='predict'),
    path('predict/batch/', views.batch_predict, name='batch-predict'),
    path('explain/', views.explain_prediction, name='explain-prediction'),
    
    # Model information
    path('models/info/', views.models_info, name='models-info'),
    
    # Health check
    path('health/', views.health_check, name='health-check'),
]
