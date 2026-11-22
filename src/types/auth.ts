import type {
  ApiMessageResponse,
  AuthLoginResponse,
  AuthRefreshResponse,
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
} from '@/types/api';

export type {
  ApiMessageResponse,
  AuthLoginResponse,
  AuthRefreshResponse,
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
};

export function resolveChallengeToken(
  response: Pick<AuthLoginResponse, 'challenge_token' | 'temp_2fa_token'>,
): string | null {
  return response.challenge_token ?? response.temp_2fa_token ?? null;
}
