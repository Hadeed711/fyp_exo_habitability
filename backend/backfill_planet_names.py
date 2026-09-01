"""
Backfill Real Planet Names
==========================

Repairs exoplanet rows that were loaded before `load_data_to_db.py` knew how to
read the Kepler/TESS name columns. Those rows carry positional placeholders
("Kepler_planet_0", "TESS_planet_0") instead of catalogue designations, which
makes free-text search on /explore and /compare effectively useless for ~93%
of the dataset.

The placeholder encodes the CSV row index it came from, so the repair is an
exact positional lookup back into the same processed CSV — no fuzzy matching.

Usage:
    # Preview every rename, change nothing (default):
    python backfill_planet_names.py

    # Apply the renames inside a single transaction:
    python backfill_planet_names.py --apply

Safe to re-run: rows that already have real names are skipped.
"""

import argparse
import os
import re
import sys
from pathlib import Path

import django
import pandas as pd

# Setup Django
sys.path.append(str(Path(__file__).resolve().parent))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.db import transaction                       # noqa: E402
from planets.models import Exoplanet                    # noqa: E402
from load_data_to_db import DATA_FILES, resolve_planet_name   # noqa: E402


# "Kepler_planet_1234" -> mission "Kepler", index 1234
PLACEHOLDER_RE = re.compile(r'^(?P<mission>.+)_planet_(?P<idx>\d+)$')

# Maps the DATA_FILES keys to the Mission.name values used in the database.
MISSION_KEYS = {'k2': 'K2', 'kepler': 'Kepler', 'tess': 'TESS'}


def build_rename_plan():
    """
    Return (renames, conflicts, unresolved).

    renames    — list of (planet_id, old_name, new_name) to apply
    conflicts  — renames skipped because the target name is already taken
    unresolved — placeholders whose CSV row yields no usable catalogue name
    """
    renames, conflicts, unresolved = [], [], []

    # Every name currently in the DB, so we never create a duplicate.
    taken = set(Exoplanet.objects.values_list('planet_name', flat=True))

    for file_key, csv_file in DATA_FILES.items():
        mission_name = MISSION_KEYS[file_key]

        if not csv_file.exists():
            print(f'[warn]  Skipping {mission_name}: {csv_file} not found')
            continue

        df = pd.read_csv(csv_file, low_memory=False)

        placeholders = Exoplanet.objects.filter(
            mission__name=mission_name,
            planet_name__regex=r'_planet_[0-9]+$',
        ).values_list('id', 'planet_name')

        print(f'   {mission_name}: {len(placeholders)} placeholder row(s), '
              f'{len(df)} CSV row(s)')

        for planet_id, old_name in placeholders:
            match = PLACEHOLDER_RE.match(old_name)
            if not match:
                continue

            idx = int(match.group('idx'))
            if idx >= len(df):
                unresolved.append((planet_id, old_name, 'row index out of range'))
                continue

            new_name = resolve_planet_name(df.iloc[idx], mission_name, idx)

            if new_name == old_name:
                unresolved.append((planet_id, old_name, 'no catalogue name in CSV row'))
                continue

            if new_name in taken:
                conflicts.append((planet_id, old_name, new_name))
                continue

            taken.discard(old_name)
            taken.add(new_name)
            renames.append((planet_id, old_name, new_name))

    return renames, conflicts, unresolved


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        '--apply',
        action='store_true',
        help='Write the renames to the database (default is a dry run).',
    )
    args = parser.parse_args()

    print('\n' + '=' * 78)
    print('BACKFILL PLANET NAMES' + ('  [APPLY]' if args.apply else '  [DRY RUN]'))
    print('=' * 78)

    renames, conflicts, unresolved = build_rename_plan()

    print(f'\n[stats] Planned renames : {len(renames)}')
    print(f'[warn]  Name conflicts  : {len(conflicts)}')
    print(f'[warn]  Unresolved      : {len(unresolved)}')

    if renames:
        print('\nSample of planned renames:')
        for _, old_name, new_name in renames[:10]:
            print(f'   {old_name:<24} -> {new_name}')
        if len(renames) > 10:
            print(f'   ... and {len(renames) - 10} more')

    for label, rows in (('conflicts', conflicts), ('unresolved', unresolved)):
        if rows:
            print(f'\nFirst {label}:')
            for _, old_name, detail in rows[:5]:
                print(f'   {old_name:<24} - {detail}')

    if not args.apply:
        print('\nDry run - nothing written. Re-run with --apply to commit.')
        return

    if not renames:
        print('\nNothing to do.')
        return

    # bulk_update batches the renames into a handful of round trips. Issuing one
    # UPDATE per row costs thousands of network round trips to a remote Neon
    # instance, which turns a seconds-long repair into a half-hour one.
    print(f'\nApplying {len(renames)} renames...')
    with transaction.atomic():
        objs = []
        by_id = {planet_id: new_name for planet_id, _, new_name in renames}
        for planet in Exoplanet.objects.filter(id__in=list(by_id)).only('id', 'planet_name'):
            planet.planet_name = by_id[planet.id]
            objs.append(planet)
        Exoplanet.objects.bulk_update(objs, ['planet_name'], batch_size=500)

    print(f'\n[ok] Renamed {len(objs)} planets.')
    remaining = Exoplanet.objects.filter(planet_name__regex=r'_planet_[0-9]+$').count()
    print(f'[stats] Placeholder names remaining: {remaining}')


if __name__ == '__main__':
    main()
