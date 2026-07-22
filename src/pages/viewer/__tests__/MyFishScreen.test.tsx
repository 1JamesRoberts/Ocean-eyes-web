// @vitest-environment jsdom
import { useCallback, useState } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SpeciesInfo } from '../../../data/speciesCatalog';
import { MyFishScreen } from '../MyFishScreen';

const {
  inventoryTestState,
  mockPersistFish,
  mockIncrementCount,
  mockDecrementCount,
} = vi.hoisted(() => ({
  inventoryTestState: { enabled: false },
  mockPersistFish: vi.fn(),
  mockIncrementCount: vi.fn(),
  mockDecrementCount: vi.fn(),
}));

afterEach(cleanup);

vi.mock('../../../components/fish/DonutChart', () => ({
  DonutChart: () => <div data-testid="species-chart" />,
}));

vi.mock('../../../hooks/pages/useMyFish', () => ({
  useMyFish: () => {
    const [showAddForm, setShowAddForm] = useState(false);
    const [activeFishId, setActiveFishId] = useState<string | null>(null);
    const [fishToDelete, setFishToDelete] = useState<string | null>(null);

    const onToggleAddForm = useCallback(() => setShowAddForm((open) => !open), []);
    const onCloseAddForm = useCallback(() => setShowAddForm(false), []);
    const onSpeciesSelect = useCallback((_species: SpeciesInfo | null, _customName?: string) => {
      mockPersistFish();
      setShowAddForm(false);
    }, []);
    const fishList = inventoryTestState.enabled
      ? [{
          id: 'fish-1',
          speciesId: 'cardinal_tetra',
          name: 'Cardinal tetra',
          image: '/fish_crops/normalized/cardinal_tetra.png',
          count: 9,
          detected: 4,
        }]
      : [];

    return {
      fishList,
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
      activeFishId,
      aquariumOverviewExpanded: false,
      fishToDelete,
      getSpeciesDisplay: () => ({
        initials: 'CT',
        color: '#DC2626',
        name: 'Cardinal tetra',
        imagePath: '/fish_crops/normalized/cardinal_tetra.png',
      }),
      onToggleAddForm,
      onCloseAddForm,
      onSpeciesSelect,
      onToggleFish: (id: string) => setActiveFishId((current) => current === id ? null : id),
      onToggleAquariumOverview: vi.fn(),
      onIncrementCount: mockIncrementCount,
      onDecrementCount: mockDecrementCount,
      onRequestDelete: setFishToDelete,
      onCancelDelete: () => setFishToDelete(null),
      onConfirmDelete: vi.fn(),
    };
  },
}));

describe('MyFishScreen add flow', () => {
  beforeEach(() => {
    inventoryTestState.enabled = false;
    mockPersistFish.mockReset();
  });

  it('opens a headerless picker without a separate confirmation action', () => {
    render(<MyFishScreen />);

    fireEvent.click(screen.getByRole('button', { name: 'Add fish' }));

    const dialog = screen.getByRole('dialog', { name: 'Add fish' });
    expect(dialog).toBeTruthy();
    expect(dialog.className)
      .toContain('top-[calc(var(--mobile-hero-height)-1rem)]');
    expect(dialog.lastElementChild?.className)
      .toContain('motion-safe:animate-sheet-enter');
    const results = screen.getByRole('listbox', { name: 'Species results' });
    expect(results.parentElement?.className).toContain('flex-1');
    expect(results.className).toContain('pb-[calc(4.75rem+env(safe-area-inset-bottom))]');
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

describe('MyFishScreen inventory controls', () => {
  beforeEach(() => {
    inventoryTestState.enabled = true;
    mockIncrementCount.mockReset();
    mockDecrementCount.mockReset();
  });

  it('reveals inline controls while retaining the species details', () => {
    render(<MyFishScreen />);

    const fishDisclosure = screen.getByRole('button', { name: /Cardinal tetra/i });
    const fishCard = fishDisclosure.closest('[data-fish-card]');
    expect(fishCard).toBeTruthy();
    expect(fishCard?.classList.contains('h-24')).toBe(true);
    expect(fishDisclosure.getAttribute('aria-expanded')).toBe('false');
    expect(screen.getByText('44%')).toBeTruthy();
    expect(screen.getByText('Visible: 4 / 9')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Increase fish count' })).toBeNull();

    fireEvent.click(fishDisclosure);

    expect(fishDisclosure.getAttribute('aria-expanded')).toBe('true');
    expect(fishCard?.classList.contains('h-24')).toBe(false);
    expect(screen.queryByText('44%')).toBeNull();
    expect(screen.queryByText('Visible: 4 / 9')).toBeNull();
    expect(screen.getByRole('button', { name: 'Increase fish count' }).classList.contains('size-9')).toBe(true);
    expect(screen.getByRole('button', { name: 'Delete fish' }).classList.contains('size-9!')).toBe(true);
    expect(screen.getByText('Size')).toBeTruthy();
    expect(screen.queryByText('Inventory count')).toBeNull();
  });

  it('runs inventory actions without collapsing the fish card', () => {
    render(<MyFishScreen />);

    const fishDisclosure = screen.getByRole('button', { name: /Cardinal tetra/i });
    fireEvent.click(fishDisclosure);
    fireEvent.click(screen.getByRole('button', { name: 'Decrease fish count' }));
    fireEvent.click(screen.getByRole('button', { name: 'Increase fish count' }));

    expect(mockDecrementCount).toHaveBeenCalledWith('fish-1', 9);
    expect(mockIncrementCount).toHaveBeenCalledWith('fish-1', 9);
    expect(fishDisclosure.getAttribute('aria-expanded')).toBe('true');

    fireEvent.click(screen.getByRole('button', { name: 'Delete fish' }));
    expect(screen.getByRole('dialog', { name: 'Delete Fish Entry' })).toBeTruthy();
    expect(fishDisclosure.getAttribute('aria-expanded')).toBe('true');
  });

  it('toggles from non-control areas anywhere inside the card', () => {
    render(<MyFishScreen />);

    const fishDisclosure = screen.getByRole('button', { name: /Cardinal tetra/i });
    const fishCard = fishDisclosure.closest('[data-fish-card]');
    expect(fishCard).toBeTruthy();

    fireEvent.click(fishCard!);
    expect(fishDisclosure.getAttribute('aria-expanded')).toBe('true');

    fireEvent.click(screen.getByText('Size'));
    expect(fishDisclosure.getAttribute('aria-expanded')).toBe('false');
  });
});
