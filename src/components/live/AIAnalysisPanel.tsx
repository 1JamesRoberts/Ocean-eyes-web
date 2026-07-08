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
  if (!lastPrediction) return null;

  const diagnosisSource = lastManualDiagnosis ?? lastPrediction;
  const diagnosisDetection = diagnosisSource.detections.find(d => d.diagnosis);
  const diagnosis = diagnosisDetection?.diagnosis;
  return (
    <GlassCard className="p-5">
      <CardSectionHeader
        icon={Brain}
        title="AI Analysis Results"
        action={(
          <span className="text-caption font-semibold text-text-muted">
          {new Date(lastPrediction.timestamp).toLocaleTimeString()}
          </span>
        )}
      />

      <div className="
        mb-4 grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-3
      ">
        <GlassPanel className="hover:bg-white/60">
          <span className="
            block text-2xs font-semibold text-text-muted uppercase
          ">
            Fish Detected
          </span>
          <strong className="mt-1 block text-title text-brand">
            {lastPrediction.summary.total_detections}
          </strong>
        </GlassPanel>

        {lastTurbidityResult && (
          <GlassPanel className="hover:bg-white/60">
            <span className="
              block text-2xs font-semibold text-text-muted uppercase
            ">
              FNU
            </span>
            <strong className="mt-1 block text-title text-brand">
              {lastTurbidityResult.turbidity.fnu.toFixed(2)}
            </strong>
          </GlassPanel>
        )}

      </div>

      {Object.entries(lastPrediction.summary.species_counts).length > 0 && (
        <div>
          <h4 className="
            mb-2.5 text-xs font-bold tracking-wider text-text-muted uppercase
          ">
            Species Breakdown
          </h4>
          <div className="flex flex-wrap gap-2">
            {Object.entries(lastPrediction.summary.species_counts).map(([speciesId, count]) => {
              const speciesInfo = getSpeciesById(speciesId);
              const color = speciesInfo?.color || '#3B82F6';
              const displayName = speciesInfo?.displayName || speciesId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
              return (
                <div key={speciesId} className="
                  glass-pill flex items-center gap-1.5 px-3 py-1.5 text-xs
                  font-semibold
                " style={{ borderColor: `${color}40` }}>
                  <div className="size-2 rounded-full" style={{ backgroundColor: color }} />
                  <span className="text-text">{displayName}</span>
                  <span className="text-text-muted">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Disease Diagnosis Section */}
      {diagnosis && (
        <GlassPanel
          className={`
            mt-4
            ${diagnosis.error ? 'border-l-4 border-l-critical' : diagnosis.healthy ? `
              border-l-4 border-l-good
            ` : `border-l-4 border-l-warning`}
          `}
        >
          <h4 className={`
            m-0 mb-2 flex items-center gap-1.5 text-xs font-bold tracking-wider
            uppercase
            ${diagnosis.error ? `text-critical` : diagnosis.healthy ? `
              text-good
            ` : `text-warning`}
          `}>
            🩺 Fish Health Diagnosis
          </h4>
          {diagnosis.error ? (
            <p className="m-0 text-xs leading-[1.4] font-medium text-text">
              <strong>Error:</strong> {diagnosis.error}
            </p>
          ) : (
            <>
              <div className="mb-2 text-sm">
                <span className="font-bold text-text">Status: </span>
                <span className={`
                  font-extrabold
                  ${diagnosis.healthy ? `text-good` : `text-warning`}
                `}>
                  {diagnosis.healthy ? 'HEALTHY' : `DISEASE DETECTED (${diagnosis.disease})`}
                </span>
                <span className="ml-2 text-caption text-text-muted">
                  (Confidence: {Math.round(diagnosis.confidence * 100)}%)
                </span>
              </div>

              {diagnosisDetection && (
                <div className="mb-2 text-caption text-text-muted italic">
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

              <p className="m-0 mb-2 text-xs leading-[1.4] text-text">
                <strong>Observation:</strong> {diagnosis.description}
              </p>

              {!diagnosis.healthy && diagnosis.treatment && (
                <p className="
                  m-0 rounded-md border-l-3 border-warning bg-white/20 p-2
                  text-xs leading-[1.4] text-text-muted
                ">
                  <strong>Recommended Treatment:</strong> {diagnosis.treatment}
                </p>
              )}
            </>
          )}
        </GlassPanel>
      )}
    </GlassCard>
  );
};
