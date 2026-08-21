/// The two supported ways to connect an OceanEyes tank.
enum OnboardingPath { newTank, joinExisting }

/// Stable, resumable steps in the first-run connection flow.
enum OnboardingStep {
  welcome,
  choosePath,
  createTank,
  joinTank,
  ownerPairing,
  success,
}

/// Persisted lifecycle state for the onboarding flow.
enum OnboardingStatus { notStarted, inProgress, postponed, completed }

/// Whether a successful tank operation has made onboarding complete.
enum OnboardingCompletionReadiness { pending, ready }

/// Non-sensitive onboarding state.
///
/// This object intentionally contains no tank IDs, QR payloads, or manual
/// pairing input. Tank identifiers are bearer values and must not be written
/// to the onboarding repository.
class OnboardingState {
  const OnboardingState({
    this.status = OnboardingStatus.notStarted,
    this.path,
    this.step = OnboardingStep.welcome,
    this.completionReadiness = OnboardingCompletionReadiness.pending,
  });

  const OnboardingState.initial() : this();

  final OnboardingStatus status;
  final OnboardingPath? path;
  final OnboardingStep step;
  final OnboardingCompletionReadiness completionReadiness;

  bool get isUnfinished =>
      status == OnboardingStatus.inProgress ||
      status == OnboardingStatus.postponed;

  OnboardingState copyWith({
    OnboardingStatus? status,
    OnboardingPath? path,
    bool clearPath = false,
    OnboardingStep? step,
    OnboardingCompletionReadiness? completionReadiness,
  }) {
    return OnboardingState(
      status: status ?? this.status,
      path: clearPath ? null : path ?? this.path,
      step: step ?? this.step,
      completionReadiness: completionReadiness ?? this.completionReadiness,
    );
  }

  @override
  bool operator ==(Object other) =>
      other is OnboardingState &&
      other.status == status &&
      other.path == path &&
      other.step == step &&
      other.completionReadiness == completionReadiness;

  @override
  int get hashCode => Object.hash(status, path, step, completionReadiness);
}
