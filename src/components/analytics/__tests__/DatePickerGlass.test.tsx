// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { CalendarSheet } from '../CalendarSheet';
import { DateTimePill } from '../DateTimePill';
import { DateTimeRangePicker } from '../DateTimeRangePicker';
import { TimeWheelSheet } from '../TimeWheelSheet';

afterEach(cleanup);

describe('date picker glass styling', () => {
  it('marks the selected calendar day with the Fish Count teal gradient outline', () => {
    render(
      <CalendarSheet
        selectedDate={new Date('2026-07-14T00:00:00.000Z')}
        onSelect={() => undefined}
      />,
    );

    const selectedDay = screen.getByRole('button', { name: '14' });

    expect(selectedDay.classList.contains('overlay-glass-control')).toBe(true);
    expect(selectedDay.classList.contains('fish-count-teal-outline')).toBe(true);
    expect(selectedDay.classList.contains('text-white')).toBe(true);
  });

  it('uses the outlined glass state for an active date or time pill', () => {
    render(<DateTimePill label="Jul 14, 2026" isActive onClick={() => undefined} />);

    const pill = screen.getByRole('button', { name: 'Jul 14, 2026' });

    expect(pill.classList.contains('overlay-glass-control')).toBe(true);
    expect(pill.classList.contains('fish-count-teal-outline')).toBe(true);
    expect(pill.classList.contains('text-white')).toBe(true);
  });

  it('uses white inverse labels for the expanded Starts and Ends editor', () => {
    render(
      <DateTimeRangePicker
        value={{ startDate: '2026-07-14', startTime: '00:00', endDate: '2026-07-14', endTime: '23:55' }}
        onChange={() => undefined}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Edit date range' }));

    expect(screen.getByText('Starts').classList.contains('type-strong-inverse')).toBe(true);
    expect(screen.getByText('Ends').classList.contains('type-strong-inverse')).toBe(true);
  });

  it('uses the fish-search glass card treatment for the calendar popover', () => {
    render(
      <DateTimeRangePicker
        value={{ startDate: '2026-07-14', startTime: '00:00', endDate: '2026-07-14', endTime: '23:55' }}
        onChange={() => undefined}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Edit date range' }));
    fireEvent.click(screen.getAllByRole('button', { name: 'Jul 14, 2026' })[0]);

    expect(document.querySelector('.glass-card-overlay')).toBeTruthy();
  });

  it('uses a teal outline for the time-wheel selection window', () => {
    const { container } = render(
      <TimeWheelSheet selectedTime="13:10" onSelect={() => undefined} />,
    );
    const picker = within(container);

    expect(container.querySelector('.fish-count-teal-outline')).toBeTruthy();
    expect(picker.getByRole('button', { name: '01' }).classList.contains('text-text')).toBe(true);
    expect(picker.getByRole('button', { name: 'PM' }).classList.contains('text-text')).toBe(true);
    expect(container.querySelectorAll('button.text-text')).toHaveLength(3);
  });
});
