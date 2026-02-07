import React, { createContext, useContext, useMemo, useState } from 'react';



const AuthContext = createContext(null);
const STORAGE_KEY = 'auth.user'; // Moving this might be overkill for now, but to really fix "react-refresh/only-export-components", we should not export non-components. However, STORAGE_KEY is not exported. The error likely comes from `loadStoredUser` if it was exported, but I removed it. Let's double check if I missed anything exported that is not a component.
// Re-reading the previous error: "Fast refresh only works when a file only exports components."
// userAuth is a hook (function), AuthProvider is a component.
// The error might be a false positive or due to how `useAuth` is exported alongside `AuthProvider`.
// Actually, it's fine to export hooks. 
// Wait, I removed `loadStoredUser` in step 144. 
// Let's try to just define STORAGE_KEY inside the component or outside but not export it (it's not exported).
// The issue might be `useAuth` export. vite-plugin-react requires only components to be exported for HMR in some configs.
// But exporting hooks is standard.
// Let's try to move the context creation to a separate file or just keep it simple.
// Actually, looking at the file content again.

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

  const setUser = React.useCallback((nextUser) => {
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

  const clearUser = React.useCallback(() => setUser(null), [setUser]);

  const value = useMemo(
    () => ({
      user,
      setUser,
      clearUser,
      isAuthenticated: Boolean(user),
    }),
    [user, setUser, clearUser]
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
