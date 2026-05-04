import { useState, useCallback } from 'react';
import SearchBar from '../components/SearchBar';
import FiltersPanel from '../components/FiltersPanel';
import PlanetGrid from '../components/PlanetGrid';
import PredictionPanel from '../components/PredictionPanel';
import ExoplanetViewer3D from '../components/ExoplanetViewer3D';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

/**
 * ExplorePlanets Page
 * 
 * Main explore page - The backbone of the application
 * Combines search, filters, 3D view, planet grid, and prediction panel
 */
const ExplorePlanets = () => {
  const [filters, setFilters] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlanet, setSelectedPlanet] = useState(null);

  const handleFiltersChange = useCallback((newFilters) => {
    setFilters(newFilters);
  }, []);

  const handleSearch = useCallback((query) => {
    setSearchQuery(query);
  }, []);

  const handlePlanetSelect = useCallback((planet) => {
    setSelectedPlanet(planet);
    console.log('Selected planet:', planet);
    // This will be used later when 3D viewer is added
  }, []);

  const handleResetFilters = useCallback(() => {
    setFilters({});
    setSearchQuery('');
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-16">
      <Navbar />
      
      {/* Top Search Bar */}
      <div className="bg-slate-900/50 border-b border-slate-700 backdrop-blur-md sticky top-16 z-40">
        <div className="max-w-[1920px] mx-auto px-6 py-4">
          <div className="flex items-center justify-center">
            {/* Search Bar — full width, missions filter is in the FiltersPanel sidebar */}
            <div className="flex-1 max-w-2xl">
              <SearchBar onSearch={handleSearch} />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-[1920px] mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Sidebar - Filters */}
          <div className="lg:col-span-3">
            <div className="sticky top-24 space-y-4">
              <FiltersPanel 
                onFiltersChange={handleFiltersChange}
                onReset={handleResetFilters}
              />
            </div>
          </div>

          {/* Middle Section - 3D Orbital Viewer */}
          <div className="lg:col-span-5">
            <div className="h-[520px]">
              <ExoplanetViewer3D filters={filters} searchQuery={searchQuery} />
            </div>
          </div>

          {/* Right Sidebar - Planet Results */}
          <div className="lg:col-span-4">
            <div className="space-y-4 max-h-[calc(100vh-14rem)] overflow-y-auto pr-1
                            scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-transparent">
              <PlanetGrid
                filters={filters}
                searchQuery={searchQuery}
                onPlanetSelect={handlePlanetSelect}
              />
            </div>
          </div>
        </div>

        {/* Bottom Section - Prediction Panel (Always visible) */}
        <section className="mt-8">
          <div className="mb-3 flex items-end justify-between gap-3 px-1">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-300/70">
                AI Toolkit
              </p>
              <h2 className="text-xl font-semibold text-white">Habitability Prediction Studio</h2>
            </div>
            <span className="hidden rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-cyan-200 sm:inline-flex">
              Always Available
            </span>
          </div>
          <PredictionPanel />
        </section>
      </div>

      <Footer />
    </div>
  );
};

export default ExplorePlanets;
