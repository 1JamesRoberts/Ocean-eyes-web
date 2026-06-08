// TurbidityTrendChart.tsx - Line chart of FNU turbidity readings over time
import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { AITurbidityResult } from '../../types/aquarium';
import { formatTimeShort } from '../../utils/analytics';
import { ChartEmptyState } from './ChartEmptyState';

interface Props {
  records: AITurbidityResult[];
}

export const TurbidityTrendChart: React.FC<Props> = ({ records }) => {
  const data = useMemo(() => {
    return records
      .filter((r) => r.turbidity?.fnu != null)
      .map((r) => ({
        time: formatTimeShort(r.timestamp),
        fnu: r.turbidity.fnu,
      }));
  }, [records]);

  if (data.length === 0) {
    return (
      <ChartEmptyState
        message="No turbidity history for this date."
        hint="Turbidity is only recorded when the turbidity-specific endpoint is used."
      />
    );
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
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
          domain={['auto', 'auto']}
        />
        <Tooltip
          contentStyle={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 12,
            color: 'var(--color-text-primary)',
            fontSize: 13,
          }}
          formatter={(value) => [`${Number(value).toFixed(2)} FNU`, 'Turbidity']}
        />
        <Line
          type="monotone"
          dataKey="fnu"
          stroke="var(--color-primary-dark)"
          strokeWidth={2}
          dot={{ r: 3, fill: 'var(--color-primary-dark)', strokeWidth: 0 }}
          activeDot={{ r: 5, fill: 'var(--color-primary-dark)', stroke: 'var(--color-surface)', strokeWidth: 2 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};
