"""
Physics Habitability Scoring
============================

The deterministic, non-ML half of the habitability score.

Everything here is a closed-form function of the resolved planet parameters -
no model, no training data, no randomness. It is auditable by hand, which is
the point: it anchors the displayed score to physics that a reviewer can
check with a calculator, and it is what the classifier is blended against in
api/habitability_scorer.py.

Constants are imported from api/physics.py so the score, the ML features and
the catalogue label can never drift apart.

What this can and cannot separate
---------------------------------
Equilibrium temperature assumes no atmosphere. Venus and Earth are nearly
indistinguishable in transit data - same size, similar orbit - and Venus's
real 737 K surface comes from a greenhouse effect that transit photometry
cannot see. This scorer separates "physically plausible" from "obviously
hostile". It does not, and cannot, identify life or even surface conditions.
Reference values are asserted in tests/test_scoring.py so this stays true.
"""

import numpy as np

from . import physics as P

# --- Earth reference ---------------------------------------------------------

EARTH_RADIUS = 1.0        # Earth radii
EARTH_TEQ = 255.0         # K, equilibrium temperature at Bond albedo 0.3
EARTH_INSOLATION = 1.0    # Earth flux

# Schulze-Makuch et al. (2011) ESI exponents.
ESI_WEIGHT_RADIUS = 0.57
ESI_WEIGHT_TEMPERATURE = 5.58

# Habitability multiplier by spectral class. K and G dwarfs are the most
# favourable: long-lived, stable, wide habitable zones. M dwarfs are penalised
# for flare activity and tidal locking; O/B/A for short main-sequence lifetimes.
STELLAR_TYPE_FACTOR = {
    'O': 0.10, 'B': 0.30, 'A': 0.60, 'F': 0.85,
    'G': 1.00, 'K': 0.95, 'M': 0.70,
}

# Weight of the habitable-zone term. A planet outside the HZ keeps at most
# HZ_FLOOR of its similarity score, so orbital placement can veto an
# otherwise Earth-sized planet.
HZ_FLOOR = 0.20

# Reference planets used by the calibration script and the test suite.
REFERENCE_PLANETS = {
    'Earth': {'pl_rade': 1.0, 'pl_eqt': 255.0, 'pl_insol': 1.0,
              'pl_orbper': 365.25, 'pl_orbsmax': 1.0,
              'st_teff': 5772.0, 'st_rad': 1.0, 'st_mass': 1.0},
    'Mars': {'pl_rade': 0.532, 'pl_eqt': 210.0, 'pl_insol': 0.431,
             'pl_orbper': 686.98, 'pl_orbsmax': 1.524,
             'st_teff': 5772.0, 'st_rad': 1.0, 'st_mass': 1.0},
    'Venus': {'pl_rade': 0.949, 'pl_eqt': 232.0, 'pl_insol': 1.911,
              'pl_orbper': 224.70, 'pl_orbsmax': 0.723,
              'st_teff': 5772.0, 'st_rad': 1.0, 'st_mass': 1.0},
    'Venus (true surface temperature)': {
        'pl_rade': 0.949, 'pl_eqt': 737.0, 'pl_insol': 1.911,
        'pl_orbper': 224.70, 'pl_orbsmax': 0.723,
        'st_teff': 5772.0, 'st_rad': 1.0, 'st_mass': 1.0},
    'Hot Jupiter': {'pl_rade': 11.2, 'pl_eqt': 1400.0, 'pl_insol': 900.0,
                    'pl_orbper': 3.5, 'pl_orbsmax': 0.045,
                    'st_teff': 6000.0, 'st_rad': 1.2, 'st_mass': 1.1},
    'Frozen rock': {'pl_rade': 1.0, 'pl_insol': 0.001, 'pl_orbper': 9000.0,
                    'st_teff': 5772.0, 'st_rad': 1.0, 'st_mass': 1.0},
}


# --- Earth Similarity Index --------------------------------------------------

def _esi_term(value, reference, weight, n_terms):
    """
    One factor of the Schulze-Makuch ESI:

        [1 - |(x - x0) / (x + x0)|] ^ (w / n)
    """
    if value is None or value <= 0:
        return None
    similarity = 1.0 - abs((value - reference) / (value + reference))
    return float(max(similarity, 0.0) ** (weight / n_terms))


def esi_radius(pl_rade):
    """Radius component of the ESI."""
    return _esi_term(pl_rade, EARTH_RADIUS, ESI_WEIGHT_RADIUS, 2)


def esi_temperature(pl_eqt):
    """Temperature component of the ESI."""
    return _esi_term(pl_eqt, EARTH_TEQ, ESI_WEIGHT_TEMPERATURE, 2)


def earth_similarity_index(pl_rade, pl_eqt):
    """
    Two-parameter ESI over radius and equilibrium temperature.

    The four-parameter form also uses bulk density and escape velocity, which
    need a mass measurement; fewer than 11% of catalogue rows carry one, so
    the two-parameter form is what the data supports. Published exponents are
    kept as-is and renormalised over two terms. Earth returns exactly 1.0 and
    Mars returns ~0.68, against the PHL catalogue's 0.70.
    """
    radius_term = esi_radius(pl_rade)
    temperature_term = esi_temperature(pl_eqt)
    if radius_term is None or temperature_term is None:
        return None
    return float(radius_term * temperature_term)


# --- Habitable zone ----------------------------------------------------------

def hz_membership(pl_insol):
    """
    Smooth membership of the conservative habitable zone, in flux units.

    1.0 between the maximum-greenhouse and runaway-greenhouse limits
    (Kopparapu et al. 2013: 0.356 to 1.107 Earth flux). Outside, it decays -
    linearly towards zero flux on the cold side, exponentially on the hot side,
    where a modest flux excess drives a runaway greenhouse quickly.
    """
    if pl_insol is None or pl_insol <= 0:
        return 0.0
    if P.HZ_FLUX_OUTER <= pl_insol <= P.HZ_FLUX_INNER:
        return 1.0
    if pl_insol < P.HZ_FLUX_OUTER:
        return float(np.clip(pl_insol / P.HZ_FLUX_OUTER, 0.0, 1.0))
    return float(np.exp(-(pl_insol - P.HZ_FLUX_INNER) / 1.5))


def stellar_factor(stellar_type):
    """Habitability multiplier for a spectral class."""
    if not stellar_type:
        return STELLAR_TYPE_FACTOR['G']
    return STELLAR_TYPE_FACTOR.get(str(stellar_type)[0].upper(), 0.80)


# --- Composite physics score -------------------------------------------------

def similarity_terms(params):
    """
    The three smooth similarity terms, identical to the model features of the
    same name in api/physics.py. Sharing them keeps the physics score and the
    classifier reasoning over the same quantities.
    """
    pl_rade = params.get('pl_rade')
    pl_eqt = params.get('pl_eqt')
    pl_insol = params.get('pl_insol')
    return {
        'radius_similarity': float(np.clip(
            1.0 - abs((pl_rade if pl_rade else 1.0) - 1.0) / 10.0, 0.0, 1.0)),
        'temp_similarity': float(np.clip(
            1.0 - abs((pl_eqt if pl_eqt else 255.0) - 255.0) / 500.0, 0.0, 1.0)),
        'insol_similarity': float(np.clip(
            1.0 - abs((pl_insol if pl_insol else 1.0) - 1.0) / 10.0, 0.0, 1.0)),
    }


def physics_score(params, breakdown=False):
    """
    Continuous 0-1 physics habitability score.

        score = geometric_mean(radius, temperature, flux similarity)
                * (HZ_FLOOR + (1 - HZ_FLOOR) * hz_membership)
                * stellar_factor

    The geometric mean means any single disqualifying property drags the whole
    score down - a Jupiter-radius planet scores zero regardless of its orbit,
    because radius_similarity is zero. The habitable-zone term lets orbital
    placement veto an otherwise Earth-like planet, and the stellar term
    discounts hosts that are short-lived or violent.

    Pass breakdown=True to get the components as well as the score.
    """
    terms = similarity_terms(params)
    geometric_mean = float(
        (terms['radius_similarity']
         * terms['temp_similarity']
         * terms['insol_similarity']) ** (1.0 / 3.0)
    )

    membership = hz_membership(params.get('pl_insol'))
    hz_term = HZ_FLOOR + (1.0 - HZ_FLOOR) * membership

    stellar_type = params.get('stellar_type') or P.stellar_type_from_teff(
        params.get('st_teff'))
    star_term = stellar_factor(stellar_type)

    score = float(np.clip(geometric_mean * hz_term * star_term, 0.0, 1.0))

    if not breakdown:
        return score

    return score, {
        **terms,
        'similarity_geometric_mean': round(geometric_mean, 4),
        'hz_membership': round(membership, 4),
        'hz_term': round(hz_term, 4),
        'stellar_type': stellar_type,
        'stellar_factor': round(star_term, 4),
    }
