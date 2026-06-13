// AnalyticsScreen.tsx - AI inference history analytics dashboard
import React, { useState } from 'react';
import { Calendar, RotateCcw, Loader2, ArrowRight, Trash2 } from 'lucide-react';
import { useNavigation } from '../../context/NavigationContext';
import { useReadings } from '../../hooks/useReadings';
import { useHistory } from '../../hooks/useHistory';
import { useFish } from '../../hooks/useFish';
import { resolveCropUrl, clearDetectionHistory, clearTurbidityHistory } from '../../services/ai_service';
import { FishCountChart } from '../../components/analytics/FishCountChart';
import { ClarityTrendChart } from '../../components/analytics/ClarityTrendChart';
import { SpatialDetectionHeatmap } from '../../components/analytics/SpatialDetectionHeatmap';
import { todayUTC } from '../../utils/formatters';
import { useTank } from '../../hooks/useTank';

export const AnalyticsScreen: React.FC = () => {
  const { setActiveTab } = useNavigation();
  const { tankId } = useTank();
  const { readings } = useReadings();
  const { fishList } = useFish(tankId);
  const [selectedDate, setSelectedDate] = useState<string>(todayUTC);
  const { detectionData, turbidityData, loading, error, refetch } = useHistory(selectedDate);
  const inventorySpeciesIds = React.useMemo(
    () => new Set(fishList.map((f) => f.speciesId)),
    [fishList],
  );

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

  const [confirmClear, setConfirmClear] = useState(false);
  const [clearing, setClearing] = useState(false);

  const handleClearHistory = async () => {
    setClearing(true);
    try {
      await Promise.all([
        clearDetectionHistory(selectedDate),
        clearTurbidityHistory(selectedDate),
      ]);
      setConfirmClear(false);
      refetch();
    } catch (err) {
      console.error('Failed to clear history:', err);
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="canvas-header">
        <div>
          <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', fontWeight: 600, textTransform: 'uppercase', display: 'block' }}>
            AI Insights
          </span>
          <h1 className="canvas-title" style={{ marginTop: '2px' }}>Analytics</h1>
        </div>
        <div className="flex items-center gap-3">
          <Calendar size={16} className="text-text-muted" />
          <input
            type="date"
            className="py-2 px-3 rounded-xl border border-border-card bg-surface-card text-text-main text-sm outline-none focus:border-info"
            value={selectedDate}
            onChange={handleDateChange}
          />
          <button
            className="py-1.5 px-3 rounded-lg border border-border-card bg-transparent text-text-muted text-xs font-semibold cursor-pointer hover:bg-black/5"
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
        <div className="py-3 px-4 rounded-xl bg-critical/10 border border-critical text-critical text-[13px] flex items-center justify-between gap-3">
          <span>{error}</span>
            <button className="py-1.5 px-3 rounded-lg border border-critical bg-transparent text-critical text-xs font-semibold cursor-pointer hover:bg-critical/12" onClick={refetch}>
            Retry
          </button>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center h-[240px] text-text-muted text-sm">
          <Loader2 size={28} className="animate-float-1 text-info" />
          <span className="text-sm text-text-muted ml-2">
            Loading analytics data...
          </span>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && !hasAnyData && (
        <div className="bg-surface-card rounded-[20px] p-5 shadow-card border border-[rgba(13,148,136,0.02)] transition-[all_0.25s_cubic-bezier(0.4,0,0.2,1)] flex flex-col items-center justify-center p-12 px-6 gap-2 text-center">
          <Calendar size={32} className="text-text-muted opacity-50" />
          <span className="text-[15px] font-semibold text-text-main">
            No data for {selectedDate}
          </span>
          <span className="text-[13px] text-text-muted">
            Try selecting a different date or run the AI pipeline to generate history.
          </span>
        </div>
      )}

      {/* Charts grid */}
      {!loading && !error && hasAnyData && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Heatmap + Fish Count row (2:1 like dashboard-grid) */}
          <div className="lg:col-span-2 grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4">
            {/* Spatial Detection Heatmap */}
            <div className="bg-surface-card rounded-[20px] p-5 shadow-card border border-[rgba(13,148,136,0.02)] transition-[all_0.25s_cubic-bezier(0.4,0,0.2,1)] flex flex-col gap-3">
              <SpatialDetectionHeatmap
                records={detectionRecords}
                tankId={tankId}
                inventorySpeciesIds={inventorySpeciesIds}
              />
            </div>

            {/* Fish Count Timeline */}
            <div className="bg-surface-card rounded-[20px] p-5 shadow-card border border-[rgba(13,148,136,0.02)] transition-[all_0.25s_cubic-bezier(0.4,0,0.2,1)] flex flex-col gap-3">
            <div>
              <h3 className="text-sm font-bold text-text-main m-0">Fish Count Over Time</h3>
              <p className="text-xs text-text-muted m-0">
                {detectionRecords.length} detection frames
              </p>
            </div>
            <FishCountChart records={detectionRecords} />
          </div>
          </div>

          {/* Water Clarity Trend */}
          <div
            className="bg-surface-card rounded-[20px] p-5 shadow-card border border-[rgba(13,148,136,0.02)] transition-[all_0.25s_cubic-bezier(0.4,0,0.2,1)] flex flex-col gap-3 cursor-pointer lg:col-span-2"
            onClick={() => setActiveTab('history')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter') setActiveTab('history'); }}
          >
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold text-text-main m-0">Water Clarity Trend</h3>
                <p className="text-xs text-text-muted m-0">
                  {(readings.length > 0 ? readings.length : turbidityRecords.length) || 'No'} clarity readings
                </p>
              </div>
              <ArrowRight size={16} className="text-text-muted" />
            </div>
            <ClarityTrendChart
              records={turbidityRecords}
              readings={readings}
              emptyAction={
                <button
                  className="py-1.5 px-3.5 rounded-lg border border-primary-dark bg-primary-light-gradient text-primary-dark text-xs font-semibold cursor-pointer hover:bg-primary-dark hover:text-white"
                  onClick={(e) => { e.stopPropagation(); setActiveTab('history'); }}
                >
                  View Clarity Analytics →
                </button>
              }
            />
          </div>

          {/* AI Health Diagnostics Log */}
          <div className="bg-surface-card rounded-[20px] p-5 shadow-card border border-[rgba(13,148,136,0.02)] transition-[all_0.25s_cubic-bezier(0.4,0,0.2,1)] flex flex-col gap-3 lg:col-span-2">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-sm font-bold text-text-main m-0">AI Health Diagnostics History</h3>
                <p className="text-xs text-text-muted m-0">
                  Disease diagnosis runs executed on this date
                </p>
              </div>
              {diagnoses.length > 0 && !confirmClear && (
                <button
                    className="flex items-center gap-1.5 py-1.5 px-3 rounded-lg border border-critical bg-transparent text-critical text-xs font-semibold cursor-pointer whitespace-nowrap shrink-0 hover:bg-critical/10"
                  onClick={() => setConfirmClear(true)}
                  title="Clear all diagnostics for this date"
                >
                  <Trash2 size={14} />
                  Clear history
                </button>
              )}
              {confirmClear && (
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-text-muted whitespace-nowrap">Delete all records for this date?</span>
                  <button
                    className="py-1 px-2.5 rounded border border-critical bg-critical text-white text-[11px] font-bold cursor-pointer whitespace-nowrap hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={handleClearHistory}
                    disabled={clearing}
                  >
                    {clearing ? 'Deleting…' : 'Yes, clear'}
                  </button>
                  <button
                    className="py-1 px-2.5 rounded border border-border-card bg-transparent text-text-muted text-[11px] font-semibold cursor-pointer whitespace-nowrap hover:bg-black/5 disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={() => setConfirmClear(false)}
                    disabled={clearing}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
            {diagnoses.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-6 text-text-muted text-[13px]">
                No health diagnostic records found for {selectedDate}.
              </div>
            ) : (
              <div className="flex flex-col gap-3 mt-2">
                {diagnoses.map((diag, index) => {
                  const isErr = !!diag.diagnosis.error;
                  const isHealthy = diag.diagnosis.healthy;
                  
                  return (
                    <div 
                      key={index} 
                      className="flex flex-col gap-2 p-3.5 rounded-xl bg-surface-card"
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
                      <div className="flex justify-between items-center flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-text-main">
                            {diag.species}
                          </span>
                          <span 
                            className="text-[11px] font-bold py-0.5 px-2 rounded-xl"
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
                        <span className="text-[11px] text-text-muted font-semibold">
                          {new Date(diag.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      
                      <div className="flex flex-row gap-3 items-start">
                        {diag.cropUrl && (
                          <img
                            src={resolveCropUrl(diag.cropUrl)}
                            alt={`Crop of ${diag.species} sent to LLM`}
                            className="w-40 max-h-[110px] rounded object-contain block shrink-0"
                            style={{ imageRendering: 'pixelated' }}
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        )}

                        {isErr ? (
                          <p className="m-0 text-xs text-text-muted flex-1">
                            <strong>Configuration Error:</strong> {diag.diagnosis.error}
                          </p>
                        ) : (
                          <div className="flex flex-col gap-1 flex-1 min-w-0">
                            <p className="m-0 text-xs text-text-main">
                              <strong>Observation:</strong> {diag.diagnosis.description}
                            </p>
                            {!isHealthy && diag.diagnosis.treatment && (
                              <p className="mt-1 text-xs text-text-muted p-2 bg-background-app rounded-md border-l-3 border-warning">
                                <strong>Recommended Treatment:</strong> {diag.diagnosis.treatment}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
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
