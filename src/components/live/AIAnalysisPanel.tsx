import React from 'react';
import { Brain } from 'lucide-react';
import { getSpeciesById } from '../../data/speciesCatalog';
import { resolveCropUrl } from '../../services/ai_service';
import type { AIDetectionResult, AITurbidityResult } from '../../types/aquarium';

interface AIAnalysisPanelProps {
  lastPrediction: AIDetectionResult | null;
  lastTurbidityResult: AITurbidityResult | null;
}

export const AIAnalysisPanel: React.FC<AIAnalysisPanelProps> = ({
  lastPrediction,
  lastTurbidityResult
}) => {
  if (!lastPrediction) return null;

  const diagnosisDetection = lastPrediction.detections.find(d => d.diagnosis);
  const diagnosis = diagnosisDetection?.diagnosis;
  return (
    <div style={{
      marginBottom: '24px',
      padding: '20px',
      background: 'var(--color-surface)',
      borderRadius: '16px',
      border: '1px solid var(--color-border)',
      animation: 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px'
      }}>
        <h3 style={{
          margin: 0,
          fontSize: '15px',
          fontWeight: 700,
          color: 'var(--color-text-primary)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <Brain size={18} color="var(--color-primary)" />
          AI Analysis Results
        </h3>
        <span style={{
          fontSize: '11px',
          color: 'var(--color-text-secondary)',
          fontWeight: 600
        }}>
          {new Date(lastPrediction.timestamp).toLocaleTimeString()}
        </span>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: '12px',
        marginBottom: '16px'
      }}>
        <div style={{
          background: 'var(--color-background)',
          padding: '12px',
          borderRadius: '12px',
          border: '1px solid var(--color-border)'
        }}>
          <span style={{
            fontSize: '10px',
            color: 'var(--color-text-secondary)',
            fontWeight: 600,
            textTransform: 'uppercase',
            display: 'block'
          }}>
            Fish Detected
          </span>
          <strong style={{
            fontSize: '22px',
            color: 'var(--color-primary)',
            display: 'block',
            marginTop: '4px'
          }}>
            {lastPrediction.summary.total_detections}
          </strong>
        </div>

        {lastTurbidityResult && (
          <div style={{
            background: 'var(--color-background)',
            padding: '12px',
            borderRadius: '12px',
            border: '1px solid var(--color-border)'
          }}>
            <span style={{
              fontSize: '10px',
              color: 'var(--color-text-secondary)',
              fontWeight: 600,
              textTransform: 'uppercase',
              display: 'block'
            }}>
              FNU
            </span>
            <strong style={{
              fontSize: '22px',
              color: 'var(--color-info)',
              display: 'block',
              marginTop: '4px'
            }}>
              {lastTurbidityResult.turbidity.fnu.toFixed(2)}
            </strong>
          </div>
        )}

        <div style={{
          background: 'var(--color-background)',
          padding: '12px',
          borderRadius: '12px',
          border: '1px solid var(--color-border)'
        }}>
          <span style={{
            fontSize: '10px',
            color: 'var(--color-text-secondary)',
            fontWeight: 600,
            textTransform: 'uppercase',
            display: 'block'
          }}>
            Species Found
          </span>
          <strong style={{
            fontSize: '22px',
            color: 'var(--color-good)',
            display: 'block',
            marginTop: '4px'
          }}>
            {Object.keys(lastPrediction.summary.species_counts).length}
          </strong>
        </div>
      </div>

      {Object.entries(lastPrediction.summary.species_counts).length > 0 && (
        <div>
          <h4 style={{
            fontSize: '12px',
            fontWeight: 700,
            color: 'var(--color-text-secondary)',
            textTransform: 'uppercase',
            marginBottom: '10px',
            letterSpacing: '0.05em'
          }}>
            Species Breakdown
          </h4>
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px'
          }}>
            {Object.entries(lastPrediction.summary.species_counts).map(([speciesId, count]) => {
              const speciesInfo = getSpeciesById(speciesId);
              const color = speciesInfo?.color || '#3B82F6';
              const displayName = speciesInfo?.displayName || speciesId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
              return (
                <div key={speciesId} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'var(--color-background)',
                  padding: '6px 12px',
                  borderRadius: '20px',
                  border: `1px solid ${color}40`,
                  fontSize: '12px',
                  fontWeight: 600
                }}>
                  <div style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: color
                  }} />
                  <span style={{ color: 'var(--color-text-primary)' }}>{displayName}</span>
                  <span style={{ color: 'var(--color-text-secondary)' }}>{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Disease Diagnosis Section */}
      {diagnosis && (
        <div style={{
          marginTop: '16px',
          padding: '14px',
          borderRadius: '12px',
          background: diagnosis.error 
            ? 'rgba(239, 68, 68, 0.08)' 
            : diagnosis.healthy 
              ? 'rgba(16, 185, 129, 0.08)' 
              : 'rgba(245, 158, 11, 0.08)',
          border: `1px solid ${
            diagnosis.error 
              ? 'var(--color-critical)' 
              : diagnosis.healthy 
                ? 'var(--color-good)' 
                : 'var(--color-warning)'
          }`,
        }}>
          <h4 style={{
            margin: '0 0 8px 0',
            fontSize: '12px',
            fontWeight: 700,
            color: diagnosis.error 
              ? 'var(--color-critical)' 
              : diagnosis.healthy 
                ? 'var(--color-good)' 
                : 'var(--color-warning)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            🩺 Fish Health Diagnosis
          </h4>
          {diagnosis.error ? (
            <p style={{
              margin: 0,
              fontSize: '12px',
              color: 'var(--color-text-primary)',
              lineHeight: '1.4',
              fontWeight: 500
            }}>
              <strong>Error:</strong> {diagnosis.error}
            </p>
          ) : (
            <>
              <div style={{ marginBottom: '8px', fontSize: '13px' }}>
                <span style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>Status: </span>
                <span style={{ 
                  fontWeight: 800, 
                  color: diagnosis.healthy ? 'var(--color-good)' : 'var(--color-warning)' 
                }}>
                  {diagnosis.healthy ? 'HEALTHY' : `DISEASE DETECTED (${diagnosis.disease})`}
                </span>
                <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginLeft: '8px' }}>
                  (Confidence: {Math.round(diagnosis.confidence * 100)}%)
                </span>
              </div>
              
              {diagnosisDetection && (
                <div style={{ 
                  fontSize: '11px', 
                  color: 'var(--color-text-secondary)', 
                  marginBottom: '8px',
                  fontStyle: 'italic'
                }}>
                  Diagnosed Subject: {diagnosisDetection.species_display}
                </div>
              )}

              {diagnosis.crop_url && (
                <img
                  src={resolveCropUrl(diagnosis.crop_url)}
                  alt="Fish crop sent to LLM"
                  style={{
                    maxWidth: '200px',
                    maxHeight: '140px',
                    borderRadius: '4px',
                    objectFit: 'contain',
                    marginBottom: '10px',
                    display: 'block'
                  }}
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = 'none';
                  }}
                />
              )}

              <p style={{
                margin: '0 0 8px 0',
                fontSize: '12px',
                color: 'var(--color-text-primary)',
                lineHeight: '1.4'
              }}>
                <strong>Observation:</strong> {diagnosis.description}
              </p>

              {!diagnosis.healthy && diagnosis.treatment && (
                <p style={{
                  margin: 0,
                  fontSize: '12px',
                  color: 'var(--color-text-secondary)',
                  lineHeight: '1.4',
                  padding: '8px',
                  background: 'var(--color-background)',
                  borderRadius: '6px',
                  borderLeft: '3px solid var(--color-warning)'
                }}>
                  <strong>Recommended Treatment:</strong> {diagnosis.treatment}
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};
