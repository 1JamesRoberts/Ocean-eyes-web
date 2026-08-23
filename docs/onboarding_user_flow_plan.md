# OceanEyes Onboarding User Flow

## Summary

OceanEyes presents a dedicated full-screen tank setup flow after production
authentication and the first linked-tank lookup. A user can create a new tank,
join an existing tank, or postpone setup and use a limited no-tank dashboard.

## Flow

1. Welcome presents one value proposition with `Get started` and `I’ll do this
   later` actions.
2. The user chooses `Set up a new tank` or `Join an existing tank`.
3. New-tank setup creates the default `My Aquarium` tank without a naming
   form. The owner handoff renders the version-1 `TankPairingCodec` QR payload,
   readable tank ID, copy, share, and `Go to dashboard` actions.
4. Existing-tank setup starts in QR mode without requesting camera permission.
   Permission is requested only after `Start QR scanner`; denial or platform
   unavailability immediately offers manual tank ID/payload entry.
5. A successful create or join marks onboarding complete immediately. Hardware
   connectivity and the first reading are not completion prerequisites.
6. Postponed setup closes to the shell and leaves a persistent `Connect a tank`
   banner on the dashboard. Production no-tank data remains empty; fixture
   values never cross that boundary.

## State and persistence

`OnboardingState` is model-layer state with path, step, status, and completion
readiness. `OceanEyesOnboardingCoordinator` owns transitions and route
presentation while `OceanEyesController` remains the public mutation surface.

The namespaced SharedPreferences repository stores only status, path, last step,
and readiness under the authenticated account namespace. It never stores raw
QR payloads, tank IDs, or manual pairing input. Unfinished state resumes after
relaunch. A changed account clears unfinished state; an account with linked
tanks bypasses onboarding and keeps the existing tank-selection behavior.

## Runtime boundaries

- Onboarding is presented only after production auth and the initial linked-tank
  stream result resolve.
- Existing pairing and tank management remain in Account; Google sign-out is
  available there after authentication.
- Monitoring camera, ONNX, LiveKit, and notification permission remain deferred
  until explicit feature use. QR scanning has its own just-in-time permission
  request.
- Share uses the native share sheet through `share_plus` on supported native
  platforms and clipboard fallback on web or share failures.

## Validation

The focused onboarding tests cover welcome/choice, default creation and owner
handoff, manual join, skip/banner behavior, and non-persistence of raw pairing
values. The existing production boundary, widget, visual, and fixture suites
remain the required regression gates. Run `dart format`, `flutter analyze`,
focused Flutter tests, the full Flutter test suite, the visual matrix, and the
documented web/Android builds before release handoff.
