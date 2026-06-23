import React from 'react';
import { useHistoryDetail } from '../../hooks/pages/useHistoryDetail';
import { MiniClarityChart } from '../../components/analytics/MiniClarityChart';
import { GlassCard, GlassBadge } from '../../components/shared';

export const HistoryDetailScreen: React.FC = () => {
  const { readings, recentReadings, onBack } = useHistoryDetail();

  return (
    <div className="flex flex-col gap-6">
      <div className="
        flex min-h-[75px] items-center justify-between border-b
        border-border pb-3
        max-xs:flex-col max-xs:items-start max-xs:gap-3
      ">
        <div>
          <span className="
            block text-xs font-semibold text-text-muted uppercase
          ">History</span>
          <h1 className="mt-0.5 text-display font-extrabold text-text">Clarity Analytics</h1>
        </div>
        <button
          className="
            cursor-pointer border-none bg-transparent font-main text-sm
            font-semibold text-brand
          "
          onClick={onBack}
        >
          ← Back
        </button>
      </div>

      {/* Main Clarity Area Chart */}
      <GlassCard className="p-5">
        <h3 className="mb-4 flex items-center justify-between text-h3 font-bold">
          <span>Water Clarity Trend</span>
          <GlassBadge color="live">Live Sync</GlassBadge>
        </h3>

        <div className="w-full py-2.5">
          <MiniClarityChart readings={readings} height={180} />
        </div>

        <div className="
          mt-2 flex justify-between px-2.5 text-3xs font-semibold
          text-text-muted
        ">
          <span>OLDER</span>
          <span>RECENT SCANS</span>
          <span>TODAY</span>
        </div>
      </GlassCard>

      {/* Diagnostic Logs */}
      <h3 className="mb-3 text-h3 font-bold text-text">Database Reading Log Entries</h3>
      <div className="flex flex-col gap-2.5">
        {recentReadings.map(reading => {
          const date = new Date(reading.timestamp);
          const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const day = date.toLocaleDateString([], { month: 'short', day: 'numeric' });

          return (
            <GlassCard key={reading.id} className="
              flex items-center justify-between px-4 py-3
            ">
              <div>
                <strong className="text-sm text-text">Clarity: {reading.clarity}/10</strong>
                <span className="mt-0.5 block text-caption text-text-muted">
                  {day} · {time} · {reading.fish_count} fish visible
                </span>
              </div>
              <div className="flex gap-3 text-xs text-text-muted">
                <span>pH {reading.ph}</span>
                <span>{reading.temp}°C</span>
              </div>
            </GlassCard>
          );
        })}
      </div>
    </div>
  );
};
