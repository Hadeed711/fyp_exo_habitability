"""
Planet Models
=============

Database models for missions and exoplanets.
"""

from django.db import models


class Mission(models.Model):
    """
    Space missions that discovered exoplanets (K2, Kepler, TESS).
    """
    name = models.CharField(max_length=50, unique=True)
    full_name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    launch_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    total_planets = models.IntegerField(default=0)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'missions'
        ordering = ['name']
    
    def __str__(self):
        return self.name


class Exoplanet(models.Model):
    """
    Exoplanet data from all missions.
    """
    CLASSIFICATION_CHOICES = [
        ('NON_HABITABLE', 'Non-Habitable'),
        ('HABITABILITY_ZONE', 'Habitability Zone'),
        ('POTENTIALLY_HABITABLE', 'Potentially Habitable'),
    ]
    
    # Identifiers
    mission = models.ForeignKey(Mission, on_delete=models.CASCADE, related_name='planets')
    planet_name = models.CharField(max_length=200, unique=True, db_index=True)
    
    # Planet parameters
    pl_rade = models.FloatField(null=True, blank=True, help_text="Planet radius (Earth radii)")
    pl_masse = models.FloatField(null=True, blank=True, help_text="Planet mass (Earth masses)")
    pl_eqt = models.FloatField(null=True, blank=True, help_text="Equilibrium temperature (K)")
    pl_insol = models.FloatField(null=True, blank=True, help_text="Insolation flux (Earth flux)")
    pl_orbper = models.FloatField(null=True, blank=True, help_text="Orbital period (days)")
    pl_orbsmax = models.FloatField(null=True, blank=True, help_text="Semi-major axis (AU)")
    pl_orbeccen = models.FloatField(null=True, blank=True, help_text="Orbital eccentricity")
    
    # Stellar parameters
    st_teff = models.FloatField(null=True, blank=True, help_text="Stellar temperature (K)")
    st_rad = models.FloatField(null=True, blank=True, help_text="Stellar radius (Solar radii)")
    st_mass = models.FloatField(null=True, blank=True, help_text="Stellar mass (Solar masses)")
    st_lum = models.FloatField(null=True, blank=True, help_text="Stellar luminosity")
    st_logg = models.FloatField(null=True, blank=True, help_text="Stellar surface gravity")
    st_met = models.FloatField(null=True, blank=True, help_text="Stellar metallicity")
    st_age = models.FloatField(null=True, blank=True, help_text="Stellar age (Gyr)")
    stellar_type = models.CharField(max_length=10, blank=True, help_text="Stellar spectral type")
    
    # Habitability classification
    habitability_class = models.CharField(
        max_length=50,
        choices=CLASSIFICATION_CHOICES,
        default='NON_HABITABLE',
        db_index=True
    )
    
    # Additional flags
    in_habitable_zone = models.BooleanField(default=False, db_index=True)
    potentially_habitable = models.BooleanField(default=False, db_index=True)
    
    # Earth Similarity Index
    esi_overall = models.FloatField(null=True, blank=True, help_text="Overall ESI score")
    
    # Metadata
    discovery_year = models.IntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'exoplanets'
        ordering = ['planet_name']
        indexes = [
            models.Index(fields=['mission', 'habitability_class']),
            models.Index(fields=['potentially_habitable']),
            models.Index(fields=['planet_name']),
        ]
    
    def __str__(self):
        return self.planet_name
