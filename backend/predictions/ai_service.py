"""
AI Service for Habitability Predictions
========================================

This module loads ML models and provides prediction services.
It acts as the interface between the API views and the ML models.
"""

from pathlib import Path
import logging
import numpy as np

# Import the habitability scorer from the api folder
# (We'll keep the scorer in api folder for now as it's already there and working)
import sys
backend_path = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_path))

from api.habitability_scorer import HabitabilityScorer

logger = logging.getLogger(__name__)

# Global scorer instance (singleton)
_scorer = None
_shap_module = None
_shap_import_attempted = False
_lime_module = None
_lime_import_attempted = False

HUMAN_RELEVANT_FEATURE_KEYS = {
    'pl_rade', 'pl_eqt', 'pl_insol', 'pl_orbper', 'pl_orbsmax', 'pl_orbeccen',
    'st_teff', 'st_rad', 'st_mass',
    'radius_similarity', 'temp_similarity', 'insol_similarity',
    'in_hz_conservative', 'in_hz_optimistic',
    'is_rocky', 'is_earth_sized', 'is_super_earth',
    'planet_star_radius_ratio', 'orbit_stellar_radii',
    'pl_orbper_log', 'pl_orbsmax_log', 'pl_insol_log',
    'koi_prad', 'koi_teq', 'koi_insol', 'koi_period', 'koi_sma',
    'koi_steff', 'koi_srad', 'koi_smass',
}


def _format_feature_name(feature_name):
    """Convert raw feature names into readable labels."""
    label_map = {
        'pl_rade': 'Planet Radius',
        'pl_eqt': 'Equilibrium Temperature',
        'pl_insol': 'Insolation Flux',
        'pl_orbper': 'Orbital Period',
        'pl_orbsmax': 'Orbital Distance',
        'pl_orbeccen': 'Orbital Eccentricity',
        'st_teff': 'Star Temperature',
        'st_rad': 'Star Radius',
        'st_mass': 'Star Mass',
        'radius_similarity': 'Radius Similarity',
        'temp_similarity': 'Temperature Similarity',
        'insol_similarity': 'Flux Similarity',
        'in_hz_conservative': 'Conservative HZ Match',
        'in_hz_optimistic': 'Optimistic HZ Match',
        'is_rocky': 'Rocky Planet Indicator',
        'is_earth_sized': 'Earth-sized Indicator',
        'is_super_earth': 'Super-Earth Indicator',
        'planet_star_radius_ratio': 'Planet-Star Radius Ratio',
        'orbit_stellar_radii': 'Orbit in Stellar Radii',
        'pl_orbper_log': 'Log Orbital Period',
        'pl_orbsmax_log': 'Log Orbital Distance',
        'pl_insol_log': 'Log Insolation',
        'koi_prad': 'Planet Radius',
        'koi_teq': 'Equilibrium Temperature',
        'koi_insol': 'Insolation Flux',
        'koi_period': 'Orbital Period',
        'koi_sma': 'Orbital Distance',
        'koi_steff': 'Star Temperature',
        'koi_srad': 'Star Radius',
        'koi_smass': 'Star Mass',
    }
    return label_map.get(feature_name, feature_name.replace('_', ' ').title())


def _get_shap_module():
    """Lazy-load SHAP to avoid startup delays and import instability."""
    global _shap_module
    global _shap_import_attempted

    if _shap_import_attempted:
        return _shap_module

    _shap_import_attempted = True
    try:
        import shap  # pylint: disable=import-outside-toplevel
        _shap_module = shap
    except BaseException as exc:  # pragma: no cover - environment-specific import failures
        logger.warning(f"SHAP import unavailable, using fallback explainability: {exc}")
        _shap_module = None

    return _shap_module


def _get_lime_module():
    """Lazy-load LIME explainability module."""
    global _lime_module
    global _lime_import_attempted

    if _lime_import_attempted:
        return _lime_module

    _lime_import_attempted = True
    try:
        from lime import lime_tabular  # pylint: disable=import-outside-toplevel
        _lime_module = lime_tabular
    except BaseException as exc:  # pragma: no cover - environment-specific import failures
        logger.warning(f"LIME import unavailable, using fallback explainability: {exc}")
        _lime_module = None

    return _lime_module


def _resolve_shap_values(raw_shap_values, target_index, feature_count):
    """Normalize SHAP output shape across model types and SHAP versions."""
    if hasattr(raw_shap_values, 'values'):
        raw_shap_values = raw_shap_values.values

    if isinstance(raw_shap_values, list):
        if not raw_shap_values:
            return None
        if target_index < len(raw_shap_values):
            return np.asarray(raw_shap_values[target_index]).ravel()
        return np.asarray(raw_shap_values[0]).ravel()

    shap_array = np.asarray(raw_shap_values)

    # Typical multiclass shape: (1, n_features, n_classes)
    if shap_array.ndim == 3:
        # Case A: (samples, features, classes)
        if shap_array.shape[1] == feature_count and shap_array.shape[2] > target_index:
            return shap_array[0, :, target_index].ravel()

        # Case B: (samples, classes, features)
        if shap_array.shape[2] == feature_count and shap_array.shape[1] > target_index:
            return shap_array[0, target_index, :].ravel()

        # Best-effort fallbacks
        if shap_array.shape[1] == feature_count:
            return shap_array[0, :, 0].ravel()
        if shap_array.shape[2] == feature_count:
            return shap_array[0, 0, :].ravel()

        return None

    # Typical binary/regression shape: (1, n_features)
    if shap_array.ndim == 2:
        return shap_array[0].ravel()

    # Already a 1D vector
    if shap_array.ndim == 1:
        return shap_array.ravel()

    return None


def _resolve_target_index(model):
    """Resolve class index for POTENTIALLY_HABITABLE target."""
    target_index = 2
    if hasattr(model, 'classes_'):
        classes = list(model.classes_)
        if 'POTENTIALLY_HABITABLE' in classes:
            return classes.index('POTENTIALLY_HABITABLE')
        if 2 in classes:
            return classes.index(2)
        if classes:
            return min(len(classes) - 1, target_index)
    return target_index


def _build_lime_background(processed_vector, samples=256):
    """Create a stable local neighborhood for LIME around the input vector."""
    base_vector = np.nan_to_num(
        np.asarray(processed_vector).ravel().astype(float),
        nan=0.0,
        posinf=1.0,
        neginf=0.0,
    )
    feature_count = len(base_vector)
    rng = np.random.default_rng(42)
    neighborhood = rng.uniform(0.0, 1.0, size=(samples, feature_count))

    local_samples = max(samples // 2, 1)
    local_noise = rng.normal(loc=0.0, scale=0.15, size=(local_samples, feature_count))
    neighborhood[:local_samples] = np.tile(base_vector, (local_samples, 1)) + local_noise

    neighborhood[0] = base_vector
    neighborhood = np.nan_to_num(neighborhood, nan=0.0, posinf=1.0, neginf=0.0)
    return np.clip(neighborhood, 0.0, 1.0)


def _build_natural_language_explanation(result, ranked_features):
    """Generate concise user-friendly explanation text."""
    classification = result.get('classification', 'UNKNOWN').replace('_', ' ').title()
    score_pct = result.get('habitability_score', 0.0) * 100

    positive = [item for item in ranked_features if item.get('impact_direction') == 'supports']
    negative = [item for item in ranked_features if item.get('impact_direction') == 'reduces']

    if positive:
        top_positive = ', '.join(item['feature'] for item in positive[:2])
    else:
        top_positive = 'no strongly positive indicators'

    if negative:
        top_negative = ', '.join(item['feature'] for item in negative[:2])
    else:
        top_negative = 'no strongly negative indicators'

    return (
        f"The planet is classified as {classification} with a habitability score of {score_pct:.1f}%. "
        f"The model is most supported by {top_positive}, while {top_negative} has the strongest downward effect."
    )


def _fallback_ranked_features(planet_params):
    """Fallback attribution when SHAP is unavailable or fails."""
    # Reference profile and scales used to normalize deviations.
    earth_reference = {
        'pl_rade': (1.0, 2.5),
        'pl_eqt': (255.0, 400.0),
        'pl_insol': (1.0, 3.0),
        'pl_orbper': (365.25, 2000.0),
        'st_teff': (5778.0, 2200.0),
        'st_rad': (1.0, 1.5),
        'st_mass': (1.0, 1.2),
    }

    ranked = []
    for key, reference in earth_reference.items():
        if key not in planet_params:
            continue
        earth_value, norm_scale = reference
        raw = float(planet_params[key])
        relative_delta = abs(raw - earth_value) / max(norm_scale, 1e-9)
        importance = float(min(relative_delta, 1.0))
        direction = 'supports' if relative_delta <= 0.15 else 'reduces'
        ranked.append({
            'feature_key': key,
            'feature': _format_feature_name(key),
            'importance': round(importance, 6),
            'impact_direction': direction,
            'raw_shap': 0.0,
        })

    ranked.sort(key=lambda item: item['importance'], reverse=True)
    return ranked[:8]


def _filter_ranked_features_for_ui(ranked_features):
    """Prioritize user-meaningful features and hide technical error terms."""
    if not ranked_features:
        return ranked_features

    preferred = []
    remainder = []

    for item in ranked_features:
        key = item.get('feature_key', '')
        importance = float(item.get('importance', 0.0) or 0.0)

        # Hide near-zero attributions that add noise and appear repetitive.
        if importance <= 1e-6:
            continue

        # Hide uncertainty/error columns that are not interpretable for users.
        if 'err' in key.lower():
            continue

        if key in HUMAN_RELEVANT_FEATURE_KEYS:
            preferred.append(item)
        else:
            remainder.append(item)

    if len(preferred) >= 3:
        return preferred[:10]

    merged = preferred + remainder
    return merged[:10]


def get_scorer():
    """
    Get the singleton habitability scorer instance.
    
    Returns:
        HabitabilityScorer: The ML model scorer instance
    """
    global _scorer
    
    if _scorer is None:
        try:
            logger.info("Initializing HabitabilityScorer...")
            _scorer = HabitabilityScorer()
            logger.info("HabitabilityScorer initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize HabitabilityScorer: {e}")
            _scorer = None
    
    return _scorer


def is_service_available():
    """
    Check if the AI service is available.
    
    Returns:
        bool: True if models are loaded and ready
    """
    scorer = get_scorer()
    return scorer is not None and len(scorer.models) > 0


def predict_single(planet_params, mission='auto'):
    """
    Predict habitability for a single planet.
    
    Args:
        planet_params (dict): Planet parameters
        mission (str): Mission model to use ('auto', 'k2', 'kepler', 'tess')
    
    Returns:
        dict: Prediction result with habitability score and details
    
    Raises:
        RuntimeError: If service is not available
        ValueError: If invalid parameters provided
    """
    scorer = get_scorer()
    
    if scorer is None:
        raise RuntimeError("AI service is not available. Models not loaded.")
    
    try:
        result = scorer.predict_habitability(planet_params, mission=mission)
        return result
    except Exception as e:
        logger.error(f"Prediction error: {e}")
        raise


def predict_batch(planets_list, mission='auto'):
    """
    Predict habitability for multiple planets.
    
    Args:
        planets_list (list): List of planet parameter dictionaries
        mission (str): Mission model to use
    
    Returns:
        list: List of prediction results
    """
    scorer = get_scorer()
    
    if scorer is None:
        raise RuntimeError("AI service is not available.")
    
    results = []
    
    for idx, planet_params in enumerate(planets_list):
        try:
            result = scorer.predict_habitability(planet_params, mission=mission)
            result['planet_index'] = idx
            result['success'] = True
            results.append(result)
        except Exception as e:
            logger.error(f"Error predicting planet {idx}: {e}")
            results.append({
                'planet_index': idx,
                'success': False,
                'error': str(e)
            })
    
    return results


def get_models_info():
    """
    Get information about loaded ML models.
    
    Returns:
        dict: Models information
    """
    scorer = get_scorer()
    
    if scorer is None:
        return {
            'models_loaded': 0,
            'missions': [],
            'status': 'unavailable'
        }
    
    models_data = {}
    
    for mission in scorer.models.keys():
        models_data[mission] = {
            'model_type': 'XGBoost' if mission != 'tess' else 'Random Forest',
            'mission': mission.upper(),
            'features_count': len(scorer.metadata[mission].get('feature_names', [])),
            'scaler_type': 'MinMaxScaler'
        }
    
    return {
        'models_loaded': len(scorer.models),
        'missions': list(scorer.models.keys()),
        'models': models_data,
        'status': 'operational'
    }


def explain_single(planet_params, mission='auto', explanation_method='auto'):
    """Return prediction plus feature-level explainability details."""
    scorer = get_scorer()

    if scorer is None:
        raise RuntimeError("AI service is not available. Models not loaded.")

    result = predict_single(planet_params, mission=mission)

    used_mission = result.get('mission_used', mission)
    used_mission_key = str(used_mission).lower()
    if used_mission_key == 'auto' or used_mission_key not in scorer.models:
        used_mission_key = scorer.get_mission_from_features(list(planet_params.keys()))
        if used_mission_key not in scorer.models:
            used_mission_key = 'kepler'

    requested_method = str(explanation_method or 'auto').lower()
    if requested_method not in {'auto', 'shap', 'lime', 'fallback'}:
        requested_method = 'auto'

    ranked_features = []
    active_explanation_method = 'fallback'

    model = scorer.models[used_mission_key]
    feature_names = scorer.metadata[used_mission_key].get('feature_names', [])
    processed = scorer.preprocess_features(planet_params, used_mission_key)
    processed = np.nan_to_num(processed, nan=0.0, posinf=1.0, neginf=0.0)
    processed_vector = np.asarray(processed).ravel()
    target_index = _resolve_target_index(model)

    if requested_method in {'auto', 'shap'}:
        shap_module = _get_shap_module()
        if shap_module is not None:
            try:
                explainer = shap_module.TreeExplainer(model)
                shap_values = explainer.shap_values(processed)
                class_shap = _resolve_shap_values(shap_values, target_index, len(feature_names))

                if class_shap is not None and len(feature_names) == len(class_shap):
                    for idx, feature_name in enumerate(feature_names):
                        raw_value = float(class_shap[idx])
                        abs_value = float(abs(raw_value))
                        direction = 'supports' if raw_value >= 0 else 'reduces'
                        ranked_features.append({
                            'feature_key': feature_name,
                            'feature': _format_feature_name(feature_name),
                            'importance': round(abs_value, 6),
                            'impact_direction': direction,
                            'raw_shap': round(raw_value, 6),
                        })

                    ranked_features.sort(key=lambda item: item['importance'], reverse=True)
                    ranked_features = _filter_ranked_features_for_ui(ranked_features)
                    active_explanation_method = 'shap'

            except Exception as exc:
                logger.warning(f"SHAP explainability failed: {exc}")

    if not ranked_features and requested_method in {'auto', 'lime'}:
        lime_module = _get_lime_module()
        if lime_module is not None:
            try:
                if hasattr(model, 'classes_'):
                    class_names = [str(label) for label in model.classes_]
                else:
                    class_count = model.predict_proba(processed[:1]).shape[1]
                    class_names = [f'class_{idx}' for idx in range(class_count)]

                explainer = lime_module.LimeTabularExplainer(
                    training_data=_build_lime_background(processed_vector),
                    feature_names=feature_names,
                    class_names=class_names,
                    mode='classification',
                    discretize_continuous=False,
                    random_state=42,
                )

                lime_result = explainer.explain_instance(
                    processed_vector,
                    model.predict_proba,
                    labels=[target_index],
                    num_features=min(12, len(feature_names)),
                    num_samples=4000,
                )

                class_contributions = lime_result.local_exp.get(target_index, [])
                for feature_idx, raw_value in class_contributions:
                    if feature_idx < 0 or feature_idx >= len(feature_names):
                        continue
                    contribution = float(raw_value)
                    ranked_features.append({
                        'feature_key': feature_names[feature_idx],
                        'feature': _format_feature_name(feature_names[feature_idx]),
                        'importance': round(abs(contribution), 6),
                        'impact_direction': 'supports' if contribution >= 0 else 'reduces',
                        'raw_shap': round(contribution, 6),
                    })

                if ranked_features:
                    ranked_features.sort(key=lambda item: item['importance'], reverse=True)
                    filtered_features = _filter_ranked_features_for_ui(ranked_features)
                    ranked_features = filtered_features if filtered_features else ranked_features[:10]
                    active_explanation_method = 'lime'

            except Exception as exc:
                logger.warning(f"LIME explainability failed: {exc}")

    if not ranked_features or requested_method == 'fallback':
        ranked_features = _fallback_ranked_features(planet_params)
        active_explanation_method = 'fallback'
    elif active_explanation_method == 'shap':
        ranked_features = _filter_ranked_features_for_ui(ranked_features)

    return {
        'habitability_score': result.get('habitability_score'),
        'classification': result.get('classification'),
        'confidence': result.get('confidence'),
        'mission_used': result.get('mission_used'),
        'model_type': result.get('model_type'),
        'probabilities': result.get('probabilities'),
        'esi_components': result.get('esi_components'),
        'contributing_factors': result.get('contributing_factors'),
        'feature_importance': ranked_features,
        'natural_language_explanation': _build_natural_language_explanation(result, ranked_features),
        'explanation_method': active_explanation_method,
        'requested_explanation_method': requested_method,
    }
