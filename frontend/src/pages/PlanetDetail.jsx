import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Loader2, Sparkles, Thermometer, Globe, Zap,
  Clock, Star, Weight, Activity, ChevronRight, Info
} from 'lucide-react';
import { getPlanetById, predictHabitability } from '../services/api';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

/**
 * PlanetDetail Page - Redesigned with modern animations
 * Full exoplanet detail view with live AI habitability prediction
 */

// Animated planet sphere component
const PlanetSphere = ({ habitabilityScore, className = '' }) => {
  const color = habitabilityScore >= 0.65
    ? '#22c55e'
    : habitabilityScore >= 0.35
    ? '#eab308'
    : '#ef4444';

  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      {/* Outer glow rings */}
      {[1, 2, 3].map((i) => (
        <motion.div
          key={i}
          className="absolute rounded-full border"
          style={{
            width: `${120 + i * 50}px`,
            height: `${120 + i * 50}px`,
            borderColor: color,
            opacity: 0.08 / i,
          }}
          animate={{ rotate: 360 * (i % 2 === 0 ? 1 : -1) }}
          transition={{ duration: 15 + i * 5, repeat: Infinity, ease: 'linear' }}
        />
      ))}
      {/* Orbit ring */}
      <motion.div
        className="absolute rounded-full border border-dashed"
        style={{ width: '200px', height: '200px', borderColor: color, opacity: 0.25 }}
        animate={{ rotate: 360 }}
        transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
      />
      {/* Orbiting moon */}
      <motion.div
        className="absolute"
        animate={{ rotate: 360 }}
        style={{ width: '200px', height: '200px' }}
        transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
      >
        <div
          className="absolute w-3 h-3 rounded-full top-0 left-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{ background: color, opacity: 0.7, boxShadow: `0 0 8px ${color}` }}
        />
      </motion.div>
      {/* Planet sphere */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 100, damping: 12, delay: 0.2 }}
        className="relative w-32 h-32 rounded-full"
        style={{
          background: `radial-gradient(circle at 35% 35%, ${color}55, ${color}22, #0f172a)`,
          boxShadow: `0 0 40px ${color}40, 0 0 80px ${color}15, inset 0 0 30px rgba(0,0,0,0.5)`,
          border: `1px solid ${color}40`,
        }}
      >
        {/* Surface texture lines */}
        <div className="absolute inset-2 rounded-full opacity-20"
          style={{ background: `repeating-linear-gradient(0deg, transparent, transparent 6px, ${color}30 6px, ${color}30 7px)` }} />
        {/* Atmosphere halo */}
        <div className="absolute -inset-2 rounded-full opacity-20"
          style={{ background: `radial-gradient(circle, transparent 60%, ${color}20)` }} />
      </motion.div>
    </div>
  );
};

// Stat card component
const StatCard = ({ icon: Icon, label, value, unit, comparison, color = 'cyan', delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, delay }}
    className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4 
               hover:border-slate-600 transition-all group"
  >
    <div className="flex items-start justify-between mb-3">
      <div className={`w-8 h-8 rounded-lg bg-${color}-500/15 flex items-center justify-center`}>
        <Icon className={`w-4 h-4 text-${color}-400`} />
      </div>
      {comparison && (
        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
          comparison.startsWith('+') ? 'bg-green-500/15 text-green-400' :
          comparison.startsWith('-') ? 'bg-red-500/15 text-red-400' :
          'bg-slate-700 text-slate-400'
        }`}>
          {comparison} Earth
        </span>
      )}
    </div>
    <p className="text-2xl font-bold text-white mb-0.5">
      {value}<span className="text-sm text-slate-400 ml-1 font-normal">{unit}</span>
    </p>
    <p className="text-xs text-slate-500">{label}</p>
  </motion.div>
);

const PlanetDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [planet, setPlanet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [prediction, setPrediction] = useState(null);
  const [predicting, setPredicting] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchPlanetDetails();
  }, [id]);

  const fetchPlanetDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getPlanetById(id);
      setPlanet(data);
      if (data.pl_rade || data.pl_eqt || data.pl_insol) {
        runPrediction(data);
      }
    } catch (err) {
      console.error('Failed to fetch exoplanet:', err);
      setError('Failed to load exoplanet data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const runPrediction = async (planetData) => {
    setPredicting(true);
    try {
      const params = {};
      ['pl_rade', 'pl_eqt', 'pl_insol', 'pl_orbper', 'pl_orbsmax', 'st_teff', 'st_rad', 'st_mass']
        .forEach(k => { if (planetData[k]) params[k] = planetData[k]; });
      if (Object.keys(params).length >= 2) {
        const result = await predictHabitability(params);
        setPrediction(result);
      }
    } catch (err) {
      console.error('Prediction failed:', err);
    } finally {
      setPredicting(false);
    }
  };

  const getMissionColor = (name) => {
    const n = (name || '').toLowerCase();
    if (n.includes('kepler')) return { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30' };
    if (n.includes('k2')) return { bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/30' };
    if (n.includes('tess')) return { bg: 'bg-cyan-500/20', text: 'text-cyan-400', border: 'border-cyan-500/30' };
    return { bg: 'bg-slate-500/20', text: 'text-slate-400', border: 'border-slate-500/30' };
  };

  // Loading screen
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 
                      flex items-center justify-center">
        <Navbar />
        <div className="text-center space-y-4">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            className="w-16 h-16 mx-auto rounded-full border-2 border-t-cyan-400 border-slate-700"
          />
          <p className="text-slate-400 animate-pulse">Loading exoplanet data...</p>
        </div>
      </div>
    );
  }

  if (error || !planet) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 
                      flex items-center justify-center">
        <Navbar />
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-md mx-auto px-6"
        >
          <div className="text-6xl mb-6">🌌</div>
          <h2 className="text-2xl font-bold text-white mb-3">Exoplanet Not Found</h2>
          <p className="text-slate-400 mb-6">{error || 'The requested exoplanet could not be found.'}</p>
          <button
            onClick={() => navigate('/explore')}
            className="px-6 py-3 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg 
                       transition-colors font-medium"
          >
            Back to Explorer
          </button>
        </motion.div>
      </div>
    );
  }

  const missionStyle = getMissionColor(planet.mission?.full_name || planet.mission?.name);
  const scoreVal = prediction?.habitability_score || 0;
  const hasPartialData = !planet.pl_eqt || !planet.pl_rade || !planet.pl_insol;

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'parameters', label: 'Parameters' },
    { id: 'stellar', label: 'Host Star' },
    { id: 'prediction', label: 'AI Prediction' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-16">
      <Navbar />

      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Background gradient glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className={`absolute top-0 left-1/4 w-96 h-96 rounded-full blur-3xl opacity-10
              ${prediction?.habitability_score >= 0.65 ? 'bg-green-500' :
                prediction?.habitability_score >= 0.35 ? 'bg-yellow-500' : 'bg-blue-500'}`} />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Back button */}
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            onClick={() => navigate('/explore')}
            className="flex items-center gap-2 text-slate-400 hover:text-white mb-8 
                       transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back to Explorer
          </motion.button>

          {/* Main hero grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

            {/* Left: Planet Visual */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              className="lg:col-span-4 flex flex-col items-center"
            >
              {/* Planet visual */}
              <div className="w-full bg-slate-800/40 border border-slate-700/60 rounded-2xl p-8 
                              flex flex-col items-center min-h-[320px] justify-center relative overflow-hidden">
                {/* Animated background stars */}
                {[...Array(12)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-1 h-1 rounded-full bg-white"
                    style={{ left: `${(i * 37) % 90 + 5}%`, top: `${(i * 23) % 80 + 5}%` }}
                    animate={{ opacity: [0.1, 0.6, 0.1] }}
                    transition={{ duration: 2 + i * 0.3, repeat: Infinity, delay: i * 0.2 }}
                  />
                ))}

                {predicting || !prediction ? (
                  <div className="text-center">
                    <motion.div
                      className="text-7xl mb-4"
                      animate={{ y: [0, -8, 0] }}
                      transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                    >
                      🪐
                    </motion.div>
                    {predicting && (
                      <div className="flex items-center gap-2 text-slate-400 text-sm">
                        <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                        Running ML prediction...
                      </div>
                    )}
                  </div>
                ) : (
                  <PlanetSphere habitabilityScore={scoreVal} />
                )}
              </div>

              {/* Habitability score card under planet */}
              {prediction && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className={`w-full mt-4 p-4 rounded-xl border ${
                    scoreVal >= 0.65 ? 'bg-green-500/10 border-green-500/30' :
                    scoreVal >= 0.35 ? 'bg-yellow-500/10 border-yellow-500/30' :
                    'bg-red-500/10 border-red-500/30'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-slate-400">AI Habitability Score</span>
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 200, delay: 0.5 }}
                      className={`text-2xl font-bold ${
                        scoreVal >= 0.65 ? 'text-green-400' :
                        scoreVal >= 0.35 ? 'text-yellow-400' : 'text-red-400'
                      }`}
                    >
                      {(scoreVal * 100).toFixed(1)}%
                    </motion.span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${scoreVal * 100}%` }}
                      transition={{ duration: 1, ease: 'easeOut', delay: 0.5 }}
                      className={`h-full rounded-full ${
                        scoreVal >= 0.65 ? 'bg-green-500' :
                        scoreVal >= 0.35 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                    />
                  </div>
                  <p className={`text-xs mt-2 font-medium ${
                    scoreVal >= 0.65 ? 'text-green-400' :
                    scoreVal >= 0.35 ? 'text-yellow-400' : 'text-red-400'
                  }`}>
                    {prediction.classification?.replace(/_/g, ' ')}
                  </p>
                </motion.div>
              )}
            </motion.div>

            {/* Right: Planet Info */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="lg:col-span-8 space-y-6"
            >
              {/* Name and mission */}
              <div>
                <div className="flex items-center gap-3 mb-2 flex-wrap">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium border 
                                   ${missionStyle.bg} ${missionStyle.text} ${missionStyle.border}`}>
                    {planet.mission?.full_name || planet.mission?.name || 'Unknown'} Mission
                  </span>
                  {planet.habitability_class && (
                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${
                      planet.habitability_class === 'POTENTIALLY_HABITABLE'
                        ? 'bg-green-500/15 text-green-400 border-green-500/30'
                        : planet.habitability_class === 'HABITABILITY_ZONE'
                        ? 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30'
                        : 'bg-red-500/15 text-red-400 border-red-500/30'
                    }`}>
                      {planet.habitability_class.replace(/_/g, ' ')}
                    </span>
                  )}
                  {hasPartialData && (
                    <span className="px-3 py-1 rounded-full text-xs font-medium border 
                                     bg-amber-500/15 text-amber-400 border-amber-500/30">
                      Incomplete Data
                    </span>
                  )}
                </div>

                <h1 className="text-4xl sm:text-5xl font-bold text-white mb-3 leading-tight">
                  {planet.planet_name}
                </h1>
                {planet.disc_year && (
                  <p className="text-slate-400 text-sm">
                    Discovered in {planet.disc_year}
                    {planet.disc_facility && ` · ${planet.disc_facility}`}
                  </p>
                )}
              </div>

              {/* Quick stats grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard
                  icon={Globe}
                  label="Planet Radius"
                  value={planet.pl_rade ? planet.pl_rade.toFixed(2) : 'N/A'}
                  unit={planet.pl_rade ? 'R⊕' : ''}
                  comparison={planet.pl_rade ? `${((planet.pl_rade - 1) * 100) > 0 ? '+' : ''}${((planet.pl_rade - 1) * 100).toFixed(0)}%` : null}
                  color="cyan"
                  delay={0.2}
                />
                <StatCard
                  icon={Thermometer}
                  label="Equilibrium Temp"
                  value={planet.pl_eqt ? Math.round(planet.pl_eqt) : 'N/A'}
                  unit={planet.pl_eqt ? 'K' : ''}
                  comparison={planet.pl_eqt ? `${((planet.pl_eqt / 255 - 1) * 100) > 0 ? '+' : ''}${((planet.pl_eqt / 255 - 1) * 100).toFixed(0)}%` : null}
                  color="orange"
                  delay={0.25}
                />
                <StatCard
                  icon={Zap}
                  label="Insolation Flux"
                  value={planet.pl_insol ? planet.pl_insol.toFixed(2) : 'N/A'}
                  unit={planet.pl_insol ? 'S⊕' : ''}
                  comparison={planet.pl_insol ? `${((planet.pl_insol - 1) * 100) > 0 ? '+' : ''}${((planet.pl_insol - 1) * 100).toFixed(0)}%` : null}
                  color="yellow"
                  delay={0.3}
                />
                <StatCard
                  icon={Clock}
                  label="Orbital Period"
                  value={planet.pl_orbper ? Math.round(planet.pl_orbper) : 'N/A'}
                  unit={planet.pl_orbper ? 'days' : ''}
                  comparison={planet.pl_orbper ? `${((planet.pl_orbper / 365 - 1) * 100) > 0 ? '+' : ''}${((planet.pl_orbper / 365 - 1) * 100).toFixed(0)}%` : null}
                  color="purple"
                  delay={0.35}
                />
              </div>

              {/* Tabs */}
              <div className="border-b border-slate-700">
                <div className="flex gap-1">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`px-4 py-2 text-sm font-medium transition-all relative ${
                        activeTab === tab.id
                          ? 'text-cyan-400'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {tab.label}
                      {activeTab === tab.id && (
                        <motion.div
                          layoutId="activeTab"
                          className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-400"
                          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                        />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tab Content */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                >
                  {/* OVERVIEW TAB */}
                  {activeTab === 'overview' && (
                    <div className="space-y-3">
                      {[
                        { label: 'Planet Name', value: planet.planet_name },
                        { label: 'Mission', value: planet.mission?.full_name || planet.mission?.name || 'Unknown' },
                        { label: 'Habitability Class', value: planet.habitability_class?.replace(/_/g, ' ') || 'Unknown' },
                        planet.disc_year && { label: 'Discovery Year', value: planet.disc_year },
                        planet.disc_facility && { label: 'Discovery Facility', value: planet.disc_facility },
                        planet.stellar_type && { label: 'Host Star Type', value: planet.stellar_type },
                      ].filter(Boolean).map(({ label, value }) => (
                        <div key={label} className="flex items-center justify-between py-2.5 
                                                    border-b border-slate-800 last:border-0">
                          <span className="text-slate-400 text-sm">{label}</span>
                          <span className="text-white text-sm font-medium text-right max-w-[60%]">{value}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* PARAMETERS TAB */}
                  {activeTab === 'parameters' && (
                    <div className="space-y-2">
                      {[
                        { label: 'Planet Radius', value: planet.pl_rade, format: v => `${v.toFixed(2)} R⊕`, ref: 1, refLabel: 'Earth = 1.0 R⊕' },
                        { label: 'Planet Mass', value: planet.pl_masse, format: v => `${v.toFixed(2)} M⊕`, ref: 1, refLabel: 'Earth = 1.0 M⊕' },
                        { label: 'Equilibrium Temperature', value: planet.pl_eqt, format: v => `${Math.round(v)} K`, ref: 255, refLabel: 'Earth (eq.) = 255 K' },
                        { label: 'Insolation Flux', value: planet.pl_insol, format: v => `${v.toFixed(2)} S⊕`, ref: 1, refLabel: 'Earth = 1.0 S⊕' },
                        { label: 'Orbital Period', value: planet.pl_orbper, format: v => `${Math.round(v)} days`, ref: 365, refLabel: 'Earth = 365 days' },
                        { label: 'Semi-Major Axis', value: planet.pl_orbsmax, format: v => `${v.toFixed(3)} AU`, ref: 1, refLabel: 'Earth = 1.0 AU' },
                        { label: 'Orbital Eccentricity', value: planet.pl_orbeccen, format: v => v.toFixed(3), ref: null },
                      ].filter(item => item.value != null).map(({ label, value, format, ref, refLabel }) => {
                        const pct = ref ? Math.min((value / ref) * 50, 100) : null;
                        return (
                          <div key={label} className="p-3 bg-slate-800/40 rounded-lg hover:bg-slate-800/60 transition-colors">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-slate-400 text-sm">{label}</span>
                              <span className="text-white font-semibold text-sm">{format(value)}</span>
                            </div>
                            {ref && (
                              <div className="mt-1.5">
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 bg-slate-700 rounded-full h-1">
                                    <motion.div
                                      initial={{ width: 0 }}
                                      animate={{ width: `${pct}%` }}
                                      transition={{ duration: 0.8, ease: 'easeOut', delay: 0.1 }}
                                      className="h-full bg-cyan-500/60 rounded-full"
                                    />
                                  </div>
                                  <span className="text-xs text-slate-600 w-20 text-right">{refLabel}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                      {[
                        'pl_rade', 'pl_masse', 'pl_eqt', 'pl_insol', 'pl_orbper', 'pl_orbsmax', 'pl_orbeccen'
                      ].every(k => planet[k] == null) && (
                        <p className="text-slate-500 text-sm text-center py-4">No planetary parameters available.</p>
                      )}
                    </div>
                  )}

                  {/* STELLAR TAB */}
                  {activeTab === 'stellar' && (
                    <div className="space-y-2">
                      {[
                        { label: 'Star Effective Temperature', value: planet.st_teff, format: v => `${Math.round(v)} K` },
                        { label: 'Star Radius', value: planet.st_rad, format: v => `${v.toFixed(2)} R☉` },
                        { label: 'Star Mass', value: planet.st_mass, format: v => `${v.toFixed(2)} M☉` },
                        { label: 'Spectral Type', value: planet.stellar_type, format: v => v },
                        { label: 'Metallicity [Fe/H]', value: planet.st_met, format: v => v.toFixed(2) },
                        { label: 'Stellar Luminosity', value: planet.st_lum, format: v => `${v.toFixed(2)} L☉` },
                      ].filter(item => item.value != null).map(({ label, value, format }) => (
                        <div key={label}
                          className="flex items-center justify-between p-3 bg-slate-800/40 
                                     rounded-lg hover:bg-slate-800/60 transition-colors">
                          <span className="text-slate-400 text-sm">{label}</span>
                          <span className="text-white font-semibold text-sm">{format(value)}</span>
                        </div>
                      ))}
                      {!planet.st_teff && !planet.st_rad && !planet.st_mass && (
                        <p className="text-slate-500 text-sm text-center py-4">No stellar properties available.</p>
                      )}
                    </div>
                  )}

                  {/* AI PREDICTION TAB */}
                  {activeTab === 'prediction' && (
                    <div className="space-y-4">
                      {predicting ? (
                        <div className="flex items-center gap-3 p-4 bg-slate-800/40 rounded-xl">
                          <Loader2 className="w-5 h-5 animate-spin text-cyan-400" />
                          <span className="text-slate-400">Running ML model prediction...</span>
                        </div>
                      ) : prediction ? (
                        <div className="space-y-3">
                          {/* Main score */}
                          <div className={`p-5 rounded-xl border ${
                            scoreVal >= 0.65 ? 'bg-green-500/10 border-green-500/25' :
                            scoreVal >= 0.35 ? 'bg-yellow-500/10 border-yellow-500/25' :
                            'bg-red-500/10 border-red-500/25'
                          }`}>
                            <div className="flex items-center justify-between mb-3">
                              <div>
                                <p className="text-sm text-slate-400">Habitability Score</p>
                                <p className={`text-4xl font-bold mt-1 ${
                                  scoreVal >= 0.65 ? 'text-green-400' :
                                  scoreVal >= 0.35 ? 'text-yellow-400' : 'text-red-400'
                                }`}>
                                  {(scoreVal * 100).toFixed(1)}%
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-xs text-slate-500 mb-1">Classification</p>
                                <p className={`font-semibold ${
                                  prediction.classification === 'POTENTIALLY_HABITABLE' ? 'text-green-400' :
                                  prediction.classification === 'HABITABILITY_ZONE' ? 'text-yellow-400' : 'text-red-400'
                                }`}>
                                  {prediction.classification?.replace(/_/g, ' ')}
                                </p>
                                {prediction.confidence && (
                                  <p className="text-xs text-slate-500 mt-1">
                                    Confidence: {(prediction.confidence * 100).toFixed(0)}%
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="w-full bg-slate-700/50 rounded-full h-2.5 overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${scoreVal * 100}%` }}
                                transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
                                className={`h-full rounded-full ${
                                  scoreVal >= 0.65 ? 'bg-green-500' :
                                  scoreVal >= 0.35 ? 'bg-yellow-500' : 'bg-red-500'
                                }`}
                              />
                            </div>
                          </div>

                          {/* Class probabilities */}
                          {prediction.probabilities && (
                            <div className="p-4 bg-slate-800/40 rounded-xl space-y-3">
                              <p className="text-sm font-medium text-slate-300">Class Probabilities
                                {prediction.mission_used && (
                                  <span className="ml-2 text-xs text-slate-500 font-normal">
                                    ({prediction.mission_used.toUpperCase()} {prediction.model_type})
                                  </span>
                                )}
                              </p>
                              {Object.entries(prediction.probabilities).map(([key, val]) => (
                                <div key={key} className="space-y-1">
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="text-slate-400">
                                      {key.split('_').map(w => w[0].toUpperCase() + w.slice(1)).join(' ')}
                                    </span>
                                    <span className="text-white font-mono">{(val * 100).toFixed(1)}%</span>
                                  </div>
                                  <div className="w-full bg-slate-700 rounded-full h-1.5 overflow-hidden">
                                    <motion.div
                                      initial={{ width: 0 }}
                                      animate={{ width: `${val * 100}%` }}
                                      transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
                                      className={`h-full rounded-full ${
                                        key === 'potentially_habitable' ? 'bg-green-500' :
                                        key === 'habitability_zone' ? 'bg-yellow-500' : 'bg-red-500'
                                      }`}
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Disclaimer */}
                          <div className="flex gap-2 p-3 bg-slate-800/30 rounded-lg border border-slate-700/40">
                            <Info className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
                            <p className="text-xs text-slate-500 leading-relaxed">
                              Score is based on orbital and physical parameters only.
                              Atmospheric composition, magnetic fields, and other habitability
                              factors cannot yet be measured for exoplanets.
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="p-4 bg-slate-800/40 rounded-xl text-center">
                          <Sparkles className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                          <p className="text-slate-400 text-sm">
                            Insufficient parameters available for ML prediction.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </motion.div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default PlanetDetail;
