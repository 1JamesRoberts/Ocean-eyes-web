const assert = require('node:assert/strict');
const test = require('node:test');

const {
  liveKitHttpUrl,
  liveKitIdentity,
  liveKitIdentityDocumentId,
  liveKitTokenRevocationTimestamp,
} = require('../lib/livekit_service.js');

test('normalizes websocket LiveKit URLs for the room service API', () => {
  assert.equal(
    liveKitHttpUrl('wss://example.livekit.cloud'),
    'https://example.livekit.cloud',
  );
  assert.equal(liveKitHttpUrl('ws://localhost:7880'), 'http://localhost:7880');
  assert.equal(
    liveKitHttpUrl('https://example.livekit.cloud'),
    'https://example.livekit.cloud',
  );
});

test('rejects a LiveKit URL without a supported scheme', () => {
  assert.throws(() => liveKitHttpUrl('example.livekit.cloud'));
});

test('uses one stable identity for each tank, user, and role', () => {
  assert.equal(
    liveKitIdentity('tank-1', 'uid-1', 'viewer'),
    'oe_Vg1c8wGwEKN_H4QtEC5VnMEZkzea8_jUP-lExCsFED8',
  );
  assert.notEqual(
    liveKitIdentity('tank-1', 'uid-1', 'viewer'),
    liveKitIdentity('tank-1', 'uid-1', 'monitor'),
  );
  assert.equal(
    liveKitIdentityDocumentId('tank-1', 'uid-1', 'viewer'),
    liveKitIdentityDocumentId('tank-1', 'uid-1', 'viewer'),
  );
});

test('revokes tokens at the next-second boundary', () => {
  assert.equal(liveKitTokenRevocationTimestamp(1234567890123), 1234567891n);
});
