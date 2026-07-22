// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { CollapsibleContent } from '../CollapsibleContent';

afterEach(cleanup);

describe('CollapsibleContent', () => {
  it('keeps children mounted while applying the collapsed transition state', () => {
    render(
      <CollapsibleContent expanded={false} className="pt-4">
        <button type="button">Disclosure action</button>
      </CollapsibleContent>,
    );

    const action = screen.getByRole('button', { name: 'Disclosure action', hidden: true });
    const content = action.parentElement;
    const collapseRegion = content?.parentElement?.parentElement;

    expect(content?.className).toContain('pt-4');
    expect(content?.className).toContain('-translate-y-3');
    expect(content?.className).toContain('opacity-0');
    expect(collapseRegion?.className).toContain('grid-rows-[0fr]');
    expect(collapseRegion?.hasAttribute('inert')).toBe(true);
    expect(collapseRegion?.getAttribute('aria-hidden')).toBe('true');
  });

  it('applies the expanded transition state', () => {
    render(
      <CollapsibleContent expanded>
        <span>Expanded details</span>
      </CollapsibleContent>,
    );

    const content = screen.getByText('Expanded details').parentElement;

    expect(content?.className).toContain('translate-y-0');
    expect(content?.className).toContain('opacity-100');
    expect(content?.parentElement?.parentElement?.className).toContain('grid-rows-[1fr]');
    expect(content?.parentElement?.parentElement?.hasAttribute('inert')).toBe(false);
  });
});
