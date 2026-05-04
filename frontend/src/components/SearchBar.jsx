import { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import { searchPlanets } from '../services/api';

/**
 * SearchBar Component
 * 
 * Real-time search for exoplanets with debouncing and API suggestions
 */
const SearchBar = ({ onSearch }) => {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [error, setError] = useState(null);
  const searchRef = useRef(null);
  const debounceTimer = useRef(null);
  
  // Store callback in ref to avoid infinite loops
  const onSearchRef = useRef(onSearch);
  
  // Update ref when callback changes
  useEffect(() => {
    onSearchRef.current = onSearch;
  }, [onSearch]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search
  useEffect(() => {
    if (query.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      setError(null);
      if (onSearchRef.current) onSearchRef.current('');
      return;
    }

    // Clear previous timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Set new timer for debounced search (300ms delay)
    debounceTimer.current = setTimeout(async () => {
      setIsSearching(true);
      setError(null);
      try {
        // Use real API for search
        const response = await searchPlanets(query);
        
        // Show first 5 results as suggestions
        if (response.results && response.results.length > 0) {
          setSuggestions(response.results.slice(0, 5));
          setShowSuggestions(true);
        } else {
          setSuggestions([]);
          setShowSuggestions(false);
        }

        // Pass search query to parent (ExplorePlanets will handle fetching with this query)
        if (onSearchRef.current) {
          onSearchRef.current(query);
        }
      } catch (err) {
        console.error('Search error:', err);
        setError('Search failed. Please try again.');
        setSuggestions([]);
        setShowSuggestions(false);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [query]); // Only depend on query now

  const handleClear = () => {
    setQuery('');
    setSuggestions([]);
    setShowSuggestions(false);
    if (onSearchRef.current) {
      onSearchRef.current('');
    }
  };

  const handleSuggestionClick = (planet) => {
    setQuery(planet.planet_name);
    setShowSuggestions(false);
    // Could navigate to planet detail page here
  };

  return (
    <div ref={searchRef} className="relative w-full">
      {/* Search Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
          <Search className="w-5 h-5 text-cyan-400" />
        </div>
        
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by planet name or star"
          className="w-full pl-12 pr-12 py-3 bg-slate-800/50 border border-slate-700 rounded-lg 
                     text-white placeholder-slate-400 
                     focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent
                     transition-all duration-200"
        />

        {/* Clear button */}
        {query && (
          <button
            onClick={handleClear}
            className="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400 
                       hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Loading indicator */}
        {isSearching && (
          <div className="absolute inset-y-0 right-12 flex items-center pr-4">
            <div className="w-5 h-5 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Suggestions Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-2 bg-slate-800 border border-slate-700 rounded-lg 
                        shadow-xl overflow-hidden">
          {suggestions.map((planet) => (
            <button
              key={planet.id}
              onClick={() => handleSuggestionClick(planet)}
              className="w-full px-4 py-3 text-left hover:bg-slate-700/50 transition-colors
                         border-b border-slate-700 last:border-b-0"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">{planet.planet_name}</p>
                  <p className="text-sm text-slate-400">
                    {planet.mission?.name || 'Unknown'} Mission
                  </p>
                </div>
                {planet.habitability_class && (
                  <span className={`text-xs px-2 py-1 rounded ${
                    planet.habitability_class === 'POTENTIALLY_HABITABLE' 
                      ? 'bg-green-500/20 text-green-400'
                      : planet.habitability_class === 'HABITABILITY_ZONE'
                      ? 'bg-yellow-500/20 text-yellow-400'
                      : 'bg-red-500/20 text-red-400'
                  }`}>
                    {planet.habitability_class.replace('_', ' ')}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* No Results Message */}
      {showSuggestions && suggestions.length === 0 && query.trim().length >= 2 && !isSearching && !error && (
        <div className="absolute z-50 w-full mt-2 bg-slate-800 border border-slate-700 rounded-lg 
                        shadow-xl p-4">
          <p className="text-slate-400 text-center">No planets found matching "{query}"</p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="absolute z-50 w-full mt-2 bg-red-900/20 border border-red-700 rounded-lg 
                        shadow-xl p-4">
          <p className="text-red-400 text-center">{error}</p>
        </div>
      )}
    </div>
  );
};

export default SearchBar;
