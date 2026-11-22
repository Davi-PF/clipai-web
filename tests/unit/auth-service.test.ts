import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearAccessToken, getAccessToken, setAccessToken } from '@/lib/api-client';
import { authService } from '@/services/auth-service';

describe('auth-service', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    clearAccessToken();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    clearAccessToken();
  });

  it('logs in and stores access_token strictly in memory', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          access_token: 'jwt_in_memory',
          token_type: 'bearer',
          expires_in: 900,
          requires_2fa: false,
          temp_2fa_token: null,
          user: {
            id: 'u1',
            username: 'fallen_br',
            email: 'gabriel@clipai.com.br',
            display_name: 'Gabriel Toledo',
            avatar_url: null,
            is_email_verified: true,
            is_2fa_enabled: false,
          },
        }),
        { status: 200 },
      ),
    );

    const res = await authService.login({
      email: 'gabriel@clipai.com.br',
      password: 'StrongPassword!2026',
    });

    expect(res.user.username).toBe('fallen_br');
    expect(getAccessToken()).toBe('jwt_in_memory');
  });

  it('clears access_token when login requires 2FA and sets token after verify2faLogin', async () => {
    setAccessToken('old_token');
    fetchMock
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            access_token: null,
            token_type: 'bearer',
            expires_in: 300,
            requires_2fa: true,
            challenge_token: 'challenge_tok_123',
            temp_2fa_token: 'challenge_tok_123',
            user: {
              id: 'u1',
              username: 'fallen_br',
              email: 'gabriel@clipai.com.br',
              display_name: 'Gabriel Toledo',
              avatar_url: null,
              is_email_verified: true,
              is_2fa_enabled: true,
            },
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            access_token: 'verified_2fa_jwt',
            token_type: 'bearer',
            expires_in: 900,
            requires_2fa: false,
            temp_2fa_token: null,
            user: {
              id: 'u1',
              username: 'fallen_br',
              email: 'gabriel@clipai.com.br',
              display_name: 'Gabriel Toledo',
              avatar_url: null,
              is_email_verified: true,
              is_2fa_enabled: true,
            },
          }),
          { status: 200 },
        ),
      );

    const res = await authService.login({
      email: 'gabriel@clipai.com.br',
      password: 'StrongPassword!2026',
    });

    expect(res.requires_2fa).toBe(true);
    expect(getAccessToken()).toBeNull();

    const verified = await authService.verify2faLogin({
      challenge_token: 'challenge_tok_123',
      code: '482910',
    });
    expect(verified.access_token).toBe('verified_2fa_jwt');
    expect(getAccessToken()).toBe('verified_2fa_jwt');
  });

  it('supports 2FA setup, enable, disable and Discord OAuth2 URL & callback', async () => {
    setAccessToken('active_jwt');
    fetchMock
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            otpauth_uri: 'otpauth://totp/CLIPAI:fallen?secret=JBSWY3DP&issuer=CLIPAI',
            manual_secret: 'JBSWY3DP',
            secret: 'JBSWY3DP',
            issuer: 'CLIPAÍ',
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            is_2fa_enabled: true,
            backup_codes: ['7K4M-9P2X', '3R8W-5N6Q'],
            message: '2FA ativado com sucesso.',
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            message: '2FA desativado com sucesso.',
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            url: 'https://discord.com/api/oauth2/authorize?state=s1',
            authorization_url: 'https://discord.com/api/oauth2/authorize?state=s1',
            state: 's1',
            mode: 'login',
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            access_token: 'discord_jwt',
            token_type: 'bearer',
            expires_in: 900,
            requires_2fa: false,
            temp_2fa_token: null,
            mode: 'login',
            linked: true,
            user: {
              id: 'u1',
              username: 'fallen_br',
              email: 'gabriel@clipai.com.br',
              display_name: 'FalleN',
              avatar_url: 'https://cdn.discordapp.com/avatars/1/a.png',
              discord_linked: true,
              discord_username: 'fallen_disc',
              is_email_verified: true,
              is_2fa_enabled: false,
            },
          }),
          { status: 200 },
        ),
      );

    const setup = await authService.setup2fa();
    expect(setup.manual_secret).toBe('JBSWY3DP');

    const enabled = await authService.enable2fa({ code: '482910' });
    expect(enabled.backup_codes).toHaveLength(2);

    const disabled = await authService.disable2fa({
      code: '482910',
      password: 'StrongPassword!2026',
    });
    expect(disabled.message).toBe('2FA desativado com sucesso.');

    const discordUrl = await authService.getDiscordAuthUrl('login');
    expect(discordUrl.mode).toBe('login');

    const discordCallback = await authService.handleDiscordCallback({
      code: 'code_123',
      state: 's1',
    });
    expect(discordCallback.user.discord_linked).toBe(true);
    expect(getAccessToken()).toBe('discord_jwt');
  });

  it('registers, verifies email, resends verification and handles password reset', async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            message: 'Cadastro realizado com sucesso.',
            user: {
              id: 'u1',
              username: 'fallen_br',
              email: 'gabriel@clipai.com.br',
              display_name: 'Gabriel Toledo',
              avatar_url: null,
              is_email_verified: false,
              is_2fa_enabled: false,
            },
          }),
          { status: 201 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ message: 'E-mail confirmado.' }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ message: 'Novo link enviado.' }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ message: 'Instruções enviadas.' }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ message: 'Senha redefinida.' }), { status: 200 }),
      );

    const reg = await authService.register({
      username: 'fallen_br',
      display_name: 'Gabriel Toledo',
      email: 'gabriel@clipai.com.br',
      password: 'StrongPassword!2026',
    });
    expect(reg.user.is_email_verified).toBe(false);

    const verified = await authService.verifyEmail('verify_token');
    expect(verified.message).toBe('E-mail confirmado.');

    const resent = await authService.resendVerification('gabriel@clipai.com.br');
    expect(resent.message).toBe('Novo link enviado.');

    const forgot = await authService.forgotPassword('gabriel@clipai.com.br');
    expect(forgot.message).toBe('Instruções enviadas.');

    const reset = await authService.resetPassword({
      token: 'reset_token',
      new_password: 'NewStrongPassword!2026',
    });
    expect(reset.message).toBe('Senha redefinida.');
  });

  it('fetches current user from /api/v1/users/me and clears token on logout', async () => {
    setAccessToken('active_jwt');
    fetchMock
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: 'u1',
            username: 'fallen_br',
            email: 'gabriel@clipai.com.br',
            display_name: 'Gabriel Toledo',
            avatar_url: null,
            is_email_verified: true,
            is_2fa_enabled: false,
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(new Response(null, { status: 204 }));

    const me = await authService.getCurrentUser();
    expect(me.username).toBe('fallen_br');

    await authService.logout();
    expect(getAccessToken()).toBeNull();
  });
});
