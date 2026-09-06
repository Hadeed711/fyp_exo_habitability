# Notebooks — exploratory phase (superseded)

**These notebooks no longer produce the shipped models.** The production
pipeline is:

```bash
python scripts/train_models.py      # models, artifacts, labelled catalogue, reports
python scripts/calibrate_blend.py   # blend weight + class thresholds
```

They are kept because they document the exploratory work — the data
exploration, the distribution plots, the class-imbalance investigation and the
model comparison that informed the final design. **Do not run them to regenerate
models**, and do not quote their output figures.

---

## Why they were replaced

The modelling notebooks contain three defects that were found later. Each is
worth understanding, because the fixes are the interesting part of the project:

### 1. Label leakage

`01/02/03` create the habitability label from four thresholds:

```python
potentially_habitable = (
    (pl_rade >= 0.5) & (pl_rade <= 2.0) &
    (pl_insol >= 0.25) & (pl_insol <= 4.0) &
    (pl_eqt >= 180) & (pl_eqt <= 310) &
    (pl_orbper >= 10) & (pl_orbper <= 500)
)
```

...and then, in the same notebooks, engineer features that restate those very
clauses:

```python
df['in_hz_conservative'] = ((df.pl_insol >= 0.25) & (df.pl_insol <= 4.0)).astype(int)
df['is_rocky']           = (df.pl_rade <= 2.0).astype(int)
```

The model was handed the answer. `in_hz_conservative` came out as the top
feature at 0.42 importance, and the notebooks reported **100% accuracy** for
Kepler and TESS. That number measured nothing.

### 2. Catalogue artefacts as predictors

The feature sets included sky coordinates, photometric magnitudes and
measurement-uncertainty columns. In the K2 model, `sy_vmagerr1` — the
uncertainty on a visual magnitude — ranked 7th by importance. Nothing about the
error bar on a brightness measurement can cause habitability; the model was
reading dataset structure.

### 3. Feature sets the API could never supply

The notebooks trained on 270 (K2), 130 (Kepler) and 44 (TESS) columns, while the
web API accepts nine observables. At serving time the missing 90% were filled
with `0.0` and then MinMax-scaled, producing NaNs and values as extreme as
−5232 against training data scaled to [0, 1]. Earth and Mars came back with
byte-identical probabilities.

### 4. Unusable evaluation

A single 20% test split left the rare class with **one** test object on K2 and
two on TESS. `models/best_models_summary.csv` reported 99.2–100% accuracy while
`models/model_evaluation_report.csv` reported an F1 of 0.00 for K2's
potentially-habitable class. Both files were checked in, and they contradicted
each other.

---

## What the pipeline does instead

| Notebook approach | `scripts/train_models.py` |
|---|---|
| Threshold flags restating the label | Excluded; `test_no_label_rule_flags_in_feature_set` blocks their return |
| Coordinates, magnitudes, error columns | Excluded |
| 270 / 130 / 44 mission-specific features | 25 canonical features from `backend/api/physics.py`, shared with the serving path |
| Missing values → `0.0` | Derived from first principles, and flagged as derived |
| False positives kept | 6,444 dropped — they are not planets |
| Single 20% split | 5-fold out-of-fold; every object scored by a model that never saw it |
| Accuracy as headline | Macro F1, plus degraded-input and leave-one-mission-out evaluation |
| Three mission models | One pooled model (per-mission kept as an ablation) |

---

## What is still worth reading here

| Notebook | Still useful for |
|---|---|
| `01_k2_habitability.ipynb` | K2 data exploration, missingness patterns, class-distribution plots |
| `02_kepler_habitability.ipynb` | Kepler equivalent; the KOI column semantics are well documented |
| `03_tess_toi_habitability.ipynb` | TESS equivalent; notes which columns TESS simply does not provide |
| `04a/04b/04c_ml_*.ipynb` | The SMOTE and class-weighting experiments that led to choosing balanced sample weights |
| `05_model_comparison.ipynb` | XGBoost vs Random Forest comparison, which the pipeline now performs automatically per model set |

The labelling *rule* itself survived unchanged — it is now the documented
`LABEL_RULE` in `backend/api/physics.py`, applied identically to the training
targets and the catalogue the website displays.
