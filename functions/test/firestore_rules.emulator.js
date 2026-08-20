const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} = require('@firebase/rules-unit-testing');
const {
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
} = require('firebase/firestore');

let environment;

test.before(async () => {
  if (!process.env.FIRESTORE_EMULATOR_HOST) {
    throw new Error(
      'Run through Firebase emulators:exec so FIRESTORE_EMULATOR_HOST is set.',
    );
  }
  environment = await initializeTestEnvironment({
    projectId: `oceaneyes-rules-${process.pid}`,
    firestore: {
      rules: fs.readFileSync(
        path.resolve(__dirname, '..', '..', 'firestore.rules'),
        'utf8',
      ),
    },
  });
});

test.beforeEach(async () => {
  await environment.clearFirestore();
});

test.after(async () => {
  await environment.cleanup();
});

async function seed(pathSegments, data) {
  await environment.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), ...pathSegments), data);
  });
}

function tankData({
  owner = 'owner-a',
  monitors = [owner],
  viewers = ['existing-1', 'existing-2'],
} = {}) {
  return {
    name: 'Rules Reef',
    owner_id: owner,
    monitor_uids: monitors,
    viewers,
    thresholds: {},
    calibration: {},
  };
}

function authenticatedDb(uid) {
  return environment.authenticatedContext(uid).firestore();
}

test('tank pairing allows only an exact self join and self leave', async () => {
  await seed(['tanks', 'tank-a'], tankData());
  const joiner = authenticatedDb('joiner');
  const tank = doc(joiner, 'tanks', 'tank-a');

  await assertSucceeds(
    updateDoc(tank, {
      viewers: arrayUnion('joiner'),
      updated_at: serverTimestamp(),
    }),
  );
  await assertSucceeds(
    updateDoc(tank, {
      viewers: arrayRemove('joiner'),
      updated_at: serverTimestamp(),
    }),
  );

  await assertFails(
    updateDoc(tank, {
      viewers: ['existing-2', 'joiner', 'attacker'],
      updated_at: serverTimestamp(),
    }),
  );

  await seed(
    ['tanks', 'tank-a'],
    tankData({viewers: ['existing-1', 'existing-2', 'joiner']}),
  );
  await assertFails(
    updateDoc(tank, {
      viewers: ['existing-1', 'attacker'],
      updated_at: serverTimestamp(),
    }),
  );
});

test('tank IDs remain bearer-readable but tanks cannot be listed', async () => {
  await seed(['tanks', 'tank-a'], tankData());
  const stranger = authenticatedDb('stranger');

  await assertSucceeds(getDoc(doc(stranger, 'tanks', 'tank-a')));
  await assertFails(getDocs(collection(stranger, 'tanks')));
});

test('user token arrays are bounded without restricting unrelated settings', async () => {
  const user = authenticatedDb('user-a');
  const userRef = doc(user, 'users', 'user-a');
  await assertSucceeds(
    setDoc(userRef, {
      fcm_tokens: Array.from({length: 10}, (_, index) => `token-${index}`),
      tanks: [],
    }),
  );
  await assertFails(
    updateDoc(userRef, {
      fcm_tokens: Array.from({length: 11}, (_, index) => `token-${index}`),
    }),
  );
  await assertSucceeds(updateDoc(userRef, {display_name: 'Aquarist'}));
});

test('reading writes are monitor-only and cannot move across tanks', async () => {
  await seed(['tanks', 'tank-a'], tankData({monitors: ['owner-a', 'monitor']}));
  await seed(['tanks', 'tank-b'], tankData({owner: 'owner-b'}));
  await seed(['readings', 'reading-a'], {
    tank_id: 'tank-a',
    fish_count: 3,
    timestamp: new Date(),
  });

  const monitor = authenticatedDb('monitor');
  const viewer = authenticatedDb('existing-1');
  const owner = authenticatedDb('owner-a');
  await assertSucceeds(
    setDoc(doc(monitor, 'readings', 'reading-monitor'), {
      tank_id: 'tank-a',
      fish_count: 2,
      timestamp: serverTimestamp(),
    }),
  );
  await assertFails(
    setDoc(doc(viewer, 'readings', 'reading-viewer'), {
      tank_id: 'tank-a',
      fish_count: 2,
      timestamp: serverTimestamp(),
    }),
  );
  await assertFails(
    updateDoc(doc(owner, 'readings', 'reading-a'), {tank_id: 'tank-b'}),
  );
  await assertSucceeds(
    updateDoc(doc(owner, 'readings', 'reading-a'), {fish_count: 4}),
  );
});

test('a deletion tombstone blocks new client mutations', async () => {
  await seed(
    ['tanks', 'tank-a'],
    {...tankData(), deleting_at: new Date()},
  );
  const owner = authenticatedDb('owner-a');

  await assertFails(
    updateDoc(doc(owner, 'tanks', 'tank-a'), {name: 'Too late'}),
  );
  await assertFails(
    setDoc(doc(owner, 'readings', 'reading-late'), {
      tank_id: 'tank-a',
      fish_count: 2,
      timestamp: serverTimestamp(),
    }),
  );
});

test('alerts are server-created while members may resolve them', async () => {
  await seed(['tanks', 'tank-a'], tankData());
  await seed(['alerts', 'alert-a'], {
    tank_id: 'tank-a',
    type: 'turbidity',
    resolved: false,
  });
  const viewer = authenticatedDb('existing-1');

  await assertFails(
    setDoc(doc(viewer, 'alerts', 'alert-viewer'), {
      tank_id: 'tank-a',
      type: 'fish_count',
      resolved: false,
    }),
  );
  await assertSucceeds(
    updateDoc(doc(viewer, 'alerts', 'alert-a'), {
      resolved: true,
      updated_at: serverTimestamp(),
    }),
  );
  await assertFails(deleteDoc(doc(viewer, 'alerts', 'alert-a')));
});

test('notification and LiveKit server state is never client-accessible', async () => {
  await seed(['notification_outbox', 'alert-a'], {
    tank_id: 'tank-a',
    status: 'pending',
  });
  await seed(['livekit_identities', 'identity-a'], {
    tank_id: 'tank-a',
    identity: 'server-only',
  });
  const owner = authenticatedDb('owner-a');

  await assertFails(getDoc(doc(owner, 'notification_outbox', 'alert-a')));
  await assertFails(
    setDoc(doc(owner, 'notification_outbox', 'alert-b'), {
      tank_id: 'tank-a',
      status: 'pending',
    }),
  );
  await assertFails(getDoc(doc(owner, 'livekit_identities', 'identity-a')));
  await assertFails(
    setDoc(doc(owner, 'livekit_identities', 'identity-b'), {
      tank_id: 'tank-a',
      identity: 'client-write',
    }),
  );
});

test('live requests are self-owned, server-timestamped leases', async () => {
  await seed(['tanks', 'tank-a'], tankData());
  await seed(['live_state', 'tank-a'], {
    is_live: false,
    publisher_uid: 'owner-a',
  });
  const viewer = authenticatedDb('existing-1');
  const ownRequest = doc(
    viewer,
    'live_state',
    'tank-a',
    'requests',
    'existing-1',
  );

  await assertSucceeds(
    setDoc(ownRequest, {
      requester_uid: 'existing-1',
      requested_at: serverTimestamp(),
    }),
  );
  await assertFails(
    setDoc(ownRequest, {
      requester_uid: 'existing-1',
      requested_at: new Date(Date.now() + 86_400_000),
    }),
  );
  await assertFails(
    setDoc(
      doc(viewer, 'live_state', 'tank-a', 'requests', 'owner-a'),
      {
        requester_uid: 'owner-a',
        requested_at: serverTimestamp(),
      },
    ),
  );
});
