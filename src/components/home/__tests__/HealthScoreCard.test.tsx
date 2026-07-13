// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { HealthScoreCard } from '../HealthScoreCard';

const healthyReading = {
  ph: 7.2,
  clarity: 1.5,
  ammonia: 0,
  nitrite: 0,
};

afterEach(cleanup);

describe('HealthScoreCard', () => {
  it('converts the calculated score to the 0–100 display and live metric values', () => {
    render(<HealthScoreCard reading={healthyReading} temperature={26.3} />);

    expect(screen.getByText('92')).toBeTruthy();
    expect(screen.getByLabelText('Health score 92 out of 100')).toBeTruthy();
    expect(screen.getByText('26.3°C')).toBeTruthy();
    expect(screen.getByText('7.2 pH')).toBeTruthy();
  });

  it.each([
    [{ ph: 7.2, clarity: 0.5 }, 'Excellent', 'Your tank is thriving!'],
    [{ ph: 8.2, clarity: 0.5 }, 'Attention', 'A few conditions need watching.'],
    [{ ph: 4, clarity: 100, ammonia: 10, nitrite: 10 }, 'Critical', 'Your tank needs attention.'],
  ])('uses the correct presentation for each health band', (reading, label, message) => {
    render(<HealthScoreCard reading={reading} />);

    expect(screen.getByText(label)).toBeTruthy();
    expect(screen.getByText(message)).toBeTruthy();
  });

  it('uses placeholders for missing metrics and does not render dKH', () => {
    render(<HealthScoreCard reading={{ clarity: 0.5 }} />);

    expect(screen.getByText('—°C')).toBeTruthy();
    expect(screen.getByText('— pH')).toBeTruthy();
    expect(screen.queryByText(/dKH/i)).toBeNull();
  });

  it('keeps the chevron decorative and the card non-interactive', () => {
    render(<HealthScoreCard reading={healthyReading} />);

    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByTestId('health-card-chevron').getAttribute('aria-hidden')).toBe('true');
  });
});
