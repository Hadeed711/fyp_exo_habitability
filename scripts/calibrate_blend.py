"""
Hybrid Score Calibration
========================

Chooses the two free parameters of the displayed habitability score:

    score = w * ml_score + (1 - w) * physics_score

  * w                  - how much weight the classifier carries
  * (t_hz, t_ph)       - the score thresholds that name a class

The previous value, w = 0.10, was picked by hand to stop a broken classifier
from dragging Earth-like inputs down. Now that the classifier receives the
same features it was trained on, the weight is selected by measurement rather
than by feel.

Protocol
--------
ML probabilities are OUT-OF-FOLD: each object is scored by a model that never
saw it, using the same 5-fold split as training. Calibrating on in-fold
probabilities would pick a weight tuned to memorised answers.

The objective is macro-F1 of the thresholded hybrid score against the physics
label across all 11,378 objects. Macro-F1 weights the 126 potentially-habitable
objects equally with the 10,624 non-habitable ones; accuracy would not.

Writes models/reports/blend_calibration.json, which api/habitability_scorer.py
loads at import. The scorer falls back to the constants in
DEFAULT_CALIBRATION if that file is missing, so the API never depends on this
script having been run.

Usage:
    python scripts/calibrate_blend.py
"""

import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.metrics import f1_score
from sklearn.preprocessing import LabelEncoder

# Class order used by the vectorised sweep: 0 NON_HABITABLE,
# 1 HABITABILITY_ZONE, 2 POTENTIALLY_HABITABLE - ascending habitability, so a
# thresholded score maps to a class index with a single searchsorted.
SWEEP_CLASSES = ['NON_HABITABLE', 'HABITABILITY_ZONE', 'POTENTIALLY_HABITABLE']


def fast_macro_f1(y_true_idx, y_pred_idx, n_classes=3):
    """
    Macro-F1 from a bincount confusion matrix.

    sklearn's f1_score costs ~20 ms on 11k rows; the sweep evaluates ~25,000
    threshold combinations, which is eight minutes of pure overhead. This is
    the same number, computed in microseconds.
    """
    cm = np.bincount(y_true_idx * n_classes + y_pred_idx,
                     minlength=n_classes * n_classes).reshape(n_classes, n_classes)
    tp = np.diag(cm).astype(float)
    predicted = cm.sum(axis=0).astype(float)
    actual = cm.sum(axis=1).astype(float)
    precision = np.divide(tp, predicted, out=np.zeros(n_classes), where=predicted > 0)
    recall = np.divide(tp, actual, out=np.zeros(n_classes), where=actual > 0)
    denominator = precision + recall
    f1 = np.divide(2 * precision * recall, denominator,
                   out=np.zeros(n_classes), where=denominator > 0)
    return float(f1.mean())

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT / 'backend'))
sys.path.insert(0, str(PROJECT_ROOT / 'scripts'))

from api import physics as P            # noqa: E402
from api import scoring                 # noqa: E402
from train_models import (              # noqa: E402
    CV_FOLDS, MISSION_SOURCES, RANDOM_STATE, build_candidates,
    load_mission_records, out_of_fold_predictions,
)

REPORTS_DIR = PROJECT_ROOT / 'models' / 'reports'


def main():
    print("Loading catalogue...")
    records = []
    for mission in MISSION_SOURCES:
        mission_records, _ = load_mission_records(mission)
        records.extend(mission_records)
    print(f"  {len(records)} objects")

    encoder = LabelEncoder().fit(P.CLASS_NAMES)
    factory = build_candidates()['XGBoost']

    print(f"Generating {CV_FOLDS}-fold out-of-fold probabilities...")
    y_true, _, proba, _ = out_of_fold_predictions(records, factory, encoder)
    labels = encoder.inverse_transform(y_true)

    idx_hz = list(encoder.classes_).index('HABITABILITY_ZONE')
    idx_ph = list(encoder.classes_).index('POTENTIALLY_HABITABLE')

    # ml_score collapses the class posterior onto one axis: full credit for
    # potentially habitable, half for habitable-zone, none for non-habitable.
    ml_score = proba[:, idx_ph] * 1.0 + proba[:, idx_hz] * 0.5

    print("Computing physics scores...")
    physics_score = np.array([
        scoring.physics_score(P.resolve_physics(r['params'])[0]) for r in records
    ])

    # Index labels once in ascending-habitability order for the fast sweep.
    truth_idx = np.array([SWEEP_CLASSES.index(label) for label in labels])

    print("Sweeping weight and thresholds...")
    weights = np.round(np.arange(0.0, 1.001, 0.05), 3)
    hz_grid = np.round(np.arange(0.10, 0.65, 0.02), 3)
    ph_grid = np.round(np.arange(0.15, 0.96, 0.02), 3)

    # Every weight is scored with ITS OWN best thresholds. Holding thresholds
    # fixed at one weight's optimum makes the others look worse than they are,
    # which would bias the choice of weight.
    def best_thresholds_for(weight):
        blended = weight * ml_score + (1.0 - weight) * physics_score
        local = None
        for t_hz in hz_grid:
            above_hz = blended >= t_hz
            for t_ph in ph_grid[ph_grid >= t_hz + 0.05]:
                # 0/1/2 by threshold, matching SWEEP_CLASSES ordering.
                predicted_idx = above_hz.astype(int) + (blended >= t_ph).astype(int)
                macro = fast_macro_f1(truth_idx, predicted_idx)
                if local is None or macro > local['macro_f1']:
                    local = {'weight': float(weight), 'threshold_hz': float(t_hz),
                             'threshold_ph': float(t_ph), 'macro_f1': float(macro)}
        return local

    per_weight = [best_thresholds_for(weight) for weight in weights]
    peak = max(per_weight, key=lambda row: row['macro_f1'])

    # The curve is flat near the top, so the arg-max is not meaningfully better
    # than a range of nearby weights. Prefer the SMALLEST weight whose macro-F1
    # is within tolerance of the peak: that keeps as much of the auditable
    # physics term as the data will support, instead of letting an
    # insignificant decimal hand the whole score to the model.
    tolerance = 0.002
    best = min((row for row in per_weight
                if row['macro_f1'] >= peak['macro_f1'] - tolerance),
               key=lambda row: row['weight'])
    best['peak_macro_f1'] = peak['macro_f1']
    best['peak_weight'] = peak['weight']
    best['selection_tolerance'] = tolerance

    print(f"\n  peak     : w = {peak['weight']:.2f}, macro-F1 = {peak['macro_f1']:.4f}")
    print(f"  selected : w = {best['weight']:.2f}, "
          f"thresholds = ({best['threshold_hz']:.2f}, {best['threshold_ph']:.2f}), "
          f"macro-F1 = {best['macro_f1']:.4f}  "
          f"(smallest weight within {tolerance} of peak)")

    curve = [{'weight': row['weight'], 'macro_f1': round(row['macro_f1'], 4),
              'threshold_hz': row['threshold_hz'], 'threshold_ph': row['threshold_ph']}
             for row in per_weight]

    print("\n  macro-F1 against blend weight (each at its own best thresholds):")
    for row in curve:
        marker = '  <- selected' if abs(row['weight'] - best['weight']) < 1e-9 else ''
        bar = '#' * int(row['macro_f1'] * 50)
        print(f"    w={row['weight']:.2f}  {row['macro_f1']:.4f}  {bar}{marker}")

    # Is the hybrid actually better than either component alone?
    endpoints = {}
    for name, row in (('physics_only', per_weight[0]),
                      ('ml_only', per_weight[-1]),
                      ('selected', best)):
        blended = row['weight'] * ml_score + (1.0 - row['weight']) * physics_score
        predicted = np.where(
            blended >= row['threshold_ph'], 'POTENTIALLY_HABITABLE',
            np.where(blended >= row['threshold_hz'], 'HABITABILITY_ZONE', 'NON_HABITABLE'))
        endpoints[name] = {
            'weight': float(row['weight']),
            'thresholds': [row['threshold_hz'], row['threshold_ph']],
            'macro_f1': round(float(
                f1_score(labels, predicted, average='macro', zero_division=0)), 4),
            'per_class_f1': {
                cls: round(float(score), 4) for cls, score in zip(
                    P.CLASS_NAMES,
                    f1_score(labels, predicted, average=None,
                             labels=P.CLASS_NAMES, zero_division=0))
            },
        }

    print("\n  component comparison (each at its own best thresholds):")
    for name, row in endpoints.items():
        print(f"    {name:14} w={row['weight']:.2f} macro-F1 {row['macro_f1']:.4f}  "
              + '  '.join(f"{c.split('_')[0][:4]}={v:.3f}"
                          for c, v in row['per_class_f1'].items()))

    # Reference planets, as a sanity check a reviewer can verify by hand.
    reference = {}
    for name, params in scoring.REFERENCE_PLANETS.items():
        resolved, _ = P.resolve_physics(params)
        reference[name] = round(scoring.physics_score(resolved), 4)

    payload = {
        'ml_weight': best['weight'],
        'physics_weight': round(1.0 - best['weight'], 3),
        'threshold_habitability_zone': best['threshold_hz'],
        'threshold_potentially_habitable': best['threshold_ph'],
        'objective': ('macro-F1 of the thresholded hybrid score vs the physics '
                      'label; each weight scored at its own best thresholds, '
                      'then the smallest weight within '
                      f"{best['selection_tolerance']} of the peak is selected"),
        'macro_f1': round(best['macro_f1'], 4),
        'peak_macro_f1': round(best['peak_macro_f1'], 4),
        'peak_weight': best['peak_weight'],
        'n_objects': len(records),
        'protocol': (f'{CV_FOLDS}-fold out-of-fold ML probabilities; '
                     f'random_state={RANDOM_STATE}'),
        'weight_sweep': curve,
        'component_comparison': endpoints,
        'physics_score_reference_planets': reference,
    }

    REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    out = REPORTS_DIR / 'blend_calibration.json'
    with open(out, 'w', encoding='utf-8') as handle:
        json.dump(payload, handle, indent=2)
    print(f"\nWrote {out.relative_to(PROJECT_ROOT)}")

    pd.DataFrame(curve).to_csv(REPORTS_DIR / 'blend_weight_sweep.csv', index=False)


if __name__ == '__main__':
    main()
