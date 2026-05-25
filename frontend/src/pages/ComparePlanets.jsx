import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, X, Plus, Search, Loader2, Sparkles, Telescope } from 'lucide-react';
import { motion } from 'framer-motion';
import { searchPlanets } from '../services/api';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Radar, Bar } from 'react-chartjs-2';

ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
);

/**
 * ComparePlanets Page
 *
 * Side-by-side comparison of multiple exoplanets (up to 4) — real API backed.
 */
const ComparePlanets = () => {
  const navigate = useNavigate();
  const [selectedPlanets, setSelectedPlanets]     = useState([]);
  const [searchQuery, setSearchQuery]             = useState('');
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [searchResults, setSearchResults]         = useState([]);
  const [searchLoading, setSearchLoading]         = useState(false);
  const [suggestedPlanets, setSuggestedPlanets]   = useState([]);
  const debounceTimer = useRef(null);

  // Fetch two well-known real exoplanets as suggestions on mount
  useEffect(() => {
    const fetchSuggestions = async () => {
      try {
        const [r1, r2] = await Promise.all([
          searchPlanets('Kepler-452 b'),
          searchPlanets('Kepler-22 b'),
        ]);
        const p1 = (r1.results || [])[0];
        const p2 = (r2.results || [])[0];
        setSuggestedPlanets([p1, p2].filter(Boolean));
      } catch {
        // suggestions are optional — silently ignore errors
      }
    };
    fetchSuggestions();
  }, []);

  // Debounced real-API search
  useEffect(() => {
    if (!showSearchDropdown) return;

    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    debounceTimer.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const response = await searchPlanets(searchQuery);
        const results = (response.results || []).filter(
          p => !selectedPlanets.find(sp => sp.id === p.id)
        );
        setSearchResults(results.slice(0, 8));
      } catch (err) {
        console.error('Search error:', err);
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 300);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [searchQuery, showSearchDropdown, selectedPlanets]);

  const handleAddPlanet = (planet) => {
    if (selectedPlanets.length < 4) {
      setSelectedPlanets(prev => [...prev, planet]);
      setSearchQuery('');
      setSearchResults([]);
      setShowSearchDropdown(false);
    }
  };

  const handleRemovePlanet = (planetId) => {
    setSelectedPlanets(prev => prev.filter(p => p.id !== planetId));
  };

  const handleClearAll = () => setSelectedPlanets([]);

  // Support both list serializer (mission_name) and detail serializer (mission.name)
  const getMissionDisplayName = (planet) =>
    planet.mission_name || planet.mission?.name || 'Unknown';

  // Derive a consistent visual % from habitability_class (mirrors PlanetCard logic)
  const getHabitabilityPercent = (planet) => {
    const hasPartialData =
      planet.pl_eqt == null || planet.pl_rade == null || planet.pl_insol == null;
    if (hasPartialData) {
      if (planet.habitability_class === 'POTENTIALLY_HABITABLE') return 50;
      if (planet.habitability_class === 'HABITABILITY_ZONE') return 45;
      return 12;
    }
    if (planet.habitability_class === 'POTENTIALLY_HABITABLE') return 87;
    if (planet.habitability_class === 'HABITABILITY_ZONE') return 55;
    return 12;
  };

  const getHabitabilityColor = (planet) => {
    const pct = getHabitabilityPercent(planet);
    if (pct >= 70) return 'text-green-400';
    if (pct >= 35) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getMissionColor = (missionName) => {
    const m = (missionName || '').toLowerCase();
    if (m === 'kepler') return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    if (m === 'k2')     return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
    if (m === 'tess')   return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30';
    return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
  };

  // Parameter rows — no 'esi' key (not returned by API list serializer)
  const parameterRows = [
    { label: 'Planet Radius',   key: 'pl_rade',    unit: 'R⊕',  multiplier: 1, decimals: 2 },
    { label: 'Temperature',     key: 'pl_eqt',     unit: 'K',   multiplier: 1, decimals: 0 },
    { label: 'Insolation',      key: 'pl_insol',   unit: 'S⊕',  multiplier: 1, decimals: 2 },
    { label: 'Orbital Period',  key: 'pl_orbper',  unit: 'days', multiplier: 1, decimals: 1 },
    { label: 'Semi-major Axis', key: 'pl_orbsmax', unit: 'AU',  multiplier: 1, decimals: 3 },
    { label: 'Eccentricity',    key: 'pl_orbeccen',unit: '',    multiplier: 1, decimals: 3 },
    { label: 'Stellar Temp',    key: 'st_teff',    unit: 'K',   multiplier: 1, decimals: 0 },
    { label: 'Stellar Radius',  key: 'st_rad',     unit: 'R☉',  multiplier: 1, decimals: 2 },
    { label: 'Stellar Mass',    key: 'st_mass',    unit: 'M☉',  multiplier: 1, decimals: 2 },
    { label: 'Discovery Year',  key: 'disc_year',  unit: '',    multiplier: 1, decimals: 0 },
  ];

  const formatValue = (value, row) => {
    if (value === null || value === undefined) return 'N/A';
    const num = (value * row.multiplier).toFixed(row.decimals);
    return row.unit ? `${num} ${row.unit}` : num;
  };

  // Per-planet colors for charts (up to 4 planets)
  const PLANET_COLORS = [
    { border: 'rgba(34,211,238,1)',  bg: 'rgba(34,211,238,0.15)' },
    { border: 'rgba(168,85,247,1)', bg: 'rgba(168,85,247,0.15)' },
    { border: 'rgba(251,146,60,1)', bg: 'rgba(251,146,60,0.15)' },
    { border: 'rgba(74,222,128,1)', bg: 'rgba(74,222,128,0.15)' },
  ];

  // Radar chart: normalize each metric to 0-1 scale for comparison
  const radarData = selectedPlanets.length > 1 ? (() => {
    const labels = ['Radius', 'Temperature', 'Insolation', 'Orbital Period', 'Stellar Temp', 'Stellar Mass'];
    const maxes  = [15, 1500, 100, 90000, 7500, 3];
    const keys   = ['pl_rade', 'pl_eqt', 'pl_insol', 'pl_orbper', 'st_teff', 'st_mass'];
    return {
      labels,
      datasets: selectedPlanets.map((p, i) => ({
        label: p.planet_name,
        data: keys.map((k, ki) => {
          const v = p[k];
          return v != null ? Math.min(v / maxes[ki], 1) : 0;
        }),
        borderColor: PLANET_COLORS[i].border,
        backgroundColor: PLANET_COLORS[i].bg,
        pointBackgroundColor: PLANET_COLORS[i].border,
        borderWidth: 2,
      })),
    };
  })() : null;

  const radarOptions = {
    scales: { r: { ticks: { color: '#94a3b8', backdropColor: 'transparent', stepSize: 0.2 }, grid: { color: 'rgba(148,163,184,0.2)' }, angleLines: { color: 'rgba(148,163,184,0.2)' }, pointLabels: { color: '#cbd5e1', font: { size: 11 } }, min: 0, max: 1 } },
    plugins: { legend: { labels: { color: '#cbd5e1', font: { size: 12 } } } },
    responsive: true,
    maintainAspectRatio: true,
  };

  // Bar chart: key physical metrics grouped by planet
  const barData = selectedPlanets.length > 1 ? (() => {
    const barMetrics = [
      { label: 'Radius (R⊕)', key: 'pl_rade' },
      { label: 'Insolation (S⊕)', key: 'pl_insol' },
      { label: 'Stellar Mass (M☉)', key: 'st_mass' },
      { label: 'Stellar Radius (R☉)', key: 'st_rad' },
    ];
    return {
      labels: barMetrics.map(m => m.label),
      datasets: selectedPlanets.map((p, i) => ({
        label: p.planet_name,
        data: barMetrics.map(m => p[m.key] ?? 0),
        backgroundColor: PLANET_COLORS[i].bg.replace('0.15', '0.6'),
        borderColor: PLANET_COLORS[i].border,
        borderWidth: 1.5,
        borderRadius: 4,
      })),
    };
  })() : null;

  const barOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: { legend: { labels: { color: '#cbd5e1', font: { size: 12 } } } },
    scales: {
      x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(148,163,184,0.1)' } },
      y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(148,163,184,0.1)' } },
    },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-6 pt-24 pb-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/explore')}
            className="flex items-center gap-2 text-slate-400 hover:text-white mb-4 
                       transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Explore
          </button>
          
          <h1 className="text-4xl font-bold text-white mb-2">
            Compare <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">Exoplanets</span>
          </h1>
          <p className="text-slate-400">
            Select up to 4 exoplanets to compare their characteristics side-by-side
          </p>
        </div>

        {/* Planet Selection */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">
              Selected Exoplanets ({selectedPlanets.length}/4)
            </h2>
            {selectedPlanets.length > 0 && (
              <button
                onClick={handleClearAll}
                className="text-red-400 hover:text-red-300 text-sm transition-colors"
              >
                Clear All
              </button>
            )}
          </div>

          {/* Selected Planets Pills */}
          <div className="flex flex-wrap gap-3 mb-4">
            {selectedPlanets.map(planet => (
              <div
                key={planet.id}
                className="flex items-center gap-2 px-4 py-2 bg-cyan-500/10 border border-cyan-500/30 
                           rounded-full text-cyan-400"
              >
                <span className="font-medium">{planet.planet_name}</span>
                <button
                  onClick={() => handleRemovePlanet(planet.id)}
                  className="hover:text-cyan-300 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
            
            {/* Add Planet Button */}
            {selectedPlanets.length < 4 && (
              <div className="relative">
                <button
                  onClick={() => setShowSearchDropdown(!showSearchDropdown)}
                  className="flex items-center gap-2 px-4 py-2 border-2 border-dashed 
                             border-slate-600 rounded-full text-slate-400 hover:text-white 
                             hover:border-slate-500 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  Add Exoplanet
                </button>

                {/* Search Dropdown */}
                {showSearchDropdown && (
                  <div className="absolute top-full left-0 mt-2 w-80 bg-slate-800 border 
                                  border-slate-700 rounded-lg shadow-xl z-10">
                    <div className="p-3 border-b border-slate-700">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 
                                          w-4 h-4 text-slate-400" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="e.g. Kepler-452 b, TOI-700 d, K2-18 b"
                          className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 
                                     rounded-lg text-white placeholder-slate-400 focus:outline-none 
                                     focus:ring-2 focus:ring-cyan-500"
                          autoFocus
                        />
                      </div>
                    </div>

                    <div className="max-h-64 overflow-y-auto">
                      {searchLoading ? (
                        <div className="p-4 flex items-center justify-center gap-2 text-slate-400">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Searching...
                        </div>
                      ) : searchResults.length === 0 ? (
                        <div className="p-4 text-center text-slate-400">
                          {searchQuery.trim().length < 2
                            ? 'Type to search exoplanets'
                            : 'No planets found'}
                        </div>
                      ) : (
                        searchResults.map(planet => (
                          <button
                            key={planet.id}
                            onClick={() => handleAddPlanet(planet)}
                            className="w-full px-4 py-3 text-left hover:bg-slate-700/50 
                                       transition-colors border-b border-slate-700 last:border-0"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="text-white font-medium">{planet.planet_name}</div>
                                <div className="text-sm text-slate-400">
                                  {getMissionDisplayName(planet)} •{' '}
                                  {planet.habitability_class?.replace(/_/g, ' ') || 'Unknown'}
                                </div>
                              </div>
                              <Plus className="w-4 h-4 text-slate-400" />
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Suggested planets */}
          {suggestedPlanets.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-700/60">
              <p className="text-xs text-slate-500 mb-3 flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Try these well-known exoplanets
              </p>
              <div className="flex flex-wrap gap-3">
                {suggestedPlanets
                  .filter(p => !selectedPlanets.find(sp => sp.id === p.id))
                  .map(planet => (
                    <button
                      key={planet.id}
                      onClick={() => handleAddPlanet(planet)}
                      disabled={selectedPlanets.length >= 4}
                      className="flex items-center gap-2 px-4 py-2 border-2 border-dashed
                                 border-cyan-600/40 rounded-full text-slate-300 hover:text-white
                                 hover:border-cyan-500/70 hover:bg-cyan-500/10 transition-all
                                 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <span className="text-sm">🪐</span>
                      <span className="font-medium text-sm">{planet.planet_name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${getMissionColor(getMissionDisplayName(planet))}`}>
                        {getMissionDisplayName(planet)}
                      </span>
                      <Plus className="w-3.5 h-3.5 text-cyan-400" />
                    </button>
                  ))}
              </div>
            </div>
          )}

          {selectedPlanets.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-8 text-slate-400"
            >
              <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Select exoplanets to start comparing</p>
            </motion.div>
          )}
        </div>

        {/* Comparison Table */}
        {selectedPlanets.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="bg-slate-800/50 border border-slate-700 rounded-lg overflow-hidden">
            {/* Planet Headers */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-6 
                            border-b border-slate-700">
              {selectedPlanets.map(planet => (
                <div key={planet.id} className="space-y-3">
                  {/* Planet Icon */}
                  <div className="text-5xl text-center">🪐</div>
                  
                  {/* Planet Name */}
                  <div className="text-center">
                    <h3 className="text-lg font-semibold text-white mb-1">
                      {planet.planet_name}
                    </h3>
                    <span className={`inline-block px-3 py-1 text-xs font-medium border rounded-full
                                     ${getMissionColor(getMissionDisplayName(planet))}`}>
                      {getMissionDisplayName(planet)}
                    </span>
                  </div>

                  {/* Habitability Score */}
                  <div className="text-center">
                    <div className={`text-3xl font-bold ${getHabitabilityColor(planet)}`}>
                      {getHabitabilityPercent(planet)}%
                    </div>
                    <div className="text-sm text-slate-400 mt-1">Habitability</div>
                  </div>

                  {/* Classification */}
                  <div className="text-center">
                    <div className="text-xs text-slate-400">
                      {planet.habitability_class?.replace(/_/g, ' ')}
                    </div>
                  </div>

                  {/* View Details Button */}
                  <button
                    onClick={() => navigate(`/planets/${planet.id}`)}
                    className="w-full px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white 
                               rounded-lg transition-colors text-sm"
                  >
                    View Details
                  </button>
                </div>
              ))}
            </div>

            {/* Comparison Parameters Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700 bg-slate-900/60">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider w-40">
                      Parameter
                    </th>
                    {selectedPlanets.map(planet => (
                      <th key={planet.id} className="text-center px-5 py-3 text-xs font-semibold text-slate-300 uppercase tracking-wider">
                        {planet.planet_name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {parameterRows.map((row, idx) => (
                    <tr
                      key={idx}
                      className={`border-b border-slate-700/50 transition-colors hover:bg-slate-700/20 ${idx % 2 === 0 ? 'bg-slate-800/20' : ''}`}
                    >
                      <td className="px-5 py-3 font-medium text-slate-300 whitespace-nowrap">
                        {row.label}
                        {row.unit ? <span className="ml-1 text-xs text-slate-500">({row.unit})</span> : null}
                      </td>
                      {selectedPlanets.map(planet => {
                        const value = planet[row.key];
                        const isHighest = selectedPlanets.length > 1 && value != null && selectedPlanets.every(p =>
                          (p[row.key] ?? -Infinity) <= value
                        );
                        return (
                          <td
                            key={planet.id}
                            className={`px-5 py-3 text-center ${isHighest ? 'text-cyan-400 font-semibold' : 'text-slate-400'}`}
                          >
                            {value != null ? (value * row.multiplier).toFixed(row.decimals) : <span className="text-slate-600 italic">N/A</span>}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Note */}
            <div className="p-4 bg-slate-900/50 text-center text-xs text-slate-500 border-t border-slate-700">
              Highest values in each row highlighted in cyan &nbsp;·&nbsp;
              R⊕ = Earth Radii &nbsp;·&nbsp; S⊕ = Solar Flux (Earth=1) &nbsp;·&nbsp; AU = Astronomical Unit &nbsp;·&nbsp; R☉ = Solar Radii &nbsp;·&nbsp; M☉ = Solar Mass
            </div>
          </motion.div>
        )}

        {/* Charts section — only shown when 2+ planets selected */}
        {selectedPlanets.length > 1 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6"
          >
            {/* Radar Chart */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
              <h3 className="text-base font-semibold text-white mb-4">Multi-Parameter Comparison</h3>
              <p className="text-xs text-slate-500 mb-4">All values normalised 0–1 relative to dataset maximums</p>
              <Radar data={radarData} options={radarOptions} />
            </div>

            {/* Bar Chart */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
              <h3 className="text-base font-semibold text-white mb-4">Physical Properties</h3>
              <p className="text-xs text-slate-500 mb-4">Radius, insolation, and stellar characteristics per planet</p>
              <Bar data={barData} options={barOptions} />
            </div>
          </motion.div>
        )}

        {/* Empty State */}
        {selectedPlanets.length === 0 && (
          <div className="bg-slate-800/30 border-2 border-dashed border-slate-700 rounded-lg 
                          p-12 text-center">
            <div className="max-w-md mx-auto">
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                className="flex justify-center mb-4"
              >
                <Telescope className="w-16 h-16 text-slate-600" />
              </motion.div>
              <h3 className="text-2xl font-bold text-white mb-2">
                No Exoplanets Selected
              </h3>
              <p className="text-slate-400 mb-6">
                Click "Add Exoplanet" above to start comparing. You can compare up to 4
                exoplanets side-by-side.
              </p>
              <button
                onClick={() => navigate('/explore')}
                className="px-6 py-3 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg 
                           transition-colors"
              >
                Browse Exoplanets
              </button>
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default ComparePlanets;
