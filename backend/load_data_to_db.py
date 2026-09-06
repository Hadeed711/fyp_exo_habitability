"""
Load the Labelled Exoplanet Catalogue into the Database
=======================================================

Reads data/processed/habitability_catalogue.csv - the single artefact written
by scripts/train_models.py - and populates the missions and exoplanets tables.

Why one file
------------
Previously the site loaded three per-mission CSVs produced by a notebook run,
while the models were trained from a separate export, with nothing keeping the
two in step. Their habitability labels also came from median-imputed physics
rather than the derived values the model now sees.

Now the training pipeline writes exactly one labelled catalogue, and this
script is the only thing that reads it. The classes shown on the site and the
classes the model was trained on are the same rows, by construction.

Usage:
    python load_data_to_db.py            # refuses to run if planets exist
    python load_data_to_db.py --replace  # wipe and reload
    python load_data_to_db.py --dry-run  # report what would change
"""

import argparse
import os
import sys
from datetime import date
from pathlib import Path

import django
import pandas as pd

sys.path.append(str(Path(__file__).resolve().parent))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.db import transaction              # noqa: E402
from planets.models import Exoplanet, Mission  # noqa: E402

CATALOGUE_PATH = (Path(__file__).resolve().parent.parent
                  / 'data' / 'processed' / 'habitability_catalogue.csv')

MISSIONS_DATA = [
    {
        'name': 'K2',
        'full_name': 'Kepler Extended Mission (K2)',
        'description': 'Extended Kepler mission observing fields along the ecliptic plane.',
        'launch_date': date(2014, 5, 30),
        'end_date': date(2018, 10, 30),
    },
    {
        'name': 'Kepler',
        'full_name': 'Kepler Space Telescope',
        'description': 'NASA observatory designed to find Earth-size planets around other stars.',
        'launch_date': date(2009, 3, 7),
        'end_date': date(2018, 10, 30),
    },
    {
        'name': 'TESS',
        'full_name': 'Transiting Exoplanet Survey Satellite',
        'description': 'All-sky transit survey of bright nearby stars.',
        'launch_date': date(2018, 4, 18),
        'end_date': None,
    },
]

# Catalogue mission keys -> Mission.name
MISSION_NAMES = {'k2': 'K2', 'kepler': 'Kepler', 'tess': 'TESS'}

# Catalogue columns copied straight onto the model.
FLOAT_FIELDS = [
    'pl_rade', 'pl_masse', 'pl_eqt', 'pl_insol', 'pl_orbper', 'pl_orbsmax',
    'pl_orbeccen', 'st_teff', 'st_rad', 'st_mass', 'st_lum', 'esi_overall',
]

VALID_CLASSES = {'NON_HABITABLE', 'HABITABILITY_ZONE', 'POTENTIALLY_HABITABLE'}

# Archive dispositions that mean "this is a real, confirmed planet".
# K2/Kepler say CONFIRMED; TESS says CP (confirmed planet) or KP (known planet).
# Everything else surviving the upstream filter is candidate-class.
CONFIRMED_DISPOSITIONS = {'CONFIRMED', 'CP', 'KP'}


def sync_missions():
    """Create or update the three mission rows."""
    print("Missions")
    print("-" * 60)
    for payload in MISSIONS_DATA:
        mission, created = Mission.objects.update_or_create(
            name=payload['name'], defaults=payload)
        print(f"  {'created' if created else 'updated'}: {mission.full_name}")
    return {m.name: m for m in Mission.objects.all()}


def clean_float(value):
    """None for NaN, otherwise a float."""
    if value is None or pd.isna(value):
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def clean_int(value):
    number = clean_float(value)
    return int(number) if number is not None else None


def build_planet(row, missions):
    """Turn one catalogue row into an unsaved Exoplanet."""
    mission_key = str(row['mission']).strip().lower()
    mission = missions.get(MISSION_NAMES.get(mission_key))
    if mission is None:
        return None

    habitability_class = str(row.get('habitability_class', '')).strip().upper()
    if habitability_class not in VALID_CLASSES:
        return None

    disposition = str(row.get('disposition') or '').strip().upper()[:20]

    planet = Exoplanet(
        mission=mission,
        planet_name=str(row['planet_name']).strip(),
        habitability_class=habitability_class,
        in_habitable_zone=bool(row.get('in_habitable_zone', False)),
        potentially_habitable=bool(row.get('potentially_habitable', False)),
        stellar_type=str(row.get('stellar_type') or '')[:10],
        discovery_year=clean_int(row.get('discovery_year')),
        disposition=disposition,
        is_confirmed=disposition in CONFIRMED_DISPOSITIONS,
    )
    for field in FLOAT_FIELDS:
        setattr(planet, field, clean_float(row.get(field)))
    return planet


def load_catalogue(replace=False, dry_run=False):
    if not CATALOGUE_PATH.exists():
        print(f"Catalogue not found: {CATALOGUE_PATH}")
        print("Run: python scripts/train_models.py")
        return 1

    frame = pd.read_csv(CATALOGUE_PATH)
    print(f"\nCatalogue: {CATALOGUE_PATH.name} ({len(frame)} objects)")
    print("-" * 60)
    print(frame['habitability_class'].value_counts().to_string())
    print("-" * 60)
    print(frame['mission'].value_counts().to_string())

    existing = Exoplanet.objects.count()
    print(f"\nDatabase currently holds {existing} planets.")

    if dry_run:
        print("\nDry run: no changes written.")
        return 0

    if existing and not replace:
        print("\nRefusing to load on top of existing rows - the labels would be a "
              "mix of two catalogue versions.\nRe-run with --replace to wipe and "
              "reload.")
        return 1

    missions = sync_missions()

    planets, skipped = [], 0
    for row in frame.to_dict('records'):
        planet = build_planet(row, missions)
        if planet is None:
            skipped += 1
            continue
        planets.append(planet)

    print(f"\nPrepared {len(planets)} rows ({skipped} skipped).")

    # One transaction: either the catalogue swaps wholesale or nothing changes.
    # A half-replaced table would show two labelling schemes at once.
    with transaction.atomic():
        if replace and existing:
            deleted, _ = Exoplanet.objects.all().delete()
            print(f"Deleted {deleted} existing rows.")

        for start in range(0, len(planets), 1000):
            Exoplanet.objects.bulk_create(planets[start:start + 1000])
            print(f"  inserted {min(start + 1000, len(planets))}/{len(planets)}")

        for mission in Mission.objects.all():
            mission.total_planets = mission.planets.count()
            mission.save(update_fields=['total_planets'])

    print("\nFinal state")
    print("-" * 60)
    print(f"  planets              : {Exoplanet.objects.count()}")
    for mission in Mission.objects.all().order_by('name'):
        print(f"  {mission.name:20} : {mission.total_planets}")
    for label in sorted(VALID_CLASSES):
        count = Exoplanet.objects.filter(habitability_class=label).count()
        print(f"  {label:20} : {count}")
    print(f"  in habitable zone    : "
          f"{Exoplanet.objects.filter(in_habitable_zone=True).count()}")
    confirmed = Exoplanet.objects.filter(is_confirmed=True).count()
    print(f"  confirmed planets    : {confirmed}")
    print(f"  candidate-class      : {Exoplanet.objects.count() - confirmed}")
    print(f"  confirmed + habitable: "
          f"{Exoplanet.objects.filter(is_confirmed=True, habitability_class='POTENTIALLY_HABITABLE').count()}")
    return 0


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--replace', action='store_true',
                        help='Delete existing planets before loading.')
    parser.add_argument('--dry-run', action='store_true',
                        help='Report what would change without writing.')
    args = parser.parse_args()
    raise SystemExit(load_catalogue(replace=args.replace, dry_run=args.dry_run))


if __name__ == '__main__':
    main()
