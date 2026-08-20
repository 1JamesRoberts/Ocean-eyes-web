const assert = require('node:assert/strict');
const test = require('node:test');

const { shouldSuppressAlertDedupe } = require('../lib/alert_dedupe.js');

const now = Date.UTC(2026, 7, 14, 12);

test('enforces marker cooldown independently of alert resolution state', () => {
  assert.equal(
    shouldSuppressAlertDedupe(
      {
        markerExists: true,
        lastRaisedAtMillis: now - 60 * 60 * 1000,
        snoozedUntilMillis: 0,
      },
      now,
    ),
    true,
  );
  assert.equal(
    shouldSuppressAlertDedupe(
      {
        markerExists: true,
        lastRaisedAtMillis: now - 3 * 60 * 60 * 1000,
        snoozedUntilMillis: 0,
      },
      now,
    ),
    false,
  );
});

test('honors snooze and allows a missing marker', () => {
  assert.equal(
    shouldSuppressAlertDedupe(
      {
        markerExists: true,
        lastRaisedAtMillis: 0,
        snoozedUntilMillis: now + 1,
      },
      now,
    ),
    true,
  );
  assert.equal(
    shouldSuppressAlertDedupe(
      {
        markerExists: false,
        lastRaisedAtMillis: now,
        snoozedUntilMillis: now + 1,
      },
      now,
    ),
    false,
  );
});
