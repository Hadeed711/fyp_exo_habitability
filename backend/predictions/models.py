"""
Prediction Models
=================

This app currently defines no database models.

`PredictionHistory` and `SimulationHistory` used to live here. Neither was ever
wired up — no view, serializer or script referenced them, and both tables sat at
zero rows — so they were removed along with their tables in migration 0002.

Per-user saved predictions are handled by `users.SavedPrediction`, which is the
model the `/api/auth/saved/` endpoints actually use.
"""
