import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import PlanetCard from './PlanetCard';
import { getPlanets } from '../services/api';

/**
 * PlanetGrid Component
 * 
 * Displays a grid of planet cards with pagination - Connected to Real API
 */
const PlanetGrid = ({ filters = {}, searchQuery = '', onPlanetSelect }) => {
  const [planets, setPlanets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const pageSize = 12; // Show 12 planets per page

  // Fetch planets from API when filters or search changes
  useEffect(() => {
    fetchPlanets(1);
  }, [filters, searchQuery]);

  const fetchPlanets = async (page) => {
    setLoading(true);
    setError(null);
    
    try {
      // Build filter object for API
      const apiFilters = {
        ...filters,
        q: searchQuery || undefined, // Add search query if exists
      };
      
      // Remove empty filters
      Object.keys(apiFilters).forEach(key => {
        if (apiFilters[key] === '' || apiFilters[key] === null || apiFilters[key] === undefined) {
          delete apiFilters[key];
        }
      });

      const response = await getPlanets(page, pageSize, apiFilters);
      
      if (page === 1) {
        setPlanets(response.results || []);
      } else {
        // Append for "Load More"
        setPlanets(prev => [...prev, ...(response.results || [])]);
      }
      
      setTotalCount(response.count || 0);
      setHasNext(!!response.next);
      setCurrentPage(page);
    } catch (err) {
      console.error('Error fetching planets:', err);
      setError(err.message || 'Failed to load planets. Please try again.');
      setPlanets([]);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMore = () => {
    if (hasNext) {
      fetchPlanets(currentPage + 1);
    }
  };

  const handlePlanetClick = (planet) => {
    if (onPlanetSelect) {
      onPlanetSelect(planet);
    }
  };

  // Loading skeleton
  const LoadingSkeleton = () => (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      {[...Array(6)].map((_, idx) => (
        <div
          key={idx}
          className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 animate-pulse"
        >
          <div className="h-6 bg-slate-700 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-slate-700 rounded w-1/2 mb-4"></div>
          <div className="h-8 bg-slate-700 rounded w-1/3 mb-4"></div>
          <div className="space-y-2 mb-4">
            <div className="h-4 bg-slate-700 rounded"></div>
            <div className="h-4 bg-slate-700 rounded"></div>
          </div>
          <div className="h-10 bg-slate-700 rounded"></div>
        </div>
      ))}
    </div>
  );

  // Empty state
  const EmptyState = () => (
    <div className="text-center py-12">
      <div className="text-slate-400 mb-4">
        <svg
          className="w-24 h-24 mx-auto mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>
      <h3 className="text-xl font-semibold text-white mb-2">No exoplanets found</h3>
      <p className="text-slate-400">
        Try adjusting your filters or search query
      </p>
    </div>
  );

  // Error state
  const ErrorState = () => (
    <div className="text-center py-12">
      <div className="text-red-400 mb-4">
        <svg
          className="w-24 h-24 mx-auto mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>
      <h3 className="text-xl font-semibold text-white mb-2">Error Loading Planets</h3>
      <p className="text-slate-400 mb-4">{error}</p>
      <button
        onClick={() => fetchPlanets(1)}
        className="px-6 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-all"
      >
        Try Again
      </button>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Results Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">
          Discovered Planets
          {totalCount > 0 && (
            <span className="text-slate-400 font-normal ml-2">
              {totalCount} total
            </span>
          )}
        </h2>
      </div>

      {/* Loading State - Only show skeleton on initial load */}
      {loading && planets.length === 0 && <LoadingSkeleton />}

      {/* Error State */}
      {error && !loading && <ErrorState />}

      {/* Planet Grid */}
      {!error && planets.length > 0 && (
        <>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {planets.map((planet) => (
              <PlanetCard
                key={planet.id}
                planet={planet}
                onClick={handlePlanetClick}
              />
            ))}
          </div>

          {/* Load More Button */}
          {hasNext && (
            <div className="flex justify-center pt-6">
              <button
                onClick={handleLoadMore}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-3 bg-cyan-500 hover:bg-cyan-600 
                           text-white rounded-lg transition-all shadow-lg shadow-cyan-500/20
                           disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    Load More ({planets.length} of {totalCount})
                  </>
                )}
              </button>
            </div>
          )}
        </>
      )}

      {/* Empty State */}
      {!loading && !error && planets.length === 0 && <EmptyState />}
    </div>
  );
};

export default PlanetGrid;
