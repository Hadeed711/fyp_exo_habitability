"""
Unit tests for ML models and habitability scorer.

Run with: pytest tests/test_habitability_scorer.py -v
"""

import pytest
import pickle
import numpy as np
import pandas as pd
from pathlib import Path


def _get_class_id(test_df, class_name):
    """Resolve numeric class id from target_name label in test data."""
    if 'target' not in test_df.columns or 'target_name' not in test_df.columns:
        return None

    label_matches = test_df['target_name'].astype(str).str.upper() == class_name.upper()
    if not label_matches.any():
        return None

    return int(test_df.loc[label_matches, 'target'].mode().iloc[0])


@pytest.fixture
def models_dir():
    """Fixture for models directory."""
    return Path('models')


@pytest.fixture
def data_dir():
    """Fixture for data directory."""
    return Path('data/processed')


@pytest.fixture
def kepler_model(models_dir):
    """Load Kepler XGBoost model."""
    model_path = models_dir / 'kepler_xgboost_model.pkl'
    if model_path.exists():
        with open(model_path, 'rb') as f:
            return pickle.load(f)
    pytest.skip("Kepler model not found")


@pytest.fixture
def test_data(data_dir):
    """Load Kepler test data."""
    test_path = data_dir / 'kepler' / 'kepler_habitability_test.csv'
    if test_path.exists():
        return pd.read_csv(test_path)
    pytest.skip("Test data not found")


class TestModelLoading:
    """Test that models can be loaded correctly."""
    
    def test_models_exist(self, models_dir):
        """Test that all required model files exist."""
        required_models = [
            'k2_xgboost_model.pkl',
            'kepler_xgboost_model.pkl',
            'tess_random_forest_model.pkl'
        ]
        
        for model_file in required_models:
            assert (models_dir / model_file).exists(), f"Missing {model_file}"
    
    def test_model_loadable(self, kepler_model):
        """Test that model can be loaded and has required methods."""
        assert hasattr(kepler_model, 'predict'), "Model missing predict method"
        assert hasattr(kepler_model, 'predict_proba'), "Model missing predict_proba method"


class TestPredictions:
    """Test model predictions."""
    
    def test_prediction_shape(self, kepler_model, test_data):
        """Test that predictions have correct shape."""
        X_test = test_data.drop(['target', 'target_name'], axis=1, errors='ignore')
        predictions = kepler_model.predict(X_test.head(10))
        
        assert len(predictions) == 10, "Prediction count mismatch"
        assert all(p in [0, 1, 2] for p in predictions), "Invalid prediction classes"
    
    def test_prediction_probabilities(self, kepler_model, test_data):
        """Test that prediction probabilities are valid."""
        X_test = test_data.drop(['target', 'target_name'], axis=1, errors='ignore')
        probas = kepler_model.predict_proba(X_test.head(10))
        
        # Check shape
        assert probas.shape == (10, 3), "Probability shape mismatch"
        
        # Check probabilities sum to 1
        prob_sums = probas.sum(axis=1)
        assert np.allclose(prob_sums, 1.0), "Probabilities don't sum to 1"
        
        # Check probabilities are between 0 and 1
        assert np.all((probas >= 0) & (probas <= 1)), "Invalid probability values"
    
    def test_earth_like_planet(self, kepler_model, test_data):
        """Test prediction for a known habitable-labeled sample."""
        habitable_mask = test_data['target_name'].astype(str).str.upper().isin(
            ['POTENTIALLY_HABITABLE', 'HABITABILITY_ZONE']
        )
        habitable_samples = test_data.loc[habitable_mask]
        if habitable_samples.empty:
            pytest.skip("No habitable-labeled samples available in test data")

        X = habitable_samples.drop(['target', 'target_name'], axis=1, errors='ignore').head(1)

        # Make prediction
        prediction = kepler_model.predict(X)[0]
        probas = kepler_model.predict_proba(X)[0]
        
        potentially_habitable_class = _get_class_id(test_data, 'POTENTIALLY_HABITABLE')
        habitability_zone_class = _get_class_id(test_data, 'HABITABILITY_ZONE')
        expected_classes = [c for c in [potentially_habitable_class, habitability_zone_class] if c is not None]

        # Earth-like should map to habitable-oriented classes (not non-habitable)
        if expected_classes:
            assert prediction in expected_classes, f"Habitable sample classified as {prediction}"
        else:
            non_habitable_class = _get_class_id(test_data, 'NON_HABITABLE')
            assert prediction != non_habitable_class, f"Habitable sample classified as {prediction}"
        
        # Should have reasonable confidence
        confidence = probas.max()
        assert confidence > 0.5, f"Low confidence ({confidence:.2%}) for habitable sample"
    
    def test_hot_jupiter(self, kepler_model, test_data):
        """Test prediction for hot Jupiter (should be non-habitable)."""
        feature_names = [col for col in test_data.columns 
                        if col not in ['target', 'target_name']]
        
        # Create hot Jupiter parameters
        hot_jupiter = {feat: 0 for feat in feature_names}
        
        if 'koi_period' in feature_names:
            hot_jupiter['koi_period'] = 3.5  # Very short period
        if 'koi_prad' in feature_names:
            hot_jupiter['koi_prad'] = 11.0  # Jupiter-sized
        if 'koi_teq' in feature_names:
            hot_jupiter['koi_teq'] = 1500  # Very hot
        if 'koi_insol' in feature_names:
            hot_jupiter['koi_insol'] = 1000  # Very high insolation
        
        X = pd.DataFrame([hot_jupiter])
        prediction = kepler_model.predict(X)[0]
        
        non_habitable_class = _get_class_id(test_data, 'NON_HABITABLE')
        assert non_habitable_class is not None, "Could not resolve NON_HABITABLE class id"

        # Hot Jupiter should map to the NON_HABITABLE class for this dataset/model.
        assert prediction == non_habitable_class, (
            f"Hot Jupiter classified as {prediction}, expected {non_habitable_class}"
        )


class TestModelAccuracy:
    """Test model accuracy on test set."""
    
    def test_minimum_accuracy(self, kepler_model, test_data):
        """Test that model meets minimum accuracy threshold."""
        X_test = test_data.drop(['target', 'target_name'], axis=1, errors='ignore')
        y_test = test_data['target']
        
        predictions = kepler_model.predict(X_test)
        accuracy = (predictions == y_test).mean()
        
        # Model should achieve at least 85% accuracy
        assert accuracy >= 0.85, f"Accuracy {accuracy:.2%} below threshold (85%)"
        
        print(f"\nModel accuracy: {accuracy:.2%}")


class TestInputValidation:
    """Test input validation and edge cases."""
    
    def test_missing_values(self, kepler_model, test_data):
        """Test handling of missing values."""
        X_test = test_data.drop(['target', 'target_name'], axis=1, errors='ignore').head(5)
        
        # Introduce NaN values
        X_with_nan = X_test.copy()
        X_with_nan.iloc[0, 0] = np.nan
        
        # Fill NaN with 0 (should be handled gracefully)
        X_filled = X_with_nan.fillna(0)
        
        try:
            predictions = kepler_model.predict(X_filled)
            assert len(predictions) == 5, "Failed to handle missing values"
        except Exception as e:
            pytest.fail(f"Model failed with missing values: {e}")
    
    def test_extreme_values(self, kepler_model, test_data):
        """Test handling of extreme values."""
        feature_names = [col for col in test_data.columns 
                        if col not in ['target', 'target_name']]
        
        # Create extreme case
        extreme = {feat: 0 for feat in feature_names}
        
        if 'koi_prad' in feature_names:
            extreme['koi_prad'] = 100  # Unrealistically large
        if 'koi_teq' in feature_names:
            extreme['koi_teq'] = 5000  # Extremely hot
        
        X = pd.DataFrame([extreme])
        
        try:
            prediction = kepler_model.predict(X)[0]
            probas = kepler_model.predict_proba(X)[0]
            
            # Should still produce valid output
            assert prediction in [0, 1, 2], "Invalid prediction class"
            assert np.isclose(probas.sum(), 1.0), "Invalid probabilities"
        except Exception as e:
            pytest.fail(f"Model failed with extreme values: {e}")


# Parametrized tests for multiple missions
@pytest.mark.parametrize("mission,model_type", [
    ('k2', 'xgboost'),
    ('kepler', 'xgboost'),
    ('tess', 'random_forest')
])
def test_all_missions(mission, model_type):
    """Test that all mission models work correctly."""
    models_dir = Path('models')
    model_path = models_dir / f'{mission}_{model_type}_model.pkl'
    
    if not model_path.exists():
        pytest.skip(f"{mission} model not found")
    
    with open(model_path, 'rb') as f:
        model = pickle.load(f)
    
    # Test that model has required methods
    assert hasattr(model, 'predict')
    assert hasattr(model, 'predict_proba')
    
    # Test on dummy data
    data_dir = Path('data/processed')
    mission_dir = data_dir / mission
    candidate_paths = [
        mission_dir / f'{mission}_habitability_test_minmax.csv',
        mission_dir / f'{mission}_habitability_test.csv',
    ]
    test_path = next((path for path in candidate_paths if path.exists()), None)

    if test_path is not None:
        test_df = pd.read_csv(test_path)
        X_test = test_df.drop(['target', 'target_name'], axis=1, errors='ignore')
        
        # Test prediction
        predictions = model.predict(X_test.head(5))
        assert len(predictions) == 5
        
        # Test accuracy
        predictions_all = model.predict(X_test)
        accuracy = (predictions_all == test_df['target']).mean()
        
        print(f"\n{mission.upper()} accuracy: {accuracy:.2%}")
        assert accuracy >= 0.85, f"{mission} accuracy below threshold"