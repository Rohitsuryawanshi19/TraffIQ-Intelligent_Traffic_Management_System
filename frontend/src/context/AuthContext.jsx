import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API_BASE = 'http://127.0.0.1:8000/api';
const TOKEN_KEY = 'itms_token';
const USER_KEY  = 'itms_user';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) || 'demo_admin_token');
  const [user,  setUser]  = useState(() => {
    try { 
      const saved = localStorage.getItem(USER_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return { username: 'admin', role: 'ADMIN', email: 'admin@itms.local' };
  });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  // Attach bearer token to every axios request globally
  useEffect(() => {
    const id = axios.interceptors.request.use(config => {
      const t = localStorage.getItem(TOKEN_KEY);
      if (t) config.headers['Authorization'] = `Bearer ${t}`;
      return config;
    });
    return () => axios.interceptors.request.eject(id);
  }, []);

  const login = useCallback(async (username, password) => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.post(`${API_BASE}/auth/login`, { username, password });
      const { access_token, user: u } = res.data;
      localStorage.setItem(TOKEN_KEY, access_token);
      localStorage.setItem(USER_KEY, JSON.stringify(u));
      setToken(access_token);
      setUser(u);
      return true;
    } catch (e) {
      setError(e.response?.data?.detail || 'Login failed');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const hasRole = useCallback((...roles) => {
    if (!user) return false;
    if (user.role === 'ADMIN') return true;
    return roles.includes(user.role);
  }, [user]);

  return (
    <AuthContext.Provider value={{ token, user, login, logout, loading, error, hasRole, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
