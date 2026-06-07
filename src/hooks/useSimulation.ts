import { useState, useEffect, useCallback } from 'react';
import { MockFirestore } from '../services/mock_service';
import { checkClarityAlert, checkFishDiscrepancyAlert } from '../services/alertEngine';
import { generateSimulatedReading } from '../services/readingSimulator';
import { useTank } from './useTank';
import { useFish } from './useFish';

export const useSimulation = () => {
  const { tankId, activeTank } = useTank();
  const { fishList } = useFish(tankId);
  const [simulationActive, setSimulationActive] = useState<boolean>(true);

  const triggerManualReading = useCallback(() => {
    if (!tankId) return;

    const totalExpectedFish = fishList.reduce((sum, f) => sum + f.count, 0);
    const totalDetected = fishList.reduce((sum, f) => sum + f.detected, 0);

    const reading = generateSimulatedReading({ tankId, totalDetected });

    MockFirestore.writeReading({
      tankId,
      clarity: reading.clarity,
      fishCount: reading.fish_count,
      ph: reading.ph,
      temp: reading.temp,
      ammonia: reading.ammonia,
      nitrite: reading.nitrite
    });

    if (activeTank) {
      const activeAlerts = MockFirestore.getAlerts();
      const newAlerts = [...activeAlerts];
      
      const clarityAlert = checkClarityAlert({
        currentClarity: reading.clarity,
        totalExpectedFish,
        totalDetected,
        maxFnu: activeTank.thresholds.clarity_min,
        discrepancyPct: activeTank.thresholds.fish_change_pct
      });
      if (clarityAlert && !activeAlerts.find(a => !a.resolved && a.title.includes('clarity'))) {
        newAlerts.unshift(clarityAlert);
      }

      const fishAlert = checkFishDiscrepancyAlert({
        currentClarity: reading.clarity,
        totalExpectedFish,
        totalDetected,
        maxFnu: activeTank.thresholds.clarity_min,
        discrepancyPct: activeTank.thresholds.fish_change_pct
      });
      if (fishAlert && !activeAlerts.find(a => !a.resolved && a.title.includes('visible'))) {
        newAlerts.unshift(fishAlert);
      }

      if (newAlerts.length > activeAlerts.length) {
        MockFirestore.saveAlerts(newAlerts);
      }
    }
  }, [tankId, fishList, activeTank]);

  useEffect(() => {
    if (!simulationActive || !tankId) return;

    const interval = setInterval(() => {
      const currentStreamState = MockFirestore.getLiveState(tankId);
      if (currentStreamState.is_live) {
        const feed = currentStreamState.feeds[0];

        MockFirestore.saveLiveState(tankId, {
          is_live: true,
          stream_url: feed.stream_url,
          started_at: feed.started_at || new Date().toISOString(),
          last_ping_at: new Date().toISOString(),
          current_clarity: feed.current_clarity,
          current_fish_count: feed.current_fish_count,
          selected_feed_id: currentStreamState.selected_feed_id,
          feeds: [feed]
        });
      }

      if (Math.random() > 0.8) {
        triggerManualReading();
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [simulationActive, tankId, triggerManualReading]);

  return {
    simulationActive,
    setSimulationActive,
    triggerManualReading,
  };
};
