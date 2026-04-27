import { createContext, useContext, useEffect, useState } from 'react';
import * as api from '../api.js';

const AuthContext = createContext(null);

const STORAGE_KEY = 'boutique.auth';

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(() => loadFromStorage()); // { token, user } | null

  // Persiste à chaque changement
  useEffect(() => {
    if (auth) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [auth]);

  // Au chargement : si on a un token, on vérifie qu'il est encore valide
  useEffect(() => {
    if (!auth?.token) return;
    api.me(auth.token).catch(() => setAuth(null)); // token expiré → logout
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function doLogin(email, password) {
    const res = await api.login(email, password);
    setAuth({ token: res.token, user: res.user });
  }

  async function doRegister(email, password, name) {
    const res = await api.register(email, password, name);
    setAuth({ token: res.token, user: res.user });
  }

  function logout() {
    setAuth(null);
  }

  const value = {
    user: auth?.user ?? null,
    token: auth?.token ?? null,
    isAuthenticated: !!auth?.token,
    login: doLogin,
    register: doRegister,
    logout
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé dans <AuthProvider>');
  return ctx;
}
