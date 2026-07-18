// ClarityTrendChart.tsx - Water clarity trend chart (readings-first, AI turbidity fallback)
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
import type { AITurbidityResult, ReadingItem } from '../../types/aquarium';
import { formatTimeShort } from '../../utils/formatters';
import { ChartEmptyState } from './ChartEmptyState';
import { MiniClarityChart } from './MiniClarityChart';
import { analyticsTooltipMaterialStyle } from './analyticsTooltipMaterial';

interface Props {
  records: AITurbidityResult[];
  readings?: ReadingItem[];
  emptyAction?: React.ReactNode;
}

export const ClarityTrendChart: React.FC<Props> = ({ records, readings, emptyAction }) => {
  const data = useMemo(() => {
    return records
      .filter((r) => r.turbidity?.fnu != null)
      .map((r) => ({
        time: formatTimeShort(r.timestamp),
        fnu: r.turbidity.fnu,
      }));
  }, [records]);

  const hasReadingsClarity = readings && readings.length > 0 && readings.some((r) => r.clarity != null);

  if (hasReadingsClarity) {
    const readingHistory = [...readings].reverse().slice(-7);
    if (readingHistory.length === 0) {
      return (
        <ChartEmptyState
          message="No water clarity history for this date."
          hint="Water clarity is only recorded when the turbidity-specific endpoint is used."
          action={emptyAction}
        />
      );
    }
    return <MiniClarityChart readings={readings} />;
  }

  if (data.length === 0) {
    return (
      <ChartEmptyState
        message="No water clarity history for this date."
        hint="Water clarity is only recorded when the turbidity-specific endpoint is used."
        action={emptyAction}
      />
    );
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-azure-mist-2)" />
        <XAxis
          dataKey="time"
          tick={{ fill: 'var(--color-slate-grey)', fontSize: 12 }}
          axisLine={{ stroke: 'var(--color-azure-mist-2)' }}
          tickLine={{ stroke: 'var(--color-azure-mist-2)' }}
        />
        <YAxis
          tick={{ fill: 'var(--color-slate-grey)', fontSize: 12 }}
          axisLine={{ stroke: 'var(--color-azure-mist-2)' }}
          tickLine={{ stroke: 'var(--color-azure-mist-2)' }}
          domain={['auto', 'auto']}
        />
        <Tooltip
          contentStyle={{
            ...analyticsTooltipMaterialStyle,
            color: 'var(--color-prussian-blue)',
          }}
          formatter={(value) => [`${Number(value).toFixed(2)} FNU`, 'Water Clarity']}
        />
        <Line
          type="monotone"
          dataKey="fnu"
          stroke="var(--color-pine-teal)"
          strokeWidth={2}
          dot={{ r: 3, fill: 'var(--color-pine-teal)', strokeWidth: 0 }}
          activeDot={{ r: 5, fill: 'var(--color-pine-teal)', stroke: 'var(--color-white)', strokeWidth: 2 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};
