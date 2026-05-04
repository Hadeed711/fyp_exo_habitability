/**
 * Mock Data for Development
 * 
 * Sample exoplanet data to use while building UI
 * (before backend API integration)
 */

export const mockPlanets = [
  {
    id: 1,
    planet_name: 'Kepler-452b',
    mission: {
      id: 1,
      name: 'Kepler',
      full_name: 'Kepler Space Telescope'
    },
    habitability_class: 'POTENTIALLY_HABITABLE',
    pl_rade: 1.6,        // Planet radius (Earth radii)
    pl_eqt: 265,         // Equilibrium temperature (K)
    pl_insol: 1.1,       // Insolation (Earth flux)
    pl_orbper: 384.8,    // Orbital period (days)
    pl_orbsmax: 1.046,   // Semi-major axis (AU)
    pl_orbeccen: 0.1,    // Eccentricity
    st_teff: 5757,       // Stellar effective temperature (K)
    st_rad: 1.11,        // Stellar radius (Solar radii)
    st_mass: 1.04,       // Stellar mass (Solar masses)
    st_type: 'G-type',   // Stellar type
    disc_year: 2015,     // Discovery year
    esi: 0.83            // Earth Similarity Index
  },
  {
    id: 2,
    planet_name: 'TRAPPIST-1e',
    mission: {
      id: 2,
      name: 'TESS',
      full_name: 'Transiting Exoplanet Survey Satellite'
    },
    habitability_class: 'POTENTIALLY_HABITABLE',
    pl_rade: 0.92,
    pl_eqt: 251,
    pl_insol: 0.66,
    pl_orbper: 6.1,
    pl_orbsmax: 0.029,
    pl_orbeccen: 0.0,
    st_teff: 2566,
    st_rad: 0.117,
    st_mass: 0.089,
    st_type: 'M-type',
    disc_year: 2017,
    esi: 0.85
  },
  {
    id: 3,
    planet_name: 'Proxima Centauri b',
    mission: {
      id: 1,
      name: 'Kepler',
      full_name: 'Kepler Space Telescope'
    },
    habitability_class: 'HABITABILITY_ZONE',
    pl_rade: 1.17,
    pl_eqt: 234,
    pl_insol: 0.65,
    pl_orbper: 11.2,
    pl_orbsmax: 0.0485,
    pl_orbeccen: 0.35,
    st_teff: 3042,
    st_rad: 0.154,
    st_mass: 0.122,
    st_type: 'M-type',
    disc_year: 2016,
    esi: 0.71
  },
  {
    id: 4,
    planet_name: 'K2-18b',
    mission: {
      id: 3,
      name: 'K2',
      full_name: 'K2 Mission'
    },
    habitability_class: 'POTENTIALLY_HABITABLE',
    pl_rade: 2.24,
    pl_eqt: 265,
    pl_insol: 1.42,
    pl_orbper: 32.9,
    pl_orbsmax: 0.143,
    pl_orbeccen: 0.07,
    st_teff: 3457,
    st_rad: 0.41,
    st_mass: 0.45,
    st_type: 'M-type',
    disc_year: 2015,
    esi: 0.73
  },
  {
    id: 5,
    planet_name: 'Kepler-22b',
    mission: {
      id: 1,
      name: 'Kepler',
      full_name: 'Kepler Space Telescope'
    },
    habitability_class: 'HABITABILITY_ZONE',
    pl_rade: 2.4,
    pl_eqt: 262,
    pl_insol: 1.11,
    pl_orbper: 289.9,
    pl_orbsmax: 0.849,
    pl_orbeccen: 0.0,
    st_teff: 5518,
    st_rad: 0.979,
    st_mass: 0.970,
    st_type: 'G-type',
    disc_year: 2011,
    esi: 0.71
  },
  {
    id: 6,
    planet_name: 'Kepler-186f',
    mission: {
      id: 1,
      name: 'Kepler',
      full_name: 'Kepler Space Telescope'
    },
    habitability_class: 'POTENTIALLY_HABITABLE',
    pl_rade: 1.17,
    pl_eqt: 188,
    pl_insol: 0.29,
    pl_orbper: 129.9,
    pl_orbsmax: 0.432,
    pl_orbeccen: 0.04,
    st_teff: 3788,
    st_rad: 0.544,
    st_mass: 0.544,
    st_type: 'M-type',
    disc_year: 2014,
    esi: 0.64
  },
  {
    id: 7,
    planet_name: 'TOI-700d',
    mission: {
      id: 2,
      name: 'TESS',
      full_name: 'Transiting Exoplanet Survey Satellite'
    },
    habitability_class: 'POTENTIALLY_HABITABLE',
    pl_rade: 1.19,
    pl_eqt: 269,
    pl_insol: 0.87,
    pl_orbper: 37.4,
    pl_orbsmax: 0.163,
    pl_orbeccen: 0.0,
    st_teff: 3480,
    st_rad: 0.415,
    st_mass: 0.415,
    st_type: 'M-type',
    disc_year: 2020,
    esi: 0.85
  },
  {
    id: 8,
    planet_name: 'GJ 357d',
    mission: {
      id: 2,
      name: 'TESS',
      full_name: 'Transiting Exoplanet Survey Satellite'
    },
    habitability_class: 'HABITABILITY_ZONE',
    pl_rade: 1.75,
    pl_eqt: 254,
    pl_insol: 0.62,
    pl_orbper: 55.7,
    pl_orbsmax: 0.204,
    pl_orbeccen: 0.0,
    st_teff: 3505,
    st_rad: 0.342,
    st_mass: 0.342,
    st_type: 'M-type',
    disc_year: 2019,
    esi: 0.69
  },
  {
    id: 9,
    planet_name: 'Kepler-442b',
    mission: {
      id: 1,
      name: 'Kepler',
      full_name: 'Kepler Space Telescope'
    },
    habitability_class: 'POTENTIALLY_HABITABLE',
    pl_rade: 1.34,
    pl_eqt: 233,
    pl_insol: 0.70,
    pl_orbper: 112.3,
    pl_orbsmax: 0.409,
    pl_orbeccen: 0.04,
    st_teff: 4402,
    st_rad: 0.60,
    st_mass: 0.61,
    st_type: 'K-type',
    disc_year: 2015,
    esi: 0.84
  },
  {
    id: 10,
    planet_name: 'Kepler-1649c',
    mission: {
      id: 1,
      name: 'Kepler',
      full_name: 'Kepler Space Telescope'
    },
    habitability_class: 'POTENTIALLY_HABITABLE',
    pl_rade: 1.06,
    pl_eqt: 234,
    pl_insol: 0.75,
    pl_orbper: 19.5,
    pl_orbsmax: 0.0826,
    pl_orbeccen: 0.0,
    st_teff: 3240,
    st_rad: 0.195,
    st_mass: 0.1977,
    st_type: 'M-type',
    disc_year: 2020,
    esi: 0.83
  },
  {
    id: 11,
    planet_name: 'HD 40307g',
    mission: {
      id: 3,
      name: 'K2',
      full_name: 'K2 Mission'
    },
    habitability_class: 'HABITABILITY_ZONE',
    pl_rade: 1.8,
    pl_eqt: 285,
    pl_insol: 0.68,
    pl_orbper: 197.8,
    pl_orbsmax: 0.6,
    pl_orbeccen: 0.29,
    st_teff: 4977,
    st_rad: 0.716,
    st_mass: 0.77,
    st_type: 'K-type',
    disc_year: 2012,
    esi: 0.67
  },
  {
    id: 12,
    planet_name: 'TRAPPIST-1d',
    mission: {
      id: 2,
      name: 'TESS',
      full_name: 'Transiting Exoplanet Survey Satellite'
    },
    habitability_class: 'HABITABILITY_ZONE',
    pl_rade: 0.77,
    pl_eqt: 288,
    pl_insol: 1.16,
    pl_orbper: 4.05,
    pl_orbsmax: 0.02228,
    pl_orbeccen: 0.0,
    st_teff: 2566,
    st_rad: 0.117,
    st_mass: 0.089,
    st_type: 'M-type',
    disc_year: 2017,
    esi: 0.66
  },
  {
    id: 13,
    planet_name: 'LHS 1140b',
    mission: {
      id: 3,
      name: 'K2',
      full_name: 'K2 Mission'
    },
    habitability_class: 'POTENTIALLY_HABITABLE',
    pl_rade: 1.73,
    pl_eqt: 235,
    pl_insol: 0.46,
    pl_orbper: 24.7,
    pl_orbsmax: 0.0875,
    pl_orbeccen: 0.03,
    st_teff: 3131,
    st_rad: 0.186,
    st_mass: 0.146,
    st_type: 'M-type',
    disc_year: 2017,
    esi: 0.70
  },
  {
    id: 14,
    planet_name: 'Kepler-62f',
    mission: {
      id: 1,
      name: 'Kepler',
      full_name: 'Kepler Space Telescope'
    },
    habitability_class: 'HABITABILITY_ZONE',
    pl_rade: 1.41,
    pl_eqt: 208,
    pl_insol: 0.41,
    pl_orbper: 267.3,
    pl_orbsmax: 0.718,
    pl_orbeccen: 0.0,
    st_teff: 4925,
    st_rad: 0.76,
    st_mass: 0.69,
    st_type: 'K-type',
    disc_year: 2013,
    esi: 0.67
  },
  {
    id: 15,
    planet_name: 'Ross 128b',
    mission: {
      id: 3,
      name: 'K2',
      full_name: 'K2 Mission'
    },
    habitability_class: 'HABITABILITY_ZONE',
    pl_rade: 1.35,
    pl_eqt: 269,
    pl_insol: 1.38,
    pl_orbper: 9.9,
    pl_orbsmax: 0.0496,
    pl_orbeccen: 0.0,
    st_teff: 3192,
    st_rad: 0.197,
    st_mass: 0.168,
    st_type: 'M-type',
    disc_year: 2017,
    esi: 0.86
  },
  {
    id: 16,
    planet_name: 'HD 85512b',
    mission: {
      id: 3,
      name: 'K2',
      full_name: 'K2 Mission'
    },
    habitability_class: 'NON_HABITABLE',
    pl_rade: 1.4,
    pl_eqt: 351,
    pl_insol: 3.01,
    pl_orbper: 58.43,
    pl_orbsmax: 0.26,
    pl_orbeccen: 0.11,
    st_teff: 4715,
    st_rad: 0.533,
    st_mass: 0.69,
    st_type: 'K-type',
    disc_year: 2011,
    esi: 0.32
  },
  {
    id: 17,
    planet_name: 'Kepler-1638b',
    mission: {
      id: 1,
      name: 'Kepler',
      full_name: 'Kepler Space Telescope'
    },
    habitability_class: 'NON_HABITABLE',
    pl_rade: 1.87,
    pl_eqt: 412,
    pl_insol: 5.1,
    pl_orbper: 259.3,
    pl_orbsmax: 0.83,
    pl_orbeccen: 0.15,
    st_teff: 5890,
    st_rad: 1.18,
    st_mass: 1.05,
    st_type: 'G-type',
    disc_year: 2016,
    esi: 0.28
  },
  {
    id: 18,
    planet_name: 'TOI-270d',
    mission: {
      id: 2,
      name: 'TESS',
      full_name: 'Transiting Exoplanet Survey Satellite'
    },
    habitability_class: 'NON_HABITABLE',
    pl_rade: 2.13,
    pl_eqt: 354,
    pl_insol: 2.85,
    pl_orbper: 11.4,
    pl_orbsmax: 0.0835,
    pl_orbeccen: 0.0,
    st_teff: 3505,
    st_rad: 0.38,
    st_mass: 0.39,
    st_type: 'M-type',
    disc_year: 2019,
    esi: 0.35
  }
];

// Mock statistics
export const mockStats = {
  total_planets: 9614,
  potentially_habitable: 342,
  habitability_zone: 1523,
  non_habitable: 7749,
  missions: {
    kepler: 4234,
    k2: 2845,
    tess: 2535
  },
  discovery_years: {
    recent_year: 2024,
    first_year: 2009
  }
};

/**
 * Filter planets based on criteria
 */
export const filterPlanets = (planets, filters = {}) => {
  let filtered = [...planets];

  // Mission filter
  if (filters.mission && filters.mission !== '') {
    filtered = filtered.filter(p => 
      p.mission.name.toLowerCase() === filters.mission.toLowerCase()
    );
  }

  // Habitability class filter
  if (filters.habitability && filters.habitability !== '') {
    filtered = filtered.filter(p => 
      p.habitability_class === filters.habitability
    );
  }

  // Temperature range filter
  if (filters.min_temp) {
    filtered = filtered.filter(p => p.pl_eqt >= parseFloat(filters.min_temp));
  }
  if (filters.max_temp) {
    filtered = filtered.filter(p => p.pl_eqt <= parseFloat(filters.max_temp));
  }

  // Radius range filter
  if (filters.min_radius) {
    filtered = filtered.filter(p => p.pl_rade >= parseFloat(filters.min_radius));
  }
  if (filters.max_radius) {
    filtered = filtered.filter(p => p.pl_rade <= parseFloat(filters.max_radius));
  }

  return filtered;
};

/**
 * Search planets by name
 */
export const searchPlanets = (planets, query) => {
  if (!query || query.trim() === '') return planets;
  
  const lowerQuery = query.toLowerCase();
  return planets.filter(p => 
    p.planet_name.toLowerCase().includes(lowerQuery)
  );
};

/**
 * Get planet by ID
 */
export const getPlanetById = (planets, id) => {
  return planets.find(p => p.id === parseInt(id));
};

/**
 * Sort planets
 */
export const sortPlanets = (planets, sortBy = 'habitability') => {
  const sorted = [...planets];
  
  switch (sortBy) {
    case 'habitability':
      return sorted.sort((a, b) => (b.esi || 0) - (a.esi || 0));
    case 'temperature':
      return sorted.sort((a, b) => Math.abs(a.pl_eqt - 288) - Math.abs(b.pl_eqt - 288));
    case 'name':
      return sorted.sort((a, b) => a.planet_name.localeCompare(b.planet_name));
    case 'discovery':
      return sorted.sort((a, b) => (b.disc_year || 0) - (a.disc_year || 0));
    default:
      return sorted;
  }
};
