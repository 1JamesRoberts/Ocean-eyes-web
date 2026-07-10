// AnalyticsScreen.tsx - AI inference history analytics dashboard
import React from 'react';
import { Activity, Brain, Calendar, Fish, Loader2, RotateCcw, Trash2, Waves } from 'lucide-react';
import type { useAnalytics } from '../../hooks/pages/useAnalytics';
import { DateTimeRangePicker } from '../../components/analytics/DateTimeRangePicker';
import { FishCountChart } from '../../components/analytics/FishCountChart';
import { MeanNNDChart } from '../../components/analytics/MeanNNDChart';
import { ClarityTrendChart } from '../../components/analytics/ClarityTrendChart';
import { CardSectionHeader, GlassButton, GlassCard, GlassIconButton, GlassPanel, ScreenHeader } from '../../components/shared';
import { formatDateForDisplay } from '../../utils/formatters';

type AnalyticsScreenProps = ReturnType<typeof useAnalytics>;
type DiagnosisRecord = AnalyticsScreenProps['diagnoses'][number];

interface DiagnosisRecordCardProps {
  diagnosis: DiagnosisRecord;
  resolveCropUrl: (url?: string) => string | undefined;
}

const DiagnosisRecordCard: React.FC<DiagnosisRecordCardProps> = ({
  diagnosis,
  resolveCropUrl,
}) => {
  const isErr = !!diagnosis.diagnosis.error;
  const isHealthy = diagnosis.diagnosis.healthy;

  return (
    <GlassPanel
      className={`
        flex flex-col gap-2 p-3.5
        ${isErr ? 'border-critical' : isHealthy ? 'border-good' : 'border-warning'}
      `}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="type-strong">{diagnosis.species}</span>
          <span
            className={`
              rounded-xl px-2 py-0.5 type-caption
              ${isErr ? 'bg-critical/12 text-critical' : isHealthy ? 'bg-good/12 text-good' : 'bg-warning/12 text-warning'}
            `}
          >
            {isErr ? 'Error' : isHealthy ? 'Healthy' : `Disease: ${diagnosis.diagnosis.disease}`}
          </span>
          {!isErr && (
            <span className="type-caption">
              {Math.round(diagnosis.diagnosis.confidence * 100)}% confidence
            </span>
          )}
        </div>
        <span className="type-caption">
          {new Date(diagnosis.timestamp).toLocaleTimeString()}
        </span>
      </div>

      <div className="flex flex-row items-start gap-3">
        {diagnosis.cropUrl && (
          <img
            src={resolveCropUrl(diagnosis.cropUrl)}
            alt={`Crop of ${diagnosis.species} sent to LLM`}
            className="block max-h-[110px] w-40 shrink-0 rounded-sm object-contain"
            style={{ imageRendering: 'pixelated' }}
            onError={(event) => {
              event.currentTarget.style.display = 'none';
            }}
          />
        )}

        {isErr ? (
          <p className="m-0 flex-1 type-caption">
            <strong>Configuration Error:</strong> {diagnosis.diagnosis.error}
          </p>
        ) : (
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <p className="m-0 type-body">
              <strong>Observation:</strong> {diagnosis.diagnosis.description}
            </p>
            {!isHealthy && diagnosis.diagnosis.treatment && (
              <p className="mt-1 rounded-md border-l-3 border-warning bg-bg p-2 type-caption">
                <strong>Recommended Treatment:</strong> {diagnosis.diagnosis.treatment}
              </p>
            )}
          </div>
        )}
      </div>
    </GlassPanel>
  );
};

export const AnalyticsScreen: React.FC<AnalyticsScreenProps> = ({
  tankId: _tankId,
  range,
  setRange,
  readings,
  detectionRecords,
  turbidityRecords,
  diagnoses,
  inventorySpeciesIds: _inventorySpeciesIds,
  selectedSpecies,
  setSelectedSpecies: _setSelectedSpecies,
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
  isFallback,
}) => {
  return (
    <div className="flex flex-col gap-6">
      <ScreenHeader eyebrow="Aquarium intelligence" title="Analytics" className="-mb-1" />
      {/* Error banner */}
      {error && (
        <GlassCard className="border-critical bg-critical/10 p-3">
          <div className="
            flex items-center justify-between gap-3 type-body text-critical
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
            flex h-[240px] items-center justify-center type-body-muted
          ">
            <Loader2 size={28} className="text-info" />
            <span className="ml-2 type-body-muted">
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
            <span className="type-strong">
              No data for {formatDateForDisplay(range.startDate)} – {formatDateForDisplay(range.endDate)}
            </span>
            <span className="type-body-muted">
              Try selecting a different range or run the AI pipeline to generate history.
            </span>
          </div>
        </GlassCard>
      )}

      {/* Charts grid */}
      {!loading && !error && hasAnyData && (
        <>
          {/* Mobile controls — desktop controls live in the top app bar */}
          <div className="
            flex items-center justify-start gap-3
            md:hidden
          ">
            <DateTimeRangePicker value={range} onChange={setRange} />
            <GlassIconButton size="sm" onClick={refetch} label="Refresh">
              <RotateCcw size={14} />
            </GlassIconButton>
          </div>

          <div className="
            grid grid-cols-1 gap-4
            lg:grid-cols-2
          ">
            {/* Fish Count Timeline */}
            <GlassCard className="
              flex min-h-0 flex-col gap-3 overflow-hidden p-5
              lg:col-span-2
            ">
              <CardSectionHeader icon={Fish} title="Fish Count Over Time" className="mb-0" />
              <div className="min-h-0 flex-1">
                <FishCountChart records={detectionRecords} selectedSpecies={selectedSpecies} />
              </div>
              <CardSectionHeader icon={Activity} title="Fish Spread Over Time" className="mb-0 mt-2" />
              <div className="min-h-0 flex-1">
                <MeanNNDChart records={detectionRecords} selectedSpecies={selectedSpecies} />
              </div>
            </GlassCard>

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
            <CardSectionHeader
              icon={Waves}
              title="Water Clarity Trend"
              detail={`${(readings.length > 0 ? readings.length : turbidityRecords.length) || 'No'} clarity readings`}
            />
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
            <div className="flex items-start justify-between gap-3">
              <CardSectionHeader
                icon={Brain}
                title="AI Health Diagnostics History"
                detail="Disease diagnosis runs in this range"
                className="mb-0"
              />
              {diagnoses.length > 0 && !confirmClear && !isFallback && (
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
                  <span className="type-caption whitespace-nowrap">Delete all records for this date?</span>
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
                flex flex-col items-center justify-center p-6 type-body-muted
              ">
                No health diagnostic records found for {formatDateForDisplay(range.startDate)} – {formatDateForDisplay(range.endDate)}.
              </div>
            ) : (
              <div className="mt-2 flex flex-col gap-3">
                {diagnoses.map((diagnosis, index) => (
                  <DiagnosisRecordCard
                    key={index}
                    diagnosis={diagnosis}
                    resolveCropUrl={resolveCropUrl}
                  />
                ))}
              </div>
            )}
          </GlassCard>
        </div>
      </>
    )}
    </div>
  );
};
