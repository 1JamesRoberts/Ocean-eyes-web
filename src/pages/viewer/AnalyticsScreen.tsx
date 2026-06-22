// AnalyticsScreen.tsx - AI inference history analytics dashboard
import React from 'react';
import { Calendar, RotateCcw, Loader2, ArrowRight, Trash2 } from 'lucide-react';
import { useAnalytics } from '../../hooks/pages/useAnalytics';
import { DateTimeRangePicker } from '../../components/analytics/DateTimeRangePicker';
import { FishCountChart } from '../../components/analytics/FishCountChart';
import { MeanNNDChart } from '../../components/analytics/MeanNNDChart';
import { ClarityTrendChart } from '../../components/analytics/ClarityTrendChart';
import { SpatialDetectionHeatmap } from '../../components/analytics/SpatialDetectionHeatmap';
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
      {/* Header */}
      <div className="
        flex min-h-[75px] items-center justify-between border-b
        border-border-card pb-3
        max-xs:flex-col max-xs:items-start max-xs:gap-3
      ">
        <div>
          <span className="
            block text-xs font-semibold text-text-muted uppercase
          ">
            AI Insights
          </span>
          <h1 className="mt-0.5 text-display font-extrabold text-text-main">Analytics</h1>
        </div>
        <div className="flex items-center gap-3">
          <DateTimeRangePicker value={range} onChange={setRange} />
          <button
            className="
              cursor-pointer rounded-lg border border-border-card bg-transparent
              px-3 py-1.5 text-xs font-semibold text-text-muted
              hover:bg-black/5
            "
            onClick={refetch}
            disabled={loading}
            title="Refresh data"
            aria-label="Refresh analytics"
          >
            <RotateCcw size={14} />
          </button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="
          flex items-center justify-between gap-3 rounded-xl border
          border-critical bg-critical/10 px-4 py-3 text-sm text-critical
        ">
          <span>{error}</span>
            <button className="
              cursor-pointer rounded-lg border border-critical bg-transparent
              px-3 py-1.5 text-xs font-semibold text-critical
              hover:bg-critical/12
            " onClick={refetch}>
            Retry
          </button>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="
          flex h-[240px] items-center justify-center text-sm text-text-muted
        ">
          <Loader2 size={28} className="animate-float-1 text-info" />
          <span className="ml-2 text-sm text-text-muted">
            Loading analytics data...
          </span>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && !hasAnyData && (
        <div className="
          flex flex-col items-center justify-center gap-2 rounded-[20px] border
          border-border-subtle bg-surface-card px-6 py-12 text-center
          shadow-card transition-smooth
        ">
          <Calendar size={32} className="text-text-muted opacity-50" />
          <span className="text-h3 font-semibold text-text-main">
            No data for {formatDateForDisplay(range.startDate)} – {formatDateForDisplay(range.endDate)}
          </span>
          <span className="text-sm text-text-muted">
            Try selecting a different range or run the AI pipeline to generate history.
          </span>
        </div>
      )}

      {/* Charts grid */}
      {!loading && !error && hasAnyData && (
        <div className="
          grid grid-cols-1 gap-4
          lg:grid-cols-2
        ">
          {/* Heatmap + Fish Count row (2:1 like dashboard-grid) */}
          <div className="
            grid grid-cols-1 items-start gap-4
            lg:col-span-2 lg:grid-cols-[2fr_1fr]
          ">
            {/* Spatial Detection Heatmap */}
            <div className="
              flex flex-col gap-3 rounded-[20px] border border-border-subtle
              bg-surface-card p-5 shadow-card transition-smooth
            ">
              <SpatialDetectionHeatmap
                records={detectionRecords}
                tankId={tankId}
                inventorySpeciesIds={inventorySpeciesIds}
                selectedSpecies={selectedSpecies}
                onSelectedSpeciesChange={setSelectedSpecies}
              />
            </div>

            {/* Fish Count Timeline */}
            <div className="
              flex flex-col gap-3 rounded-[20px] border border-border-subtle
              bg-surface-card p-5 shadow-card transition-smooth
            ">
            <h3 className="m-0 text-sm font-bold text-text-main">Fish Count Over Time</h3>
            <FishCountChart records={detectionRecords} selectedSpecies={selectedSpecies} />
            <div className="mt-2">
              <h3 className="m-0 text-sm font-bold text-text-main">Mean Nearest-Neighbor Distance</h3>
            </div>
            <MeanNNDChart records={detectionRecords} selectedSpecies={selectedSpecies} />
          </div>
          </div>

          {/* Water Clarity Trend */}
          <div
            className="
              flex cursor-pointer flex-col gap-3 rounded-[20px] border
              border-border-subtle bg-surface-card p-5 shadow-card
              transition-smooth
              lg:col-span-2
            "
            onClick={onViewHistory}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter') onViewHistory(); }}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="m-0 text-sm font-bold text-text-main">Water Clarity Trend</h3>
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
                <button
                  className="
                    cursor-pointer rounded-lg border border-primary-dark
                    bg-primary-light-gradient px-3.5 py-1.5 text-xs
                    font-semibold text-primary-dark
                    hover:bg-primary-dark hover:text-white
                  "
                  onClick={(e) => { e.stopPropagation(); onViewHistory(); }}
                >
                  View Clarity Analytics →
                </button>
              }
            />
          </div>

          {/* AI Health Diagnostics Log */}
          <div className="
            flex flex-col gap-3 rounded-[20px] border border-border-subtle
            bg-surface-card p-5 shadow-card transition-smooth
            lg:col-span-2
          ">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="m-0 text-sm font-bold text-text-main">AI Health Diagnostics History</h3>
                <p className="m-0 text-xs text-text-muted">
                  Disease diagnosis runs in this range
                </p>
              </div>
              {diagnoses.length > 0 && !confirmClear && (
                <button
                    className="
                      flex shrink-0 cursor-pointer items-center gap-1.5
                      rounded-lg border border-critical bg-transparent px-3
                      py-1.5 text-xs font-semibold whitespace-nowrap
                      text-critical
                      hover:bg-critical/10
                    "
                  onClick={onStartClear}
                  title="Clear all diagnostics for this date"
                >
                  <Trash2 size={14} />
                  Clear history
                </button>
              )}
              {confirmClear && (
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-xs whitespace-nowrap text-text-muted">Delete all records for this date?</span>
                  <button
                    className="
                      cursor-pointer rounded-sm border border-critical
                      bg-critical px-2.5 py-1 text-caption font-bold
                      whitespace-nowrap text-white
                      hover:opacity-90
                      disabled:cursor-not-allowed disabled:opacity-50
                    "
                    onClick={onConfirmClear}
                    disabled={isClearing}
                  >
                    {isClearing ? 'Deleting…' : 'Yes, clear'}
                  </button>
                  <button
                    className="
                      cursor-pointer rounded-sm border border-border-card
                      bg-transparent px-2.5 py-1 text-caption font-semibold
                      whitespace-nowrap text-text-muted
                      hover:bg-black/5
                      disabled:cursor-not-allowed disabled:opacity-50
                    "
                    onClick={onCancelClear}
                    disabled={isClearing}
                  >
                    Cancel
                  </button>
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
                        flex flex-col gap-2 rounded-xl border bg-surface-card
                        p-3.5
                        ${isErr ? `border-critical` : isHealthy ? `border-good` : `
                          border-warning
                        `}
                      `}
                    >
                      <div className="
                        flex flex-wrap items-center justify-between gap-2
                      ">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-text-main">
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
                            <p className="m-0 text-xs text-text-main">
                              <strong>Observation:</strong> {diag.diagnosis.description}
                            </p>
                            {!isHealthy && diag.diagnosis.treatment && (
                              <p className="
                                mt-1 rounded-md border-l-3 border-warning
                                bg-background-app p-2 text-xs text-text-muted
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
          </div>
        </div>
      )}
    </div>
  );
};
