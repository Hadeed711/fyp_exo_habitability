import { ArrowRight, TrendingUp, TrendingDown, Minus, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

/**
 * PlanetCard Component
 *
 * Displays a single exoplanet card with key information.
 * Supports both ExoplanetListSerializer (mission_name flat field)
 * and ExoplanetDetailSerializer (mission.name nested object).
 */
const PlanetCard = ({ planet, onClick }) => {
  const navigate = useNavigate();

  // Support both serializer formats: list uses mission_name, detail uses mission.name
  const missionName = planet.mission_name || planet.mission?.name || '';

  // Detect incomplete data — any core parameter is missing
  const hasPartialData = planet.pl_eqt == null || planet.pl_rade == null || planet.pl_insol == null;

  // If data is incomplete, cap at yellow (uncertain) even if classified as POTENTIALLY_HABITABLE
  const getHabitabilityPercentage = () => {
    if (hasPartialData) {
      if (planet.habitability_class === 'POTENTIALLY_HABITABLE') return 50; // demote to yellow
      if (planet.habitability_class === 'HABITABILITY_ZONE') return 45;
      return 12;
    }
    if (planet.habitability_class === 'POTENTIALLY_HABITABLE') return 87;
    if (planet.habitability_class === 'HABITABILITY_ZONE') return 55;
    return 12;
  };

  const habitabilityPercent = getHabitabilityPercentage();

  const getHabitabilityColor = () => {
    if (habitabilityPercent >= 70) return 'text-green-400';
    if (habitabilityPercent >= 35) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getHabitabilityBarColor = () => {
    if (habitabilityPercent >= 70) return 'bg-green-500';
    if (habitabilityPercent >= 35) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  // Get mission badge color
  const getMissionColor = () => {
    const name = missionName.toLowerCase();
    if (name === 'kepler') return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    if (name === 'k2') return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
    if (name === 'tess') return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30';
    return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
  };

  const getTrendIcon = () => {
    if (habitabilityPercent >= 70) return <TrendingUp className="w-4 h-4" />;
    if (habitabilityPercent >= 35) return <Minus className="w-4 h-4" />;
    return <TrendingDown className="w-4 h-4" />;
  };

  const handleViewDetails = (e) => {
    e.stopPropagation();
    navigate(`/planets/${planet.id}`);
  };

  const handleCardClick = () => {
    if (onClick) onClick(planet);
  };

  return (
    <div
      onClick={handleCardClick}
      className="bg-slate-800/50 border border-slate-700 rounded-lg p-4
                 hover:border-cyan-500/50 hover:shadow-lg hover:shadow-cyan-500/10
                 transition-all duration-300 cursor-pointer group flex flex-col"
    >
      {/* Planet Name + Mission Badge */}
      <div className="mb-3 min-w-0">
        <h3
          className="text-white font-semibold text-sm leading-snug mb-1.5
                     group-hover:text-cyan-400 transition-colors
                     overflow-hidden break-words line-clamp-2"
          title={planet.planet_name}
        >
          {planet.planet_name}
        </h3>
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`inline-block px-2 py-0.5 rounded text-xs border flex-shrink-0 ${getMissionColor()}`}>
            {missionName || 'Unknown'}
          </span>
          {/* Provenance: candidate-class objects are not yet confirmed planets.
              Only flagged when false, so confirmed planets stay visually clean. */}
          {planet.is_confirmed === false && (
            <span
              className="inline-block px-2 py-0.5 rounded text-xs border flex-shrink-0
                         bg-slate-700/40 border-slate-600 text-slate-400"
              title={`Archive disposition: ${planet.disposition || 'candidate'} - not yet a confirmed planet`}
            >
              Candidate
            </span>
          )}
          {hasPartialData && (
            <span className="flex items-center gap-1 text-amber-400 text-xs flex-shrink-0">
              <AlertCircle className="w-3 h-3" />
              Partial data
            </span>
          )}
        </div>
      </div>

      {/* Habitability Score */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className={`text-xl font-bold ${getHabitabilityColor()}`}>
            {habitabilityPercent}%
          </span>
          <div className={getHabitabilityColor()}>
            {getTrendIcon()}
          </div>
        </div>
        {/* Mini progress bar */}
        <div className="w-full bg-slate-700 rounded-full h-1.5 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${getHabitabilityBarColor()}`}
            style={{ width: `${habitabilityPercent}%` }}
          />
        </div>
        <p className="text-slate-400 text-xs mt-0.5">Habitability Score</p>
      </div>

      {/* Divider */}
      <div className="h-px bg-slate-700 mb-3"></div>

      {/* Planet Parameters — always shown, N/A when missing */}
      <div className="space-y-1.5 mb-4 flex-1">
        {/* Class badge */}
        <div className="flex items-center justify-between">
          <span className="text-slate-400 text-xs">Class</span>
          <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
            planet.habitability_class === 'POTENTIALLY_HABITABLE'
              ? 'bg-green-500/20 text-green-400'
              : planet.habitability_class === 'HABITABILITY_ZONE'
              ? 'bg-yellow-500/20 text-yellow-400'
              : 'bg-red-500/20 text-red-400'
          }`}>
            {planet.habitability_class === 'POTENTIALLY_HABITABLE'
              ? 'Pot. Habitable'
              : planet.habitability_class === 'HABITABILITY_ZONE'
              ? 'HZ Candidate'
              : 'Non-Habitable'}
          </span>
        </div>

        {/* Temperature */}
        <div className="flex items-center justify-between">
          <span className="text-slate-400 text-xs">Temperature</span>
          <span className="text-xs font-medium">
            {planet.pl_eqt != null
              ? <span className="text-white">{Math.round(planet.pl_eqt)} K</span>
              : <span className="text-slate-500">N/A</span>}
          </span>
        </div>

        {/* Radius */}
        <div className="flex items-center justify-between">
          <span className="text-slate-400 text-xs">Radius</span>
          <span className="text-xs font-medium">
            {planet.pl_rade != null
              ? <span className="text-white">{planet.pl_rade.toFixed(2)} R⊕</span>
              : <span className="text-slate-500">N/A</span>}
          </span>
        </div>

        {/* Orbital period (optional) */}
        <div className="flex items-center justify-between">
          <span className="text-slate-400 text-xs">Orb. Period</span>
          <span className="text-xs font-medium">
            {planet.pl_orbper != null
              ? <span className="text-white">{planet.pl_orbper.toFixed(1)} d</span>
              : <span className="text-slate-500">N/A</span>}
          </span>
        </div>
      </div>

      {/* View Details Button */}
      <button
        onClick={handleViewDetails}
        className="w-full flex items-center justify-center gap-2 px-4 py-2
                   bg-cyan-500/10 border border-cyan-500/30 rounded-lg
                   text-cyan-400 hover:bg-cyan-500/20 hover:border-cyan-500
                   transition-all duration-200 group/btn mt-auto"
      >
        <span className="text-sm font-medium">View Details</span>
        <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
      </button>
    </div>
  );
};

export default PlanetCard;
