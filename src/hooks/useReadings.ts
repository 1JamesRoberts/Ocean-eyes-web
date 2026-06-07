/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from 'react';
import { MockFirestore, subscribeToDb } from '../services/mock_service';
import type { ReadingItem } from '../types/aquarium';

export const useReadings = () => {
  const [readings, setReadings] = useState<ReadingItem[]>(() => MockFirestore.getReadings());

  const syncReadings = () => {
    setReadings(MockFirestore.getReadings());
  };

  useEffect(() => {
    syncReadings();
    return subscribeToDb(syncReadings);
  }, []);

  return { readings, setReadings };
};
