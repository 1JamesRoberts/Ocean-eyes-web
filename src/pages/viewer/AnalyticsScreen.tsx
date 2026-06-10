// AnalyticsScreen.tsx - AI inference history analytics dashboard
import React, { useState } from 'react';
import { Calendar, RotateCcw, Loader2, ArrowRight } from 'lucide-react';
import { useNavigation } from '../../context/NavigationContext';
import { useReadings } from '../../hooks/useReadings';
import { useHistory } from '../../hooks/useHistory';
import { resolveCropUrl } from '../../services/ai_service';
import { FishCountChart } from '../../components/analytics/FishCountChart';
import { ClarityTrendChart } from '../../components/analytics/ClarityTrendChart';
import { SpatialDetectionHeatmap } from '../../components/analytics/SpatialDetectionHeatmap';
import { todayUTC } from '../../utils/analytics';
import styles from './AnalyticsScreen.module.css';

export const AnalyticsScreen: React.FC = () => {
  const { setActiveTab } = useNavigation();
  const { readings } = useReadings();
  const [selectedDate, setSelectedDate] = useState<string>(todayUTC);
  const { detectionData, turbidityData, loading, error, refetch } = useHistory(selectedDate);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(e.target.value);
  };

  const detectionRecords = detectionData?.records ?? [];
  const turbidityRecords = turbidityData?.records ?? [];
  const hasAnyData = detectionRecords.length > 0 || turbidityRecords.length > 0 || readings.length > 0;

  const diagnoses = detectionRecords
    .flatMap(record => 
      record.detections
        .filter(det => det.diagnosis)
        .map(det => ({
          timestamp: record.timestamp,
          species: det.species_display,
          cropUrl: det.diagnosis!.crop_url,
          diagnosis: det.diagnosis!
        }))
    )
    .reverse();

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

          {/* Water Clarity Trend */}
          <div
            className={`${styles.chartCard} ${styles.chartCardClickable}`}
            onClick={() => setActiveTab('history')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter') setActiveTab('history'); }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 className={styles.chartTitle}>Water Clarity Trend</h3>
                <p className={styles.chartSubtitle}>
                  {(readings.length > 0 ? readings.length : turbidityRecords.length) || 'No'} clarity readings
                </p>
              </div>
              <ArrowRight size={16} className={styles.chartCardArrow} />
            </div>
            <ClarityTrendChart
              records={turbidityRecords}
              readings={readings}
              emptyAction={
                <button
                  className={styles.emptyActionButton}
                  onClick={(e) => { e.stopPropagation(); setActiveTab('history'); }}
                >
                  View Clarity Analytics →
                </button>
              }
            />
          </div>

          {/* AI Health Diagnostics Log */}
          <div className={`${styles.chartCard} ${styles.chartCardWide}`}>
            <div>
              <h3 className={styles.chartTitle}>AI Health Diagnostics History</h3>
              <p className={styles.chartSubtitle}>
                Disease diagnosis runs executed on this date
              </p>
            </div>
            {diagnoses.length === 0 ? (
              <div className={styles.emptyDiagnostics}>
                No health diagnostic records found for {selectedDate}.
              </div>
            ) : (
              <div className={styles.diagnosesList}>
                {diagnoses.map((diag, index) => {
                  const isErr = !!diag.diagnosis.error;
                  const isHealthy = diag.diagnosis.healthy;
                  
                  return (
                    <div 
                      key={index} 
                      className={styles.diagnosesItem}
                      style={{
                        border: `1px solid ${
                          isErr 
                            ? 'var(--color-critical)' 
                            : isHealthy 
                              ? 'var(--color-good)' 
                              : 'var(--color-warning)'
                        }`,
                      }}
                    >
                      <div className={styles.diagnosesItemHeader}>
                        <div className={styles.diagnosesItemSubject}>
                          <span className={styles.diagnosesSubjectName}>
                            {diag.species}
                          </span>
                          <span 
                            className={styles.diagnosesBadge}
                            style={{
                              background: isErr 
                                ? 'rgba(239, 68, 68, 0.12)' 
                                : isHealthy 
                                  ? 'rgba(16, 185, 129, 0.12)' 
                                  : 'rgba(245, 158, 11, 0.12)',
                              color: isErr 
                                ? 'var(--color-critical)' 
                                : isHealthy 
                                  ? 'var(--color-good)' 
                                  : 'var(--color-warning)'
                            }}
                          >
                            {isErr ? 'Error' : isHealthy ? 'Healthy' : `Disease: ${diag.diagnosis.disease}`}
                          </span>
                        </div>
                        <span className={styles.diagnosesTime}>
                          {new Date(diag.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      
                      {diag.cropUrl && (
                        <img
                          src={resolveCropUrl(diag.cropUrl)}
                          alt={`Crop of ${diag.species} sent to LLM`}
                          className={styles.diagnosesCropImage}
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      )}

                      {isErr ? (
                        <p className={styles.diagnosesErrorText}>
                          <strong>Configuration Error:</strong> {diag.diagnosis.error}
                        </p>
                      ) : (
                        <div className={styles.diagnosesContent}>
                          <p className={styles.diagnosesObservation}>
                            <strong>Observation:</strong> {diag.diagnosis.description}
                          </p>
                          {!isHealthy && diag.diagnosis.treatment && (
                            <p className={styles.diagnosesTreatment}>
                              <strong>Recommended Treatment:</strong> {diag.diagnosis.treatment}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
