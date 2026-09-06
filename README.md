# Exoplanet Habitability Explorer

> An AI-powered full-stack web application that predicts and visualises the habitability of exoplanets discovered by NASA's Kepler, K2, and TESS missions — combining mission-specific machine learning models with an interactive 3D orbital viewer.

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![Django](https://img.shields.io/badge/Django-5%20%7C%206-092E20?logo=django&logoColor=white)](https://www.djangoproject.com/)
[![Python](https://img.shields.io/badge/Python-3.11%20%7C%203.13-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-4169E1?logo=postgresql&logoColor=white)](https://neon.tech/)
[![Frontend on Vercel](https://img.shields.io/badge/Frontend-Vercel-000000?logo=vercel)](https://vercel.com/)

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Backend Setup](#backend-setup)
  - [Frontend Setup](#frontend-setup)
- [ML Models](#ml-models)
- [API Reference](#api-reference)
- [Habitability Classification](#habitability-classification)
- [Academic Context](#academic-context)

---

## Overview

The Exoplanet Habitability Explorer processes 11,378 exoplanet candidates from three NASA missions and assigns each a habitability classification using a hybrid scoring system that combines a physics model with a gradient-boosted classifier. The web application lets users explore, filter, and compare planets, run custom habitability predictions, and visualise orbital systems in an interactive 3D environment.

---

## Features

| Feature | Description |
|---|---|
| **3D Orbital Viewer** | Real-time WebGL visualisation using React Three Fiber; temperature-driven textures, gas giant rings, habitable zone indicator |
| **Habitability Prediction Studio** | Adjust 7 planetary/stellar parameters via sliders and get an instant ML-backed habitability score with factor breakdown |
| **Planet Comparison** | Select up to 4 exoplanets for side-by-side comparison with a data table plus Chart.js radar and bar charts |
| **Explore & Filter** | Browse all 11,378 objects with filters by mission, habitability class, and free-text search |
| **ARIA Chatbot** | Groq-powered (Llama 3.3 70B) assistant. Dataset facts are baked into its system prompt — it has no live database access |
| **Saved Predictions** | Authenticated users can save, name, and reload custom habitability predictions |
| **Batch Upload** | Submit a CSV of custom planet parameters for batch ML prediction |

---

## Tech Stack

### Frontend
| Library | Version | Purpose |
|---|---|---|
| React | 19 | UI framework |
| Vite | 7 | Build tool / dev server |
| React Router | 7 | Client-side routing |
| Tailwind CSS | 3 | Utility-first styling |
| Framer Motion | 12 | Animations |
| React Three Fiber + Drei | 9 / 10 | 3D WebGL rendering |
| Three.js | 0.183 | 3D engine |
| Chart.js + react-chartjs-2 | 4.5 / 5.3 | Charts |
| Axios | 1.13 | HTTP client |
| Lucide React | 0.575 | Icons |

### Backend
| Library | `requirements.txt` pin | Installed locally | Purpose |
|---|---|---|---|
| Django | 5.0.1 | **6.0** | Web framework |
| Django REST Framework | 3.14.0 | **3.16.1** | REST API |
| SimpleJWT | 5.3.1 | 5.3.1 | JWT authentication |
| django-cors-headers | 4.3.1 | **4.9.0** | CORS handling |
| XGBoost | 2.0.3 | **3.1.2** | ML classifier (Kepler, K2) |
| scikit-learn | 1.8.0 | **1.7.2** | ML classifier (TESS), preprocessing |
| SHAP | 0.44.1 | **0.50.0** | Model explainability |
| LIME | 0.2.0.1 | 0.2.0.1 | Local model interpretation |
| numpy / pandas | 1.26.4 / 2.2.0 | **2.3.5 / 2.3.3** | Numerics |
| psycopg2-binary | 2.9.9 | 2.9.9 | PostgreSQL driver |
| Gunicorn + WhiteNoise | 21.2.0 / 6.6.0 | 21.2.0 / **6.12.0** | Production serving |

> ⚠️ **The pins and the working environment have drifted apart.** The local
> virtualenv runs Python 3.13 with Django 6 and XGBoost 3, while
> `requirements.txt` pins Python 3.11 (via `runtime.txt`), Django 5.0.1 and
> XGBoost 2.0.3. The `.pkl` models in `models/` were produced by the installed
> versions, and pickled estimators are not guaranteed to load across major
> library versions. Everything documented here was verified against the
> **installed** versions. Before relying on `requirements.txt` for a fresh
> deploy, install it into a clean virtualenv and run `pytest` to confirm the
> models still load.

### Infrastructure
- **Database**: Neon (serverless PostgreSQL) — live, 11,378 objects
- **Frontend hosting**: Vercel — live at `exoplanet-frontend-seven.vercel.app`
- **Backend hosting**: Railway — **currently not running** (see below)
- **AI chatbot**: Groq Cloud API (Llama 3.3 70B)

> **Deployment status.** The Vercel frontend responds, but the Railway backend at
> `exoplanet-production-d030.up.railway.app` returns
> `404 "Application not found"`, so the deployed site cannot load planet data or
> run predictions. Everything works when run locally against Neon. Redeploy the
> backend, then set `VITE_API_URL` in Vercel to the new URL and add that origin to
> `CORS_ALLOWED_ORIGINS` / `CSRF_TRUSTED_ORIGINS` on the backend.

---

## Project Structure

```
FYP/
├── frontend/                    # React + Vite application
│   ├── src/
│   │   ├── pages/               # Route-level components
│   │   │   ├── Home.jsx                # Landing page
│   │   │   ├── ExplorePlanets.jsx      # Main page: filters + 3D + grid + prediction
│   │   │   ├── PlanetDetail.jsx        # Full planet profile + ML prediction
│   │   │   ├── ComparePlanets.jsx      # Side-by-side comparison
│   │   │   ├── Concepts.jsx            # "Learn" — habitability concepts
│   │   │   ├── Upload.jsx              # Batch CSV prediction
│   │   │   ├── About.jsx
│   │   │   ├── login.jsx / signin.jsx  # Auth screens
│   │   │   └── NotFound.jsx            # 404 route
│   │   ├── components/          # Shared components
│   │   │   ├── ExoplanetViewer3D.jsx   # Full 3D orbital viewer
│   │   │   ├── SolarSystemViewer.jsx   # Solar-system 3D scene
│   │   │   ├── AboutHeroCube.jsx       # About-page 3D hero
│   │   │   ├── PredictionPanel.jsx     # Habitability prediction UI
│   │   │   ├── FiltersPanel.jsx        # Explore-page filters
│   │   │   ├── PlanetGrid.jsx          # Paginated planet cards
│   │   │   ├── PlanetCard.jsx          # Single planet card
│   │   │   ├── SearchBar.jsx           # Typeahead planet search
│   │   │   ├── Chatbot.jsx             # ARIA chatbot
│   │   │   ├── ScrollToTop.jsx         # Route-change scroll reset
│   │   │   ├── Navbar.jsx
│   │   │   └── Footer.jsx
│   │   ├── services/
│   │   │   └── api.js           # Axios client (all API calls)
│   │   ├── context/
│   │   │   └── AuthContext.jsx  # JWT auth state
│   │   └── App.jsx              # Router + global layout
│   ├── public/                  # favicon, logo, 3D model, FYP PDFs
│   ├── .env.example             # VITE_API_URL template
│   ├── package.json
│   └── vite.config.js
│
├── backend/                     # Django REST API
│   ├── api/
│   │   └── habitability_scorer.py   # Core scoring engine (imported by predictions)
│   ├── planets/                 # Planet list/detail/search/stats/compare endpoints
│   ├── predictions/             # Single + batch prediction, /explain/, ai_service.py
│   ├── users/                   # Auth, profile, saved predictions
│   ├── chatbot/                 # ARIA chatbot endpoint (Groq)
│   ├── backend/                 # Django settings, URLs, CSP middleware
│   ├── load_data_to_db.py       # Loads processed CSVs into the database
│   ├── backfill_planet_names.py # Legacy one-off repair for pre-rebuild databases
│   ├── .env.example             # Backend environment template
│   └── manage.py
│
├── notebooks/                   # Jupyter notebooks (data processing + ML training)
│   ├── 01_k2_habitability.ipynb
│   ├── 02_kepler_habitability.ipynb
│   ├── 03_tess_toi_habitability.ipynb
│   ├── 04a_ml_k2_mission.ipynb
│   ├── 04b_ml_kepler_mission.ipynb
│   ├── 04c_ml_tess_mission.ipynb
│   └── 05_model_comparison.ipynb
│
├── data/
│   ├── raw/                     # Original NASA archive CSVs (k2, kepler, TOI)
│   └── processed/
│       └── habitability_catalogue.csv   # Labelled catalogue — 11,378 objects.
│                                        # The ONE artefact both the models and
│                                        # the database are built from.
│
├── scripts/                     # Reproducible pipeline (no Django, no DB, no network)
│   ├── train_models.py          # Raw archives -> models, artifacts, catalogue, reports
│   └── calibrate_blend.py       # Selects the blend weight + class thresholds
│
├── models/                      # Trained classifiers (.pkl) + evaluation
│   ├── unified_model.pkl        # DEFAULT — pooled across all missions
│   ├── k2_model.pkl             # Per-mission ablations
│   ├── kepler_model.pkl
│   ├── tess_model.pkl
│   ├── model_performance.csv    # Headline out-of-fold macro F1
│   └── reports/                 # Per-class metrics, degraded-input robustness,
│                                # leave-one-mission-out, blend calibration
│
├── artifacts/                   # Preprocessors — scaler, encoder, metadata per model
│   ├── unified/                 # minmax scaler, label encoder, metadata (.pkl + .json)
│   ├── k2/  kepler/  tess/
│
├── docs/                        # FYP report drafts (.docx) + extracted text
├── tests/                       # pytest suite — physics, scoring, scorer, API
├── test_models.py               # Standalone CLI predictor (calls the real scorer)
├── vercel.json                  # Frontend SPA rewrite rules
├── Procfile / runtime.txt       # Railway backend deployment
└── requirements.txt             # Python dependencies
```

> `backend/api/` holds the scoring core, imported by the Django apps and by the
> training pipeline alike:
> - `physics.py` — canonical schema, physics derivations, the 25-feature vector,
>   and the labelling rule. **Imported by both `scripts/train_models.py` and the
>   serving path**, which is what makes train/serve feature skew structurally
>   impossible.
> - `scoring.py` — the deterministic physics score and the Earth Similarity Index.
> - `habitability_scorer.py` — loads the models, blends classifier with physics.
>
> It is deliberately **not** in `INSTALLED_APPS`: it holds no Django models and
> needs no migrations.

```text
```

---

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 20+
- A [Neon](https://neon.tech/) PostgreSQL database (or local PostgreSQL)
- A [Groq](https://console.groq.com/) API key for the chatbot

### Backend Setup

```bash
# 1. Clone the repository
git clone https://github.com/Hadeed711/fyp_exo_habitability.git
cd fyp_exo_habitability

# 2. Create and activate a virtual environment
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Configure environment variables
cp backend/.env.example backend/.env
# Then edit backend/.env — the table below lists every variable.

# 5. Run migrations
cd backend
python manage.py migrate

# 6. Load the labelled catalogue into the database
python load_data_to_db.py --dry-run    # inspect what would change
python load_data_to_db.py              # first load
# python load_data_to_db.py --replace  # wipe and reload after retraining

# 7. Start the development server
python manage.py runserver       # API available at http://localhost:8000
```

#### Backend environment variables

All are read in `backend/backend/settings.py` (except `GROQ_API_KEY`, read in `backend/chatbot/views.py`).

| Variable | Required | Purpose |
|---|---|---|
| `SECRET_KEY` | When `DEBUG=false` | Django cryptographic signing key |
| `DEBUG` | No (default `false`) | `true` locally; when `false` Django also enables SSL redirect, HSTS and secure cookies |
| `DATABASE_URL` | One of these two | Full PostgreSQL connection string — takes priority |
| `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT` | One of these two | Discrete Neon credentials; used when `DATABASE_URL` is unset |
| `GROQ_API_KEY` | For the chatbot | Groq Cloud key. Without it `/api/chatbot/` reports unavailable rather than failing |
| `ALLOWED_HOSTS` | No | Comma-separated; falls back to localhost + `.up.railway.app` |
| `CORS_ALLOWED_ORIGINS` | No | Comma-separated; falls back to localhost + the deployed Vercel origin |
| `CSRF_TRUSTED_ORIGINS` | No | Comma-separated; same fallback behaviour |

> If none of `DATABASE_URL` or `DB_PASSWORD` is set, Django falls back to a local SQLite file at `backend/db.sqlite3`.

#### Rebuilding the models and the catalogue

Both are generated from `data/raw/` and neither needs Django, a database, or
network access:

```bash
python scripts/train_models.py      # models, artifacts, labelled catalogue, reports
python scripts/calibrate_blend.py   # blend weight + class thresholds
python scripts/verify_docs.py       # confirm the docs still match the artifacts
```

`train_models.py` writes **one** labelled catalogue,
`data/processed/habitability_catalogue.csv`, and `load_data_to_db.py` is the
only thing that reads it. That is deliberate: the classes shown on the site and
the classes the model was trained on are the same rows, by construction. They
previously came from separate exports built by different notebook runs, with no
mechanism keeping them in step.

After retraining, reload the database so the two stay in step:

```bash
cd backend && python load_data_to_db.py --replace
```

The scorer refuses to load any model whose feature list does not match
`backend/api/physics.py`, so a stale artefact fails loudly at startup rather
than silently producing nonsense.

#### Running the tests

```bash
python -m pytest tests/ -q
```

115 tests covering the physics derivations, the scoring formulas, train/serve
feature alignment, the response contract, and the API endpoints. No database
required. Reference bodies (Earth, Mars, Venus, a hot Jupiter) are asserted, so
a regression in the score cannot ship silently.

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start the development server (proxies /api/* to localhost:8000)
npm run dev                      # App available at http://localhost:3000
```

> **Note:** The frontend Vite config proxies all `/api/*` requests to `http://localhost:8000`, so no CORS configuration is needed in development.

#### Frontend environment variables

| Variable | Required | Purpose |
|---|---|---|
| `VITE_API_URL` | Production only | Absolute base URL of the deployed API, including the trailing `/api`. Leave unset locally so the Vite proxy handles it. |

Copy `frontend/.env.example` to `frontend/.env` for local overrides, or set the variable in the Vercel dashboard for production.

---

## ML Models

One **unified** XGBoost classifier trained on all 11,378 objects pooled across
the three missions is the default. Per-mission models are also trained, but only
as an ablation: just 126 objects in the whole catalogue meet the
potentially-habitable criteria, and splitting those across three models leaves
too few in each to estimate anything reliably.

Headline metric is **out-of-fold macro F1** — every object scored by a model
that never saw it, so rare classes report their full support. Macro, not
accuracy: 93% of objects are non-habitable, so accuracy would be dominated by
the majority class.

| Model set | Estimator | Objects | OOF macro F1 | Fold SD |
|---|---|---|---|---|
| **unified** (default) | XGBoost | 11,378 | **0.983** | 0.012 |
| kepler | Random Forest | 4,619 | 0.989 | 0.006 |
| tess | XGBoost | 5,905 | 0.937 | 0.072 |
| k2 | Random Forest | 854 | 0.767 | 0.174 |

Per-class, unified model:

| Class | Precision | Recall | F1 | Objects |
|---|---|---|---|---|
| POTENTIALLY_HABITABLE | 0.976 | 0.952 | 0.964 | 126 |
| HABITABILITY_ZONE | 0.981 | 0.989 | 0.985 | 628 |
| NON_HABITABLE | 1.000 | 0.999 | 0.999 | 10,624 |

> **Read this before quoting any figure.** The habitability labels are a
> **documented physics rule** (`backend/api/physics.py`, `LABEL_RULE`), not
> observed ground truth — no exoplanet has confirmed habitability. The
> classifier is trained on the same observables that rule consumes, so it is a
> **learned surrogate** of it. A high score means it reproduces the rule
> faithfully; it is **not** evidence of scientific discovery.

### Where the ML earns its place

Real catalogue rows are incomplete, and the labelling rule simply cannot be
evaluated when the quantities it needs are missing. The model can:

| Observables withheld | Model accuracy | Rule accuracy | Rule undefined |
|---|---|---|---|
| 0 | 1.000 | 1.000 | 0% |
| 2 | 0.994 | 0.412 | 58.7% |
| 4 | 0.976 | 0.048 | 95.2% |

It manages this because it is trained on deliberately masked rows and because
nine `imputed_*` features tell it which inputs were measured and which were
derived from physics.

**Leave-one-mission-out** (train on two missions, test on the third) gives macro
F1 of 0.942 / 0.899 / 0.752 holding out TESS / K2 / Kepler — a genuine
generalisation test across different instruments and detection biases.

Live figures: `GET /api/models/report/`. Full detail:
[models/README.md](./models/README.md).

### Scoring Architecture

The habitability score blends the classifier with a deterministic physics
calculation:

```
habitability_score = 0.60 × ML_score + 0.40 × physics_score
```

`ML_score` collapses the class posterior onto one axis:
`P(habitable) × 1.0 + P(zone) × 0.5 + P(non-habitable) × 0.0`.

`physics_score` is closed-form and hand-checkable — the geometric mean of
radius, temperature and flux similarity to Earth, multiplied by habitable-zone
membership and a stellar-type factor. The geometric mean means any single
disqualifying property drags the whole score down: a Jupiter-radius planet
scores zero regardless of its orbit.

**The 0.60 weight is calibrated, not chosen by hand.**
`scripts/calibrate_blend.py` sweeps the weight and the class thresholds to
maximise macro F1 against the physics label across all 11,378 objects, using
out-of-fold probabilities so the weight is not tuned against memorised answers:

| Configuration | Macro F1 |
|---|---|
| physics only (w=0.00) | 0.719 |
| **selected (w=0.60)** | **0.983** |
| classifier only (w=1.00) | 0.984 |

The curve is flat above w≈0.55, so the smallest weight within 0.002 of the peak
is selected — keeping as much of the auditable physics term as the data
supports.

> An earlier version of this project used `0.10 × ML + 0.90 × physics`. That was
> not a design decision: the classifier was being served ~90% zero-filled
> features (it expected 130–270 columns while the API supplied 9), producing
> NaNs and values near −5232 against training data scaled to [0, 1]. Its output
> had to be suppressed to keep the demo sensible. With the feature pipeline
> fixed, the measured optimum moved to 0.60.

### Classification Thresholds

| Class | Score Range | Meaning |
|---|---|---|
| `POTENTIALLY_HABITABLE` | ≥ 0.71 | Earth-like conditions — rocky, in habitable zone |
| `HABITABILITY_ZONE` | 0.24 – 0.70 | In or near HZ but not Earth-sized, or partial data |
| `NON_HABITABLE` | < 0.24 | Too hot/cold, gas giant, or extreme orbit |

These thresholds are calibrated alongside the blend weight and are served with
every prediction as `score_thresholds`, so the UI colours a score using the same
cut-offs the backend used to label it.

---

## API Reference

All endpoints are prefixed with `/api/`.

### Planets

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/planets/` | Paginated planet list — see query parameters below |
| `GET` | `/planets/{id}/` | Full planet detail |
| `GET` | `/planets/habitable/` | Paginated list restricted to `POTENTIALLY_HABITABLE` + `HABITABILITY_ZONE` |
| `GET` | `/planets/search/?q=` | Name search, capped at 50 results |
| `GET` | `/planets/compare/?ids=1,2,3` | Side-by-side comparison, max 10 planets |
| `GET` | `/planets/stats/` | Dataset-wide statistics (counts per mission and class, averages) |
| `GET` | `/missions/` | List the three missions with metadata |

**Query parameters for `/planets/`:**

| Parameter | Example | Description |
|---|---|---|
| `page`, `page_size` | `?page=2&page_size=30` | Pagination — default 50, max 200 |
| `mission` | `?mission=kepler` | `k2`, `kepler`, or `tess` (case-insensitive) |
| `habitability` | `?habitability=POTENTIALLY_HABITABLE` | Filter by classification |
| `min_radius`, `max_radius` | `?min_radius=0.5&max_radius=2.0` | Radius range in Earth radii |
| `min_temp`, `max_temp` | `?min_temp=180&max_temp=310` | Equilibrium temperature range in K |
| `q` | `?q=Kepler-227` | Case-insensitive planet-name search |
| `hide_incomplete` | `?hide_incomplete=true` | Drop rows missing both `pl_eqt` and `pl_rade` |
| `confirmed_only` | `?confirmed_only=true` | Exclude candidate-class objects — 11,378 → 4,515, habitable 126 → 45 |
| `disposition` | `?disposition=CANDIDATE` | Exact archive disposition: `CONFIRMED`, `CANDIDATE`, `PC`, `CP`, `KP`, `APC` |

A malformed numeric filter returns **400** with the offending parameter named,
not a 500.

### Predictions

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/predict/` | Single-planet habitability prediction |
| `POST` | `/predict/batch/` | Batch prediction from CSV upload |
| `POST` | `/explain/` | Prediction plus SHAP / LIME feature attribution |
| `GET` | `/models/info/` | Loaded models, feature list, and the active blend calibration |
| `GET` | `/models/report/?mission=auto` | Full evaluation record: out-of-fold per-class metrics, degraded-input robustness, leave-one-mission-out transfer, and the label caveat. **Pages quoting accuracy read from here** so published numbers cannot drift from the artefacts. |
| `GET` | `/health/` | Service health check (model load status) |

**Single prediction request body:**
```json
{
  "pl_rade": 1.0,
  "pl_eqt": 255,
  "pl_insol": 1.0,
  "pl_orbper": 365,
  "st_teff": 5778,
  "st_rad": 1.0,
  "st_mass": 1.0
}
```

### Authentication

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/auth/register/` | Create an account |
| `POST` | `/auth/login/` | Login (username or email), returns JWT access + refresh tokens |
| `GET` | `/auth/me/` | Current user profile |
| `POST` | `/auth/logout/` | Client-side logout signal (see note) |
| `GET/POST` | `/auth/saved/` | List or save a prediction |
| `DELETE` | `/auth/saved/{id}/` | Delete a saved prediction |

Access tokens live for **1 hour**, refresh tokens for **7 days**; token rotation is disabled.

> **Note on `/auth/logout/`:** `token_blacklist` is not in `INSTALLED_APPS`, so the endpoint cannot actually revoke a refresh token — it always returns `200` and the client discards its own tokens. An unexpired refresh token stays usable until it lapses. Add `rest_framework_simplejwt.token_blacklist` to `INSTALLED_APPS` and migrate if true server-side revocation is required.

### Chatbot

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/chatbot/` | Check ARIA status (Groq connectivity) |
| `POST` | `/chatbot/` | Send a message, receive a response |

---

## Data Provenance

From 21,224 raw rows in the NASA Exoplanet Archive exports down to 11,378
catalogued objects:

| Mission | Raw rows | False positives | Duplicates | Unlabelable | Kept |
|---|---|---|---|---|---|
| K2 | 3,992 | 315 | 2,121 | 702 | **854** |
| Kepler | 9,564 | 4,839 | 0 | 106 | **4,619** |
| TESS | 7,668 | 1,290 | 0 | 473 | **5,905** |
| **Total** | **21,224** | **6,444** | **2,121** | **1,281** | **11,378** |

- **False positives** — objects dispositioned `FALSE POSITIVE`, `REFUTED`, `FP`
  or `FA` are excluded. They are not planets.
- **Duplicates** — the archive stores one row per literature reference, so a
  well-studied planet appears many times. K2 collapses to the archive's own
  preferred row via `default_flag`.
- **Unlabelable** — the four labelling criteria cannot be resolved even after
  physics derivation.

### Confirmed vs candidate

The catalogue keeps `CONFIRMED` **and** `CANDIDATE` objects (plus TESS `KP` and
`APC`). This is the main reason it holds 11,378 objects where an earlier version
of this project held 8,245 — that version filtered to `CONFIRMED` only and
discarded every candidate.

The trade-off is stated rather than buried: **81 of the 126 potentially-habitable
objects are unconfirmed candidates**, mostly Kepler KOIs. A candidate can still
be retracted. The `disposition` column is carried through to
`data/processed/habitability_catalogue.csv` so the confirmed-only subset is
reproducible: 4,515 objects, 45 of them potentially habitable.

**The site can filter to confirmed planets only.** `Confirmed planets only` in
the Explore filters panel maps to `?confirmed_only=true`, which drops the
catalogue to 4,515 objects and the habitable count from 126 to 45. Candidate
objects also carry a `Candidate` badge on their card. The raw archive value is
exposed per planet as `disposition`.

This was decided by measurement, not preference. `scripts/compare_populations.py`
trains the identical pipeline on all three candidate populations:

| Population | Objects | Habitable | Macro F1 | Fold SD | Habitable F1 | Habitable F1 SD |
|---|---|---|---|---|---|---|
| **confirmed + candidates** (shipped) | 11,378 | 126 | **0.983** | **0.012** | **0.964** | **0.027** |
| confirmed only | 4,515 | 45 | 0.974 | 0.017 | 0.944 | 0.050 |
| old pipeline's rule | 8,232 | 47 | 0.971 | 0.029 | 0.935 | 0.082 |

The shipped population wins on every metric, and the margin that matters is the
last column: with 126 habitable objects the rare-class estimate varies by 0.027
across folds, against 0.082 for the old rule — a three-fold difference in how
much the only number anyone cares about wobbles depending on which fold an
object lands in.

Note also that **the old catalogue was not confirmed-only**. It applied
`CONFIRMED` to K2 and Kepler but kept TESS `PC` — *Planet Candidate* — so 4,265
of its 8,245 objects were already candidates. It was inconsistent rather than
strict, which is why it scores worst here. Regenerate the table any time with
`python scripts/compare_populations.py`.

---

## Habitability Classification

The class of every catalogued object comes from one documented rule, defined
once as `LABEL_RULE` in [`backend/api/physics.py`](backend/api/physics.py) and
applied identically to the training targets and to the catalogue the site
displays.

**POTENTIALLY_HABITABLE** — *all four* criteria must hold:
- Planet radius: 0.5 – 2.0 R⊕ (rocky, not a gas giant)
- Insolation flux: 0.25 – 4.0 S⊕ (conservative habitable zone)
- Equilibrium temperature: 180 – 310 K
- Orbital period: 10 – 500 days

**HABITABILITY_ZONE** — *either* criterion:
- Insolation flux: 0.25 – 4.0 S⊕, **or**
- Equilibrium temperature: 200 – 350 K

**NON_HABITABLE** — everything else.

> **This is a physics proxy, not observed ground truth.** No exoplanet has
> confirmed habitability. The classifier is trained on the same observables this
> rule consumes, so it is a learned surrogate of it — see
> [ML Models](#ml-models).

> **"Potentially habitable" is not the same as "confirmed planet".** 81 of the
> 126 objects in that class are candidate-class detections. Use
> `?confirmed_only=true`, or the toggle in the UI, to restrict to the 45 that
> are archive-confirmed.

> **Missing measurements are derived, not defaulted.** Where a quantity is
> absent it is computed from first principles — semi-major axis from Kepler's
> third law, luminosity from Stefan–Boltzmann, insolation from the inverse-square
> law, equilibrium temperature from insolation. Every derived value is flagged,
> and those flags are model inputs. Objects whose four labelling criteria cannot
> be resolved even after derivation are excluded rather than assigned a guessed
> class.

---

## Academic Context

| | |
|---|---|
| **Institution** | University of Agriculture, Faisalabad |
| **Programme** | Bachelor of Science — Final Year Project |
| **Supervisor** | Mam Nabeela Ashraf |
| **Year** | 2025 – 2026 |

### Data Sources

- [NASA Exoplanet Archive](https://exoplanetarchive.ipac.caltech.edu/) — primary planet catalogue
- [Kepler Mission](https://www.nasa.gov/mission_pages/kepler/) — transit photometry, 2009–2018
- [K2 Mission](https://keplerscience.arc.nasa.gov/k2-fields.html) — extended Kepler, 2014–2018
- [TESS Mission](https://tess.mit.edu/) — all-sky survey, 2018–present
- Kopparapu et al. (2013) — habitable zone boundary model used for HZ ring visualisation

---

*Built with React 19, Django 5, and three.js — data sourced from NASA's public exoplanet archives.*
