// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CalendarSheet } from '../CalendarSheet';
import { DateTimePill } from '../DateTimePill';
import { DateTimeRangePicker } from '../DateTimeRangePicker';
import { TimeWheelSheet } from '../TimeWheelSheet';
import { formatTimeForDisplay } from '../../../utils/formatters';

afterEach(cleanup);

function setEditorBottom(bottom: number) {
  const editor = document.getElementById('date-range-editor');
  Object.defineProperty(editor, 'getBoundingClientRect', {
    configurable: true,
    value: () => ({ bottom }),
  });
}

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

  it('does not trigger the clickable hero when expanding the range editor', () => {
    const onHeroClick = vi.fn();

    render(
      <div onClick={onHeroClick}>
        <DateTimeRangePicker
          value={{ startDate: '2026-07-14', startTime: '00:00', endDate: '2026-07-14', endTime: '23:55' }}
          onChange={() => undefined}
          collapseToIcon
          heroOverlay
        />
      </div>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Expand date range' }));

    expect(onHeroClick).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Collapse date range' })).toBeTruthy();
    expect(document.getElementById('date-range-editor')?.style.pointerEvents).toBe('auto');
  });

  it('uses the fish-search glass card treatment for the calendar popover', () => {
    render(
      <DateTimeRangePicker
        value={{ startDate: '2026-07-14', startTime: '00:00', endDate: '2026-07-14', endTime: '23:55' }}
        onChange={() => undefined}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Edit date range' }));
    setEditorBottom(144);
    fireEvent.click(screen.getAllByRole('button', { name: 'Jul 14, 2026' })[0]);

    const popover = document.querySelector<HTMLElement>('.glass-card-overlay');
    expect(popover).toBeTruthy();
    expect(popover?.style.top).toBe('156px');
    expect(popover?.style.left).toBe('50%');
    expect(popover?.style.transform).toBe('translateX(-50%)');
  });

  it('uses the fish-search glass card treatment for the time wheel popover', () => {
    render(
      <DateTimeRangePicker
        value={{ startDate: '2026-07-14', startTime: '00:00', endDate: '2026-07-14', endTime: '23:55' }}
        onChange={() => undefined}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Edit date range' }));
    setEditorBottom(144);
    fireEvent.click(
      screen.getAllByRole('button', { name: formatTimeForDisplay('00:00') })[0],
    );

    // The time-wheel popover retains the glass-card-overlay treatment.
    const overlays = document.querySelectorAll('.glass-card-overlay');
    expect(overlays.length).toBeGreaterThanOrEqual(1);
    expect(overlays[0].getAttribute('style')).toContain('top: 156px');
    // Time wheel is rendered (Done button is unique to TimeWheelSheet).
    expect(screen.getByRole('button', { name: 'Done' })).toBeTruthy();
  });

  it('uses the hero overlay treatment for the expanded Starts/Ends editor', () => {
    render(
      <DateTimeRangePicker
        value={{ startDate: '2026-07-14', startTime: '00:00', endDate: '2026-07-14', endTime: '23:55' }}
        onChange={() => undefined}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Edit date range' }));

    const editor = document.getElementById('date-range-editor');
    expect(editor).toBeTruthy();
    expect(editor?.classList.contains('hero-overlay-pill')).toBe(true);
  });

  it('uses a teal outline for the time-wheel selection window', () => {
    const { container } = render(
      <TimeWheelSheet selectedTime="13:10" onSelect={() => undefined} />,
    );
    const picker = within(container);

    expect(container.querySelector('.fish-count-teal-outline')).toBeTruthy();
    expect(picker.getByRole('button', { name: '01' }).classList.contains('text-prussian-blue')).toBe(true);
    expect(picker.getByRole('button', { name: 'PM' }).classList.contains('text-prussian-blue')).toBe(true);
    expect(container.querySelectorAll('button.text-prussian-blue')).toHaveLength(3);
  });
});
