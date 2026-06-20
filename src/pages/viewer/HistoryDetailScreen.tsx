import React from 'react';
import { useHistoryDetailViewModel } from '../../viewModels/pages/useHistoryDetailViewModel';
import { MiniClarityChart } from '../../components/analytics/MiniClarityChart';

export const HistoryDetailScreen: React.FC = () => {
  const { readings, recentReadings, onBack } = useHistoryDetailViewModel();

  return (
    <div className="flex flex-col gap-6">
      <div className="
        flex min-h-[75px] items-center justify-between border-b
        border-border-card pb-3
        max-xs:flex-col max-xs:items-start max-xs:gap-3
      ">
        <div>
          <span className="
            block text-xs font-semibold text-text-muted uppercase
          ">History</span>
          <h1 className="mt-0.5 text-[28px] font-extrabold text-text-main">Clarity Analytics</h1>
        </div>
        <button
          className="
            cursor-pointer border-none bg-transparent font-main text-sm
            font-semibold text-primary-dark
          "
          onClick={onBack}
        >
          ← Back
        </button>
      </div>

      {/* Main Clarity Area Chart */}
      <div className="
        mb-5 rounded-[20px] border border-[rgba(13,148,136,0.02)]
        bg-surface-card p-5 shadow-card transition-smooth
      ">
        <h3 className="
          mb-4 flex items-center justify-between text-[15px] font-bold
        ">
          <span>Water Clarity Trend</span>
          <span className="
            rounded-[10px] bg-primary-light-gradient px-2 py-0.5 text-[11px]
            font-semibold text-primary-dark
          ">
            Live Sync
          </span>
        </h3>

        <div className="w-full py-2.5">
          <MiniClarityChart readings={readings} height={180} />
        </div>

        <div className="
          mt-2 flex justify-between px-2.5 text-[9px] font-semibold
          text-text-muted
        ">
          <span>OLDER</span>
          <span>RECENT SCANS</span>
          <span>TODAY</span>
        </div>
      </div>

      {/* Diagnostic Logs */}
      <h3 className="mb-3 text-[15px] font-bold text-text-main">Database Reading Log Entries</h3>
      <div className="flex flex-col gap-2.5">
        {recentReadings.map(reading => {
          const date = new Date(reading.timestamp);
          const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const day = date.toLocaleDateString([], { month: 'short', day: 'numeric' });

          return (
            <div key={reading.id} className="
              flex items-center justify-between rounded-[20px] border
              border-[rgba(13,148,136,0.02)] bg-surface-card px-4 py-3
              shadow-card transition-smooth
            ">
              <div>
                <strong className="text-sm text-text-main">Clarity: {reading.clarity}/10</strong>
                <span className="mt-0.5 block text-[11px] text-text-muted">
                  {day} · {time} · {reading.fish_count} fish visible
                </span>
              </div>
              <div className="flex gap-3 text-xs text-text-muted">
                <span>pH {reading.ph}</span>
                <span>{reading.temp}°C</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
