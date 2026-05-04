"""
API Serializers for Exoplanet Habitability Prediction
======================================================

This module contains DRF serializers for validating input data
and formatting API responses.
"""

from rest_framework import serializers


class PlanetParametersSerializer(serializers.Serializer):
    """
    Serializer for planet parameters input validation.
    
    This validates the input data for habitability predictions.
    All fields are optional but at least some should be provided for meaningful results.
    """
    
    # Planet parameters
    pl_rade = serializers.FloatField(
        required=False,
        min_value=0.0,
        help_text="Planet radius in Earth radii (e.g., 1.0 for Earth-sized)"
    )
    
    pl_masse = serializers.FloatField(
        required=False,
        min_value=0.0,
        help_text="Planet mass in Earth masses"
    )
    
    pl_eqt = serializers.FloatField(
        required=False,
        min_value=0.0,
        help_text="Equilibrium temperature in Kelvin (e.g., 288 for Earth)"
    )
    
    pl_insol = serializers.FloatField(
        required=False,
        min_value=0.0,
        help_text="Insolation flux in Earth flux (1.0 = Earth's solar flux)"
    )
    
    pl_orbper = serializers.FloatField(
        required=False,
        min_value=0.0,
        help_text="Orbital period in days (e.g., 365.25 for Earth)"
    )
    
    pl_orbsmax = serializers.FloatField(
        required=False,
        min_value=0.0,
        help_text="Orbital semi-major axis in AU (1.0 = Earth's distance from Sun)"
    )
    
    pl_orbeccen = serializers.FloatField(
        required=False,
        min_value=0.0,
        max_value=1.0,
        help_text="Orbital eccentricity (0 = circular orbit)"
    )
    
    # Stellar parameters
    st_teff = serializers.FloatField(
        required=False,
        min_value=0.0,
        help_text="Stellar effective temperature in Kelvin (e.g., 5778 for Sun)"
    )
    
    st_rad = serializers.FloatField(
        required=False,
        min_value=0.0,
        help_text="Stellar radius in Solar radii (1.0 = Sun's radius)"
    )
    
    st_mass = serializers.FloatField(
        required=False,
        min_value=0.0,
        help_text="Stellar mass in Solar masses (1.0 = Sun's mass)"
    )
    
    st_lum = serializers.FloatField(
        required=False,
        min_value=0.0,
        help_text="Stellar luminosity in Solar luminosities"
    )
    
    st_logg = serializers.FloatField(
        required=False,
        help_text="Stellar surface gravity (log g)"
    )
    
    st_met = serializers.FloatField(
        required=False,
        help_text="Stellar metallicity [Fe/H]"
    )
    
    st_age = serializers.FloatField(
        required=False,
        min_value=0.0,
        help_text="Stellar age in Gyr"
    )
    
    # Stellar type
    stellar_type = serializers.CharField(
        required=False,
        max_length=10,
        help_text="Stellar spectral type (e.g., G, K, M, F)"
    )
    
    # Mission identifier (optional)
    mission = serializers.ChoiceField(
        choices=['auto', 'k2', 'kepler', 'tess'],
        default='auto',
        required=False,
        help_text="Which mission model to use (auto = best match)"
    )
    
    def validate(self, data):
        """
        Validate that at least some planet parameters are provided.
        """
        if not data:
            raise serializers.ValidationError(
                "At least one planet or stellar parameter must be provided."
            )
        
        # Check if at least some key parameters are present
        key_params = ['pl_rade', 'pl_eqt', 'pl_insol', 'st_teff']
        has_key_param = any(param in data for param in key_params)
        
        if not has_key_param:
            raise serializers.ValidationError(
                "At least one key parameter (pl_rade, pl_eqt, pl_insol, or st_teff) must be provided."
            )
        
        return data


class HabitabilityPredictionSerializer(serializers.Serializer):
    """
    Serializer for habitability prediction response.
    
    This formats the output of the habitability prediction.
    """
    
    habitability_score = serializers.FloatField()
    classification = serializers.CharField()
    confidence = serializers.FloatField()
    
    probabilities = serializers.DictField()
    esi_components = serializers.DictField()
    contributing_factors = serializers.DictField()
    
    mission_used = serializers.CharField()
    model_type = serializers.CharField()


class BatchPredictionSerializer(serializers.Serializer):
    """
    Serializer for batch predictions input.
    """
    
    planets = serializers.ListField(
        child=PlanetParametersSerializer(),
        min_length=1,
        max_length=100,  # Limit batch size
        help_text="List of planet parameter dictionaries (max 100)"
    )
    
    mission = serializers.ChoiceField(
        choices=['auto', 'k2', 'kepler', 'tess'],
        default='auto',
        required=False
    )


class ErrorResponseSerializer(serializers.Serializer):
    """
    Serializer for error responses.
    """
    
    error = serializers.CharField()
    detail = serializers.CharField(required=False)
    field_errors = serializers.DictField(required=False)


class APIInfoSerializer(serializers.Serializer):
    """
    Serializer for API information response.
    """
    
    message = serializers.CharField()
    version = serializers.CharField()
    endpoints = serializers.DictField()
    models_loaded = serializers.ListField()
    status = serializers.CharField()
