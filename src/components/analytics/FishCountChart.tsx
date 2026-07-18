// FishCountChart.tsx - Histogram of total fish detections over time
import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { AIDetectionResult } from '../../types/aquarium';
import { formatChartTimestamp, type DetectionTimeAxis } from '../../utils/detectionTimeAxis';
import { ChartEmptyState } from './ChartEmptyState';
import { analyticsTooltipMaterialStyle } from './analyticsTooltipMaterial';

interface Props {
  records: AIDetectionResult[];
  selectedSpecies?: string;
  timeAxis: DetectionTimeAxis;
}

const MAX_HISTOGRAM_BINS = 20;

function countBySpecies(record: AIDetectionResult, selectedSpecies?: string): number {
  if (!selectedSpecies || selectedSpecies === 'all') {
    return record.summary?.total_detections ?? 0;
  }
  return record.detections.filter((d) => d.species === selectedSpecies).length;
}

export const FishCountChart: React.FC<Props> = ({ records, selectedSpecies, timeAxis }) => {
  const data = useMemo(() => {
    if (records.length <= MAX_HISTOGRAM_BINS) {
      return records.map((record) => ({
        time: Date.parse(record.timestamp),
        count: countBySpecies(record, selectedSpecies),
      }));
    }

    const bins = Array.from({ length: MAX_HISTOGRAM_BINS }, () => ({
      total: 0,
      samples: 0,
      timestamp: records[0].timestamp,
    }));

    records.forEach((record, index) => {
      const binIndex = Math.min(
        Math.floor((index * MAX_HISTOGRAM_BINS) / records.length),
        MAX_HISTOGRAM_BINS - 1,
      );
      const bin = bins[binIndex];
      bin.total += countBySpecies(record, selectedSpecies);
      bin.samples += 1;
      bin.timestamp = record.timestamp;
    });

    return bins.map((bin) => ({
      time: Date.parse(bin.timestamp),
      count: Math.round(bin.total / bin.samples),
    }));
  }, [records, selectedSpecies]);

  if (data.length === 0) {
    return <ChartEmptyState message="No detection data available" className="
      h-full min-h-[120px]
    " />;
  }

  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart
        data={data}
        margin={{ top: 8, right: 0, left: 0, bottom: 0 }}
        barCategoryGap="18%"
      >
        <defs>
          <linearGradient id="fishCountBarGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-verdigris)" />
            <stop offset="100%" stopColor="var(--color-pine-teal)" />
          </linearGradient>
        </defs>
        <CartesianGrid
          stroke="var(--color-azure-mist-2)"
          strokeDasharray="5 6"
        />
        <XAxis
          dataKey="time"
          type="number"
          scale="time"
          domain={timeAxis.domain}
          ticks={timeAxis.ticks}
          tickFormatter={formatChartTimestamp}
          tick={{ fill: 'var(--color-slate-grey)', fontSize: 12 }}
          axisLine={{ stroke: 'var(--color-azure-mist-2)' }}
          tickLine={{ stroke: 'var(--color-azure-mist-2)' }}
        />
        <YAxis
          allowDecimals={false}
          orientation="left"
          tick={{ fill: 'var(--color-slate-grey)', fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          width={32}
        />
        <Tooltip
          contentStyle={{
            ...analyticsTooltipMaterialStyle,
            color: 'var(--color-prussian-blue)',
          }}
          formatter={(value) => [`${value as number} fish`, 'Count']}
          labelFormatter={(label) => formatChartTimestamp(Number(label))}
        />
        <Bar
          dataKey="count"
          fill="url(#fishCountBarGrad)"
          animationDuration={500}
          radius={[3, 3, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
};
