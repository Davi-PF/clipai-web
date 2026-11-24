import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BrandLogo } from '@/components/ui/BrandLogo';

describe('BrandLogo', () => {
  it('renders icon variant with transparent SVG, camera viewfinder frame, REC dot and interlocking play ribbons', () => {
    render(<BrandLogo variant="icon" size="sm" />);

    const root = screen.getByTestId('brand-logo');
    expect(root).toHaveAttribute('data-variant', 'icon');

    const svg = screen.getByRole('img', { name: 'Logo CLIPAÍ' });
    expect(svg).toHaveAttribute('fill', 'none');
    expect(svg).toHaveClass('h-8', 'w-8');

    expect(screen.getByTestId('brand-logo-frame-top')).toHaveAttribute(
      'fill',
      'var(--border-muted, #4F6478)',
    );
    expect(screen.getByTestId('brand-logo-frame-bottom')).toHaveAttribute(
      'fill',
      'var(--border-muted, #4F6478)',
    );
    expect(screen.getByTestId('brand-logo-rec-dot')).toHaveAttribute(
      'fill',
      'var(--color-danger-primary, #D93848)',
    );
    expect(screen.getByTestId('brand-logo-play-light-outer')).toHaveAttribute(
      'fill',
      'var(--text-primary, #B7C7D6)',
    );
    expect(screen.getByTestId('brand-logo-play-green')).toHaveAttribute(
      'fill',
      'var(--color-success-primary, #2EB886)',
    );
    expect(screen.getByTestId('brand-logo-play-light-inner')).toHaveAttribute(
      'fill',
      'var(--text-primary, #B7C7D6)',
    );
    expect(screen.queryByText('BETA')).not.toBeInTheDocument();
  });

  it('renders horizontal variant with Bebas Neue CLIPAÍ wordmark (CLIP light + AÍ green) and optional BETA badge', () => {
    const { rerender } = render(<BrandLogo variant="horizontal" size="md" showBeta />);

    const root = screen.getByTestId('brand-logo');
    expect(root).toHaveAttribute('data-variant', 'horizontal');
    expect(root).toHaveTextContent('CLIPAÍ');
    expect(screen.getByText('CLIP')).toHaveClass('text-text-primary');
    expect(screen.getByText('AÍ')).toHaveClass('text-success');
    expect(screen.getByText('BETA')).toBeInTheDocument();
    expect(screen.getByTestId('brand-logo-svg')).toHaveAttribute('aria-hidden', 'true');

    rerender(<BrandLogo variant="horizontal" size="xs" showBeta={false} />);
    expect(screen.queryByText('BETA')).not.toBeInTheDocument();
    expect(screen.getByTestId('brand-logo-svg')).toHaveClass('h-6', 'w-6');
  });

  it('renders stacked variant matching the official vertical artwork layout', () => {
    render(<BrandLogo variant="stacked" size="lg" showBeta />);

    const root = screen.getByTestId('brand-logo');
    expect(root).toHaveAttribute('data-variant', 'stacked');
    expect(root).toHaveClass('flex-col');
    expect(screen.getByTestId('brand-logo-svg')).toHaveClass('h-24', 'w-24');
    expect(screen.getByText('CLIP')).toHaveClass('text-text-primary');
    expect(screen.getByText('AÍ')).toHaveClass('text-success');
    expect(screen.getByText('BETA')).toBeInTheDocument();
  });
});
