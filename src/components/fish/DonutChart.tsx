import React, { useMemo } from 'react';

interface SpeciesSlice {
  name: string;
  count: number;
  color: string;
  initials: string;
}

interface DonutChartProps {
  speciesDistribution: SpeciesSlice[];
}

export const DonutChart: React.FC<DonutChartProps> = ({ speciesDistribution }) => {
  const total = speciesDistribution.reduce((sum, s) => sum + s.count, 0);
  const radius = 80;
  const strokeWidth = 24;
  const separatorWidth = speciesDistribution.length > 1 ? 3 : 0;
  const circumference = 2 * Math.PI * radius;
  const divisor = total > 0 ? total : 1;

  const segmentsWithOffsets = useMemo(
    () =>
      speciesDistribution.reduce<
        Array<{
          species: SpeciesSlice;
          segmentLength: number;
          dashLength: number;
          gapLength: number;
          index: number;
          offset: number;
        }>
      >((acc, species, index) => {
        const percentage = species.count / divisor;
        const segmentLength = circumference * percentage;
        const dashLength = Math.max(segmentLength - separatorWidth, 0);
        const gapLength = circumference - dashLength;
        const offset =
          acc.length > 0 ? acc[acc.length - 1].offset + acc[acc.length - 1].segmentLength : 0;
        acc.push({ species, segmentLength, dashLength, gapLength, index, offset });
        return acc;
      }, []),
    [speciesDistribution, divisor, circumference, separatorWidth]
  );

  if (speciesDistribution.length === 0 || total <= 0) {
    return (
      <div className="
        flex h-[200px] items-center justify-center text-text-muted
      ">
        No fish data available
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative size-[200px]">
        <svg width="200" height="200" viewBox="0 0 200 200">
          <g transform="rotate(-90 100 100)">
            <circle
              cx="100"
              cy="100"
              r={radius}
              fill="none"
              stroke="white"
              strokeWidth={strokeWidth}
            />
            {segmentsWithOffsets.map(({ species, dashLength, gapLength, offset, index }) => (
              <circle
                key={index}
                cx="100"
                cy="100"
                r={radius}
                fill="none"
                stroke={species.color}
                strokeWidth={strokeWidth}
                strokeDasharray={`${dashLength} ${gapLength}`}
                strokeDashoffset={-offset}
                className="transition-all duration-300 ease-in-out"
              />
            ))}
          </g>
        </svg>
        <div className="absolute top-1/2 left-1/2 -translate-1/2 text-center">
          <div className="text-display font-extrabold text-text">{total}</div>
          <div className="text-caption font-semibold text-text-muted">TOTAL FISH</div>
        </div>
      </div>

      <div className="flex w-full flex-wrap justify-center gap-2">
        {speciesDistribution.map((species, index) => (
          <div key={index} className="
            flex items-center gap-1.5 text-xs font-semibold
          ">
            <div
              className="size-2.5 rounded-full"
              style={{ backgroundColor: species.color }}
            />
            <span className="text-text-muted">
              {species.name} ({species.count})
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
