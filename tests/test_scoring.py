"""
Tests for api/scoring.py - the deterministic physics half of the score.

Reference values are asserted so a change to the scoring formula cannot ship
without someone consciously updating the expectation for Earth, Mars and Venus.
"""

import pytest

from api import physics as P
from api import scoring as S


def _score(name):
    resolved, _ = P.resolve_physics(S.REFERENCE_PLANETS[name])
    return S.physics_score(resolved)


class TestEarthSimilarityIndex:
    def test_earth_scores_exactly_one(self):
        assert S.earth_similarity_index(1.0, 255.0) == pytest.approx(1.0, abs=1e-9)

    def test_mars_matches_published_catalogue(self):
        """PHL lists Mars at ESI 0.70; the two-parameter form gives ~0.68."""
        assert S.earth_similarity_index(0.532, 210.0) == pytest.approx(0.68, abs=0.03)

    def test_hot_jupiter_is_near_zero(self):
        assert S.earth_similarity_index(11.2, 1400.0) < 0.1

    def test_esi_is_bounded(self):
        for radius in (0.1, 1.0, 5.0, 20.0):
            for temperature in (50.0, 255.0, 500.0, 2000.0):
                value = S.earth_similarity_index(radius, temperature)
                assert 0.0 <= value <= 1.0

    def test_invalid_input_returns_none(self):
        assert S.earth_similarity_index(0, 255) is None
        assert S.earth_similarity_index(1.0, 0) is None


class TestHabitableZone:
    def test_earth_is_inside(self):
        assert S.hz_membership(1.0) == 1.0

    def test_kopparapu_edges_are_inclusive(self):
        assert S.hz_membership(P.HZ_FLUX_INNER) == 1.0
        assert S.hz_membership(P.HZ_FLUX_OUTER) == 1.0

    def test_membership_decays_outside_and_is_bounded(self):
        assert 0.0 < S.hz_membership(2.0) < 1.0      # too hot
        assert 0.0 < S.hz_membership(0.2) < 1.0      # too cold
        assert S.hz_membership(900.0) < 0.01         # hot Jupiter
        assert S.hz_membership(0.0) == 0.0

    def test_hot_side_decays_faster_than_cold_side(self):
        """A runaway greenhouse is less forgiving than a slow freeze."""
        hot = S.hz_membership(P.HZ_FLUX_INNER * 3)
        cold = S.hz_membership(P.HZ_FLUX_OUTER / 3)
        assert hot < cold


class TestStellarFactor:
    def test_sun_like_is_optimal(self):
        assert S.stellar_factor('G') == 1.0
        assert S.stellar_factor('G') >= S.stellar_factor('K')

    def test_extremes_are_penalised(self):
        assert S.stellar_factor('M') < S.stellar_factor('K')
        assert S.stellar_factor('O') < S.stellar_factor('B') < S.stellar_factor('A')

    def test_unknown_type_falls_back(self):
        assert 0.0 < S.stellar_factor('Z') <= 1.0
        assert 0.0 < S.stellar_factor(None) <= 1.0


class TestPhysicsScore:
    """Reference values a reviewer can recompute by hand."""

    def test_earth_scores_one(self):
        assert _score('Earth') == pytest.approx(1.0, abs=1e-6)

    def test_hot_jupiter_scores_zero(self):
        assert _score('Hot Jupiter') == pytest.approx(0.0, abs=1e-6)

    def test_expected_ordering(self):
        """Earth > Mars > Venus > frozen rock > hot Jupiter."""
        assert (_score('Earth') > _score('Mars') > _score('Venus')
                > _score('Frozen rock') > _score('Hot Jupiter'))

    def test_venus_collapses_with_its_true_surface_temperature(self):
        """
        The documented limitation, asserted rather than asserted-in-prose:
        equilibrium temperature cannot see a greenhouse effect. Venus looks
        temperate at 232 K and hostile at its real 737 K.
        """
        equilibrium = _score('Venus')
        actual = _score('Venus (true surface temperature)')
        assert equilibrium > 0.5, "Venus looks plausible on transit data alone"
        assert actual < 0.3, "Venus is hostile once real surface temperature is used"

    def test_score_is_bounded_for_extreme_input(self):
        for params in [
            {'pl_rade': 0.0, 'pl_eqt': 0.0, 'pl_insol': 0.0},
            {'pl_rade': 1e6, 'pl_eqt': 1e6, 'pl_insol': 1e9},
            {},
        ]:
            resolved, _ = P.resolve_physics(params)
            assert 0.0 <= S.physics_score(resolved) <= 1.0

    def test_breakdown_components_are_reported(self):
        resolved, _ = P.resolve_physics(S.REFERENCE_PLANETS['Earth'])
        score, breakdown = S.physics_score(resolved, breakdown=True)
        assert score == pytest.approx(1.0, abs=1e-6)
        for key in ('radius_similarity', 'temp_similarity', 'insol_similarity',
                    'similarity_geometric_mean', 'hz_membership', 'stellar_factor'):
            assert key in breakdown

    def test_giant_radius_vetoes_the_score(self):
        """
        The geometric mean means one disqualifying property dominates: a
        Jupiter-radius planet scores zero however good its orbit is.
        """
        resolved, _ = P.resolve_physics({
            'pl_rade': 11.0, 'pl_eqt': 255.0, 'pl_insol': 1.0, 'pl_orbper': 365.25,
        })
        assert S.physics_score(resolved) == pytest.approx(0.0, abs=1e-6)

    def test_similarity_terms_match_the_documented_formulas(self):
        """scoring.similarity_terms is quoted in the docs; keep it honest."""
        terms = S.similarity_terms({'pl_rade': 1.0, 'pl_eqt': 255.0, 'pl_insol': 1.0})
        assert terms['radius_similarity'] == pytest.approx(1.0)
        assert terms['temp_similarity'] == pytest.approx(1.0)
        assert terms['insol_similarity'] == pytest.approx(1.0)

        terms = S.similarity_terms({'pl_rade': 2.0, 'pl_eqt': 355.0, 'pl_insol': 2.0})
        assert terms['radius_similarity'] == pytest.approx(0.9)   # 1 - 1/10
        assert terms['temp_similarity'] == pytest.approx(0.8)     # 1 - 100/500
        assert terms['insol_similarity'] == pytest.approx(0.9)    # 1 - 1/10
