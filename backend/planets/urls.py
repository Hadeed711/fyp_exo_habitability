"""
URL Configuration for Planets API
==================================

Endpoints for planet data management (Step 3.2 & 3.3).
"""

from django.urls import path
from . import views

urlpatterns = [
    # Planet list and detail
    path('', views.planet_list, name='planet-list'),
    path('<int:planet_id>/', views.planet_detail, name='planet-detail'),
    
    # Filtered views
    path('habitable/', views.habitable_planets, name='habitable-planets'),
    path('search/', views.search_planets, name='search-planets'),
    
    # Statistics and analytics
    path('stats/', views.planet_stats, name='planet-stats'),
    
    # Comparison
    path('compare/', views.compare_planets, name='compare-planets'),
]

