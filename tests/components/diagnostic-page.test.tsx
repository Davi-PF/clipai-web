import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiHealthStatusCard } from '@/components/ui/ApiHealthStatusCard';

describe('ApiHealthStatusCard', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders online API status with version and database state', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          status: 'ok',
          version: '1.0.0',
          database: 'connected',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    render(<ApiHealthStatusCard />);

    await waitFor(() => {
      expect(screen.getByTestId('health-badge-online')).toBeInTheDocument();
    });

    expect(screen.getByText('v1.0.0')).toBeInTheDocument();
    expect(screen.getByText('connected')).toBeInTheDocument();
  });

  it('displays offline status in PT-BR when /api/v1/health is unreachable and allows manual retry', async () => {
    fetchMock.mockRejectedValueOnce(new Error('Network error')).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          status: 'ok',
          version: '1.0.0',
          database: 'connected',
        }),
        { status: 200 },
      ),
    );

    render(<ApiHealthStatusCard />);

    await waitFor(() => {
      expect(screen.getByTestId('health-badge-offline')).toBeInTheDocument();
    });

    expect(screen.getByRole('alert')).toHaveTextContent(/Falha de conexão com a API do CLIPAÍ/i);

    const retryButton = screen.getByRole('button', { name: /TESTAR CONEXÃO/i });
    await userEvent.click(retryButton);

    await waitFor(() => {
      expect(screen.getByTestId('health-badge-online')).toBeInTheDocument();
    });
  });
});
