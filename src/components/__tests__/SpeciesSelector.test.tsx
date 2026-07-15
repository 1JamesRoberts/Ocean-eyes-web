// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SpeciesSelector } from '../SpeciesSelector';

afterEach(cleanup);

describe('SpeciesSelector inline presentation', () => {
  it('selects a catalog species from inline search results', () => {
    const onSelect = vi.fn();
    render(
      <SpeciesSelector
        selectedSpeciesId={null}
        onSelect={onSelect}
      />,
    );

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Neon tetra' } });
    fireEvent.click(screen.getByText('Neon tetra').closest('button')!);

    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 'neon_tetra' }));
  });

  it('excludes species already in the inventory', () => {
    render(
      <SpeciesSelector
        selectedSpeciesId={null}
        onSelect={vi.fn()}
        excludeSpeciesIds={['goldfish']}
      />,
    );

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Goldfish' } });

    expect(screen.queryByRole('option', { name: /Goldfish/i })).toBeNull();
    expect(screen.getByText('No species found')).toBeTruthy();
  });

  it('offers and selects a custom species name', () => {
    const onSelect = vi.fn();
    render(
      <SpeciesSelector
        selectedSpeciesId={null}
        onSelect={onSelect}
      />,
    );

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Moonlight minnow' } });
    fireEvent.click(screen.getByRole('option', { name: /Add custom species/i }));

    expect(onSelect).toHaveBeenCalledWith(null, 'Moonlight minnow');
  });
});
