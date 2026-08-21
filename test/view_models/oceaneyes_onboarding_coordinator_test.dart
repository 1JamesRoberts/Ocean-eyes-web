import 'package:flutter_test/flutter_test.dart';
import 'package:oceaneyes/models/onboarding_models.dart';
import 'package:oceaneyes/models/onboarding_repository.dart';
import 'package:oceaneyes/view_models/oceaneyes_onboarding_coordinator.dart';

void main() {
  test('does not present before lookup and bypasses existing linked tanks', () {
    final coordinator = OceanEyesOnboardingCoordinator(
      repository: InMemoryOnboardingRepository(),
    );

    coordinator.loadForAccount('user-a');
    coordinator.beginTankLookup();
    expect(coordinator.showRoute, isFalse);

    coordinator.resolveTankLookup(const ['tank-a']);
    expect(coordinator.showRoute, isFalse);
    expect(coordinator.hasLinkedTank, isTrue);
  });

  test(
    'resumes postponed state and clears unfinished state on account switch',
    () async {
      final coordinator = OceanEyesOnboardingCoordinator(
        repository: InMemoryOnboardingRepository(),
      );

      coordinator.loadForAccount('user-a');
      coordinator.resolveTankLookup(const []);
      expect(coordinator.showRoute, isTrue);
      coordinator.continueFromWelcome();
      coordinator.choosePath(OnboardingPath.joinExisting);
      coordinator.postpone();
      await coordinator.flush();

      coordinator.open();
      expect(coordinator.state.status, OnboardingStatus.inProgress);
      expect(coordinator.state.step, OnboardingStep.joinTank);

      coordinator.handleAccountIdentityChange('user-b');
      coordinator.resolveTankLookup(const []);
      expect(coordinator.state.status, OnboardingStatus.inProgress);
      expect(coordinator.state.step, OnboardingStep.welcome);
      expect(coordinator.showRoute, isTrue);
    },
  );

  test('completed state is ready without requiring a hardware reading', () {
    final coordinator = OceanEyesOnboardingCoordinator(
      repository: InMemoryOnboardingRepository(),
    );

    coordinator.loadForAccount('user-a');
    coordinator.resolveTankLookup(const []);
    coordinator.continueFromWelcome();
    coordinator.choosePath(OnboardingPath.newTank);
    coordinator.markCreated();

    expect(coordinator.state.status, OnboardingStatus.completed);
    expect(
      coordinator.state.completionReadiness,
      OnboardingCompletionReadiness.ready,
    );
    expect(coordinator.state.step, OnboardingStep.ownerPairing);
  });

  test(
    'successful handoff stays visible while linked tank stream catches up',
    () {
      final coordinator = OceanEyesOnboardingCoordinator(
        repository: InMemoryOnboardingRepository(),
      );

      coordinator.loadForAccount('user-a');
      coordinator.resolveTankLookup(const []);
      coordinator.markCreated(keepRouteOpen: true);
      coordinator.resolveTankLookup(const ['tank-created']);

      expect(coordinator.showRoute, isTrue);
      coordinator.finishRoute();
      expect(coordinator.showRoute, isFalse);
    },
  );
}
