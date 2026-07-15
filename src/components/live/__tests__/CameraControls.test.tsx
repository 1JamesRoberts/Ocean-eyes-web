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
  cameraFacingMode: 'environment' as const,
  isCameraSwitching: false,
  canSwitchCamera: true,
  isFullscreen: false,
  showFsInventory: false,
  onTakeSnapshot: vi.fn(),
  onSwitchCamera: vi.fn(),
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
      'Switch to Front Camera',
      'Measure Water Clarity',
      'Start AI Analysis',
      'Disease diagnosis is disabled in the on-device prototype',
      'Enter Fullscreen',
    ].forEach((label) => expectSharedOverlayStyle(screen.getByRole('button', { name: label })));
  });

  it('describes and disables the camera switch while reacquiring a stream', () => {
    render(<CameraControls {...defaultProps} isCameraSwitching />);

    const switchButton = screen.getByRole('button', { name: 'Switching camera…' });
    expect(switchButton.hasAttribute('disabled')).toBe(true);
    expect(switchButton.querySelector('.animate-spin')).not.toBeNull();
  });

  it('offers the rear camera when the front camera is active', () => {
    render(<CameraControls {...defaultProps} cameraFacingMode="user" />);

    expect(screen.getByRole('button', { name: 'Switch to Rear Camera' })).toBeTruthy();
  });

  it('keeps cloud disease diagnosis disabled for the on-device prototype', () => {
    render(<CameraControls {...defaultProps} />);

    const diagnosisButton = screen.getByRole('button', {
      name: 'Disease diagnosis is disabled in the on-device prototype',
    });
    expect(diagnosisButton.hasAttribute('disabled')).toBe(true);
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
