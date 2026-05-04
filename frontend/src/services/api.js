import axios from 'axios';

// API base URL - will use Vite proxy for /api requests
const API_BASE = '/api';

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor for authentication
// NOTE: apiClient is a separate axios instance — global axios.defaults do NOT
// propagate to instances. Always read token directly from localStorage.
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Add response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      delete axios.defaults.headers.common['Authorization'];
      // Don't hard-redirect — let the UI handle it gracefully
    }
    return Promise.reject(error);
  },
);

// ==================== Exoplanet Data API ====================

/**
 * Get all exoplanets with pagination and filters
 * @param {number} page - Page number
 * @param {number} pageSize - Number of items per page
 * @param {Object} filters - Filter parameters (mission, habitability, min_radius, etc.)
 * @returns {Promise} - API response with planets data
 */
export const getPlanets = async (page = 1, pageSize = 20, filters = {}) => {
  const params = new URLSearchParams({
    page: page.toString(),
    page_size: pageSize.toString(),
    ...filters
  });
  
  const response = await apiClient.get(`/planets/?${params.toString()}`);
  return response.data;
};

/**
 * Get specific planet details by ID
 * @param {number} id - Planet ID
 * @returns {Promise} - Planet details
 */
export const getPlanetById = async (id) => {
  const response = await apiClient.get(`/planets/${id}/`);
  return response.data;
};

/**
 * Get all potentially habitable planets
 * @returns {Promise} - List of habitable planets
 */
export const getHabitablePlanets = async () => {
  const response = await apiClient.get('/planets/habitable/');
  return response.data;
};

/**
 * Get dataset statistics
 * @returns {Promise} - Statistics data
 */
export const getPlanetStats = async () => {
  const response = await apiClient.get('/planets/stats/');
  return response.data;
};

/**
 * Search planets by name
 * @param {string} query - Search query
 * @returns {Promise} - Search results
 */
export const searchPlanets = async (query) => {
  const response = await apiClient.get(`/planets/?q=${encodeURIComponent(query)}&page_size=10`);
  return response.data;
};

/**
 * Get all missions (K2, Kepler, TESS)
 * @returns {Promise} - List of missions
 */
export const getMissions = async () => {
  const response = await apiClient.get('/missions/');
  return response.data;
};

// ==================== AI Prediction API ====================

/**
 * Predict habitability for custom planet parameters
 * @param {Object} planetData - Planet parameters
 * @returns {Promise} - Prediction results with habitability score
 */
export const predictHabitability = async (planetData) => {
  const response = await apiClient.post('/predict/', planetData);
  return response.data;
};

/**
 * Batch predictions for multiple planets
 * @param {Array} planetsData - Array of planet parameters
 * @returns {Promise} - Batch prediction results
 */
export const batchPredict = async (planetsData) => {
  const response = await apiClient.post('/predict/batch/', { planets: planetsData });
  return response.data;
};

/**
 * Get model metadata and performance metrics
 * @returns {Promise} - Model information
 */
export const getModelInfo = async () => {
  const response = await apiClient.get('/models/info/');
  return response.data;
};

// ==================== User & Authentication API ====================

export const registerUser = async (userData) => {
  const response = await apiClient.post('/auth/register/', userData);
  return response.data;
};

export const loginUser = async (credentials) => {
  const response = await apiClient.post('/auth/login/', credentials);
  return response.data;
};

export const logoutUser = async (refreshToken) => {
  try {
    await apiClient.post('/auth/logout/', { refresh: refreshToken });
  } catch { /* ignore */ }
};

export const getCurrentUser = async () => {
  const response = await apiClient.get('/auth/me/');
  return response.data;
};

// ==================== Saved Predictions API ====================

export const getSavedPredictions = async () => {
  const response = await apiClient.get('/auth/saved/');
  return response.data;
};

export const savePrediction = async ({ name, inputs, outputs }) => {
  const response = await apiClient.post('/auth/saved/', { name, inputs, outputs });
  return response.data;
};

export const deleteSavedPrediction = async (id) => {
  const response = await apiClient.delete(`/auth/saved/${id}/`);
  return response.data;
};

// ==================== Comparison & Analytics API ====================

/**
 * Compare multiple planets
 * @param {Array} planetIds - Array of planet IDs
 * @returns {Promise} - Comparison data
 */
export const comparePlanets = async (planetIds) => {
  const ids = planetIds.join(',');
  const response = await apiClient.get(`/compare/?ids=${ids}`);
  return response.data;
};

/**
 * Get distribution data (temperature, radius, etc.)
 * @returns {Promise} - Distribution analytics
 */
export const getDistributions = async () => {
  const response = await apiClient.get('/analytics/distributions/');
  return response.data;
};

/**
 * Get parameter correlations
 * @returns {Promise} - Correlation data
 */
export const getCorrelations = async () => {
  const response = await apiClient.get('/analytics/correlations/');
  return response.data;
};

// ==================== AI Explainability API ====================

/**
 * Get feature importance explanation for a prediction
 * @param {Object} params - Prediction parameters
 * @returns {Promise} - Explanation with SHAP values
 */
export const explainPrediction = async (params) => {
  const response = await apiClient.post('/explain/', params);
  return response.data;
};

export default apiClient;
