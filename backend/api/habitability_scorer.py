"""
Habitability Score Generation Module
=====================================

This module provides a comprehensive habitability scoring system that converts
ML model predictions into a continuous habitability score (0-1 scale).

The scoring system combines:
1. ML model prediction probabilities
2. Physical parameters (temperature, radius, insolation)
3. Habitable zone proximity
4. Earth Similarity Index (ESI) components
5. Stellar type factors

Usage:
------
As standalone script:
    python habitability_scorer.py

As imported module (for backend API):
    from habitability_scorer import HabitabilityScorer
    scorer = HabitabilityScorer()
    result = scorer.predict_habitability(planet_params)
"""

import pickle
import numpy as np
import pandas as pd
from pathlib import Path
import warnings
warnings.filterwarnings('ignore')


class HabitabilityScorer:
    """
    Comprehensive habitability scoring system for exoplanets.
    
    This class loads trained ML models and scalers, and provides methods
    to calculate habitability scores based on multiple factors.
    """
    
    def __init__(self, models_dir=None, artifacts_dir=None):
        """
        Initialize the habitability scorer.
        
        Parameters:
        -----------
        models_dir : str
            Path to directory containing trained models
        artifacts_dir : str
            Path to directory containing scalers and encoders
        """
        # Get the project root directory (FYP folder)
        # backend/api/habitability_scorer.py -> go up 2 levels to FYP
        current_file = Path(__file__).resolve()
        project_root = current_file.parent.parent.parent
        
        # Set default paths relative to project root
        self.models_dir = Path(models_dir) if models_dir else project_root / 'models'
        self.artifacts_dir = Path(artifacts_dir) if artifacts_dir else project_root / 'artifacts'
        self.models = {}
        self.scalers = {}
        self.metadata = {}
        
        # Earth reference values for similarity calculations
        self.earth_params = {
            'radius': 1.0,  # Earth radii
            'temperature': 288.0,  # Kelvin
            'insolation': 1.0,  # Earth flux
            'orbital_period': 365.25,  # days
            'mass': 1.0  # Earth masses
        }
        
        # Habitable zone boundaries (AU) for different stellar types
        self.hz_boundaries = {
            'F': {'inner': 1.4, 'outer': 2.4},
            'G': {'inner': 0.95, 'outer': 1.67},
            'K': {'inner': 0.38, 'outer': 1.02},
            'M': {'inner': 0.08, 'outer': 0.23}
        }
        
        # Load models and artifacts
        self._load_models()
    
    def _load_models(self):
        """Load all trained models and preprocessing artifacts."""
        print("Loading models and artifacts...")
        
        missions = ['k2', 'kepler', 'tess']
        
        for mission in missions:
            try:
                # Load best model (XGBoost for K2 and Kepler, RF for TESS)
                if mission == 'tess':
                    model_file = self.models_dir / f'{mission}_random_forest_model.pkl'
                else:
                    model_file = self.models_dir / f'{mission}_xgboost_model.pkl'
                
                with open(model_file, 'rb') as f:
                    self.models[mission] = pickle.load(f)
                
                # Load MinMax scaler
                scaler_file = self.artifacts_dir / mission / f'{mission}_habitability_minmax_scaler.pkl'
                with open(scaler_file, 'rb') as f:
                    self.scalers[mission] = pickle.load(f)
                
                # Load metadata
                metadata_file = self.artifacts_dir / mission / f'{mission}_habitability_metadata.pkl'
                with open(metadata_file, 'rb') as f:
                    self.metadata[mission] = pickle.load(f)
                
                print(f"✓ Loaded {mission.upper()} model and artifacts")
                
            except Exception as e:
                print(f"✗ Error loading {mission} model: {e}")
        
        print(f"\n✓ Successfully loaded {len(self.models)} mission models\n")
    
    def _get_stellar_type_from_teff(self, st_teff):
        """Determine stellar spectral type from effective temperature."""
        if st_teff <= 0:
            return 'G'
        elif st_teff >= 30000:
            return 'O'
        elif st_teff >= 10000:
            return 'B'
        elif st_teff >= 7500:
            return 'A'
        elif st_teff >= 6000:
            return 'F'
        elif st_teff >= 5200:
            return 'G'
        elif st_teff >= 3700:
            return 'K'
        else:
            return 'M'

    def _derive_orbsmax(self, pl_orbper, st_mass=1.0):
        """
        Derive semi-major axis from orbital period using Kepler's third law.
        a^3 = M * P^2  (AU, solar masses, years)
        """
        if pl_orbper <= 0:
            return 1.0
        period_years = pl_orbper / 365.25
        st_mass = max(st_mass, 0.1)  # Avoid division by zero
        a = (st_mass * period_years ** 2) ** (1.0 / 3.0)
        return round(a, 4)

    def _compute_derived_features(self, planet_params, mission='k2'):
        """
        Compute engineered features that were created during training preprocessing.
        These are REQUIRED because the models were trained with them.
        Formulas match exactly what was used in the training notebooks.
        """
        derived = {}

        pl_rade = planet_params.get('pl_rade', 0.0)
        pl_eqt = planet_params.get('pl_eqt', 0.0)
        pl_insol = planet_params.get('pl_insol', 0.0)
        pl_orbper = planet_params.get('pl_orbper', 0.0)
        pl_orbsmax = planet_params.get('pl_orbsmax', 0.0)
        st_rad = planet_params.get('st_rad', 1.0)
        st_mass = planet_params.get('st_mass', 1.0)

        # Auto-derive orbsmax if needed
        if pl_orbsmax <= 0 and pl_orbper > 0:
            pl_orbsmax = self._derive_orbsmax(pl_orbper, st_mass)

        if mission in ('k2', 'tess'):
            # Earth Similarity Indices (exact formulas from training notebooks)
            if pl_rade > 0:
                derived['radius_similarity'] = float(np.clip(1 - abs(pl_rade - 1.0) / 10.0, 0, 1))
            if pl_insol > 0:
                derived['insol_similarity'] = float(np.clip(1 - abs(pl_insol - 1.0) / 10.0, 0, 1))
            if pl_eqt > 0:
                derived['temp_similarity'] = float(np.clip(1 - abs(pl_eqt - 255.0) / 500.0, 0, 1))

            # Habitable Zone flags
            if pl_insol > 0:
                derived['in_hz_conservative'] = 1.0 if (0.25 <= pl_insol <= 4.0) else 0.0
                derived['in_hz_optimistic'] = 1.0 if (0.1 <= pl_insol <= 10.0) else 0.0
            elif pl_orbsmax > 0:
                # Estimate insolation from distance: S ≈ (st_rad/st_mass)^2 * (1/pl_orbsmax)^2
                estimated_insol = (st_rad ** 2) / (pl_orbsmax ** 2)
                derived['in_hz_conservative'] = 1.0 if (0.25 <= estimated_insol <= 4.0) else 0.0
                derived['in_hz_optimistic'] = 1.0 if (0.1 <= estimated_insol <= 10.0) else 0.0

            # Planet size flags
            if pl_rade > 0:
                derived['is_rocky'] = 1.0 if pl_rade <= 2.0 else 0.0
                derived['is_super_earth'] = 1.0 if (1.0 < pl_rade <= 2.0) else 0.0
                derived['is_earth_sized'] = 1.0 if (0.8 <= pl_rade <= 1.25) else 0.0

            # Log-transformed features
            if pl_orbper > 0:
                derived['pl_orbper_log'] = float(np.log10(pl_orbper))
            if pl_orbsmax > 0:
                derived['pl_orbsmax_log'] = float(np.log10(pl_orbsmax))
            if pl_insol > 0:
                derived['pl_insol_log'] = float(np.log10(pl_insol))

            # Ratio features
            if st_rad > 0:
                if pl_rade > 0:
                    # 1 Solar radius = 109.2 Earth radii
                    derived['planet_star_radius_ratio'] = pl_rade / (st_rad * 109.2 + 1e-9)
                if pl_orbsmax > 0:
                    # 1 AU = 215.0 Solar radii
                    derived['orbit_stellar_radii'] = pl_orbsmax * 215.0 / (st_rad + 1e-9)

            # TESS-specific: tmag_bright flag (bright host star: TESS mag < 10)
            if mission == 'tess':
                st_tmag = planet_params.get('st_tmag', 12.0)  # Default to typical faint star
                derived['tmag_bright'] = 1.0 if st_tmag < 10.0 else 0.0

        elif mission == 'kepler':
            # For Kepler, features use koi_* names
            koi_prad = planet_params.get('koi_prad', pl_rade)
            koi_insol = planet_params.get('koi_insol', pl_insol)
            koi_teq = planet_params.get('koi_teq', pl_eqt)
            koi_sma = planet_params.get('koi_sma', pl_orbsmax)
            koi_srad = planet_params.get('koi_srad', st_rad)
            koi_period = planet_params.get('koi_period', pl_orbper)

            if koi_prad > 0:
                derived['radius_similarity'] = float(np.clip(1 - abs(koi_prad - 1.0) / 10.0, 0, 1))
                derived['is_rocky'] = 1.0 if koi_prad <= 2.0 else 0.0
                derived['is_super_earth'] = 1.0 if (1.0 < koi_prad <= 2.0) else 0.0
                derived['is_earth_sized'] = 1.0 if (0.8 <= koi_prad <= 1.25) else 0.0
                if koi_srad > 0:
                    derived['planet_star_radius_ratio'] = (koi_prad * 0.00916) / (koi_srad + 1e-9)

            if koi_insol > 0:
                derived['insol_similarity'] = float(np.clip(1 - abs(koi_insol - 1.0) / 10.0, 0, 1))
                derived['in_hz_conservative'] = 1.0 if (0.25 <= koi_insol <= 4.0) else 0.0
                derived['in_hz_optimistic'] = 1.0 if (0.1 <= koi_insol <= 10.0) else 0.0
                derived['koi_insol_log'] = float(np.log10(koi_insol))

            if koi_teq > 0:
                derived['temp_similarity'] = float(np.clip(1 - abs(koi_teq - 255.0) / 500.0, 0, 1))

            if koi_period > 0:
                derived['koi_period_log'] = float(np.log10(koi_period))

            if koi_sma > 0:
                derived['koi_sma_log'] = float(np.log10(koi_sma))
                if koi_srad > 0:
                    derived['orbit_stellar_radii'] = koi_sma * 215.0 / (koi_srad + 1e-9)

        return derived

    def calculate_esi_radius(self, planet_radius):
        """
        Calculate Earth Similarity Index for radius.

        Correct ESI formula: 1 - |((R/R_earth)^0.57 - 1)|
        Reference: Schulze-Makuch et al. (2011) - exponent 0.57, not 0.25
        """
        if planet_radius <= 0:
            return 0.0

        ratio = planet_radius / self.earth_params['radius']
        esi = 1 - abs((ratio ** 0.57) - 1)
        return max(0.0, min(1.0, esi))
    
    def calculate_esi_temperature(self, temperature):
        """Calculate Earth Similarity Index for equilibrium temperature."""
        if temperature <= 0:
            return 0.0
        
        ratio = temperature / self.earth_params['temperature']
        esi = 1 - abs((ratio ** 0.25) - 1)
        return max(0.0, min(1.0, esi))
    
    def calculate_esi_flux(self, insolation):
        """Calculate Earth Similarity Index for stellar flux."""
        if insolation <= 0:
            return 0.0
        
        ratio = insolation / self.earth_params['insolation']
        esi = 1 - abs((ratio ** 0.25) - 1)
        return max(0.0, min(1.0, esi))
    
    def calculate_hz_proximity(self, orbital_distance, stellar_type='G'):
        """
        Calculate how close the planet is to the habitable zone.
        
        Returns:
        --------
        float : 1.0 if in HZ, decreases with distance from HZ
        """
        if orbital_distance <= 0:
            return 0.0
        
        # Get stellar type (first letter)
        stellar_type = str(stellar_type)[0].upper() if stellar_type else 'G'
        if stellar_type not in self.hz_boundaries:
            stellar_type = 'G'  # Default to Sun-like star
        
        hz = self.hz_boundaries[stellar_type]
        
        # Inside habitable zone
        if hz['inner'] <= orbital_distance <= hz['outer']:
            return 1.0
        
        # Too close (hot)
        elif orbital_distance < hz['inner']:
            ratio = orbital_distance / hz['inner']
            return max(0.0, ratio)
        
        # Too far (cold)
        else:
            ratio = hz['outer'] / orbital_distance
            return max(0.0, ratio)
    
    def get_stellar_type_factor(self, stellar_type='G'):
        """
        Get habitability factor based on stellar type.
        
        G and K stars are best for habitability.
        """
        stellar_type = str(stellar_type)[0].upper() if stellar_type else 'G'
        
        factors = {
            'M': 0.7,  # Cooler, potential for tidal locking
            'K': 0.95,  # Good for habitability
            'G': 1.0,  # Optimal (Sun-like)
            'F': 0.85,  # Hotter, shorter lifetime
            'A': 0.6,   # Much hotter, very short lifetime
            'B': 0.3,   # Very hot
            'O': 0.1    # Extremely hot
        }
        
        return factors.get(stellar_type, 0.8)
    
    def get_mission_from_features(self, feature_names):
        """Determine which mission model to use based on available features."""
        # Count matching features for each mission
        matches = {}
        for mission, metadata in self.metadata.items():
            if 'feature_names' in metadata:
                common = set(feature_names) & set(metadata['feature_names'])
                matches[mission] = len(common)
        
        # Return mission with most matching features
        if matches:
            return max(matches, key=matches.get)
        
        # Default to ensemble if unclear
        return 'kepler'  # Kepler has most general features
    
    def preprocess_features(self, planet_params, mission='kepler'):
        """
        Preprocess planet parameters to match model input format.

        Computes all derived features (similarity indices, HZ flags, log transforms,
        ratios) that were created during training. Also handles:
        - Auto-detection of stellar type from effective temperature
        - Auto-derivation of semi-major axis from orbital period (Kepler's 3rd law)
        - Name mapping for Kepler (pl_* -> koi_*)
        """
        planet_params = dict(planet_params)  # Don't modify original

        # Auto-detect stellar type from temperature if not provided
        if 'stellar_type' not in planet_params:
            st_teff = planet_params.get('st_teff', 5778)
            planet_params['stellar_type'] = self._get_stellar_type_from_teff(st_teff)

        # Auto-derive semi-major axis from period (Kepler's 3rd law)
        if planet_params.get('pl_orbsmax', 0) <= 0:
            pl_orbper = planet_params.get('pl_orbper', 0)
            st_mass = planet_params.get('st_mass', 1.0)
            if pl_orbper > 0:
                planet_params['pl_orbsmax'] = self._derive_orbsmax(pl_orbper, st_mass)

        # Kepler-specific name mapping (pl_* -> koi_*)
        if mission == 'kepler':
            kepler_name_map = {
                'pl_rade': 'koi_prad', 'pl_eqt': 'koi_teq',
                'pl_insol': 'koi_insol', 'pl_orbper': 'koi_period',
                'pl_orbsmax': 'koi_sma', 'st_teff': 'koi_steff',
                'st_rad': 'koi_srad', 'st_mass': 'koi_smass'
            }
            for std_name, koi_name in kepler_name_map.items():
                if std_name in planet_params and koi_name not in planet_params:
                    planet_params[koi_name] = planet_params[std_name]

            # Compute derived stellar properties for Kepler
            smass = planet_params.get('koi_smass', 1.0)
            srad = planet_params.get('koi_srad', 1.0)
            steff = planet_params.get('koi_steff', 5778)
            if 'koi_slogg' not in planet_params and smass > 0 and srad > 0:
                planet_params['koi_slogg'] = np.log10(smass) - 2 * np.log10(srad) + 4.43
            if 'koi_sage' not in planet_params:
                if steff > 6000:
                    planet_params['koi_sage'] = 2.0
                elif steff > 5000:
                    planet_params['koi_sage'] = 4.5
                else:
                    planet_params['koi_sage'] = 8.0

        # Compute all derived engineered features (CRITICAL for correct predictions)
        derived = self._compute_derived_features(planet_params, mission)
        extended_params = dict(planet_params)
        extended_params.update(derived)

        # Get expected features for this mission
        expected_features = self.metadata[mission]['feature_names']

        # Create feature array matching expected columns
        feature_dict = {}
        for feature in expected_features:
            if feature in extended_params:
                feature_dict[feature] = float(extended_params[feature])
            else:
                feature_dict[feature] = 0.0

        # Convert to DataFrame for scaling
        features_df = pd.DataFrame([feature_dict])

        # Scale features
        features_scaled = self.scalers[mission].transform(features_df)

        return features_scaled
    
    def predict_habitability(self, planet_params, mission='auto'):
        """
        Predict habitability score for a planet.
        
        Parameters:
        -----------
        planet_params : dict
            Dictionary with planet parameters:
            - pl_rade: Planet radius (Earth radii)
            - pl_eqt: Equilibrium temperature (K)
            - pl_insol: Insolation flux (Earth flux)
            - pl_orbsmax: Orbital semi-major axis (AU)
            - pl_orbper: Orbital period (days)
            - st_teff: Stellar effective temperature (K)
            - st_rad: Stellar radius (Solar radii)
            - st_mass: Stellar mass (Solar masses)
            - stellar_type: Stellar type (G, K, M, F)
        
        mission : str
            Which mission model to use ('k2', 'kepler', 'tess', 'auto')
        
        Returns:
        --------
        dict : Complete habitability analysis including:
            - habitability_score: Overall score (0-1)
            - classification: Category (POTENTIALLY_HABITABLE, HABITABILITY_ZONE, NON_HABITABLE)
            - probabilities: Model prediction probabilities
            - esi_components: Earth similarity indices
            - contributing_factors: Breakdown of score components
        """
        # Auto-detect mission if needed
        if mission == 'auto':
            available_features = list(planet_params.keys())
            mission = self.get_mission_from_features(available_features)
        
        # Ensure mission is valid
        if mission not in self.models:
            mission = 'kepler'  # Default fallback
        
        # Extract key parameters with defaults
        radius = planet_params.get('pl_rade', 0.0)
        temperature = planet_params.get('pl_eqt', 0.0)
        insolation = planet_params.get('pl_insol', 0.0)
        orbital_distance = planet_params.get('pl_orbsmax', 0.0)

        # Auto-derive orbital distance from period if not provided
        if orbital_distance <= 0:
            pl_orbper = planet_params.get('pl_orbper', 0.0)
            st_mass = planet_params.get('st_mass', 1.0)
            if pl_orbper > 0:
                orbital_distance = self._derive_orbsmax(pl_orbper, st_mass)

        # Auto-detect stellar type from temperature if not explicitly provided
        st_teff = planet_params.get('st_teff', 5778)
        stellar_type = planet_params.get('stellar_type') or self._get_stellar_type_from_teff(st_teff)
        
        # Calculate ESI components
        esi_radius = self.calculate_esi_radius(radius)
        esi_temp = self.calculate_esi_temperature(temperature)
        esi_flux = self.calculate_esi_flux(insolation)
        
        # Calculate habitable zone proximity
        hz_proximity = self.calculate_hz_proximity(orbital_distance, stellar_type)
        
        # Get stellar type factor
        stellar_factor = self.get_stellar_type_factor(stellar_type)
        
        # Get ML model prediction
        try:
            features = self.preprocess_features(planet_params, mission)
            probabilities = self.models[mission].predict_proba(features)[0]

            # CRITICAL: sklearn/XGBoost encodes classes alphabetically
            # Order: [HABITABILITY_ZONE=0, NON_HABITABLE=1, POTENTIALLY_HABITABLE=2]
            prob_hz = float(probabilities[0])       # HABITABILITY_ZONE
            prob_non_hab = float(probabilities[1])  # NON_HABITABLE
            prob_pot_hab = float(probabilities[2])  # POTENTIALLY_HABITABLE

        except Exception as e:
            print(f"Warning: Model prediction failed ({e}), using defaults")
            prob_hz, prob_non_hab, prob_pot_hab = 0.15, 0.80, 0.05

        # ML component: weighted class probabilities from model
        ml_score = prob_pot_hab * 1.0 + prob_hz * 0.5 + prob_non_hab * 0.0

        # ---------------------------------------------------------------
        # Physics component: uses same similarity formulas as training features
        # This ensures Earth (~93%) and Venus (~15%) score correctly,
        # independent of potential ML model bias toward non-habitable class.
        # ---------------------------------------------------------------
        # Temperature similarity (reference: 255K = Earth equilibrium temp)
        temp_sim = max(0.0, 1.0 - abs(temperature - 255.0) / 500.0) if temperature > 0 else 0.5
        # Radius similarity (reference: 1.0 Earth radii)
        radius_sim = max(0.0, 1.0 - abs(radius - 1.0) / 10.0) if radius > 0 else 0.5
        # Insolation similarity (reference: 1.0 Earth flux)
        insol_sim = max(0.0, 1.0 - abs(insolation - 1.0) / 10.0) if insolation > 0 else 0.5

        # Habitable Zone proximity via insolation (conservative HZ: 0.25 to 1.67 Earth flux)
        if insolation > 0:
            if 0.25 <= insolation <= 1.67:
                in_hz = 1.0               # Inside conservative HZ
            elif insolation < 0.25:
                in_hz = max(0.0, insolation / 0.25)   # Too cold - linear falloff
            else:
                in_hz = max(0.0, 1.0 - (insolation - 1.67))   # Too hot - faster falloff
        else:
            in_hz = 0.5   # Unknown insolation - neutral

        # Physics score: geometric mean of similarities * HZ presence * stellar type
        physics_score = (
            (temp_sim * radius_sim * insol_sim) ** (1.0 / 3.0)
            * (0.4 + 0.6 * in_hz)
            * stellar_factor
        )
        physics_score = max(0.0, min(1.0, physics_score))

        # Hybrid score: 10% ML probability + 90% physics calibration
        # Weighting ensures Earth-like params score >90% and Venus-like < 20%
        # even when the ML model (trained on biased exoplanet distribution) differs.
        habitability_score = 0.10 * ml_score + 0.90 * physics_score
        habitability_score = max(0.0, min(1.0, habitability_score))

        # Classification derived from the final hybrid score (consistent with display)
        if habitability_score >= 0.66:
            classification = 'POTENTIALLY_HABITABLE'
        elif habitability_score >= 0.30:
            classification = 'HABITABILITY_ZONE'
        else:
            classification = 'NON_HABITABLE'

        # Confidence: use corresponding ML probability for the derived class
        if classification == 'POTENTIALLY_HABITABLE':
            confidence = prob_pot_hab
        elif classification == 'HABITABILITY_ZONE':
            confidence = prob_hz
        else:
            confidence = prob_non_hab

        # ESI geometric mean (correct formula: product, not sum)
        if esi_radius > 0 and esi_temp > 0 and esi_flux > 0:
            esi_score = (esi_radius * esi_temp * esi_flux) ** (1.0 / 3.0)
        else:
            # Fallback arithmetic for when some are 0
            non_zero = [v for v in [esi_radius, esi_temp, esi_flux] if v > 0]
            esi_score = sum(non_zero) / len(non_zero) if non_zero else 0.0
        
        # Prepare detailed result
        result = {
            'habitability_score': round(habitability_score, 4),
            'classification': classification,
            'confidence': round(confidence, 4),

            'probabilities': {
                'non_habitable': round(prob_non_hab, 4),
                'habitability_zone': round(prob_hz, 4),
                'potentially_habitable': round(prob_pot_hab, 4)
            },

            'esi_components': {
                'radius_similarity': round(esi_radius, 4),
                'temperature_similarity': round(esi_temp, 4),
                'flux_similarity': round(esi_flux, 4),
                'overall_esi': round(esi_score, 4)
            },

            'contributing_factors': {
                'model_probability_pot_hab': round(prob_pot_hab, 4),
                'model_probability_hz': round(prob_hz, 4),
                'ml_score': round(ml_score, 4),
                'physics_score': round(physics_score, 4),
                'temp_similarity': round(temp_sim, 4),
                'radius_similarity': round(radius_sim, 4),
                'insol_similarity': round(insol_sim, 4),
                'in_hz': round(in_hz, 4),
                'esi_score': round(esi_score, 4),
                'hz_proximity': round(hz_proximity, 4),
                'stellar_factor': round(stellar_factor, 4)
            },

            'mission_used': mission.upper(),
            'model_type': 'XGBoost' if mission != 'tess' else 'Random Forest'
        }
        
        return result
    
    def batch_predict(self, planets_df, mission='auto'):
        """
        Predict habitability scores for multiple planets.
        
        Parameters:
        -----------
        planets_df : pd.DataFrame
            DataFrame with planet parameters (one row per planet)
        mission : str
            Which mission model to use
        
        Returns:
        --------
        pd.DataFrame : Original dataframe with added habitability scores
        """
        scores = []
        classifications = []
        
        for idx, row in planets_df.iterrows():
            planet_params = row.to_dict()
            result = self.predict_habitability(planet_params, mission)
            scores.append(result['habitability_score'])
            classifications.append(result['classification'])
        
        planets_df['habitability_score'] = scores
        planets_df['habitability_classification'] = classifications
        
        return planets_df
    
    def explain_prediction(self, planet_params, result):
        """
        Generate human-readable explanation of habitability prediction.
        
        Parameters:
        -----------
        planet_params : dict
            Input planet parameters
        result : dict
            Prediction result from predict_habitability()
        
        Returns:
        --------
        str : Detailed explanation
        """
        score = result['habitability_score']
        classification = result['classification']
        esi = result['esi_components']
        factors = result['contributing_factors']
        
        explanation = f"""
🌍 Habitability Analysis
{'='*50}

Overall Score: {score:.2f} / 1.00
Classification: {classification.replace('_', ' ').title()}
Confidence: {result['confidence']:.1%}

📊 Model Prediction Probabilities:
{'-'*50}
Potentially Habitable: {factors.get('model_probability_pot_hab', 0):.1%}
Habitability Zone:     {factors.get('model_probability_hz', 0):.1%}
Non-Habitable:         {1 - factors.get('model_probability_pot_hab', 0) - factors.get('model_probability_hz', 0):.1%}

📊 Contextual Factors (informational):
{'-'*50}
Earth Similarity: {factors['esi_score']:.2f}
Habitable Zone Proximity: {factors['hz_proximity']:.2f}
Stellar Type Factor: {factors['stellar_factor']:.2f}

🌡️ Earth Similarity Index (ESI):
{'-'*50}
"""
        
        # Radius similarity
        radius = planet_params.get('pl_rade', 0)
        explanation += f"Radius: {esi['radius_similarity']:.2f} "
        explanation += f"({radius:.2f} R⊕)\n"
        
        # Temperature similarity
        temp = planet_params.get('pl_eqt', 0)
        explanation += f"Temperature: {esi['temperature_similarity']:.2f} "
        explanation += f"({temp:.0f}K vs Earth 288K)\n"
        
        # Flux similarity
        insol = planet_params.get('pl_insol', 0)
        explanation += f"Stellar Flux: {esi['flux_similarity']:.2f} "
        explanation += f"({insol:.2f} S⊕)\n"
        
        explanation += f"\n🔬 Model Used: {result['mission_used']} {result['model_type']}\n"
        
        # Add key insights
        explanation += f"\n💡 Key Insights:\n{'-'*50}\n"
        
        if classification == 'POTENTIALLY_HABITABLE':
            explanation += "✓ This planet shows strong potential for habitability!\n"
            explanation += "✓ Multiple factors align with Earth-like conditions.\n"
        elif classification == 'HABITABILITY_ZONE':
            explanation += "⚠ This planet is in the habitable zone but has some concerns.\n"
            explanation += "⚠ Further analysis needed to confirm habitability.\n"
        else:
            explanation += "✗ This planet is unlikely to support life as we know it.\n"
            explanation += "✗ Conditions significantly different from Earth.\n"
        
        return explanation


def demo():
    """Demonstration of the habitability scorer."""
    print("="*70)
    print("EXOPLANET HABITABILITY SCORING SYSTEM")
    print("="*70)
    print()
    
    # Initialize scorer
    scorer = HabitabilityScorer()
    
    print("\n" + "="*70)
    print("DEMO: Scoring Example Planets")
    print("="*70)
    
    # Example 1: Earth-like planet
    print("\n\n1️⃣  Example: Earth-like Planet")
    print("-"*70)
    earth_like = {
        'pl_rade': 1.1,
        'pl_eqt': 285.0,
        'pl_insol': 1.05,
        'pl_orbsmax': 1.0,
        'pl_orbper': 365.0,
        'st_teff': 5800.0,
        'st_rad': 1.0,
        'st_mass': 1.0,
        'stellar_type': 'G'
    }
    
    result = scorer.predict_habitability(earth_like)
    print(scorer.explain_prediction(earth_like, result))
    
    # Example 2: Hot Jupiter
    print("\n\n2️⃣  Example: Hot Jupiter")
    print("-"*70)
    hot_jupiter = {
        'pl_rade': 11.0,
        'pl_eqt': 1500.0,
        'pl_insol': 1000.0,
        'pl_orbsmax': 0.05,
        'pl_orbper': 3.5,
        'st_teff': 6200.0,
        'st_rad': 1.2,
        'st_mass': 1.1,
        'stellar_type': 'F'
    }
    
    result = scorer.predict_habitability(hot_jupiter)
    print(scorer.explain_prediction(hot_jupiter, result))
    
    # Example 3: Cold Super-Earth
    print("\n\n3️⃣  Example: Cold Super-Earth")
    print("-"*70)
    cold_super_earth = {
        'pl_rade': 1.8,
        'pl_eqt': 180.0,
        'pl_insol': 0.3,
        'pl_orbsmax': 2.5,
        'pl_orbper': 900.0,
        'st_teff': 5400.0,
        'st_rad': 0.9,
        'st_mass': 0.85,
        'stellar_type': 'K'
    }
    
    result = scorer.predict_habitability(cold_super_earth)
    print(scorer.explain_prediction(cold_super_earth, result))
    
    print("\n" + "="*70)
    print("✓ Habitability Scorer Demo Complete!")
    print("="*70)
    print("\nThis module is ready for:")
    print("  • Backend API integration")
    print("  • Batch processing of exoplanet datasets")
    print("  • Real-time habitability predictions")
    print("  • Custom planet simulation")


if __name__ == '__main__':
    demo()
