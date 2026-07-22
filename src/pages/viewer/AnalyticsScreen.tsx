// AnalyticsScreen.tsx - AI inference history analytics dashboard
import React from 'react';
import { Activity, Brain, Calendar, Fish, TriangleAlert, Waves } from 'lucide-react';
import type { useAnalytics } from '../../hooks/pages/useAnalytics';
import { FishCountChart } from '../../components/analytics/FishCountChart';
import { MeanNNDChart } from '../../components/analytics/MeanNNDChart';
import { ClarityTrendChart } from '../../components/analytics/ClarityTrendChart';
import { GlassButton, GlassCard, GlassPanel, HeadedCard, ScreenHeader, ScreenStateCard } from '../../components/shared';
import { formatDateForDisplay } from '../../utils/formatters';
import { createDetectionTimeAxis } from '../../utils/detectionTimeAxis';

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
        flex flex-col gap-2 p-3 pb-2
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
            className="block h-auto max-h-[110px] w-auto max-w-40 shrink-0 rounded-xl"
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
              <p className="mt-1 rounded-md border-l-3 border-warning bg-azure-mist p-2 type-caption">
                <strong>Recommended Treatment:</strong> {diagnosis.diagnosis.treatment}
              </p>
            )}
          </div>
        )}
      </div>
    </GlassPanel>
  );
};

const AnalyticsLoadingSkeleton: React.FC = () => (
  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2" aria-hidden="true">
    <GlassCard className="flex min-h-[468px] flex-col gap-5 overflow-hidden p-4 lg:col-span-2">
      <div className="h-5 w-44 animate-pulse rounded bg-divider/70" />
      <div className="h-[180px] animate-pulse rounded-lg bg-azure-mist/70" />
      <div className="h-5 w-48 animate-pulse rounded bg-divider/70" />
      <div className="h-[180px] animate-pulse rounded-lg bg-azure-mist/70" />
    </GlassCard>
    <GlassCard className="min-h-[320px] p-4 lg:col-span-2">
      <div className="h-5 w-40 animate-pulse rounded bg-divider/70" />
      <div className="mt-5 h-[240px] animate-pulse rounded-lg bg-azure-mist/70" />
    </GlassCard>
    <GlassCard className="min-h-[196px] p-4 lg:col-span-2">
      <div className="h-5 w-64 animate-pulse rounded bg-divider/70" />
      <div className="mt-5 h-20 animate-pulse rounded-lg bg-azure-mist/70" />
    </GlassCard>
  </div>
);

export const AnalyticsScreen: React.FC<AnalyticsScreenProps> = ({
  tankId: _tankId,
  range,
  readings,
  detectionRecords,
  turbidityRecords,
  diagnoses,
  inventorySpeciesIds: _inventorySpeciesIds,
  selectedSpecies,
  setSelectedSpecies: _setSelectedSpecies,
  hasAnyData,
  isInitialLoading,
  error,
  refetch,
  onViewHistory,
  resolveCropUrl,
  isFallback: _isFallback,
}) => {
  const detectionTimeAxis = React.useMemo(
    () => createDetectionTimeAxis(detectionRecords),
    [detectionRecords],
  );

  return (
    <div className="flex flex-col gap-4">
      <ScreenHeader eyebrow="Aquarium intelligence" />
      {/* Error banner */}
      {error && (
        <ScreenStateCard
          icon={TriangleAlert}
          title="Analytics could not be loaded"
          description={error}
          tone="danger"
          compact
          action={<GlassButton variant="outline" size="sm" onClick={refetch}>Retry</GlassButton>}
        />
      )}

      {/* Initial loading keeps the dashboard geometry stable. */}
      {isInitialLoading && !error && (
        <section aria-label="Loading analytics" aria-busy="true">
          <AnalyticsLoadingSkeleton />
        </section>
      )}

      {/* Empty state */}
      {!isInitialLoading && !error && !hasAnyData && (
        <ScreenStateCard
          icon={Calendar}
          title={`No data for ${formatDateForDisplay(range.startDate)} – ${formatDateForDisplay(range.endDate)}`}
          description="Choose another range or run the AI pipeline to generate history."
        />
      )}

      {/* Charts grid */}
      {!isInitialLoading && !error && hasAnyData && (
        <>
          <div className="
            grid grid-cols-1 gap-4
            lg:grid-cols-2
          ">
            {/* Fish Count Timeline */}
            <HeadedCard
              icon={Fish}
              title="Fish Count Over Time"
              headerClassName="mb-0"
              className="flex min-h-0 flex-col gap-3 overflow-hidden lg:col-span-2"
            >
              <div className="
                -mx-2 min-h-0 flex-1
                sm:mx-0
              ">
                <FishCountChart
                  records={detectionRecords}
                  selectedSpecies={selectedSpecies}
                  timeAxis={detectionTimeAxis}
                />
              </div>
            </HeadedCard>

            <HeadedCard
              icon={Activity}
              title="Fish Spread Over Time"
              headerClassName="mb-0"
              className="flex min-h-0 flex-col gap-3 overflow-hidden lg:col-span-2"
            >
              <div className="
                -mx-2 min-h-0 flex-1
                sm:mx-0
              ">
                <MeanNNDChart
                  records={detectionRecords}
                  selectedSpecies={selectedSpecies}
                  timeAxis={detectionTimeAxis}
                />
              </div>
            </HeadedCard>

            {/* Water Clarity Trend */}
          <HeadedCard
            icon={Waves}
            title="Water Clarity Trend"
            className="cursor-pointer lg:col-span-2"
            onClick={onViewHistory}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter') onViewHistory(); }}
          >
            <ClarityTrendChart
              records={turbidityRecords}
              readings={readings}
              emptyAction={
                <GlassButton variant="outline" size="sm" onClick={() => onViewHistory()}>
                  View Clarity Analytics →
                </GlassButton>
              }
            />
          </HeadedCard>

          {/* AI Health Diagnostics Log */}
          <HeadedCard
            icon={Brain}
            title="Fish Diagnostics"
            headerClassName="mb-0"
            className="lg:col-span-2"
          >
            {diagnoses.length === 0 ? (
              <div className="
                flex flex-col items-center justify-center p-5 type-body-muted
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
          </HeadedCard>
        </div>
      </>
    )}
    </div>
  );
};
