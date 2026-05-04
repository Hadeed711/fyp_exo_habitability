"""
Simple Exoplanet Habitability Predictor
Edit test_models_inputs.json to test different planets
Just 8 parameters needed - the model will auto-calculate the other 122 features!
"""
import json
import pickle
import pandas as pd
import numpy as np
from pathlib import Path

def load_scaler_params():
    """Load MinMax scaler parameters from training data"""
    train_data = pd.read_csv('data/processed/kepler/kepler_habitability_train_minmax.csv')
    
    # Get min/max for each feature (excluding target columns)
    features = [col for col in train_data.columns if col not in ['target', 'target_name']]
    
    # Load the original unscaled training data to get true min/max
    full_data = pd.read_csv('data/processed/kepler/kepler_habitability_full_processed.csv')
    
    mins = full_data[features].min()
    maxs = full_data[features].max()
    
    return features, mins, maxs

def engineer_features(params):
    """Calculate all 130 features from 8 input parameters"""
    
    # Input parameters (UNSCALED)
    period = params['koi_period']
    prad = params['koi_prad']
    teq = params['koi_teq']
    insol = params['koi_insol']
    sma = params['koi_sma']
    steff = params['koi_steff']
    srad = params['koi_srad']
    smass = params['koi_smass']
    
    # Initialize feature dictionary with all 117 NASA catalog features
    features = {}
    
    # Core orbital parameters
    features['koi_period'] = period
    features['koi_period_err1'] = period * 0.001  # Assume 0.1% error
    features['koi_period_err2'] = -period * 0.001
    
    # Semi-major axis
    features['koi_sma'] = sma
    features['koi_sma_err1'] = sma * 0.01
    features['koi_sma_err2'] = -sma * 0.01
    
    # Planet radius
    features['koi_prad'] = prad
    features['koi_prad_err1'] = prad * 0.05
    features['koi_prad_err2'] = -prad * 0.05
    
    # Temperature
    features['koi_teq'] = teq
    features['koi_teq_err1'] = teq * 0.02
    features['koi_teq_err2'] = -teq * 0.02
    
    # Insolation
    features['koi_insol'] = insol
    features['koi_insol_err1'] = insol * 0.05
    features['koi_insol_err2'] = -insol * 0.05
    
    # Stellar parameters
    features['koi_steff'] = steff
    features['koi_steff_err1'] = steff * 0.01
    features['koi_steff_err2'] = -steff * 0.01
    
    features['koi_srad'] = srad
    features['koi_srad_err1'] = srad * 0.02
    features['koi_srad_err2'] = -srad * 0.02
    
    features['koi_smass'] = smass
    features['koi_smass_err1'] = smass * 0.02
    features['koi_smass_err2'] = -smass * 0.02
    
    # Stellar surface gravity (calculated from mass and radius)
    # log g = log(M/M_sun) - 2*log(R/R_sun) + 4.43 (solar log g)
    features['koi_slogg'] = np.log10(smass) - 2*np.log10(srad) + 4.43
    features['koi_slogg_err1'] = 0.05
    features['koi_slogg_err2'] = -0.05
    
    # Stellar metallicity (assume solar)
    features['koi_smet'] = 0.0
    features['koi_smet_err1'] = 0.1
    features['koi_smet_err2'] = -0.1
    
    # Stellar age (rough estimate based on temperature)
    if steff > 6000:
        age = 2.0  # Hot stars are younger
    elif steff > 5000:
        age = 4.5  # Sun-like
    else:
        age = 8.0  # Cool stars are older
    features['koi_sage'] = age
    features['koi_sage_err1'] = age * 0.3
    features['koi_sage_err2'] = -age * 0.3
    
    # Transit properties (calculated from orbital mechanics)
    # Transit duration (simplified formula)
    ratio = srad / sma
    if ratio > 1.0:
        ratio = 1.0  # Clip to avoid arcsin domain error
    features['koi_duration'] = (period / np.pi) * np.arcsin(ratio) * 24  # hours
    features['koi_duration_err1'] = features['koi_duration'] * 0.02
    features['koi_duration_err2'] = -features['koi_duration'] * 0.02
    
    # Transit depth (planet blocks stellar light)
    transit_depth = (prad * 0.00916 / srad) ** 2  # Convert Earth radii to Solar radii
    features['koi_depth'] = transit_depth * 1e6  # ppm
    features['koi_depth_err1'] = features['koi_depth'] * 0.05
    features['koi_depth_err2'] = -features['koi_depth'] * 0.05
    
    # Planet-to-star radius ratio
    features['koi_ror'] = (prad * 0.00916) / srad
    features['koi_ror_err1'] = features['koi_ror'] * 0.05
    features['koi_ror_err2'] = -features['koi_ror'] * 0.05
    
    # Impact parameter (assume circular orbit, mid-plane crossing)
    features['koi_impact'] = 0.3
    features['koi_impact_err1'] = 0.1
    features['koi_impact_err2'] = -0.1
    
    # Orbital inclination (nearly edge-on for transiting planets)
    features['koi_incl'] = 89.5
    features['koi_incl_err1'] = 0.5
    features['koi_incl_err2'] = -0.5
    
    # Eccentricity (assume circular orbit)
    features['koi_eccen'] = 0.0
    features['koi_eccen_err1'] = 0.05
    features['koi_eccen_err2'] = -0.05
    
    # Longitude of periastron (not applicable for circular orbits)
    features['koi_longp'] = 0.0
    features['koi_longp_err1'] = 0.0
    features['koi_longp_err2'] = 0.0
    
    # Transit timing (set to epoch 0)
    features['koi_time0bk'] = 0.0
    features['koi_time0bk_err1'] = 0.0001
    features['koi_time0bk_err2'] = -0.0001
    
    features['koi_time0'] = 0.0
    features['koi_time0_err1'] = 0.0001
    features['koi_time0_err2'] = -0.0001
    
    # Ingress duration
    features['koi_ingress'] = features['koi_duration'] * 0.15
    features['koi_ingress_err1'] = features['koi_ingress'] * 0.1
    features['koi_ingress_err2'] = -features['koi_ingress'] * 0.1
    
    # Scaled stellar density
    features['koi_srho'] = smass / (srad ** 3)
    features['koi_srho_err1'] = features['koi_srho'] * 0.05
    features['koi_srho_err2'] = -features['koi_srho'] * 0.05
    
    # Planet-star distance ratio
    features['koi_dor'] = sma * 215.0 / srad  # AU to stellar radii
    features['koi_dor_err1'] = features['koi_dor'] * 0.02
    features['koi_dor_err2'] = -features['koi_dor'] * 0.02
    
    # Limb darkening coefficients (typical for Sun-like stars)
    features['koi_ldm_coeff1'] = 0.5
    features['koi_ldm_coeff2'] = 0.2
    features['koi_ldm_coeff3'] = 0.0
    features['koi_ldm_coeff4'] = 0.0
    
    # Model fit statistics (assume good fit)
    features['koi_model_snr'] = 50.0
    features['koi_model_dof'] = 100
    features['koi_model_chisq'] = 95.0
    
    # Detection statistics
    features['koi_max_sngle_ev'] = 10.0
    features['koi_max_mult_ev'] = 8.0
    features['koi_count'] = 1
    features['koi_num_transits'] = int(1000 / period)
    features['koi_tce_plnt_num'] = 1
    features['koi_bin_oedp_sig'] = 5.0
    
    # Sky coordinates (arbitrary)
    features['ra'] = 290.0
    features['dec'] = 45.0
    
    # Magnitudes (typical for Kepler targets)
    features['koi_kepmag'] = 14.0
    features['koi_gmag'] = 14.5
    features['koi_rmag'] = 14.0
    features['koi_imag'] = 13.8
    features['koi_zmag'] = 13.5
    features['koi_jmag'] = 13.2
    features['koi_hmag'] = 12.8
    features['koi_kmag'] = 12.7
    
    # Centroid motion tests (assume stationary)
    features['koi_fwm_stat_sig'] = 0.1
    features['koi_fwm_sra'] = 0.0
    features['koi_fwm_sra_err'] = 0.01
    features['koi_fwm_sdec'] = 0.0
    features['koi_fwm_sdec_err'] = 0.01
    features['koi_fwm_srao'] = 0.0
    features['koi_fwm_srao_err'] = 0.01
    features['koi_fwm_sdeco'] = 0.0
    features['koi_fwm_sdeco_err'] = 0.01
    features['koi_fwm_prao'] = 0.0
    features['koi_fwm_prao_err'] = 0.01
    features['koi_fwm_pdeco'] = 0.0
    features['koi_fwm_pdeco_err'] = 0.01
    
    # Difference image analysis
    features['koi_dicco_mra'] = 0.0
    features['koi_dicco_mra_err'] = 0.01
    features['koi_dicco_mdec'] = 0.0
    features['koi_dicco_mdec_err'] = 0.01
    features['koi_dicco_msky'] = 0.0
    features['koi_dicco_msky_err'] = 0.01
    
    features['koi_dikco_mra'] = 0.0
    features['koi_dikco_mra_err'] = 0.01
    features['koi_dikco_mdec'] = 0.0
    features['koi_dikco_mdec_err'] = 0.01
    features['koi_dikco_msky'] = 0.0
    features['koi_dikco_msky_err'] = 0.01
    
    # ===== FEATURE ENGINEERING (13 derived features) =====
    
    # Earth Similarity Indices
    features['radius_similarity'] = 1 - abs(prad - 1.0) / 1.0
    features['insol_similarity'] = 1 - abs(insol - 1.0) / 1.0
    features['temp_similarity'] = 1 - abs(teq - 288.0) / 288.0
    
    # Habitability Zone flags
    features['in_hz_conservative'] = 1.0 if 0.25 <= insol <= 4.0 else 0.0
    features['in_hz_optimistic'] = 1.0 if 0.1 <= insol <= 10.0 else 0.0
    
    # Planet type classifications
    features['is_rocky'] = 1.0 if prad <= 2.0 else 0.0
    features['is_super_earth'] = 1.0 if 1.0 <= prad <= 2.0 else 0.0
    features['is_earth_sized'] = 1.0 if 0.8 <= prad <= 1.25 else 0.0
    
    # Logarithmic transformations
    features['koi_period_log'] = np.log10(period) if period > 0 else 0.0
    features['koi_sma_log'] = np.log10(sma) if sma > 0 else 0.0
    features['koi_insol_log'] = np.log10(insol) if insol > 0 else -10.0
    
    # Ratios
    features['planet_star_radius_ratio'] = (prad * 0.00916) / srad
    features['orbit_stellar_radii'] = sma * 215.0 / srad
    
    return features

def scale_features(features, feature_names, mins, maxs):
    """Apply MinMax scaling to features"""
    scaled = {}
    for name in feature_names:
        if name in features:
            value = features[name]
            min_val = mins[name]
            max_val = maxs[name]
            
            # MinMax scaling: (value - min) / (max - min)
            if max_val > min_val:
                scaled[name] = (value - min_val) / (max_val - min_val)
            else:
                scaled[name] = 0.5  # If min == max, use middle value
        else:
            scaled[name] = 0.0  # Missing features get 0
    
    return scaled

def predict_habitability(input_params):
    """Main prediction function"""
    
    # Load model and scaler parameters
    model = pickle.load(open('models/kepler_xgboost_model.pkl', 'rb'))
    feature_names, mins, maxs = load_scaler_params()
    
    # Engineer all 130 features from 8 inputs
    features = engineer_features(input_params)
    
    # Scale features
    scaled_features = scale_features(features, feature_names, mins, maxs)
    
    # Create DataFrame for prediction
    feature_df = pd.DataFrame([scaled_features])
    
    # Predict
    prediction = model.predict(feature_df)[0]
    probabilities = model.predict_proba(feature_df)[0]
    
    # Class names
    class_names = ['Habitability Zone', 'Non-Habitable', 'Potentially Habitable']
    
    return {
        'prediction': class_names[prediction],
        'confidence': float(probabilities[prediction]),
        'probabilities': {
            class_names[i]: float(probabilities[i]) 
            for i in range(len(class_names))
        }
    }

def main():
    """Run predictions on test inputs"""
    
    print("\n" + "=" * 70)
    print("EXOPLANET HABITABILITY PREDICTOR")
    print("=" * 70)
    print("Edit test_models_inputs.json to test different planets")
    print("=" * 70 + "\n")
    
    # Load test inputs
    with open('test_models_inputs.json', 'r') as f:
        config = json.load(f)
    
    test_planets = config['test_planets']
    
    # Test each planet
    for i, planet in enumerate(test_planets, 1):
        name = planet['name']
        
        # Extract parameters
        params = {k: v for k, v in planet.items() if k != 'name'}
        
        # Predict
        result = predict_habitability(params)
        
        # Display results
        print(f"{i}. {name}")
        print(f"   Input Parameters:")
        print(f"      Period: {params['koi_period']} days")
        print(f"      Radius: {params['koi_prad']} Earth radii")
        print(f"      Temperature: {params['koi_teq']} K")
        print(f"      Insolation: {params['koi_insol']} Earth flux")
        
        print(f"\n   Prediction: {result['prediction']}")
        print(f"   Confidence: {result['confidence']:.1%}")
        print(f"\n   All Probabilities:")
        for class_name, prob in result['probabilities'].items():
            bar = "█" * int(prob * 30)
            print(f"      {class_name:30s} {prob:6.1%} {bar}")
        print("\n" + "-" * 70 + "\n")
    
    print("=" * 70)
    print("✓ Done! Edit test_models_inputs.json to test more planets")
    print("=" * 70 + "\n")

if __name__ == '__main__':
    main()
