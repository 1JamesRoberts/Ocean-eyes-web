// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CameraControls } from '../CameraControls';

afterEach(cleanup);

const defaultProps = {
  isStreaming: true,
  isAIActive: false,
  aiLoading: false,
  backendStatus: 'online' as const,
  turbidityLoading: false,
  manualDiagnoseLoading: false,
  hasImageSource: true,
  isFullscreen: false,
  showFsInventory: false,
  onTakeSnapshot: vi.fn(),
  onMeasureTurbidity: vi.fn(),
  onToggleAI: vi.fn(),
  onManualDiagnose: vi.fn(),
  onToggleFullscreen: vi.fn(),
  onToggleFsInventory: vi.fn(),
};

const expectSharedOverlayStyle = (button: HTMLElement) => {
  expect(button.classList.contains('hero-overlay-pill')).toBe(true);
  expect(button.classList.contains('size-8')).toBe(true);
  expect(button.classList.contains('focus-visible:outline-white')).toBe(true);
  expect(button.getAttribute('type')).toBe('button');
};

describe('CameraControls', () => {
  it('uses the shared hero-overlay treatment for every standard control', () => {
    render(<CameraControls {...defaultProps} />);

    [
      'Capture Snapshot',
      'Measure Water Clarity',
      'Start AI Analysis',
      'Run LLM Fish Health Diagnosis',
      'Enter Fullscreen',
    ].forEach((label) => expectSharedOverlayStyle(screen.getByRole('button', { name: label })));
  });

  it('includes the same shared treatment for the fullscreen inventory control', () => {
    render(<CameraControls {...defaultProps} isFullscreen showFsInventory />);

    expectSharedOverlayStyle(screen.getByRole('button', { name: 'Hide Fish Inventory' }));
    expectSharedOverlayStyle(screen.getByRole('button', { name: 'Exit Fullscreen' }));
  });

  it('keeps active and disabled states visually distinct', () => {
    render(
      <CameraControls
        {...defaultProps}
        isAIActive
        turbidityLoading
      />,
    );

    const aiButton = screen.getByRole('button', { name: 'Stop AI Analysis' });
    const turbidityButton = screen.getByRole('button', { name: 'Measure Water Clarity' });

    expect(aiButton.classList.contains('animate-pulse-ai')).toBe(true);
    expect(aiButton.classList.contains('text-white')).toBe(false);
    expect(aiButton.classList.contains('[&_svg]:!text-white')).toBe(true);
    expect(aiButton.classList.contains('[&_svg]:drop-shadow-[0_0_5px_white]')).toBe(true);
    expect(aiButton.classList.contains('[&_svg]:animate-pulse-ai-icon')).toBe(false);
    expect(turbidityButton.hasAttribute('disabled')).toBe(true);
    expect(turbidityButton.classList.contains('opacity-35')).toBe(true);
  });
});
