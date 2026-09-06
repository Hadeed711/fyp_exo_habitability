"""
Tests for the planets API, focused on the confirmed/candidate provenance filter.

These require a populated database. They skip rather than fail when one is not
reachable, so the suite still runs offline — but when a database IS present the
counts are asserted exactly, because a silently-wrong filter here would let the
site claim a habitable planet is confirmed when it is not.
"""

import os
import sys
from pathlib import Path

import pytest

PROJECT_ROOT = Path(__file__).resolve().parent.parent
BACKEND = PROJECT_ROOT / 'backend'
if str(BACKEND) not in sys.path:
    sys.path.insert(0, str(BACKEND))

django = pytest.importorskip('django')

CONFIRMED_DISPOSITIONS = {'CONFIRMED', 'CP', 'KP'}


@pytest.fixture(scope='module')
def client():
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
    os.environ['ALLOWED_HOSTS'] = 'localhost,127.0.0.1,testserver'

    previous = os.getcwd()
    os.chdir(BACKEND)
    try:
        django.setup()
    except RuntimeError:
        pass
    from rest_framework.test import APIClient

    api = APIClient()
    try:
        response = api.get('/api/planets/?page_size=1')
        if response.status_code != 200 or not response.json().get('count'):
            pytest.skip('planets table empty or database unreachable')
    except Exception as exc:  # pragma: no cover - no DB in this environment
        pytest.skip(f'database unreachable: {exc}')

    yield api
    os.chdir(previous)


def count(client, query=''):
    response = client.get(f'/api/planets/?page_size=1{query}')
    assert response.status_code == 200, response.content
    return response.json()['count']


class TestConfirmedFilter:
    def test_confirmed_only_is_a_strict_subset(self, client):
        total = count(client)
        confirmed = count(client, '&confirmed_only=true')
        assert 0 < confirmed < total

    def test_confirmed_habitable_is_fewer_than_all_habitable(self, client):
        """
        The whole point of the filter: most potentially-habitable objects are
        unconfirmed candidates, and the UI must be able to say so.
        """
        all_habitable = count(client, '&habitability=POTENTIALLY_HABITABLE')
        confirmed_habitable = count(
            client, '&habitability=POTENTIALLY_HABITABLE&confirmed_only=true')
        assert confirmed_habitable < all_habitable

    def test_dispositions_partition_the_catalogue(self, client):
        """Every object carries exactly one disposition; the parts sum to the whole."""
        total = count(client)
        summed = sum(count(client, f'&disposition={d}')
                     for d in ('CONFIRMED', 'CANDIDATE', 'PC', 'CP', 'KP', 'APC'))
        assert summed == total

    def test_confirmed_count_matches_disposition_sum(self, client):
        confirmed = count(client, '&confirmed_only=true')
        summed = sum(count(client, f'&disposition={d}')
                     for d in sorted(CONFIRMED_DISPOSITIONS))
        assert confirmed == summed

    def test_every_returned_row_really_is_confirmed(self, client):
        """Guards against the flag and the disposition string disagreeing."""
        response = client.get('/api/planets/?page_size=100&confirmed_only=true')
        rows = response.json()['results']
        assert rows
        for row in rows:
            assert row['is_confirmed'] is True, row['planet_name']
            assert row['disposition'] in CONFIRMED_DISPOSITIONS, row['planet_name']

    def test_filter_composes_with_mission_and_class(self, client):
        combined = count(
            client,
            '&confirmed_only=true&mission=kepler&habitability=POTENTIALLY_HABITABLE')
        kepler_habitable = count(
            client, '&mission=kepler&habitability=POTENTIALLY_HABITABLE')
        assert 0 <= combined <= kepler_habitable

    def test_serializer_exposes_provenance(self, client):
        row = client.get('/api/planets/?page_size=1').json()['results'][0]
        assert 'disposition' in row
        assert 'is_confirmed' in row


class TestStatsProvenance:
    def test_stats_reports_the_split(self, client):
        stats = client.get('/api/planets/stats/').json()
        provenance = stats['provenance']
        assert provenance['confirmed'] + provenance['candidate'] == stats['total_planets']
        assert (provenance['confirmed_potentially_habitable']
                + provenance['candidate_potentially_habitable']
                == stats['habitability_breakdown']['POTENTIALLY_HABITABLE']['count'])

    def test_stats_confirmed_matches_the_filter(self, client):
        stats = client.get('/api/planets/stats/').json()
        assert stats['provenance']['confirmed'] == count(client, '&confirmed_only=true')


class TestFilterValidation:
    def test_bad_numeric_filter_is_400_not_500(self, client):
        """A malformed numeric parameter previously raised an unhandled ValueError."""
        for param in ('min_radius', 'max_radius', 'min_temp', 'max_temp'):
            response = client.get(f'/api/planets/?{param}=abc')
            assert response.status_code == 400, f'{param} returned {response.status_code}'
            assert param in response.json()['detail']

    def test_valid_numeric_filter_still_works(self, client):
        assert count(client, '&min_radius=0.5&max_radius=2.0') > 0

    def test_empty_numeric_filter_is_ignored(self, client):
        assert count(client, '&min_radius=') == count(client)
