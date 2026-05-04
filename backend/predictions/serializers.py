"""
Serializers for Predictions API
================================

Input validation and response formatting for prediction endpoints.
"""

from rest_framework import serializers


class PlanetParametersSerializer(serializers.Serializer):
    """Validate planet parameters for habitability prediction."""
    
    # Planet parameters
    pl_rade = serializers.FloatField(required=False, min_value=0.0, help_text="Planet radius (Earth radii)")
    pl_masse = serializers.FloatField(required=False, min_value=0.0, help_text="Planet mass (Earth masses)")
    pl_eqt = serializers.FloatField(required=False, min_value=0.0, help_text="Equilibrium temperature (K)")
    pl_insol = serializers.FloatField(required=False, min_value=0.0, help_text="Insolation flux (Earth flux)")
    pl_orbper = serializers.FloatField(required=False, min_value=0.0, help_text="Orbital period (days)")
    pl_orbsmax = serializers.FloatField(required=False, min_value=0.0, help_text="Semi-major axis (AU)")
    pl_orbeccen = serializers.FloatField(required=False, min_value=0.0, max_value=1.0, help_text="Eccentricity")
    
    # Stellar parameters
    st_teff = serializers.FloatField(required=False, min_value=0.0, help_text="Stellar temperature (K)")
    st_rad = serializers.FloatField(required=False, min_value=0.0, help_text="Stellar radius (Solar radii)")
    st_mass = serializers.FloatField(required=False, min_value=0.0, help_text="Stellar mass (Solar masses)")
    st_lum = serializers.FloatField(required=False, min_value=0.0, help_text="Stellar luminosity")
    st_logg = serializers.FloatField(required=False, help_text="Stellar surface gravity")
    st_met = serializers.FloatField(required=False, help_text="Stellar metallicity [Fe/H]")
    st_age = serializers.FloatField(required=False, min_value=0.0, help_text="Stellar age (Gyr)")
    
    stellar_type = serializers.CharField(required=False, max_length=10, help_text="Stellar type (G, K, M, F)")
    mission = serializers.ChoiceField(choices=['auto', 'k2', 'kepler', 'tess'], default='auto', required=False)
    explanation_method = serializers.ChoiceField(
        choices=['auto', 'shap', 'lime', 'fallback'],
        default='auto',
        required=False,
        help_text="Explainability mode for /api/explain/"
    )
    
    def validate(self, data):
        """Ensure at least one key parameter is provided."""
        if not data:
            raise serializers.ValidationError("At least one parameter must be provided.")
        
        key_params = ['pl_rade', 'pl_eqt', 'pl_insol', 'st_teff']
        if not any(param in data for param in key_params):
            raise serializers.ValidationError(
                "At least one key parameter (pl_rade, pl_eqt, pl_insol, or st_teff) is required."
            )
        
        return data


class BatchPredictionSerializer(serializers.Serializer):
    """Validate batch prediction requests."""
    
    planets = serializers.ListField(
        child=PlanetParametersSerializer(),
        min_length=1,
        max_length=100,
        help_text="List of planet parameters (max 100)"
    )
    mission = serializers.ChoiceField(
        choices=['auto', 'k2', 'kepler', 'tess'],
        default='auto',
        required=False
    )
