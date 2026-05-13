from django.contrib import admin
from .models import Mission, Exoplanet

@admin.register(Mission)
class MissionAdmin(admin.ModelAdmin):
    list_display = ('name', 'full_name', 'total_planets', 'launch_date')
    search_fields = ('name', 'full_name')

@admin.register(Exoplanet)
class ExoplanetAdmin(admin.ModelAdmin):
    list_display = ('planet_name', 'mission', 'habitability_class', 'esi_overall', 'discovery_year')
    list_filter = ('mission', 'habitability_class', 'potentially_habitable')
    search_fields = ('planet_name',)
    readonly_fields = ('created_at', 'updated_at')
