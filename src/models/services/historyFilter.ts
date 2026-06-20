// historyFilter.ts - Pure history record date/time filtering
import type { DateRange } from '../../types/aquarium';
import { combineDateTime } from '../../utils/formatters';

export interface TimestampedRecord {
  timestamp: string;
}

export function recordInRange(record: TimestampedRecord, range: DateRange): boolean {
  const ts = new Date(record.timestamp);
  const start = combineDateTime(range.startDate, range.startTime);
  const end = combineDateTime(range.endDate, range.endTime);
  return ts >= start && ts <= end;
}
