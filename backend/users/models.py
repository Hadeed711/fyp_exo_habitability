"""
Users App Models
================

UserProfile  — OneToOne extension of Django's built-in User.
               Stores optional base64 profile image.

SavedPrediction — Stores a named habitability prediction result for a user.
"""

from django.db import models
from django.contrib.auth.models import User


class UserProfile(models.Model):
    """Extended profile for each registered user."""

    user = models.OneToOneField(
        User, on_delete=models.CASCADE, related_name='profile'
    )
    # Base64 data-URL string (e.g. "data:image/jpeg;base64,...")
    # Stored directly in DB — fine for small profile images.
    profile_image = models.TextField(blank=True, default='')

    def __str__(self):
        return f"Profile({self.user.username})"


class SavedPrediction(models.Model):
    """A named, saved habitability prediction result belonging to a user."""

    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='saved_predictions'
    )
    name = models.CharField(max_length=120, help_text="User-assigned label for this prediction")

    # All 7 slider inputs the user entered
    inputs = models.JSONField(help_text="Planet parameter inputs (dict)")

    # Full prediction result from /api/predict/ or /api/explain/
    outputs = models.JSONField(help_text="Prediction result (score, classification, etc.)")

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.username} — {self.name}"
