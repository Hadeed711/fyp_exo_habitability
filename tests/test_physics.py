"""
Tests for api/physics.py - derivations, feature construction, labelling.

These are the guarantees the rest of the system is built on: if the feature
vector can contain a NaN, or if training and serving can disagree about a
transform, everything downstream is unsound.
"""

import numpy as np
import pytest

from api import physics as P


# --- Physics derivations -----------------------------------------------------

class TestDerivations:
    """Closed-form physics, checked against known solar-system values."""

    def test_earth_reconstructs_exactly_from_period_and_star(self):
        """
        The end-to-end derivation chain, validated on the one case everyone
        can check: Earth's orbital period around the Sun must give back
        1 AU, 1 Earth flux and 255 K.
        """
        resolved, imputed = P.resolve_physics({
            'pl_rade': 1.0, 'pl_orbper': 365.25,
            'st_teff': P.T_SUN, 'st_rad': 1.0,
        })
        assert resolved['pl_orbsmax'] == pytest.approx(1.0, rel=1e-3)
        assert resolved['pl_insol'] == pytest.approx(1.0, rel=1e-3)
        assert resolved['pl_eqt'] == pytest.approx(255.0, rel=1e-3)
        assert resolved['st_mass'] == pytest.approx(1.0, rel=1e-3)

        # ...and the values it produced are correctly flagged as derived.
        assert imputed['pl_insol'] and imputed['pl_eqt'] and imputed['pl_orbsmax']
        assert not imputed['pl_rade'] and not imputed['st_teff']

    def test_stellar_luminosity_stefan_boltzmann(self):
        assert P.stellar_luminosity(1.0, P.T_SUN) == pytest.approx(1.0, rel=1e-6)
        # Double the radius -> four times the luminosity
        assert P.stellar_luminosity(2.0, P.T_SUN) == pytest.approx(4.0, rel=1e-6)
        # Double the temperature -> sixteen times the luminosity
        assert P.stellar_luminosity(1.0, 2 * P.T_SUN) == pytest.approx(16.0, rel=1e-6)

    def test_keplers_third_law_round_trips(self):
        """a -> P -> a must return the original value."""
        for period, mass in [(365.25, 1.0), (88.0, 1.0), (11.86 * 365.25, 1.0), (10.0, 0.3)]:
            axis = P.semi_major_axis(period, mass)
            assert P.orbital_period(axis, mass) == pytest.approx(period, rel=1e-9)

    def test_jupiter_semi_major_axis(self):
        """Jupiter: 11.86 years -> 5.2 AU."""
        assert P.semi_major_axis(11.86 * 365.25, 1.0) == pytest.approx(5.2, rel=0.01)

    def test_insolation_inverse_square(self):
        assert P.insolation(1.0, 1.0) == pytest.approx(1.0)
        assert P.insolation(1.0, 2.0) == pytest.approx(0.25)
        assert P.insolation(4.0, 2.0) == pytest.approx(1.0)

    def test_equilibrium_temperature_convention(self):
        """T_eq = 255 * S^0.25, the Bond-albedo-0.3 convention."""
        assert P.equilibrium_temperature(1.0) == pytest.approx(255.0)
        assert P.equilibrium_temperature(16.0) == pytest.approx(510.0)

    def test_spectral_classes(self):
        assert P.stellar_type_from_teff(P.T_SUN) == 'G'
        assert P.stellar_type_from_teff(3000) == 'M'
        assert P.stellar_type_from_teff(4500) == 'K'
        assert P.stellar_type_from_teff(6500) == 'F'
        assert P.stellar_type_from_teff(9000) == 'A'

    def test_habitable_zone_brackets_earth(self):
        inner, outer = P.habitable_zone_au(1.0)
        assert inner < 1.0 < outer, "Earth must sit inside the Sun's habitable zone"

    def test_derivations_reject_invalid_input(self):
        """Zero and negative inputs return None rather than NaN or a crash."""
        assert P.stellar_luminosity(0, 5000) is None
        assert P.semi_major_axis(0, 1.0) is None
        assert P.insolation(1.0, 0) is None
        assert P.equilibrium_temperature(-1) is None
        assert P.stellar_mass_from_luminosity(0) is None


# --- Feature vector contract -------------------------------------------------

class TestFeatureVector:
    """
    The contract the trained models rely on. A violation here is exactly the
    class of bug that made the previous models useless: they were served
    vectors containing NaN and values as extreme as -5232 against training
    data scaled to [0, 1].
    """

    CASES = [
        {},
        {'pl_rade': 1.0},
        {'pl_eqt': 255.0},
        {'pl_rade': 1.0, 'pl_orbper': 365.25, 'st_teff': 5772, 'st_rad': 1.0},
        {'pl_rade': 11.2, 'pl_eqt': 1400, 'pl_insol': 900, 'pl_orbper': 3.5},
        {'pl_rade': 0.0, 'pl_eqt': 0.0, 'pl_insol': 0.0},
        {'pl_rade': 1e6, 'pl_eqt': 1e6, 'pl_insol': 1e9, 'pl_orbper': 1e9},
        {'pl_rade': float('nan'), 'pl_eqt': float('inf')},
        {'koi_prad': 1.0, 'koi_teq': 255, 'koi_insol': 1.0, 'koi_period': 365.25},
    ]

    @pytest.mark.parametrize('params', CASES)
    def test_vector_is_always_complete_and_finite(self, params):
        vector, _, _ = P.build_features(params)
        assert list(vector.keys()) == list(P.FEATURE_ORDER)
        assert len(vector) == P.N_FEATURES
        for name, value in vector.items():
            assert isinstance(value, float), f"{name} is not a float"
            assert np.isfinite(value), f"{name} is not finite: {value}"

    def test_empty_input_does_not_crash(self):
        """No inputs at all still produces a scoreable vector."""
        vector, resolved, imputed = P.build_features({})
        assert len(vector) == P.N_FEATURES
        assert all(imputed.values()), "everything should be flagged as derived"

    def test_kepler_aliases_match_canonical_names(self):
        """koi_* input must produce an identical vector to pl_*/st_* input."""
        canonical, _, _ = P.build_features({
            'pl_rade': 1.5, 'pl_eqt': 260.0, 'pl_insol': 1.1,
            'pl_orbper': 200.0, 'st_teff': 5400.0, 'st_rad': 0.9, 'st_mass': 0.95,
        })
        aliased, _, _ = P.build_features({
            'koi_prad': 1.5, 'koi_teq': 260.0, 'koi_insol': 1.1,
            'koi_period': 200.0, 'koi_steff': 5400.0, 'koi_srad': 0.9, 'koi_smass': 0.95,
        })
        assert canonical == aliased

    def test_log_transform_is_log1p_not_log10(self):
        """
        Training uses np.log1p. A previous version of the serving path used
        np.log10, so a 365-day period was fed to the model as 2.56 where the
        scaler expected 5.90.
        """
        vector, _, _ = P.build_features({
            'pl_rade': 1.0, 'pl_orbper': 365.25, 'pl_insol': 1.0,
            'pl_orbsmax': 1.0, 'st_teff': 5772, 'st_rad': 1.0, 'st_mass': 1.0,
        })
        assert vector['pl_orbper_log'] == pytest.approx(np.log1p(365.25))
        assert vector['pl_orbper_log'] != pytest.approx(np.log10(365.25))

    def test_no_label_rule_flags_in_feature_set(self):
        """
        Features that restate a clause of the labelling rule leak the answer.
        Their presence previously produced a meaningless 100% accuracy.
        """
        banned = {'in_hz_conservative', 'in_hz_optimistic',
                  'is_rocky', 'is_super_earth', 'is_earth_sized'}
        assert not banned & set(P.FEATURE_ORDER)

    def test_no_catalogue_artefacts_in_feature_set(self):
        """Sky position, magnitudes and error columns cannot cause habitability."""
        for name in P.FEATURE_ORDER:
            assert not name.endswith(('err1', 'err2', 'lim')), name
            assert name not in {'ra', 'dec', 'glat', 'glon', 'elat', 'elon'}, name
            assert 'mag' not in name, name

    def test_every_feature_derives_from_core_inputs(self):
        """
        The serving guarantee: supplying only the documented observables must
        populate the whole vector, so nothing is ever zero-filled.
        """
        full = {'pl_rade': 1.0, 'pl_eqt': 255.0, 'pl_insol': 1.0,
                'pl_orbper': 365.25, 'pl_orbsmax': 1.0, 'pl_orbeccen': 0.05,
                'st_teff': 5772.0, 'st_rad': 1.0, 'st_mass': 1.0}
        vector, _, imputed = P.build_features(full)
        assert not any(imputed.values()), "nothing should be flagged derived"
        non_flag = [v for k, v in vector.items() if not k.startswith('imputed_')]
        assert any(value != 0.0 for value in non_flag)

    def test_zero_eccentricity_counts_as_assumed_not_measured(self):
        """
        All 9,201 Kepler rows report koi_eccen as exactly 0.0 because the KOI
        pipeline fixes it rather than fitting it. Treating that as a
        measurement would tell the model something the data does not support,
        so a reported 0.0 stays flagged as derived while a fitted non-zero
        eccentricity is honoured.
        """
        _, _, assumed = P.build_features({'pl_rade': 1.0, 'pl_orbeccen': 0.0})
        assert assumed['pl_orbeccen'] is True

        _, resolved_flags, measured = P.build_features(
            {'pl_rade': 1.0, 'pl_orbeccen': 0.21})
        assert measured['pl_orbeccen'] is False

    def test_zero_means_no_data_for_physical_quantities(self):
        """A planet cannot have zero radius or orbit a zero-temperature star."""
        _, resolved, imputed = P.build_features(
            {'pl_rade': 0.0, 'st_teff': 0.0, 'st_rad': 0.0})
        assert imputed['pl_rade'] and imputed['st_teff'] and imputed['st_rad']
        assert resolved['pl_rade'] > 0 and resolved['st_teff'] > 0

    def test_imputed_flags_are_binary_and_cover_core_inputs(self):
        vector, _, _ = P.build_features({'pl_rade': 1.0})
        for key in P.CORE_INPUTS:
            flag = vector[f'imputed_{key}']
            assert flag in (0.0, 1.0)
        assert vector['imputed_pl_rade'] == 0.0
        assert vector['imputed_st_teff'] == 1.0


# --- Labelling ---------------------------------------------------------------

class TestLabelRule:
    """The rule is the published definition of each class; it must be exact."""

    def test_earth_is_potentially_habitable(self):
        resolved, _ = P.resolve_physics({
            'pl_rade': 1.0, 'pl_eqt': 255.0, 'pl_insol': 1.0, 'pl_orbper': 365.25,
        })
        assert P.assign_label(resolved) == 'POTENTIALLY_HABITABLE'

    def test_hot_jupiter_is_non_habitable(self):
        resolved, _ = P.resolve_physics({
            'pl_rade': 11.2, 'pl_eqt': 1400.0, 'pl_insol': 900.0, 'pl_orbper': 3.5,
        })
        assert P.assign_label(resolved) == 'NON_HABITABLE'

    def test_mars_period_falls_outside_potentially_habitable(self):
        """Mars sits in the zone but its 687-day year exceeds the 500-day bound."""
        resolved, _ = P.resolve_physics({
            'pl_rade': 0.532, 'pl_eqt': 210.0, 'pl_insol': 0.431, 'pl_orbper': 686.98,
        })
        assert P.assign_label(resolved) == 'HABITABILITY_ZONE'

    def test_all_four_criteria_are_required(self):
        """Breaking any single criterion must drop the object out of the class."""
        base = {'pl_rade': 1.0, 'pl_eqt': 255.0, 'pl_insol': 1.0, 'pl_orbper': 365.25}
        assert P.assign_label(base) == 'POTENTIALLY_HABITABLE'
        for key, bad in [('pl_rade', 5.0), ('pl_insol', 50.0),
                         ('pl_eqt', 900.0), ('pl_orbper', 5.0)]:
            broken = dict(base, **{key: bad})
            assert P.assign_label(broken) != 'POTENTIALLY_HABITABLE', key

    def test_label_matches_documented_rule_bounds(self):
        """assign_label must agree with LABEL_RULE, which is what docs quote."""
        bounds = P.LABEL_RULE['POTENTIALLY_HABITABLE']
        inside = {'pl_rade': bounds['pl_rade'][0], 'pl_insol': bounds['pl_insol'][0],
                  'pl_eqt': bounds['pl_eqt'][0], 'pl_orbper': bounds['pl_orbper'][0]}
        assert P.assign_label(inside) == 'POTENTIALLY_HABITABLE'
        just_outside = dict(inside, pl_rade=bounds['pl_rade'][0] - 0.001)
        assert P.assign_label(just_outside) != 'POTENTIALLY_HABITABLE'

    def test_class_names_are_sorted_for_label_encoder(self):
        """LabelEncoder sorts alphabetically; CLASS_NAMES must match that order."""
        assert P.CLASS_NAMES == sorted(P.CLASS_NAMES)
