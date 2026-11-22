import { apiClient, clearAccessToken, refreshAccessToken, setAccessToken } from '@/lib/api-client';
import type {
  ApiMessageResponse,
  AuthLoginResponse,
  LoginRequest,
  RegisterRequest,
  RegisterResponse,
  ResetPasswordRequest,
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
