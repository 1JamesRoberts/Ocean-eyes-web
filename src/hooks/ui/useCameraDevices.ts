import { useEffect, useState } from 'react';

type CameraPermissionState = 'prompt' | 'granted' | 'denied' | 'unknown';

export const useCameraDevices = () => {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [cameraPermissionState, setCameraPermissionState] =
    useState<CameraPermissionState>('unknown');

  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) return;

    const refreshDevices = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        stream.getTracks().forEach((track) => track.stop());
        setCameraPermissionState('granted');
      } catch {
        setCameraPermissionState('denied');
      }

      try {
        const found = await navigator.mediaDevices.enumerateDevices();
        setDevices(found.filter((device) => device.kind === 'videoinput'));
      } catch {
        // Leave the existing device list unchanged if enumeration fails.
      }
    };

    refreshDevices();
  }, []);

  return { devices, cameraPermissionState };
};
