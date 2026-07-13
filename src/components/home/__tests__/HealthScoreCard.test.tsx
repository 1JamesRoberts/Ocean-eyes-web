// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { HealthScoreCard } from '../HealthScoreCard';

const healthyReading = {
  ph: 7.2,
  clarity: 1.5,
  temp: 26.3,
  ammonia: 0,
  nitrite: 0,
};

afterEach(cleanup);

describe('HealthScoreCard', () => {
  it('displays the calculated health score', () => {
    render(<HealthScoreCard reading={healthyReading} />);

    expect(screen.getByText('92')).toBeTruthy();
    expect(screen.getByText('/100')).toBeTruthy();
  });

  it('displays the current water parameters', () => {
    render(<HealthScoreCard reading={healthyReading} />);

    expect(screen.getByText('1.50 FNU')).toBeTruthy();
    expect(screen.getByText('7.2 pH')).toBeTruthy();
    expect(screen.getByText('26.3°C')).toBeTruthy();
    expect(screen.getByText('Clarity:')).toBeTruthy();
    expect(screen.getByText('Temperature:')).toBeTruthy();
  });

  it('displays placeholders when optional sensor values are unavailable', () => {
    render(<HealthScoreCard reading={{ clarity: 1.5 }} />);

    expect(screen.getAllByText('—')).toHaveLength(2);
  });

  it.each([
    [{ ph: 7.2, clarity: 0.5 }, 'Excellent', 'Your tank is thriving.'],
    [{ ph: 8.2, clarity: 0.5 }, 'Attention', 'Some conditions need watching.'],
    [{ ph: 4, clarity: 100, ammonia: 10, nitrite: 10 }, 'Critical', 'Your tank needs attention.'],
  ])('uses the correct presentation for each health band', (reading, label, message) => {
    render(<HealthScoreCard reading={reading} />);

    expect(screen.getByText('Aquarium Health')).toBeTruthy();
    expect(screen.getByText(label)).toBeTruthy();
    expect(screen.getByText(message)).toBeTruthy();
  });
});
