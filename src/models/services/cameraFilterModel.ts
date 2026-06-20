// cameraFilterModel.ts - Pure helpers for Tailwind/canvas filter math
import type { CameraFilters } from '../../types/aquarium';

export const TEMPERATURE_WARM_COLOR = '#ffb000';
export const TEMPERATURE_COOL_COLOR = '#00a0ff';
export const TINT_MAGENTA_COLOR = '#ff00bb';
export const TINT_GREEN_COLOR = '#00ff44';

export function getTemperatureColor(temperature: number): string {
  return temperature > 0 ? TEMPERATURE_WARM_COLOR : TEMPERATURE_COOL_COLOR;
}

export function getTintColor(tint: number): string {
  return tint > 0 ? TINT_MAGENTA_COLOR : TINT_GREEN_COLOR;
}

export function getTemperatureOpacity(temperature: number): number {
  return Math.abs(temperature) / 300;
}

export function getTintOpacity(tint: number): number {
  return Math.abs(tint) / 400;
}

export function getTemperatureRgba(temperature: number): string {
  const color = temperature > 0 ? '255, 176, 0' : '0, 160, 255';
  return `rgba(${color}, ${getTemperatureOpacity(temperature)})`;
}

export function getTintRgba(tint: number): string {
  const color = tint > 0 ? '255, 0, 187' : '0, 255, 68';
  return `rgba(${color}, ${getTintOpacity(tint)})`;
}

export function buildCanvasFilterString(filters: CameraFilters): string {
  return `contrast(${filters.contrast}%) brightness(${filters.brightness}%) saturate(${filters.saturation}%)`;
}
