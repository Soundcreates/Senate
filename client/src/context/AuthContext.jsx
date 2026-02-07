import React, { createContext, useContext, useMemo, useState, useCallback } from 'react';

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

  const fetchUserProfile = useCallback(async () => {
    try {
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
  }, [setUser]);

  const value = useMemo(
    () => ({
      user,
      setUser,
      clearUser,
      fetchUserProfile,
      isAuthenticated: Boolean(user),
    }),
    [user, setUser, clearUser, fetchUserProfile]
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
