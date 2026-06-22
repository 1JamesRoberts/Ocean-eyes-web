// FishCountChart.tsx - Area chart of total fish detections over time
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
import type { AIDetectionResult } from '../../types/aquarium';
import { formatTimeShort } from '../../utils/formatters';
import { ChartEmptyState } from './ChartEmptyState';

interface Props {
  records: AIDetectionResult[];
  selectedSpecies?: string;
}

function countBySpecies(record: AIDetectionResult, selectedSpecies?: string): number {
  if (!selectedSpecies || selectedSpecies === 'all') {
    return record.summary?.total_detections ?? 0;
  }
  return record.detections.filter((d) => d.species === selectedSpecies).length;
}

export const FishCountChart: React.FC<Props> = ({ records, selectedSpecies }) => {
  const data = useMemo(() => {
    return records
      .map((r) => ({
        time: formatTimeShort(r.timestamp),
        count: countBySpecies(r, selectedSpecies),
      }));
  }, [records, selectedSpecies]);

  if (data.length === 0) {
    return <ChartEmptyState message="No detection data available" className="
      h-full
    " />;
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="fishCountGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-info)" stopOpacity={0.25} />
            <stop offset="95%" stopColor="var(--color-info)" stopOpacity={0} />
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
          allowDecimals={false}
          tick={{ fill: 'var(--color-text-secondary)', fontSize: 12 }}
          axisLine={{ stroke: 'var(--color-border)' }}
          tickLine={{ stroke: 'var(--color-border)' }}
        />
        <Tooltip
          contentStyle={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 12,
            color: 'var(--color-text-primary)',
            fontSize: 13,
          }}
          formatter={(value) => [`${value as number} fish`, 'Count']}
        />
        <Area
          type="monotone"
          dataKey="count"
          stroke="var(--color-info)"
          strokeWidth={2}
          fill="url(#fishCountGrad)"
          animationDuration={500}
          dot={{ r: 3, fill: 'var(--color-info)', strokeWidth: 0 }}
          activeDot={{ r: 5, fill: 'var(--color-info)', stroke: 'var(--color-surface)', strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};
