// SpeciesPresenceHeatmap.tsx - Time-bucketed grid showing species presence
import React, { useMemo } from 'react';
import type { AIDetectionResult } from '../../types/aquarium';
import { formatSpeciesName } from '../../utils/analytics';
import { ChartEmptyState } from './ChartEmptyState';
import styles from './SpeciesPresenceHeatmap.module.css';

interface Props {
  records: AIDetectionResult[];
}

const BUCKET_MINUTES = 5;

interface Bucket {
  label: string;
  species: Record<string, number>;
}

function getIntensityColor(count: number, maxCount: number): string {
  if (count === 0) return 'transparent';
  const ratio = maxCount > 0 ? count / maxCount : 0;
  if (ratio <= 0.33) return 'var(--color-good)';
  if (ratio <= 0.66) return 'var(--color-warning)';
  return 'var(--color-critical)';
}

function getIntensityOpacity(count: number, maxCount: number): number {
  if (count === 0) return 0;
  const ratio = maxCount > 0 ? count / maxCount : 0;
  return 0.2 + ratio * 0.7;
}

export const SpeciesPresenceHeatmap: React.FC<Props> = ({ records }) => {
  const { speciesList, buckets, maxCount } = useMemo(() => {
    if (records.length === 0) {
      return { speciesList: [] as string[], buckets: [] as Bucket[], maxCount: 0 };
    }

    const speciesSet = new Set<string>();
    records.forEach((r) => {
      if (!r.detections) return;
      r.detections.forEach((d) => speciesSet.add(d.species));
    });
    const speciesList = Array.from(speciesSet).sort();

    const bucketMap = new Map<number, Bucket>();
    records.forEach((r) => {
      const date = new Date(r.timestamp);
      const minutes = date.getHours() * 60 + date.getMinutes();
      const bucketKey = Math.floor(minutes / BUCKET_MINUTES) * BUCKET_MINUTES;

      if (!bucketMap.has(bucketKey)) {
        const h = Math.floor(bucketKey / 60);
        const m = bucketKey % 60;
        const label = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        bucketMap.set(bucketKey, { label, species: {} });
      }

      const bucket = bucketMap.get(bucketKey)!;
      r.detections?.forEach((d) => {
        bucket.species[d.species] = (bucket.species[d.species] || 0) + 1;
      });
    });

    const buckets = Array.from(bucketMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([, bucket]) => bucket);

    let maxCount = 0;
    buckets.forEach((b) => {
      Object.values(b.species).forEach((c) => {
        if (c > maxCount) maxCount = c;
      });
    });

    return { speciesList, buckets, maxCount };
  }, [records]);

  if (speciesList.length === 0 || buckets.length === 0) {
    return <ChartEmptyState message="No species detection data available" />;
  }

  const gridTemplateColumns = `120px repeat(${buckets.length}, minmax(40px, 1fr))`;

  return (
    <div className={styles.heatmapScroll}>
      <div
        className={styles.heatmapGrid}
        style={{
          gridTemplateColumns,
          minWidth: buckets.length * 44 + 120,
        }}
      >
        {/* Header row */}
        <div className={styles.headerCellLabel}>Species / Time</div>
        {buckets.map((b) => (
          <div key={b.label} className={styles.headerCell}>
            {b.label}
          </div>
        ))}

        {/* Data rows */}
        {speciesList.map((species) => (
          <React.Fragment key={species}>
            <div className={styles.speciesLabel} title={formatSpeciesName(species)}>
              {formatSpeciesName(species)}
            </div>
            {buckets.map((b) => {
              const count = b.species[species] || 0;
              return (
                <div
                  key={`${species}-${b.label}`}
                  className={styles.dataCell}
                  style={{
                    backgroundColor: getIntensityColor(count, maxCount),
                    opacity: getIntensityOpacity(count, maxCount),
                    color: count > 0 ? 'var(--color-text-primary)' : 'transparent',
                  }}
                  title={`${formatSpeciesName(species)}: ${count} detections`}
                >
                  {count > 0 ? count : ''}
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};
