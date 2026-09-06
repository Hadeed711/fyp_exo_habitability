/**
 * Habitability score bands — single source of truth for the UI.
 *
 * The backend decides a planet's class by thresholding the same 0–1 score this
 * module colours. Those thresholds are calibrated (scripts/calibrate_blend.py)
 * and served with every prediction as `score_thresholds`, so the UI must never
 * hard-code its own cut-offs: PredictionPanel used 0.70/0.40 and PlanetDetail
 * used 0.65/0.35 while the backend classified at different values again, so the
 * same score could be labelled "Potentially Habitable" and painted amber.
 *
 * Always prefer the thresholds returned by the API. FALLBACK_THRESHOLDS exists
 * only so a catalogue row rendered before any prediction has been made still
 * gets sensible colours; it mirrors the committed calibration.
 */

export const FALLBACK_THRESHOLDS = {
  habitability_zone: 0.24,
  potentially_habitable: 0.71,
};

/** Pull thresholds off a prediction response, falling back to the constants. */
export const thresholdsFrom = (prediction) => {
  const supplied = prediction?.score_thresholds;
  if (
    supplied
    && typeof supplied.habitability_zone === 'number'
    && typeof supplied.potentially_habitable === 'number'
  ) {
    return supplied;
  }
  return FALLBACK_THRESHOLDS;
};

/**
 * Band a score: 'high' | 'mid' | 'low'.
 * These map one-to-one onto the backend's three classes.
 */
export const scoreBand = (score, thresholds = FALLBACK_THRESHOLDS) => {
  const value = Number(score) || 0;
  if (value >= thresholds.potentially_habitable) return 'high';
  if (value >= thresholds.habitability_zone) return 'mid';
  return 'low';
};

const pick = (band, high, mid, low) => (band === 'high' ? high : band === 'mid' ? mid : low);

export const scoreTextColor = (score, thresholds) =>
  pick(scoreBand(score, thresholds), 'text-green-400', 'text-yellow-400', 'text-red-400');

export const scoreBarColor = (score, thresholds) =>
  pick(scoreBand(score, thresholds), 'bg-green-500', 'bg-yellow-500', 'bg-red-500');

export const scoreBgColor = (score, thresholds) =>
  pick(
    scoreBand(score, thresholds),
    'bg-green-500/20 border border-green-500/30',
    'bg-yellow-500/20 border border-yellow-500/30',
    'bg-red-500/20 border border-red-500/30',
  );

export const scoreSoftBgColor = (score, thresholds) =>
  pick(
    scoreBand(score, thresholds),
    'bg-green-500/10 border-green-500/30',
    'bg-yellow-500/10 border-yellow-500/30',
    'bg-red-500/10 border-red-500/30',
  );

/** Human-readable class name, e.g. 'POTENTIALLY_HABITABLE' -> 'Potentially Habitable'. */
export const formatClassification = (classification) =>
  String(classification || '')
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase());
