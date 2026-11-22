'use client';

import { useEffect, useState, type RefObject } from 'react';

export interface LShapeGeometryInput {
  width: number;
  height: number;
  cutoutWidth: number;
  cutoutHeight: number;
  radius?: number;
  notchY?: number;
  notchRadius?: number;
  inset?: number;
}

export interface LShapePaths {
  width: number;
  height: number;
  notchY: number;
  clipPath: string;
  strokePath: string;
  isReady: boolean;
}

const DEFAULT_CORNER_RADIUS = 18;
const DEFAULT_NOTCH_RADIUS = 20;
const CUTOUT_GAP_PX = 12;

function roundCoord(value: number): number {
  return Math.round(value * 100) / 100;
}

export function buildLShapeSvgPath(input: LShapeGeometryInput): string {
  const { width, height, cutoutWidth, cutoutHeight } = input;
  if (width <= 80 || height <= 80) {
    return '';
  }

  const inset = input.inset ?? 0;
  const maxR = Math.min(DEFAULT_CORNER_RADIUS, cutoutWidth / 3, cutoutHeight / 3);
  const r = Math.max(6, Math.min(input.radius ?? DEFAULT_CORNER_RADIUS, maxR));

  const left = inset;
  const top = inset;
  const right = width - inset;
  const bottom = height - inset;

  const hasValidCutout =
    cutoutWidth > r * 2 &&
    cutoutHeight > r * 2 &&
    width - cutoutWidth > left + r * 2 &&
    height - cutoutHeight > top + r * 2;

  const cutX = roundCoord(width - cutoutWidth);
  const cutY = roundCoord(height - cutoutHeight);

  const notchR = Math.min(input.notchRadius ?? DEFAULT_NOTCH_RADIUS, (height - r * 4) / 3);
  const defaultNotchY = Math.round(height * 0.44);
  const minNotchY = top + r + notchR + 8;
  const maxNotchY = bottom - r - notchR - 8;
  const notchY = roundCoord(
    Math.max(minNotchY, Math.min(maxNotchY, input.notchY ?? defaultNotchY)),
  );

  const segments: string[] = [
    `M ${roundCoord(left + r)} ${roundCoord(top)}`,
    `L ${roundCoord(right - r)} ${roundCoord(top)}`,
    `A ${r} ${r} 0 0 1 ${roundCoord(right)} ${roundCoord(top + r)}`,
  ];

  if (hasValidCutout) {
    segments.push(
      `L ${roundCoord(right)} ${roundCoord(cutY - r)}`,
      `A ${r} ${r} 0 0 1 ${roundCoord(right - r)} ${cutY}`,
      `L ${roundCoord(cutX + r)} ${cutY}`,
      `A ${r} ${r} 0 0 0 ${cutX} ${roundCoord(cutY + r)}`,
      `L ${cutX} ${roundCoord(bottom - r)}`,
      `A ${r} ${r} 0 0 1 ${roundCoord(cutX - r)} ${roundCoord(bottom)}`,
    );
  } else {
    segments.push(
      `L ${roundCoord(right)} ${roundCoord(bottom - r)}`,
      `A ${r} ${r} 0 0 1 ${roundCoord(right - r)} ${roundCoord(bottom)}`,
    );
  }

  segments.push(
    `L ${roundCoord(left + r)} ${roundCoord(bottom)}`,
    `A ${r} ${r} 0 0 1 ${roundCoord(left)} ${roundCoord(bottom - r)}`,
    `L ${roundCoord(left)} ${roundCoord(notchY + notchR)}`,
    `A ${notchR} ${notchR} 0 0 0 ${roundCoord(left)} ${roundCoord(notchY - notchR)}`,
    `L ${roundCoord(left)} ${roundCoord(top + r)}`,
    `A ${r} ${r} 0 0 1 ${roundCoord(left + r)} ${roundCoord(top)}`,
    'Z',
  );

  return segments.join(' ');
}

export function useLShapePath(
  containerRef: RefObject<HTMLDivElement | null>,
  cutoutRef: RefObject<HTMLDivElement | null>,
  enabled = true,
): LShapePaths {
  const [paths, setPaths] = useState<LShapePaths>({
    width: 0,
    height: 0,
    notchY: 0,
    clipPath: '',
    strokePath: '',
    isReady: false,
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!enabled || !container || typeof ResizeObserver === 'undefined') {
      return;
    }

    let frameId: number | null = null;

    const recalculate = () => {
      const containerRect = container.getBoundingClientRect();
      const cutoutRect = cutoutRef.current?.getBoundingClientRect();

      const width = Math.round(containerRect.width);
      const height = Math.round(containerRect.height);

      if (width < 520 || height < 280) {
        setPaths({
          width,
          height,
          notchY: Math.round(height * 0.44),
          clipPath: '',
          strokePath: '',
          isReady: false,
        });
        return;
      }

      const cutoutWidth = cutoutRect ? Math.round(cutoutRect.width) + CUTOUT_GAP_PX : 0;
      const cutoutHeight = cutoutRect ? Math.round(cutoutRect.height) + CUTOUT_GAP_PX : 0;
      const notchY = Math.round(height * 0.44);

      const clipPath = buildLShapeSvgPath({
        width,
        height,
        cutoutWidth,
        cutoutHeight,
        notchY,
        inset: 0,
      });

      const strokePath = buildLShapeSvgPath({
        width,
        height,
        cutoutWidth,
        cutoutHeight,
        notchY,
        inset: 0.75,
      });

      setPaths({
        width,
        height,
        notchY,
        clipPath,
        strokePath,
        isReady: Boolean(clipPath && strokePath),
      });
    };

    const scheduleRecalculate = () => {
      if (frameId !== null) {
        cancelAnimationFrame(frameId);
      }
      frameId = requestAnimationFrame(recalculate);
    };

    const observer = new ResizeObserver(scheduleRecalculate);
    observer.observe(container);
    if (cutoutRef.current) {
      observer.observe(cutoutRef.current);
    }

    recalculate();

    return () => {
      observer.disconnect();
      if (frameId !== null) {
        cancelAnimationFrame(frameId);
      }
    };
  }, [containerRef, cutoutRef, enabled]);

  return paths;
}
