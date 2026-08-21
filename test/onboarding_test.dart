import 'package:flutter_test/flutter_test.dart';
import 'package:flutter/widgets.dart';
import 'package:oceaneyes/app/oceaneyes_app.dart';
import 'package:oceaneyes/models/onboarding_models.dart';
import 'package:oceaneyes/view_models/oceaneyes_controller.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  Future<OceanEyesController> pumpOnboarding(WidgetTester tester) async {
    tester.view.physicalSize = const Size(393, 852);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    final controller = OceanEyesController()..disconnectTank();
    controller.openOnboarding();
    addTearDown(controller.dispose);
    await tester.pumpWidget(OceanEyesApp(controller: controller));
    await tester.pump();
    return controller;
  }

  testWidgets('welcome and choice steps are full-screen and resumable', (
    tester,
  ) async {
    final controller = await pumpOnboarding(tester);

    expect(find.text('A clearer view of your aquarium'), findsOneWidget);
    expect(find.text('Get started'), findsOneWidget);
    expect(find.text('I’ll do this later'), findsOneWidget);

    await tester.tap(find.text('Get started'));
    await tester.pump();
    expect(controller.onboardingState.step, OnboardingStep.choosePath);
    expect(find.text('Set up a new tank'), findsOneWidget);
    expect(find.text('Join an existing tank'), findsOneWidget);

    await tester.tap(find.text('Join an existing tank'));
    await tester.pump();
    expect(controller.onboardingState.step, OnboardingStep.joinTank);
    expect(find.text('Start QR scanner'), findsOneWidget);
    expect(find.text('Enter tank ID manually'), findsOneWidget);

    await tester.binding.handlePopRoute();
    await tester.pump();
    expect(controller.onboardingState.step, OnboardingStep.choosePath);
    expect(tester.takeException(), isNull);
  });

  testWidgets('default creation reaches the owner QR handoff', (tester) async {
    final controller = await pumpOnboarding(tester);

    await tester.tap(find.text('Get started'));
    await tester.pump();
    await tester.tap(find.text('Set up a new tank'));
    await tester.pump();
    expect(find.text('My Aquarium'), findsOneWidget);

    await tester.tap(find.text('Create tank'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 400));

    expect(controller.onboardingState.status, OnboardingStatus.completed);
    expect(controller.onboardingState.step, OnboardingStep.ownerPairing);
    expect(find.text('Your tank is ready'), findsOneWidget);
    expect(find.text('tank-demo'), findsOneWidget);
    expect(find.text('Go to dashboard'), findsOneWidget);

    final copyButton = find.byKey(const ValueKey('onboarding-copy-tank-id'));
    await tester.ensureVisible(copyButton);
    await tester.tap(copyButton, warnIfMissed: false);
    await tester.pump();

    final dashboardButton = find.text('Go to dashboard');
    final onboardingScrollable = find
        .descendant(
          of: find.byKey(const ValueKey('onboarding-scroll')),
          matching: find.byType(Scrollable),
        )
        .last;
    await tester.scrollUntilVisible(
      dashboardButton,
      160,
      scrollable: onboardingScrollable,
    );
    await tester.pump();
    await tester.tap(dashboardButton, warnIfMissed: false);
    await tester.pump();
    expect(controller.shouldShowOnboarding, isFalse);
    expect(find.text('Waiting for monitor data'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('manual join completes without starting the scanner', (
    tester,
  ) async {
    final controller = await pumpOnboarding(tester);

    await tester.tap(find.text('Get started'));
    await tester.pump();
    await tester.tap(find.text('Join an existing tank'));
    await tester.pump();
    await tester.tap(find.text('Enter tank ID manually').first);
    await tester.pump();

    final manualInput = find.byKey(const ValueKey('onboarding-manual-input'));
    await tester.enterText(manualInput, '{"v":2,"tank_id":"tank-shared"}');
    await tester.tap(find.text('Join tank'));
    await tester.pump();
    expect(
      find.text(
        'That pairing payload is not valid. Paste the complete version-1 payload.',
      ),
      findsOneWidget,
    );

    await tester.enterText(manualInput, 'tank-shared');
    await tester.tap(find.text('Join tank'));
    await tester.pump();

    expect(controller.onboardingState.status, OnboardingStatus.completed);
    expect(controller.onboardingState.step, OnboardingStep.success);
    expect(find.text('Tank connected'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('skip exposes the persistent no-tank dashboard banner', (
    tester,
  ) async {
    final controller = await pumpOnboarding(tester);

    await tester.tap(find.text('I’ll do this later'));
    await tester.pump();

    expect(controller.onboardingState.status, OnboardingStatus.postponed);
    expect(controller.shouldShowOnboarding, isFalse);
    expect(find.text('Connect a tank'), findsWidgets);
    expect(
      find.text(
        'Set up a new tank or join an existing one to start seeing aquarium data here.',
      ),
      findsOneWidget,
    );
    expect(tester.takeException(), isNull);
  });

  testWidgets('onboarding stays overflow-free at smoke sizes', (tester) async {
    for (final size in const [Size(360, 640), Size(430, 932)]) {
      tester.view.physicalSize = size;
      tester.view.devicePixelRatio = 1;
      final controller = OceanEyesController()..disconnectTank();
      controller.openOnboarding();
      await tester.pumpWidget(OceanEyesApp(controller: controller));
      await tester.pump(const Duration(milliseconds: 400));
      expect(tester.takeException(), isNull, reason: 'welcome at $size');

      controller.continueOnboardingFromWelcome();
      await tester.pump(const Duration(milliseconds: 300));
      controller.chooseOnboardingPath(OnboardingPath.newTank);
      await tester.pump(const Duration(milliseconds: 300));
      await tester.tap(find.text('Create tank'));
      await tester.pump(const Duration(milliseconds: 400));
      expect(tester.takeException(), isNull, reason: 'owner handoff at $size');

      controller.dispose();
      await tester.pumpWidget(const SizedBox.shrink());
    }
    tester.view.resetPhysicalSize();
    tester.view.resetDevicePixelRatio();
  });

  test('onboarding persistence does not store raw pairing values', () async {
    SharedPreferences.setMockInitialValues({});
    final preferences = await SharedPreferences.getInstance();
    final controller = OceanEyesController(preferences: preferences)
      ..disconnectTank();
    controller.openOnboarding();
    controller.continueOnboardingFromWelcome();
    controller.chooseOnboardingPath(OnboardingPath.joinExisting);
    await controller.flushPersistence();

    expect(
      preferences.getKeys().where(
        (key) => key.startsWith('oceaneyes.onboarding.v1.'),
      ),
      isNotEmpty,
    );
    expect(
      preferences.getKeys().every(
        (key) => !('${preferences.get(key)}').contains('tank-secret'),
      ),
      isTrue,
    );

    controller.dispose();
  });
}
