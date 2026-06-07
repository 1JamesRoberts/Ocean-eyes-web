/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from 'react';
import { MockFirestore, subscribeToDb } from '../services/mock_service';
import type { TankBrief } from '../types/aquarium';

export const useTank = () => {
  const [tankId, setTankId] = useState<string | null>(() => {
    const list = MockFirestore.getLinkedTanks();
    return list.length > 0 ? list[0] : null;
  });

  const [linkedTanks, setLinkedTanks] = useState<string[]>(() => MockFirestore.getLinkedTanks());
  const [tanks, setTanks] = useState<TankBrief[]>(() => MockFirestore.getTanks());

  const activeTank = tanks.find(t => t.id === tankId);

  const syncTanks = () => {
    setTanks(MockFirestore.getTanks());
    setLinkedTanks(MockFirestore.getLinkedTanks());
  };

  useEffect(() => {
    syncTanks();
    return subscribeToDb(syncTanks);
  }, [tankId]);

  const selectTank = (id: string) => {
    setTankId(id);
  };

  const linkTank = async (targetId: string): Promise<boolean> => {
    const success = await MockFirestore.joinTank(targetId);
    if (success) {
      setTankId(targetId);
    }
    return success;
  };

  const unlinkTank = () => {
    if (tankId) {
      MockFirestore.unlinkTank(tankId);
      const remaining = MockFirestore.getLinkedTanks();
      setTankId(remaining.length > 0 ? remaining[0] : null);
    }
  };

  const createAndLinkTank = async (name: string): Promise<string> => {
    const newId = await MockFirestore.createTank(name);
    await MockFirestore.joinTank(newId);
    setTankId(newId);
    return newId;
  };

  const updateTankName = (name: string) => {
    if (tankId) {
      MockFirestore.updateTankName(tankId, name);
    }
  };

  const updateThresholds = (clarityMin: number, fishPct: number) => {
    if (tankId) {
      MockFirestore.updateThresholds(tankId, clarityMin, fishPct);
    }
  };

  return {
    tankId,
    linkedTanks,
    tanks,
    activeTank,
    selectTank,
    linkTank,
    unlinkTank,
    createAndLinkTank,
    updateTankName,
    updateThresholds,
  };
};
