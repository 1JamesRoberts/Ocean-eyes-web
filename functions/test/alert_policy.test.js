const assert = require('node:assert/strict');
const test = require('node:test');

const { evaluateAlertCandidates } = require('../lib/alert_policy.js');

test('uses FNU threshold when new fields are available', () => {
  const result = evaluateAlertCandidates(
    { clarityMin: 6, turbidityFnuMax: 3, fishChangePct: 50 },
    [{ clarityScore: 8.7, turbidityFnu: 4.2, fishCount: 10 }],
  );
  assert.equal(result[0].type, 'clarity_low');
  assert.equal(result[0].context.turbidity_fnu_after, 4.2);
});

test('falls back to the legacy clarity score', () => {
  const result = evaluateAlertCandidates(
    { clarityMin: 6, fishChangePct: 50 },
    [{ clarityScore: 5.9, fishCount: 10 }],
  );
  assert.equal(result[0].type, 'clarity_low');
});

test('ignores seed readings and detects sustained zero fish', () => {
  assert.deepEqual(
    evaluateAlertCandidates(
      { clarityMin: 6, fishChangePct: 50 },
      [{ clarityScore: 0, fishCount: 0 }],
    ),
    [],
  );
  const result = evaluateAlertCandidates(
    { clarityMin: 1, fishChangePct: 50 },
    [
      { clarityScore: 8, fishCount: 0 },
      { clarityScore: 8, fishCount: 0 },
      { clarityScore: 8, fishCount: 0 },
    ],
  );
  assert.equal(result[0].type, 'fish_zero');
});

test('detects a fish-count drop against prior positive readings', () => {
  const result = evaluateAlertCandidates(
    { clarityMin: 1, fishChangePct: 40 },
    [
      { clarityScore: 8, fishCount: 5 },
      { clarityScore: 8, fishCount: 10 },
      { clarityScore: 8, fishCount: 12 },
    ],
  );
  assert.equal(result[0].type, 'fish_drop');
  assert.equal(result[0].context.fish_count_before, 11);
});
