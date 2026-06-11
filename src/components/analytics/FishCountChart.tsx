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
}

export const FishCountChart: React.FC<Props> = ({ records }) => {
  const data = useMemo(() => {
    return records
      .filter((r) => r.summary?.total_detections != null)
      .map((r) => ({
        time: formatTimeShort(r.timestamp),
        count: r.summary.total_detections,
      }));
  }, [records]);

  if (data.length === 0) {
    return <ChartEmptyState message="No detection data available" />;
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
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
          dot={{ r: 3, fill: 'var(--color-info)', strokeWidth: 0 }}
          activeDot={{ r: 5, fill: 'var(--color-info)', stroke: 'var(--color-surface)', strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};
