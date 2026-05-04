/**
 * AuthContext
 * ===========
 * Global authentication state for the entire app.
 *
 * Provides:
 *   user           — { id, username, email, profile_image } | null
 *   token          — JWT access token | null
 *   isLoggedIn     — boolean
 *   login(data)    — store tokens + user from API response
 *   logout()       — clear state + localStorage
 *   updateUser(u)  — patch user fields (e.g. after profile image upload)
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user,  setUser]  = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);   // true while restoring from localStorage

  // ── Restore session from localStorage on mount ──────────────────────────
  useEffect(() => {
    const storedToken = localStorage.getItem('auth_token');
    const storedUser  = localStorage.getItem('auth_user');
    if (storedToken && storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setToken(storedToken);
        setUser(parsedUser);
        // Set default auth header
        axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
      } catch {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
      }
    }
    setLoading(false);
  }, []);

  // ── Login: called after successful register or login API response ────────
  const login = useCallback((apiResponse) => {
    const { user: userData, tokens } = apiResponse;
    const accessToken = tokens?.access || tokens?.token;

    setUser(userData);
    setToken(accessToken);

    localStorage.setItem('auth_token',  accessToken);
    localStorage.setItem('auth_user',   JSON.stringify(userData));
    localStorage.setItem('auth_refresh', tokens?.refresh || '');

    axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
  }, []);

  // ── Logout ───────────────────────────────────────────────────────────────
  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    localStorage.removeItem('auth_refresh');
    delete axios.defaults.headers.common['Authorization'];
  }, []);

  // ── Patch user fields (e.g. after updating profile image) ───────────────
  const updateUser = useCallback((patch) => {
    setUser(prev => {
      if (!prev) return prev;
      const updated = { ...prev, ...patch };
      localStorage.setItem('auth_user', JSON.stringify(updated));
      return updated;
    });
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      token,
      isLoggedIn: !!user && !!token,
      loading,
      login,
      logout,
      updateUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

// Convenience hook
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
};

export default AuthContext;
