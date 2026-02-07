import React, { createContext, useContext, useMemo, useState, useCallback } from 'react';
import { fetchAdminProfile, logoutAdmin } from '@/Apis/admin-authApi';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUserState] = useState(() => {
    try {
      const raw = localStorage.getItem('auth.user');
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      console.error('Failed to read auth user from storage:', error);
      return null;
    }
  });
  const [token, setTokenState] = useState(() => {
    try {
      return localStorage.getItem('auth.token');
    } catch (error) {
      console.error('Failed to read auth token from storage:', error);
      return null;
    }
  });

  const setUser = useCallback((nextUser) => {
    setUserState(nextUser || null);

    try {
      if (nextUser) {
        localStorage.setItem('auth.user', JSON.stringify(nextUser));
      } else {
        localStorage.removeItem('auth.user');
      }
    } catch (error) {
      console.error('Failed to persist auth user:', error);
    }
  }, []);

  const clearUser = useCallback(() => setUser(null), [setUser]);

  const setToken = useCallback((nextToken) => {
    setTokenState(nextToken || null);
    try {
      if (nextToken) {
        localStorage.setItem('auth.token', nextToken);
      } else {
        localStorage.removeItem('auth.token');
      }
    } catch (error) {
      console.error('Failed to persist auth token:', error);
    }
  }, []);

  const fetchUserProfile = useCallback(async () => {
    try {
      if (token) {
        const adminResult = await fetchAdminProfile(token);
        if (adminResult.ok && adminResult.user) {
          setUser(adminResult.user);
          return { ok: true, user: adminResult.user };
        }
        setToken(null);
      }
      const response = await fetch('http://localhost:3000/api/oauth/session', {
        method: 'GET',
        credentials: 'include',
        headers: { Accept: 'application/json' },
      });

      if (!response.ok) {
        return { ok: false };
      }

      const data = await response.json();
      if (data?.user) {
        setUser(data.user);
        return { ok: true, user: data.user };
      }

      return { ok: false };
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
      return { ok: false, error };
    }
  }, [setUser, setToken, token]);

  const logout = useCallback(async () => {
    try {
      if (token) {
        await logoutAdmin(token);
      } else {
        await fetch('http://localhost:3000/api/oauth/logout', {
          method: 'POST',
          credentials: 'include',
          headers: { Accept: 'application/json' },
        });
      }
    } catch (error) {
      console.error('Failed to log out:', error);
    } finally {
      clearUser();
      setToken(null);
    }
  }, [clearUser, setToken, token]);

  const value = useMemo(
    () => ({
      user,
      setUser,
      clearUser,
      token,
      setToken,
      fetchUserProfile,
      logout,
      isAuthenticated: Boolean(user),
    }),
    [user, setUser, clearUser, token, setToken, fetchUserProfile, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
};
