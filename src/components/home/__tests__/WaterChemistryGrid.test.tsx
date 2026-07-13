// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { WaterChemistryGrid } from '../WaterChemistryGrid';

describe('WaterChemistryGrid', () => {
  it('renders clarity with the water chemistry parameters and opens history', () => {
    const onViewHistory = vi.fn();

    render(
      <WaterChemistryGrid
        reading={{
          id: 'reading-1',
          tank_id: 'tank-1',
          timestamp: '2026-07-13T00:00:00.000Z',
          clarity: 1.234,
          fish_count: 4,
          fish_count_confidence: 0.98,
          frame_url: '/frame.jpg',
          ph: 7.2,
          temp: 25,
          nitrite: 0.1,
        }}
        displayClarity={1.234}
        onViewHistory={onViewHistory}
      />,
    );

    expect(screen.getByText('1.23')).toBeTruthy();
    expect(screen.getByText('FNU')).toBeTruthy();
    expect(screen.getByText('7.2')).toBeTruthy();
    expect(screen.getByText('25')).toBeTruthy();
    expect(screen.getByText('0.1')).toBeTruthy();
    expect(screen.getByText('—')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'View Clarity history' }));
    expect(onViewHistory).toHaveBeenCalledOnce();
  });
});
