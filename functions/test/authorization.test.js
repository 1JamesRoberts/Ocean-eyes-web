const assert = require('node:assert/strict');
const test = require('node:test');

const {
  canEvaluateAlerts,
  memberRole,
} = require('../lib/authorization.js');

const tank = {
  owner_id: 'owner',
  monitor_uids: ['owner', 'monitor'],
  viewers: ['viewer'],
};

test('only owners and registered monitors may evaluate alerts', () => {
  assert.equal(canEvaluateAlerts(tank, 'owner'), true);
  assert.equal(canEvaluateAlerts(tank, 'monitor'), true);
  assert.equal(canEvaluateAlerts(tank, 'viewer'), false);
  assert.equal(canEvaluateAlerts(tank, 'stranger'), false);
});

test('membership roles remain least privilege', () => {
  assert.equal(memberRole(tank, 'owner'), 'monitor');
  assert.equal(memberRole(tank, 'monitor'), 'monitor');
  assert.equal(memberRole(tank, 'viewer'), 'viewer');
  assert.equal(memberRole(tank, 'stranger'), null);
});

test('tombstoned tanks authorize no member operations', () => {
  const deletingTank = { ...tank, deleting_at: new Date() };

  assert.equal(memberRole(deletingTank, 'owner'), null);
  assert.equal(memberRole(deletingTank, 'monitor'), null);
  assert.equal(canEvaluateAlerts(deletingTank, 'owner'), false);
});
