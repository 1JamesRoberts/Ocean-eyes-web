import React from 'react';
import { Brain } from 'lucide-react';
import { GlassCard } from '../shared';
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
    <GlassCard className="mb-6 p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="
          m-0 flex items-center gap-2 text-h3 font-bold text-text-main
        ">
          <Brain size={18} className="text-primary-dark" />
          AI Analysis Results
        </h3>
        <span className="text-caption font-semibold text-text-muted">
          {new Date(lastPrediction.timestamp).toLocaleTimeString()}
        </span>
      </div>

      <div className="
        mb-4 grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-3
      ">
        <GlassCard className="p-3" hover>
          <span className="
            block text-2xs font-semibold text-text-muted uppercase
          ">
            Fish Detected
          </span>
          <strong className="mt-1 block text-title text-primary-dark">
            {lastPrediction.summary.total_detections}
          </strong>
        </GlassCard>

        {lastTurbidityResult && (
          <GlassCard className="p-3" hover>
            <span className="
              block text-2xs font-semibold text-text-muted uppercase
            ">
              FNU
            </span>
            <strong className="mt-1 block text-title text-info">
              {lastTurbidityResult.turbidity.fnu.toFixed(2)}
            </strong>
          </GlassCard>
        )}

        <GlassCard className="p-3" hover>
          <span className="
            block text-2xs font-semibold text-text-muted uppercase
          ">
            Species Found
          </span>
          <strong className="mt-1 block text-title text-good">
            {Object.keys(lastPrediction.summary.species_counts).length}
          </strong>
        </GlassCard>
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
                  <span className="text-text-main">{displayName}</span>
                  <span className="text-text-muted">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Disease Diagnosis Section */}
      {diagnosis && (
        <GlassCard
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
            <p className="m-0 text-xs leading-[1.4] font-medium text-text-main">
              <strong>Error:</strong> {diagnosis.error}
            </p>
          ) : (
            <>
              <div className="mb-2 text-sm">
                <span className="font-bold text-text-main">Status: </span>
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

              <p className="m-0 mb-2 text-xs leading-[1.4] text-text-main">
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
        </GlassCard>
      )}
    </GlassCard>
  );
};
