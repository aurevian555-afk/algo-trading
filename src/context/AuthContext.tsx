import React, { createContext, useContext, useState, useEffect } from 'react';
import { AuthUser } from '../types/trading';
import { api } from '../services/api';

interface AuthContextType {
  currentUser: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  loginAsDemo: () => Promise<void>;
  logout: () => Promise<void>;
  isAuthModalOpen: boolean;
  authModalMode: 'login' | 'signup';
  openAuthModal: (mode?: 'login' | 'signup') => void;
  closeAuthModal: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'aurevian_auth_token';
const USER_KEY = 'aurevian_auth_user';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState(true);

  // Modal control
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'signup'>('login');

  const openAuthModal = (mode: 'login' | 'signup' = 'login') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
  };

  // Validate session on mount
  useEffect(() => {
    const checkSession = async () => {
      const savedToken = localStorage.getItem(TOKEN_KEY);
      if (!savedToken) {
        setIsLoading(false);
        return;
      }

      try {
        const res = await api.getMe(savedToken);
        if (res.success && res.user) {
          setCurrentUser(res.user);
          localStorage.setItem(USER_KEY, JSON.stringify(res.user));
        } else {
          // Token expired or invalid
          setToken(null);
          setCurrentUser(null);
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(USER_KEY);
        }
      } catch (err) {
        console.warn('Auth session check notice:', err);
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const res = await api.login({ email, password });
      if (res.success && res.token && res.user) {
        setToken(res.token);
        setCurrentUser(res.user);
        localStorage.setItem(TOKEN_KEY, res.token);
        localStorage.setItem(USER_KEY, JSON.stringify(res.user));
        setIsAuthModalOpen(false);
        return { success: true };
      }
      return { success: false, error: res.error || 'Login failed. Please check your credentials.' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error during login.' };
    }
  };

  const signup = async (name: string, email: string, password: string) => {
    try {
      const res = await api.signup({ name, email, password });
      if (res.success && res.token && res.user) {
        setToken(res.token);
        setCurrentUser(res.user);
        localStorage.setItem(TOKEN_KEY, res.token);
        localStorage.setItem(USER_KEY, JSON.stringify(res.user));
        setIsAuthModalOpen(false);
        return { success: true };
      }
      return { success: false, error: res.error || 'Sign up failed.' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error during registration.' };
    }
  };

  const loginAsDemo = async () => {
    try {
      const res = await api.loginDemo();
      if (res.success && res.token && res.user) {
        setToken(res.token);
        setCurrentUser(res.user);
        localStorage.setItem(TOKEN_KEY, res.token);
        localStorage.setItem(USER_KEY, JSON.stringify(res.user));
        setIsAuthModalOpen(false);
      }
    } catch (err) {
      console.error('Demo login error:', err);
    }
  };

  const logout = async () => {
    try {
      if (token) {
        await api.logout(token).catch(() => {});
      }
    } finally {
      setToken(null);
      setCurrentUser(null);
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        token,
        isAuthenticated: Boolean(currentUser),
        isLoading,
        login,
        signup,
        loginAsDemo,
        logout,
        isAuthModalOpen,
        authModalMode,
        openAuthModal,
        closeAuthModal,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
