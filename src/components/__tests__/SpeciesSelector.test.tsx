// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SpeciesSelector } from '../SpeciesSelector';
import { SPECIES_CLASSES } from '../../models/inference/modelConfig';

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
    fireEvent.click(screen.getByText('Neon Tetra').closest('button')!);

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

  it('shows only AI-supported species and does not offer custom species', () => {
    render(
      <SpeciesSelector
        selectedSpeciesId={null}
        onSelect={vi.fn()}
      />,
    );

    expect(screen.getAllByRole('option')).toHaveLength(SPECIES_CLASSES.length);
    expect(screen.getByRole('option', { name: /Black Skirt Tetra/i })).toBeTruthy();
    expect(screen.queryByRole('option', { name: /Adolfo's cory/i })).toBeNull();

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Moonlight minnow' } });

    expect(screen.queryByRole('option', { name: /Add custom species/i })).toBeNull();
    expect(screen.getByText('No species found')).toBeTruthy();
  });

  it('maps Black Skirt Tetra to the existing catalog record', () => {
    const onSelect = vi.fn();
    render(
      <SpeciesSelector
        selectedSpeciesId={null}
        onSelect={onSelect}
      />,
    );

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Black Skirt Tetra' } });
    fireEvent.click(screen.getByRole('option', { name: /Black Skirt Tetra/i }));

    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({
      id: 'black_skirt_tetra',
      catalogId: 'black_widow_tetra',
      displayName: 'Black Skirt Tetra',
    }));
  });
});
