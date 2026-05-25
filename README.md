# Exoplanet Habitability Explorer

> An AI-powered full-stack web application that predicts and visualises the habitability of exoplanets discovered by NASA's Kepler, K2, and TESS missions — combining mission-specific machine learning models with an interactive 3D orbital viewer.

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![Django](https://img.shields.io/badge/Django-5.0-092E20?logo=django&logoColor=white)](https://www.djangoproject.com/)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-4169E1?logo=postgresql&logoColor=white)](https://neon.tech/)
[![Deployed on Vercel](https://img.shields.io/badge/Frontend-Vercel-000000?logo=vercel)](https://vercel.com/)

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

The Exoplanet Habitability Explorer processes 8,245 exoplanet candidates from three NASA missions and assigns each a habitability classification using a hybrid scoring system that combines physics-based Earth Similarity Index calculations with mission-specific ML classifiers. The web application lets users explore, filter, and compare planets, run custom habitability predictions, and visualise orbital systems in an interactive 3D environment.

---

## Features

| Feature | Description |
|---|---|
| **3D Orbital Viewer** | Real-time WebGL visualisation using React Three Fiber; temperature-driven textures, gas giant rings, habitable zone indicator |
| **Habitability Prediction Studio** | Adjust 7 planetary/stellar parameters via sliders and get an instant ML-backed habitability score with factor breakdown |
| **Planet Comparison** | Select up to 4 exoplanets for side-by-side comparison with a data table and radar/bar charts |
| **Explore & Filter** | Browse all 8,245 planets with filters by mission, habitability class, and free-text search |
| **ARIA Chatbot** | Groq-powered (Llama 3.3 70B) conversational assistant with full dataset knowledge |
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
| Library | Version | Purpose |
|---|---|---|
| Django | 5.0 | Web framework |
| Django REST Framework | 3.14 | REST API |
| SimpleJWT | 5.3 | JWT authentication |
| django-cors-headers | 4.3 | CORS handling |
| XGBoost | 2.0 | ML classifier (Kepler, K2) |
| scikit-learn | 1.8 | ML classifier (TESS), preprocessing |
| SHAP | 0.44 | Model explainability |
| LIME | 0.2 | Local model interpretation |
| psycopg2 | 2.9 | PostgreSQL driver |
| Gunicorn + WhiteNoise | — | Production serving |

### Infrastructure
- **Database**: Neon (serverless PostgreSQL)
- **Frontend hosting**: Vercel
- **AI chatbot**: Groq Cloud API (Llama 3.3 70B)

---

## Project Structure

```
FYP/
├── frontend/                    # React + Vite application
│   ├── src/
│   │   ├── pages/               # Route-level components
│   │   │   ├── Home.jsx
│   │   │   ├── ExplorePlanets.jsx
│   │   │   ├── PlanetDetail.jsx
│   │   │   ├── ComparePlanets.jsx
│   │   │   ├── About.jsx
│   │   │   ├── Concepts.jsx
│   │   │   └── Upload.jsx
│   │   ├── components/          # Shared components
│   │   │   ├── ExoplanetViewer3D.jsx   # Full 3D orbital viewer
│   │   │   ├── PredictionPanel.jsx     # Habitability prediction UI
│   │   │   ├── FiltersPanel.jsx        # Explore-page filters
│   │   │   ├── PlanetGrid.jsx          # Paginated planet cards
│   │   │   ├── Chatbot.jsx             # ARIA chatbot
│   │   │   ├── Navbar.jsx
│   │   │   └── Footer.jsx
│   │   ├── services/
│   │   │   └── api.js           # Axios client (all API calls)
│   │   ├── context/
│   │   │   └── AuthContext.jsx  # JWT auth state
│   │   └── App.jsx              # Router + global layout
│   ├── package.json
│   └── vite.config.js
│
├── backend/                     # Django REST API
│   ├── api/
│   │   └── habitability_scorer.py   # Core scoring engine
│   ├── planets/                 # Planet CRUD + stats endpoints
│   ├── predictions/             # Single + batch prediction endpoints
│   ├── users/                   # Auth, profile, saved predictions
│   ├── chatbot/                 # ARIA chatbot endpoint (Groq)
│   ├── backend/                 # Django settings
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
│   ├── raw/                     # Original NASA archive CSVs
│   └── processed/               # Cleaned, ML-ready datasets (train/val/test splits)
│       ├── k2/
│       ├── kepler/
│       └── tess/
│
├── artifacts/                   # Trained model files + preprocessors (.pkl)
│   ├── k2/                      # XGBoost (270 features)
│   ├── kepler/                  # XGBoost (130 features)
│   └── tess/                    # Random Forest (44 features)
│
├── Datasets/                    # Raw NASA CSV downloads
├── models/                      # Model evaluation reports
├── tests/                       # Unit tests
├── vercel.json                  # Frontend SPA rewrite rules
└── requirements.txt             # Python dependencies
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
# Edit backend/.env and set:
#   DB_NAME, DB_USER, DB_PASSWORD, DB_HOST, DB_PORT  (Neon credentials)
#   SECRET_KEY                                        (Django secret key)
#   GROQ_API_KEY                                      (Groq chatbot)

# 5. Run migrations
cd backend
python manage.py migrate

# 6. Load planet data into the database
python load_data_to_db.py

# 7. Start the development server
python manage.py runserver       # API available at http://localhost:8000
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start the development server (proxies /api/* to localhost:8000)
npm run dev                      # App available at http://localhost:3000
```

> **Note:** The frontend Vite config proxies all `/api/*` requests to `http://localhost:8000`, so no CORS configuration is needed in development.

---

## ML Models

Three independent mission-specific classifiers were trained, each optimised for the feature space available from that mission's instrument:

| Mission | Algorithm | Training Samples | Features | Accuracy | Weighted F1 |
|---|---|---|---|---|---|
| Kepler | XGBoost | ~2,200 | 130 | **100%** | 1.000 |
| K2 | XGBoost | ~1,550 | 270 | **99.2%** | 0.991 |
| TESS | Random Forest | ~2,860 | 44 | **100%** | 1.000 |

### Scoring Architecture

The final habitability score is a **hybrid** of physics-based and ML-based components:

```
habitability_score = 0.10 × ML_score + 0.90 × physics_score
```

The physics score combines:
- **Temperature similarity** — how close equilibrium temp is to Earth's 255 K
- **Radius similarity** — how close planet radius is to 1.0 R⊕
- **Insolation similarity** — how close flux is to 1.0 S⊕
- **Habitable zone proximity** — derived from orbital distance / orbital period via Kepler's third law
- **Stellar type factor** — weighting for G/K/M/F-type host stars

This weighting ensures Earth-like parameters consistently score above 90% regardless of potential ML model bias introduced by the heavily imbalanced training distribution.

### Classification Thresholds

| Class | Score Range | Meaning |
|---|---|---|
| `POTENTIALLY_HABITABLE` | ≥ 0.66 | Earth-like conditions — rocky, in habitable zone |
| `HABITABILITY_ZONE` | 0.30 – 0.65 | In or near HZ but not Earth-sized, or partial data |
| `NON_HABITABLE` | < 0.30 | Too hot/cold, gas giant, or extreme orbit |

---

## API Reference

All endpoints are prefixed with `/api/`.

### Planets

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/planets/` | Paginated planet list (supports `page`, `page_size`, `mission`, `habitability`, `q`) |
| `GET` | `/planets/{id}/` | Full planet detail |
| `GET` | `/planets/stats/` | Dataset-wide statistics |

### Predictions

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/predict/` | Single-planet habitability prediction |
| `POST` | `/predict/batch/` | Batch prediction from CSV upload |

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
| `GET/POST` | `/auth/saved/` | List or save a prediction |
| `DELETE` | `/auth/saved/{id}/` | Delete a saved prediction |

### Chatbot

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/chatbot/` | Check ARIA status (Groq connectivity) |
| `POST` | `/chatbot/` | Send a message, receive a response |

---

## Habitability Classification

The classification system maps real astrophysical criteria onto three classes:

**POTENTIALLY_HABITABLE**
- Planet radius: 0.5 – 2.0 R⊕ (rocky, not a gas giant)
- Insolation flux: 0.25 – 4.0 S⊕ (conservative habitable zone)
- Equilibrium temperature: 180 – 310 K
- Orbital period: 10 – 500 days

**HABITABILITY_ZONE**
- In or near the habitable zone but outside strict Earth-like size/temperature bounds
- May be a super-Earth, mini-Neptune, or have partial observational data

**NON_HABITABLE**
- Equilibrium temperature > 400 K or < 150 K
- Planet radius > 4.0 R⊕ (gas giant)
- Extreme insolation or orbital parameters

> Planets with missing observational data are still classified using available parameters and physics-based defaults. Such planets almost always resolve to `NON_HABITABLE` due to defaulting missing values to near-zero similarity. They are retained in the dataset as real discovered candidates whose characterisation is ongoing.

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
