"""
Prediction Models
=================

Models for storing AI prediction history and user simulations.
"""

from django.db import models
from django.contrib.auth.models import User


class PredictionHistory(models.Model):
    """
    Store history of habitability predictions made through the API.
    """
    # User reference (optional for anonymous predictions)
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='predictions')
    
    # Input parameters (stored as JSON)
    input_parameters = models.JSONField(help_text="Planet parameters used for prediction")
    
    # Prediction results
    habitability_score = models.FloatField()
    classification = models.CharField(max_length=50)
    confidence = models.FloatField()
    
    # Detailed results
    probabilities = models.JSONField(help_text="Prediction probabilities")
    esi_components = models.JSONField(help_text="Earth Similarity Index components")
    contributing_factors = models.JSONField(help_text="Score breakdown")
    
    # Model information
    mission_used = models.CharField(max_length=20)
    model_type = models.CharField(max_length=50)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    
    class Meta:
        db_table = 'prediction_history'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['-created_at']),
            models.Index(fields=['user', '-created_at']),
        ]
    
    def __str__(self):
        return f"Prediction {self.id} - Score: {self.habitability_score}"


class SimulationHistory(models.Model):
    """
    Store user's saved planet simulations.
    """
    # User reference (required)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='simulations')
    
    # Simulation details
    simulation_name = models.CharField(max_length=200, help_text="User-given name for simulation")
    description = models.TextField(blank=True)
    
    # Planet parameters
    planet_parameters = models.JSONField(help_text="Custom planet configuration")
    
    # Prediction results (cached)
    habitability_score = models.FloatField()
    classification = models.CharField(max_length=50)
    full_results = models.JSONField(help_text="Complete prediction results")
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_favorite = models.BooleanField(default=False)
    
    class Meta:
        db_table = 'simulation_history'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['user', 'is_favorite']),
        ]
    
    def __str__(self):
        return f"{self.simulation_name} by {self.user.username}"
