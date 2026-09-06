# -*- coding: utf-8 -*-
"""
Confirmed-only vs confirmed+candidates: which catalogue should ship?

Trains the same pipeline on three candidate populations and compares
out-of-fold macro F1 and, crucially, the STABILITY of the rare-class estimate.
"""
import sys
import warnings

import numpy as np
import pandas as pd
from sklearn.metrics import f1_score
from sklearn.preprocessing import LabelEncoder

warnings.filterwarnings('ignore')
sys.path.insert(0, 'f:/FYP/backend')
sys.path.insert(0, 'f:/FYP/scripts')

from api import physics as P                    # noqa: E402
from train_models import (                      # noqa: E402
    MISSION_SOURCES, build_candidates, load_mission_records,
    out_of_fold_predictions,
)

CONFIRMED = {'CONFIRMED', 'CP', 'KP'}

print('Loading raw archives...')
records = []
for mission in MISSION_SOURCES:
    recs, _ = load_mission_records(mission)
    records.extend(recs)


def disp(r):
    return str((r.get('metadata') or {}).get('disposition', '')).strip()


populations = {
    'A. confirmed + candidates (current)': records,
    'B. confirmed only': [r for r in records if disp(r) in CONFIRMED],
    # What the old pipeline actually did: CONFIRMED for k2/kepler, PC+CP for tess
    'C. old pipeline rule': [
        r for r in records
        if (r['mission'] in ('k2', 'kepler') and disp(r) == 'CONFIRMED')
        or (r['mission'] == 'tess' and disp(r) in ('PC', 'CP'))
    ],
}

encoder = LabelEncoder().fit(P.CLASS_NAMES)
factory = build_candidates()['XGBoost']

rows = []
for name, subset in populations.items():
    labels = pd.Series([r['label'] for r in subset])
    n_ph = int((labels == 'POTENTIALLY_HABITABLE').sum())
    n_hz = int((labels == 'HABITABILITY_ZONE').sum())

    print(f'\n{"=" * 68}\n{name}\n{"=" * 68}')
    print(f'  objects {len(subset)}  |  habitable {n_ph}  |  zone {n_hz}')
    print(f'  missions: {dict(pd.Series([r["mission"] for r in subset]).value_counts())}')

    y, pred, proba, folds = out_of_fold_predictions(subset, factory, encoder)
    macro = f1_score(y, pred, average='macro', zero_division=0)

    idx_ph = list(encoder.classes_).index('POTENTIALLY_HABITABLE')
    per_class = f1_score(y, pred, average=None,
                         labels=range(len(encoder.classes_)), zero_division=0)

    # Per-fold rare-class F1 - the stability question
    ph_folds = []
    from sklearn.model_selection import StratifiedKFold
    skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    for _, test_idx in skf.split(np.zeros(len(subset)), y):
        if (y[test_idx] == idx_ph).sum() == 0:
            continue
        ph_folds.append(f1_score(y[test_idx], pred[test_idx], average=None,
                                 labels=[idx_ph], zero_division=0)[0])

    print(f'  OOF macro F1        : {macro:.4f}  (fold SD {np.std(folds):.4f})')
    print(f'  habitable-class F1  : {per_class[idx_ph]:.4f}')
    print(f'  habitable F1 by fold: {[round(f, 3) for f in ph_folds]}')
    print(f'  habitable F1 SD     : {np.std(ph_folds):.4f}   <- stability of the '
          f'number that matters')

    rows.append({
        'population': name,
        'objects': len(subset),
        'habitable': n_ph,
        'macro_f1': round(float(macro), 4),
        'macro_sd': round(float(np.std(folds)), 4),
        'habitable_f1': round(float(per_class[idx_ph]), 4),
        'habitable_f1_sd': round(float(np.std(ph_folds)), 4),
        'min_fold_habitable_f1': round(float(min(ph_folds)), 4),
    })

print(f'\n{"=" * 68}\nSUMMARY\n{"=" * 68}')
print(pd.DataFrame(rows).to_string(index=False))
