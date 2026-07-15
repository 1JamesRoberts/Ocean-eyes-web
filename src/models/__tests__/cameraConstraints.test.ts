import { describe, expect, it } from 'vitest';
import {
  buildCameraVideoConstraints,
  oppositeCameraFacingMode,
} from '../services/cameraConstraints';

describe('camera constraints', () => {
  it('requests the rear camera for the default mobile camera source', () => {
    expect(buildCameraVideoConstraints('default', 'environment')).toEqual({
      facingMode: { ideal: 'environment' },
    });
  });

  it('preserves an explicitly selected camera device', () => {
    expect(buildCameraVideoConstraints('camera-2', 'user')).toEqual({
      deviceId: { exact: 'camera-2' },
    });
  });

  it('switches between rear and front facing modes', () => {
    expect(oppositeCameraFacingMode('environment')).toBe('user');
    expect(oppositeCameraFacingMode('user')).toBe('environment');
  });
});
