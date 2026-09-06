"""
Standalone Habitability Predictor
=================================

Sanity-checks the trained models without starting Django, the database or the
frontend. Edit test_models_inputs.json and run:

    python test_models.py
    python test_models.py --mission kepler
    python test_models.py --explain

Unlike the previous version, this reproduces NO feature engineering of its own.
It calls the same api.habitability_scorer the web API calls, so its numbers
match /api/predict/ exactly. The old script rebuilt 130 features by hand from 8
inputs, which meant it could - and did - disagree with the live API.
"""

import argparse
import json
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(PROJECT_ROOT / 'backend'))

from api import physics as P                                # noqa: E402
from api.habitability_scorer import HabitabilityScorer      # noqa: E402

INPUTS_PATH = PROJECT_ROOT / 'test_models_inputs.json'

BAR_WIDTH = 28
CLASS_ORDER = ['POTENTIALLY_HABITABLE', 'HABITABILITY_ZONE', 'NON_HABITABLE']
PROBABILITY_KEYS = {
    'POTENTIALLY_HABITABLE': 'potentially_habitable',
    'HABITABILITY_ZONE': 'habitability_zone',
    'NON_HABITABLE': 'non_habitable',
}


def bar(fraction, width=BAR_WIDTH):
    filled = int(round(max(0.0, min(1.0, fraction)) * width))
    return '#' * filled + '.' * (width - filled)


def report(scorer, planet, mission, explain):
    name = planet.pop('name', 'unnamed planet')
    params = {key: value for key, value in planet.items()
              if key in P.CORE_INPUTS or key in P.ALIAS_TO_CANONICAL}

    result = scorer.predict_habitability(params, mission=mission)

    print(f"\n{name}")
    print('-' * 68)
    print(f"  Score          : {result['habitability_score']:.3f}   "
          f"({result['habitability_score'] * 100:.1f}%)")
    print(f"  Classification : {result['classification'].replace('_', ' ').title()}")
    print(f"  Confidence     : {result['confidence']:.1%}")
    print(f"  Model          : {result['model_type']} ({result['mission_used']})")

    factors = result['contributing_factors']
    print(f"  Blend          : {factors['ml_weight']:.0%} classifier "
          f"({factors['ml_score']:.3f})  +  "
          f"{factors['physics_weight']:.0%} physics ({factors['physics_score']:.3f})")

    print("\n  Class probabilities")
    for label in CLASS_ORDER:
        value = result['probabilities'][PROBABILITY_KEYS[label]]
        print(f"    {label:24} {bar(value)} {value:6.1%}")

    esi = result['esi_components']['overall_esi']
    print(f"\n  Earth Similarity Index : {esi if esi is not None else 'n/a'}")
    print(f"  Habitable-zone member  : {factors['hz_membership']:.3f}")
    print(f"  Stellar type           : {result['stellar_type']} "
          f"(factor {factors['stellar_factor']:.2f})")

    derived = result.get('derived_parameters') or []
    if derived:
        print(f"\n  Derived, not measured  : {', '.join(derived)}")
        resolved = result['resolved_parameters']
        for key in derived:
            if key in resolved:
                print(f"    {key:12} -> {resolved[key]:.4g}")

    if explain:
        from predictions import ai_service
        explanation = ai_service.explain_single(params, mission=mission)
        print(f"\n  Attribution ({explanation['explanation_method']})")
        for item in explanation['feature_importance'][:6]:
            arrow = '+' if item['impact_direction'] == 'supports' else '-'
            print(f"    {arrow} {item['feature']:34} {item['importance']:.4f}")
        print(f"\n  {explanation['natural_language_explanation']}")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--mission', default='auto',
                        choices=['auto', 'unified', 'k2', 'kepler', 'tess'],
                        help="Which model to use (default: auto -> unified).")
    parser.add_argument('--explain', action='store_true',
                        help='Also show SHAP/LIME feature attributions.')
    parser.add_argument('--inputs', type=Path, default=INPUTS_PATH)
    args = parser.parse_args()

    if not args.inputs.exists():
        print(f"Inputs file not found: {args.inputs}")
        return 1

    with open(args.inputs, 'r', encoding='utf-8') as handle:
        payload = json.load(handle)

    planets = payload.get('test_planets', [])
    if not planets:
        print("No planets listed under 'test_planets'.")
        return 1

    print("Loading models...")
    scorer = HabitabilityScorer()
    if not scorer.models:
        print("No models loaded. Run: python scripts/train_models.py")
        return 1

    print(f"Loaded: {', '.join(sorted(scorer.models))}")
    print(f"Blend : {scorer.ml_weight:.0%} classifier / "
          f"{scorer.physics_weight:.0%} physics")
    print(f"Bands : >= {scorer.threshold_ph:.2f} potentially habitable, "
          f">= {scorer.threshold_hz:.2f} habitability zone")
    print("=" * 68)

    for planet in planets:
        report(scorer, dict(planet), args.mission, args.explain)

    print("\n" + "=" * 68)
    print("Labels are a documented physics rule, not observed ground truth.")
    print("See /api/models/report/ or models/reports/ for honest metrics.")
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
