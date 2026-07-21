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
  const chartSize = 200;
  const chartCenter = chartSize / 2;
  const radius = 80;
  const strokeWidth = 19.2;
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
        flex h-[200px] items-center justify-center type-body-muted
      ">
        No fish data available
      </div>
    );
  }

  const speciesBySide = speciesDistribution.reduce<[SpeciesSlice[], SpeciesSlice[]]>(
    (sides, species, index) => {
      sides[index % 2].push(species);
      return sides;
    },
    [[], []]
  );
  const chartColumnClass =
    speciesDistribution.length <= 4
      ? 'grid-cols-[minmax(0,1fr)_clamp(7rem,50%,13.5rem)_minmax(0,1fr)]'
      : 'grid-cols-[minmax(0,1fr)_clamp(7rem,40%,11rem)_minmax(0,1fr)]';

  const renderSpeciesLabel = (species: SpeciesSlice, side: 'left' | 'right') => (
    <li
      key={species.name}
      className={`flex max-w-full min-w-0 items-center gap-1 overflow-hidden text-[11px] font-medium leading-tight text-slate-grey motion-safe:animate-donut-detail-enter ${
        side === 'left' ? 'justify-end text-right' : 'justify-start text-left'
      }`}
      style={{ animationDelay: '120ms' }}
      title={`${species.name} (${species.count})`}
    >
      <span
        aria-hidden="true"
        className="size-2 shrink-0 rounded-full"
        style={{ backgroundColor: species.color }}
      />
      <span className="min-w-0 overflow-hidden whitespace-nowrap">{species.name}</span>
      <span className="shrink-0">({species.count})</span>
    </li>
  );

  return (
    <div
      className={`grid w-full items-stretch overflow-hidden transition-[grid-template-columns] duration-300 ${chartColumnClass}`}
    >
      <ul
        aria-label="Species on the left of the chart"
        className="flex min-w-0 flex-col justify-evenly gap-2 py-2 pr-1"
      >
        {speciesBySide[0].map((species) => renderSpeciesLabel(species, 'left'))}
      </ul>

      <div className="relative aspect-square w-full self-center">
        <svg
          aria-label={`Species distribution for ${total} fish`}
          className="size-full origin-center motion-safe:animate-donut-enter"
          role="img"
          viewBox={`0 0 ${chartSize} ${chartSize}`}
        >
          <g transform={`rotate(-90 ${chartCenter} ${chartCenter})`}>
            <circle
              cx={chartCenter}
              cy={chartCenter}
              r={radius}
              fill="none"
              stroke="transparent"
              strokeWidth={strokeWidth}
            />
            {segmentsWithOffsets.map(({ species, dashLength, gapLength, offset, index }) => (
              <circle
                key={`${species.name}-${index}`}
                cx={chartCenter}
                cy={chartCenter}
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
        <div
          className="absolute top-1/2 left-1/2 -translate-1/2 text-center motion-safe:animate-donut-detail-enter"
          style={{ animationDelay: '90ms' }}
        >
          <div className="text-[28px] font-extrabold leading-none text-prussian-blue">{total}</div>
          <div className="text-[11px] leading-tight font-normal text-slate-grey">Total Fish</div>
        </div>
      </div>

      <ul
        aria-label="Species on the right of the chart"
        className="flex min-w-0 flex-col justify-evenly gap-2 py-2 pl-1"
      >
        {speciesBySide[1].map((species) => renderSpeciesLabel(species, 'right'))}
      </ul>
    </div>
  );
};
