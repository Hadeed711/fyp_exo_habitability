# Legacy artifacts — superseded, do not use

Everything in this folder and in `artifacts/legacy/` was produced by the
notebook pipeline that `scripts/train_models.py` replaced. It is retained only
as a record of what changed and why.

**None of it is loaded by the application.** `backend/api/habitability_scorer.py`
refuses to load any model whose stored feature list disagrees with
`FEATURE_ORDER` in `backend/api/physics.py`, so these files cannot be picked up
by accident.

**Do not quote any figure from these files.** In particular,
`best_models_summary.csv` reports 99.2–100% accuracy, and that number is wrong
for the reasons below.

---

## What is here

| File | Was |
|---|---|
| `k2_xgboost_model.pkl` | K2 classifier, 270 features |
| `kepler_xgboost_model.pkl` | Kepler classifier, 130 features |
| `tess_random_forest_model.pkl` | TESS classifier, 44 features |
| `*_random_forest_model.pkl` | Runner-up estimators per mission |
| `ensemble_model.pkl` | An experimental combined model; never referenced by any code |
| `best_models_summary.csv` | The 99.2–100% accuracy claims |
| `model_evaluation_report.csv` | Per-class metrics that contradicted the summary |
| `*_model_performance.csv` | Per-mission accuracy tables |
| `artifacts/legacy/<mission>/` | Matching scalers, encoders and metadata |

---

## Why they were replaced

### Label leakage produced a meaningless 100%

The habitability label was defined by four thresholds on `pl_rade`, `pl_insol`,
`pl_eqt` and `pl_orbper`. The feature set then included
`in_hz_conservative` — literally `pl_insol in [0.25, 4.0]`, one of those four
clauses — plus `is_rocky` (`pl_rade <= 2.0`) and three more of the same kind.

The model was reading the answer off its own input. `in_hz_conservative` came
out as the top feature at **0.42 importance**, and Kepler and TESS reported
1.000 accuracy.

### Train/serve feature skew

These models expect 270, 130 and 44 columns. The web API accepts nine
observables. At inference the missing 90% were filled with `0.0` and then
MinMax-scaled, producing:

| Mission | Features faked as 0.0 | NaNs in the scaled vector | Values outside [0,1] |
|---|---|---|---|
| Kepler | 117 / 130 | 19 | 26 (minimum **−5232**) |
| K2 | 249 / 270 | 7 | 70 |
| TESS | 32 / 44 | 8 | 8 |

`koi_time0` is an absolute Barycentric Julian Date; zero-filling it lands
roughly 5000 scaled units below anything the model saw in training. The
consequence was visible: Earth and Mars returned byte-identical class
probabilities from the Kepler model despite differing in radius and insolation.

This is also the real reason the production score once weighted ML at only 10%
— the classifier's output had to be suppressed to keep the demo sensible.

### Catalogue artefacts used as predictors

Feature lists included sky coordinates (`ra`, `dec`, `glat`), photometric
magnitudes, measurement-uncertainty columns (`*err1`, `*err2`) and bookkeeping
flags (`default_flag`, `pl_nnotes`). In the K2 model, `sy_vmagerr1` — the
uncertainty on a visual magnitude — ranked **7th** by importance. Nothing about
an error bar on a brightness measurement can cause habitability.

### A far smaller training population

These models were trained on **confirmed objects only** — the notebooks filter
with `df_clean[df_clean['koi_disposition'] == 'CONFIRMED']` — which left 2,742
Kepler rows, 1,937 K2 rows and 4,935 TESS rows. Candidates were discarded
entirely.

That is defensible in itself, but it left the minority class critically small:
just **47 potentially-habitable objects** across all three missions, of which
Kepler contributed 32 and K2 only 5. No evaluation protocol can produce a
trustworthy estimate for a class that size, which is the root cause of the
contradictory metrics described below.

### Evaluation that could not support its own conclusions

A single 20% test split left the rare class with **one** test object on K2 and
two on TESS. Hence the contradiction between the two CSVs here:
`best_models_summary.csv` says K2 scored 99.2% accuracy, while
`model_evaluation_report.csv` says its potentially-habitable F1 was **0.00** on
a support of 1. Both statements are true of the same model, which is precisely
the problem.

### A wrong transform at serving time

Training applied `np.log1p`; the serving path applied `np.log10`. A 365-day
orbital period reached the model as 2.56 where the fitted scaler expected 5.90.

---

## What replaced them

See [../README.md](../README.md) for the current models and their honest
metrics, and [../../notebooks/README.md](../../notebooks/README.md) for the
notebook-by-notebook account. In short:

- 25 canonical features, defined once and imported by both training and serving
- No threshold flags, no coordinates, no magnitudes, no error columns
- False positives dropped; missing values derived from physics, never zero-filled
- One pooled model (per-mission kept as an ablation)
- 5-fold out-of-fold evaluation reported as macro F1, plus degraded-input and
  leave-one-mission-out results
- The blend weight and class thresholds calibrated rather than hand-picked

These files can be deleted at any time; nothing depends on them.
