# TEST MODELS GUIDE

## 🎯 Quick Start (2 minutes)

Test the ML model with **just 8 parameters**!

### Step 1: Run the predictor
```bash
python test_models.py
```

### Step 2: Edit values in `test_models_inputs.json`

Change any of these 8 parameters to test different planets:

```json
{
  "name": "My Custom Planet",
  "koi_period": 365.0,     ← Orbital period (days)
  "koi_prad": 1.0,         ← Planet radius (Earth radii)
  "koi_teq": 288.0,        ← Temperature (Kelvin)
  "koi_insol": 1.0,        ← Insolation (Earth flux)
  "koi_sma": 1.0,          ← Orbit distance (AU)
  "koi_steff": 5778.0,     ← Star temperature (K)
  "koi_srad": 1.0,         ← Star radius (Solar radii)
  "koi_smass": 1.0         ← Star mass (Solar masses)
}
```

### Step 3: Run again to see results

---

## 📊 Example Results

**Earth-like planet:**
```
Prediction: Potentially Habitable
Confidence: 97.4% ✓
```

**Hot Jupiter:**
```
Prediction: Non-Habitable  
Confidence: 100.0% ✓
```

---

## 🔧 How It Works

The model needs **130 features** but the script automatically calculates them from your 8 inputs:

1. **117 NASA catalog features** - Calculated from orbital mechanics formulas
2. **13 engineered features** - ESI indices, HZ flags, planet types, ratios

**Input:** 8 parameters (orbital, planet, star properties)  
**Auto-calculated:** 122 derived features  
**ML Model:** Uses all 130 features for accurate prediction

---

## 📋 Parameter Ranges (for realistic planets)

| Parameter | Habitable Range | Example (Earth) |
|-----------|----------------|----------------|
| `koi_period` | 200-500 days | 365 days |
| `koi_prad` | 0.8-1.5 Earth radii | 1.0 |
| `koi_teq` | 250-320 K | 288 K |
| `koi_insol` | 0.3-2.0 Earth flux | 1.0 |
| `koi_sma` | 0.8-1.5 AU | 1.0 AU |
| `koi_steff` | 4500-6500 K | 5778 K (Sun) |
| `koi_srad` | 0.7-1.3 Solar radii | 1.0 |
| `koi_smass` | 0.7-1.3 Solar masses | 1.0 |

---

## 🎓 What Changed?

**OLD Problem:**
- Model needs 130 features
- NASA catalog has 141 columns
- Can't test custom planets

**NEW Solution:**
- 8 key parameters provided
- 117 features calculated using physics formulas
- 13 features engineered (ESI, HZ flags, ratios)
- ✓ Accurate predictions with simple inputs!

---

## ✅ Validation

Tested on 5 sample planets:
- Earth-like → **97.4% Potentially Habitable** ✓
- Hot Jupiter → **100% Non-Habitable** ✓
- Cold Rocky → **99.8% Non-Habitable** ✓
- Venus-like → **66% Habitability Zone** ✓
- Mars-like → **44% Non-Habitable** ✓

---

## 📁 Files

1. **test_models_inputs.json** - Edit this to change test values
2. **test_models.py** - Run this to get predictions
3. **models/kepler_xgboost_model.pkl** - ML model (96% accuracy)

---

## 🚀 Usage

"Just edit the JSON file and run Python. 8 numbers in, habitability prediction out!"

---

## 🌐 Testing Backend API

The project includes a Django REST API with 9,614 exoplanets from NASA database.

### How to Test

```bash
# 1. Start the API server
cd backend
python manage.py runserver

# 2. Run the complete test suite
python test_backend_api.py
```

### API Endpoints

**Base URL:** `http://127.0.0.1:8000`

#### Main Endpoints

| Path | Method | Description |
|------|--------|-------------|
| `/` | GET | API root information and all endpoints |
| `/api/missions/` | GET | List of space missions (Kepler, K2, TESS) |

#### Prediction Endpoints

| Path | Method | Description |
|------|--------|-------------|
| `/api/` | GET | Prediction API documentation |
| `/api/predict/` | GET/POST | Single planet habitability prediction |
| `/api/predict/batch/` | POST | Batch predictions (multiple planets) |
| `/api/models/info/` | GET | ML models information and statistics |
| `/api/health/` | GET | API health check |

#### Planet Data Endpoints (9,614 planets)

| Path | Method | Description |
|------|--------|-------------|
| `/api/planets/` | GET | List all planets (paginated) |
| `/api/planets/{id}/` | GET | Get specific planet details by ID |
| `/api/planets/habitable/` | GET | Filter potentially habitable planets |
| `/api/planets/search/` | GET | Search planets by parameters |
| `/api/planets/stats/` | GET | Database statistics and distribution |
| `/api/planets/compare/` | POST | Compare multiple planets |

### Test Coverage

The test suite validates:
- ✅ API Root & Documentation
- ✅ Health Check
- ✅ Models Information
- ✅ Earth-like Planet Prediction
- ✅ Hot Jupiter Prediction
- ✅ Super Earth Prediction
- ✅ Batch Predictions (3 planets)
- ✅ Invalid Input Validation

### Comparison

| Feature | `test_models.py` | Backend API |
|---------|------------------|-------------|
| **Setup** | No server needed | Requires Django server |
| **Database** | Custom calculations | NASA database (9,614 planets) |
| **Use Case** | Quick testing | Application integration |
