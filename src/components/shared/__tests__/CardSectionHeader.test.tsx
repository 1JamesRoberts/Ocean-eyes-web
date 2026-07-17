// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { Bell } from 'lucide-react';
import { afterEach, describe, expect, it } from 'vitest';
import { CardSectionHeader } from '../CardSectionHeader';

afterEach(cleanup);

const getHeaderContainer = (title: string) => {
  const heading = screen.getByRole('heading', { name: title });
  return heading.parentElement?.parentElement?.parentElement;
};

describe('CardSectionHeader', () => {
  it('renders a subtle divider by default', () => {
    render(<CardSectionHeader icon={Bell} title="Alerts" />);

    const header = getHeaderContainer('Alerts');
    expect(header?.classList.contains('border-b')).toBe(true);
    expect(header?.classList.contains('border-slate-grey/15')).toBe(true);
    expect(header?.classList.contains('pb-2')).toBe(true);
    expect(header?.classList.contains('mb-1')).toBe(true);
  });

  it('can omit the divider for standalone section headings', () => {
    render(<CardSectionHeader icon={Bell} title="Recent Readings" divider={false} />);

    expect(getHeaderContainer('Recent Readings')?.classList.contains('border-b')).toBe(false);
  });
});
