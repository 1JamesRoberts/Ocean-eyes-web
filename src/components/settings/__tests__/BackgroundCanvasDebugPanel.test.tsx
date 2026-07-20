// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_AMBIENT_CANVAS_DEBUG_VALUES } from '../../../hooks/live/useAmbientCanvasDebug';
import { BackgroundCanvasDebugPanel } from '../BackgroundCanvasDebugPanel';
import { AquariumPanelCard } from '../SettingsSections';

afterEach(cleanup);

describe('BackgroundCanvasDebugPanel', () => {
  it('starts collapsed and exposes the five live debug sliders when expanded', () => {
    const onChange = vi.fn();
    const onReset = vi.fn();
    render(
      <BackgroundCanvasDebugPanel
        values={DEFAULT_AMBIENT_CANVAS_DEBUG_VALUES}
        onChange={onChange}
        onReset={onReset}
      />,
    );

    const toggle = screen.getByRole('button', { name: /Background Canvas Debug/ });
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(screen.getByText('Default background controls')).toBeTruthy();
    expect(toggle.querySelector('.text-warning')).toBeTruthy();

    fireEvent.click(toggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getAllByRole('slider')).toHaveLength(5);

    fireEvent.change(screen.getByRole('slider', { name: 'Blur radius' }), {
      target: { value: '31' },
    });
    expect(onChange).toHaveBeenCalledWith('blurRadius', 31);

    fireEvent.click(screen.getByRole('button', { name: 'Reset defaults' }));
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it('renders inside Tank Management after Stream Image Adjustments', () => {
    render(
      <AquariumPanelCard
        editing={false}
        name=""
        setName={vi.fn()}
        handleNameChange={vi.fn()}
        onStartRename={vi.fn()}
        showConfirmUnlink={false}
        onRequestUnlink={vi.fn()}
        onCancelUnlink={vi.fn()}
        onConfirmUnlink={vi.fn()}
        filters={{ contrast: 100, brightness: 100, saturation: 100, temperature: 0, tint: 0 }}
        onFilterChange={vi.fn()}
        canvasDebug={{
          values: DEFAULT_AMBIENT_CANVAS_DEBUG_VALUES,
          onChange: vi.fn(),
          onReset: vi.fn(),
        }}
      />,
    );

    const managementCard = screen.getByText('Tank Management').closest('.glass-card');
    const adjustments = screen.getByRole('button', { name: /Stream Image Adjustments/ });
    const debug = screen.getByRole('button', { name: /Background Canvas Debug/ });

    expect(managementCard?.contains(adjustments)).toBe(true);
    expect(managementCard?.contains(debug)).toBe(true);
    expect(adjustments.compareDocumentPosition(debug) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
