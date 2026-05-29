import { createContext, useContext, useEffect, useState } from 'react';
import { api, setToken } from './api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('pft_token');
    if (!token) { setLoading(false); return; }
    api.me()
      .then(r => setUser(r.user))
      .catch(() => setToken(null))
      .finally(() => setLoading(false));
  }, []);

  async function signin(email, password) {
    const r = await api.signin({ email, password });
    setToken(r.token);
    setUser(r.user);
  }

  async function signup(email, password, full_name) {
    const r = await api.signup({ email, password, full_name });
    setToken(r.token);
    setUser(r.user);
  }

  function signout() {
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, setUser, loading, signin, signup, signout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
