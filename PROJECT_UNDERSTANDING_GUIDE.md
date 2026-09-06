# Complete Understanding Guide

**AI Exoplanet Habitability Explorer**

This guide is written for someone who has to *explain* this project — in a viva,
a code review, or to a new teammate — and therefore needs to actually understand
it, not just run it.

Every number, formula and file description here was verified against the source
code and the live database on **1 September 2026**. Where the code and the older
documentation disagreed, the code won. Where something is broken, incomplete or
misleading, this guide says so plainly rather than glossing over it — you are far
better off knowing the weak points before an examiner finds them.

---

## Table of Contents

**Part 1 — Orientation**
1. [What this project actually is](#1-what-this-project-actually-is)
2. [The 60-second mental model](#2-the-60-second-mental-model)
3. [Running it locally](#3-running-it-locally)

**Part 2 — The Science**
4. [What "habitable" means here](#4-what-habitable-means-here)
5. [The data: where it comes from and what happens to it](#5-the-data-where-it-comes-from-and-what-happens-to-it)

**Part 3 — The Machine Learning**
6. [The three models and why there are three](#6-the-three-models-and-why-there-are-three)
7. [The scoring engine — the heart of the project](#7-the-scoring-engine--the-heart-of-the-project)
8. [Explainability: SHAP, LIME and the fallback](#8-explainability-shap-lime-and-the-fallback)

**Part 4 — The Code, File by File**
9. [Repository map](#9-repository-map)
10. [Backend, file by file](#10-backend-file-by-file)
11. [Frontend, file by file](#11-frontend-file-by-file)

**Part 5 — Reality Checks**
12. [A prediction, traced end to end](#12-a-prediction-traced-end-to-end)
13. [What this system cannot do](#13-what-this-system-cannot-do)
14. [Known problems and rough edges](#14-known-problems-and-rough-edges)
15. [Questions you should be ready for](#15-questions-you-should-be-ready-for)

---
---

# Part 1 — Orientation

## 1. What this project actually is

A full-stack web application that takes the physical measurements of an exoplanet
— its size, temperature, how much starlight it receives, its orbit, and the
properties of its star — and produces a **habitability score between 0 and 1**,
along with a classification and an explanation of which inputs drove the result.

It ships with 8,245 real planets from three NASA missions, a 3D orbital viewer,
a prediction studio where you can invent your own planet with sliders, batch CSV
prediction, user accounts, and an AI chatbot.

### The single most important distinction

> **This system predicts *physical plausibility*, not life.**

It cannot detect life, water, oxygen, or an atmosphere. It answers one narrower
question: *given the handful of properties a transit survey can actually measure,
how similar is this planet to Earth, and does it sit where liquid water could in
principle exist?*

If you remember one sentence from this guide, make it that one. Almost every
limitation in [Section 13](#13-what-this-system-cannot-do) follows from it.

### The parts

| Layer | Technology | What it does |
|---|---|---|
| Frontend | React 19 + Vite, Tailwind, Three.js | Everything the user sees |
| Backend | Django 6 + Django REST Framework | REST API, auth, ML serving |
| Database | Neon (serverless PostgreSQL) | 8,245 planets, users, saved predictions |
| ML | XGBoost + Random Forest (`.pkl` files) | Three mission-specific classifiers |
| Scoring | Custom Python (`habitability_scorer.py`) | Blends ML output with physics |
| Chatbot | Groq Cloud API (Llama 3.3 70B) | "ARIA" assistant |

---

## 2. The 60-second mental model

There are **two separate flows** in this application. Confusing them is the most
common misunderstanding, so learn the difference first.

### Flow A — Browsing stored planets (no ML at request time)

```
Browser                    Django                     Neon PostgreSQL
   |                          |                              |
   |-- GET /api/planets/ ---->|                              |
   |                          |-- SELECT ... LIMIT 12 ------>|
   |                          |<-- 12 rows ------------------|
   |<-- JSON (12 planets) ----|                              |
```

The `habitability_class` you see on a planet card was computed **once**, back in
the Jupyter notebooks, and stored as a column. Browsing does not run any model.
This is why the Explore page is fast.

### Flow B — Predicting a custom planet (ML runs live)

```
Browser                Django              HabitabilityScorer        .pkl files
   |                      |                        |                     |
   |-- POST /api/predict ->|                       |                     |
   |                      |-- predict_single() --->|                     |
   |                      |                        |-- load (once) ----->|
   |                      |                        |-- build 130 feats   |
   |                      |                        |-- scale             |
   |                      |                        |-- predict_proba     |
   |                      |                        |-- blend w/ physics  |
   |<-- score + factors --|<---- result dict ------|                     |
```

**The key insight:** the number shown on a planet's detail page is *recomputed
live* through Flow B, while the badge on its card in the grid comes from Flow A's
stored column. They can disagree. That is expected — one is a fresh computation
by the current scorer, the other is a historical label frozen at data-load time.

---

## 3. Running it locally

### Prerequisites
- Python 3.11+ (the working virtualenv here uses 3.13)
- Node.js 20+
- A Neon PostgreSQL connection string, or Postgres locally
- A Groq API key (optional — without it, only the chatbot is disabled)

### Backend

```bash
python -m venv .venv
.venv\Scripts\activate            # Windows;  source .venv/bin/activate elsewhere
pip install -r requirements.txt

cp backend/.env.example backend/.env    # then fill in real values
cd backend
python manage.py migrate
python load_data_to_db.py               # first run only, loads 8,245 planets
python manage.py runserver               # http://localhost:8000
```

> **`DEBUG=true` is required locally.** With `DEBUG=false`, Django turns on
> `SECURE_SSL_REDIRECT` and the dev server becomes unreachable over plain HTTP.
> This trips people up constantly.

### Frontend

```bash
cd frontend
npm install
npm run dev                              # http://localhost:3000
```

Leave `VITE_API_URL` unset locally. `vite.config.js` proxies `/api/*` to port
8000, so the browser only ever talks to port 3000 and **CORS never enters the
picture in development**.

### Verifying it works

```bash
pytest                     # 12 tests, all should pass
python test_models.py      # prints predictions for 6 sample planets
curl http://localhost:8000/api/health/
```

---
---

# Part 2 — The Science

## 4. What "habitable" means here

### The habitable zone

The band of orbital distances around a star where a planet's temperature would
allow **liquid water** on the surface. Too close, water boils; too far, it
freezes. It is often called the Goldilocks zone.

The boundaries depend on the star, because a dim red dwarf's habitable zone sits
far closer in than a bright Sun-like star's. This project uses these boundaries
(in AU), from `hz_boundaries` in `habitability_scorer.py`:

| Star type | Inner | Outer | Notes |
|---|---|---|---|
| F (yellow-white, hot) | 1.4 | 2.4 | Bright, short-lived |
| G (Sun-like) | 0.95 | 1.67 | Earth sits at 1.0 |
| K (orange dwarf) | 0.38 | 1.02 | Often called "superhabitable" |
| M (red dwarf) | 0.08 | 0.23 | Very close in; tidal locking likely |

These follow the Kopparapu et al. (2013) conservative model.

### Earth Similarity Index (ESI)

A published 0–1 index of how Earth-like a planet is. This project computes three
components and combines them as a **geometric mean**:

```python
ESI_radius = 1 - abs((pl_rade  / 1.0  ) ** 0.57 - 1)
ESI_temp   = 1 - abs((pl_eqt   / 288.0) ** 0.25 - 1)
ESI_flux   = 1 - abs((pl_insol / 1.0  ) ** 0.25 - 1)

ESI = (ESI_radius * ESI_temp * ESI_flux) ** (1/3)
```

The 0.57 exponent for radius is from Schulze-Makuch et al. (2011).

> **Watch this trap.** ESI compares temperature against Earth's **surface**
> temperature (288 K). The physics score in [Section 7](#7-the-scoring-engine--the-heart-of-the-project)
> compares against Earth's **equilibrium** temperature (255 K). Two different
> reference numbers, deliberately. ESI is a published index with a fixed
> definition; the physics term measures similarity in the same quantity the
> dataset actually reports. If an examiner spots "255 in one place, 288 in
> another", this is the answer.
>
> **ESI is reported in the API response but is *not* an input to the
> habitability score.** Older versions of this document claimed it was weighted
> at 30%. That was never true in the code.

### Equilibrium temperature — the concept that explains everything

`pl_eqt` is the temperature a planet would have **if it had no atmosphere**. It
is computed from the star's output and the orbital distance.

Earth's equilibrium temperature is 255 K (−18 °C). Earth's actual surface is
288 K (15 °C). The 33 K difference is our greenhouse effect.

Venus is the cautionary tale: equilibrium temperature about 232 K, actual surface
737 K. A runaway greenhouse effect accounts for the entire 505 K gap — and
**transit photometry cannot see it**.

This one fact is the root of the system's central limitation, demonstrated
concretely in [Section 13](#13-what-this-system-cannot-do).

---

## 5. The data: where it comes from and what happens to it

### The three missions

| Mission | Years | Why included | Rows |
|---|---|---|---|
| **Kepler** | 2009–2013 | Stared at one patch of sky for 4 years; deepest, most reliable data | 2,742 |
| **K2** | 2014–2018 | Kepler after two reaction wheels failed; different sky fields | 1,937 |
| **TESS** | 2018– | All-sky survey of nearby bright stars | 4,935 |

Three missions give sky coverage, different star populations, and cross-checking.

### The pipeline

```
data/raw/*.csv                      NASA Exoplanet Archive downloads
      |
      |  notebooks/01, 02, 03       clean, engineer features, label,
      v                             split 60/20/20 stratified
data/processed/<mission>/*.csv      9,614 rows total
      |
      +--> notebooks/04a, 04b, 04c  train models -> models/*.pkl
      |                                          -> artifacts/<mission>/*.pkl
      |
      +--> backend/load_data_to_db.py  ---->  Neon PostgreSQL (8,245 rows)
```

### The 9,614 vs 8,245 discrepancy — know this cold

You will see both numbers. They are both correct, for different things:

- **9,614** = rows in the processed CSVs (1,937 + 2,742 + 4,935)
- **8,245** = unique planets in the database

The gap is entirely K2. Its 1,937 rows describe only **568 distinct planets** —
the NASA archive stores one row per literature reference, so a well-studied
planet appears many times. `load_data_to_db.py` de-duplicates on `planet_name`,
so 1,369 duplicate K2 rows are skipped.

```
K2      1,937 rows  ->    568 unique
Kepler  2,742 rows  ->  2,742 unique
TESS    4,935 rows  ->  4,935 unique
                        -----------
                          8,245 in the database
```

**Use 9,614 when talking about training data. Use 8,245 when talking about the
website.** The models were trained on the CSV rows, duplicates included.

### Class distribution — and why it dominates everything

| Mission | NON_HABITABLE | HABITABILITY_ZONE | POTENTIALLY_HABITABLE |
|---|---|---|---|
| K2 | 1,876 | 56 | **5** |
| Kepler | 2,574 | 136 | **32** |
| TESS | 4,776 | 149 | **10** |
| **Total** | 9,226 | 341 | **47** |

47 out of 9,614 rows — **0.49%**. In the database, 43 unique planets.

This extreme imbalance is the single most important fact about the machine
learning in this project. It explains the suspiciously high accuracy
([Section 6](#6-the-three-models-and-why-there-are-three)) and it explains why
physics carries 90% of the final score
([Section 7](#7-the-scoring-engine--the-heart-of-the-project)).

### The input features

Nine measurable quantities drive everything:

| Feature | Meaning | Earth | Why it matters |
|---|---|---|---|
| `pl_rade` | Planet radius (Earth radii) | 1.0 | Above ~2 R⊕ a planet is likely gas, not rock |
| `pl_eqt` | Equilibrium temperature (K) | 255 | Proxy for liquid-water range |
| `pl_insol` | Starlight received (Earth flux) | 1.0 | Direct habitable-zone test |
| `pl_orbper` | Orbital period (days) | 365 | Yields orbital distance via Kepler's 3rd law |
| `pl_orbsmax` | Semi-major axis (AU) | 1.0 | Distance from star; derived if missing |
| `pl_orbeccen` | Eccentricity | 0.017 | High values mean extreme seasons |
| `st_teff` | Star temperature (K) | 5778 | Determines star type and HZ location |
| `st_rad` | Star radius (solar radii) | 1.0 | Affects luminosity |
| `st_mass` | Star mass (solar masses) | 1.0 | Needed for Kepler's 3rd law |

**Planet mass (`pl_masse`) is stored but not used as a model feature** — only
about 30% of planets have a measured mass. Mass would give density, and density
would distinguish rock from gas, which would genuinely improve predictions. This
is a data limitation, not a design choice.

### Engineered features

The models expect far more columns than the nine above (Kepler 130, K2 270,
TESS 44). The rest are derived in `_compute_derived_features()`:

| Kind | Examples | Purpose |
|---|---|---|
| Similarity | `radius_similarity`, `temp_similarity`, `insol_similarity` | Pre-computed Earth closeness |
| HZ flags | `in_hz_conservative` (0.25–4.0 S⊕), `in_hz_optimistic` (0.1–10 S⊕) | Binary zone membership |
| Size flags | `is_rocky` (≤2 R⊕), `is_earth_sized` (0.8–1.25), `is_super_earth` | Category shortcuts |
| Log transforms | `pl_orbper_log`, `pl_insol_log` | Compress huge ranges |
| Ratios | `planet_star_radius_ratio`, `orbit_stellar_radii` | Scale-free relationships |

> **This must match the training notebooks exactly.** If a formula here drifts
> from what `notebooks/04*.ipynb` used, the model receives subtly wrong inputs
> and degrades *silently* — no error, just worse answers. Any feature the model
> expects but that cannot be computed is filled with `0.0`.

---
---

# Part 3 — The Machine Learning

## 6. The three models and why there are three

### Why not one model?

Because the three missions do not produce the same columns:

| Mission | Features | Column style |
|---|---|---|
| K2 | 270 | `pl_rade`, `pl_eqt`, … |
| Kepler | 130 | `koi_prad`, `koi_teq`, … |
| TESS | 44 | `pl_rade` + TESS-specific (`st_tmag`) |

A single model would have to use only the columns all three share — throwing away
most of what Kepler and K2 measured. Training per mission keeps each mission's
full feature set and stops one mission's observational bias from dominating.

The cost is real: three models, three scalers, three metadata files to keep in
sync, and a mission-detection step at prediction time.

### Which algorithm, and why

**XGBoost for K2 and Kepler.** Gradient boosting builds trees sequentially, each
correcting the previous one's errors. It handles the mixed-scale, partly-missing,
non-linear feature space well and supports `scale_pos_weight` for imbalance.

**Random Forest for TESS.** With only 44 features and the most rows, the
independent-trees-then-vote approach was less prone to overfitting here, and it
simply scored better in `notebooks/05_model_comparison.ipynb`.

All six models were trained; the best per mission was promoted. The runners-up
are kept in `models/` for comparison.

### The accuracy question — handle this carefully

`models/best_models_summary.csv` reports:

| Mission | Model | Accuracy | Weighted F1 |
|---|---|---|---|
| Kepler | XGBoost | 100% | 1.000 |
| TESS | Random Forest | 100% | 1.000 |
| K2 | XGBoost | 99.2% | 0.991 |

**Do not present these numbers without the caveat.** They are weighted across all
three classes, on data where 95%+ of rows are NON_HABITABLE. A model that
answered "not habitable" every single time would already score about 97% on K2.

`models/model_evaluation_report.csv` shows the per-class picture:

| Mission | Class | Precision | Recall | F1 | Support |
|---|---|---|---|---|---|
| K2 | POTENTIALLY_HABITABLE | 0.00 | 0.00 | **0.00** | 1 |
| K2 | NON_HABITABLE | 0.09 | 1.00 | 0.17 | 11 |
| TESS | POTENTIALLY_HABITABLE | 0.50 | 0.50 | **0.50** | 2 |
| TESS | NON_HABITABLE | 0.63 | 0.40 | 0.49 | 30 |

With 1–2 positive samples in a test split, these numbers are **statistically
meaningless in both directions**. They are not proof the models fail on habitable
planets; they are proof we cannot tell. That honest position is much stronger
than either "100% accurate" or "it's broken".

> Note: the two CSVs disagree on K2's overall figures (99.2% accuracy vs 0.72
> recall). They come from different evaluation runs and were never reconciled.
> Prefer `model_evaluation_report.csv` — it at least breaks results out per class.

**This is precisely why the production score weights physics at 90%.** The
architecture already accounts for the weakness the metrics reveal.

---

## 7. The scoring engine — the heart of the project

Everything lives in `calculate_habitability_score()` inside
`backend/api/habitability_scorer.py`. If you understand this function you
understand the project.

### The formula

```
habitability_score = 0.10 × ml_score + 0.90 × physics_score
```

That is the whole thing. Ten percent machine learning, ninety percent physics.

> **If you have read older documentation claiming `0.40 ML + 0.30 ESI +
> 0.20 HZ + 0.10 stellar`, that formula was never in the code.** It has been
> corrected here, in the README, and in the chatbot's system prompt. If you find
> it anywhere else, it is wrong.

### Why physics dominates

The models were trained on data where under 1% of planets are habitable. Left to
itself, a classifier trained on that distribution pushes nearly everything toward
NON_HABITABLE — the safest bet for accuracy is always "no". Anchoring 90% of the
score to physics keeps the output meaningful for the Earth-like inputs users
actually care about.

The honest framing: **the ML models are the weakest link, so they were given the
smallest vote.** Say that in a viva and you demonstrate real understanding.

### Component 1 — the ML score (10%)

Three class probabilities collapsed into one number:

```python
ml_score = P(POTENTIALLY_HABITABLE) * 1.0
         + P(HABITABILITY_ZONE)     * 0.5
         + P(NON_HABITABLE)         * 0.0
```

> **A subtle, critical detail.** scikit-learn and XGBoost order classes
> **alphabetically**, so `predict_proba` returns
> `[HABITABILITY_ZONE, NON_HABITABLE, POTENTIALLY_HABITABLE]`. Index 1 is
> NON_HABITABLE, not index 2. Get this wrong and every score silently inverts.
> The code comments this explicitly.

If the model fails to load or predict, it falls back to
`(prob_hz=0.15, prob_non_hab=0.80, prob_pot_hab=0.05)` and physics carries the
result. **The API still returns 200 with a plausible-looking score** — it does
not tell the user the model was skipped. Worth knowing.

### Component 2 — the physics score (90%)

```python
physics_score = (temp_sim * radius_sim * insol_sim) ** (1/3)   # geometric mean
                * (0.4 + 0.6 * in_hz)          # habitable-zone membership
                * (0.7 + 0.3 * hz_proximity)   # orbital distance closeness
                * stellar_factor               # host star quality
```

Each of the four terms, in turn:

**a. The similarity core** — three linear distance penalties, each clamped to [0, 1]:

```python
temp_sim   = 1 - abs(pl_eqt   - 255.0) / 500.0
radius_sim = 1 - abs(pl_rade  - 1.0)   / 10.0
insol_sim  = 1 - abs(pl_insol - 1.0)   / 10.0
```

They are combined as a **geometric mean, not an average**. That choice matters: a
planet at 3,000 K with a perfect radius and perfect flux would still average
respectably, but the geometric mean drags the whole product down. One
disqualifying property should disqualify the planet, and a geometric mean
enforces that.

**b. Habitable-zone membership** (`0.4 + 0.6 × in_hz`) — from insolation against
the conservative zone of 0.25–1.67 S⊕. Inside gives 1.0; below 0.25 falls off
linearly; above 1.67 falls off faster (being too hot is worse than being too
cold, since a greenhouse effect can rescue a cold planet but nothing rescues a
boiled one). Ranges from 0.4 to 1.0, so it can penalise heavily but never zero
the score alone.

**c. Orbital proximity** (`0.7 + 0.3 × hz_proximity`) — from orbital distance
against the star-type-specific boundaries in [Section 4](#4-what-habitable-means-here).
Only a 30% modulator. Its real job is to make **orbital period actually matter**:
if `pl_orbsmax` is missing it is derived from `pl_orbper` via Kepler's third law,
`a³ = M × P²`.

**d. Stellar factor** — a direct multiplier from `get_stellar_type_factor()`:

| Type | Factor | Reasoning |
|---|---|---|
| G (Sun-like) | 1.00 | The reference. Stable, ~10 Gyr lifetime |
| K (orange) | 0.95 | Arguably superhabitable — longer-lived, less UV |
| F (yellow-white) | 0.85 | More UV, ~3 Gyr lifetime |
| M (red dwarf) | 0.70 | Flares and probable tidal locking |
| A | 0.60 | Hot, short-lived |
| B | 0.30 | Very hot |
| O | 0.10 | Extremely hot, lives only a few Myr |

M-dwarfs at 0.7 reflects *statistical risk*, not impossibility — Proxima
Centauri b orbits an M-dwarf and is among the most studied candidates anywhere.

### Classification thresholds

The final score maps to a label:

| Score | Class |
|---|---|
| ≥ 0.66 | POTENTIALLY_HABITABLE |
| 0.30 – 0.65 | HABITABILITY_ZONE |
| < 0.30 | NON_HABITABLE |

> Older docs listed `0.7 / 0.4` and `0.65 / 0.35`. Both were wrong. The values
> above are what `habitability_scorer.py` uses.

### What it actually outputs — measured

Run against the current models, these are the real results:

| Planet | Inputs | Score | Class |
|---|---|---|---|
| Earth | 1.0 R⊕, 255 K, 1.0 S⊕ | **0.96** | POTENTIALLY_HABITABLE |
| Mars | 0.53 R⊕, 210 K, 0.43 S⊕ | **0.92** | POTENTIALLY_HABITABLE |
| Venus | 0.95 R⊕, 232 K, 1.91 S⊕ | **0.74** | POTENTIALLY_HABITABLE |
| Mercury | 0.38 R⊕, 440 K, 6.67 S⊕ | **0.19** | NON_HABITABLE |
| Neptune | 3.88 R⊕, 48 K, 0.001 S⊕ | **0.20** | NON_HABITABLE |
| Hot Jupiter | 11 R⊕, 1200 K, 1000 S⊕ | **0.00** | NON_HABITABLE |

**Mars and Venus both score as potentially habitable. This is not a bug** — and
you should be ready to explain why, because it looks like one. See
[Section 13](#13-what-this-system-cannot-do).

### Confidence — read the fine print

The `confidence` field is **not** a confidence in the score. It is the ML model's
probability for whichever class the *blended* score landed in. Since the blended
score is 90% physics, the two can disagree badly: physics may say
POTENTIALLY_HABITABLE while the model gave that class only 5%, and the response
then reports 5% confidence next to a 0.96 score. Treat it as "how much the ML
model agrees", not "how sure the system is".

---

## 8. Explainability: SHAP, LIME and the fallback

`POST /api/explain/` returns a normal prediction plus a ranked list of which
features drove it. Implemented in `explain_single()` in `ai_service.py`.

### The three-tier cascade

1. **SHAP** (`TreeExplainer`) — game-theoretic feature attribution, exact for
   tree models. Preferred, and **verified working** in this environment
   (SHAP 0.50.0).
2. **LIME** — used only if SHAP is unavailable or throws. Perturbs the input and
   fits a simple local model around it.
3. **Physics fallback** — if both fail, a hand-written explanation derived from
   the physics factors. Never a model attribution, but always something.

Both SHAP and LIME are **lazily imported** with `BaseException` catches. They are
heavy and historically unstable, and a failed import must not take down the API.
The response always names which tier was used in `explanation_method`.

Raw feature names are mapped to readable labels (`pl_rade` → "Planet Radius")
and filtered to a human-relevant subset, so users never see 270 raw columns.

### Interpreting the output

For an Earth-like input the top SHAP features are typically Temperature
Similarity, Flux Similarity and Orbit in Stellar Radii — reassuring, because
those are exactly the properties that should matter. If radius or star mass ever
dominated for an Earth-like planet, something would be wrong.

> **A caveat worth stating.** SHAP explains the **ML model's** decision, which is
> only 10% of the final score. It does not explain the physics term that
> actually drove 90% of the number. The `contributing_factors` block in the
> response is what breaks down the physics side.

---
---

# Part 4 — The Code, File by File

## 9. Repository map

```
FYP/
├── data/            raw NASA CSVs + processed train/val/test splits
├── notebooks/       7 Jupyter notebooks: cleaning, training, comparison
├── models/          6 trained .pkl classifiers + evaluation CSVs
├── artifacts/       per-mission scalers, encoders, feature metadata
├── backend/         Django REST API
├── frontend/        React + Vite client
├── tests/           pytest suite
├── docs/            FYP report drafts (.docx)
├── requirements.txt Python dependencies
├── Procfile         Railway start command
└── vercel.json      Vercel SPA rewrite
```

**`models/` vs `artifacts/` — do not mix these up.**
`models/` holds the trained classifiers. `artifacts/` holds the preprocessing
objects (MinMax scaler, label encoder, feature metadata). A model without its
matching scaler produces *silently wrong* predictions, not an error.

---

## 10. Backend, file by file

### `backend/backend/` — project configuration

**`settings.py`** — everything configurable.

- Database resolution, in order: `DATABASE_URL` → discrete `DB_*` fields →
  SQLite fallback at `backend/db.sqlite3`.
  *Limit:* the SQLite fallback is silent. On an ephemeral host you get a working
  app whose data vanishes on restart, with no warning.
- `SECRET_KEY` is mandatory when `DEBUG=false` — raises `ImproperlyConfigured`
  rather than falling back to an insecure default. Good.
- Security when `DEBUG=false`: SSL redirect, HSTS (1 year, preload), secure
  cookies, `X_FRAME_OPTIONS=DENY`, nosniff, referrer policy.
- CORS is origin-scoped; `CORS_ALLOW_ALL_ORIGINS = False`.
- Throttling: 200/hour anonymous, 1000/hour authenticated.
- JWT: access token **1 hour**, refresh **7 days**, rotation off.
- `MODELS_DIR`, `ARTIFACTS_DIR`, `DATA_DIR` point at the project root.

**`urls.py`** — root router. Maps `/api/` → predictions, `/api/planets/` →
planets, `/api/auth/` → users, `/api/chatbot/` → chatbot, plus `/api/missions/`
and an info page at `/`.

**`middleware.py`** — 13 lines. Adds a Content-Security-Policy header to HTML
responses only. *Limit:* JSON responses get no CSP, which is fine since they are
not rendered as documents.

**`wsgi.py` / `asgi.py`** — standard entry points. Gunicorn uses `wsgi.py`.

---

### `backend/api/` — the scoring engine

> **Important structural quirk:** `api` is **not** in `INSTALLED_APPS` and its
> URLs are not routed. It survives purely as an import path —
> `ai_service.py` does `from api.habitability_scorer import HabitabilityScorer`.
> Its `views.py`, `models.py`, `urls.py`, `serializers.py` and `admin.py` are
> **dead code**, superseded by the `predictions` app. Do not add routes here.

**`habitability_scorer.py`** (~815 lines) — the most important file in the
project. The `HabitabilityScorer` class:

| Method | Purpose |
|---|---|
| `_load_models()` | Loads 3 models + 3 scalers + 3 metadata files at construction |
| `_get_stellar_type_from_teff()` | Temperature → spectral class (O/B/A/F/G/K/M) |
| `_derive_orbsmax()` | Kepler's 3rd law: orbital period → semi-major axis |
| `_compute_derived_features()` | Builds the engineered features the models expect |
| `calculate_esi_*()` | The three ESI components |
| `calculate_hz_proximity()` | Distance-to-habitable-zone score |
| `get_stellar_type_factor()` | Star-quality multiplier |
| `preprocess_features()` | Assembles + scales the full feature vector |
| `predict_habitability()` | **The main entry point** — the blend from Section 7 |
| `explain_prediction()` | Human-readable text summary |
| `batch_predict()` | Loops `predict_habitability` over a DataFrame |

*Limits:*
- Model load failures are caught and **printed, not raised**. A missing `.pkl`
  yields a scorer that silently uses fallback probabilities.
- Any expected feature that cannot be computed becomes `0.0`. After MinMax
  scaling, `0.0` is not neutral — it is the *minimum* of the training range.
  Sparse inputs therefore bias predictions in a direction nobody chose.
- `batch_predict()` mutates the DataFrame passed to it.
- The module docstring still says `from habitability_scorer import ...`; the real
  path is `from api.habitability_scorer import ...`.

---

### `backend/planets/` — planet data

**`models.py`** — two Django models.

`Mission`: name, full name, description, launch/end dates, `total_planets`.
Explicit `db_table = 'missions'`.

`Exoplanet`: the main table. FK to Mission, `planet_name` (unique, indexed), the
planet and stellar parameters, `habitability_class`, boolean flags,
`esi_overall`, `discovery_year`. Explicit `db_table = 'exoplanets'`.

> **The real table names are `exoplanets` and `missions`**, not
> `planets_exoplanet` / `planets_mission`. The models override Django's default
> naming with `db_table`. Earlier documentation got this wrong.

*Limit:* nearly every numeric field is nullable, because real survey data has
gaps. Every consumer must handle `None`.

**`views.py`** — seven function-based endpoints: `planet_list` (filters +
pagination), `planet_detail`, `habitable_planets`, `planet_stats`,
`mission_list`, `search_planets`, `compare_planets` (max 10).

*Limits:*
- `planet_list` calls `float()` on filter parameters with **no try/except** — a
  malformed `?min_radius=abc` raises `ValueError` and returns a 500 rather than
  a 400.
- `search_planets` returns at most 50 results with no pagination.
- Search is `icontains` on name only — no fuzzy matching, no searching by
  parameter.

**`serializers.py`** — `ExoplanetListSerializer` (lightweight, for grids),
`ExoplanetDetailSerializer` (`fields = '__all__'`), `MissionSerializer`, plus two
that are defined but unused for output shaping.

---

### `backend/predictions/` — the prediction API

**`ai_service.py`** (~550 lines) — the service layer between views and the
scorer.

- Holds the scorer as a **module-level singleton** (`_scorer`), so the `.pkl`
  files load once per process, not once per request. The first request after a
  restart is therefore noticeably slower.
- Lazily imports SHAP and LIME behind `BaseException` guards.
- `predict_single()`, `predict_batch()`, `explain_single()`,
  `get_models_info()`, `is_service_available()`.
- Maps raw feature names to readable labels for the UI.

**`views.py`** — `api_root`, `predict`, `batch_predict`, `explain_prediction`,
`models_info`, `health_check`. Each checks `is_service_available()` first and
returns 503 if models are missing.

**`serializers.py`** — `PlanetParametersSerializer` validates every input as
optional but requires at least one of `pl_rade`, `pl_eqt`, `pl_insol`, `st_teff`.
`BatchPredictionSerializer` caps a batch at **100 planets**.

**`models.py`** — `PredictionHistory` and `SimulationHistory`.

> **Both are completely unused.** Their tables exist in the database and are
> **empty (0 rows)**; no view, serializer or script references them. Saved
> predictions actually live in `users.SavedPrediction`. If the roadmap or a
> report claims "prediction history" as a delivered feature, that claim needs
> qualifying — the models exist, the feature does not.

---

### `backend/users/` — auth and saved predictions

**`models.py`** — `UserProfile` (OneToOne with Django's `User`, stores a base64
profile image in a `TextField`) and `SavedPrediction` (FK to user, `name`,
`inputs` JSON, `outputs` JSON, `created_at`).

*Limit:* base64 images in a text column bloat every profile query. Fine at 8
users; not a pattern to scale.

**`views.py`** — `register`, `login`, `me`, `logout`, `saved_predictions`
(GET/POST), `delete_saved_prediction`. Login accepts username **or** email:
it tries `authenticate()` directly, then falls back to an email lookup.

> **`logout` does not actually log anyone out.** It calls `token.blacklist()`,
> but `rest_framework_simplejwt.token_blacklist` is **not** in `INSTALLED_APPS`,
> so the call raises and is swallowed by a bare `except`. The endpoint always
> returns 200 and the client simply discards its own tokens. An
> already-issued refresh token stays valid for its full 7 days. To fix properly:
> add the blacklist app and run its migrations.

---

### `backend/chatbot/` — ARIA

**`views.py`** — one endpoint. `GET` reports Groq connectivity; `POST` sends a
message. Tries four model names in order (`llama-3.3-70b-versatile` first) and
four environment-variable aliases for the key.

> **ARIA has no database access.** All its knowledge is a static `SYSTEM_PROMPT`
> string. It cannot look up a planet — it can only discuss what was written into
> its prompt. The dataset figures in that prompt are hard-coded and must be
> updated by hand when the data changes. (They previously stated the wrong
> scoring formula and planet counts; both are now corrected.)

Without an API key the endpoint reports unavailable and the widget shows a setup
hint rather than erroring.

---

### `backend/` — scripts

**`load_data_to_db.py`** — creates the three missions, then loads each processed
CSV. Idempotent: skips any planet whose name already exists.

Name resolution differs per mission, because the datasets do not share a column:

| Mission | Column used | Example |
|---|---|---|
| K2 | `pl_name` | `BD+20 594 b` |
| Kepler | `kepler_name` → `kepoi_name` | `Kepler-227 b` |
| TESS | `toi` → `tid`, prefixed | `TOI-1001.01` |

*Limit:* row-by-row `.exists()` checks make a full load slow (thousands of
queries). Fine as a one-off.

**`backfill_planet_names.py`** — repairs a database loaded before that per-mission
mapping existed, where 7,677 of 8,245 planets were named `Kepler_planet_0` style
placeholders. Dry-run by default; `--apply` commits in one transaction using
batched `bulk_update`. Already applied — the database now has 8,245 distinct real
names.

**`test_backend_api.py`** — a script (not pytest) that hits a running server.

---

## 11. Frontend, file by file

### Entry and routing

**`main.jsx`** — mounts `<App />`.

**`App.jsx`** — the whole routing table in one `<Routes>` block, wrapped in
`AuthProvider`. `ScrollToTop` and `Chatbot` sit **outside** the switch so they
persist across navigation.

| Path | Component |
|---|---|
| `/` | Home |
| `/explore` | ExplorePlanets |
| `/planets/:id` | PlanetDetail |
| `/compare` | ComparePlanets |
| `/learn` | Concepts |
| `/upload` | Upload |
| `/about` | About |
| `/login`, `/signin` | Login, SignIn |
| `*` | NotFound |

---

### `services/api.js` — every network call

One configured axios instance with two interceptors:

- **Request:** reads `auth_token` from `localStorage`, sets the `Bearer` header.
- **Response:** on 401, clears stored credentials but deliberately does **not**
  hard-redirect, so the UI can degrade gracefully.

> `apiClient` is a *separate* axios instance, so `axios.defaults` set elsewhere
> (as `AuthContext` does) do **not** apply to it. This is why the token is read
> from `localStorage` on every request. The file comments this explicitly.

`API_BASE` is `VITE_API_URL` or the relative `/api`, with the trailing slash
normalised.

---

### `context/AuthContext.jsx`

The only shared state in the app. Exposes `user`, `token`, `isLoggedIn`,
`loading`, `login()`, `logout()`, `updateUser()`. Restores the session from
`localStorage` on mount.

*Limits:*
- JWTs in `localStorage` are readable by any XSS on the page. `httpOnly` cookies
  would be safer; this is the common React tradeoff, worth acknowledging rather
  than defending.
- **No token refresh anywhere.** The refresh token is stored but never used. When
  the 1-hour access token expires the user is simply logged out.

---

### Pages

| File | Lines | Purpose and notes |
|---|---|---|
| `Home.jsx` | 467 | Landing page — hero, live stats from `/planets/stats/` |
| `ExplorePlanets.jsx` | 111 | **Deliberately thin.** Owns filter/search state and composes the children. Put feature logic in the child, not here |
| `PlanetDetail.jsx` | 671 | One planet + a **live** prediction, so it can disagree with the stored badge |
| `ComparePlanets.jsx` | 575 | Up to 4 planets, data table + Chart.js radar and bar charts |
| `Concepts.jsx` | 539 | The `/learn` page — static educational content |
| `Upload.jsx` | 463 | CSV batch prediction. Validates client-side: `.csv` only, <5 MB, ≥1 row; backend caps at 100 planets |
| `About.jsx` | 518 | Project and academic context; 3D hero cube |
| `login.jsx` / `signin.jsx` | 233 / 309 | Auth screens. Lowercase filenames — see below |
| `NotFound.jsx` | 111 | 404 |
| `ComingSoon.jsx` | 37 | Placeholder, **not bound to any route** |

> **Filename casing hazard.** `login.jsx` and `signin.jsx` are lowercase while
> every other page is PascalCase. Windows is case-insensitive, Linux (and Vercel)
> is not. Renaming needs a two-step `git mv` or the deploy build breaks.

---

### Components

**3D (React Three Fiber)**

| File | Lines | Notes |
|---|---|---|
| `ExoplanetViewer3D.jsx` | 1,235 | The main viewer. Largest file in the codebase |
| `SolarSystemViewer.jsx` | 1,244 | Solar System scene, **opened from inside** the 3D viewer modal, not a route |
| `AboutHeroCube.jsx` | 142 | Rotating cube on About |

`ExoplanetViewer3D` internals:

```
ExoplanetViewer3D              state, fetching, modal control
├── PreviewScene               4 demo planets, auto-rotating
└── Fullscreen modal
    ├── Header controls        Labels · HZ Ring · Top View · Surface · Rotate · Reset
    ├── StatsBar               counts per habitability class
    └── OrbitalScene           real API data
        ├── CentralStar        colour by temperature + habitable-zone ring
        ├── Stars              drei starfield, 12,000 points
        ├── OrbitPath × N      256 points per orbit
        └── OrbitalPlanet × N  textures, gas-giant rings, labels
```

Behaviour to know before editing:
- **Capped at 28 planets** for 60 fps, sorted POTENTIALLY_HABITABLE →
  HABITABILITY_ZONE → NON_HABITABLE.
- Refetches **when the modal opens**. Changing a filter with the modal already
  open does not live-update it — close and reopen.
- It is a *comparative* view: planets from different star systems are drawn
  around one synthetic star whose colour and HZ come from the mean `st_teff` of
  whatever is on screen. **It is not a real star system.** Say this before
  anyone asks.
- Textures by temperature: frozen <180 K, ice <250 K, lava >900 K, gas giant
  >3.5 R⊕, else Earth-like.
- Auto-rotate and manual drag conflict; an `interactingRef` flag on
  `OrbitControls` `onStart`/`onEnd` suppresses auto-rotate mid-drag. Preserve it.

**Other components**

| File | Purpose |
|---|---|
| `PredictionPanel.jsx` (817) | The prediction studio — 7 sliders, **8 solar-system presets**, live score, factor breakdown, SHAP explanation, save-to-account |
| `PlanetGrid.jsx` (216) | Paginated cards, 12 per page, "Load More" |
| `PlanetCard.jsx` (189) | One planet summary |
| `SearchBar.jsx` (199) | Debounced typeahead |
| `FiltersPanel.jsx` (291) | Mission, class, radius/temp ranges, `hide_incomplete` |
| `Navbar.jsx` (289) | Navigation, auth state, avatar menu |
| `Footer.jsx` (250) | Links and credits |
| `ScrollToTop.jsx` (31) | Scroll reset on route change; renders nothing |
| `Chatbot.jsx` (448) | ARIA widget; probes `/api/chatbot/` on mount |

The presets are Earth, Venus, Mars, Mercury, Jupiter, Saturn, Uranus and Neptune.
The Venus preset carries an on-screen disclaimer explaining that it uses
equilibrium temperature (232 K), not the 737 K surface — exactly the limitation
described in [Section 13](#13-what-this-system-cannot-do).

---

### `utils/` — currently dead code

| File | Lines | Status |
|---|---|---|
| `helpers.js` | 271 | ~19 formatting/validation helpers — **imported nowhere** |
| `mockData.js` | 500 | Offline sample data — **imported nowhere** |

Both are leftovers from early development; components inline their own
formatting instead. They are harmless but they are 771 lines of code that will
mislead a reader into thinking they are load-bearing. Either wire `helpers.js`
up or delete both.

---
---

# Part 5 — Reality Checks

## 12. A prediction, traced end to end

A user drags the sliders to Earth values and clicks Predict.

**1. Browser** — `PredictionPanel.jsx` calls `predictHabitability(params)`:

```json
{ "pl_rade": 1.0, "pl_eqt": 255, "pl_insol": 1.0, "pl_orbper": 365,
  "st_teff": 5778, "st_rad": 1.0, "st_mass": 1.0 }
```

**2. axios** — `services/api.js` POSTs to `/api/predict/`, attaching a Bearer
token if one exists. Vite proxies to `localhost:8000`.

**3. Django routing** — `backend/urls.py` → `predictions/urls.py` → `predict()`.

**4. Guard** — `is_service_available()`; 503 if the models are not loaded.

**5. Validation** — `PlanetParametersSerializer` checks types and ranges and
requires at least one key parameter.

**6. Service** — `ai_service.predict_single()` gets the singleton scorer.

**7. Mission detection** — `get_mission_from_features()` counts overlap between
the supplied keys and each mission's feature list. For this standard `pl_*` set
it selects **K2**.

**8. Feature engineering** — `_compute_derived_features()` builds the similarity
terms, HZ flags, size flags, log transforms and ratios; anything still missing
becomes `0.0`. The result is ordered to match `metadata['feature_names']`
exactly.

**9. Scaling** — the mission's MinMax scaler transforms the vector. Column order
is the contract; a mismatch here corrupts everything downstream silently.

**10. ML prediction** — `predict_proba` returns probabilities in alphabetical
class order. `ml_score = 0.583`.

**11. Physics** — similarity terms ≈ 1.0 each; inside the HZ; good orbital
proximity; G-type star factor 1.0. `physics_score = 1.0`.

**12. Blend** — `0.10 × 0.583 + 0.90 × 1.0 = 0.958`.

**13. Classify** — `0.958 ≥ 0.66` → **POTENTIALLY_HABITABLE**.

**14. Response** — score, classification, confidence, the three probabilities,
ESI components, and the full `contributing_factors` breakdown.

**15. Render** — the panel animates the score, colours it green, and lists the
factors. A logged-in user can name and save it to `users_savedprediction`.

---

## 13. What this system cannot do

Be upfront about all of this. Every item is a consequence of the input data, not
of poor engineering — and saying so clearly is far more convincing than hoping
nobody asks.

### It cannot tell Earth from Venus or Mars

The demonstration, measured on the current models:

| Planet | Score | Class |
|---|---|---|
| Earth | 0.96 | POTENTIALLY_HABITABLE |
| Mars | 0.92 | POTENTIALLY_HABITABLE |
| Venus | 0.74 | POTENTIALLY_HABITABLE |

Mars is a frozen desert with a near-vacuum atmosphere. Venus's surface is 737 K
and rains sulphuric acid. Both score as potentially habitable.

**Why:** the scorer sees equilibrium temperature. Venus's equilibrium temperature
is 232 K — perfectly reasonable. Its actual 737 K surface comes from a runaway
greenhouse effect that transit photometry cannot detect. Feed the scorer Venus's
*real* surface temperature of 737 K and it correctly returns **0.27,
NON_HABITABLE** — the model is right, it is just never given that number,
because for a real exoplanet nobody has it.

This is the honest headline: **the system separates "physically plausible" from
"obviously hostile". It cannot separate Earth from Venus, because the input data
cannot either.**

### It cannot detect atmospheres, oxygen, or biosignatures

Transit photometry measures how much starlight a planet blocks. Atmospheric
composition needs transmission spectroscopy — JWST-class instruments. Fewer than
50 exoplanets have any atmospheric characterisation at all; this dataset has zero
atmospheric columns.

### It cannot detect life

No dataset of orbital and radius measurements can. The system scores conditions
that are *compatible* with life as we know it.

### It cannot assess geology, magnetic fields, or tidal locking

A magnetic field protects an atmosphere from stellar wind; plate tectonics
regulate long-term climate. Both matter enormously for real habitability. Neither
is in any exoplanet catalogue.

### It cannot confirm water

Being in the habitable zone means water *could* be liquid **if** water is present
**and** there is enough atmospheric pressure. Neither is known.

### Further caveats

- **TESS candidates are not all real planets.** "TOI" means TESS Object of
  Interest — some are eclipsing binaries mimicking transits. Some training rows
  may not be planets.
- **Single-epoch data.** Measurements carry uncertainties; models were trained on
  central values only, never on error bars.
- **Missing data is not neutral.** Absent features become `0.0`, which after
  MinMax scaling means the *minimum* of the training range, not "unknown".
  Sparse planets are pushed toward NON_HABITABLE by construction.

### How the design mitigates this

1. Physics carries 90% of the score, reducing dependence on the weakest models.
2. Three mission-specific models prevent one mission's bias dominating.
3. SHAP/LIME expose which features drove each result.
4. The UI surfaces the factor breakdown rather than a bare number.
5. The Venus preset ships with an explicit on-screen disclaimer.

---

## 14. Known problems and rough edges

An honest list. Nothing here is hidden.

### Deployment

**The Railway backend is not running.** `exoplanet-production-d030.up.railway.app`
returns `404 Application not found`. The Vercel frontend responds but has no API
behind it, so the deployed site cannot load planets or predict. Everything works
locally against Neon. Redeploy the backend, then update `VITE_API_URL` in Vercel
and add the new origin to `CORS_ALLOWED_ORIGINS` / `CSRF_TRUSTED_ORIGINS`.

### Dependency drift

`requirements.txt` and the working environment disagree substantially:

| Package | Pinned | Installed |
|---|---|---|
| Python | 3.11.7 (`runtime.txt`) | 3.13.1 |
| Django | 5.0.1 | **6.0** |
| DRF | 3.14.0 | 3.16.1 |
| XGBoost | 2.0.3 | **3.1.2** |
| scikit-learn | 1.8.0 | 1.7.2 |
| SHAP | 0.44.1 | 0.50.0 |
| numpy | 1.26.4 | 2.3.5 |

The `.pkl` models were produced by the **installed** versions, and pickled
estimators are not guaranteed to load across major library versions. A clean
`pip install -r requirements.txt` might not be able to load them. Everything in
this guide was verified against the installed versions. Before trusting the pins
for a deploy, install them into a fresh virtualenv and run `pytest`.

### Code

| Issue | Detail |
|---|---|
| `PredictionHistory` / `SimulationHistory` | Models and tables exist, 0 rows, referenced nowhere |
| `backend/api/` views and URLs | Dead code; the app is not installed, only imported from |
| `utils/helpers.js`, `utils/mockData.js` | 771 lines, imported nowhere |
| `/api/auth/logout/` | Cannot revoke tokens; blacklist app not installed |
| No token refresh | Refresh token stored but never used; users drop at 1 hour |
| `planet_list` filter parsing | Bad numeric query param raises `ValueError` → 500 instead of 400 |
| Silent ML fallback | If a model fails, the API returns a normal-looking score with no warning |
| Bundle size | One ~1.87 MB JS chunk (~547 kB gzipped); `React.lazy` around the 3D viewers is the fix |
| ESLint | 46 pre-existing problems (mostly unused imports) |
| `login.jsx` / `signin.jsx` | Lowercase filenames; case-sensitivity hazard on Linux builds |
| `backend/db.sqlite3` | 2.6 MB dev database committed to git |

### Test coverage

`pytest` passes 12/12, but be precise about what it covers. Despite its name,
`tests/test_habitability_scorer.py` **does not test `HabitabilityScorer` at
all** — it tests the raw pickled classifiers: that they load, that probabilities
sum to 1, that a known habitable sample and a hot Jupiter classify correctly, and
that Kepler's accuracy is ≥85%. The other two missions are only checked for
loadability.

**The entire hybrid scoring layer — the blend, the thresholds, the ESI maths —
has no automated tests.** Change a weight and nothing fails.

---

## 15. Questions you should be ready for

**"Your models report 100% accuracy. Isn't that overfitting?"**
The figures are weighted across three classes on data that is over 95%
NON_HABITABLE — always answering "not habitable" would already score about 97%.
The per-class report tells the real story: F1 for the habitable class is 0.00 on
K2 and 0.50 on TESS, on test splits containing 1–2 positive samples. Those
numbers are statistically meaningless in either direction. That weakness is
exactly why the production score weights the ML output at only 10%.

**"Why is machine learning only 10% of the score?"**
Because it is the least trustworthy component. Trained on a distribution where
under 1% of planets are habitable, the classifier's safest strategy is to reject
everything. Physics-based similarity is calibrated and interpretable, so it
carries the decision and ML contributes a supporting signal.

**"Then why use ML at all?"**
It captures multi-feature interactions no hand-written formula encodes, it
supplies the class probabilities that SHAP explains, and the comparison between
the ML and physics terms is itself diagnostic — large disagreements flag unusual
planets.

**"Your system says Mars and Venus are potentially habitable."**
Correct, and it is the clearest illustration of the project's central limitation.
Both are scored on *equilibrium* temperature, which ignores atmospheres. Venus's
equilibrium temperature is a reasonable 232 K; its 737 K surface comes from a
greenhouse effect that transit photometry cannot measure. Give the scorer 737 K
and it returns 0.27, NON_HABITABLE. The system correctly identifies *physical
plausibility*; distinguishing Earth from Venus requires spectroscopy the data
does not contain.

**"Why 8,245 planets when your report says 9,614?"**
9,614 is the processed CSV row count and the training-set size. 8,245 is unique
planets in the database. The NASA archive stores one row per literature
reference, so K2's 1,937 rows describe only 568 distinct planets; the loader
de-duplicates on name.

**"Why three models instead of one?"**
The missions do not share a feature space — K2 gives 270 usable features, Kepler
130, TESS 44. A single model could only use the intersection, discarding most of
what Kepler and K2 measured.

**"What happens when data is missing?"**
Missing features default to `0.0`. Be honest that this is a real weakness: after
MinMax scaling, `0.0` is the minimum of the training range, not a neutral value,
so sparse planets are biased toward NON_HABITABLE. Semi-major axis is a better
case — it is properly derived from orbital period via Kepler's third law rather
than defaulted.

**"Is this deployed?"**
The frontend is live on Vercel and the database on Neon, but the Railway backend
is currently down, so the public site cannot fetch data. The full stack runs
correctly locally. (Fix this before a demo, or demo locally.)

**"What would you do next?"**
Redeploy the backend and reconcile `requirements.txt` with the environment the
models were trained in. Add tests for the scoring layer, which has none. Use
planetary mass where available to derive density and separate rock from gas.
Remove the dead code. Longer term, incorporate JWST atmospheric data as it
becomes available — that is the only path to distinguishing Earth from Venus.

---

## Appendix: where to verify each claim

| Claim | Verify in |
|---|---|
| Scoring formula and thresholds | `backend/api/habitability_scorer.py`, `calculate_habitability_score()` |
| ESI formulas | Same file, `calculate_esi_radius/temperature/flux()` |
| HZ boundaries, stellar factors | Same file, `hz_boundaries`, `get_stellar_type_factor()` |
| Planet counts | `SELECT COUNT(*) FROM exoplanets;` → 8,245 |
| Class distribution | `artifacts/<mission>/<mission>_habitability_metadata.pkl` → `class_distribution` |
| Model metrics | `models/best_models_summary.csv`, `models/model_evaluation_report.csv` |
| API routes | `backend/backend/urls.py` and each app's `urls.py` |
| JWT lifetimes | `backend/backend/settings.py`, `SIMPLE_JWT` |
| Frontend routes | `frontend/src/App.jsx` |
| Batch limit (100) | `backend/predictions/serializers.py` |
| Upload limits (5 MB) | `frontend/src/pages/Upload.jsx` |
