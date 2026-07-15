export type CameraFacingMode = 'environment' | 'user';

export function buildCameraVideoConstraints(
  deviceId: string | undefined,
  facingMode: CameraFacingMode
): MediaTrackConstraints {
  if (deviceId && deviceId !== 'default') {
    return { deviceId: { exact: deviceId } };
  }

  return { facingMode: { ideal: facingMode } };
}

export function oppositeCameraFacingMode(
  facingMode: CameraFacingMode
): CameraFacingMode {
  return facingMode === 'environment' ? 'user' : 'environment';
}
