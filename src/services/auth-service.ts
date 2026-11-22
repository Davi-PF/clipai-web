import {
  apiClient,
  clearAccessToken,
  getAccessToken,
  refreshAccessToken,
  setAccessToken,
} from '@/lib/api-client';
import type {
  ApiMessageResponse,
  AuthLoginResponse,
  DiscordAuthMode,
  DiscordAuthUrlResponse,
  DiscordCallbackRequest,
  DiscordCallbackResponse,
  LoginRequest,
  RegisterRequest,
  RegisterResponse,
  ResetPasswordRequest,
  TwoFactorDisableRequest,
  TwoFactorEnableRequest,
  TwoFactorEnableResponse,
  TwoFactorSetupResponse,
  TwoFactorVerifyLoginRequest,
  User,
} from '@/types/api';

export const authService = {
  async register(payload: RegisterRequest): Promise<RegisterResponse> {
    return apiClient.post<RegisterResponse>('/api/v1/auth/register', payload, {
      skipAuth: true,
      skipRefresh: true,
    });
  },

  async verifyEmail(token: string): Promise<ApiMessageResponse> {
    return apiClient.post<ApiMessageResponse>(
      '/api/v1/auth/verify-email',
      { token },
      {
        skipAuth: true,
        skipRefresh: true,
      },
    );
  },

  async resendVerification(email: string): Promise<ApiMessageResponse> {
    return apiClient.post<ApiMessageResponse>(
      '/api/v1/auth/resend-verification',
      { email },
      {
        skipAuth: true,
        skipRefresh: true,
      },
    );
  },

  async login(payload: LoginRequest): Promise<AuthLoginResponse> {
    const response = await apiClient.post<AuthLoginResponse>('/api/v1/auth/login', payload, {
      skipAuth: true,
      skipRefresh: true,
      credentials: 'include',
    });

    if (!response.requires_2fa && response.access_token) {
      setAccessToken(response.access_token);
    } else {
      clearAccessToken();
    }

    return response;
  },

  async verify2faLogin(payload: TwoFactorVerifyLoginRequest): Promise<AuthLoginResponse> {
    const response = await apiClient.post<AuthLoginResponse>(
      '/api/v1/auth/2fa/verify-login',
      payload,
      {
        skipAuth: true,
        skipRefresh: true,
        credentials: 'include',
      },
    );

    if (response.access_token) {
      setAccessToken(response.access_token);
    }

    return response;
  },

  async setup2fa(): Promise<TwoFactorSetupResponse> {
    return apiClient.post<TwoFactorSetupResponse>('/api/v1/auth/2fa/setup');
  },

  async enable2fa(payload: TwoFactorEnableRequest): Promise<TwoFactorEnableResponse> {
    return apiClient.post<TwoFactorEnableResponse>('/api/v1/auth/2fa/enable', payload);
  },

  async disable2fa(payload: TwoFactorDisableRequest): Promise<ApiMessageResponse> {
    return apiClient.post<ApiMessageResponse>('/api/v1/auth/2fa/disable', payload);
  },

  async getDiscordAuthUrl(mode: DiscordAuthMode = 'login'): Promise<DiscordAuthUrlResponse> {
    const isLoginMode = mode === 'login';
    return apiClient.get<DiscordAuthUrlResponse>(`/api/v1/auth/discord/url?mode=${mode}`, {
      skipAuth: isLoginMode,
      skipRefresh: isLoginMode,
    });
  },

  async handleDiscordCallback(payload: DiscordCallbackRequest): Promise<DiscordCallbackResponse> {
    const hasActiveToken = Boolean(getAccessToken());
    const response = await apiClient.post<DiscordCallbackResponse>(
      '/api/v1/auth/discord/callback',
      payload,
      {
        credentials: 'include',
        skipRefresh: !hasActiveToken,
      },
    );

    if (!response.requires_2fa && response.access_token) {
      setAccessToken(response.access_token);
    }

    return response;
  },

  async refreshSessionToken(): Promise<string | null> {
    return refreshAccessToken();
  },

  async logout(): Promise<void> {
    try {
      await apiClient.post<void>('/api/v1/auth/logout', undefined, {
        credentials: 'include',
        skipRefresh: true,
      });
    } finally {
      clearAccessToken();
    }
  },

  async forgotPassword(email: string): Promise<ApiMessageResponse> {
    return apiClient.post<ApiMessageResponse>(
      '/api/v1/auth/forgot-password',
      { email },
      {
        skipAuth: true,
        skipRefresh: true,
      },
    );
  },

  async resetPassword(payload: ResetPasswordRequest): Promise<ApiMessageResponse> {
    return apiClient.post<ApiMessageResponse>('/api/v1/auth/reset-password', payload, {
      skipAuth: true,
      skipRefresh: true,
    });
  },

  async getCurrentUser(): Promise<User> {
    return apiClient.get<User>('/api/v1/users/me');
  },
};
