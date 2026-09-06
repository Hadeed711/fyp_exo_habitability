# Standalone Predictor Guide

`test_models.py` sanity-checks the trained models without starting Django, the
database, or the frontend. It is the quickest way to answer "does the model
still behave sensibly?" — useful for a supervisor demo or after retraining.

> It calls the same `api.habitability_scorer` the web API calls, so **its
> numbers match `/api/predict/` exactly**. The previous version rebuilt 130
> features by hand from 8 inputs and therefore could — and did — disagree with
> the live API. It now reproduces no feature engineering of its own.

---

## Running it

```bash
# From the project root, with the virtualenv active
python test_models.py                    # all planets, default (unified) model
python test_models.py --mission kepler   # a per-mission ablation instead
python test_models.py --explain          # add SHAP/LIME feature attributions
python test_models.py --inputs my.json   # a different inputs file
```

It reads `test_models_inputs.json`, scores every planet listed under
`test_planets`, and prints the score, class, confidence, the classifier/physics
split, class probabilities, ESI, and which inputs were derived rather than
supplied.

---

## Editing the inputs

Parameters use canonical names. Kepler `koi_*` names also work and are mapped
automatically.

| Parameter | Meaning | Earth |
|---|---|---|
| `pl_rade` | Planet radius, Earth radii | 1.0 |
| `pl_eqt` | Equilibrium temperature, K — **not** surface temperature | 255 |
| `pl_insol` | Insolation flux, Earth units | 1.0 |
| `pl_orbper` | Orbital period, days | 365.25 |
| `pl_orbsmax` | Semi-major axis, AU | 1.0 |
| `pl_orbeccen` | Eccentricity (optional) | 0.017 |
| `st_teff` | Stellar effective temperature, K | 5772 |
| `st_rad` | Stellar radius, Solar radii | 1.0 |
| `st_mass` | Stellar mass, Solar masses | 1.0 |

**Any subset is accepted.** Missing quantities are derived from first principles
where the physics allows, and every derived value is reported as such. The
bundled inputs include an entry that supplies only radius, orbital period and
the star — the derivation chain recovers 1.00 AU, 1.00 Earth flux and 255 K.

---

## Reading the output

```
Earth
--------------------------------------------------------------------
  Score          : 0.895   (89.5%)
  Classification : Potentially Habitable
  Confidence     : 65.3%
  Model          : XGBoost (UNIFIED)
  Blend          : 60% classifier (0.825)  +  40% physics (1.000)
```

- **Score** — `0.60 × ML_score + 0.40 × physics_score`, both shown on the Blend
  line so the arithmetic is checkable by eye.
- **Classification** — the score thresholded at the calibrated bands (≥ 0.71
  potentially habitable, ≥ 0.24 habitability zone). Class and score can never
  contradict, because the class *is* the thresholded score.
- **Confidence** — the classifier's posterior for the class actually reported.
- **Derived, not measured** — inputs the physics chain filled in. Predictions
  resting on derived values carry more uncertainty, and the model knows which
  ones they are.

---

## Expected results

Under the labelling rule (`backend/api/physics.py`, `LABEL_RULE`):

| Planet | Expected | Why |
|---|---|---|
| Earth | Potentially Habitable | Meets all four criteria |
| Mars | Habitability Zone | In the zone, but its 687-day year exceeds the 500-day bound |
| Venus at 232 K equilibrium | Potentially Habitable | **This is the point** — transit data cannot see a greenhouse effect |
| Venus at 737 K real surface | Non-Habitable | Feed the true surface temperature and it collapses |
| Hot Jupiter | Non-Habitable | Radius similarity is zero, which vetoes the geometric mean |
| Cold rocky planet | Non-Habitable | Far outside the habitable zone |

The Venus pair is worth running deliberately: it demonstrates the single largest
limitation of the whole system in two lines of output.

---

## What this does not tell you

A per-planet spot check is not an evaluation. For honest performance figures:

```bash
python -m pytest tests/ -q     # 115 tests
curl localhost:8000/api/models/report/
```

or read [models/README.md](./models/README.md), which carries the out-of-fold
per-class metrics, the degraded-input robustness table and the
leave-one-mission-out results.

And the standing caveat: habitability labels are a **documented physics rule**,
not observed ground truth. The classifier is a learned surrogate of that rule.
Agreement with it is not a scientific discovery.
