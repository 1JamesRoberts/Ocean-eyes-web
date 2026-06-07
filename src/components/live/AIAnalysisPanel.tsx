import React from 'react';
import { Brain } from 'lucide-react';
import { getSpeciesById } from '../../data/speciesCatalog';
import type { AIDetectionResult, AITurbidityResult } from '../../types/aquarium';

interface AIAnalysisPanelProps {
  lastPrediction: AIDetectionResult;
  lastTurbidityResult: AITurbidityResult | null;
}

export const AIAnalysisPanel: React.FC<AIAnalysisPanelProps> = ({
  lastPrediction,
  lastTurbidityResult
}) => {
  return (
    <div style={{
      marginBottom: '24px',
      padding: '20px',
      background: 'var(--color-surface)',
      borderRadius: '16px',
      border: '1px solid var(--color-border)'
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
    </div>
  );
};
