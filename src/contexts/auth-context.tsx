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
  ApiMessageResponse,
  AuthLoginResponse,
  DiscordCallbackRequest,
  DiscordCallbackResponse,
  LoginRequest,
  RegisterRequest,
  RegisterResponse,
  TwoFactorDisableRequest,
  TwoFactorEnableRequest,
  TwoFactorEnableResponse,
  TwoFactorSetupResponse,
  TwoFactorVerifyLoginRequest,
  User,
} from '@/types/api';

export interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (payload: LoginRequest) => Promise<AuthLoginResponse>;
  verify2faLogin: (payload: TwoFactorVerifyLoginRequest) => Promise<AuthLoginResponse>;
  completeDiscordCallback: (payload: DiscordCallbackRequest) => Promise<DiscordCallbackResponse>;
  setup2fa: () => Promise<TwoFactorSetupResponse>;
  enable2fa: (payload: TwoFactorEnableRequest) => Promise<TwoFactorEnableResponse>;
  disable2fa: (payload: TwoFactorDisableRequest) => Promise<ApiMessageResponse>;
  updateUser: (nextUser: User) => void;
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

  const updateUser = useCallback((nextUser: User) => {
    setUser(nextUser);
  }, []);

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

  const verify2faLogin = useCallback(
    async (payload: TwoFactorVerifyLoginRequest): Promise<AuthLoginResponse> => {
      const response = await authService.verify2faLogin(payload);
      if (response.access_token && response.user) {
        setUser(response.user);
      }
      return response;
    },
    [],
  );

  const completeDiscordCallback = useCallback(
    async (payload: DiscordCallbackRequest): Promise<DiscordCallbackResponse> => {
      const response = await authService.handleDiscordCallback(payload);
      if (!response.requires_2fa && response.user) {
        if (response.mode === 'link' || response.access_token) {
          setUser(response.user);
        }
      }
      return response;
    },
    [],
  );

  const setup2fa = useCallback(async (): Promise<TwoFactorSetupResponse> => {
    return authService.setup2fa();
  }, []);

  const enable2fa = useCallback(
    async (payload: TwoFactorEnableRequest): Promise<TwoFactorEnableResponse> => {
      const response = await authService.enable2fa(payload);
      setUser((prev) => (prev ? { ...prev, is_2fa_enabled: true } : prev));
      return response;
    },
    [],
  );

  const disable2fa = useCallback(
    async (payload: TwoFactorDisableRequest): Promise<ApiMessageResponse> => {
      const response = await authService.disable2fa(payload);
      setUser((prev) => (prev ? { ...prev, is_2fa_enabled: false } : prev));
      return response;
    },
    [],
  );

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
      verify2faLogin,
      completeDiscordCallback,
      setup2fa,
      enable2fa,
      disable2fa,
      updateUser,
      register,
      logout,
      refreshSession,
    }),
    [
      user,
      isLoading,
      login,
      verify2faLogin,
      completeDiscordCallback,
      setup2fa,
      enable2fa,
      disable2fa,
      updateUser,
      register,
      logout,
      refreshSession,
    ],
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
