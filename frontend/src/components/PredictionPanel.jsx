import { useState, useEffect, useCallback } from 'react';
import { Sparkles, RotateCcw, Loader2, TrendingUp, Info, Save, Trash2, LogIn, ChevronDown, ChevronUp, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { predictHabitability, explainPrediction, savePrediction, getSavedPredictions, deleteSavedPrediction } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

/**
 * PredictionPanel Component
 *
 * Panel for custom exoplanet habitability prediction - Connected to Real API
 */

// Full parameter descriptions for tooltips
const PARAM_DESCRIPTIONS = {
  pl_rade: 'Planet Radius in Earth Radii (R⊕). Measures how large the exoplanet is relative to Earth. Rocky, potentially habitable exoplanets are typically 0.5–2.0 R⊕. Larger values indicate gas giants.',
  pl_eqt: 'Equilibrium Temperature in Kelvin — the theoretical surface temperature assuming NO atmospheric greenhouse effect. This is the standard measure for exoplanets. Earth\'s equilibrium temp is ~255 K (actual surface avg is 288 K due to greenhouse effect).',
  pl_insol: 'Insolation Flux in Earth units (S⊕). How much stellar radiation the exoplanet receives compared to Earth. Values of 0.25–4.0 S⊕ are within the conservative Habitable Zone. Earth = 1.0, Mars = 0.43, Venus = 1.91.',
  pl_orbper: 'Orbital Period in days — how long the exoplanet takes to complete one orbit around its star. Earth = 365 days, Mars = 687 days. Longer periods generally mean larger orbits and lower insolation.',
  st_teff: 'Stellar Effective Temperature in Kelvin — classifies the host star type. G-type (Sun-like) = 5200–6000 K, K-type = 3700–5200 K, M-type (red dwarf) = 2300–3700 K. Cooler, smaller stars are often considered better for habitability.',
  st_rad: 'Stellar Radius in Solar Radii (R☉). Affects how much of the star a transiting exoplanet blocks, influencing detection sensitivity. Larger stars = harder to detect small rocky exoplanets.',
  st_mass: 'Stellar Mass in Solar Masses (M☉). Determines orbital dynamics via Kepler\'s Third Law. Also affects the star\'s lifetime — lower-mass stars live much longer, giving more time for life to develop.',
};

const PredictionPanel = () => {
  const { isLoggedIn } = useAuth();

  const [loading,            setLoading]            = useState(false);
  const [prediction,         setPrediction]         = useState(null);
  const [explanation,        setExplanation]        = useState(null);
  const [explanationLoading, setExplanationLoading] = useState(false);
  const [explanationError,   setExplanationError]   = useState(null);
  const [error,              setError]              = useState(null);
  const [activeSlider,       setActiveSlider]       = useState(null);
  const [tooltip,            setTooltip]            = useState(null);
  const [editingKey,         setEditingKey]         = useState(null);

  // ── Save prediction state ────────────────────────────────────────────────
  const [saveName,        setSaveName]        = useState('');
  const [saveLoading,     setSaveLoading]     = useState(false);
  const [saveSuccess,     setSaveSuccess]     = useState(false);
  const [saveError,       setSaveError]       = useState('');
  const [savedList,       setSavedList]       = useState([]);
  const [savedListOpen,   setSavedListOpen]   = useState(false);
  const [savedListLoading,setSavedListLoading]= useState(false);
  const [deletingId,      setDeletingId]      = useState(null);

  // Load saved predictions when user is logged in and opens the list
  const loadSaved = useCallback(async () => {
    if (!isLoggedIn) return;
    setSavedListLoading(true);
    try {
      const data = await getSavedPredictions();
      setSavedList(Array.isArray(data) ? data : []);
    } catch {
      setSavedList([]);
    } finally {
      setSavedListLoading(false);
    }
  }, [isLoggedIn]);

  useEffect(() => {
    if (isLoggedIn) loadSaved();
  }, [isLoggedIn, loadSaved]);

  const handleSave = async () => {
    if (!saveName.trim()) { setSaveError('Please enter a name for this prediction.'); return; }
    if (!prediction)      { setSaveError('Run a prediction first.'); return; }
    setSaveLoading(true);
    setSaveError('');
    try {
      const saved = await savePrediction({
        name:    saveName.trim(),
        inputs:  params,
        outputs: {
          habitability_score: prediction.habitability_score,
          classification:     prediction.classification,
          confidence:         prediction.confidence,
          probabilities:      prediction.probabilities,
          esi_components:     prediction.esi_components,
          contributing_factors: prediction.contributing_factors,
          mission_used:       prediction.mission_used,
          model_type:         prediction.model_type,
          natural_language_explanation: explanation?.natural_language_explanation || '',
          explanation_method: explanation?.explanation_method || '',
        },
      });
      setSavedList(prev => [saved, ...prev]);
      setSaveSuccess(true);
      setSaveName('');
      setSavedListOpen(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setSaveError(err?.response?.data?.errors?.name?.[0] || 'Failed to save prediction.');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDelete = async (id) => {
    setDeletingId(id);
    try {
      await deleteSavedPrediction(id);
      setSavedList(prev => prev.filter(p => p.id !== id));
    } catch { /* ignore */ }
    finally { setDeletingId(null); }
  };

  const loadSavedIntoSliders = (saved) => {
    if (!saved?.inputs) return;
    setParams(prev => ({ ...prev, ...saved.inputs }));
    setPrediction(null);
    setExplanation(null);
  };

  // Exoplanet parameters with default values (Earth-like)
  const [params, setParams] = useState({
    pl_rade: 1.0,
    pl_eqt: 255,       // Equilibrium temp (not surface temp)
    pl_insol: 1.0,
    pl_orbper: 365,
    st_teff: 5778,
    st_rad: 1.0,
    st_mass: 1.0
  });

  // Parameter ranges — verified against actual dataset ranges
  const parameterConfig = {
    pl_rade: {
      label: 'Planet Radius',
      min: 0.1,
      max: 15.0,
      step: 0.1,
      unit: 'R⊕',
      decimals: 1,
    },
    pl_eqt: {
      label: 'Equilibrium Temperature',
      min: 40,          // Neptune ~48 K
      max: 1500,
      step: 10,
      unit: 'K',
      decimals: 0,
    },
    pl_insol: {
      label: 'Insolation Flux',
      min: 0.001,       // Neptune ~0.001 S⊕
      max: 100.0,
      step: 0.05,
      unit: 'S⊕',
      decimals: 3,
    },
    pl_orbper: {
      label: 'Orbital Period',
      min: 1,
      max: 90000,       // Neptune ~60,190 days
      step: 1,
      unit: 'days',
      decimals: 0,
    },
    st_teff: {
      label: 'Star Temperature',
      min: 2300,        // Late M-dwarfs
      max: 7500,
      step: 100,
      unit: 'K',
      decimals: 0,
    },
    st_rad: {
      label: 'Star Radius',
      min: 0.1,
      max: 3.0,
      step: 0.05,
      unit: 'R☉',
      decimals: 2,
    },
    st_mass: {
      label: 'Star Mass',
      min: 0.1,
      max: 3.0,
      step: 0.05,
      unit: 'M☉',
      decimals: 2,
    }
  };

  const handleParamChange = (key, value) => {
    setParams(prev => ({ ...prev, [key]: parseFloat(value) }));
  };

  const handlePredict = async () => {
    setLoading(true);
    setError(null);
    setPrediction(null);
    setExplanation(null);
    setExplanationError(null);
    try {
      const result = await predictHabitability(params);
      setPrediction(result);

      setExplanationLoading(true);
      try {
        const explainResult = await explainPrediction(params);
        setExplanation(explainResult);
      } catch (explainErr) {
        setExplanationError(
          explainErr.response?.data?.detail ||
          'Explainability details are temporarily unavailable.'
        );
      } finally {
        setExplanationLoading(false);
      }
    } catch (err) {
      console.error('Prediction error:', err);
      setError(err.response?.data?.detail || 'Failed to predict habitability. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setParams({
      pl_rade: 1.0,
      pl_eqt: 255,
      pl_insol: 1.0,
      pl_orbper: 365,
      st_teff: 5778,
      st_rad: 1.0,
      st_mass: 1.0
    });
    setPrediction(null);
    setExplanation(null);
    setExplanationError(null);
    setError(null);
  };

  const getImportanceBarClass = (direction) => {
    if (direction === 'supports') return 'bg-green-500';
    if (direction === 'reduces') return 'bg-red-500';
    return 'bg-cyan-500';
  };

  // All Solar System planet presets
  // NOTE: pl_eqt is the EQUILIBRIUM temperature (blackbody, no greenhouse effect)
  // This mirrors how exoplanet surveys measure temperature — NOT actual surface temp.
  // Venus surface = 737 K but equilibrium = 232 K (correct for the model).
  const presets = {
    earth:   { pl_rade: 1.0,  pl_eqt: 255,  pl_insol: 1.0,    pl_orbper: 365,   st_teff: 5778, st_rad: 1.0,   st_mass: 1.0,  label: 'Earth',   color: 'blue' },
    venus:   { pl_rade: 0.95, pl_eqt: 232,  pl_insol: 1.91,   pl_orbper: 225,   st_teff: 5778, st_rad: 1.0,   st_mass: 1.0,  label: 'Venus',   color: 'orange' },
    mars:    { pl_rade: 0.53, pl_eqt: 210,  pl_insol: 0.43,   pl_orbper: 687,   st_teff: 5778, st_rad: 1.0,   st_mass: 1.0,  label: 'Mars',    color: 'red' },
    mercury: { pl_rade: 0.38, pl_eqt: 440,  pl_insol: 6.67,   pl_orbper: 88,    st_teff: 5778, st_rad: 1.0,   st_mass: 1.0,  label: 'Mercury', color: 'slate' },
    jupiter: { pl_rade: 11.2, pl_eqt: 110,  pl_insol: 0.037,  pl_orbper: 4333,  st_teff: 5778, st_rad: 1.0,   st_mass: 1.0,  label: 'Jupiter', color: 'amber' },
    saturn:  { pl_rade: 9.45, pl_eqt: 84,   pl_insol: 0.011,  pl_orbper: 10759, st_teff: 5778, st_rad: 1.0,   st_mass: 1.0,  label: 'Saturn',  color: 'yellow' },
    uranus:  { pl_rade: 4.0,  pl_eqt: 59,   pl_insol: 0.003,  pl_orbper: 30687, st_teff: 5778, st_rad: 1.0,   st_mass: 1.0,  label: 'Uranus',  color: 'cyan' },
    neptune: { pl_rade: 3.88, pl_eqt: 48,   pl_insol: 0.001,  pl_orbper: 60190, st_teff: 5778, st_rad: 1.0,   st_mass: 1.0,  label: 'Neptune', color: 'indigo' },
  };

  const presetColorMap = {
    blue:   'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 border border-blue-500/20',
    orange: 'bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 border border-orange-500/20',
    red:    'bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/20',
    slate:  'bg-slate-600/40 text-slate-300 hover:bg-slate-600/60 border border-slate-600/30',
    amber:  'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 border border-amber-500/20',
    yellow: 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 border border-yellow-500/20',
    cyan:   'bg-cyan-400/20 text-cyan-300 hover:bg-cyan-400/30 border border-cyan-400/20',
    indigo: 'bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 border border-indigo-500/20',
  };

  const loadPreset = (key) => {
    const preset = presets[key];
    setParams({
      pl_rade: preset.pl_rade,
      pl_eqt: preset.pl_eqt,
      pl_insol: preset.pl_insol,
      pl_orbper: preset.pl_orbper,
      st_teff: preset.st_teff,
      st_rad: preset.st_rad,
      st_mass: preset.st_mass,
    });
    setPrediction(null);
  };

  const getScoreColor = (score) => {
    if (score >= 0.7) return 'text-green-400';
    if (score >= 0.4) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getScoreBgColor = (score) => {
    if (score >= 0.7) return 'bg-green-500/20 border border-green-500/30';
    if (score >= 0.4) return 'bg-yellow-500/20 border border-yellow-500/30';
    return 'bg-red-500/20 border border-red-500/30';
  };

  return (
    <section className="relative overflow-hidden rounded-2xl border border-cyan-400/20 bg-gradient-to-b from-slate-900 via-slate-900/95 to-slate-950 shadow-[0_24px_70px_-38px_rgba(6,182,212,0.55)]">
      <div className="pointer-events-none absolute -top-28 right-[-8rem] h-72 w-72 rounded-full bg-cyan-500/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 left-[-6rem] h-64 w-64 rounded-full bg-blue-500/10 blur-3xl" />

      {/* Header */}
      <div className="relative border-b border-slate-700/80 px-5 py-5 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/20 ring-1 ring-cyan-400/30">
              <Sparkles className="h-5 w-5 text-cyan-300" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-300/80">
                Live Prediction Lab
              </p>
              <h3 className="text-lg font-semibold leading-tight text-white">Predict Custom Exoplanet Habitability</h3>
              <p className="mt-1 text-xs text-slate-400">
                Tune key orbital and stellar parameters to run the model instantly.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-cyan-300">
              7 features
            </span>
            <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-blue-200">
              API connected
            </span>
          </div>
        </div>
      </div>

      <div className="relative space-y-6 p-5 sm:p-6">

        {/* Venus disclaimer */}
        <div className="flex gap-3 rounded-xl border border-orange-500/25 bg-gradient-to-r from-orange-500/15 to-amber-500/10 p-3.5">
          <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-orange-300" />
          <p className="text-xs leading-relaxed text-orange-200/85">
            <strong className="text-orange-200">Note on Venus preset:</strong> The model uses{' '}
            <em>equilibrium temperature</em> (~232 K) and not Venus's actual surface temperature (737 K).
            Exoplanet surveys only measure equilibrium temperature, so Venus can score higher than expected.
            <a href="/learn#venus-note" className="ml-1 text-orange-300 underline decoration-orange-400/60 underline-offset-2 hover:text-orange-100">
              Learn more
            </a>
          </p>
        </div>

        {/* Solar System Presets */}
        <div>
          <p className="mb-2 text-xs font-medium text-slate-400">Solar System Presets</p>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(presets).map(([key, preset]) => (
              <button
                key={key}
                onClick={() => loadPreset(key)}
                className={`rounded-full px-2.5 py-1 text-xs font-medium transition-all ${presetColorMap[preset.color]}`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Parameter Sliders */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {Object.entries(parameterConfig).map(([key, config]) => {
            const isActive = activeSlider === key;
            const displayValue = params[key].toFixed(config.decimals);

            return (
              <div key={key} className="relative rounded-xl border border-slate-700/70 bg-slate-900/45 p-3.5">
                {/* Label row */}
                <div className="mb-2 flex items-center justify-between">
                  <div className="group/label relative flex items-center gap-1.5">
                    <button
                      onMouseEnter={() => setTooltip(key)}
                      onMouseLeave={() => setTooltip(null)}
                      className="flex items-center gap-1 text-sm font-medium text-slate-300 transition-colors hover:text-white"
                    >
                      {config.label}
                      <Info className="h-3 w-3 text-slate-500 transition-colors hover:text-cyan-400" />
                    </button>
                    {/* Tooltip */}
                    <AnimatePresence>
                      {tooltip === key && (
                        <motion.div
                          initial={{ opacity: 0, y: -4, scale: 0.96 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -4, scale: 0.96 }}
                          transition={{ duration: 0.15 }}
                          className="pointer-events-none absolute bottom-full left-0 z-50 mb-2 w-64 rounded-lg border border-slate-600 bg-slate-800 p-3 text-xs leading-relaxed text-slate-300 shadow-xl"
                        >
                          <p className="mb-1 font-semibold text-white">{config.label}</p>
                          {PARAM_DESCRIPTIONS[key]}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Value display — click to edit inline */}
                  {editingKey === key ? (
                    <input
                      type="number"
                      autoFocus
                      defaultValue={displayValue}
                      min={config.min}
                      max={config.max}
                      step={config.step}
                      className="font-mono text-sm text-cyan-300 bg-transparent border-b border-cyan-400 outline-none w-24 text-right"
                      onBlur={(e) => {
                        const raw = parseFloat(e.target.value);
                        const clamped = isNaN(raw) ? params[key] : Math.min(Math.max(raw, config.min), config.max);
                        handleParamChange(key, clamped);
                        setEditingKey(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') e.currentTarget.blur();
                        if (e.key === 'Escape') setEditingKey(null);
                      }}
                    />
                  ) : (
                    <motion.span
                      key={`${key}-${displayValue}`}
                      animate={isActive ? {
                        scale: [1, 1.15, 1],
                        color: ['#67e8f9', '#22d3ee', '#67e8f9'],
                      } : { scale: 1 }}
                      transition={{ duration: 0.3 }}
                      onClick={() => setEditingKey(key)}
                      title="Click to edit"
                      className={`font-mono text-sm transition-all duration-200 cursor-pointer hover:underline hover:text-cyan-300 ${
                        isActive
                          ? 'text-base font-bold text-cyan-300'
                          : 'text-cyan-400'
                      }`}
                    >
                      {displayValue} {config.unit}
                    </motion.span>
                  )}
                </div>

                {/* Slider */}
                <div className="relative">
                  <input
                    type="range"
                    min={config.min}
                    max={config.max}
                    step={config.step}
                    value={Math.min(Math.max(params[key], config.min), config.max)}
                    onMouseDown={() => setActiveSlider(key)}
                    onTouchStart={() => setActiveSlider(key)}
                    onMouseUp={() => setActiveSlider(null)}
                    onTouchEnd={() => setActiveSlider(null)}
                    onChange={(e) => handleParamChange(key, e.target.value)}
                    className={`h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-700 transition-all duration-150 ${isActive ? 'accent-cyan-300' : 'accent-cyan-500'}`}
                    style={{
                      background: (() => {
                        const val = Math.min(Math.max(params[key], config.min), config.max);
                        const pct = ((val - config.min) / (config.max - config.min)) * 100;
                        return `linear-gradient(to right, ${isActive ? '#67e8f9' : '#06b6d4'} ${pct}%, #334155 ${pct}%)`;
                      })(),
                    }}
                  />
                </div>
                <div className="mt-1 flex justify-between">
                  <span className="text-xs text-slate-600">{config.min}</span>
                  <span className="text-xs text-slate-600">{config.max}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            onClick={handlePredict}
            disabled={loading}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-3 font-medium text-white shadow-lg shadow-cyan-500/20 transition-all hover:from-cyan-400 hover:to-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <><Loader2 className="h-5 w-5 animate-spin" />Analyzing...</>
            ) : (
              <><Sparkles className="h-5 w-5" />Run AI Prediction</>
            )}
          </button>
          <button
            onClick={handleReset}
            className="flex items-center justify-center gap-2 rounded-lg border border-slate-600 bg-slate-800 px-4 py-3 text-white transition-colors hover:bg-slate-700"
          >
            <RotateCcw className="h-5 w-5" />
            Reset
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Results */}
        <AnimatePresence>
          {prediction && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ duration: 0.4 }}
              className="mt-2 space-y-4 rounded-xl border border-slate-600 bg-slate-900/60 p-4"
            >
              <h4 className="flex items-center gap-2 text-lg font-semibold text-white">
                <TrendingUp className="h-5 w-5 text-cyan-400" />
                Prediction Results
              </h4>

              {/* Score */}
              <div className={`rounded-lg p-4 ${getScoreBgColor(prediction.habitability_score)}`}>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm text-slate-300">Habitability Score</span>
                  <motion.span
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.5, type: 'spring' }}
                    className={`text-3xl font-bold ${getScoreColor(prediction.habitability_score)}`}
                  >
                    {(prediction.habitability_score * 100).toFixed(1)}%
                  </motion.span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-700">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${prediction.habitability_score * 100}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className={`h-full ${
                      prediction.habitability_score >= 0.7 ? 'bg-green-500' :
                      prediction.habitability_score >= 0.4 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                  />
                </div>
              </div>

              {/* Classification */}
              {prediction.classification && (
                <div className="flex items-center justify-between rounded-lg bg-slate-800/50 p-3">
                  <span className="text-sm text-slate-400">Classification</span>
                  <span className={`font-medium ${
                    prediction.classification === 'POTENTIALLY_HABITABLE' ? 'text-green-400' :
                    prediction.classification === 'HABITABILITY_ZONE' ? 'text-yellow-400' : 'text-red-400'
                  }`}>
                    {prediction.classification.replace(/_/g, ' ')}
                  </span>
                </div>
              )}

              {/* Probabilities */}
              {prediction.probabilities && (
                <div className="space-y-2">
                  <h5 className="text-sm font-medium text-slate-300">Class Probabilities</h5>
                  {Object.entries(prediction.probabilities).map(([key, value]) => (
                    <div key={key} className="flex items-center gap-2">
                      <div className="flex-1">
                        <div className="mb-1 flex items-center justify-between text-xs">
                          <span className="capitalize text-slate-400">
                            {key.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                          </span>
                          <span className="font-mono text-white">
                            {(value * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-700">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${value * 100}%` }}
                            transition={{ duration: 0.6, ease: 'easeOut', delay: 0.1 }}
                            className={`h-full rounded-full ${
                              key === 'potentially_habitable' ? 'bg-green-500' :
                              key === 'habitability_zone' ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* AI Explainability */}
              <div className="space-y-3 border-t border-slate-700 pt-3">
                <div className="flex items-center justify-between">
                  <h5 className="text-sm font-medium text-slate-200">Why this score?</h5>
                  {explanation?.explanation_method && (
                    <span className="rounded-full bg-slate-700 px-2 py-0.5 text-[11px] uppercase tracking-wide text-slate-300">
                      {explanation.explanation_method}
                    </span>
                  )}
                </div>

                {explanationLoading && (
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Calculating feature importance...
                  </div>
                )}

                {explanationError && (
                  <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300">
                    {explanationError}
                  </div>
                )}

                {explanation?.natural_language_explanation && (
                  <div className="rounded-lg border border-slate-700 bg-slate-800/60 p-3">
                    <p className="text-xs leading-relaxed text-slate-300">
                      {explanation.natural_language_explanation}
                    </p>
                  </div>
                )}

                {Array.isArray(explanation?.feature_importance) && explanation.feature_importance.length > 0 && (
                  <div className="space-y-2">
                    {explanation.feature_importance.slice(0, 6).map((item, index) => (
                      <div key={`${item.feature_key}-${index}`} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-300">{item.feature}</span>
                          <span className={`font-mono ${item.impact_direction === 'supports' ? 'text-green-400' : 'text-red-400'}`}>
                            {item.impact_direction === 'supports' ? '+' : '-'}
                            {Number(item.importance || 0).toFixed(3)}
                          </span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-700">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min((Number(item.importance || 0) / Number(explanation.feature_importance?.[0]?.importance || 1)) * 100, 100)}%` }}
                            transition={{ duration: 0.5, ease: 'easeOut', delay: 0.05 * index }}
                            className={`h-full rounded-full ${getImportanceBarClass(item.impact_direction)}`}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ── Save Prediction Block ──────────────────────────────── */}
              <div className="border-t border-slate-700 pt-4 mt-1">
                {isLoggedIn ? (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
                      <Save className="w-3.5 h-3.5" /> Save this prediction
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={saveName}
                        onChange={e => { setSaveName(e.target.value); setSaveError(''); }}
                        placeholder="Name this prediction (e.g. Earth-like candidate)"
                        className="flex-1 rounded-lg border border-slate-600 bg-slate-800/70 px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30"
                        onKeyDown={e => e.key === 'Enter' && handleSave()}
                      />
                      <button
                        onClick={handleSave}
                        disabled={saveLoading || !saveName.trim()}
                        className="flex items-center gap-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 disabled:cursor-not-allowed px-3 py-2 text-xs font-semibold text-white transition-colors"
                      >
                        {saveLoading
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <Save className="w-3.5 h-3.5" />
                        }
                        Save
                      </button>
                    </div>
                    {saveError   && <p className="text-xs text-red-400">{saveError}</p>}
                    {saveSuccess && <p className="text-xs text-emerald-400 flex items-center gap-1">✓ Prediction saved successfully!</p>}
                  </div>
                ) : (
                  <div className="flex items-center gap-3 rounded-lg border border-slate-700 bg-slate-800/50 px-3.5 py-2.5">
                    <LogIn className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <p className="text-xs text-slate-400">
                      <Link to="/login" className="text-cyan-400 hover:text-cyan-300 font-medium">Sign in</Link> or{' '}
                      <Link to="/signin" className="text-cyan-400 hover:text-cyan-300 font-medium">create an account</Link> to save predictions.
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Saved Predictions Section ──────────────────────────────────── */}
        {isLoggedIn && (
          <div className="rounded-xl border border-slate-700/60 overflow-hidden">
            {/* Collapsible header */}
            <button
              onClick={() => { setSavedListOpen(v => !v); if (!savedListOpen) loadSaved(); }}
              className="w-full flex items-center justify-between px-4 py-3 bg-slate-900/60 hover:bg-slate-800/60 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-cyan-400" />
                <span className="text-sm font-medium text-white">Saved Predictions</span>
                {savedList.length > 0 && (
                  <span className="rounded-full bg-cyan-500/20 px-2 py-0.5 text-[10px] font-bold text-cyan-300">
                    {savedList.length}
                  </span>
                )}
              </div>
              {savedListOpen
                ? <ChevronUp className="w-4 h-4 text-slate-400" />
                : <ChevronDown className="w-4 h-4 text-slate-400" />
              }
            </button>

            <AnimatePresence>
              {savedListOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.22 }}
                  className="overflow-hidden"
                >
                  <div className="border-t border-slate-700/60 divide-y divide-slate-700/40 max-h-96 overflow-y-auto
                                  scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-transparent">
                    {savedListLoading && (
                      <div className="flex items-center justify-center gap-2 py-6 text-sm text-slate-500">
                        <Loader2 className="w-4 h-4 animate-spin" /> Loading saved predictions…
                      </div>
                    )}
                    {!savedListLoading && savedList.length === 0 && (
                      <div className="py-8 text-center">
                        <Save className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                        <p className="text-sm text-slate-500">No saved predictions yet.</p>
                        <p className="text-xs text-slate-600 mt-1">Run a prediction above and save it.</p>
                      </div>
                    )}
                    {!savedListLoading && savedList.map(item => (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="px-4 py-3 hover:bg-slate-800/40 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-3">
                          {/* Name + date */}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="text-sm font-semibold text-white truncate">{item.name}</p>
                              <span className={`flex-shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                                item.outputs?.classification === 'POTENTIALLY_HABITABLE'
                                  ? 'bg-green-500/20 text-green-400'
                                  : item.outputs?.classification === 'HABITABILITY_ZONE'
                                    ? 'bg-yellow-500/20 text-yellow-400'
                                    : 'bg-red-500/20 text-red-400'
                              }`}>
                                {(item.outputs?.habitability_score * 100)?.toFixed(1)}%
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-500 mb-2">
                              {new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              {item.outputs?.mission_used && <span className="ml-2">· {item.outputs.mission_used}</span>}
                            </p>

                            {/* Input summary */}
                            <div className="grid grid-cols-4 gap-x-3 gap-y-0.5 mb-1.5">
                              {[
                                ['Radius',  item.inputs?.pl_rade,  'R⊕'],
                                ['Temp',    item.inputs?.pl_eqt,   'K'],
                                ['Flux',    item.inputs?.pl_insol, 'S⊕'],
                                ['Star T',  item.inputs?.st_teff,  'K'],
                              ].map(([lbl, val, unit]) => (
                                <div key={lbl}>
                                  <p className="text-[9px] text-slate-600 uppercase">{lbl}</p>
                                  <p className="text-[11px] text-slate-300 font-mono">{val?.toFixed(2)} {unit}</p>
                                </div>
                              ))}
                            </div>

                            {/* Classification badge */}
                            <p className="text-[10px] text-slate-500">
                              {item.outputs?.classification?.replace(/_/g, ' ')}
                              {item.outputs?.model_type && <span className="ml-1 text-slate-600">· {item.outputs.model_type}</span>}
                            </p>
                          </div>

                          {/* Actions */}
                          <div className="flex flex-col gap-1.5 flex-shrink-0">
                            <button
                              onClick={() => loadSavedIntoSliders(item)}
                              className="text-[10px] px-2 py-1 rounded bg-cyan-500/15 text-cyan-400 hover:bg-cyan-500/25 transition-colors whitespace-nowrap"
                              title="Load these parameters into the sliders"
                            >
                              Load
                            </button>
                            <button
                              onClick={() => handleDelete(item.id)}
                              disabled={deletingId === item.id}
                              className="text-[10px] px-2 py-1 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-40"
                              title="Delete this saved prediction"
                            >
                              {deletingId === item.id
                                ? <Loader2 className="w-3 h-3 animate-spin mx-auto" />
                                : <Trash2 className="w-3 h-3 mx-auto" />
                              }
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </section>
  );
};

export default PredictionPanel;
