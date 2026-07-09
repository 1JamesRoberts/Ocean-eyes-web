import React from 'react';
import { Database, Waves } from 'lucide-react';
import { useHistoryDetail } from '../../hooks/pages/useHistoryDetail';
import { MiniClarityChart } from '../../components/analytics/MiniClarityChart';
import { CardSectionHeader, GlassBadge, GlassCard, GlassPanel } from '../../components/shared';

export const HistoryDetailScreen: React.FC = () => {
  const { readings, recentReadings, onBack } = useHistoryDetail();

  return (
    <div className="flex flex-col gap-6">
      <div className="
        flex min-h-[75px] items-center justify-between border-b border-border
        pb-3
        max-xs:flex-col max-xs:items-start max-xs:gap-3
      ">
        <div>
          <span className="block type-caption">History</span>
          <h1 className="mt-0.5 text-display font-extrabold text-text">Clarity Analytics</h1>
        </div>
        <button
          className="
            cursor-pointer border-none bg-transparent type-strong text-brand
          "
          onClick={onBack}
        >
          ← Back
        </button>
      </div>

      {/* Main Clarity Area Chart */}
      <GlassCard className="p-5">
        <CardSectionHeader
          icon={Waves}
          title="Water Clarity Trend"
          action={<GlassBadge color="live">Live Sync</GlassBadge>}
        />

        <div className="w-full py-2.5">
          <MiniClarityChart readings={readings} height={180} />
        </div>

        <div className="
          mt-2 flex justify-between px-2.5 type-caption
        ">
          <span>OLDER</span>
          <span>RECENT SCANS</span>
          <span>TODAY</span>
        </div>
      </GlassCard>

      {/* Diagnostic Logs */}
      <CardSectionHeader icon={Database} title="Database Reading Log Entries" className="mb-0" />
      <div className="flex flex-col gap-2.5">
        {recentReadings.map(reading => {
          const date = new Date(reading.timestamp);
          const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const day = date.toLocaleDateString([], { month: 'short', day: 'numeric' });

          return (
            <GlassPanel key={reading.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <strong className="type-strong">Clarity: {reading.clarity}/10</strong>
                <span className="mt-0.5 block type-caption">
                  {day} · {time} · {reading.fish_count} fish visible
                </span>
              </div>
              <div className="flex gap-3 type-caption">
                <span>pH {reading.ph}</span>
                <span>{reading.temp}°C</span>
              </div>
            </GlassPanel>
          );
        })}
      </div>
    </div>
  );
};
