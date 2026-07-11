// src/components/analytics/MeanNNDChart.tsx - Mean nearest-neighbor distance over time
import React, { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { AIDetection, AIDetectionResult } from '../../types/aquarium';
import { formatTimeShort } from '../../utils/formatters';
import { calculateMeanNND } from '../../utils/geometry';
import { ChartEmptyState } from './ChartEmptyState';

interface Props {
  records: AIDetectionResult[];
  selectedSpecies?: string;
}

const MAX_CHART_POINTS = 80;

function filterDetectionsBySpecies(record: AIDetectionResult, selectedSpecies?: string): AIDetection[] {
  if (!selectedSpecies || selectedSpecies === 'all') {
    return record.detections;
  }
  return record.detections.filter((d) => d.species === selectedSpecies);
}

export const MeanNNDChart: React.FC<Props> = ({ records, selectedSpecies }) => {
  const data = useMemo(() => {
    const sampledRecords = records.length <= MAX_CHART_POINTS
      ? records
      : Array.from({ length: MAX_CHART_POINTS }, (_, index) => {
          const recordIndex = Math.round(
            (index * (records.length - 1)) / (MAX_CHART_POINTS - 1),
          );
          return records[recordIndex];
        });

    return sampledRecords.map((r) => ({
      time: formatTimeShort(r.timestamp),
      nnd: calculateMeanNND(
        filterDetectionsBySpecies(r, selectedSpecies),
        r.image_dimensions,
      ),
    }));
  }, [records, selectedSpecies]);

  if (data.length === 0) {
    return <ChartEmptyState message="No detection data available" className="
      h-full min-h-[120px]
    " />;
  }

  return (
    <ResponsiveContainer width="100%" height={180}>
      <AreaChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="meanNNDGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-warning)" stopOpacity={0.25} />
            <stop offset="95%" stopColor="var(--color-warning)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
        <XAxis
          dataKey="time"
          tick={{ fill: 'var(--color-text-secondary)', fontSize: 12 }}
          axisLine={{ stroke: 'var(--color-border)' }}
          tickLine={{ stroke: 'var(--color-border)' }}
        />
        <YAxis
          tick={{ fill: 'var(--color-text-secondary)', fontSize: 12 }}
          axisLine={{ stroke: 'var(--color-border)' }}
          tickLine={{ stroke: 'var(--color-border)' }}
        />
        <Tooltip
          contentStyle={{
            background: 'rgba(255,255,255,0.7)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.3)',
            borderRadius: '1rem',
            color: 'var(--color-text-primary)',
            fontSize: 13,
          }}
          formatter={(value) => [Number(value).toFixed(3), 'Mean NND']}
        />
        <Area
          type="monotone"
          dataKey="nnd"
          stroke="var(--color-warning)"
          strokeWidth={2}
          fill="url(#meanNNDGrad)"
          animationDuration={500}
          dot={{ r: 3, fill: 'var(--color-warning)', strokeWidth: 0 }}
          activeDot={{ r: 5, fill: 'var(--color-warning)', stroke: 'var(--color-surface)', strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};
