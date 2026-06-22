// MiniClarityChart.tsx - Compact SVG area chart for ReadingItem clarity values
import React, { useMemo, useRef, useState, useEffect } from 'react';
import type { ReadingItem } from '../../types/aquarium';

interface Props {
  readings: ReadingItem[];
  height?: number;
}

const DEFAULT_HEIGHT = 140;
const PADDING = 20;
const MAX_VAL = 10;
const MIN_VAL = 0;
const DEFAULT_WIDTH = 600;

export const MiniClarityChart: React.FC<Props> = ({ readings, height = DEFAULT_HEIGHT }) => {
  const HEIGHT = height;
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState<number>(DEFAULT_WIDTH);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        if (w > 0) setWidth(w);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const points = useMemo(() => {
    const history = [...readings].reverse().slice(-7);
    if (history.length === 0) return [];
    return history.map((r, idx) => {
      const x = PADDING + (idx * (width - 2 * PADDING) / Math.max(1, history.length - 1));
      const y = HEIGHT - PADDING - ((r.clarity - MIN_VAL) * (HEIGHT - 2 * PADDING) / (MAX_VAL - MIN_VAL));
      return { x, y, clarity: r.clarity };
    });
  }, [readings, width, HEIGHT]);

  if (points.length === 0) return null;

  const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(' ');
  const baselineY = HEIGHT - PADDING;
  const areaPoints = `${points[0].x},${baselineY} ${polylinePoints} ${points[points.length - 1].x},${baselineY}`;

  return (
    <div ref={containerRef} className="w-full glass-panel">
      <svg width="100%" height={HEIGHT} viewBox={`0 0 ${width} ${HEIGHT}`} className="
        block overflow-visible
      ">
        <defs>
          <linearGradient id="miniChartGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-info)" stopOpacity="0.3" />
            <stop offset="100%" stopColor="var(--color-info)" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        <line x1={PADDING} y1={baselineY} x2={width - PADDING} y2={baselineY} stroke="var(--color-border)" strokeWidth="1" />
        <line x1={PADDING} y1={HEIGHT / 2} x2={width - PADDING} y2={HEIGHT / 2} stroke="var(--color-border)" strokeWidth="0.5" strokeDasharray="3 3" />
        <line x1={PADDING} y1={PADDING} x2={width - PADDING} y2={PADDING} stroke="var(--color-border)" strokeWidth="0.5" strokeDasharray="3 3" />

        {/* Filled area */}
        <polygon points={areaPoints} fill="url(#miniChartGrad)" />

        {/* Line */}
        <polyline fill="none" stroke="var(--color-info)" strokeWidth="2.5" points={polylinePoints} strokeLinecap="round" />

        {/* Data points */}
        {points.map((p, idx) => (
          <g key={idx}>
            <circle cx={p.x} cy={p.y} r="4" fill="var(--color-info)" stroke="var(--color-surface)" strokeWidth="2" />
            <text x={p.x} y={p.y - 8} fontSize="9" fontWeight="700" textAnchor="middle" fill="var(--color-text-primary)">
              {p.clarity}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
};
