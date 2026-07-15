// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MonitorButton } from '../MonitorPrimitives';

describe('MonitorButton', () => {
  it('uses the shared teal primary gradient without a hover color override', () => {
    render(<MonitorButton variant="primary">Start monitoring</MonitorButton>);

    const button = screen.getByRole('button', { name: 'Start monitoring' });

    expect(button.classList.contains('bg-primary-gradient')).toBe(true);
    expect(button.classList.contains('shadow-primary-glow')).toBe(true);
    expect(button.classList.contains('hover:bg-primary-hover-gradient')).toBe(false);
    expect(button.classList.contains('focus-visible:outline-monitor-accent')).toBe(true);
    expect(button.classList.contains('active:scale-[0.98]')).toBe(true);
  });
});
