import React, { createContext, useContext, useState, useEffect } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import * as authApi from '../api/authApi';
import { setAuthToken } from '../api/apiClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleUnauthorized = () => {
      setAuthToken(null);
      setUser(null);
      setIsAuthenticated(false);
      // Prevent redirect loop if already on login page
      if (!window.location.pathname.startsWith('/login')) {
        navigate(`/login?returnTo=${encodeURIComponent(window.location.pathname + window.location.search)}`);
      }
    };

    window.addEventListener('auth-unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth-unauthorized', handleUnauthorized);
  }, [navigate]);

  useEffect(() => {
    const checkToken = async () => {
      const token = localStorage.getItem('campus_token');

      if (import.meta.env.DEV && token === 'dev-token') {
        setUser({
          id: 'dev-admin',
          fullName: 'Development Admin',
          email: 'dev@local',
          role: 'admin',
          tokenBalance: 99999,
          token_balance: 99999,
        });

        setIsAuthenticated(true);
        setIsLoading(false);
        return;
      }

      if (!token) {
        setIsAuthenticated(false);
        setIsLoading(false);
        return;
      }
      try {
        const currentUser = await authApi.fetchCurrentUser();
        setUser(currentUser);
        setIsAuthenticated(true);
      } catch (err) {
        console.error('Failed to validate token on mount:', err);
        setAuthToken(null);
        setUser(null);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };
    checkToken();
  }, []);

  const login = async (email, password) => {
    setError(null);

    /* DEVELOPMENT ONLY BYPASS */
    if (import.meta.env.DEV) {
      const devUser = {
        id: 'dev-admin',
        fullName: 'Development Admin',
        email,
        role: 'admin',
        tokenBalance: 99999,
        token_balance: 99999,
      };

      localStorage.setItem('campus_token', 'dev-token');
      setUser(devUser);
      setIsAuthenticated(true);

      return {
        access_token: 'dev-token',
        user: devUser,
      };
    }

    try {
      const data = await authApi.loginUser(email, password);
      // Backend returns structure like: { access_token, user }
      setAuthToken(data.access_token);
      setUser(data.user);
      setIsAuthenticated(true);
      return data;
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || 'Login failed';
      setError(errMsg);
      throw new Error(errMsg);
    }
  };

  const logout = () => {
    setAuthToken(null);
    setUser(null);
    setIsAuthenticated(false);
    setError(null);
    navigate('/login');
  };

  const register = async (fullName, email, password, role) => {
    setError(null);
    try {
      await authApi.registerUser(fullName, email, password, role);
      // Auto login after successful registration
      return await login(email, password);
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || 'Registration failed';
      setError(errMsg);
      throw new Error(errMsg);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, isLoading, error, login, logout, register, setError }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--color-bg)' }}>
        <div className="loading-spinner" style={{ color: 'var(--color-primary)' }}>Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={`/login?returnTo=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  }

  return children;
}
