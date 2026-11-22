import { render, screen } from '@testing-library/react';
import { useRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { buildLShapeSvgPath, useLShapePath } from '@/hooks/useLShapePath';

function LShapeHookHarness() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const cutoutRef = useRef<HTMLDivElement | null>(null);
  const result = useLShapePath(containerRef, cutoutRef, true);

  return (
    <div ref={containerRef} data-testid="l-container">
      <div ref={cutoutRef} data-testid="l-cutout" />
      <span data-testid="l-ready">{String(result.isReady)}</span>
      <span data-testid="l-stroke">{result.strokePath}</span>
    </div>
  );
}

describe('useLShapePath & buildLShapeSvgPath', () => {
  it('generates a continuous closed L-shape SVG path with bottom-right cutout and left semicircular notch', () => {
    const path = buildLShapeSvgPath({
      width: 900,
      height: 540,
      cutoutWidth: 336,
      cutoutHeight: 170,
      radius: 18,
      notchY: 240,
      notchRadius: 20,
      inset: 0.75,
    });

    expect(path.startsWith('M ')).toBe(true);
    expect(path.endsWith('Z')).toBe(true);
    // Contains concave inner arc sweep 0 and left semicircular notch arc
    expect(path).toContain('A 18 18 0 0 0');
    expect(path).toContain('A 20 20 0 0 0');
  });

  it('returns fallback rectangular path with notch when cutout is zero and empty string for tiny dimensions', () => {
    expect(buildLShapeSvgPath({ width: 50, height: 50, cutoutWidth: 0, cutoutHeight: 0 })).toBe('');

    const rectPath = buildLShapeSvgPath({
      width: 800,
      height: 480,
      cutoutWidth: 0,
      cutoutHeight: 0,
    });
    expect(rectPath).toContain('Z');
    expect(rectPath).toContain('A 20 20 0 0 0');
  });

  it('observes container and disconnects ResizeObserver on unmount', () => {
    const disconnectSpy = vi.fn();
    const observeSpy = vi.fn();

    class SpyResizeObserver {
      observe = observeSpy;
      unobserve = vi.fn();
      disconnect = disconnectSpy;
    }

    vi.stubGlobal('ResizeObserver', SpyResizeObserver);

    const { unmount } = render(<LShapeHookHarness />);
    expect(observeSpy).toHaveBeenCalled();
    expect(screen.getByTestId('l-ready')).toHaveTextContent('false');

    unmount();
    expect(disconnectSpy).toHaveBeenCalledTimes(1);
    vi.unstubAllGlobals();
  });
});
