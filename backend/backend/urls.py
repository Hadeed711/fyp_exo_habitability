"""
URL configuration for backend project.

Main URL router for the AI Exoplanet Habitability API.
"""

from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from planets.views import mission_list

@require_http_methods(["GET"])
def api_info(request):
    """Root endpoint - API information"""
    return JsonResponse({
        'name': 'AI Exoplanet Habitability API',
        'version': '1.0.0',
        'status': 'operational',
        'endpoints': {
            'api_root': '/api/',
            'predictions': '/api/predict/',
            'batch_predictions': '/api/predict/batch/',
            'explainability': '/api/explain/',
            'models_info': '/api/models/info/',
            'health_check': '/api/health/',
            'planets': '/api/planets/',
            'missions': '/api/missions/',
            'auth': '/api/auth/ (Step 7)'
        },
        'documentation': 'See PROJECT_ROADMAP.md for details'
    })

urlpatterns = [
    # Django admin panel
    path('admin/', admin.site.urls),

    # Root endpoint
    path('', api_info, name='root'),
    
    # Prediction endpoints (main API)
    path('api/', include('predictions.urls')),
    
    # Planet data endpoints (for Step 3.2)
    path('api/planets/', include('planets.urls')),
    
    # Missions endpoint
    path('api/missions/', mission_list, name='missions'),
    
    # User authentication endpoints (for Step 7)
    path('api/auth/', include('users.urls')),

    # Chatbot endpoint (Ollama local LLM)
    path('api/chatbot/', include('chatbot.urls')),
]

