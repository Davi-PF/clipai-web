import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ClipTrimTimeline } from '@/components/upload/ClipTrimTimeline';

function firePointer(
  target: Element,
  type: 'pointerdown' | 'pointermove' | 'pointerup' | 'pointercancel',
  clientX: number,
) {
  const event = new MouseEvent(type, { bubbles: true, cancelable: true, clientX });
  fireEvent(target, event);
}

describe('ClipTrimTimeline', () => {
  it('calculates left and right mask widths accurately across startTime, endTime and 0%/100% bounds', () => {
    const onChangeRange = vi.fn();
    const onSeek = vi.fn();

    const { rerender } = render(
      <ClipTrimTimeline
        totalDuration={100}
        startTime={0}
        endTime={100}
        currentTime={0}
        onChangeRange={onChangeRange}
        onSeek={onSeek}
      />,
    );

    const leftMask = screen.getByTestId('trim-mask-left');
    const rightMask = screen.getByTestId('trim-mask-right');
    const selectionRegion = screen.getByTestId('trim-selection-region');
    const masksContainer = screen.getByTestId('trim-masks-container');

    expect(masksContainer).toHaveClass('overflow-hidden', 'rounded-control', 'pointer-events-none');
    expect(leftMask).toHaveStyle({ width: '0%' });
    expect(rightMask).toHaveStyle({ width: '0%' });
    expect(selectionRegion).toHaveStyle({ left: '0%', width: '100%' });

    // Partial selection [20s, 75s] on 100s duration -> left 20%, right 25%, selection 55%
    rerender(
      <ClipTrimTimeline
        totalDuration={100}
        startTime={20}
        endTime={75}
        currentTime={30}
        onChangeRange={onChangeRange}
        onSeek={onSeek}
      />,
    );

    expect(leftMask).toHaveStyle({ width: '20%' });
    expect(rightMask).toHaveStyle({ width: '25%' });
    expect(selectionRegion).toHaveStyle({ left: '20%', width: '55%' });

    // Boundary: startTime=0, endTime=0 -> left 0%, right 100%
    rerender(
      <ClipTrimTimeline
        totalDuration={100}
        startTime={0}
        endTime={0}
        currentTime={0}
        onChangeRange={onChangeRange}
        onSeek={onSeek}
      />,
    );

    expect(leftMask).toHaveStyle({ width: '0%' });
    expect(rightMask).toHaveStyle({ width: '100%' });

    // Boundary: startTime=100, endTime=100 -> left 100%, right 0%
    rerender(
      <ClipTrimTimeline
        totalDuration={100}
        startTime={100}
        endTime={100}
        currentTime={100}
        onChangeRange={onChangeRange}
        onSeek={onSeek}
      />,
    );

    expect(leftMask).toHaveStyle({ width: '100%' });
    expect(rightMask).toHaveStyle({ width: '0%' });
  });

  it('styles masks with deep translucent backdrop blur, no width transition, and z-index below playhead and handles', () => {
    render(
      <ClipTrimTimeline
        totalDuration={120}
        startTime={30}
        endTime={90}
        currentTime={45}
        onChangeRange={vi.fn()}
        onSeek={vi.fn()}
      />,
    );

    const masksContainer = screen.getByTestId('trim-masks-container');
    const leftMask = screen.getByTestId('trim-mask-left');
    const rightMask = screen.getByTestId('trim-mask-right');
    const selectionRegion = screen.getByTestId('trim-selection-region');
    const playhead = screen.getByTestId('trim-playhead');
    const startHandle = screen.getByTestId('trim-handle-start');
    const endHandle = screen.getByTestId('trim-handle-end');

    expect(masksContainer).toHaveAttribute('aria-hidden', 'true');
    expect(masksContainer).toHaveClass('z-[5]');
    expect(leftMask).toHaveAttribute('aria-hidden', 'true');
    expect(rightMask).toHaveAttribute('aria-hidden', 'true');
    expect(leftMask).toHaveClass('bg-[#061C2C]/75', 'backdrop-blur-[2px]', 'pointer-events-none');
    expect(rightMask).toHaveClass('bg-[#061C2C]/75', 'backdrop-blur-[2px]', 'pointer-events-none');
    expect(leftMask.className).not.toContain('transition-all');
    expect(rightMask.className).not.toContain('transition-all');

    expect(selectionRegion).toHaveAttribute('aria-hidden', 'true');
    expect(selectionRegion).toHaveClass('z-[6]');
    expect(playhead).toHaveClass('z-10');
    expect(startHandle).toHaveClass('z-20');
    expect(endHandle).toHaveClass('z-20');
  });

  it('applies active drag glow and selection ring on start/end handle drag and clears on release', () => {
    const onDragStart = vi.fn();
    const onDragEnd = vi.fn();

    render(
      <ClipTrimTimeline
        totalDuration={100}
        startTime={10}
        endTime={80}
        currentTime={40}
        onChangeRange={vi.fn()}
        onSeek={vi.fn()}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      />,
    );

    const track = screen.getByTestId('clip-trim-track');
    vi.spyOn(track, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 0,
      right: 200,
      bottom: 56,
      width: 200,
      height: 56,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });

    const startHandle = screen.getByTestId('trim-handle-start');
    const endHandle = screen.getByTestId('trim-handle-end');
    const selectionRegion = screen.getByTestId('trim-selection-region');

    // Inactive baseline
    expect(startHandle).toHaveAttribute('data-dragging', 'false');
    expect(endHandle).toHaveAttribute('data-dragging', 'false');
    expect(startHandle).not.toHaveClass('shadow-[0_0_10px_rgba(46,184,134,0.55)]');
    expect(selectionRegion).not.toHaveClass('ring-1', 'ring-inset', 'ring-[#2EB886]/60');

    // Drag start handle -> start handle glows + selection region highlights
    firePointer(startHandle, 'pointerdown', 20);
    expect(onDragStart).toHaveBeenCalledWith('start');
    expect(startHandle).toHaveAttribute('data-dragging', 'true');
    expect(endHandle).toHaveAttribute('data-dragging', 'false');
    expect(startHandle).toHaveClass('shadow-[0_0_10px_rgba(46,184,134,0.55)]');
    expect(endHandle).not.toHaveClass('shadow-[0_0_10px_rgba(46,184,134,0.55)]');
    expect(selectionRegion).toHaveClass('ring-1', 'ring-inset', 'ring-[#2EB886]/60');

    // Release start handle -> active state clears
    firePointer(startHandle, 'pointerup', 30);
    expect(onDragEnd).toHaveBeenCalledWith('start');
    expect(startHandle).toHaveAttribute('data-dragging', 'false');
    expect(startHandle).not.toHaveClass('shadow-[0_0_10px_rgba(46,184,134,0.55)]');
    expect(selectionRegion).not.toHaveClass('ring-1', 'ring-inset', 'ring-[#2EB886]/60');

    // Drag end handle -> end handle glows + selection region highlights; pointercancel clears
    firePointer(endHandle, 'pointerdown', 160);
    expect(onDragStart).toHaveBeenCalledWith('end');
    expect(endHandle).toHaveAttribute('data-dragging', 'true');
    expect(startHandle).toHaveAttribute('data-dragging', 'false');
    expect(endHandle).toHaveClass('shadow-[0_0_10px_rgba(46,184,134,0.55)]');
    expect(selectionRegion).toHaveClass('ring-1', 'ring-inset', 'ring-[#2EB886]/60');

    firePointer(endHandle, 'pointercancel', 160);
    expect(onDragEnd).toHaveBeenCalledWith('end');
    expect(endHandle).toHaveAttribute('data-dragging', 'false');
    expect(endHandle).not.toHaveClass('shadow-[0_0_10px_rgba(46,184,134,0.55)]');
    expect(selectionRegion).not.toHaveClass('ring-1', 'ring-inset', 'ring-[#2EB886]/60');

    // Dragging playhead on track does not activate handle glow or selection ring
    firePointer(track, 'pointerdown', 80);
    expect(startHandle).toHaveAttribute('data-dragging', 'false');
    expect(endHandle).toHaveAttribute('data-dragging', 'false');
    expect(selectionRegion).not.toHaveClass('ring-1', 'ring-inset', 'ring-[#2EB886]/60');
    firePointer(track, 'pointerup', 80);
  });

  it('exposes accessible PT-BR labels, formatted aria-valuetext and visible keyboard focus ring on handles', () => {
    render(
      <ClipTrimTimeline
        totalDuration={90}
        startTime={12.5}
        endTime={64.2}
        currentTime={20}
        onChangeRange={vi.fn()}
        onSeek={vi.fn()}
      />,
    );

    const startHandle = screen.getByRole('slider', { name: 'Ajustar início do corte' });
    const endHandle = screen.getByRole('slider', { name: 'Ajustar fim do corte' });

    expect(startHandle).toHaveAttribute('aria-valuetext', '00:12.5');
    expect(endHandle).toHaveAttribute('aria-valuetext', '01:04.2');
    expect(startHandle).toHaveClass('focus-visible:ring-2', 'focus-visible:ring-text-primary');
    expect(endHandle).toHaveClass('focus-visible:ring-2', 'focus-visible:ring-text-primary');
  });
});
