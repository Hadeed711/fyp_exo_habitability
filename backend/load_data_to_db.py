"""
Load Exoplanet Data to Database
================================

This script loads processed exoplanet data from CSV files into the PostgreSQL database.

Usage:
    python load_data_to_db.py
"""

import os
import sys
import django
import pandas as pd
from pathlib import Path
from datetime import date

# Setup Django
sys.path.append(str(Path(__file__).resolve().parent))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from planets.models import Mission, Exoplanet
from django.db import transaction


# Mission data
MISSIONS_DATA = [
    {
        'name': 'K2',
        'full_name': 'Kepler Extended Mission (K2)',
        'description': 'Extended Kepler mission observing different fields along the ecliptic plane',
        'launch_date': date(2014, 5, 30),
        'end_date': date(2018, 10, 30)
    },
    {
        'name': 'Kepler',
        'full_name': 'Kepler Space Telescope',
        'description': 'NASA space observatory designed to discover Earth-size planets orbiting other stars',
        'launch_date': date(2009, 3, 7),
        'end_date': date(2018, 10, 30)
    },
    {
        'name': 'TESS',
        'full_name': 'Transiting Exoplanet Survey Satellite',
        'description': 'NASA mission to search for exoplanets using the transit method',
        'launch_date': date(2018, 4, 18),
        'end_date': None
    }
]

# Data file paths
DATA_DIR = Path(__file__).resolve().parent.parent / 'data' / 'processed'

DATA_FILES = {
    'k2': DATA_DIR / 'k2' / 'k2_habitability_full_processed.csv',
    'kepler': DATA_DIR / 'kepler' / 'kepler_habitability_full_processed.csv',
    'tess': DATA_DIR / 'tess' / 'tess_habitability_full_processed.csv'
}


def create_missions():
    """Create mission records."""
    print("\n" + "="*80)
    print("CREATING MISSIONS")
    print("="*80)
    
    created_count = 0
    for mission_data in MISSIONS_DATA:
        mission, created = Mission.objects.get_or_create(
            name=mission_data['name'],
            defaults=mission_data
        )
        if created:
            created_count += 1
            print(f"✅ Created mission: {mission.full_name}")
        else:
            print(f"⏭️  Mission already exists: {mission.full_name}")
    
    print(f"\n✅ Total missions created: {created_count}")
    print(f"📊 Total missions in database: {Mission.objects.count()}")
    return created_count


def load_planet_data(mission_name, csv_file):
    """Load exoplanet data for a specific mission."""
    if not csv_file.exists():
        print(f"❌ File not found: {csv_file}")
        return 0
    
    print(f"\n📂 Loading data from: {csv_file}")
    
    # Read CSV
    df = pd.read_csv(csv_file)
    print(f"   Found {len(df)} planets in CSV")
    
    # Get mission object
    mission = Mission.objects.get(name=mission_name)
    
    # Column mapping
    column_mapping = {
        'pl_name': 'planet_name',
        'pl_rade': 'pl_rade',
        'pl_masse': 'pl_masse',
        'pl_eqt': 'pl_eqt',
        'pl_insol': 'pl_insol',
        'pl_orbper': 'pl_orbper',
        'pl_orbsmax': 'pl_orbsmax',
        'pl_orbeccen': 'pl_orbeccen',
        'st_teff': 'st_teff',
        'st_rad': 'st_rad',
        'st_mass': 'st_mass',
        'st_lum': 'st_lum',
        'st_logg': 'st_logg',
        'st_met': 'st_met',
        'st_age': 'st_age',
        'stellar_type': 'stellar_type',
        'habitability_class': 'habitability_class',
        'in_habitable_zone': 'in_habitable_zone',
        'potentially_habitable': 'potentially_habitable',
        'esi_overall': 'esi_overall',
        'disc_year': 'discovery_year'
    }
    
    # Prepare bulk create list
    planets_to_create = []
    created_count = 0
    skipped_count = 0
    
    for idx, row in df.iterrows():
        # Check if planet already exists
        planet_name = row.get('pl_name', f'{mission_name}_planet_{idx}')
        
        if Exoplanet.objects.filter(planet_name=planet_name).exists():
            skipped_count += 1
            continue
        
        # Prepare planet data
        planet_data = {
            'mission': mission,
            'planet_name': planet_name
        }
        
        # Map columns
        for csv_col, model_field in column_mapping.items():
            if csv_col in df.columns and model_field != 'planet_name':
                value = row.get(csv_col)
                
                # Handle NaN values
                if pd.isna(value):
                    value = None
                elif model_field in ['in_habitable_zone', 'potentially_habitable']:
                    value = bool(value)
                elif model_field == 'habitability_class':
                    # Ensure valid classification
                    value = str(value) if value in ['NON_HABITABLE', 'HABITABILITY_ZONE', 'POTENTIALLY_HABITABLE'] else 'NON_HABITABLE'
                
                planet_data[model_field] = value
        
        # Create planet object
        planets_to_create.append(Exoplanet(**planet_data))
        created_count += 1
        
        # Bulk create in batches of 1000
        if len(planets_to_create) >= 1000:
            Exoplanet.objects.bulk_create(planets_to_create, ignore_conflicts=True)
            print(f"   ✅ Saved batch of {len(planets_to_create)} planets")
            planets_to_create = []
    
    # Create remaining planets
    if planets_to_create:
        Exoplanet.objects.bulk_create(planets_to_create, ignore_conflicts=True)
        print(f"   ✅ Saved final batch of {len(planets_to_create)} planets")
    
    # Update mission planet count
    mission.total_planets = mission.planets.count()
    mission.save()
    
    print(f"   ✅ Created {created_count} new planets")
    print(f"   ⏭️  Skipped {skipped_count} existing planets")
    print(f"   📊 Total planets for {mission_name}: {mission.total_planets}")
    
    return created_count


def main():
    """Main function to load all data."""
    print("\n" + "🚀"*40)
    print("EXOPLANET DATA LOADER")
    print("Loading processed data into PostgreSQL database")
    print("🚀"*40)
    
    try:
        # Create missions
        create_missions()
        
        # Load planet data for each mission
        print("\n" + "="*80)
        print("LOADING EXOPLANET DATA")
        print("="*80)
        
        total_created = 0
        
        for mission_name, csv_file in DATA_FILES.items():
            # Use capitalized mission name (K2, Kepler, TESS)
            mission_key = mission_name.upper() if mission_name == 'k2' or mission_name == 'tess' else mission_name.capitalize()
            created = load_planet_data(mission_key, csv_file)
            total_created += created
        
        # Final statistics
        print("\n" + "="*80)
        print("SUMMARY")
        print("="*80)
        print(f"✅ Total new exoplanets loaded: {total_created}")
        print(f"📊 Total exoplanets in database: {Exoplanet.objects.count()}")
        print(f"📊 Potentially habitable planets: {Exoplanet.objects.filter(potentially_habitable=True).count()}")
        print(f"📊 In habitable zone: {Exoplanet.objects.filter(in_habitable_zone=True).count()}")
        
        # Statistics by mission
        print("\n📊 Planets by Mission:")
        for mission in Mission.objects.all():
            print(f"   {mission.name}: {mission.planets.count()} planets")
        
        print("\n✅ Data loading complete!")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return 1
    
    return 0


if __name__ == '__main__':
    sys.exit(main())
