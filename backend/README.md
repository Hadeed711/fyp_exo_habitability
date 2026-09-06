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
| `predictions/` | `/predict/`, `/predict/batch/`, `/explain/`, `/models/info/`, `/health/`; `ai_service.py` holds the ML service layer. Defines **no** database models |
| `users/` | Register, login, me, logout; `SavedPrediction` CRUD |
| `chatbot/` | ARIA — proxies to the Groq Cloud API |
| `api/` | `habitability_scorer.py`, the core scoring engine. Not an installed Django app |
| `backend/` | Settings, root URL conf, CSP middleware |

### A note on the `api` app

`api` is **not** in `INSTALLED_APPS`, and it contains only two files:
`habitability_scorer.py` and `__init__.py`. It exists solely as an import path —
`predictions/ai_service.py` does
`from api.habitability_scorer import HabitabilityScorer`.

Its Django scaffolding (`views.py`, `urls.py`, `models.py`, `serializers.py`,
`admin.py`, `apps.py`, `tests.py` and an empty `migrations/`) duplicated the
`predictions` app, was unreachable over HTTP, and has been deleted. Add new
endpoints to `predictions/`, never here.

---

## Request path for a prediction

```
POST /api/predict/
  → predictions/views.py::predict
      → predictions/ai_service.py  (singleton, loads models once per process)
          → api/habitability_scorer.py::calculate_habitability_score
              ├── mission model .pkl        from  models/
              ├── scaler + encoder .pkl     from  artifacts/<mission>/
              └── physics terms             computed in-process
  → JSON: habitability_score, classification, confidence, ESI, factor breakdown
```

The scorer blends `0.10 × ML + 0.90 × physics`. The physics weighting is
deliberate — see
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
python load_data_to_db.py
```

Idempotent — it skips any planet whose name already exists, so re-running only
adds new rows.

The three processed datasets do **not** share a name column, which the loader
handles per mission:

| Mission | Name column | Example |
|---|---|---|
| K2 | `pl_name` | `BD+20 594 b` |
| Kepler | `kepler_name`, falling back to `kepoi_name` | `Kepler-227 b` |
| TESS | `toi`, rendered with a prefix | `TOI-1001.01` |

Row counts differ from planet counts: 9,614 processed rows load as 8,245 unique
planets, because K2's 1,937 rows describe 568 distinct planets (one row per
observation reference).

### Repairing placeholder names

A database loaded before the per-mission name mapping existed contains
positional placeholders (`Kepler_planet_0`, `TESS_planet_0`) instead of
catalogue designations, which breaks name search across most of the dataset.

```bash
python backfill_planet_names.py            # dry run, prints every planned rename
python backfill_planet_names.py --apply    # commit, in a single transaction
```

Safe to re-run; rows with real names are left alone.

---

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
