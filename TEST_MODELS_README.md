# ML Model Evaluation Guide

`test_models.py` is a standalone harness for sanity-checking the trained Kepler
classifier without starting Django, the database, or the frontend. It is the
quickest way to answer "does the model still behave sensibly?" — useful for a
supervisor demo or after retraining.

> This tests the **raw ML classifier only**. It does not apply the hybrid
> `0.10 × ML + 0.90 × physics` scoring that the web application uses, so its
> output will not match `/api/predict/`. See
> [PROJECT_UNDERSTANDING_GUIDE.md](./PROJECT_UNDERSTANDING_GUIDE.md#7-habitability-scoring-system)
> for the full scoring pipeline.

---

## Running it

```bash
# From the project root, with the virtualenv active
python test_models.py
```

No arguments. It reads `test_models_inputs.json`, runs every planet listed
there through `models/kepler_xgboost_model.pkl`, and prints a class prediction,
a confidence figure, and a probability bar chart per planet.

---

## Editing the test cases

All input lives in `test_models_inputs.json` under `test_planets`. Add or edit
entries and re-run — no code changes needed.

```json
{
  "name": "My Test Planet",
  "koi_period": 365.0,
  "koi_prad": 1.0,
  "koi_teq": 288.0,
  "koi_insol": 1.0,
  "koi_sma": 1.0,
  "koi_steff": 5778.0,
  "koi_srad": 1.0,
  "koi_smass": 1.0
}
```

### The eight input parameters

| Parameter | Meaning | Earth / Sun | Typical habitable range |
|---|---|---|---|
| `koi_period` | Orbital period (days) | 365 | 1 – 500 |
| `koi_prad` | Planet radius (Earth radii) | 1.0 | 0.5 – 2.0 |
| `koi_teq` | Equilibrium temperature (K) | 288 | 200 – 350 |
| `koi_insol` | Insolation flux (Earth flux) | 1.0 | 0.25 – 4.0 |
| `koi_sma` | Semi-major axis (AU) | 1.0 | 0.5 – 2.0 |
| `koi_steff` | Stellar effective temperature (K) | 5778 | 3500 – 6500 |
| `koi_srad` | Stellar radius (solar radii) | 1.0 | 0.5 – 1.5 |
| `koi_smass` | Stellar mass (solar masses) | 1.0 | 0.5 – 1.5 |

The Kepler model expects **130 features**. `engineer_features()` in
`test_models.py` derives the remaining 122 from these eight — error columns,
flags, ESI terms, and catalogue defaults — then MinMax-scales them against the
ranges in `data/processed/kepler/kepler_habitability_full_processed.csv`.

---

## Shipped test cases

The default `test_models_inputs.json` covers the sanity envelope:

| Case | Expectation |
|---|---|
| Earth-like | POTENTIALLY_HABITABLE, high confidence |
| Hot Jupiter | NON_HABITABLE — gas giant, 1200 K, 1000× flux |
| Cold rocky | NON_HABITABLE — 150 K, 0.1× flux |
| Venus-like | NON_HABITABLE — right size, far too hot at 737 K |
| Mars-like | NON_HABITABLE — too small and too cold |
| Freeform slot | Edit freely for ad-hoc checks |

If the Earth-like case stops predicting POTENTIALLY_HABITABLE, or a Hot Jupiter
starts predicting habitable, something regressed in the model or the scalers.

---

## The automated suite

`test_models.py` is a manual inspection tool. The assertion-based tests live
separately and run under pytest:

```bash
pytest              # runs tests/ per pytest.ini
pytest -v -m smoke  # smoke-marked subset only
```

Despite its filename, `tests/test_habitability_scorer.py` does **not** exercise
the `HabitabilityScorer` class or the hybrid scoring formula at all. It tests the
raw pickled classifiers:

| Test | Covers |
|---|---|
| `test_models_exist`, `test_model_loadable` | All six `.pkl` files load and expose `predict` / `predict_proba` |
| `test_prediction_shape`, `test_prediction_probabilities` | Output shape, valid classes, probabilities sum to 1 |
| `test_earth_like_planet`, `test_hot_jupiter` | Known-good and known-bad samples from the Kepler test split |
| `test_minimum_accuracy` | Kepler only — asserts accuracy ≥ 85% |
| `test_missing_values`, `test_extreme_values` | Kepler model does not crash on NaN or absurd inputs |
| `test_all_missions` | K2 / Kepler / TESS models load — no accuracy assertion |

**The hybrid scorer has no automated test coverage.** The `0.10 × ML + 0.90 × physics`
blend, the classification thresholds and the ESI maths in
`backend/api/habitability_scorer.py` are only checked by hand through
`/api/predict/` or the prediction panel. Keep that in mind before changing the
weights — nothing will fail if you break them.

---

## Related files

| Path | Purpose |
|---|---|
| `models/*.pkl` | Trained classifiers (see [models/README.md](./models/README.md)) |
| `artifacts/<mission>/` | Scalers, label encoders, feature metadata |
| `data/processed/kepler/` | Training/validation/test splits and scaler reference ranges |
| `tests/test_habitability_scorer.py` | Automated pytest suite |
