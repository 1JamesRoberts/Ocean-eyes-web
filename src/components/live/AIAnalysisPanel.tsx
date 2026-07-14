import React from 'react';
import { Brain } from 'lucide-react';
import { CardSectionHeader, GlassCard, GlassPanel } from '../shared';
import { getSpeciesById } from '../../data/speciesCatalog';
import { resolveCropUrl } from '../../models/api/aiApi';
import type { AIDetectionResult, AITurbidityResult } from '../../types/aquarium';

interface AIAnalysisPanelProps {
  lastPrediction: AIDetectionResult | null;
  lastTurbidityResult: AITurbidityResult | null;
  lastManualDiagnosis?: AIDetectionResult | null;
}

export const AIAnalysisPanel: React.FC<AIAnalysisPanelProps> = ({
  lastPrediction,
  lastTurbidityResult,
  lastManualDiagnosis
}) => {
  const diagnosisSource = lastManualDiagnosis ?? lastPrediction;
  const diagnosisDetection = diagnosisSource?.detections.find(d => d.diagnosis);
  const diagnosis = diagnosisDetection?.diagnosis;
  const speciesEntries = lastPrediction
    ? Object.entries(lastPrediction.summary.species_counts)
    : [];
  return (
    <GlassCard className="p-5">
      <CardSectionHeader
        icon={Brain}
        title="AI Analysis"
        detail="Latest computer vision and water quality readings"
        action={(
          <span className="type-caption">
            {lastPrediction
              ? new Date(lastPrediction.timestamp).toLocaleTimeString()
              : '—'}
          </span>
        )}
      />

      <div className="
        mb-4 grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-3
      ">
        <GlassPanel className="hover:bg-white/60">
          <span className="block type-caption">
            Fish Detected
          </span>
          <strong className="mt-1 block type-title text-text">
            {lastPrediction ? lastPrediction.summary.total_detections : '—'}
          </strong>
        </GlassPanel>

        <GlassPanel className="hover:bg-white/60">
          <span className="block type-caption">
            FNU
          </span>
          <strong className="mt-1 block type-title text-text">
            {lastTurbidityResult ? lastTurbidityResult.turbidity.fnu.toFixed(2) : '—'}
          </strong>
        </GlassPanel>

      </div>

      <GlassPanel className="
        mb-4
        hover:bg-white/60
      ">
        <h4 className="mb-2.5 type-caption">
          Species Breakdown
        </h4>
        {speciesEntries.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {speciesEntries.map(([speciesId, count]) => {
              const speciesInfo = getSpeciesById(speciesId);
              const color = speciesInfo?.color || '#3B82F6';
              const displayName = speciesInfo?.displayName || speciesId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
              return (
                <div key={speciesId} className="
                  flex items-center gap-1.5 px-3 py-1.5 type-caption
                ">
                  <div className="size-2 rounded-full" style={{ backgroundColor: color }} />
                  <span className="text-text">{displayName}</span>
                  <span className="text-text">{count}</span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="m-0 type-caption text-text-muted">
            Awaiting analysis…
          </p>
        )}
      </GlassPanel>

      {/* Disease Diagnosis Section */}
      <GlassPanel
        className={`
          ${diagnosis ? (diagnosis.error ? 'border-l-4 border-l-critical' : diagnosis.healthy ? `
            border-l-4 border-l-good
          ` : `border-l-4 border-l-warning`) : 'border-l-4 border-l-transparent'}
        `}
      >
        <h4 className={`
          m-0 mb-2 flex items-center gap-1.5 type-caption
          ${diagnosis ? (diagnosis.error ? `text-critical` : diagnosis.healthy ? `
            text-good
          ` : `text-warning`) : 'text-text-muted'}
        `}>
          Fish Health Diagnosis
        </h4>
        {diagnosis ? (
          diagnosis.error ? (
            <p className="m-0 type-body">
              <strong>Error:</strong> {diagnosis.error}
            </p>
          ) : (
            <>
              <div className="mb-2 type-body">
                <span>Status: </span>
                <span className={`
                  type-strong
                  ${diagnosis.healthy ? `text-good` : `text-warning`}
                `}>
                  {diagnosis.healthy ? 'HEALTHY' : `DISEASE DETECTED (${diagnosis.disease})`}
                </span>
                <span className="ml-2 type-caption">
                  (Confidence: {Math.round(diagnosis.confidence * 100)}%)
                </span>
              </div>

              {diagnosisDetection && (
                <div className="mb-2 type-caption italic">
                  Diagnosed Subject: {diagnosisDetection.species_display}
                </div>
              )}

              {diagnosis.crop_url && (
                <img
                  src={resolveCropUrl(diagnosis.crop_url)}
                  alt="Fish crop sent to LLM"
                  className="
                    mb-2.5 block max-h-[140px] max-w-[200px] rounded-sm
                    object-contain
                  "
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = 'none';
                  }}
                />
              )}

              <p className="m-0 mb-2 type-body">
                <strong>Observation:</strong> {diagnosis.description}
              </p>

              {!diagnosis.healthy && diagnosis.treatment && (
                <p className="
                  m-0 rounded-md border-l-3 border-warning bg-white/20 p-2
                  type-caption
                ">
                  <strong>Recommended Treatment:</strong> {diagnosis.treatment}
                </p>
              )}
            </>
          )
        ) : (
          <p className="m-0 type-caption text-text-muted">
            Awaiting diagnosis…
          </p>
        )}
      </GlassPanel>
    </GlassCard>
  );
};
