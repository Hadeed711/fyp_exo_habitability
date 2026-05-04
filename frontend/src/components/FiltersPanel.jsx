import { useState, useEffect } from 'react';
import { Filter, X, ChevronDown } from 'lucide-react';

/**
 * FiltersPanel Component
 * 
 * Advanced filtering for exoplanets based on mission, habitability, temperature, radius
 */
const FiltersPanel = ({ onFiltersChange, onReset }) => {
  const [filters, setFilters] = useState({
    mission: '',
    habitability: '',
    min_temp: '',
    max_temp: '',
    min_radius: '',
    max_radius: '',
    hide_incomplete: false
  });

  const [isExpanded, setIsExpanded] = useState({
    mission: true,
    habitability: true,
    temperature: true,
    radius: true
  });

  // Mission options
  const missions = [
    { value: '', label: 'All Missions' },
    { value: 'k2', label: 'K2' },
    { value: 'kepler', label: 'Kepler' },
    { value: 'tess', label: 'TESS' }
  ];

  // Habitability class options
  const habitabilityClasses = [
    { value: '', label: 'All Classes' },
    { value: 'POTENTIALLY_HABITABLE', label: 'Potentially Habitable' },
    { value: 'HABITABILITY_ZONE', label: 'Habitability Zone' },
    { value: 'NON_HABITABLE', label: 'Non-Habitable' }
  ];

  // Update parent component when filters change
  useEffect(() => {
    if (onFiltersChange) {
      // Only send non-empty filters
      const activeFilters = {};
      Object.keys(filters).forEach(key => {
        const val = filters[key];
        if (val !== '' && val !== null && val !== undefined && val !== false) {
          activeFilters[key] = val;
        }
      });
      onFiltersChange(activeFilters);
    }
  }, [filters, onFiltersChange]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleReset = () => {
    setFilters({
      mission: '',
      habitability: '',
      min_temp: '',
      max_temp: '',
      min_radius: '',
      max_radius: '',
      hide_incomplete: false
    });
    if (onReset) {
      onReset();
    }
  };

  const toggleSection = (section) => {
    setIsExpanded(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Count active filters
  const activeFilterCount = Object.values(filters).filter(
    val => val !== '' && val !== null && val !== false
  ).length;

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-cyan-400" />
          <h3 className="text-lg font-semibold text-white">Filters</h3>
          {activeFilterCount > 0 && (
            <span className="bg-cyan-500 text-white text-xs px-2 py-0.5 rounded-full">
              {activeFilterCount}
            </span>
          )}
        </div>
        {activeFilterCount > 0 && (
          <button
            onClick={handleReset}
            className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1"
          >
            <X className="w-4 h-4" />
            Reset Filters
          </button>
        )}
      </div>

      <div className="space-y-4">
        {/* Mission Filter */}
        <div>
          <button
            onClick={() => toggleSection('mission')}
            className="w-full flex items-center justify-between mb-2"
          >
            <label className="text-sm font-medium text-slate-300">Mission</label>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${
              isExpanded.mission ? 'rotate-180' : ''
            }`} />
          </button>
          
          {isExpanded.mission && (
            <select
              value={filters.mission}
              onChange={(e) => handleFilterChange('mission', e.target.value)}
              className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg 
                         text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 
                         focus:border-transparent transition-all"
            >
              {missions.map(mission => (
                <option key={mission.value} value={mission.value}>
                  {mission.label}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Habitability Score Slider */}
        <div>
          <button
            onClick={() => toggleSection('habitability')}
            className="w-full flex items-center justify-between mb-2"
          >
            <label className="text-sm font-medium text-slate-300">Habitability Score</label>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${
              isExpanded.habitability ? 'rotate-180' : ''
            }`} />
          </button>
          
          {isExpanded.habitability && (
            <div className="space-y-3">
              {/* Habitability Class Dropdown */}
              <select
                value={filters.habitability}
                onChange={(e) => handleFilterChange('habitability', e.target.value)}
                className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg
                           text-white focus:outline-none focus:ring-2 focus:ring-cyan-500
                           focus:border-transparent transition-all text-sm"
              >
                {habitabilityClasses.map(hClass => (
                  <option key={hClass.value} value={hClass.value}>
                    {hClass.label}
                  </option>
                ))}
              </select>
              {/* Score reference */}
              <div className="flex justify-between text-xs text-slate-500 px-1">
                <span className="text-red-400/70">&lt;15% Non-Hab.</span>
                <span className="text-yellow-400/70">~55% HZ</span>
                <span className="text-green-400/70">&gt;85% Pot. Hab.</span>
              </div>

              {/* Hide incomplete data toggle */}
              <label className="flex items-center gap-2 cursor-pointer group">
                <div
                  onClick={() => handleFilterChange('hide_incomplete', !filters.hide_incomplete)}
                  className={`w-9 h-5 rounded-full transition-colors flex-shrink-0 ${
                    filters.hide_incomplete ? 'bg-cyan-500' : 'bg-slate-600'
                  } flex items-center px-0.5`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white transition-transform ${
                    filters.hide_incomplete ? 'translate-x-4' : 'translate-x-0'
                  }`} />
                </div>
                <span className="text-xs text-slate-400 group-hover:text-slate-300">
                  Hide incomplete data
                </span>
              </label>
            </div>
          )}
        </div>

        {/* Temperature Range */}
        <div>
          <button
            onClick={() => toggleSection('temperature')}
            className="w-full flex items-center justify-between mb-2"
          >
            <label className="text-sm font-medium text-slate-300">Temperature Range (K)</label>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${
              isExpanded.temperature ? 'rotate-180' : ''
            }`} />
          </button>
          
          {isExpanded.temperature && (
            <div className="space-y-3">
              <div className="flex justify-between text-xs text-slate-400">
                <span>Min: {filters.min_temp || 0} K</span>
                <span>Max: {filters.max_temp || 1500} K</span>
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Minimum (K)</label>
                <input
                  type="range" min="0" max="1500" step="10"
                  value={filters.min_temp || 0}
                  onChange={(e) => handleFilterChange('min_temp', e.target.value === '0' ? '' : e.target.value)}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Maximum (K)</label>
                <input
                  type="range" min="0" max="1500" step="10"
                  value={filters.max_temp || 1500}
                  onChange={(e) => handleFilterChange('max_temp', e.target.value === '1500' ? '' : e.target.value)}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                />
              </div>
              <div className="flex justify-between text-xs text-slate-500">
                <span>0 K</span><span>750 K</span><span>1500 K</span>
              </div>
            </div>
          )}
        </div>

        {/* Radius Range */}
        <div>
          <button
            onClick={() => toggleSection('radius')}
            className="w-full flex items-center justify-between mb-2"
          >
            <label className="text-sm font-medium text-slate-300">Radius (Earth Radii)</label>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${
              isExpanded.radius ? 'rotate-180' : ''
            }`} />
          </button>
          
          {isExpanded.radius && (
            <div className="space-y-3">
              <div className="flex justify-between text-xs text-slate-400">
                <span>Min: {filters.min_radius || 0} R⊕</span>
                <span>Max: {filters.max_radius || 15} R⊕</span>
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Minimum (R⊕)</label>
                <input
                  type="range" min="0" max="15" step="0.1"
                  value={filters.min_radius || 0}
                  onChange={(e) => handleFilterChange('min_radius', e.target.value === '0' ? '' : e.target.value)}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Maximum (R⊕)</label>
                <input
                  type="range" min="0" max="15" step="0.1"
                  value={filters.max_radius || 15}
                  onChange={(e) => handleFilterChange('max_radius', e.target.value === '15' ? '' : e.target.value)}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                />
              </div>
              <div className="flex justify-between text-xs text-slate-500">
                <span>0</span><span>7.5</span><span>15 R⊕</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FiltersPanel;
