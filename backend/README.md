# Backend — Django REST API

Django 5 + Django REST Framework service backing the Exoplanet Habitability
Explorer. Serves planet data from Neon PostgreSQL, runs the mission-specific ML
classifiers, handles JWT auth and saved predictions, and proxies the ARIA
chatbot to Groq.

Full setup instructions, the environment-variable table and the complete API
reference live in the [root README](../README.md). This file covers the
internals.

---

## App layout

| App | Responsibility |
|---|---|
| `planets/` | `Mission` + `Exoplanet` models; list, detail, search, compare, stats endpoints |
| `predictions/` | `/predict/`, `/predict/batch/`, `/explain/`, `/models/info/`, `/models/report/`, `/health/`; `ai_service.py` holds the ML service layer. Defines **no** database models |
| `users/` | Register, login, me, logout; `SavedPrediction` CRUD |
| `chatbot/` | ARIA — proxies to the Groq Cloud API |
| `api/` | `physics.py`, `scoring.py`, `habitability_scorer.py` — the scoring core. Not an installed Django app |
| `backend/` | Settings, root URL conf, CSP middleware |

### A note on the `api` app

`api` is **not** in `INSTALLED_APPS` — it holds no Django models and needs no
migrations. It is a plain Python package holding the scoring core:

| Module | Responsibility |
|---|---|
| `physics.py` | Canonical schema, physics derivations, the 25-feature vector, and `LABEL_RULE` |
| `scoring.py` | The deterministic physics score, ESI, habitable-zone membership |
| `habitability_scorer.py` | Loads the models, blends classifier with physics |

**`physics.py` is imported by both `scripts/train_models.py` and the serving
path.** That shared import is what makes train/serve feature skew structurally
impossible: change a formula and training and inference change together. The
scorer additionally refuses to load any model whose stored feature list
disagrees with `FEATURE_ORDER`, so a stale artefact fails loudly at startup.

Add new HTTP endpoints to `predictions/`, never here.

---

## Request path for a prediction

```
POST /api/predict/
  → predictions/views.py::predict
      → predictions/ai_service.py  (singleton, loads models once per process)
          → api/habitability_scorer.py::predict_habitability
              ├── api/physics.py::build_features   25 features, always complete
              ├── model .pkl                       from  models/       (default: unified)
              ├── scaler + encoder .pkl            from  artifacts/<name>/
              └── api/scoring.py::physics_score    closed-form, in-process
  → JSON: habitability_score, classification, confidence, ESI, factor breakdown,
          score_thresholds, resolved_parameters, derived_parameters
```

The scorer blends `0.60 × ML + 0.40 × physics`. That weight and the two class
thresholds are **calibrated** by `scripts/calibrate_blend.py` and loaded from
`models/reports/blend_calibration.json` — see
[PROJECT_UNDERSTANDING_GUIDE.md](../PROJECT_UNDERSTANDING_GUIDE.md#7-habitability-scoring-system).

Models load lazily on first request and stay resident, so the first prediction
after a restart is noticeably slower than the rest.

---

## Database

Resolution order in `settings.py`:

1. `DATABASE_URL` — full connection string, used in production
2. `DB_PASSWORD` set — discrete `DB_*` Neon fields
3. Neither — SQLite at `backend/db.sqlite3`

The SQLite fallback is a development convenience. On an ephemeral host it means
data silently disappears on restart, so always set one of the first two in
production.

### Loading planet data

```bash
python load_data_to_db.py --dry-run    # report what would change
python load_data_to_db.py              # first load
python load_data_to_db.py --replace    # wipe and reload after retraining
```

It reads **one** file, `data/processed/habitability_catalogue.csv`, written by
`scripts/train_models.py`. The site's habitability classes and the model's
training targets therefore come from the same 11,378 rows and cannot drift
apart. Without `--replace` the script refuses to load on top of existing rows,
because mixing two catalogue versions would leave the table showing two
different labelling schemes.

Names are resolved during training (`pl_name` for K2, `KOI-` + `kepoi_name` for
Kepler, `TOI-` + `toi` for TESS) and de-duplicated there, so the loader never
needs a positional placeholder.

### Repairing placeholder names (legacy)

`backfill_planet_names.py` repaired databases loaded before per-mission name
resolution existed, where most rows carried placeholders like
`Kepler_planet_0`. It is superseded — names now come from the catalogue, and
`tests/test_habitability_scorer.py::test_planet_names_are_unique` asserts they
load without collisions. Kept only for restoring an old dump.

```bash
python backfill_planet_names.py            # dry run
python backfill_planet_names.py --apply    # commit
```

## Auth

JWT via `djangorestframework-simplejwt`. Access tokens last 1 hour, refresh
tokens 7 days, rotation disabled. Login accepts a username *or* an email.

`/api/auth/logout/` does **not** revoke anything server-side:
`rest_framework_simplejwt.token_blacklist` is not in `INSTALLED_APPS`, so the
`token.blacklist()` call raises and is swallowed. The endpoint returns 200 and
the client discards its own tokens; an unexpired refresh token stays valid until
it lapses. Add the blacklist app and run its migrations if real revocation is
needed.

---

## Security configuration

Applied in `settings.py`, keyed off `DEBUG`:

- SSL redirect, HSTS (1 year, preload), secure session and CSRF cookies — all
  active whenever `DEBUG=false`
- `SECRET_KEY` is mandatory when `DEBUG=false`; startup raises
  `ImproperlyConfigured` rather than falling back to a default
- CORS is origin-scoped (`CORS_ALLOW_ALL_ORIGINS = False`)
- `X_FRAME_OPTIONS = DENY`, nosniff, `strict-origin-when-cross-origin`
- A Content-Security-Policy header from `backend/middleware.py`
- DRF throttling: 200/hour anonymous, 1000/hour authenticated

---

## Local development

```bash
# from the repo root, with the virtualenv active
cp backend/.env.example backend/.env     # then fill in real values
cd backend
python manage.py migrate
python load_data_to_db.py                # first run only
python manage.py runserver               # http://localhost:8000
```

`DEBUG=true` in `.env` is required locally — otherwise Django enforces the SSL
redirect and the dev server becomes unreachable over plain HTTP.

### Tests

```bash
pytest                              # from repo root — tests/ per pytest.ini
python backend/test_backend_api.py  # live endpoint smoke test, needs a running server
```

Per-app `tests.py` files are mostly Django scaffolding; `predictions/tests.py`
is the one with real coverage.

---

## Deployment

Railway, via the root `Procfile`:

```
web: python backend/manage.py migrate && gunicorn --pythonpath backend backend.wsgi:application
```

`backend/Procfile` is a variant for deploying with `backend/` as the root
directory. Static files are served by WhiteNoise with compressed manifest
storage — run `collectstatic` if you add any. `.railwayignore` keeps the
frontend, notebooks, datasets and docs out of the backend image.
