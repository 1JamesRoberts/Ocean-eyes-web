// @vitest-environment jsdom
import { useState } from 'react';
import { Bell } from 'lucide-react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { GlassDisclosurePanel } from '../GlassDisclosurePanel';

afterEach(cleanup);

const DisclosureHarness = () => {
  const [expanded, setExpanded] = useState(false);

  return (
    <GlassDisclosurePanel
      icon={Bell}
      title="Alert sensitivity"
      expanded={expanded}
      onToggle={() => setExpanded((current) => !current)}
    >
      <button type="button">Adjust threshold</button>
    </GlassDisclosurePanel>
  );
};

describe('GlassDisclosurePanel', () => {
  it('preserves its accessible toggle contract through expansion', () => {
    render(<DisclosureHarness />);

    const toggle = screen.getByRole('button', { name: 'Alert sensitivity' });
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByRole('button', { name: 'Adjust threshold' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Adjust threshold', hidden: true })).toBeTruthy();

    fireEvent.click(toggle);

    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByRole('button', { name: 'Adjust threshold' })).toBeTruthy();
  });
});
