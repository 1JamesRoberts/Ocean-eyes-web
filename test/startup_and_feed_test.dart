import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:oceaneyes/app/oceaneyes_app.dart';
import 'package:oceaneyes/ui/widgets/aquarium_hero.dart';
import 'package:oceaneyes/view_models/oceaneyes_controller.dart';
import 'support/oceaneyes_fixture.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('startup failure blocks the normal application shell', (
    tester,
  ) async {
    await tester.pumpWidget(
      const OceanEyesStartupErrorApp(
        message: 'Firebase configuration is missing.',
      ),
    );

    expect(find.text('OceanEyes could not start'), findsOneWidget);
    expect(find.text('Firebase configuration is missing.'), findsOneWidget);
    expect(find.text('AQUARIUM OVERVIEW'), findsNothing);
    expect(find.text('Connect a tank'), findsNothing);
  });

  testWidgets('Dev mode keeps the deterministic aquarium artwork', (
    tester,
  ) async {
    final controller = FixtureOceanEyesController();
    addTearDown(controller.dispose);

    await tester.pumpWidget(
      MaterialApp(
        home: SizedBox(
          width: 393,
          height: 300,
          child: AquariumStreamImage(controller: controller),
        ),
      ),
    );

    expect(
      find.byWidgetPredicate(
        (widget) =>
            widget is Image &&
            widget.image is AssetImage &&
            (widget.image as AssetImage).assetName ==
                'assets/images/aquarium_hero.png',
      ),
      findsOneWidget,
    );
    expect(
      find.byKey(const ValueKey('production-live-feed-unavailable')),
      findsNothing,
    );
  });

  testWidgets('production mode never falls back to demo aquarium artwork', (
    tester,
  ) async {
    final controller = OceanEyesController();
    addTearDown(controller.dispose);

    await tester.pumpWidget(
      MaterialApp(
        home: SizedBox(
          width: 393,
          height: 300,
          child: AquariumStreamImage(controller: controller),
        ),
      ),
    );

    expect(
      find.byKey(const ValueKey('production-live-feed-unavailable')),
      findsOneWidget,
    );
    expect(find.text('Live feed unavailable'), findsOneWidget);
    expect(
      find.byWidgetPredicate(
        (widget) =>
            widget is Image &&
            widget.image is AssetImage &&
            (widget.image as AssetImage).assetName ==
                'assets/images/aquarium_hero.png',
      ),
      findsNothing,
    );
  });
}
