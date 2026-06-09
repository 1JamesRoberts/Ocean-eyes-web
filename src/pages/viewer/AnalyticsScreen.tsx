// AnalyticsScreen.tsx - AI inference history analytics dashboard
import React, { useState, useCallback } from 'react';
import { Calendar, RotateCcw, Loader2 } from 'lucide-react';
import { useHistory } from '../../hooks/useHistory';
import { FishCountChart } from '../../components/analytics/FishCountChart';
import { SpeciesDistributionChart } from '../../components/analytics/SpeciesDistributionChart';
import { TurbidityTrendChart } from '../../components/analytics/TurbidityTrendChart';
import { SpeciesPresenceHeatmap } from '../../components/analytics/SpeciesPresenceHeatmap';
import { SpatialDetectionHeatmap } from '../../components/analytics/SpatialDetectionHeatmap';
import { todayUTC } from '../../utils/analytics';
import styles from './AnalyticsScreen.module.css';

export const AnalyticsScreen: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<string>(todayUTC);
  const { detectionData, turbidityData, loading, error, refetch } = useHistory(selectedDate);

  const handleDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(e.target.value);
  }, []);

  const detectionRecords = detectionData?.records ?? [];
  const turbidityRecords = turbidityData?.records ?? [];
  const hasAnyData = detectionRecords.length > 0 || turbidityRecords.length > 0;

  return (
    <div className={styles.analyticsContainer}>
      {/* Header */}
      <div className={styles.analyticsHeader}>
        <div>
          <h1 className="canvas-title">Analytics</h1>
          <p className={styles.headerSubtitle}>
            AI inference history &amp; trends
          </p>
        </div>
        <div className={styles.dateControls}>
          <Calendar size={16} color="var(--color-text-secondary)" />
          <input
            type="date"
            className={styles.dateInput}
            value={selectedDate}
            onChange={handleDateChange}
          />
          <button
            className={styles.refreshButtonNeutral}
            onClick={refetch}
            disabled={loading}
            title="Refresh data"
          >
            <RotateCcw size={14} />
          </button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className={styles.errorBanner}>
          <span>{error}</span>
          <button className={styles.retryButton} onClick={refetch}>
            Retry
          </button>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className={styles.loadingState}>
          <Loader2 size={28} className="anim-float-1" style={{ color: 'var(--color-info)' }} />
          <span className={styles.loadingText}>
            Loading analytics data...
          </span>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && !hasAnyData && (
        <div className={`${styles.chartCard} ${styles.emptyState}`}>
          <Calendar size={32} style={{ color: 'var(--color-text-secondary)', opacity: 0.5 }} />
          <span className={styles.emptyCardTitle}>
            No data for {selectedDate}
          </span>
          <span className={styles.emptyCardHint}>
            Try selecting a different date or run the AI pipeline to generate history.
          </span>
        </div>
      )}

      {/* Charts grid */}
      {!loading && !error && hasAnyData && (
        <div className={styles.chartGrid}>
          {/* Spatial Detection Heatmap */}
          <div className={`${styles.chartCard} ${styles.chartCardWide}`}>
            <div>
              <h3 className={styles.chartTitle}>Detection Density Heatmap</h3>
              <p className={styles.chartSubtitle}>
                Spatial distribution across camera frame
              </p>
            </div>
            <SpatialDetectionHeatmap records={detectionRecords} />
          </div>

          {/* Fish Count Timeline */}
          <div className={styles.chartCard}>
            <div>
              <h3 className={styles.chartTitle}>Fish Count Over Time</h3>
              <p className={styles.chartSubtitle}>
                {detectionRecords.length} detection frames
              </p>
            </div>
            <FishCountChart records={detectionRecords} />
          </div>

          {/* Turbidity Trend */}
          <div className={styles.chartCard}>
            <div>
              <h3 className={styles.chartTitle}>Turbidity Trend</h3>
              <p className={styles.chartSubtitle}>
                {turbidityRecords.length} turbidity readings
              </p>
            </div>
            <TurbidityTrendChart records={turbidityRecords} />
          </div>

          {/* Species Distribution */}
          <div className={styles.chartCard}>
            <div>
              <h3 className={styles.chartTitle}>Species Distribution</h3>
              <p className={styles.chartSubtitle}>
                Aggregated across all detection frames
              </p>
            </div>
            <SpeciesDistributionChart records={detectionRecords} />
          </div>

          {/* Species Presence Heatmap */}
          <div className={styles.chartCard}>
            <div>
              <h3 className={styles.chartTitle}>Species Presence Heatmap</h3>
              <p className={styles.chartSubtitle}>
                Detections per 5-minute bucket
              </p>
            </div>
            <SpeciesPresenceHeatmap records={detectionRecords} />
          </div>
        </div>
      )}
    </div>
  );
};
