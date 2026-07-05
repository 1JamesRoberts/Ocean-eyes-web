// AnalyticsScreen.tsx - AI inference history analytics dashboard
import React from 'react';
import { Calendar, RotateCcw, Loader2, ArrowRight, Trash2 } from 'lucide-react';
import { useAnalytics } from '../../hooks/pages/useAnalytics';
import { DateTimeRangePicker } from '../../components/analytics/DateTimeRangePicker';
import { FishCountChart } from '../../components/analytics/FishCountChart';
import { MeanNNDChart } from '../../components/analytics/MeanNNDChart';
import { ClarityTrendChart } from '../../components/analytics/ClarityTrendChart';
import { SpatialDetectionHeatmap } from '../../components/analytics/SpatialDetectionHeatmap';
import { GlassCard, GlassButton, GlassIconButton } from '../../components/shared';
import { formatDateForDisplay } from '../../utils/formatters';

export const AnalyticsScreen: React.FC = () => {
  const {
    tankId,
    range,
    setRange,
    readings,
    detectionRecords,
    turbidityRecords,
    diagnoses,
    inventorySpeciesIds,
    selectedSpecies,
    setSelectedSpecies,
    hasAnyData,
    loading,
    error,
    refetch,
    confirmClear,
    isClearing,
    onStartClear,
    onCancelClear,
    onConfirmClear,
    onViewHistory,
    resolveCropUrl,
  } = useAnalytics();

  return (
    <div className="flex flex-col gap-6">
      {/* Mobile controls — desktop controls live in the top app bar */}
      <div className="
        flex items-center justify-end gap-3
        md:hidden
      ">
        <DateTimeRangePicker value={range} onChange={setRange} />
        <GlassIconButton size="sm" onClick={refetch} label="Refresh">
          <RotateCcw size={14} />
        </GlassIconButton>
      </div>

      {/* Error banner */}
      {error && (
        <GlassCard className="border-critical bg-critical/10 p-3">
          <div className="
            flex items-center justify-between gap-3 text-sm text-critical
          ">
            <span>{error}</span>
            <GlassButton variant="outline" size="sm" onClick={refetch}>Retry</GlassButton>
          </div>
        </GlassCard>
      )}

      {/* Loading state */}
      {loading && (
        <GlassCard className="p-6">
          <div className="
            flex h-[240px] items-center justify-center text-sm text-text-muted
          ">
            <Loader2 size={28} className="text-info" />
            <span className="ml-2 text-sm text-text-muted">
              Loading analytics data...
            </span>
          </div>
        </GlassCard>
      )}

      {/* Empty state */}
      {!loading && !error && !hasAnyData && (
        <GlassCard className="px-6 py-12 text-center">
          <div className="flex flex-col items-center justify-center gap-2">
            <Calendar size={32} className="text-text-muted opacity-50" />
            <span className="text-h3 font-semibold text-text">
              No data for {formatDateForDisplay(range.startDate)} – {formatDateForDisplay(range.endDate)}
            </span>
            <span className="text-sm text-text-muted">
              Try selecting a different range or run the AI pipeline to generate history.
            </span>
          </div>
        </GlassCard>
      )}

      {/* Charts grid */}
      {!loading && !error && hasAnyData && (
        <div className="
          grid grid-cols-1 gap-4
          lg:grid-cols-2
        ">
          {/* Heatmap + Fish Count row (2:1 like dashboard-grid) */}
          <div className="
            grid grid-cols-1 gap-4 min-h-[420px]
            lg:col-span-2 lg:grid-cols-[2fr_1fr]
          ">
            {/* Spatial Detection Heatmap */}
            <SpatialDetectionHeatmap
              records={detectionRecords}
              tankId={tankId}
              inventorySpeciesIds={inventorySpeciesIds}
              selectedSpecies={selectedSpecies}
              onSelectedSpeciesChange={setSelectedSpecies}
            />

            {/* Fish Count Timeline */}
            <GlassCard className="
              flex min-h-0 flex-col gap-3 overflow-hidden p-5
            ">
              <h3 className="m-0 shrink-0 text-sm font-bold text-text">Fish Count Over Time</h3>
              <div className="min-h-0 flex-1">
                <FishCountChart records={detectionRecords} selectedSpecies={selectedSpecies} />
              </div>
              <h3 className="m-0 shrink-0 text-sm font-bold text-text">Fish Spread Over Time</h3>
              <div className="min-h-0 flex-1">
                <MeanNNDChart records={detectionRecords} selectedSpecies={selectedSpecies} />
              </div>
            </GlassCard>
          </div>

          {/* Water Clarity Trend */}
          <GlassCard
            className="
              cursor-pointer p-5
              lg:col-span-2
            "
            onClick={onViewHistory}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter') onViewHistory(); }}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="m-0 text-sm font-bold text-text">Water Clarity Trend</h3>
                <p className="m-0 text-xs text-text-muted">
                  {(readings.length > 0 ? readings.length : turbidityRecords.length) || 'No'} clarity readings
                </p>
              </div>
              <ArrowRight size={16} className="text-text-muted" />
            </div>
            <ClarityTrendChart
              records={turbidityRecords}
              readings={readings}
              emptyAction={
                <GlassButton variant="outline" size="sm" onClick={() => onViewHistory()}>
                  View Clarity Analytics →
                </GlassButton>
              }
            />
          </GlassCard>

          {/* AI Health Diagnostics Log */}
          <GlassCard className="
            p-5
            lg:col-span-2
          ">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="m-0 text-sm font-bold text-text">AI Health Diagnostics History</h3>
                <p className="m-0 text-xs text-text-muted">
                  Disease diagnosis runs in this range
                </p>
              </div>
              {diagnoses.length > 0 && !confirmClear && (
                <GlassButton variant="outline" size="sm" className="
                  border-critical text-critical
                  hover:bg-critical/10
                " onClick={onStartClear}>
                  <Trash2 size={14} />
                  Clear history
                </GlassButton>
              )}
              {confirmClear && (
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-xs whitespace-nowrap text-text-muted">Delete all records for this date?</span>
                  <GlassButton variant="danger" size="sm" onClick={onConfirmClear} disabled={isClearing}>
                    {isClearing ? 'Deleting…' : 'Yes, clear'}
                  </GlassButton>
                  <GlassButton variant="outline" size="sm" onClick={onCancelClear} disabled={isClearing}>
                    Cancel
                  </GlassButton>
                </div>
              )}
            </div>
            {diagnoses.length === 0 ? (
              <div className="
                flex flex-col items-center justify-center p-6 text-sm
                text-text-muted
              ">
                No health diagnostic records found for {formatDateForDisplay(range.startDate)} – {formatDateForDisplay(range.endDate)}.
              </div>
            ) : (
              <div className="mt-2 flex flex-col gap-3">
                {diagnoses.map((diag, index) => {
                  const isErr = !!diag.diagnosis.error;
                  const isHealthy = diag.diagnosis.healthy;
                  
                  return (
                    <div
                      key={index}
                      className={`
                        flex flex-col gap-2 rounded-xl border bg-white/20
                        backdrop-blur-sm p-3.5
                        ${isErr ? `border-critical` : isHealthy ? `border-good` : `
                          border-warning
                        `}
                      `}
                    >
                      <div className="
                        flex flex-wrap items-center justify-between gap-2
                      ">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-text">
                            {diag.species}
                          </span>
                          <span
                            className={`
                              rounded-xl px-2 py-0.5 text-caption font-bold
                              ${isErr ? `bg-critical/12 text-critical` : isHealthy ? `
                                bg-good/12 text-good
                              ` : `bg-warning/12 text-warning`}
                            `}
                          >
                            {isErr ? 'Error' : isHealthy ? 'Healthy' : `Disease: ${diag.diagnosis.disease}`}
                          </span>
                          {!isErr && (
                            <span className="
                              text-caption font-semibold text-text-muted
                            ">
                              {Math.round(diag.diagnosis.confidence * 100)}% confidence
                            </span>
                          )}
                        </div>
                        <span className="
                          text-caption font-semibold text-text-muted
                        ">
                          {new Date(diag.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      
                      <div className="flex flex-row items-start gap-3">
                        {diag.cropUrl && (
                          <img
                            src={resolveCropUrl(diag.cropUrl)}
                            alt={`Crop of ${diag.species} sent to LLM`}
                            className="
                              block max-h-[110px] w-40 shrink-0 rounded-sm
                              object-contain
                            "
                            style={{ imageRendering: 'pixelated' }}
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        )}

                        {isErr ? (
                          <p className="m-0 flex-1 text-xs text-text-muted">
                            <strong>Configuration Error:</strong> {diag.diagnosis.error}
                          </p>
                        ) : (
                          <div className="flex min-w-0 flex-1 flex-col gap-1">
                            <p className="m-0 text-xs text-text">
                              <strong>Observation:</strong> {diag.diagnosis.description}
                            </p>
                            {!isHealthy && diag.diagnosis.treatment && (
                              <p className="
                                mt-1 rounded-md border-l-3 border-warning
                                bg-bg p-2 text-xs text-text-muted
                              ">
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
          </GlassCard>
        </div>
      )}
    </div>
  );
};
