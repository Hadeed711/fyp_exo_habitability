"""
Serializers for Planet Data API
================================

DRF serializers for exoplanet and mission data.
"""

from rest_framework import serializers
from .models import Mission, Exoplanet


class MissionSerializer(serializers.ModelSerializer):
    """Serializer for Mission model."""
    
    planet_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Mission
        fields = ['id', 'name', 'full_name', 'description', 'planet_count', 'created_at']
    
    def get_planet_count(self, obj):
        """Get count of planets discovered by this mission."""
        return obj.planets.count()


class ExoplanetListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for planet lists (paginated views)."""
    
    mission_name = serializers.CharField(source='mission.name', read_only=True)
    
    class Meta:
        model = Exoplanet
        fields = [
            'id', 'planet_name', 'mission_name',
            'pl_rade', 'pl_eqt', 'pl_insol', 'pl_orbper',
            'habitability_class', 'created_at'
        ]


class ExoplanetDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for single planet view."""
    
    mission = MissionSerializer(read_only=True)
    
    class Meta:
        model = Exoplanet
        fields = '__all__'


class ExoplanetSearchSerializer(serializers.Serializer):
    """Serializer for search parameters."""
    
    q = serializers.CharField(required=False, help_text="Search query (planet name)")
    mission = serializers.CharField(required=False, help_text="Filter by mission code (k2, kepler, tess)")
    habitability = serializers.CharField(required=False, help_text="Filter by habitability class")
    min_radius = serializers.FloatField(required=False, help_text="Minimum planet radius (Earth radii)")
    max_radius = serializers.FloatField(required=False, help_text="Maximum planet radius (Earth radii)")
    min_temp = serializers.FloatField(required=False, help_text="Minimum equilibrium temperature (K)")
    max_temp = serializers.FloatField(required=False, help_text="Maximum equilibrium temperature (K)")


class PlanetStatsSerializer(serializers.Serializer):
    """Serializer for dataset statistics."""
    
    total_planets = serializers.IntegerField()
    missions = serializers.DictField()
    habitability_breakdown = serializers.DictField()
    avg_radius = serializers.FloatField()
    avg_temperature = serializers.FloatField()
    avg_orbital_period = serializers.FloatField()
