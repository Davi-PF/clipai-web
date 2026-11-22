'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/contexts/toast-context';
import { clearAccessToken, setUnauthorizedHandler } from '@/lib/api-client';
import { authService } from '@/services/auth-service';
import type {
  AuthLoginResponse,
  LoginRequest,
  RegisterRequest,
  RegisterResponse,
  User,
} from '@/types/api';

export interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (payload: LoginRequest) => Promise<AuthLoginResponse>;
  register: (payload: RegisterRequest) => Promise<RegisterResponse>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: Readonly<{ children: ReactNode }>) {
  const router = useRouter();
  const { warning } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshSession = useCallback(async (): Promise<boolean> => {
    try {
      const token = await authService.refreshSessionToken();
      if (!token) {
        setUser(null);
        return false;
      }

      const currentUser = await authService.getCurrentUser();
      setUser(currentUser);
      return true;
    } catch {
      clearAccessToken();
      setUser(null);
      return false;
    }
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      clearAccessToken();
      setUser(null);
      warning('Sua sessão expirou. Faça login novamente.');
      router.replace('/login');
    });

    return () => {
      setUnauthorizedHandler(null);
    };
  }, [router, warning]);

  useEffect(() => {
    let isActive = true;

    async function bootstrapSession() {
      try {
        const token = await authService.refreshSessionToken();
        if (!token || !isActive) {
          if (isActive) {
            setUser(null);
          }
          return;
        }

        const currentUser = await authService.getCurrentUser();
        if (isActive) {
          setUser(currentUser);
        }
      } catch {
        clearAccessToken();
        if (isActive) {
          setUser(null);
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void bootstrapSession();

    return () => {
      isActive = false;
    };
  }, []);

  const login = useCallback(async (payload: LoginRequest): Promise<AuthLoginResponse> => {
    const response = await authService.login(payload);
    if (!response.requires_2fa && response.access_token) {
      setUser(response.user);
    }
    return response;
  }, []);

  const register = useCallback(async (payload: RegisterRequest): Promise<RegisterResponse> => {
    return authService.register(payload);
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    try {
      await authService.logout();
    } finally {
      setUser(null);
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isLoading,
      login,
      register,
      logout,
      refreshSession,
    }),
    [user, isLoading, login, register, logout, refreshSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser utilizado dentro de um AuthProvider.');
  }
  return context;
}
