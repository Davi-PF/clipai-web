import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Mail } from 'lucide-react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ToastViewport } from '@/components/ui/Toast';
import { ToastProvider, useToast } from '@/contexts/toast-context';

function ToastTriggerHarness() {
  const { success, error, warning } = useToast();
  return (
    <div>
      <button type="button" onClick={() => success('Link copiado!', 'Sucesso')}>
        Trigger Success
      </button>
      <button type="button" onClick={() => error('Erro ao enviar.')}>
        Trigger Error
      </button>
      <button type="button" onClick={() => warning('Verifique seu e-mail.')}>
        Trigger Warning
      </button>
    </div>
  );
}

describe('UI Primitives', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders Button variants, hybrid typography and loading state', () => {
    const { rerender } = render(
      <Button variant="primary" size="md">
        ENVIAR CLIPE
      </Button>,
    );
    const primaryBtn = screen.getByRole('button', { name: 'ENVIAR CLIPE' });
    expect(primaryBtn.className).toContain('bg-success');
    expect(primaryBtn.className).toContain('font-display');

    rerender(
      <Button variant="secondary" size="sm">
        Filtrar
      </Button>,
    );
    const secondaryBtn = screen.getByRole('button', { name: 'Filtrar' });
    expect(secondaryBtn.className).toContain('bg-bg-elevated');
    expect(secondaryBtn.className).toContain('font-mono');

    rerender(
      <Button variant="danger" isLoading loadingText="EXCLUINDO...">
        EXCLUIR
      </Button>,
    );
    const loadingBtn = screen.getByRole('button', { name: 'EXCLUINDO...' });
    expect(loadingBtn).toBeDisabled();
    expect(loadingBtn).toHaveAttribute('aria-busy', 'true');
  });

  it('renders Input with label, error message in PT-BR and password visibility toggle', async () => {
    const user = userEvent.setup();
    render(
      <Input
        label="Senha"
        type="password"
        placeholder="Digite sua senha"
        leftIcon={<Mail className="h-4 w-4" />}
        error="Senha obrigatória."
      />,
    );

    const input = screen.getByLabelText('Senha') as HTMLInputElement;
    expect(input.type).toBe('password');
    expect(screen.getByRole('alert')).toHaveTextContent('Senha obrigatória.');

    const toggleBtn = screen.getByRole('button', { name: 'Mostrar senha' });
    await user.click(toggleBtn);
    expect(input.type).toBe('text');
    expect(screen.getByRole('button', { name: 'Ocultar senha' })).toBeInTheDocument();
  });

  it('displays success, error and warning toasts and supports manual and timed dismissal', () => {
    vi.useFakeTimers();
    render(
      <ToastProvider>
        <ToastTriggerHarness />
        <ToastViewport />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Trigger Success' }));
    fireEvent.click(screen.getByRole('button', { name: 'Trigger Error' }));
    fireEvent.click(screen.getByRole('button', { name: 'Trigger Warning' }));

    expect(screen.getByText('Link copiado!')).toBeInTheDocument();
    expect(screen.getByText('Erro ao enviar.')).toBeInTheDocument();
    expect(screen.getByText('Verifique seu e-mail.')).toBeInTheDocument();

    const closeButtons = screen.getAllByRole('button', { name: 'Fechar notificação' });
    fireEvent.click(closeButtons[0]!);
    expect(screen.queryByText('Link copiado!')).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.queryByText('Erro ao enviar.')).not.toBeInTheDocument();
    expect(screen.queryByText('Verifique seu e-mail.')).not.toBeInTheDocument();
  });
});
