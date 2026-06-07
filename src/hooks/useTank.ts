/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from 'react';
import { MockFirestore, subscribeToDb } from '../services/mock_service';
import type { TankBrief } from '../types/aquarium';

export const useTank = () => {
  const [tankId, setTankId] = useState<string | null>(() => {
    const lastTankId = localStorage.getItem('oceaneyes_last_tank_id');
    if (lastTankId) {
      const linked = MockFirestore.getLinkedTanks();
      if (linked.includes(lastTankId)) {
        return lastTankId;
      }
    }
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

  useEffect(() => {
    const handleTankSelect = (e: Event) => {
      const customEvent = e as CustomEvent<string | null>;
      setTankId(customEvent.detail);
    };
    window.addEventListener('oceaneyes_tank_select_changed', handleTankSelect);
    return () => window.removeEventListener('oceaneyes_tank_select_changed', handleTankSelect);
  }, []);

  const selectTank = (id: string | null) => {
    if (id) {
      localStorage.setItem('oceaneyes_last_tank_id', id);
    } else {
      localStorage.removeItem('oceaneyes_last_tank_id');
    }
    setTankId(id);
    window.dispatchEvent(new CustomEvent('oceaneyes_tank_select_changed', { detail: id }));
  };

  const linkTank = async (targetId: string): Promise<boolean> => {
    const success = await MockFirestore.joinTank(targetId);
    if (success) {
      selectTank(targetId);
    }
    return success;
  };

  const unlinkTank = () => {
    if (tankId) {
      MockFirestore.unlinkTank(tankId);
      const remaining = MockFirestore.getLinkedTanks();
      const nextId = remaining.length > 0 ? remaining[0] : null;
      selectTank(nextId);
    }
  };

  const createAndLinkTank = async (name: string, cameraSource?: { type: 'mock' | 'webcam'; deviceId?: string }): Promise<string> => {
    const newId = await MockFirestore.createTank(name, cameraSource);
    await MockFirestore.joinTank(newId);
    selectTank(newId);
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
