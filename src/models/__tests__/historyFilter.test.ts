import { describe, it, expect } from 'vitest';
import { recordInRange } from '../services/inferenceHelpers';
import type { DateRange } from '../../types/aquarium';

describe('historyFilter', () => {
  const range: DateRange = {
    startDate: '2026-06-18',
    startTime: '09:00',
    endDate: '2026-06-18',
    endTime: '17:00',
  };

  it('includes a record inside the range', () => {
    const record = { timestamp: '2026-06-18T12:00:00+00:00' };
    expect(recordInRange(record, range)).toBe(true);
  });

  it('excludes a record before the range', () => {
    const record = { timestamp: '2026-06-18T08:00:00+00:00' };
    expect(recordInRange(record, range)).toBe(false);
  });

  it('excludes a record after the range', () => {
    const record = { timestamp: '2026-06-18T18:00:00+00:00' };
    expect(recordInRange(record, range)).toBe(false);
  });

  it('includes boundary records', () => {
    expect(recordInRange({ timestamp: '2026-06-18T09:00:00+00:00' }, range)).toBe(true);
    expect(recordInRange({ timestamp: '2026-06-18T17:00:00+00:00' }, range)).toBe(true);
  });

  it('includes a record at the very beginning of the UTC day when the range starts at 00:00', () => {
    const fullDay: DateRange = {
      startDate: '2026-06-18',
      startTime: '00:00',
      endDate: '2026-06-18',
      endTime: '23:55',
    };
    const record = { timestamp: '2026-06-18T00:05:00+00:00' };
    expect(recordInRange(record, fullDay)).toBe(true);
  });

  it('excludes a record just before the start of the UTC day', () => {
    const fullDay: DateRange = {
      startDate: '2026-06-18',
      startTime: '00:00',
      endDate: '2026-06-18',
      endTime: '23:55',
    };
    const record = { timestamp: '2026-06-17T23:59:00+00:00' };
    expect(recordInRange(record, fullDay)).toBe(false);
  });
});
