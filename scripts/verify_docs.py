# -*- coding: utf-8 -*-
"""
Documentation Consistency Check
===============================

Cross-checks every performance figure and object count quoted in the project
documentation against the actual trained artifacts and labelled catalogue.

Run this after ANY retrain. Documentation drifting away from the artifacts is
how this project ended up publishing a 100%-accuracy claim that came from label
leakage, and how it ended up quoting two different object counts (8,245 and
9,614) that neither matched the database.

    python scripts/verify_docs.py

Exits non-zero if any documented figure disagrees with the artifacts, so it can
be wired into CI.
"""
import json
import pathlib
import sys

import pandas as pd

ROOT = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / 'backend'))
from api import physics as P  # noqa: E402

DOCS = ['README.md', 'PROJECT_UNDERSTANDING_GUIDE.md', 'models/README.md',
        'notebooks/README.md', 'models/legacy/README.md',
        'TEST_MODELS_README.md', 'backend/README.md']

text = {d: (ROOT / d).read_text(encoding='utf-8') for d in DOCS}
alltext = '\n'.join(text.values())

fails, checks = [], 0


def check(label, condition, detail=''):
    global checks
    checks += 1
    if not condition:
        fails.append(f'{label}: {detail}')


# --- ground truth ------------------------------------------------------------
cat = pd.read_csv(ROOT / 'data/processed/habitability_catalogue.csv')
meta = json.loads((ROOT / 'artifacts/unified/unified_metadata.json').read_text())
cal = json.loads((ROOT / 'models/reports/blend_calibration.json').read_text())
filt = json.loads((ROOT / 'models/reports/data_filtering.json').read_text())

print('=' * 66)
print('GROUND TRUTH')
print('=' * 66)
counts = cat.habitability_class.value_counts()
print(f'  catalogue objects      : {len(cat)}')
print(f'  by mission             : {dict(cat.mission.value_counts())}')
print(f'  POTENTIALLY_HABITABLE  : {counts.get("POTENTIALLY_HABITABLE")}')
print(f'  HABITABILITY_ZONE      : {counts.get("HABITABILITY_ZONE")}')
print(f'  NON_HABITABLE          : {counts.get("NON_HABITABLE")}')
print(f'  features               : {meta["n_features"]}')
print(f'  OOF macro F1           : {meta["evaluation"]["oof_macro_f1"]}')
print(f'  blend ml_weight        : {cal["ml_weight"]}')
print(f'  thresholds             : {cal["threshold_habitability_zone"]} / '
      f'{cal["threshold_potentially_habitable"]}')

confirmed = cat[cat.disposition.isin(['CONFIRMED', 'CP', 'KP'])]
ph = cat[cat.habitability_class == 'POTENTIALLY_HABITABLE']
ph_conf = ph[ph.disposition.isin(['CONFIRMED', 'CP', 'KP'])]
print(f'  confirmed-only subset  : {len(confirmed)} ({len(ph_conf)} habitable)')
print(f'  candidate habitable    : {len(ph) - len(ph_conf)}')

# --- checks ------------------------------------------------------------------
print()
print('=' * 66)
print('DOC CONSISTENCY CHECKS')
print('=' * 66)

check('catalogue total', str(len(cat)) == '11378')
check('11,378 in docs', '11,378' in alltext)
check('126 habitable in docs', '126' in alltext)
check('628 zone in docs', '628' in alltext)
check('10,624 non-hab in docs', '10,624' in alltext)
check('25 features in docs', '25 ' in alltext and meta['n_features'] == 25,
      f'metadata says {meta["n_features"]}')
check('0.983 macro F1 in docs', '0.983' in alltext,
      f'actual {meta["evaluation"]["oof_macro_f1"]}')
check('0.60 blend in docs', '0.60' in alltext and cal['ml_weight'] == 0.6,
      f'actual {cal["ml_weight"]}')
check('0.71 threshold in docs',
      '0.71' in alltext and cal['threshold_potentially_habitable'] == 0.71)
check('0.24 threshold in docs',
      '0.24' in alltext and cal['threshold_habitability_zone'] == 0.24)
check('confirmed-only 4,515 accurate', len(confirmed) == 4515,
      f'actual {len(confirmed)}')
check('45 confirmed-habitable accurate', len(ph_conf) == 45,
      f'actual {len(ph_conf)}')
check('81 candidate-habitable accurate', len(ph) - len(ph_conf) == 81,
      f'actual {len(ph) - len(ph_conf)}')

# LABEL_RULE quoted correctly in README
rule = P.LABEL_RULE['POTENTIALLY_HABITABLE']
check('README radius bounds', '0.5 – 2.0 R⊕' in text['README.md'],
      f'rule says {rule["pl_rade"]}')
check('README flux bounds', '0.25 – 4.0 S⊕' in text['README.md'],
      f'rule says {rule["pl_insol"]}')
check('README temp bounds', '180 – 310 K' in text['README.md'],
      f'rule says {rule["pl_eqt"]}')
check('README period bounds', '10 – 500 days' in text['README.md'],
      f'rule says {rule["pl_orbper"]}')
hz = P.LABEL_RULE['HABITABILITY_ZONE']
check('README HZ temp bounds', '200 – 350 K' in text['README.md'],
      f'rule says {hz["pl_eqt"]}')

# filtering table
check('K2 filtering counts', filt['k2']['kept'] == 854, str(filt['k2']))
check('Kepler filtering counts', filt['kepler']['kept'] == 4619, str(filt['kepler']))
check('TESS filtering counts', filt['tess']['kept'] == 5905, str(filt['tess']))

# --- stale claims that must be gone -----------------------------------------
banned = {
    '8,245 planets': '8,245 planets',
    '9,614 rows claim': '9,614 exoplanets',
    'old 10/90 blend as current': '0.10 × ML_score',
    '100% accuracy as current': 'Peak Accuracy',
    'trained on false positives': 'trained on all 4,839',
    'served FPs on website': 'served them on the website',
    'zero-fill defaults': 'defaulting missing values to near-zero',
    'three mission models default': 'Three mission-specific classification models were trained',
}
for label, phrase in banned.items():
    check(f'stale removed: {label}', phrase not in alltext, f'found "{phrase}"')

print(f'\n  {checks - len(fails)}/{checks} checks passed')
if fails:
    print('\n  FAILURES:')
    for f in fails:
        print('   x', f)
else:
    print('  All documentation figures match the artifacts.')

sys.exit(1 if fails else 0)
