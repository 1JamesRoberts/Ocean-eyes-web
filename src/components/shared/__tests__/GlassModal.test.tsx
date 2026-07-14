// @vitest-environment jsdom
import React, { useState } from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { GlassModal } from '../GlassModal';

afterEach(cleanup);

const ModalHarness: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <div data-mobile-screen-scroll style={{ overflow: 'auto' }}>Scrollable content</div>
      <button type="button" onClick={() => setIsOpen(true)}>Add fish</button>
      <GlassModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        placement="bottom"
        labelledBy="sheet-title"
      >
        <h2 id="sheet-title">Add a new fish</h2>
        <button type="button">Save fish</button>
      </GlassModal>
    </>
  );
};

describe('GlassModal bottom placement', () => {
  it('closes on Escape and restores focus to its trigger', async () => {
    render(<ModalHarness />);
    const trigger = screen.getByRole('button', { name: 'Add fish' });

    trigger.focus();
    fireEvent.click(trigger);
    expect(screen.getByRole('dialog', { name: 'Add a new fish' })).toBeTruthy();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    await waitFor(() => expect(document.activeElement).toBe(trigger));
  });

  it('closes when its backdrop is pressed', () => {
    render(<ModalHarness />);
    fireEvent.click(screen.getByRole('button', { name: 'Add fish' }));

    fireEvent.click(screen.getByRole('dialog', { name: 'Add a new fish' }));

    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('moves focus into the dialog when it opens', () => {
    render(<ModalHarness />);
    fireEvent.click(screen.getByRole('button', { name: 'Add fish' }));

    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Save fish' }));
  });

  it('locks and restores the stationary screen scroller', () => {
    render(<ModalHarness />);
    const scrollContainer = document.querySelector<HTMLElement>('[data-mobile-screen-scroll]');

    fireEvent.click(screen.getByRole('button', { name: 'Add fish' }));
    expect(scrollContainer?.style.overflow).toBe('hidden');

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(scrollContainer?.style.overflow).toBe('auto');
  });

  it('renders below-hero sheets in the phone frame so the hero clip cannot crop them', () => {
    const phoneFrame = document.createElement('div');
    phoneFrame.className = 'phone-frame';
    document.body.append(phoneFrame);

    try {
      render(
        <GlassModal isOpen onClose={() => undefined} placement="below-hero" labelledBy="sheet-title">
          <h2 id="sheet-title">Add a new fish</h2>
        </GlassModal>,
      );

      const dialog = screen.getByRole('dialog', { name: 'Add a new fish' });
      expect(phoneFrame.contains(dialog)).toBe(true);
      expect(dialog.className).toContain('absolute');
      expect(dialog.lastElementChild?.className).toContain('max-w-none');
      expect(dialog.firstElementChild?.className).toContain('motion-safe:animate-sheet-backdrop');
      expect(dialog.lastElementChild?.className).toContain('motion-safe:animate-sheet-enter');
    } finally {
      phoneFrame.remove();
    }
  });
});
