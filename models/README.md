# Trained Models

Serialized classifiers and their evaluation reports. Loaded at runtime by the
`HabitabilityScorer` singleton in `backend/predictions/ai_service.py`, which
reads this directory via `MODELS_DIR` in `backend/backend/settings.py`.

> **`models/` holds the classifiers. `artifacts/` holds the preprocessors.**
> The two are easy to confuse — a model here is useless without the matching
> scaler and encoder from `artifacts/<mission>/`.

---

## Contents

| File | Mission | Algorithm | Status |
|---|---|---|---|
| `kepler_xgboost_model.pkl` | Kepler | XGBoost | **In production** |
| `k2_xgboost_model.pkl` | K2 | XGBoost | **In production** |
| `tess_random_forest_model.pkl` | TESS | Random Forest | **In production** |
| `kepler_random_forest_model.pkl` | Kepler | Random Forest | Runner-up, kept for comparison |
| `k2_random_forest_model.pkl` | K2 | Random Forest | Runner-up, kept for comparison |
| `tess_xgboost_model.pkl` | TESS | XGBoost | Runner-up, kept for comparison |
| `ensemble_model.pkl` | — | Combined | Experimental, not wired into the API |

### Evaluation reports

| File | Contents |
|---|---|
| `best_models_summary.csv` | One winning row per mission — the headline figures |
| `k2_model_performance.csv` | K2: XGBoost vs Random Forest |
| `kepler_model_performance.csv` | Kepler: XGBoost vs Random Forest |
| `tess_model_performance.csv` | TESS: XGBoost vs Random Forest |
| `model_evaluation_report.csv` | **Per-class** precision / recall / F1 / ROC-AUC |

---

## Why three models instead of one

Each mission's instrument yields a different feature space, and they do not
reconcile into a single table: K2 exposes 270 usable features, Kepler 130, TESS
only 44. Training one model on the intersection would discard most of what
Kepler and K2 measured. Training per mission keeps every mission's full feature
set and prevents one mission's observational bias from dominating the others.

| Mission | Features | Total rows | Train / Val / Test |
|---|---|---|---|
| K2 | 270 | 1,937 | 1,162 / 387 / 388 |
| Kepler | 130 | 2,742 | 1,645 / 548 / 549 |
| TESS | 44 | 4,935 | 2,961 / 987 / 987 |

Splits are 60 / 20 / 20, stratified. Feature names, class labels and split
sizes are recorded in `artifacts/<mission>/<mission>_habitability_metadata.pkl`.

---

## Headline accuracy is misleading — read the per-class report

`best_models_summary.csv` reports:

| Mission | Best model | Accuracy | Weighted F1 |
|---|---|---|---|
| Kepler | XGBoost | 100% | 1.000 |
| TESS | Random Forest | 100% | 1.000 |
| K2 | XGBoost | 99.2% | 0.991 |

These are **weighted across all three classes**, and the class distribution is
severely skewed:

| Mission | NON_HABITABLE | HABITABILITY_ZONE | POTENTIALLY_HABITABLE |
|---|---|---|---|
| K2 | 1,876 | 56 | **5** |
| Kepler | 2,574 | 136 | **32** |
| TESS | 4,776 | 149 | **10** |

A classifier that answered NON_HABITABLE for every K2 planet would already score
about 97%. The weighted figures are dominated by the majority class.

`model_evaluation_report.csv` shows what happens on the class that actually
matters:

| Mission | Model | Class | Precision | Recall | F1 | Support |
|---|---|---|---|---|---|---|
| K2 | XGBoost | POTENTIALLY_HABITABLE | 0.00 | 0.00 | **0.00** | 1 |
| K2 | XGBoost | NON_HABITABLE | 0.09 | 1.00 | 0.17 | 11 |
| TESS | Random Forest | POTENTIALLY_HABITABLE | 0.50 | 0.50 | **0.50** | 2 |
| TESS | Random Forest | NON_HABITABLE | 0.63 | 0.40 | 0.49 | 30 |

With one or two positive samples in a test split, these figures carry almost no
statistical weight in either direction — they are not evidence the models work
on the minority class, nor firm evidence they fail.

> Note: `best_models_summary.csv` and `model_evaluation_report.csv` disagree on
> K2's overall numbers (99.2% vs 0.72 recall). They come from different
> evaluation runs, and the discrepancy has not been reconciled. Treat
> `model_evaluation_report.csv` as the more informative of the two because it
> breaks results out per class.

### What this means for the application

This is the direct reason the production score is
`0.10 × ML + 0.90 × physics` rather than trusting the classifier. The ML term
contributes a useful nudge; the physics term is what keeps Earth-like inputs
above 90% and obviously hostile ones (a hot Jupiter scores 0.00) near zero.
Note it does not separate Earth from Venus or Mars — measured on the current
models, Earth 0.96, Mars 0.92, Venus 0.74, all POTENTIALLY_HABITABLE. Full rationale in
[PROJECT_UNDERSTANDING_GUIDE.md](../PROJECT_UNDERSTANDING_GUIDE.md#7-habitability-scoring-system).

---

## Regenerating

Models are produced by the training notebooks, one per mission:

| Notebook | Produces |
|---|---|
| `notebooks/04a_ml_k2_mission.ipynb` | `k2_*.pkl` + `artifacts/k2/` |
| `notebooks/04b_ml_kepler_mission.ipynb` | `kepler_*.pkl` + `artifacts/kepler/` |
| `notebooks/04c_ml_tess_mission.ipynb` | `tess_*.pkl` + `artifacts/tess/` |
| `notebooks/05_model_comparison.ipynb` | `best_models_summary.csv`, `model_evaluation_report.csv`, `ensemble_model.pkl` |

After retraining, verify before deploying:

```bash
pytest                  # loads every .pkl; asserts accuracy only for Kepler
python test_models.py   # manual sanity check — see TEST_MODELS_README.md
```

Note that `pytest` covers the raw classifiers only. The hybrid scoring layer in
`backend/api/habitability_scorer.py` has no automated tests, so check a few
predictions through `/api/predict/` by hand as well.

Scalers and encoders must be regenerated alongside the models. A model paired
with a stale scaler from `artifacts/` produces silently wrong predictions rather
than an error.

---

## Loading a model directly

```python
import pickle

with open('models/kepler_xgboost_model.pkl', 'rb') as f:
    model = pickle.load(f)

with open('artifacts/kepler/kepler_habitability_minmax_scaler.pkl', 'rb') as f:
    scaler = pickle.load(f)

with open('artifacts/kepler/kepler_habitability_metadata.pkl', 'rb') as f:
    meta = pickle.load(f)

meta['feature_names']   # 130 columns, in the order the model expects
meta['target_classes']  # ['HABITABILITY_ZONE', 'NON_HABITABLE', 'POTENTIALLY_HABITABLE']
```

Column order matters — `feature_names` is the contract between the scaler and
the model.
