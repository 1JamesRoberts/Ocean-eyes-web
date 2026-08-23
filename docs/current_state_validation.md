# Current-state validation record

Validation date: August 21, 2026.

This record distinguishes deterministic proof of the Flutter orchestration from
staging proof that requires real Firebase, LiveKit, credentials, and phones.
The automated two-device test uses two real `OceanEyesController` instances,
two production repositories, two auth sessions, and a shared in-memory
Firestore/LiveKit model. It does not claim to be a physical device test.

## Automated proof

The focused commands are:

```powershell
flutter test test/production/two_device_flow_test.dart
flutter test test/view_models/oceaneyes_production_controller_test.dart
```

| Requested behavior | Evidence | Result |
| --- | --- | --- |
| Phone A signs in/links Google and creates a tank | `two_device_flow_test.dart`; `firebase_auth_gateway_test.dart` | Pass |
| Phone B pairs by QR as a viewer | `two_device_flow_test.dart`; `tank_pairing_codec_test.dart` | Pass |
| Viewer requests live video and monitor publishes it | Shared request lease, role-scoped LiveKit fakes, remote-track assertion in `two_device_flow_test.dart` | Pass |
| Readings synchronize | A production reading is mapped into both controllers' dashboard/history state | Pass |
| Fish inventory synchronizes both ways | B adds fish; A changes its count; both snapshots converge | Pass |
| Alerts synchronize | Server-created alert is seen by both; B resolves it; both converge | Pass |
| Live state synchronizes both ways | B request starts A's publisher; A stop propagates inactive state to both | Pass |
| Reconnects recover cleanly | Reconnecting → connected is retained; a later disconnect is cleaned up and retryable | Pass |
| App backgrounding | Paused suspends the camera; resumed reopens it | Pass |
| Permission denial | Denied camera state stops automatic work and remains retryable | Pass |
| Token expiry | Expiry-shaped LiveKit disconnect clears the viewer request and permits a fresh start | Pass |
| One-phone crash/disappearance | Stale viewer request lease stops monitor publishing; abrupt publisher disconnect releases live state and camera | Pass at the coordinator/lease boundary |

The full credential-free Flutter suite passes with 170 tests. `flutter analyze`
passes with no issues. The Functions TypeScript build and unit suite passes
with 16 tests. The Firestore emulator rules suite covers 9 tests: Google-only
provider enforcement, exact self-join/leave, no tank listing, monitor-only
readings, server-created alerts, self-owned live-request leases, token caps,
tombstones, and server-only LiveKit state.

## What this proves about the current implementation

- Google sign-in resolves returning users through Firebase to their stable UID;
  sign-out detaches the device token and returns the client to the login gate.
- Pairing is a validated version-1 bearer payload. A viewer can read shared
  tank state and request a stream, but cannot edit owner-only settings.
- Reading, inventory, alert, and live-state streams are tank-scoped and feed
  both controllers through the same production binding boundary.
- LiveKit reconnecting is retained. A terminal disconnect, including a token
  expiry-shaped failure, clears the request/publisher state and leaves an
  explicit retry path.
- Camera lifecycle and permission transitions release automatic inference and
  wake-lock ownership instead of leaving work running against a denied or
  backgrounded camera.
- Per-viewer request documents plus a 60-second lease prevent one dead viewer
  from holding the monitor publisher forever.

## Staging checks still required

The following cannot be honestly proven by the repository-only tests:

- Google OAuth persistence/sign-out, non-Google token rejection, and App Check
  against the deployed Firebase project on Android, iOS, and web.
- QR scanning with the native camera on two physical phones.
- A real two-device LiveKit room with monitor camera publishing, viewer track
  subscription, reconnect, short-lived token expiry, and concurrent viewers.
- OS-level background/terminated behavior, camera permission dialogs, FCM/APNs
  delivery, and actual process crashes followed by app restart.
- Physical camera/ONNX performance, thermal behavior, and signed release
  builds.

Those checks remain release/staging work because this workspace has no private
Firebase or LiveKit configuration and no attached Android/iOS devices. The
automated results above should therefore be read as client-contract proof,
not as a substitute for the final two-phone smoke run.
