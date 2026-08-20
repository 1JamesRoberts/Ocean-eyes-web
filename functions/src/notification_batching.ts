export const maxMulticastTokens = 500;
export const maxFirestoreBatchReads = 500;
export const maxFirestoreBatchWrites = 500;

export function chunksOf<T>(
  values: readonly T[],
  maximumSize: number,
): T[][] {
  if (!Number.isInteger(maximumSize) || maximumSize < 1) {
    throw new RangeError("maximumSize must be a positive integer.");
  }
  const chunks: T[][] = [];
  for (let start = 0; start < values.length; start += maximumSize) {
    chunks.push(values.slice(start, start + maximumSize));
  }
  return chunks;
}
