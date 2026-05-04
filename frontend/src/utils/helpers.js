/**
 * Utility helper functions for the AI Exoplanet Habitability Explorer
 */

/**
 * Format large numbers with commas
 * @param {number} num - Number to format
 * @returns {string} - Formatted number
 */
export const formatNumber = (num) => {
  if (num === null || num === undefined) return 'N/A';
  return num.toLocaleString();
};

/**
 * Format decimal numbers to fixed precision
 * @param {number} num - Number to format
 * @param {number} decimals - Number of decimal places
 * @returns {string} - Formatted number
 */
export const formatDecimal = (num, decimals = 2) => {
  if (num === null || num === undefined) return 'N/A';
  return num.toFixed(decimals);
};

/**
 * Convert habitability score to percentage
 * @param {number} score - Habitability score (0-1)
 * @returns {string} - Percentage string
 */
export const scoreToPercentage = (score) => {
  if (score === null || score === undefined) return 'N/A';
  return `${(score * 100).toFixed(1)}%`;
};

/**
 * Get color based on habitability score
 * @param {number} score - Habitability score (0-1)
 * @returns {string} - Tailwind CSS color class
 */
export const getHabitabilityColor = (score) => {
  if (score >= 0.7) return 'text-green-500';
  if (score >= 0.4) return 'text-yellow-500';
  return 'text-red-500';
};

/**
 * Get background color based on habitability score
 * @param {number} score - Habitability score (0-1)
 * @returns {string} - Tailwind CSS background color class
 */
export const getHabitabilityBgColor = (score) => {
  if (score >= 0.7) return 'bg-green-100';
  if (score >= 0.4) return 'bg-yellow-100';
  return 'bg-red-100';
};

/**
 * Convert classification to readable label
 * @param {string} classification - Classification value
 * @returns {string} - Readable label
 */
export const getClassificationLabel = (classification) => {
  const labels = {
    'POTENTIALLY_HABITABLE': 'Potentially Habitable',
    'HABITABILITY_ZONE': 'Habitability Zone',
    'NON_HABITABLE': 'Non-Habitable',
    'potentially_habitable': 'Potentially Habitable',
    'habitability_zone': 'Habitability Zone',
    'non_habitable': 'Non-Habitable',
  };
  return labels[classification] || classification;
};

/**
 * Convert Kelvin to Celsius
 * @param {number} kelvin - Temperature in Kelvin
 * @returns {number} - Temperature in Celsius
 */
export const kelvinToCelsius = (kelvin) => {
  return kelvin - 273.15;
};

/**
 * Convert Kelvin to Fahrenheit
 * @param {number} kelvin - Temperature in Kelvin
 * @returns {number} - Temperature in Fahrenheit
 */
export const kelvinToFahrenheit = (kelvin) => {
  return (kelvin - 273.15) * 9/5 + 32;
};

/**
 * Format temperature with unit
 * @param {number} temp - Temperature in Kelvin
 * @param {string} unit - Unit ('K', 'C', 'F')
 * @returns {string} - Formatted temperature
 */
export const formatTemperature = (temp, unit = 'K') => {
  if (temp === null || temp === undefined) return 'N/A';
  
  let value = temp;
  if (unit === 'C') {
    value = kelvinToCelsius(temp);
  } else if (unit === 'F') {
    value = kelvinToFahrenheit(temp);
  }
  
  return `${formatDecimal(value, 1)}°${unit}`;
};

/**
 * Format planet radius relative to Earth
 * @param {number} radius - Planet radius in Earth radii
 * @returns {string} - Formatted radius
 */
export const formatRadius = (radius) => {
  if (radius === null || radius === undefined) return 'N/A';
  return `${formatDecimal(radius, 2)} R⊕`;
};

/**
 * Format orbital period
 * @param {number} days - Orbital period in days
 * @returns {string} - Formatted period
 */
export const formatOrbitalPeriod = (days) => {
  if (days === null || days === undefined) return 'N/A';
  
  if (days < 1) {
    return `${formatDecimal(days * 24, 1)} hours`;
  } else if (days < 365) {
    return `${formatDecimal(days, 1)} days`;
  } else {
    const years = days / 365.25;
    return `${formatDecimal(years, 2)} years`;
  }
};

/**
 * Truncate text to specified length
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} - Truncated text
 */
export const truncateText = (text, maxLength = 50) => {
  if (!text || text.length <= maxLength) return text;
  return `${text.substring(0, maxLength)}...`;
};

/**
 * Validate planet parameters for prediction
 * @param {Object} params - Planet parameters
 * @returns {Object} - Validation result { valid: boolean, errors: array }
 */
export const validatePlanetParams = (params) => {
  const errors = [];
  
  if (!params.pl_rade || params.pl_rade <= 0) {
    errors.push('Planet radius must be greater than 0');
  }
  
  if (!params.pl_orbper || params.pl_orbper <= 0) {
    errors.push('Orbital period must be greater than 0');
  }
  
  if (!params.pl_eqt || params.pl_eqt <= 0) {
    errors.push('Equilibrium temperature must be greater than 0');
  }
  
  if (!params.st_teff || params.st_teff <= 0) {
    errors.push('Stellar effective temperature must be greater than 0');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
};

/**
 * Download data as JSON file
 * @param {Object} data - Data to download
 * @param {string} filename - Filename
 */
export const downloadJSON = (data, filename = 'data.json') => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

/**
 * Download data as CSV file
 * @param {Array} data - Array of objects
 * @param {string} filename - Filename
 */
export const downloadCSV = (data, filename = 'data.csv') => {
  if (!data || data.length === 0) return;
  
  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => headers.map(header => row[header]).join(',')),
  ].join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

/**
 * Check if user is authenticated
 * @returns {boolean} - Authentication status
 */
export const isAuthenticated = () => {
  return !!localStorage.getItem('token');
};

/**
 * Get Earth similarity index color
 * @param {number} esi - ESI value (0-1)
 * @returns {string} - Color class
 */
export const getESIColor = (esi) => {
  if (esi >= 0.8) return 'text-green-600';
  if (esi >= 0.6) return 'text-lime-500';
  if (esi >= 0.4) return 'text-yellow-500';
  if (esi >= 0.2) return 'text-orange-500';
  return 'text-red-500';
};

/**
 * Format date to readable string
 * @param {string|Date} date - Date to format
 * @returns {string} - Formatted date
 */
export const formatDate = (date) => {
  if (!date) return 'N/A';
  const d = new Date(date);
  return d.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
};

/**
 * Debounce function for search inputs
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} - Debounced function
 */
export const debounce = (func, wait = 300) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};
