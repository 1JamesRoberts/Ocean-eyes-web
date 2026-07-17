import React from 'react';
import { Database, Waves } from 'lucide-react';
import { useHistoryDetail } from '../../hooks/pages/useHistoryDetail';
import { MiniClarityChart } from '../../components/analytics/MiniClarityChart';
import { BackButton, CardSectionHeader, GlassPanel, HeadedCard, ScreenHeader } from '../../components/shared';

export const HistoryDetailScreen: React.FC = () => {
  const { readings, recentReadings, onBack } = useHistoryDetail();

  return (
    <div className="flex flex-col gap-4">
      <ScreenHeader
        eyebrow="Clarity analytics"
        action={(
          <BackButton onClick={onBack} heroOverlay />
        )}
      />

      {/* Main Clarity Area Chart */}
      <HeadedCard icon={Waves} title="Water Clarity Trend">
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
      </HeadedCard>

      {/* Diagnostic Logs */}
      <CardSectionHeader
        icon={Database}
        title="Recent Readings"
        divider={false}
        className="mb-0"
      />
      <div className="flex flex-col gap-4">
        {recentReadings.map(reading => {
          const date = new Date(reading.timestamp);
          const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const day = date.toLocaleDateString([], { month: 'short', day: 'numeric' });

          return (
            <GlassPanel key={reading.id} className="flex items-center justify-between px-3.5 py-2.5">
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
