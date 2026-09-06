"""Shared fixtures for the test suite."""

import sys
from pathlib import Path

import pytest

PROJECT_ROOT = Path(__file__).resolve().parent.parent
BACKEND = PROJECT_ROOT / 'backend'
for path in (str(BACKEND), str(PROJECT_ROOT)):
    if path not in sys.path:
        sys.path.insert(0, path)


@pytest.fixture(scope='session')
def project_root():
    return PROJECT_ROOT


@pytest.fixture(scope='session')
def scorer():
    """
    One scorer for the whole session - loading four models is slow.

    Fails rather than skips when models are missing: a missing artefact is a
    broken checkout, and a green run that silently tested nothing is worse
    than a red one.
    """
    from api.habitability_scorer import HabitabilityScorer

    instance = HabitabilityScorer()
    assert instance.models, (
        "No models loaded. Run: python scripts/train_models.py"
    )
    return instance
