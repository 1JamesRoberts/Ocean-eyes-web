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
  const circumference = 2 * Math.PI * radius;

  const segmentsWithOffsets = useMemo(
    () =>
      speciesDistribution.reduce<
        Array<{
          species: SpeciesSlice;
          dashLength: number;
          gapLength: number;
          index: number;
          offset: number;
        }>
      >((acc, species, index) => {
        const percentage = species.count / total;
        const dashLength = circumference * percentage;
        const gapLength = circumference - dashLength;
        const offset =
          acc.length > 0 ? acc[acc.length - 1].offset + acc[acc.length - 1].dashLength : 0;
        acc.push({ species, dashLength, gapLength, index, offset });
        return acc;
      }, []),
    [speciesDistribution, total, circumference]
  );

  if (speciesDistribution.length === 0) {
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
            {segmentsWithOffsets.map(({ species, dashLength, gapLength, offset, index }) => (
              <circle
                key={index}
                cx="100"
                cy="100"
                r={radius}
                fill="none"
                stroke={species.color}
                strokeWidth="24"
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
              className="size-2.5 rounded-[3px]"
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
