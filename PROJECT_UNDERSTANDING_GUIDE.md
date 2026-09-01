# AI Exoplanet Habitability Explorer — Complete Understanding Guide

**Project:** AI Exoplanet Habitability Explorer  
**Team:** Hadeed Ahmad (2022-ag-7746) & Tahzeeb Arif (2022-ag-8065)  
**Supervisor:** Mam Nabeela Ashraf  
**Institution:** BSCS SE — Final Year Project  
**Updated:** April 2026 — reflects actual production stack

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Full File Structure](#2-full-file-structure)
3. [The Science Behind Habitability](#3-the-science-behind-habitability)
4. [Dataset & Feature Selection — The Deep Why](#4-dataset--feature-selection--the-deep-why)
5. [What We Cannot Predict and Why](#5-what-we-cannot-predict-and-why)
6. [Machine Learning Models — Design Decisions](#6-machine-learning-models--design-decisions)
7. [Habitability Scoring System](#7-habitability-scoring-system)
8. [System Limitations & Honest Assessment](#8-system-limitations--honest-assessment)
9. [Backend API Architecture](#9-backend-api-architecture)
10. [Frontend Architecture](#10-frontend-architecture)
11. [How a Prediction Works End-to-End](#11-how-a-prediction-works-end-to-end)
12. [AI Explainability — SHAP & LIME](#12-ai-explainability--shap--lime)
13. [Project Phases & Status](#13-project-phases--status)

---

## 1. Project Overview

### What Is This System?

This is an AI-powered web application that predicts the **habitability potential** of exoplanets (planets outside our solar system) discovered by NASA missions. It uses machine learning trained on 9,614 real exoplanets from three missions — K2, Kepler, and TESS.

### Key Distinction

We do **not** claim to determine if life actually exists on these planets. We predict the *physical suitability* for life based on properties we can measure from Earth using telescopes. This is a crucial difference explained fully in [Section 5](#5-what-we-cannot-predict-and-why).

### Core Deliverables

| Deliverable | Status | Detail |
|-------------|--------|--------|
| 3 trained ML models | ✅ Complete | K2 XGBoost (99.2%), Kepler XGBoost (100%), TESS RF (100%) |
| REST API backend | ✅ Complete | Django + DRF, **Neon DB (PostgreSQL)**, 8,245 planets loaded |
| Interactive frontend | ✅ Complete | React 19, 3D viewer, prediction panel, explore page |
| AI explainability | ✅ Complete | SHAP + LIME + fallback for every prediction |
| Solar system 3D viewer | ✅ Complete | 8 planets, moons, asteroid belt, Kuiper belt, NEOs |
| Artemis 2 trajectory | ✅ Complete | Animated free-return path with toggle |
| Auth (login/signup) | ✅ Complete | JWT-based, user profiles + saved predictions in Neon DB |
| Chatbot — ARIA | ✅ Complete | **Groq Cloud API** (Llama 3.3 70B), no local LLM needed |

---

## 2. Full File Structure

```
FYP/
├── PROJECT_ROADMAP.md              Master project timeline
├── PROJECT_UNDERSTANDING_GUIDE.md  This file — deep system explanation
├── TESTING_GUIDE.md                How to test all features
├── TEST_MODELS_README.md           ML model evaluation guide
├── batch_prediction_test_sample.csv Sample data for batch API testing
│
├── data/
│   ├── raw/
│   │   ├── k2_dataset.csv          Raw K2 mission data
│   │   ├── keplar_dataset.csv      Raw Kepler mission data (note: typo in filename kept)
│   │   └── TOI_dataset.csv         Raw TESS Objects of Interest data
│   └── processed/
│       ├── k2/      (7 CSV files: full, train, val, test + normalized versions)
│       ├── kepler/  (7 CSV files)
│       └── tess/    (7 CSV files)
│
├── models/
│   ├── k2_xgboost_model.pkl        K2 mission XGBoost (99.2% accuracy)
│   ├── kepler_xgboost_model.pkl    Kepler XGBoost (100% accuracy)
│   ├── tess_random_forest_model.pkl TESS Random Forest (100% accuracy)
│   ├── ensemble_model.pkl          Experimental combined model
│   └── *.csv                       Performance metrics and evaluation reports
│
├── artifacts/
│   ├── k2/
│   │   ├── k2_habitability_minmax_scaler.pkl   Feature normalizer
│   │   ├── k2_habitability_metadata.pkl         Feature names + class info
│   │   └── (encoder .pkl)
│   ├── kepler/  (same structure)
│   └── tess/    (same structure)
│
├── notebooks/
│   ├── 01_k2_habitability.ipynb         K2 data preprocessing
│   ├── 02_kepler_habitability.ipynb     Kepler preprocessing
│   ├── 03_tess_toi_habitability.ipynb   TESS preprocessing
│   ├── 04a_ml_k2_mission.ipynb          K2 model training
│   ├── 04b_ml_kepler_mission.ipynb      Kepler model training
│   ├── 04c_ml_tess_mission.ipynb        TESS model training
│   └── 05_model_comparison.ipynb        Model comparison & final selection
│
├── backend/
│   ├── manage.py
│   ├── load_data_to_db.py                Loads processed CSVs into the database
│   ├── backfill_planet_names.py          Repairs placeholder planet names
│   ├── .env.example                      Backend environment template
│   ├── .env                             DB + API key config (Neon DB credentials, GROQ_API_KEY)
│   ├── backend/                         Django project settings
│   │   ├── settings.py                  Uses Neon DB (PostgreSQL) when DB_PASSWORD set; SQLite fallback
│   │   └── urls.py
│   ├── api/
│   │   ├── habitability_scorer.py       MAIN ML scoring engine (used by backend)
│   │   └── urls.py
│   ├── planets/
│   │   ├── models.py                    Planet + Mission DB models (stored in Neon DB)
│   │   ├── views.py                     List, detail, search, stats endpoints
│   │   └── serializers.py
│   ├── predictions/
│   │   ├── ai_service.py                ML service layer (SHAP, LIME, fallback)
│   │   ├── views.py                     /predict/, /predict/batch/, /explain/
│   │   └── serializers.py
│   ├── chatbot/
│   │   ├── views.py                     ARIA chatbot — Groq Cloud API (Llama 3.3 70B)
│   │   └── urls.py
│   └── users/
│       ├── models.py                    UserProfile (base64 avatar) + SavedPrediction (JSONField)
│       └── views.py                     register, login, me, logout, saved CRUD endpoints
│
└── frontend/
    ├── package.json
    ├── vite.config.js                   Proxy /api/* → localhost:8000
    └── src/
        ├── App.jsx                      Router + Chatbot always mounted
        ├── services/api.js              Axios layer for all API calls
        ├── pages/
        │   ├── Home.jsx                 Landing page
        │   ├── ExplorePlanets.jsx       Main page — search + 3D + grid + prediction
        │   ├── PlanetDetail.jsx         Full planet detail + ML prediction
        │   ├── ComparePlanets.jsx       Side-by-side planet comparison
        │   └── About.jsx               Project info
        └── components/
            ├── ExoplanetViewer3D.jsx    Exoplanet orbital viewer (r3f)
            ├── SolarSystemViewer.jsx    Solar system 3D viewer (r3f) + Artemis 2
            ├── PredictionPanel.jsx      Custom planet prediction studio
            ├── FiltersPanel.jsx         Left sidebar filters
            ├── PlanetGrid.jsx           Paginated planet card list
            ├── Chatbot.jsx              Floating chat widget — ARIA (Groq API)
            └── Navbar.jsx, Footer.jsx, etc.
```

---

## 3. The Science Behind Habitability

### What Makes a Planet "Habitable"?

Astrobiologists use a concept called the **Habitable Zone (HZ)** — the range of orbital distances from a star where liquid water could exist on a planet's surface. This is sometimes called the "Goldilocks Zone": not too hot, not too cold.

But the HZ alone is not enough. A planet must also be:

1. **Rocky (not a gas giant)** — Gas giants like Jupiter have no solid surface. Life as we know it needs a solid/liquid surface.
2. **The right size** — Too small: can't hold an atmosphere (like Mars lost its atmosphere). Too large: becomes a gas giant.
3. **The right temperature** — Liquid water exists between 273 K and 373 K. We use equilibrium temperature as a proxy.
4. **Orbiting a stable star** — Very young stars flare too much. Very massive stars die too quickly for life to evolve.
5. **Not too eccentric an orbit** — High eccentricity causes extreme seasonal temperature swings.

### Earth Similarity Index (ESI)

The ESI is a real metric used by NASA and researchers (Schulze-Makuch et al., 2011). It measures how similar a planet is to Earth on a scale of 0 to 1:

```
ESI_property = 1 - | (x - x_Earth) / (x + x_Earth) | ^ (weight/n)
```

Where `x` is the planet's value, `x_Earth` is Earth's value, and `weight` is a dimensionless exponent chosen from planetary science literature.

Our system calculates three ESI components:
- **ESI_radius** — How Earth-like the size is (weight exponent = 0.25)
- **ESI_temperature** — How close the equilibrium temperature is to Earth's 255 K (weight = 0.5)
- **ESI_flux** — How close the received stellar radiation is to Earth's 1.0 S⊕ (weight = 0.5)

### Habitable Zone Boundaries

We use the **Kopparapu et al. (2013)** model, the most widely cited modern HZ calculation:

| Star Type | Temp (K) | Conservative HZ (AU) | Optimistic HZ (AU) |
|-----------|----------|---------------------|-------------------|
| M-dwarf | 2600–3700 | 0.08–0.24 | 0.06–0.32 |
| K-dwarf | 3700–5200 | 0.38–1.02 | 0.27–1.32 |
| G-dwarf (Sun) | 5200–6000 | 0.95–1.67 | 0.75–1.77 |
| F-dwarf | 6000–7500 | 1.40–2.40 | 1.02–2.90 |

**Conservative HZ**: moist-greenhouse inner edge to maximum-greenhouse outer edge (most confident region).  
**Optimistic HZ**: extends inward (Venus-like early history possible) and outward (early Mars-like).

The system automatically determines stellar type from `st_teff` and applies the correct boundaries.

---

## 4. Dataset & Feature Selection — The Deep Why

### Why These Three NASA Missions?

| Mission | Years Active | Method | Why Included |
|---------|-------------|--------|-------------|
| **Kepler** | 2009–2018 | Transit | Gold standard dataset; discovered 2,662 confirmed exoplanets; well-studied, high-quality data |
| **K2** | 2014–2018 | Transit | Extended Kepler mission after reaction wheel failure; different sky fields; 1,937 planets |
| **TESS** | 2018–present | Transit | Current mission; covers the whole sky; most modern data; 4,935 candidates |

Each mission has **different column naming conventions** and **different typical stellar populations** (Kepler focused on specific field stars; TESS covers bright, nearby stars). This is why we trained **separate models per mission** rather than one combined model.

### Why These Input Features?

Every input feature was chosen because it can be **measured remotely by telescope** and has **direct physical relevance** to habitability. Here is the full rationale:

#### `pl_rade` — Planet Radius (Earth Radii) — **The Most Important Feature**

**Why we chose it:** Radius determines whether a planet is rocky or a gas/ice giant. The "radius gap" (Fulton gap) at ~1.5–1.8 R⊕ is a real observed phenomenon — planets above this are sub-Neptunes with thick H/He envelopes; planets below are rocky super-Earths. For habitability, we want rocky planets (roughly ≤ 2.0 R⊕).

**How it's measured:** Transit depth (how much starlight dims when planet crosses). Depth ∝ (R_planet / R_star)².

**Range in our dataset:** 0.3 R⊕ (smaller than Mars) to 25 R⊕ (larger than Neptune).

**Why NOT planet mass (`pl_masse`)?** Mass requires radial velocity follow-up (expensive, time-consuming). Only ~30% of planets in our dataset have measured masses. Using mass as a required feature would drop 70% of our data. Radius is available for nearly all transit-detected planets.

#### `pl_eqt` — Equilibrium Temperature (Kelvin) — **Critical Thermal Indicator**

**Why we chose it:** Temperature determines if liquid water is possible. If `pl_eqt` is below ~230 K (too cold) or above ~340 K (too hot), liquid surface water is unlikely without extreme greenhouse effects.

**The Equilibrium Temperature Formula:**
```
T_eq = T_star × √(R_star / (2 × a)) × (1 - albedo)^(1/4)
```
where `a` is orbital distance. This is what our training data uses.

**IMPORTANT CAVEAT:** `pl_eqt` assumes a **bare rock with no atmosphere**. Earth's actual surface temperature is 288 K but its equilibrium temp is ~255 K — the 33 K difference is the greenhouse effect. Venus has T_eq ≈ 232 K but actual surface = 735 K. This is a **fundamental limitation** detailed in [Section 5](#5-what-we-cannot-predict-and-why).

**Why NOT actual surface temperature?** We cannot measure surface temperature of most exoplanets. Equilibrium temperature is calculable from observable quantities (stellar temp, stellar radius, orbital distance).

#### `pl_insol` — Insolation Flux (Earth units, S⊕) — **The Goldilocks Metric**

**Why we chose it:** Insolation is the total stellar radiation received. Earth = 1.0 S⊕. The HZ conservative boundary is approximately 0.36–1.11 S⊕ for Sun-like stars. This directly determines if liquid water is possible and is closely related to equilibrium temperature.

**How it's measured:** Calculated from stellar luminosity and orbital distance: `S = L_star / (4π × a²)`.

**Why it's different from `pl_eqt`:** Insolation is pure energy received; equilibrium temperature also factors in albedo (reflectivity). Both are proxies for the same physical reality but from different angles.

#### `pl_orbper` — Orbital Period (Days) — **Orbit & Stability Proxy**

**Why we chose it:** Period determines orbital distance via Kepler's Third Law: `a³ = M_star × P²`. Short periods (< 10 days) place planets too close to their star (too hot). Very long periods (> 1,000 days) = too far and cold. For M-dwarf planets, ~10–50 day periods can be in the HZ. For G-stars, ~200–500 days are habitable.

**Also:** Orbital period affects tidal locking probability. Planets with periods < ~25 days around M-dwarfs are likely tidally locked (one side always faces star, one always dark), which is a habitability concern.

#### `pl_orbsmax` — Semi-Major Axis (AU) — **Distance From Star**

**Why we chose it:** Direct measure of orbital distance. Used to calculate HZ boundaries: is the planet inside the HZ inner edge (too hot), in the HZ, or beyond the outer edge (too cold)? The model uses this to derive `in_hz_conservative` and `in_hz_optimistic` flags.

**Derived from period if missing:** `a = (M_star × P_years²)^(1/3)` — this is Kepler's Third Law.

#### `pl_orbeccen` — Orbital Eccentricity — **Orbit Shape / Stability**

**Why we chose it:** Eccentricity measures how elliptical the orbit is (0 = perfect circle, 1 = parabolic). High eccentricity (> 0.3) causes planets to swing wildly closer and farther from their star each orbit, creating extreme temperature cycles. Earth's eccentricity is 0.017 (nearly circular). Mars is 0.093.

**Example of why it matters:** A planet with average distance of 1.0 AU but eccentricity of 0.5 would range from 0.5 AU (boiling) to 1.5 AU (freezing) each year — likely uninhabitable despite the average being in the HZ.

#### `st_teff` — Stellar Effective Temperature (K) — **Star Type Classifier**

**Why we chose it:** The stellar type fundamentally changes the HZ boundaries, UV flux levels, flare activity, and how long the star will live (affecting if life has time to evolve). We use `st_teff` to automatically classify star type:
- < 3700 K → M-dwarf (red dwarf) — smallest, most common, but prone to flares
- 3700–5200 K → K-dwarf — "superhabitable" candidates, long-lived
- 5200–6000 K → G-dwarf (Sun-like) — our reference
- > 6000 K → F/A/B/O stars — too short-lived for complex life to develop

**Why NOT stellar spectral class directly?** The spectral class letter (G, K, M) is a categorical variable that would need one-hot encoding and has inconsistent labeling across mission datasets. Temperature is continuous, precisely measured, and universally consistent.

#### `st_rad` — Stellar Radius (Solar Radii) — **Luminosity & Detection Proxy**

**Why we chose it:** Stellar radius is needed to calculate planet radius from transit depth: `R_planet = R_star × √(transit_depth)`. It's also needed for HZ calculation (stellar luminosity ∝ R²×T⁴). Without this, planet radius estimates are uncertain.

#### `st_mass` — Stellar Mass (Solar Masses) — **Orbital Dynamics & Stellar Lifetime**

**Why we chose it:** Stellar mass determines:
1. Orbital period-to-distance conversion (Kepler's 3rd Law needs stellar mass)
2. Stellar lifetime: `t_life ∝ 1/M^2.5`. A 2-solar-mass star lives ~1 Gyr; our Sun lives ~10 Gyr; a 0.5 M☉ star lives ~60 Gyr. Life needs billions of years to evolve.
3. Habitable zone location moves inward for lower-mass stars

### Engineered Features (Calculated, Not Measured)

These are derived from the raw features above and were created to help the ML models:

| Feature | Formula | Physical Meaning |
|---------|---------|-----------------|
| `radius_similarity` | `1 - |pl_rade - 1| / 10` (clipped 0–1) | How close to Earth's radius |
| `temp_similarity` | `1 - |pl_eqt - 255| / 500` | How close to Earth's equilibrium temp |
| `insol_similarity` | `1 - |pl_insol - 1| / 10` | How close to Earth's stellar flux |
| `in_hz_conservative` | Binary: 0.25 ≤ pl_insol ≤ 4.0 | Inside conservative HZ |
| `in_hz_optimistic` | Binary: 0.1 ≤ pl_insol ≤ 10.0 | Inside optimistic HZ |
| `is_rocky` | Binary: pl_rade ≤ 2.0 | Below the radius gap |
| `is_earth_sized` | Binary: 0.8 ≤ pl_rade ≤ 1.25 | True Earth-size range |
| `is_super_earth` | Binary: 1.0 < pl_rade ≤ 2.0 | Super-Earth range |
| `planet_star_radius_ratio` | `pl_rade / (st_rad × 109.2)` | Transit depth proxy |
| `orbit_stellar_radii` | `pl_orbsmax × 215 / st_rad` | Orbital distance in stellar units |
| `pl_orbper_log` | `log10(pl_orbper)` | Log-transformed period |
| `pl_orbsmax_log` | `log10(pl_orbsmax)` | Log-transformed distance |
| `pl_insol_log` | `log10(pl_insol)` | Log-transformed flux |

**Why log transformations?** Orbital periods and distances span many orders of magnitude (1 day to 10,000 days). Log transformation converts this multiplicative scale to additive, which helps tree-based models find thresholds.

**Why binary flags if models can handle continuous values?** The binary flags encode domain knowledge directly. `in_hz_conservative=1` is a strong, well-understood habitability signal that would take many splits in a decision tree to approximate from continuous features alone. Including them directly gives the model the benefit of decades of astrophysics research.

---

## 5. What We Cannot Predict and Why

This section is critical for intellectual honesty. Our system makes **physical plausibility predictions**, not actual life detection.

### We CANNOT Predict: Atmospheric Oxygen (O₂) or Any Atmospheric Gas

**Why not?** 

Detecting atmospheric composition requires **spectroscopy of the atmosphere during transit** — measuring which wavelengths of starlight are absorbed as it filters through the planet's atmosphere. This requires:
1. The planet to be transiting at precisely the right angle
2. An extremely bright host star (making the signal detectable)
3. Instruments like JWST (James Webb Space Telescope)
4. Multiple transits for enough signal
5. The planet to have an atmosphere to begin with

**Data availability:** Fewer than 50 exoplanets have any atmospheric characterization. Our dataset has 9,614 planets with **zero atmospheric composition data** because most were detected by Kepler/K2/TESS which detect transits (dips in brightness), not spectra.

**Why oxygen specifically?** O₂ is considered the strongest biosignature — on Earth, it's maintained only by photosynthetic life (otherwise it would react away). But detecting O₂ requires:
- Transmission spectroscopy at the 760nm O₂ A-band
- JWST or future large telescopes
- A nearby, bright host star
- A rocky planet with thin enough atmosphere

**Our dataset has none of this.** Adding an "oxygen prediction" would be pseudoscience — we'd be predicting something we have no data about.

### We CANNOT Predict: Whether Life Actually Exists

**Why not?** Life detection requires:
- Biosignature gases (O₂, methane, ozone, nitrous oxide in combination)
- Surface features (chlorophyll-like reflection)
- Radio signals (SETI)
- Direct sample (spacecraft)

None of these are in transit photometry datasets. Even if we added biosignature gas data, the logical jump from "these gases exist" to "life exists" is not a machine learning problem — it's an open scientific question. (Methane + O₂ = likely biogenic, but abiotic sources exist too.)

### We CANNOT Predict: Geological Activity / Plate Tectonics

**Why not?** Geological activity (volcanism, plate tectonics) is thought to be important for carbon-silicate cycle regulation (long-term climate stability). But:
- Not measurable from transit photometry
- Requires seismology or detailed surface mapping
- No data in any exoplanet catalog for 9,614 planets

### We CANNOT Predict: Magnetic Field Strength

**Why not?** A magnetic field protects a planet from stellar wind stripping the atmosphere (like Mars lost its). But magnetic fields are only measurable from surface visits or specific radio observations. Not in transit data.

### We CANNOT Predict: Presence of Water (Confirmed)

**Why not?** We can *estimate* if liquid water is *possible* from temperature and flux, but water vapor detection requires spectroscopy. We can say "the temperature range allows liquid water" but not "water exists there."

### What We CAN Predict: Physical Plausibility Score

We predict **whether the observable physical properties are consistent with habitability** — the same kind of analysis NASA's Habitable Exoplanet Catalog does. This is scientifically valid and useful for prioritizing which planets deserve expensive follow-up observation.

---

## 6. Machine Learning Models — Design Decisions

### Why Train Separate Models Per Mission?

**Problem:** Each NASA mission produces data with different feature names, different precision, different stellar populations, and different biases.

- **Kepler** focused on one patch of sky for 4 years, specifically targeting G and K dwarfs at 300–3,000 light-years. Its features are named `koi_*` (Kepler Object of Interest).
- **K2** surveyed 19 different fields of the ecliptic plane. Wider stellar variety. Features named `pl_*`.
- **TESS** targets the brightest, nearest stars (100–300 light-years). Much brighter host stars. Features named `pl_*` but with different completeness patterns.

Training a single model on all three would force it to handle different feature naming and statistical distributions simultaneously. Separate models allow each to specialize in its mission's data characteristics.

**Auto-detection logic:** If the user doesn't specify a mission, the system auto-detects from feature names (presence of `koi_*` keys → Kepler; otherwise defaults to Kepler as it has the highest accuracy).

### Why XGBoost for K2 and Kepler?

**XGBoost** (Extreme Gradient Boosting) is a gradient boosted decision tree ensemble. It won on K2 and Kepler because:

1. **Handles missing values natively** — Both missions have missing data (missing `pl_orbsmax`, `pl_orbeccen`). XGBoost learns the optimal direction for missing values at each split.
2. **Feature importance** — Built-in SHAP values for explainability.
3. **Regularization** — L1/L2 regularization prevents overfitting on the highly imbalanced dataset (99.7% NON_HABITABLE).
4. **Speed** — Much faster than Random Forest on these dataset sizes.
5. **Performance:** K2 = 99.2%, Kepler = 100%.

**Hyperparameters used:**
```
max_depth = 5          # Prevents overly complex trees
learning_rate = 0.1    # Conservative step size
n_estimators = 100     # Number of trees
subsample = 0.8        # Prevents overfitting
colsample_bytree = 0.8 # Feature sampling per tree
```

### Why Random Forest for TESS?

**Random Forest** won on TESS because:

1. **TESS data characteristics:** TESS planets tend to have higher measurement precision (brighter host stars) and fewer missing values, making Random Forest's requirement for complete features less of an issue.
2. **Stability:** With 100% accuracy on both XGBoost and RF for TESS, RF was chosen for its better calibrated probabilities (out-of-bag estimation gives more reliable confidence scores).
3. **Different feature correlations:** TESS feature set includes `tmag_bright` (TESS magnitude flag) which interacts differently with the ensemble.

**Hyperparameters:**
```
n_estimators = 100
max_depth = 10
min_samples_split = 2
class_weight = 'balanced'   # Critical for imbalanced classes
```

### Why Such High Accuracy? Is It Real?

The 99.2%–100% accuracy is **real but requires context**:

1. **Extreme class imbalance:** 99.71% of planets are NON_HABITABLE. A model that predicts "always non-habitable" gets 99.71% accuracy. This is the "accuracy paradox."

2. **We address this with:** Precision, Recall, and F1-score per class, confusion matrices, and stratified splits. The models maintain high precision/recall on the POTENTIALLY_HABITABLE minority class too.

3. **Why the high accuracy is genuine:**
   - The physical properties of habitable planets (right radius, right temperature, right flux) cluster very distinctly in feature space.
   - The ESI similarity features and HZ flags we engineered encode the exact boundary that defines habitability — so the model is learning patterns that are **physically defined** and therefore separable.

4. **Legitimate concern:** The training set has only 47 potentially habitable planets (out of 9,614). With so few positive examples, the model may be overly conservative in real deployment. We mitigate this with the continuous composite score (see Section 7).

### Feature Importance Rankings (From SHAP Analysis)

**K2 & TESS Models (XGBoost/RF):**

| Rank | Feature | Importance | Physical Reason |
|------|---------|-----------|-----------------|
| 1 | `pl_insol` (Insolation Flux) | ~22% | Most direct HZ indicator |
| 2 | `in_hz_conservative` | ~18% | Engineered binary flag |
| 3 | `pl_eqt` (Equilibrium Temp) | ~16% | Temperature boundary |
| 4 | `temp_similarity` | ~12% | Earth-like temperature |
| 5 | `pl_rade` (Planet Radius) | ~10% | Rocky/gas discriminator |
| 6 | `insol_similarity` | ~8% | Earth-like flux |
| 7 | `is_rocky` | ~5% | Radius gap flag |
| 8 | `st_teff` (Star Temp) | ~4% | Star type |
| 9 | `radius_similarity` | ~3% | ESI radius component |
| 10 | `pl_orbsmax` (Orbital dist) | ~2% | Distance crosscheck |

**Why insolation flux is #1:** It's the most direct, physically meaningful boundary. A planet receiving 0.2 S⊕ is certainly too cold; one receiving 10 S⊕ is certainly too hot. This single feature already does most of the classification work.

**Why planet radius is #5, not #1:** The ML model sees that many planets with the wrong temperature/flux also have bad radii, so the temperature/flux features carry more unique information. Radius is still crucial for the composite score.

### The Prediction Pipeline (Technical Flow)

```
Input: { pl_rade: 1.2, pl_eqt: 288, pl_insol: 1.0, ... }
    ↓
1. Detect mission (auto from feature names or user-specified)
    ↓
2. Compute derived features (ESI components, HZ flags, log transforms)
    ↓
3. Build feature vector in exactly the order the model was trained on
   (Feature names stored in metadata .pkl file)
    ↓
4. Normalize with MinMaxScaler (stored in artifacts/*.pkl)
   Each feature scaled to [0, 1] using training set min/max
    ↓
5. Feed to ML model → get class probabilities
   e.g., [NON_HABITABLE: 0.05, HZ: 0.03, POTENTIALLY_HABITABLE: 0.92]
    ↓
6. Calculate composite score (40% ML + 30% ESI + 20% HZ prox + 10% stellar)
    ↓
7. Classify by threshold: ≥0.65 → POTENTIALLY_HABITABLE, etc.
    ↓
8. Run SHAP → ranked feature attributions (how each feature contributed)
    ↓
9. Return full result dict
```

---

## 7. Habitability Scoring System

### Why a Composite Score Instead of Just the ML Output?

The ML model output (class probabilities) alone has limitations:
- It's a black box — hard to explain physically
- Calibration: 0.92 probability doesn't mean 92% physically certain
- It was trained on historical data; novel planet types may be outside training distribution

The composite score combines **ML prediction + physics-based metrics** for robustness:

```
habitability_score = 0.10 × ML_score + 0.90 × physics_score
```

The physics term dominates deliberately. The ML models were trained on a
distribution where under 1% of planets are potentially habitable, so left to
itself the classifier pushes almost everything toward NON_HABITABLE. Anchoring
90% of the score to physics is what makes Earth-like inputs land above 90% and
Venus-like inputs below 20%, regardless of that training bias.

> The authoritative implementation is `calculate_habitability_score()` in
> `backend/api/habitability_scorer.py`. If you change the weights there, update
> this section too.

### Component 1: ML score (10% weight)

A single scalar collapsed from the model's three class probabilities:

```python
ml_score = P(POTENTIALLY_HABITABLE) * 1.0 \
         + P(HABITABILITY_ZONE)     * 0.5 \
         + P(NON_HABITABLE)         * 0.0
```

If the model fails to load or predict, it falls back to
`prob_pot_hab=0.05, prob_hz=0.15, prob_non_hab=0.80` and the physics term
carries the result.

### Component 2: Physics score (90% weight)

```python
physics_score = (temp_sim * radius_sim * insol_sim) ** (1/3)   # geometric mean
                * (0.4 + 0.6 * in_hz)          # insolation inside conservative HZ
                * (0.7 + 0.3 * hz_proximity)   # orbital distance via Kepler's 3rd law
                * stellar_factor               # host star type
```

The three similarity terms are linear distance penalties, each clamped to [0, 1]:

```python
temp_sim   = 1 - abs(pl_eqt   - 255.0) / 500.0   # 255 K = Earth equilibrium temp
radius_sim = 1 - abs(pl_rade  - 1.0)   / 10.0    # 1.0 Earth radii
insol_sim  = 1 - abs(pl_insol - 1.0)   / 10.0    # 1.0 Earth flux
```

A geometric mean is used rather than an arithmetic one so that a single
disqualifying parameter (say a 3,000 K equilibrium temperature) drags the whole
score down instead of being averaged away by two good parameters.

`in_hz` is derived from insolation against the conservative habitable zone
(0.25–1.67 S⊕), with a linear falloff on the cold side and a steeper one on the
hot side. `hz_proximity` comes from orbital distance, which is derived from
`pl_orbper` via Kepler's third law — this is what makes orbital period affect
the score at all.

### Earth Similarity Index (reported, but not a scoring term)

ESI is computed and returned in the API response, but it is **not** one of the
weighted inputs to `habitability_score`. It uses the Schulze-Makuch et al.
(2011) exponent form, combined as a geometric mean:

```python
ESI_radius = 1 - abs((pl_rade  / 1.0)   ** 0.57 - 1)   # exponent 0.57 for radius
ESI_temp   = 1 - abs((pl_eqt   / 288.0) ** 0.25 - 1)   # 288 K = Earth surface temp
ESI_flux   = 1 - abs((pl_insol / 1.0)   ** 0.25 - 1)

ESI = (ESI_radius * ESI_temp * ESI_flux) ** (1/3)
```

Note the two different temperature references in play: ESI compares against
Earth's **surface** temperature (288 K), while `temp_sim` in the physics score
compares against Earth's **equilibrium** temperature (255 K). That is
intentional — ESI is a published index with a fixed definition, while `temp_sim`
measures similarity in the same quantity the dataset actually reports.

### Stellar Type Factor (a multiplier on the physics score)

| Star Type | Factor | Rationale |
|-----------|--------|-----------|
| G (Sun-like) | 1.0 | Reference star — stable, long lifetime (~10 Gyr), moderate UV |
| K (orange dwarf) | 0.9 | Arguably "superhabitable" — longer lifetime (~30 Gyr), less UV than G |
| F (yellow-white) | 0.8 | Higher UV flux, shorter stellar lifetime (~3 Gyr) |
| M (red dwarf) | 0.7 | Prone to X-ray/UV flares, tidal locking likely for HZ planets |
| A/B/O types | 0.4 | Too short-lived (<2 Gyr) and intense UV for life as we know it |

**Note on M-dwarfs:** The factor 0.7 doesn't mean M-dwarf planets can't be habitable — Proxima Centauri b (an M-dwarf planet) is one of the most studied candidates. The factor reflects *statistical risk*, not impossibility.

### Classification Thresholds

| Score | Class | Meaning |
|-------|-------|---------|
| 0.66–1.0 | POTENTIALLY_HABITABLE | Strong candidate — prioritize for follow-up |
| 0.30–0.65 | HABITABILITY_ZONE | In or near the HZ but physically uncertain |
| 0.0–0.29 | NON_HABITABLE | Physical properties inconsistent with habitability |

These thresholds were chosen to match the observed distribution in the training data and align with published habitability catalogs (PHL's HEC).

---

## 8. System Limitations & Honest Assessment

### Known Technical Limitations

**1. Training Class Imbalance**
Only 47 out of 9,614 processed rows (0.49%) are POTENTIALLY_HABITABLE — 43 after de-duplication into the database. This is the real-world distribution — habitable planets are rare. The models handle this with `class_weight='balanced'` and careful evaluation, but predictions for borderline cases may be unreliable.

**2. Missing Mass Data**
`pl_masse` (planet mass) is not used as a feature because only ~30% of planets have it measured. Mass would strengthen predictions (density → composition → rocky vs gas). This is a dataset limitation, not a model choice failure.

**3. Equilibrium Temperature ≠ Surface Temperature**
`pl_eqt` assumes no atmosphere. The real surface temperature depends on the greenhouse effect, which we don't know for any exoplanet in our dataset. A planet with `pl_eqt = 200 K` (seemingly too cold) could have a surface temperature of 250 K with a moderate greenhouse effect.

**4. Single-Epoch Data**
Our training data is a snapshot. Planets' measured parameters have uncertainties and measurement errors. The ML models were not trained on error bars, only central values.

**5. No Atmospheric Data**
As explained in Section 5 — we cannot account for atmospheric composition, pressure, or weather patterns.

**6. TESS False Positives**
TESS candidates ("TOI" = TESS Object of Interest) are not all confirmed planets. Some may be false positives (eclipsing binaries mimicking planet transits). Our TESS model was trained on TOI candidates with habitability-relevant properties, so some training samples may not be real planets.

**7. Limited POTENTIALLY_HABITABLE Training Samples**
Only 47 rows across all 3 missions qualify as potentially habitable (43 unique planets in the database). The models are excellent at identifying non-habitable planets but the positive class generalization is limited by sample size.

### How We Mitigate These Limitations

1. **Composite scoring** blends ML with physics, reducing model-specific bias
2. **Three separate mission models** prevent one mission's biases from dominating
3. **SHAP explainability** lets users understand why a prediction was made
4. **Conservative classification thresholds** — we require score ≥ 0.66 for POTENTIALLY_HABITABLE
5. **Transparent uncertainty** — the UI shows confidence and contributing factors
6. **Fallback explainability** — if SHAP/LIME fail, a physics-based fallback still explains the result

---

## 9. Backend API Architecture

### Endpoints Summary

| Method | URL | Description |
|--------|-----|-------------|
| GET | `/api/planets/` | List planets with filters/pagination |
| GET | `/api/planets/{id}/` | Planet detail |
| GET | `/api/planets/stats/` | Dataset statistics |
| GET | `/api/planets/habitable/` | Only habitable planets |
| GET | `/api/planets/search/` | Name search, max 50 results |
| GET | `/api/planets/compare/` | Compare up to 10 planets via `?ids=1,2,3` |
| GET | `/api/missions/` | List K2, Kepler, TESS |
| POST | `/api/predict/` | Single planet habitability prediction |
| POST | `/api/predict/batch/` | Batch prediction (CSV upload) |
| POST | `/api/explain/` | Prediction + SHAP/LIME explanation |
| GET | `/api/models/info/` | Loaded model metadata |
| GET | `/api/health/` | Service health check |
| GET/POST | `/api/chatbot/` | ARIA chatbot via Groq API (status check / send message) |
| POST | `/api/auth/register/` | Create account, returns JWT |
| POST | `/api/auth/login/` | Login by username or email, returns JWT |
| GET | `/api/auth/me/` | Current user profile (auth required) |
| POST | `/api/auth/logout/` | Logout signal — see the blacklist caveat below |
| GET/POST | `/api/auth/saved/` | List / save habitability predictions (auth required) |
| DELETE | `/api/auth/saved/{id}/` | Delete a saved prediction (auth required) |

### Query Parameters for `/api/planets/`

```
?page=1&page_size=30        Pagination
?mission=kepler             Filter by mission (k2, kepler, tess)
?habitability=POTENTIALLY_HABITABLE   Filter by class
?min_radius=0.8&max_radius=2.0       Radius range filter
?min_temp=200&max_temp=400            Temperature range filter
?q=kepler-442                         Search by planet name
```

### Database — Neon DB (PostgreSQL)

All application data lives in a single **Neon DB** PostgreSQL instance hosted on AWS us-east-1. Credentials are loaded from `backend/.env` (`DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`). The settings.py falls back to a local SQLite file only when `DB_PASSWORD` is not set (i.e., never in real use).

**Tables in Neon DB:**

| Table | App | Contents |
|-------|-----|----------|
| `planets_mission` | planets | K2, Kepler, TESS mission metadata |
| `planets_exoplanet` | planets | 8,245 exoplanet rows with all parameters |
| `auth_user` | Django built-in | User accounts (username, email, password hash) |
| `users_userprofile` | users | OneToOne extension — base64 profile avatar |
| `users_savedprediction` | users | Per-user saved habitability predictions (JSON inputs + outputs) |

**ML model pickle files** (`models/` and `artifacts/`) are stored on the **filesystem**, not in the database. They are loaded into memory once by the `HabitabilityScorer` singleton on first API request.

**Planet model key fields:**
```python
planet_name, mission (FK), pl_rade, pl_masse, pl_eqt, pl_insol,
pl_orbper, pl_orbsmax, pl_orbeccen, st_teff, st_rad, st_mass,
habitability_class, in_habitable_zone, potentially_habitable,
esi_overall, discovery_year, disc_facility
```

**SavedPrediction model key fields:**
```python
user (FK → auth_user), name (CharField 120), inputs (JSONField),
outputs (JSONField — score, classification, probabilities, ESI, SHAP),
created_at (auto DateTimeField, indexed)
```

**Auth — JWT via djangorestframework-simplejwt:**
- Access token lifetime: **1 hour**
- Refresh token lifetime: **7 days**
- Login accepts either username **or** email
- Token rotation disabled (refresh token stays valid until expiry)
- `/api/auth/logout/` cannot truly revoke a token: `token_blacklist` is not in
  `INSTALLED_APPS`, so the call always returns 200 and the client simply drops
  its own tokens. Add `rest_framework_simplejwt.token_blacklist` and migrate if
  server-side revocation is required.

---

## 10. Frontend Architecture

### Page Structure

| Page | Route | Purpose |
|------|-------|---------|
| Home | `/` | Landing page with mission overview, stats |
| Explore | `/explore` | **Main page** — search + 3D viewer + planet grid + prediction |
| Planet Detail | `/planet/:id` | Full planet data + ML prediction + explainability |
| Compare | `/compare` | Side-by-side comparison of multiple planets |
| About | `/about` | Project information, team, supervisor |

### The Explore Page (Application Heart)

```
┌────────────────────────────────────────────────────────────┐
│ NAVBAR                                                      │
├────────────────────────────────────────────────────────────┤
│ SEARCH BAR (sticky)                                        │
├─────────────────┬───────────────────────┬──────────────────┤
│ FILTERS PANEL   │  EXOPLANET 3D VIEWER  │  PLANET GRID     │
│ (col 3/12)      │  (col 5/12)           │  (col 4/12)      │
│                 │  • Real planets from  │  • 30 per page   │
│ • Mission       │    current filters    │  • Habitability  │
│ • Habitability  │  • Open→ full screen  │    class badges  │
│ • Radius range  │    (28 planets shown) │  • Click → detail│
│ • Temp range    │  • Planet labels,     │                  │
│ • Min ESI       │    HZ ring, orbit     │                  │
└─────────────────┴───────────────────────┴──────────────────┤
│ PREDICTION PANEL (always visible)                          │
│ • 7 parameter sliders → Real-time prediction               │
│ • SHAP/LIME explanation                                    │
│ • Classification + score gauge                             │
└────────────────────────────────────────────────────────────┘
```

### 3D Viewers

**ExoplanetViewer3D** — Shows real exoplanets from the database:
- Fetches up to 28 planets using current filters
- Sorted: POTENTIALLY_HABITABLE first
- Each planet is a colored sphere with temperature-driven texture
- Habitable zone ring (green), orbit paths, star
- Fullscreen modal with surface zoom, labels, top view

**SolarSystemViewer** — Our solar system:
- All 8 planets with real orbital periods and sizes
- Major moons (Galilean, Saturn's, etc.) with correct periods
- Asteroid belt (3,800 particles), named asteroids (Ceres, Apophis, Bennu, 2024 YR4)
- Kuiper belt hint
- **Artemis 2 free-return trajectory** — toggle with checkbox

---

## 11. How a Prediction Works End-to-End

### User enters parameters → Score returned

```
USER: Enters pl_rade=1.2, pl_eqt=280, pl_insol=0.9, st_teff=5500...
    ↓
FRONTEND PredictionPanel.jsx
POST /api/explain/ { pl_rade:1.2, pl_eqt:280, ... }
    ↓
DJANGO predictions/views.py → explain_prediction()
→ calls ai_service.explain_single()
    ↓
HABITABILITY SCORER (backend/api/habitability_scorer.py)
1. Auto-detect mission from feature keys → "kepler"
2. Load kepler_xgboost_model.pkl + scaler + metadata
3. Compute derived features:
   radius_similarity = 1 - |1.2-1|/10 = 0.98
   temp_similarity = 1 - |280-255|/500 = 0.95
   insol_similarity = 1 - |0.9-1|/10 = 0.99
   in_hz_conservative = (0.25 ≤ 0.9 ≤ 4.0) = 1
   is_rocky = (1.2 ≤ 2.0) = 1
   pl_insol_log = log10(0.9) = -0.046
4. Scale all features with MinMaxScaler
5. model.predict_proba([...]) → [0.03, 0.05, 0.92]
6. Composite score = 0.4×0.92 + 0.3×0.97 + 0.2×1.0 + 0.1×0.95 = 0.854
    ↓
SHAP TreeExplainer
→ computes SHAP values for each feature
→ ranks by |SHAP value| → top contributing features
→ direction: positive (supports habitability) vs negative (reduces it)
    ↓
RESPONSE JSON:
{
  "habitability_score": 0.854,
  "classification": "POTENTIALLY_HABITABLE",
  "confidence": 0.92,
  "feature_importance": [
    { "feature": "Insolation Flux", "importance": 0.34, "impact_direction": "supports" },
    { "feature": "Temperature Similarity", "importance": 0.28, "impact_direction": "supports" },
    ...
  ],
  "natural_language_explanation": "The planet is classified as Potentially Habitable...",
  "explanation_method": "shap"
}
    ↓
FRONTEND: Renders score gauge, feature bar chart, explanation text
```

---

## 12. AI Explainability — SHAP & LIME

### Why Explainability Matters

For a scientific tool, "the model says 0.85" is not enough. Scientists need to know *why*. Explainability also helps detect model errors (if a nonsensical feature is driving predictions).

### SHAP (SHapley Additive exPlanations)

**What it is:** Based on cooperative game theory (Shapley values). For each feature, SHAP calculates its *marginal contribution* to the prediction, averaged over all possible feature orderings.

**For tree models** (XGBoost/RF): `TreeExplainer` is fast and exact — no approximation needed.

**Output:** A value per feature showing:
- **Magnitude**: How much this feature moved the prediction from the baseline
- **Sign**: Positive = pushed toward POTENTIALLY_HABITABLE; Negative = pushed away

**Example output for our system:**
```
Feature: Insolation Flux     SHAP=+0.34  (large positive: flux near Earth's)
Feature: Temperature          SHAP=+0.28  (in good range)
Feature: Star Temperature     SHAP=+0.12  (G-type star, favorable)
Feature: Orbital Eccentricity SHAP=-0.08  (slightly too eccentric)
Feature: Planet Radius        SHAP=+0.06  (rocky size)
```

### LIME (Local Interpretable Model-agnostic Explanations)

**What it is:** Builds a simple local linear model around the prediction point. Creates a neighborhood of similar inputs by perturbing features, then fits a linear model to understand local behavior.

**When used:** LIME is the fallback if SHAP fails (some model versions have SHAP compatibility issues). LIME is model-agnostic (works with any black-box model).

**Limitation:** LIME is approximate (stochastic), so results may slightly vary between runs.

### Fallback Explainability

If both SHAP and LIME fail, the system falls back to a **physics-based heuristic** that compares each input parameter to Earth's values and ranks them by deviation magnitude. This is always available and never crashes.

---

## 13. Project Phases & Status

### Completed Phases

| Phase | What | Status |
|-------|------|--------|
| 1 | Data preprocessing — 9,614 planets, 3 missions | ✅ Complete |
| 2 | ML models — 3 trained, evaluated, saved as .pkl | ✅ Complete |
| 3 | Django REST API — all endpoints working | ✅ Complete |
| 4 | React frontend — all pages implemented | ✅ Complete |
| 5 | 3D exoplanet viewer (r3f + drei) | ✅ Complete |
| 6 | Solar system 3D viewer + Artemis 2 trajectory | ✅ Complete |
| 7 | SHAP + LIME explainability | ✅ Complete |
| 8 | Neon DB (PostgreSQL) — migrated from SQLite | ✅ Complete |
| 9 | Auth system — JWT login/signup, saved predictions in Neon DB | ✅ Complete |
| 10 | ARIA chatbot — Groq Cloud API (Llama 3.3 70B) | ✅ Complete |

### Running the Project

**Backend:**
```bash
cd f:/FYP/backend
# Ensure .env has DB_PASSWORD and GROQ_API_KEY set
python manage.py runserver
# Runs on http://localhost:8000
# Connects to Neon DB (PostgreSQL) automatically
```

**Frontend:**
```bash
cd f:/FYP/frontend
npm run dev
# Runs on http://localhost:3000
# API calls proxy to :8000 via vite.config.js
```

**No local services needed.** The chatbot (ARIA) calls Groq's cloud API — no Ollama install, no local model download. The database is Neon DB (cloud PostgreSQL) — no local DB server required.

**Required environment variables (`backend/.env`):**
```
DB_NAME=neondb
DB_USER=neondb_owner
DB_PASSWORD=<neon_password>
DB_HOST=<neon_host>.neon.tech
DB_PORT=5432
GROQ_API_KEY=<groq_api_key>
```

### Testing Key Features

1. **Explore page** → adjust filters → 3D viewer updates with matching planets
2. **Prediction panel** → move sliders → real-time score
3. **Explain button** → SHAP feature chart appears
4. **3D viewer fullscreen** → click planet → info panel
5. **Solar system** → check "Artemis 2 Path" → see free-return trajectory with animated spacecraft
6. **Chatbot** → ask about any planet or habitability concept
7. **Compare page** → select 2-4 planets → side-by-side metrics

---

*This guide is the authoritative reference for the AI Exoplanet Habitability Explorer. All ML decisions, feature selections, and system limitations are documented here to support academic review and presentation.*
