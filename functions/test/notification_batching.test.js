const assert = require('node:assert/strict');
const test = require('node:test');

const {
  chunksOf,
  maxMulticastTokens,
} = require('../lib/notification_batching.js');

test('chunks multicast recipients at the Firebase limit', () => {
  const tokens = Array.from({ length: 1001 }, (_, index) => `token-${index}`);
  const chunks = chunksOf(tokens, maxMulticastTokens);

  assert.deepEqual(chunks.map((chunk) => chunk.length), [500, 500, 1]);
  assert.deepEqual(chunks.flat(), tokens);
});

test('rejects invalid chunk sizes', () => {
  assert.throws(() => chunksOf(['token'], 0), RangeError);
  assert.throws(() => chunksOf(['token'], 1.5), RangeError);
});
