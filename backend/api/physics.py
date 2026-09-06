"""
Canonical Physics & Feature Engineering
=======================================

Single source of truth for:
  1. Canonicalising mission-specific column names to one schema
  2. Deriving missing physical quantities from first principles
  3. Building the ML feature vector
  4. Assigning the rule-based habitability label

BOTH the training pipeline (scripts/train_models.py) and the serving path
(api/habitability_scorer.py) import from this module. That is deliberate:
it makes train/serve feature skew structurally impossible. If you change a
formula here, training and inference change together.

Conventions
-----------
Equilibrium temperature uses T_eq = 255.0 * S^(1/4), i.e. Bond albedo 0.3.
This was recovered empirically from the NASA archive columns rather than
assumed - the Kepler KOI table has median T_eq / S^0.25 = 255.03 across
9,200 rows. Earth (S = 1) therefore maps to 255 K, matching the reference
value used throughout the scoring code.
"""

import numpy as np

# --- Physical constants ------------------------------------------------------

T_SUN = 5772.0          # Solar effective temperature (K)
TEQ_COEFF = 255.0       # T_eq = TEQ_COEFF * S^(1/4), Bond albedo 0.3
AU_PER_SOLAR_RADIUS = 0.00465047

# Kopparapu et al. (2013) conservative habitable zone, in units of Earth flux.
# Runaway greenhouse (inner) and maximum greenhouse (outer).
HZ_FLUX_INNER = 1.107
HZ_FLUX_OUTER = 0.356


# --- Canonical schema --------------------------------------------------------

# The nine observables the API accepts and the training data provides.
CORE_INPUTS = [
    'pl_rade', 'pl_eqt', 'pl_insol', 'pl_orbper', 'pl_orbsmax',
    'pl_orbeccen', 'st_teff', 'st_rad', 'st_mass',
]

# Mission-specific column names -> canonical names.
MISSION_COLUMN_MAP = {
    'kepler': {
        'koi_prad': 'pl_rade', 'koi_teq': 'pl_eqt', 'koi_insol': 'pl_insol',
        'koi_period': 'pl_orbper', 'koi_sma': 'pl_orbsmax', 'koi_eccen': 'pl_orbeccen',
        'koi_steff': 'st_teff', 'koi_srad': 'st_rad', 'koi_smass': 'st_mass',
    },
    'k2': {},    # k2 already uses canonical pl_*/st_* names
    'tess': {},  # tess uses canonical names; st_mass and pl_orbsmax are absent and get derived
}

# Reverse map so the scorer can accept koi_* input from callers.
ALIAS_TO_CANONICAL = {}
for _mission_map in MISSION_COLUMN_MAP.values():
    ALIAS_TO_CANONICAL.update(_mission_map)


# The exact feature vector fed to the model, in order. Every entry is
# computable from CORE_INPUTS alone, so the serving path can always
# reproduce all of them - no zero-filling, ever.
#
# Deliberately ABSENT: radius_similarity, temp_similarity, insol_similarity.
# Each is a strictly monotone function of |x - x_earth| for a quantity that is
# already a feature, so they add no information a tree cannot recover with two
# splits. They do add a failure mode: all three saturate at exactly 1.0 for
# Earth, and no catalogue object reaches 1.0 (the maxima are 0.997/0.998/0.999).
# With them in the feature set the model had never seen that corner, and the
# trees extrapolated Earth itself to HABITABILITY_ZONE while a planet 3% off
# Earth scored POTENTIALLY_HABITABLE. They remain in api/scoring.py, where the
# physics score is a closed-form expression and extrapolation is not a concern.
FEATURE_ORDER = [
    # Observables (possibly physics-derived)
    'pl_rade', 'pl_eqt', 'pl_insol', 'pl_orbper', 'pl_orbsmax', 'pl_orbeccen',
    'st_teff', 'st_rad', 'st_mass', 'st_lum',
    # Log transforms - log1p throughout, matching training
    'pl_orbper_log', 'pl_orbsmax_log', 'pl_insol_log',
    # Geometry
    'planet_star_radius_ratio', 'orbit_stellar_radii',
    # Continuous habitable-zone position (Kopparapu boundaries in AU - not a
    # transform of any single feature, so it is kept)
    'hz_position',
    # Provenance: 1.0 where the value was physically derived rather than measured.
    # These let the model learn how much to trust each input, which is what
    # gives it graceful degradation on incomplete catalogue rows.
    'imputed_pl_rade', 'imputed_pl_eqt', 'imputed_pl_insol', 'imputed_pl_orbper',
    'imputed_pl_orbsmax', 'imputed_pl_orbeccen', 'imputed_st_teff',
    'imputed_st_rad', 'imputed_st_mass',
]

N_FEATURES = len(FEATURE_ORDER)


# --- Physics derivations -----------------------------------------------------

def stellar_luminosity(st_rad, st_teff):
    """L/L_sun = (R/R_sun)^2 * (T/T_sun)^4  (Stefan-Boltzmann)."""
    if st_rad is None or st_teff is None or st_rad <= 0 or st_teff <= 0:
        return None
    return (st_rad ** 2) * ((st_teff / T_SUN) ** 4)


def semi_major_axis(pl_orbper_days, st_mass):
    """Kepler's third law: a^3 = M * P^2, with a in AU, M in M_sun, P in years."""
    if not pl_orbper_days or pl_orbper_days <= 0 or not st_mass or st_mass <= 0:
        return None
    period_years = pl_orbper_days / 365.25
    return float((st_mass * period_years ** 2) ** (1.0 / 3.0))


def orbital_period(pl_orbsmax_au, st_mass):
    """Inverse of Kepler's third law: P (days) from a (AU) and M (M_sun)."""
    if not pl_orbsmax_au or pl_orbsmax_au <= 0 or not st_mass or st_mass <= 0:
        return None
    return float(np.sqrt(pl_orbsmax_au ** 3 / st_mass) * 365.25)


def insolation(st_lum, pl_orbsmax_au):
    """S/S_earth = L / a^2 (inverse-square law)."""
    if not st_lum or st_lum <= 0 or not pl_orbsmax_au or pl_orbsmax_au <= 0:
        return None
    return float(st_lum / (pl_orbsmax_au ** 2))


def equilibrium_temperature(pl_insol):
    """T_eq = 255 K * S^(1/4), Bond albedo 0.3 (see module docstring)."""
    if not pl_insol or pl_insol <= 0:
        return None
    return float(TEQ_COEFF * pl_insol ** 0.25)


def stellar_mass_from_luminosity(st_lum):
    """
    Mass-luminosity relation M ~ L^(1/4).

    Chosen by fitting against 9,200 Kepler rows that carry both koi_smass and
    the radius/temperature needed for L: median relative error 7.2%, versus
    8.9% for the textbook L^(1/3.5) and 9.6% for M ~ R.
    """
    if not st_lum or st_lum <= 0:
        return None
    return float(np.clip(st_lum ** 0.25, 0.05, 50.0))


def stellar_type_from_teff(st_teff):
    """Morgan-Keenan spectral class from effective temperature."""
    if not st_teff or st_teff <= 0:
        return 'G'
    if st_teff >= 30000:
        return 'O'
    if st_teff >= 10000:
        return 'B'
    if st_teff >= 7500:
        return 'A'
    if st_teff >= 6000:
        return 'F'
    if st_teff >= 5200:
        return 'G'
    if st_teff >= 3700:
        return 'K'
    return 'M'


def habitable_zone_au(st_lum):
    """Conservative HZ inner/outer edges in AU from stellar luminosity."""
    if not st_lum or st_lum <= 0:
        return None, None
    return (float(np.sqrt(st_lum / HZ_FLUX_INNER)),
            float(np.sqrt(st_lum / HZ_FLUX_OUTER)))


# --- Canonicalisation + imputation -------------------------------------------

def _clean(value):
    """Coerce to a finite float, or None."""
    if value is None:
        return None
    try:
        value = float(value)
    except (TypeError, ValueError):
        return None
    if not np.isfinite(value):
        return None
    return value


def canonicalise(raw_params):
    """Map any mission's column names onto the canonical schema."""
    params = {}
    for key, value in raw_params.items():
        canonical = ALIAS_TO_CANONICAL.get(key, key)
        cleaned = _clean(value)
        if cleaned is not None:
            params[canonical] = cleaned
    if raw_params.get('stellar_type'):
        params['stellar_type'] = str(raw_params['stellar_type'])
    return params


def resolve_physics(raw_params):
    """
    Fill in whatever physics can be derived from what was supplied.

    Returns (params, imputed) where `imputed` maps each core input to True if
    its value was derived rather than provided. Derivation runs in dependency
    order and iterates twice so that, for example, a mass derived from
    luminosity can then feed the semi-major-axis calculation.

    Nothing is median-filled. A quantity that cannot be derived stays absent
    and is later replaced by a neutral sentinel with its imputed flag set, so
    the model always knows the difference between "measured" and "unknown".
    """
    params = canonicalise(raw_params)

    # A value counts as "supplied" only when it is present AND positive. Zero
    # means "no data" for every one of these quantities - a planet cannot have
    # zero radius or orbit a star of zero temperature.
    #
    # Eccentricity is the interesting case and the rule is deliberate: all
    # 9,201 Kepler rows report koi_eccen as exactly 0.0, because the KOI
    # pipeline fixes eccentricity at zero rather than fitting it. A reported
    # 0.0 therefore means "assumed circular", not "measured as circular", and
    # treating it as a measurement would be wrong. Genuinely fitted, non-zero
    # eccentricities (305 K2 rows) are honoured.
    supplied = {k for k in CORE_INPUTS if k in params and params[k] > 0}

    for _ in range(2):
        st_lum = stellar_luminosity(params.get('st_rad'), params.get('st_teff'))
        if st_lum is not None:
            params['st_lum'] = st_lum

        if not params.get('st_mass'):
            derived = stellar_mass_from_luminosity(params.get('st_lum'))
            if derived is not None:
                params['st_mass'] = derived

        if not params.get('pl_orbsmax'):
            derived = semi_major_axis(params.get('pl_orbper'), params.get('st_mass'))
            if derived is not None:
                params['pl_orbsmax'] = derived
        if not params.get('pl_orbper'):
            derived = orbital_period(params.get('pl_orbsmax'), params.get('st_mass'))
            if derived is not None:
                params['pl_orbper'] = derived

        if not params.get('pl_insol'):
            derived = insolation(params.get('st_lum'), params.get('pl_orbsmax'))
            if derived is not None:
                params['pl_insol'] = derived

        if not params.get('pl_eqt'):
            derived = equilibrium_temperature(params.get('pl_insol'))
            if derived is not None:
                params['pl_eqt'] = derived

    # Eccentricity: absent overwhelmingly means "not measured"; circular is
    # the correct prior for transiting planets, so 0.0 is a physical default
    # rather than a statistical fill.
    if 'pl_orbeccen' not in params:
        params['pl_orbeccen'] = 0.0

    if 'stellar_type' not in params:
        params['stellar_type'] = stellar_type_from_teff(params.get('st_teff'))

    imputed = {key: (key not in supplied) for key in CORE_INPUTS}
    return params, imputed


# --- Feature construction ----------------------------------------------------

# Neutral sentinels for quantities that could not be measured or derived.
# Paired with the imputed_* flag so the model can discount them.
_SENTINELS = {
    'pl_rade': 1.0, 'pl_eqt': 255.0, 'pl_insol': 1.0, 'pl_orbper': 365.25,
    'pl_orbsmax': 1.0, 'pl_orbeccen': 0.0, 'st_teff': 5772.0,
    'st_rad': 1.0, 'st_mass': 1.0,
}


def build_features(raw_params):
    """
    Build the ordered feature vector for a single object.

    Returns (features_dict, resolved_params, imputed_flags).
    Every key in FEATURE_ORDER is present and finite.
    """
    params, imputed = resolve_physics(raw_params)

    for key, sentinel in _SENTINELS.items():
        value = params.get(key)
        if value is None or (value <= 0 and key != 'pl_orbeccen'):
            params[key] = sentinel
            imputed[key] = True

    st_lum = params.get('st_lum') or stellar_luminosity(params['st_rad'], params['st_teff']) or 1.0
    params['st_lum'] = st_lum

    pl_rade = params['pl_rade']
    pl_eqt = params['pl_eqt']
    pl_insol = params['pl_insol']
    pl_orbper = params['pl_orbper']
    pl_orbsmax = params['pl_orbsmax']

    features = {
        'pl_rade': pl_rade,
        'pl_eqt': pl_eqt,
        'pl_insol': pl_insol,
        'pl_orbper': pl_orbper,
        'pl_orbsmax': pl_orbsmax,
        'pl_orbeccen': params['pl_orbeccen'],
        'st_teff': params['st_teff'],
        'st_rad': params['st_rad'],
        'st_mass': params['st_mass'],
        'st_lum': st_lum,

        # log1p - identical in training and serving
        'pl_orbper_log': float(np.log1p(max(pl_orbper, 0.0))),
        'pl_orbsmax_log': float(np.log1p(max(pl_orbsmax, 0.0))),
        'pl_insol_log': float(np.log1p(max(pl_insol, 0.0))),

        'planet_star_radius_ratio': float(pl_rade / (params['st_rad'] * 109.2 + 1e-9)),
        'orbit_stellar_radii': float(
            pl_orbsmax / (params['st_rad'] * AU_PER_SOLAR_RADIUS + 1e-9)
        ),
    }

    # Continuous HZ position: 0 at the inner edge, 1 at the outer edge.
    hz_inner, hz_outer = habitable_zone_au(st_lum)
    if hz_inner and hz_outer and hz_outer > hz_inner:
        features['hz_position'] = float(
            np.clip((pl_orbsmax - hz_inner) / (hz_outer - hz_inner), -3.0, 3.0)
        )
    else:
        features['hz_position'] = 0.0

    for key in CORE_INPUTS:
        features[f'imputed_{key}'] = 1.0 if imputed.get(key) else 0.0

    # Guarantee the contract: every feature present, ordered, finite.
    vector = {}
    for name in FEATURE_ORDER:
        value = features.get(name, 0.0)
        if value is None or not np.isfinite(value):
            value = 0.0
        vector[name] = float(value)

    return vector, params, imputed


# --- Habitability label ------------------------------------------------------

# The published, auditable definition of each class. This is a physics *proxy*,
# not observed ground truth - no exoplanet has confirmed habitability. Both the
# catalogue labels and the ML training targets come from this one definition,
# so the site and the model can never disagree about what a class means.
LABEL_RULE = {
    'POTENTIALLY_HABITABLE': {
        'pl_rade': (0.5, 2.0),
        'pl_insol': (0.25, 4.0),
        'pl_eqt': (180.0, 310.0),
        'pl_orbper': (10.0, 500.0),
    },
    'HABITABILITY_ZONE': {
        'pl_insol': (0.25, 4.0),
        'pl_eqt': (200.0, 350.0),
    },
}

CLASS_NAMES = ['HABITABILITY_ZONE', 'NON_HABITABLE', 'POTENTIALLY_HABITABLE']


def assign_label(params):
    """
    Apply the documented rule to resolved parameters.

    POTENTIALLY_HABITABLE requires all four criteria.
    HABITABILITY_ZONE requires either the flux or the temperature criterion.
    Everything else is NON_HABITABLE.
    """
    def within(value, bounds):
        return value is not None and bounds[0] <= value <= bounds[1]

    rade = params.get('pl_rade')
    insol = params.get('pl_insol')
    eqt = params.get('pl_eqt')
    orbper = params.get('pl_orbper')

    ph = LABEL_RULE['POTENTIALLY_HABITABLE']
    if (within(rade, ph['pl_rade']) and within(insol, ph['pl_insol'])
            and within(eqt, ph['pl_eqt']) and within(orbper, ph['pl_orbper'])):
        return 'POTENTIALLY_HABITABLE'

    hz = LABEL_RULE['HABITABILITY_ZONE']
    if within(insol, hz['pl_insol']) or within(eqt, hz['pl_eqt']):
        return 'HABITABILITY_ZONE'

    return 'NON_HABITABLE'
