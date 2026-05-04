# AI Exoplanet Habitability Explorer

## 🌍 Project Overview

This Final Year Project is an **AI-powered system** that predicts exoplanet habitability using machine learning on data from three major NASA missions: Kepler, K2, and TESS.

### Objectives
- Classify exoplanets into habitability categories based on planetary and stellar parameters
- Focus on key habitability indicators: planet radius, orbital period, equilibrium temperature, insolation flux, stellar characteristics
- Create ML-ready datasets for multi-class habitability classification
- Develop a comprehensive data processing and analysis pipeline
- Provide easy-to-use testing tools for model evaluation

### Current Status: ✅ Complete System
- ✅ Phase 1: Data Collection & Processing
- ✅ Phase 2: ML Model Training (96% accuracy)
- ✅ Phase 3: Backend API with 9,614 exoplanets
- ✅ Phase 4: JSON-based Testing System

## 🚀 Quick Start - Testing Models

### Simple Testing Interface
```bash
# 1. Edit test parameters (8 values per planet)
# Open test_models_inputs.json

# 2. Run predictions
python test_models.py

# Results show immediately with confidence percentages
```

**See**: [TEST_MODELS_README.md](TEST_MODELS_README.md) for instructions

### Documentation
- 📝 [TEST_MODELS_README.md](TEST_MODELS_README.md) - Quick start guide
- 📚 [FINAL_SOLUTION_SUMMARY.md](FINAL_SOLUTION_SUMMARY.md) - Complete technical overview
- 📊 [PROJECT_UNDERSTANDING_GUIDE.md](PROJECT_UNDERSTANDING_GUIDE.md) - Project details
- 🗺️ [PROJECT_ROADMAP.md](PROJECT_ROADMAP.md) - Development roadmap

## 📁 Project Structure

```
FYP/
├── Datasets/                  # Raw CSV files from NASA archives
│   ├── k2_dataset.csv        # K2 mission data
│   ├── keplar_dataset.csv    # Kepler mission data
│   └── TOI_dataset.csv       # TESS Objects of Interest
│
├── notebooks/                 # Jupyter notebooks for analysis
│   ├── 01_k2_habitability.ipynb          # K2 data processing
│   ├── 02_kepler_habitability.ipynb      # Kepler data processing
│   ├── 03_tess_toi_habitability.ipynb    # TESS TOI data processing
│   ├── 04a_ml_k2_mission.ipynb           # K2 ML training
│   ├── 04b_ml_kepler_mission.ipynb       # Kepler ML training
│   ├── 04c_ml_tess_mission.ipynb         # TESS ML training
│   └── 05_model_comparison.ipynb         # Model evaluation
│
├── data/
│   ├── raw/                  # Original datasets (backup)
│   └── processed/            # Cleaned, ML-ready datasets
│       ├── k2/              # K2 train/val/test splits
│       ├── kepler/          # Kepler train/val/test splits
│       └── tess/            # TESS train/val/test splits
│
├── artifacts/                # ML preprocessing objects & trained models
│   ├── k2/                  # K2 XGBoost model (270 features)
│   ├── kepler/              # Kepler XGBoost model (130 features)
│   └── tess/                # TESS Random Forest model (44 features)
│
├── backend/                  # Django REST API
│   ├── api/                 # Main API app with ML integration
│   ├── manage.py            # Django management
│   └── db.sqlite3           # Database with 9,614 exoplanets
│
├── models/                   # Model performance reports
│   ├── best_models_summary.csv
│   ├── k2_model_performance.csv
│   ├── kepler_model_performance.csv
│   └── tess_model_performance.csv
│
├── tests/                    # Unit tests
│   └── test_habitability_scorer.py
│
├── docs/                     # Project documentation
│   └── extracted documentation files
│
├── test_inputs.json          # 🌟 JSON configuration for testing
├── test_ml_models_directly.py # 🌟 Main testing script
├── verify_json_config.py     # 🌟 Config validator
│
└── Documentation Files:
    ├── README.md                          # This file
    ├── SIMPLE_TESTING_GUIDE.md           # Easy testing guide
    ├── JSON_TESTING_GUIDE.md             # Technical testing guide
    ├── QUICK_REFERENCE.md                # Quick reference card
    ├── JSON_IMPLEMENTATION_SUMMARY.md    # System overview
    ├── TESTING_GUIDE.md                  # Backend & ML testing
    └── PROJECT_ROADMAP.md                # Development roadmap
```

## 🔬 Datasets

### 1. Kepler Dataset
- **Source**: NASA Kepler Mission
- **Samples**: ~9,000 exoplanet candidates
- **Key Features**: pl_orbper, pl_rade, pl_insol, pl_eqt, st_teff, st_rad, st_mass
- **Habitability Focus**: Confirmed planets with Earth-like characteristics

### 2. K2 Dataset  
- **Source**: NASA K2 Mission (Extended Kepler)
- **Samples**: ~4,000+ exoplanet candidates
- **Key Features**: Similar to Kepler with K2-specific parameters
- **Habitability Focus**: Diverse stellar environments

### 3. TESS TOI Dataset
- **Source**: NASA TESS Mission
- **Samples**: ~7,000+ TESS Objects of Interest
- **Key Features**: pl_orbper, pl_rade, pl_trandep, pl_insol, st_tmag
- **Habitability Focus**: Recent discoveries, bright host stars

## 🎯 Habitability Classification Approach

### Target Variable
Instead of detection (CONFIRMED/CANDIDATE/FALSE_POSITIVE), we classify based on **habitability potential**:

1. **POTENTIALLY_HABITABLE**: Earth-like conditions
   - Radius: 0.5 - 2.0 Earth radii
   - Insolation: 0.25 - 4.0 Earth flux
   - Equilibrium Temp: 180K - 310K
   - Orbital Period: 10 - 500 days

2. **HABITABILITY_ZONE**: In or near habitable zone but not Earth-like
   - Appropriate insolation but may be gas giant
   - Correct temperature but wrong size
   - Needs further investigation

3. **NON_HABITABLE**: Outside habitable parameters
   - Too hot (> 400K) or too cold (< 150K)
   - Gas giants (> 4 Earth radii)
   - Extreme orbital parameters

## 🛠️ Key Features for Habitability

### Planetary Parameters
- `pl_rade`: Planet radius (Earth radii) - Size similarity to Earth
- `pl_masse`: Planet mass (Earth masses) - Gravity and composition
- `pl_orbper`: Orbital period (days) - Year length
- `pl_orbsmax`: Semi-major axis (AU) - Distance from star
- `pl_eqt`: Equilibrium temperature (K) - Surface conditions
- `pl_insol`: Insolation flux (Earth flux) - Energy received
- `pl_dens`: Planet density - Rocky vs gaseous

### Stellar Parameters
- `st_teff`: Stellar temperature (K) - Star type
- `st_rad`: Stellar radius (Solar radii) - Star size
- `st_mass`: Stellar mass (Solar masses) - Star longevity
- `st_lum`: Stellar luminosity - Energy output

### Derived Features
- Habitable zone flag (insolation-based)
- Planet-star radius ratio
- Temperature category
- Earth Similarity Index (ESI) components

## 🚀 Getting Started

### Prerequisites
```bash
pip install pandas numpy matplotlib seaborn scikit-learn astropy lightkurve
```

### Data Processing Pipeline
1. **Load notebooks in order**:
   - `01_k2_habitability.ipynb` - K2 mission data
   - `02_kepler_habitability.ipynb` - Kepler mission data  
   - `03_tess_toi_habitability.ipynb` - TESS TOI data

2. **Each notebook performs**:
   - Data loading and exploration
   - Habitability-focused cleaning
   - Feature engineering for habitability metrics
   - Class labeling based on habitability criteria
   - Train/val/test splitting
   - Export to `data/processed/`

3. **Outputs**:
   - CSV files: `{mission}_train.csv`, `{mission}_val.csv`, `{mission}_test.csv`
   - Transformers: StandardScaler, LabelEncoder
   - Metadata: Feature lists, class distributions

## 📊 Expected Workflow

### Phase 1: Data Collection & Cleaning ✅ (Current)
- Load and explore NASA datasets
- Define habitability classification criteria
- Clean and preprocess data
- Engineer habitability-focused features

### Phase 2: Model Development (Future)
- Implement ML models (Random Forest, XGBoost, Neural Networks)
- Hyperparameter tuning
- Cross-validation and evaluation
- Model comparison across missions

### Phase 3: Ensemble & Validation (Future)
- Combine predictions from all missions
- Validate on holdout test sets
- Generate final habitability predictions

### Phase 4: Backend & Deployment (Future)
- Build REST API for predictions
- Create frontend interface
- Deploy system

## 📈 Success Metrics

For habitability classification:
- **Precision**: Minimize false positives for POTENTIALLY_HABITABLE
- **Recall**: Capture all truly habitable candidates
- **F1-Score**: Balance precision and recall
- **Confusion Matrix**: Understand misclassification patterns

## 🔍 Data Quality Notes

All datasets contain:
- ✅ Planet radius (critical for habitability)
- ✅ Insolation flux (critical for temperature)
- ✅ Equilibrium temperature (critical for conditions)
- ✅ Stellar parameters (critical for context)
- ⚠️ Some missing values (handled via imputation)
- ⚠️ Class imbalance (few truly habitable candidates expected)

## 🎓 Academic Context

**Institution**: [Your University]  
**Program**: Final Year Project  
**Supervisor**: [Supervisor Name]  
**Year**: 2025

## 📝 References

- NASA Exoplanet Archive: https://exoplanetarchive.ipac.caltech.edu/
- Kepler Mission: https://www.nasa.gov/mission_pages/kepler/
- TESS Mission: https://tess.mit.edu/
- Habitability Zone Calculations: Kopparapu et al. (2013)

## 📧 Contact

For questions or collaboration:
- Email: [Your Email]
- GitHub: [Your GitHub]

---

**Status**: Phase 1 - Data Collection & Cleaning ✅  
**Last Updated**: December 2025
