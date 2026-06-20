import React, { useState } from 'react';
import { useTankViewModel } from '../../viewModels/useTankViewModel';
import { useReadingsViewModel } from '../../viewModels/useReadingsViewModel';
import { useFishViewModel } from '../../viewModels/useFishViewModel';
import { useAlertsViewModel } from '../../viewModels/useAlertsViewModel';
import { useLiveFeedViewModel } from '../../viewModels/useLiveFeedViewModel';

interface ScreenProps {
  onNavigate: (screen: 'welcome' | 'qr' | 'calibration' | 'active') => void;
}

export const ActiveMonitoringScreen: React.FC<ScreenProps> = ({ onNavigate }) => {
  const { activeTank: contextActiveTank, tanks, tankId } = useTankViewModel();
  const { readings, writeReading } = useReadingsViewModel();
  const { fishList } = useFishViewModel(tankId);
  const { alerts, addAlert } = useAlertsViewModel();
  const { liveState } = useLiveFeedViewModel(tankId);
  const activeTank = contextActiveTank || (tanks.length > 0 ? tanks[0] : null);
  const activeFeedCalibration = liveState?.feeds.find(f => f.id === liveState?.selected_feed_id)?.calibration;
  const [hasClarityIssue, setHasClarityIssue] = useState(false);

  const latestReading = readings[0] || {
    clarity: 1.2,
    fish_count: 0,
    ph: 7.2,
    temp: 26.1
  };

  // Modulate local metrics scan trigger with simulations
  const displayClarity = hasClarityIssue ? 8.5 : latestReading.clarity;
  const displayFish = latestReading.fish_count;
  const totalFish = fishList.reduce((sum, f) => sum + f.count, 0);

  // Background mock state write — accepts the sim state as a parameter
  // to avoid the race condition of reading stale state after setState.
  const triggerSimulationMetrics = (isIssueActive: boolean) => {
    if (!activeTank) return;

    writeReading({
      tankId: activeTank.id,
      clarity: isIssueActive ? 8.5 : latestReading.clarity,
      fishCount: displayFish,
      ph: 7.2,
      temp: 26.1,
      ammonia: isIssueActive ? 0.05 : 0.0,
      nitrite: isIssueActive ? 0.25 : 0.08
    });

    if (isIssueActive) {
      const existing = alerts.find((a) => !a.resolved && a.title.includes('clarity'));
      if (!existing) {
        addAlert({
          id: `alert-c-${Date.now()}`,
          title: 'Water clarity dropped',
          message: `Water turbidity rose to ${isIssueActive ? 8.5 : latestReading.clarity} FNU (Threshold: ${activeTank.thresholds.max_turbidity_fnu}). Check filter unit.`,
          tip: 'A sudden clarity drop indicates a clogged filter sponge or disturbed substrate. Wash the filter media or perform a 20% water change.',
          severity: 'warning',
          timeAgo: 'Just now',
          clarityBefore: '2.5',
          clarityAfter: (isIssueActive ? 8.5 : latestReading.clarity).toString(),
          fishBefore: totalFish.toString(),
          fishAfter: displayFish.toString(),
          resolved: false,
          timestamp: new Date().toISOString()
        });
      }
    }
  };

  const waterHeightPct = activeFeedCalibration ? Math.min(100, Math.max(0, ((240 - activeFeedCalibration.water_line_y) / 240) * 100)) : 50;

  return (
    <div className="flex h-full flex-col bg-[#090D11] p-4 text-white">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[11px] font-semibold text-[#94A3B8]">Active Stream Feed</span>
        {activeTank && (
          <span className="text-[11px] font-semibold text-primary-dark">
            {activeTank.name}
          </span>
        )}
      </div>

      {/* Live aquatic scanner simulation */}
      <div
        className="
          relative mb-4 flex-1 overflow-hidden rounded-lg border
          border-[#1E293B]
          bg-[radial-gradient(circle_at_center,#1E293B_0%,#0F172A_100%)]
        "
      >
        <div className="camera-scanline" />

        {/* Visual Water Body Representation of Tank */}
        <div
          className="
            pointer-events-none absolute bottom-0 left-0 z-1 w-full border-t-2
            border-dashed border-[rgba(255,255,255,0.4)]
          "
          style={{
            height: `${waterHeightPct}%`,
            background: 'linear-gradient(180deg, rgba(20, 184, 166, 0.3) 0%, rgba(13, 148, 136, 0.5) 100%)'
          }}
        >
          {/* Bubbles */}
          <div className="
            absolute bottom-[15%] left-[20%] animate-float-1 text-xs opacity-30
          ">🫧</div>
          <div className="
            absolute right-[15%] bottom-[45%] animate-float-2 text-[10px]
            opacity-20
          ">🫧</div>
          <div className="
            absolute bottom-[70%] left-1/2 animate-float-1 text-sm opacity-40
          ">🫧</div>
        </div>

        {/* Sand/Substrate Bed */}
        <div
          className="
            pointer-events-none absolute bottom-0 left-0 z-2 h-5 w-full border-t
            border-[#334155] bg-[linear-gradient(0deg,#0F172A_0%,#1E293B_100%)]
          "
        />

        {/* Glass Tank Frame Reflection */}
        <div
          className="
            pointer-events-none absolute top-0 left-0 z-15 size-full rounded-lg
            border-2 border-[rgba(56,189,248,0.25)]
            shadow-[inset_0_0_20px_rgba(56,189,248,0.15)]
          "
        />

        {/* Live scanner target graphics */}
        <div className="
          absolute top-5 left-5 z-12 font-mono text-[9px] leading-[130%]
          text-[#34D399] [text-shadow:0_0_4px_rgba(52,211,153,0.4)]
        ">
          <span>CAM FEED: OK</span><br />
          <span>RESOLUTION: 1080P</span><br />
          <span>FPS: 30.00</span>
        </div>

        {/* Bounding box graphics simulating AI detection */}
        <div
          className="
            absolute top-[30%] left-[25%] z-12 h-[60px] w-20 border-[1.5px]
            border-[#34D399] shadow-[0_0_6px_rgba(52,211,153,0.3)]
          "
        >
          <span className="
            absolute -top-3.5 left-0 bg-[#34D399] px-0.5 py-px text-[8px]
            font-bold text-white
          ">
            NEON TETRA 98%
          </span>
        </div>

        <div
          className="
            absolute right-[25%] bottom-[25%] z-12 h-[50px] w-[70px]
            border-[1.5px] border-[#34D399]
            shadow-[0_0_6px_rgba(52,211,153,0.3)]
          "
        >
          <span className="
            absolute -top-3.5 left-0 bg-[#34D399] px-0.5 py-px text-[8px]
            font-bold text-white
          ">
            GUPPY 94%
          </span>
        </div>

        {/* Dynamic Water Line Calibration Overlay */}
        {activeFeedCalibration && (
          <div
            className="
              pointer-events-none absolute left-0 z-10 h-0.5 w-full border-t-2
              border-dashed border-[rgba(255,255,255,0.3)]
            "
            style={{ top: `${Math.min(100, Math.max(0, (activeFeedCalibration.water_line_y / 240) * 100))}%` }}
          />
        )}
      </div>

      {/* Grid of monitored stats */}
      <div className="mb-4 grid grid-cols-2 gap-2.5">
        <div className="rounded-lg border border-[#1E293B] bg-[#0F172A] p-2.5">
          <span className="block text-[10px] text-[#64748B]">VISIBILITY COUNT</span>
          <strong className="text-base text-[#38BDF8]">{displayFish} fish detected</strong>
        </div>

        <div className="rounded-lg border border-[#1E293B] bg-[#0F172A] p-2.5">
          <span className="block text-[10px] text-[#64748B]">WATER CLARITY</span>
          <strong className="text-base text-[#38BDF8]">{displayClarity.toFixed(2)} FNU</strong>
        </div>
      </div>

      {/* Simulator triggers */}
      <div className="
        mb-4 rounded-[20px] border border-dashed border-[#1E293B] bg-transparent
        p-3
      ">
        <span className="
          mb-2 block text-[11px] font-semibold text-[#64748B] uppercase
        ">
          Aquarium Simulator Controls
        </span>
        <div className="grid grid-cols-2 gap-2">
          <button
            className="
              cursor-pointer rounded-lg border-none px-2.5 py-2 text-[11px]
              font-semibold text-white transition-colors
            "
            style={{ backgroundColor: hasClarityIssue ? 'var(--color-critical)' : '#1E293B' }}
            onClick={() => {
              setHasClarityIssue(prev => {
                const next = !prev;
                setTimeout(() => triggerSimulationMetrics(next), 0);
                return next;
              });
            }}
          >
            {hasClarityIssue ? 'Restore Clarity' : 'Trigger Clog Filter'}
          </button>

        </div>
      </div>

      <button
        className="
          inline-flex w-full cursor-pointer items-center justify-center gap-2
          rounded-xl border border-[#334155] bg-transparent px-5 py-2.5
          font-main text-[13px] font-semibold text-[#94A3B8] transition-smooth
          hover:bg-[rgba(255,255,255,0.05)]
        "
        onClick={() => onNavigate('welcome')}
      >
        Exit Active Monitoring
      </button>
    </div>
  );
};
