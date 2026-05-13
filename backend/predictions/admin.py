from django.contrib import admin
from .models import PredictionHistory, SimulationHistory

@admin.register(PredictionHistory)
class PredictionHistoryAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'habitability_score', 'classification', 'created_at')
    list_filter = ('classification', 'model_type', 'created_at')
    readonly_fields = ('created_at', 'input_parameters', 'probabilities', 'esi_components', 'contributing_factors')

@admin.register(SimulationHistory)
class SimulationHistoryAdmin(admin.ModelAdmin):
    list_display = ('simulation_name', 'user', 'habitability_score', 'classification', 'is_favorite', 'created_at')
    list_filter = ('classification', 'is_favorite', 'created_at')
    search_fields = ('simulation_name', 'user__username')
    readonly_fields = ('created_at', 'updated_at', 'planet_parameters', 'full_results')
