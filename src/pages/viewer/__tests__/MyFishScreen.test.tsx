// @vitest-environment jsdom
import { useCallback, useState } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SpeciesInfo } from '../../../data/speciesCatalog';
import { MyFishScreen } from '../MyFishScreen';

const { mockPersistFish } = vi.hoisted(() => ({ mockPersistFish: vi.fn() }));

afterEach(cleanup);

vi.mock('../../../components/fish/DonutChart', () => ({
  DonutChart: () => <div data-testid="species-chart" />,
}));

vi.mock('../../../hooks/pages/useMyFish', () => ({
  useMyFish: () => {
    const [showAddForm, setShowAddForm] = useState(false);

    const onToggleAddForm = useCallback(() => setShowAddForm((open) => !open), []);
    const onCloseAddForm = useCallback(() => setShowAddForm(false), []);
    const onSpeciesSelect = useCallback((_species: SpeciesInfo | null, _customName?: string) => {
      mockPersistFish();
      setShowAddForm(false);
    }, []);

    return {
      fishList: [],
      stats: {
        uniqueSpecies: 0,
        totalDetected: 0,
        totalExpected: 0,
        idealTankSizeL: null,
        tempResult: { range: null, conflict: false },
        phResult: { range: null, conflict: false },
        overallCompatibility: 100,
      },
      speciesDistribution: [],
      showAddForm,
      activeFishId: null,
      aquariumOverviewExpanded: false,
      fishToDelete: null,
      getSpeciesDisplay: vi.fn(),
      onToggleAddForm,
      onCloseAddForm,
      onSpeciesSelect,
      onToggleFish: vi.fn(),
      onToggleAquariumOverview: vi.fn(),
      onIncrementCount: vi.fn(),
      onDecrementCount: vi.fn(),
      onRequestDelete: vi.fn(),
      onCancelDelete: vi.fn(),
      onConfirmDelete: vi.fn(),
    };
  },
}));

describe('MyFishScreen add flow', () => {
  beforeEach(() => mockPersistFish.mockReset());

  it('opens a headerless picker without a separate confirmation action', () => {
    render(<MyFishScreen />);

    fireEvent.click(screen.getByRole('button', { name: 'Add fish' }));

    expect(screen.getByRole('dialog', { name: 'Add fish' })).toBeTruthy();
    expect(screen.getByRole('dialog', { name: 'Add fish' }).className)
      .toContain('top-[calc(var(--mobile-status-bar-height)+var(--mobile-hero-height))]');
    expect(screen.getByRole('dialog', { name: 'Add fish' }).lastElementChild?.className)
      .toContain('motion-safe:animate-sheet-enter');
    expect(screen.queryByText('Choose one species')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Add selected species' })).toBeNull();
  });

  it('opens from the empty state and submits a custom species', () => {
    render(<MyFishScreen />);

    fireEvent.click(screen.getByRole('button', { name: 'Add your first fish' }));
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Moonlight minnow' } });
    fireEvent.click(screen.getByRole('option', { name: /Add custom species/i }));

    expect(mockPersistFish).toHaveBeenCalledOnce();
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
