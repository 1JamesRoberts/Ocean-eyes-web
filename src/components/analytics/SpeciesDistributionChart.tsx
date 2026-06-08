// SpeciesDistributionChart.tsx - Pie chart of aggregated species counts
import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { AIDetectionResult } from '../../types/aquarium';
import { formatSpeciesName } from '../../utils/analytics';
import { ChartEmptyState } from './ChartEmptyState';

interface Props {
  records: AIDetectionResult[];
}

const COLORS = [
  'var(--color-info)',
  'var(--color-good)',
  'var(--color-warning)',
  'var(--color-critical)',
  'var(--color-primary-dark)',
  '#8B5CF6',
  '#EC4899',
  '#14B8A6',
];

export const SpeciesDistributionChart: React.FC<Props> = ({ records }) => {
  const data = useMemo(() => {
    const counts: Record<string, number> = {};
    records.forEach((r) => {
      if (!r.summary?.species_counts) return;
      Object.entries(r.summary.species_counts).forEach(([species, count]) => {
        counts[species] = (counts[species] || 0) + count;
      });
    });
    return Object.entries(counts)
      .map(([name, value]) => ({
        name: formatSpeciesName(name),
        value,
      }))
      .sort((a, b) => b.value - a.value);
  }, [records]);

  if (data.length === 0) {
    return <ChartEmptyState message="No species data available" />;
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={90}
          paddingAngle={3}
          stroke="var(--color-surface)"
          strokeWidth={2}
        >
          {data.map((_entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 12,
            color: 'var(--color-text-primary)',
            fontSize: 13,
          }}
          formatter={(value, name) => [`${value as number}`, name as string]}
        />
        <Legend
          wrapperStyle={{ fontSize: 12, color: 'var(--color-text-secondary)' }}
          iconType="circle"
          iconSize={8}
        />
      </PieChart>
    </ResponsiveContainer>
  );
};
