"""
Habitability Model Training Pipeline
====================================

Rebuilds the habitability classifiers from the raw NASA archive exports.

Design decisions, and why
-------------------------
1. FEATURES COME FROM backend/api/physics.py, the same module the serving
   path uses. The feature vector is 25 columns, every one of which is
   computable from the nine observables the API accepts. There is no
   zero-filling of unavailable columns at inference, because there are none.

2. NO THRESHOLD FLAGS. The previous feature set contained in_hz_conservative
   (pl_insol in [0.25, 4.0]) and is_rocky (pl_rade <= 2.0), which are literal
   clauses of the labelling rule. Handing the model the answer produced a
   reported 100% accuracy that meant nothing. They are gone.

3. NO CATALOGUE ARTEFACTS. Sky coordinates, photometric magnitudes,
   measurement-uncertainty columns and bookkeeping flags are excluded. In the
   old K2 model, sy_vmagerr1 - the uncertainty on a visual magnitude - was the
   7th most important feature. Those columns cannot cause habitability; the
   model was reading dataset structure.

4. DISPOSITION HANDLING IS WIDER, NOT STRICTER. The old pipeline kept only
   objects dispositioned CONFIRMED and discarded every candidate. This one keeps
   CONFIRMED and CANDIDATE (plus TESS's KP and APC) and drops only false
   positives, refuted objects and false alarms. That is the main reason the
   catalogue grew from 8,245 to 11,378 objects, and why the potentially-habitable
   class grew from 47 to 126.

   The trade-off is explicit: 81 of those 126 are unconfirmed candidates. For a
   screening tool that is the right population - the point is to flag objects
   worth following up - but the `disposition` column is carried through to the
   catalogue so any consumer can restrict to confirmed planets.

5. ONE UNIFIED MODEL IS THE DEFAULT. Because the feature space is now
   identical across missions, splitting the data by mission only fragments an
   already rare class - TESS alone contains 10 potentially-habitable objects,
   which cannot support a per-mission estimate. The pooled model sees all of
   them. Per-mission models are still trained, as an ablation and for the
   mission selector, but they are not the default.

6. MISSING-DATA AUGMENTATION. Training rows are duplicated with random
   subsets of the observables masked out, keeping the label derived from the
   complete row. This is where the model earns its place: the labelling rule
   cannot classify an object whose flux is unmeasured, whereas the model
   learns to fall back on physics-derived estimates and on the imputed_*
   provenance flags.

Honest reporting
----------------
The label is a documented physics rule (physics.LABEL_RULE), not observed
ground truth. A model trained on the same observables the rule consumes is a
learned surrogate of that rule, so high in-distribution accuracy is expected
and is NOT evidence of scientific discovery.

Headline metrics are therefore OUT-OF-FOLD: every object is scored by a model
that never saw it, so rare classes report their full support instead of the
one or two rows a single split would leave them. Augmentation and scaling
happen inside each fold, never across.

The results that demonstrate capability beyond the rule are the degraded-input
and leave-one-mission-out sections.

Usage:
    python scripts/train_models.py
    python scripts/train_models.py --mission kepler
"""

import argparse
import json
import pickle
import sys
import warnings
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    average_precision_score, classification_report, confusion_matrix, f1_score,
)
from sklearn.model_selection import StratifiedKFold
from sklearn.preprocessing import LabelEncoder, MinMaxScaler
from xgboost import XGBClassifier

warnings.filterwarnings('ignore')

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT / 'backend'))

from api import physics as P    # noqa: E402
from api import scoring as S    # noqa: E402

RANDOM_STATE = 42
CV_FOLDS = 5
MODELS_DIR = PROJECT_ROOT / 'models'
ARTIFACTS_DIR = PROJECT_ROOT / 'artifacts'
PROCESSED_DIR = PROJECT_ROOT / 'data' / 'processed'
REPORTS_DIR = PROJECT_ROOT / 'models' / 'reports'

MISSION_SOURCES = {
    'k2': {
        'path': PROJECT_ROOT / 'data' / 'raw' / 'k2_dataset.csv',
        'disposition_col': 'disposition',
        'keep_dispositions': {'CONFIRMED', 'CANDIDATE'},
        'name_col': 'pl_name',
        'name_prefix': '',
        'dedupe_col': 'default_flag',
        # Catalogue-only columns: shown on the site, never fed to the model.
        'extras': {'disc_year': 'discovery_year', 'pl_masse': 'pl_masse',
                   'disposition': 'disposition'},
    },
    'kepler': {
        'path': PROJECT_ROOT / 'data' / 'raw' / 'keplar_dataset.csv',
        'disposition_col': 'koi_disposition',
        'keep_dispositions': {'CONFIRMED', 'CANDIDATE'},
        'name_col': 'kepoi_name',
        'name_prefix': 'KOI-',
        'dedupe_col': None,
        'extras': {'koi_disposition': 'disposition'},
    },
    'tess': {
        # PC = planet candidate, CP = confirmed, KP = known planet,
        # APC = ambiguous candidate. FP/FA are false positives and alarms.
        'path': PROJECT_ROOT / 'data' / 'raw' / 'TOI_dataset.csv',
        'disposition_col': 'tfopwg_disp',
        'keep_dispositions': {'PC', 'CP', 'KP', 'APC'},
        'name_col': 'toi',
        'name_prefix': 'TOI-',
        'dedupe_col': None,
        'extras': {'tfopwg_disp': 'disposition'},
    },
}

# Observables eligible for masking. Radius is included: masking it forces the
# model onto flux and temperature evidence alone.
MASKABLE = ['pl_rade', 'pl_eqt', 'pl_insol', 'pl_orbper',
            'pl_orbsmax', 'st_teff', 'st_rad', 'st_mass']

LABEL_CRITICAL = ('pl_rade', 'pl_insol', 'pl_eqt', 'pl_orbper')


# --- Data loading ------------------------------------------------------------

def load_mission_records(mission):
    """
    Read one raw export and return (records, filtering_stats).

    A record is {'params': <supplied observables only>, 'label': <class>,
    'name': ..., 'mission': ...}. Rows whose label cannot be determined even
    after physics derivation are dropped rather than guessed at.
    """
    spec = MISSION_SOURCES[mission]
    df = pd.read_csv(spec['path'], comment='#', low_memory=False)
    stats = {'total_rows': len(df)}

    disp_col = spec['disposition_col']
    if disp_col in df.columns:
        before = len(df)
        df = df[df[disp_col].astype(str).str.strip().isin(spec['keep_dispositions'])]
        stats['false_positives'] = before - len(df)

    if spec['dedupe_col'] and spec['dedupe_col'] in df.columns:
        before = len(df)
        df = df[df[spec['dedupe_col']] == 1]
        stats['duplicate_rows'] = before - len(df)
    elif spec['name_col'] in df.columns:
        before = len(df)
        df = df.drop_duplicates(subset=[spec['name_col']], keep='first')
        stats['duplicate_rows'] = before - len(df)

    column_map = P.MISSION_COLUMN_MAP[mission]
    source_cols = [c for c in df.columns if column_map.get(c, c) in P.CORE_INPUTS]
    extras = {k: v for k, v in spec['extras'].items() if k in df.columns}
    carry = [spec['name_col']] if spec['name_col'] in df.columns else []
    selected = list(dict.fromkeys(source_cols + list(extras) + carry))

    records, unlabelable = [], 0
    for index, row in enumerate(df[selected].to_dict('records')):
        raw_name = row.get(spec['name_col']) if carry else None

        supplied = {}
        for key in source_cols:
            value = row.get(key)
            canonical = column_map.get(key, key)
            if canonical in P.CORE_INPUTS and pd.notna(value):
                try:
                    fvalue = float(value)
                except (TypeError, ValueError):
                    continue
                if np.isfinite(fvalue):
                    supplied[canonical] = fvalue

        resolved, _ = P.resolve_physics(supplied)
        if not all(resolved.get(k) for k in LABEL_CRITICAL):
            unlabelable += 1
            continue

        # Catalogue metadata: displayed on the site, never a model feature.
        metadata = {}
        for source_col, target in extras.items():
            value = row.get(source_col)
            metadata[target] = None if pd.isna(value) else value

        name = str(raw_name).strip() if raw_name is not None and pd.notna(raw_name) else ''
        if name:
            name = f"{spec['name_prefix']}{name}"
        else:
            name = f"{mission}_object_{index}"

        records.append({
            'params': supplied,
            'label': P.assign_label(resolved),
            'name': name,
            'mission': mission,
            'metadata': metadata,
        })

    stats['unlabelable'] = unlabelable
    stats['kept'] = len(records)
    return records, stats


def records_to_matrix(records):
    """Build the feature matrix using the shared physics module."""
    rows = [P.build_features(r['params'])[0] for r in records]
    X = pd.DataFrame(rows, columns=P.FEATURE_ORDER)
    y = np.array([r['label'] for r in records])
    return X, y


def augment_with_masking(records, copies=2, rng=None):
    """
    Duplicate each record with a random subset of observables removed.

    The label stays the one derived from the complete record: the training
    signal is "recover the right class from partial evidence". Masking one to
    four observables covers the realistic range of catalogue incompleteness.
    """
    rng = rng or np.random.default_rng(RANDOM_STATE)
    augmented = []
    for record in records:
        present = [k for k in MASKABLE if k in record['params']]
        if len(present) < 2:
            continue
        for _ in range(copies):
            n_mask = int(rng.integers(1, min(4, len(present)) + 1))
            masked = set(rng.choice(present, size=n_mask, replace=False))
            augmented.append({
                'params': {k: v for k, v in record['params'].items() if k not in masked},
                'label': record['label'],
                'name': record['name'],
                'mission': record['mission'],
                'metadata': record.get('metadata', {}),
            })
    return augmented


# --- Models ------------------------------------------------------------------

def build_candidates():
    """
    Candidate estimators.

    Class weighting handles the imbalance directly instead of synthesising
    minority rows with SMOTE, which on a hundred-odd habitable planets
    interpolates between points that are already near-duplicates and inflates
    apparent performance.
    """
    return {
        'XGBoost': lambda: XGBClassifier(
            n_estimators=400, max_depth=5, learning_rate=0.06,
            subsample=0.85, colsample_bytree=0.85,
            min_child_weight=2, reg_lambda=1.5,
            objective='multi:softprob', num_class=len(P.CLASS_NAMES),
            eval_metric='mlogloss', tree_method='hist',
            random_state=RANDOM_STATE, n_jobs=-1,
        ),
        'RandomForest': lambda: RandomForestClassifier(
            n_estimators=500, max_depth=14, min_samples_leaf=2,
            max_features='sqrt', class_weight='balanced_subsample',
            random_state=RANDOM_STATE, n_jobs=-1,
        ),
    }


def _sample_weights(y_encoded, n_classes):
    """Balanced weights: total / (n_classes * count(class))."""
    counts = np.bincount(y_encoded, minlength=n_classes).astype(float)
    counts[counts == 0] = 1.0
    return (len(y_encoded) / (n_classes * counts))[y_encoded]


def fit_pipeline(factory, train_records, encoder):
    """
    Fit scaler + model on a set of records.

    Augmentation and scaling both happen here, on the training records only,
    so calling this inside a CV fold cannot leak into the held-out fold.
    """
    augmented = augment_with_masking(train_records, copies=2)
    X, y = records_to_matrix(train_records + augmented)
    scaler = MinMaxScaler().fit(X)
    X_scaled = pd.DataFrame(scaler.transform(X), columns=P.FEATURE_ORDER)
    y_encoded = encoder.transform(y)

    model = factory()
    model.fit(X_scaled, y_encoded,
              sample_weight=_sample_weights(y_encoded, len(encoder.classes_)))
    return ScaledModel(model, scaler)


class ScaledModel:
    """Scaler + estimator as one object, so callers always pass raw features."""

    def __init__(self, model, scaler):
        self.model = model
        self.scaler = scaler

    def _scale(self, X):
        return pd.DataFrame(self.scaler.transform(X), columns=P.FEATURE_ORDER)

    def predict(self, X):
        return self.model.predict(self._scale(X))

    def predict_proba(self, X):
        return self.model.predict_proba(self._scale(X))

    def predict_params(self, params):
        vector, _, _ = P.build_features(params)
        return self.predict(pd.DataFrame([vector], columns=P.FEATURE_ORDER))[0]


# --- Evaluation --------------------------------------------------------------

def out_of_fold_predictions(records, factory, encoder, folds=CV_FOLDS):
    """
    Score every object with a model that never saw it.

    This is the headline metric. With 126 potentially-habitable objects in the
    pooled set, a single 15% test split would leave ~19; out-of-fold reporting
    gives every one of them a prediction, so per-class precision and recall are
    estimated on the full support rather than a handful of rows.
    """
    labels = np.array([r['label'] for r in records])
    y_encoded = encoder.transform(labels)
    n_classes = len(encoder.classes_)

    oof_pred = np.empty(len(records), dtype=int)
    oof_proba = np.zeros((len(records), n_classes))
    fold_macro = []

    skf = StratifiedKFold(n_splits=folds, shuffle=True, random_state=RANDOM_STATE)
    for train_idx, test_idx in skf.split(np.zeros(len(records)), y_encoded):
        pipeline = fit_pipeline(factory, [records[i] for i in train_idx], encoder)
        X_test, _ = records_to_matrix([records[i] for i in test_idx])
        oof_pred[test_idx] = pipeline.predict(X_test)
        oof_proba[test_idx] = pipeline.predict_proba(X_test)
        fold_macro.append(f1_score(y_encoded[test_idx], oof_pred[test_idx],
                                   average='macro', zero_division=0))

    return y_encoded, oof_pred, oof_proba, fold_macro


def per_class_report(y_true, y_pred, y_proba, encoder):
    """Per-class precision/recall/F1/support plus average precision."""
    classes = list(encoder.classes_)
    report = classification_report(
        y_true, y_pred, labels=range(len(classes)),
        target_names=classes, output_dict=True, zero_division=0,
    )
    rows = []
    for idx, name in enumerate(classes):
        stats = report[name]
        binary = (y_true == idx).astype(int)
        ap = (float(average_precision_score(binary, y_proba[:, idx]))
              if 0 < binary.sum() < len(binary) else None)
        rows.append({
            'class': name,
            'precision': round(stats['precision'], 4),
            'recall': round(stats['recall'], 4),
            'f1': round(stats['f1-score'], 4),
            'support': int(stats['support']),
            'average_precision': round(ap, 4) if ap is not None else None,
        })
    return rows


def degraded_input_evaluation(pipeline, encoder, records, rng=None):
    """
    Accuracy as observables are progressively withheld.

    The rule is applied to the same degraded inputs and counted as a failure
    when it cannot resolve the four quantities it needs. That gap is the
    capability the model adds over the rule it was trained on.
    """
    rng = rng or np.random.default_rng(RANDOM_STATE)
    results = []
    for n_mask in range(0, 5):
        subset, truths = [], []
        rule_correct = rule_undefined = 0

        for record in records:
            present = [k for k in MASKABLE if k in record['params']]
            if len(present) <= n_mask:
                continue
            masked = set(rng.choice(present, size=n_mask, replace=False)) if n_mask else set()
            partial = {k: v for k, v in record['params'].items() if k not in masked}
            subset.append(partial)
            truths.append(record['label'])

            resolved, _ = P.resolve_physics(partial)
            if all(resolved.get(k) for k in LABEL_CRITICAL):
                rule_correct += int(P.assign_label(resolved) == record['label'])
            else:
                rule_undefined += 1

        if not subset:
            continue
        X = pd.DataFrame([P.build_features(p)[0] for p in subset], columns=P.FEATURE_ORDER)
        pred = encoder.inverse_transform(pipeline.predict(X))
        truths = np.array(truths)
        total = len(subset)

        results.append({
            'observables_withheld': n_mask,
            'n_objects': total,
            'model_accuracy': round(float((pred == truths).mean()), 4),
            'model_macro_f1': round(float(
                f1_score(truths, pred, average='macro', zero_division=0)), 4),
            'rule_accuracy': round(rule_correct / total, 4),
            'rule_undefined_rate': round(rule_undefined / total, 4),
        })
    return results


def holdout_mission_evaluation(records, factory, encoder):
    """
    Train on two missions, evaluate on the third.

    A genuine generalisation test: the held-out mission has a different
    instrument, a different detection bias and a different period
    distribution, so a model that memorised dataset structure fails here.
    """
    results = []
    missions = sorted({r['mission'] for r in records})
    for held in missions:
        train = [r for r in records if r['mission'] != held]
        test = [r for r in records if r['mission'] == held]
        if not train or not test:
            continue
        labels = np.array([r['label'] for r in test])
        if len(set(labels)) < 2:
            continue

        pipeline = fit_pipeline(factory, train, encoder)
        X_test, _ = records_to_matrix(test)
        pred = encoder.inverse_transform(pipeline.predict(X_test))
        present = sorted(set(labels) | set(pred))
        results.append({
            'held_out_mission': held,
            'n_objects': len(test),
            'trained_on': '+'.join(m for m in missions if m != held),
            'macro_f1': round(float(
                f1_score(labels, pred, average='macro', labels=present, zero_division=0)), 4),
            'accuracy': round(float((pred == labels).mean()), 4),
        })
    return results


# --- Training driver ---------------------------------------------------------

def train_target(name, records, all_records, is_unified):
    print(f"\n{'=' * 72}\n{name.upper()}"
          f"{'  (pooled - default model)' if is_unified else '  (per-mission ablation)'}"
          f"\n{'=' * 72}")

    label_counts = pd.Series([r['label'] for r in records]).value_counts()
    print(f"  objects: {len(records)}")
    for cls in P.CLASS_NAMES:
        count = int(label_counts.get(cls, 0))
        print(f"    {cls:24} {count:5d}  ({count / len(records) * 100:5.2f}%)")

    encoder = LabelEncoder().fit(P.CLASS_NAMES)
    candidates = build_candidates()

    # Select the estimator family on out-of-fold macro-F1.
    print(f"\n  model selection ({CV_FOLDS}-fold out-of-fold macro-F1):")
    evaluated = {}
    for model_name, factory in candidates.items():
        y_true, pred, proba, folds = out_of_fold_predictions(records, factory, encoder)
        macro = f1_score(y_true, pred, average='macro', zero_division=0)
        evaluated[model_name] = {
            'macro': float(macro), 'y_true': y_true, 'pred': pred,
            'proba': proba, 'folds': folds,
        }
        print(f"    {model_name:14} {macro:.4f}  "
              f"(per-fold sd {np.std(folds):.4f})")

    best_name = max(evaluated, key=lambda k: evaluated[k]['macro'])
    best = evaluated[best_name]
    factory = candidates[best_name]
    print(f"    -> selected {best_name}")

    class_rows = per_class_report(best['y_true'], best['pred'], best['proba'], encoder)
    print(f"\n  out-of-fold per-class (every object scored by a model that "
          f"did not see it, n={len(records)}):")
    for row in class_rows:
        ap = f"{row['average_precision']:.3f}" if row['average_precision'] is not None else "n/a"
        print(f"    {row['class']:24} P={row['precision']:.3f} R={row['recall']:.3f} "
              f"F1={row['f1']:.3f} n={row['support']:5d} AP={ap}")

    # Final shipped model: trained on everything, evaluated above out-of-fold.
    pipeline = fit_pipeline(factory, records, encoder)

    degraded = degraded_input_evaluation(pipeline, encoder, records)
    print("\n  degraded-input robustness (model vs the rule it learned from):")
    for row in degraded:
        print(f"    {row['observables_withheld']} withheld: model acc {row['model_accuracy']:.3f} "
              f"/ macro-F1 {row['model_macro_f1']:.3f}   "
              f"rule acc {row['rule_accuracy']:.3f}, undefined {row['rule_undefined_rate']:.3f}")

    holdout = []
    if is_unified:
        holdout = holdout_mission_evaluation(records, factory, encoder)
        print("\n  leave-one-mission-out generalisation:")
        for row in holdout:
            print(f"    held out {row['held_out_mission']:7} macro-F1 {row['macro_f1']:.4f} "
                  f"acc {row['accuracy']:.4f} (n={row['n_objects']}, "
                  f"trained on {row['trained_on']})")

    importances = sorted(zip(P.FEATURE_ORDER, pipeline.model.feature_importances_),
                         key=lambda pair: pair[1], reverse=True)
    print("\n  top features:")
    for feature, value in importances[:8]:
        print(f"    {feature:26} {value:.4f}")

    metadata = {
        'dataset_name': name,
        'is_unified': is_unified,
        'classification_type': 'habitability_3class',
        'feature_names': list(P.FEATURE_ORDER),
        'n_features': P.N_FEATURES,
        'target_classes': list(encoder.classes_),
        'n_classes': len(P.CLASS_NAMES),
        'model_type': best_name,
        'total_samples': len(records),
        'class_distribution': {k: int(v) for k, v in label_counts.items()},
        'mission_composition': {
            m: int(c) for m, c in
            pd.Series([r['mission'] for r in records]).value_counts().items()
        },
        'label_rule': P.LABEL_RULE,
        'label_source': 'rule-based physics proxy (physics.assign_label)',
        'evaluation': {
            'protocol': (f'{CV_FOLDS}-fold stratified out-of-fold prediction; '
                         'masking augmentation and MinMax scaling fit inside '
                         'each fold only'),
            'model_selection_macro_f1': {k: round(v['macro'], 4)
                                         for k, v in evaluated.items()},
            'oof_macro_f1': round(float(best['macro']), 4),
            'oof_macro_f1_fold_sd': round(float(np.std(best['folds'])), 4),
            'oof_per_class': class_rows,
            'oof_confusion_matrix': confusion_matrix(
                best['y_true'], best['pred'],
                labels=range(len(P.CLASS_NAMES))).tolist(),
            'degraded_input': degraded,
            'leave_one_mission_out': holdout,
        },
        'feature_importances': {k: round(float(v), 6) for k, v in importances},
        'caveat': (
            'Labels are a documented physics rule, not observed ground truth. '
            'In-distribution scores measure how faithfully the model reproduces '
            'that rule and are not evidence of scientific discovery. The '
            'degraded_input and leave_one_mission_out sections are the results '
            'that demonstrate capability beyond the rule.'
        ),
    }

    return {'name': name, 'pipeline': pipeline, 'model_name': best_name,
            'encoder': encoder, 'metadata': metadata, 'records': records}


# --- Persistence -------------------------------------------------------------

def save_target(result):
    name = result['name']
    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    (ARTIFACTS_DIR / name).mkdir(parents=True, exist_ok=True)

    with open(MODELS_DIR / f'{name}_model.pkl', 'wb') as handle:
        pickle.dump(result['pipeline'].model, handle)

    art = ARTIFACTS_DIR / name
    with open(art / f'{name}_minmax_scaler.pkl', 'wb') as handle:
        pickle.dump(result['pipeline'].scaler, handle)
    with open(art / f'{name}_label_encoder.pkl', 'wb') as handle:
        pickle.dump(result['encoder'], handle)
    with open(art / f'{name}_metadata.pkl', 'wb') as handle:
        pickle.dump(result['metadata'], handle)
    with open(art / f'{name}_metadata.json', 'w', encoding='utf-8') as handle:
        json.dump(result['metadata'], handle, indent=2)


def export_labelled_catalogue(records):
    """
    Write the physics-resolved, labelled catalogue.

    This single file is what load_data_to_db.py imports, so the site's
    catalogue labels and the model's training targets come from one artefact
    and cannot drift apart.
    """
    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    rows, seen = [], {}
    for record in records:
        vector, resolved, imputed = P.build_features(record['params'])

        # planet_name is unique in the database, so guarantee uniqueness here
        # rather than letting the loader silently drop colliding rows.
        name = record['name']
        if name in seen:
            seen[name] += 1
            name = f"{name} ({seen[name]})"
        else:
            seen[name] = 0

        row = {
            'planet_name': name,
            'mission': record['mission'],
            'habitability_class': record['label'],
        }
        row.update({k: resolved.get(k) for k in P.CORE_INPUTS})
        row['st_lum'] = resolved.get('st_lum')
        row['stellar_type'] = resolved.get('stellar_type')
        row['hz_position'] = vector['hz_position']

        # ESI from the same function the API serves, so a planet's catalogue
        # ESI and its on-demand prediction can never disagree.
        row['esi_overall'] = S.earth_similarity_index(
            resolved.get('pl_rade'), resolved.get('pl_eqt'))
        row['in_habitable_zone'] = bool(
            S.hz_membership(resolved.get('pl_insol')) >= 1.0)
        row['potentially_habitable'] = bool(record['label'] == 'POTENTIALLY_HABITABLE')

        # Provenance: how many of the nine observables were derived, and which.
        row['n_imputed'] = int(sum(imputed.values()))
        row['derived_fields'] = ';'.join(sorted(k for k, v in imputed.items() if v))

        for key, value in (record.get('metadata') or {}).items():
            row[key] = value
        rows.append(row)

    frame = pd.DataFrame(rows)
    out = PROCESSED_DIR / 'habitability_catalogue.csv'
    frame.to_csv(out, index=False)
    print(f"\n  labelled catalogue -> {out.relative_to(PROJECT_ROOT)} ({len(frame)} objects)")
    return frame


def write_reports(results, filter_stats):
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    summary, per_class, degraded, holdout = [], [], [], []

    for result in results:
        name = result['name']
        ev = result['metadata']['evaluation']
        summary.append({
            'Model Set': name,
            'Estimator': result['model_name'],
            'Objects': result['metadata']['total_samples'],
            'OOF Macro F1': ev['oof_macro_f1'],
            'Fold SD': ev['oof_macro_f1_fold_sd'],
            'Default': result['metadata']['is_unified'],
        })
        for row in ev['oof_per_class']:
            per_class.append({'Model Set': name, **row})
        for row in ev['degraded_input']:
            degraded.append({'Model Set': name, **row})
        for row in ev['leave_one_mission_out']:
            holdout.append({'Model Set': name, **row})

    pd.DataFrame(summary).to_csv(MODELS_DIR / 'model_performance.csv', index=False)
    pd.DataFrame(per_class).to_csv(REPORTS_DIR / 'per_class_metrics.csv', index=False)
    pd.DataFrame(degraded).to_csv(REPORTS_DIR / 'degraded_input_robustness.csv', index=False)
    if holdout:
        pd.DataFrame(holdout).to_csv(REPORTS_DIR / 'leave_one_mission_out.csv', index=False)
    with open(REPORTS_DIR / 'data_filtering.json', 'w', encoding='utf-8') as handle:
        json.dump(filter_stats, handle, indent=2)

    print(f"\n{'=' * 72}\nSUMMARY\n{'=' * 72}")
    print(pd.DataFrame(summary).to_string(index=False))
    print(f"\nReports -> {REPORTS_DIR.relative_to(PROJECT_ROOT)}")


def main():
    parser = argparse.ArgumentParser(description='Train habitability models.')
    parser.add_argument('--mission', choices=list(MISSION_SOURCES), default=None,
                        help='Train only this mission (skips the unified model).')
    args = parser.parse_args()

    print("Loading raw NASA archive exports...")
    all_records, filter_stats = {}, {}
    for mission in MISSION_SOURCES:
        records, stats = load_mission_records(mission)
        all_records[mission] = records
        filter_stats[mission] = stats
        print(f"  {mission:7} {stats['total_rows']:5d} rows -> {stats['kept']:5d} objects "
              f"(false positives {stats.get('false_positives', 0)}, "
              f"duplicates {stats.get('duplicate_rows', 0)}, "
              f"unlabelable {stats['unlabelable']})")

    pooled = [r for mission in MISSION_SOURCES for r in all_records[mission]]
    filter_stats['unified'] = {'kept': len(pooled)}

    results = []
    if args.mission:
        results.append(train_target(args.mission, all_records[args.mission],
                                    all_records, is_unified=False))
    else:
        results.append(train_target('unified', pooled, all_records, is_unified=True))
        for mission in MISSION_SOURCES:
            results.append(train_target(mission, all_records[mission],
                                        all_records, is_unified=False))
        export_labelled_catalogue(pooled)

    for result in results:
        save_target(result)

    write_reports(results, filter_stats)
    print("\nArtifacts written to models/ and artifacts/.")


if __name__ == '__main__':
    main()
