# Trained Models

Everything in this directory is generated. To rebuild from the raw NASA archive
exports:

```bash
python scripts/train_models.py      # models, artifacts, labelled catalogue, reports
python scripts/calibrate_blend.py   # blend weight and class thresholds
```

Neither script needs Django, a database, or network access.

---

## What ships

| File | Contents |
|---|---|
| `unified_model.pkl` | **Default.** Trained on all 11,378 objects pooled across the three missions. |
| `k2_model.pkl`, `kepler_model.pkl`, `tess_model.pkl` | Per-mission ablations. Selectable via the API's `mission` parameter; not the default. |
| `model_performance.csv` | Headline out-of-fold macro F1 per model set. |
| `reports/` | Per-class metrics, degraded-input robustness, leave-one-mission-out transfer, blend calibration, data-filtering counts. |

Matching scalers, label encoders and metadata live in `artifacts/<name>/`. The
metadata carries the feature list, the class distribution, the full evaluation
record and the labelling rule, and is also written as JSON for reading without
Python.

`/api/models/report/` serves this metadata directly. **Any page or document
quoting a performance figure should read it from there** rather than copying a
number, so published claims cannot drift from the artefacts.

---

## Read this before quoting any accuracy figure

The habitability labels are a **documented physics rule**
(`backend/api/physics.py`, `LABEL_RULE`), not observed ground truth. No
exoplanet has confirmed habitability, so there is nothing to observe.

The classifier is trained on the same observables that rule consumes. It is
therefore a **learned surrogate** of the rule, and a high in-distribution score
means it reproduces the rule faithfully. That is not a scientific discovery and
must not be presented as one.

The two results that demonstrate capability the rule does not have are the
degraded-input table and the leave-one-mission-out table below.

---

## Headline performance

Out-of-fold, 5-fold stratified: every object is scored by a model that never saw
it during training. Masking augmentation and feature scaling are fitted inside
each fold, never across.

| Model set | Estimator | Objects | OOF macro F1 | Fold SD |
|---|---|---|---|---|
| **unified** | XGBoost | 11,378 | **0.983** | 0.012 |
| kepler | Random Forest | 4,619 | 0.989 | 0.006 |
| tess | XGBoost | 5,905 | 0.937 | 0.072 |
| k2 | Random Forest | 854 | 0.767 | 0.174 |

Per-class, unified model:

| Class | Precision | Recall | F1 | Objects |
|---|---|---|---|---|
| POTENTIALLY_HABITABLE | 0.976 | 0.952 | 0.964 | 126 |
| HABITABILITY_ZONE | 0.981 | 0.989 | 0.985 | 628 |
| NON_HABITABLE | 1.000 | 0.999 | 0.999 | 10,624 |

Macro F1, not accuracy: 93% of objects are non-habitable, so accuracy would be
dominated by the majority class and would say nothing about the class anyone
cares about.

The K2 ablation's 0.767 with a fold standard deviation of 0.174 is exactly why
the pooled model is the default — K2 alone contains 7 potentially-habitable
objects, which cannot support a stable estimate.

---

## Where the ML actually earns its place

**Degraded inputs.** Real catalogue rows are incomplete. Observables are
withheld at random and both the model and the labelling rule are re-evaluated:

| Observables withheld | Model accuracy | Rule accuracy | Rule undefined |
|---|---|---|---|
| 0 | 1.000 | 1.000 | 0% |
| 1 | 0.997 | 0.725 | 27.5% |
| 2 | 0.994 | 0.412 | 58.7% |
| 3 | 0.986 | 0.170 | 83.0% |
| 4 | 0.976 | 0.048 | 95.2% |

With four of eight observables missing the rule cannot be evaluated at all for
95% of objects, while the model still classifies 97.6% correctly. It manages
this because it is trained on deliberately masked rows and because the
`imputed_*` features tell it which of its inputs were measured and which were
derived.

**Leave-one-mission-out.** Train on two missions, evaluate on the third:

| Held out | Macro F1 | Accuracy | Objects |
|---|---|---|---|
| tess | 0.942 | 0.996 | 5,905 |
| k2 | 0.899 | 0.993 | 854 |
| kepler | 0.752 | 0.979 | 4,619 |

Each mission has a different instrument, detection bias and period
distribution, so a model that had memorised dataset structure rather than
physics would fail here.

---

## Features

25 columns, defined once in `backend/api/physics.py` as `FEATURE_ORDER` and
imported by **both** the training pipeline and the serving path. That shared
import is what makes train/serve skew structurally impossible: every feature is
computable from the nine observables the API accepts, so nothing is ever
zero-filled at inference.

- Nine observables: planet radius, equilibrium temperature, insolation flux,
  orbital period, semi-major axis, eccentricity, stellar temperature, radius, mass
- Derived stellar luminosity
- `log1p` transforms of period, distance and flux
- Planet/star radius ratio, orbit size in stellar radii
- Continuous habitable-zone position (Kopparapu et al. 2013 boundaries)
- Nine `imputed_*` flags marking which inputs were derived rather than measured

**Deliberately excluded**, and why:

- `in_hz_conservative`, `in_hz_optimistic`, `is_rocky`, `is_super_earth`,
  `is_earth_sized` — each restates a clause of the labelling rule. Handing the
  model the answer produced a previously-reported 100% accuracy that meant
  nothing.
- `radius_similarity`, `temp_similarity`, `insol_similarity` — strictly
  monotone functions of quantities already present, so they add no information.
  They do add a failure mode: all three saturate at exactly 1.0 for Earth and no
  catalogue object reaches 1.0, so the trees had never seen that corner and
  extrapolated Earth itself to the wrong class. They remain in
  `backend/api/scoring.py`, where the physics score is closed-form and
  extrapolation is not a concern.
- Sky coordinates, photometric magnitudes, measurement-uncertainty columns,
  bookkeeping flags — these cannot cause habitability. In an earlier K2 model
  `sy_vmagerr1`, the uncertainty on a visual magnitude, ranked 7th by
  importance, which is a clear sign the model was reading dataset structure.

Top features of the shipped unified model: `pl_eqt` (0.234), `pl_rade` (0.146),
`imputed_pl_rade` (0.109), `pl_insol` (0.097). The provenance flags ranking
highly is expected and desirable — knowing whether a radius was measured is
genuinely informative.

---

## Data filtering

From 21,224 raw archive rows to 11,378 catalogued objects:

| Mission | Raw rows | False positives dropped | Duplicates dropped | Unlabelable | Kept |
|---|---|---|---|---|---|
| K2 | 3,992 | 315 | 2,121 | 702 | 854 |
| Kepler | 9,564 | 4,839 | 0 | 106 | 4,619 |
| TESS | 7,668 | 1,290 | 0 | 473 | 5,905 |

- **False positives** are objects the archives disposition as `FALSE POSITIVE`,
  `REFUTED`, `FP` or `FA`. They are not planets. The previous pipeline trained
  on all 4,839 of Kepler's.
- **Duplicates** are repeated parameter sets for the same object; K2 is
  collapsed to the archive's `default_flag` row.
- **Unlabelable** objects are those whose four labelling criteria cannot be
  resolved even after physics derivation. They are excluded rather than guessed
  at.

Exact counts are regenerated into `reports/data_filtering.json` on every run.

---

## Blend calibration

The displayed habitability score is:

```
score = 0.60 * ml_score + 0.40 * physics_score
```

The weight and the two class thresholds (0.24 / 0.71) are **selected by
measurement**, not by hand. `scripts/calibrate_blend.py` sweeps them to maximise
macro F1 against the physics label across all 11,378 objects, using out-of-fold
classifier probabilities so the weight is not tuned against memorised answers.
Every weight is scored at its own best thresholds, since holding thresholds
fixed at one weight's optimum biases the comparison.

The macro-F1 curve is flat above w≈0.55, so the smallest weight within 0.002 of
the peak is chosen: that keeps as much of the auditable physics term as the data
supports rather than letting an insignificant decimal hand the entire score to
the model.

| Configuration | Macro F1 |
|---|---|
| physics only (w=0.00) | 0.719 |
| **selected (w=0.60)** | **0.983** |
| classifier only (w=1.00) | 0.984 |

An earlier version of this project used w=0.10. That was not a design choice —
it was compensating for a classifier being served 90% zero-filled features,
whose output had to be suppressed to stop it dragging Earth-like inputs down.
With the feature pipeline fixed, the measured optimum moved to 0.60.

The full sweep is in `reports/blend_calibration.json` and
`reports/blend_weight_sweep.csv`; the scorer loads the JSON at import and falls
back to `DEFAULT_CALIBRATION` in `habitability_scorer.py` if it is absent.
