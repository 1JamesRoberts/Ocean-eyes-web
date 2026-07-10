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
      <button type="button" onClick={() => setIsOpen(true)}>Add fish</button>
      <GlassModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        placement="bottom"
        labelledBy="sheet-title"
      >
        <h2 id="sheet-title">Add a new fish</h2>
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
});
