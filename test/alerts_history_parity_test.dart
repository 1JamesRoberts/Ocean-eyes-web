import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:oceaneyes/models/aquarium_models.dart';
import 'package:oceaneyes/ui/screens/alerts_screen.dart';
import 'package:oceaneyes/ui/screens/history_screen.dart';
import 'package:oceaneyes/ui/widgets/data_visuals.dart';
import 'support/oceaneyes_fixture.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  Future<void> pumpScreen(
    WidgetTester tester,
    Widget child, {
    double width = 393,
  }) async {
    tester.view.physicalSize = Size(width, 1100);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: child,
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();
  }

  testWidgets('alert detail exposes diagnostics and reference large action', (
    tester,
  ) async {
    final controller = FixtureOceanEyesController();
    addTearDown(controller.dispose);
    controller.applyFixture(FixtureScenario.populated, notify: false);
    final alert = controller.alerts.first;
    controller.selectedAlertId = alert.id;

    await pumpScreen(
      tester,
      AlertDetailScreen(controller: controller, alert: alert),
    );

    expect(find.text('Clarity Shift'), findsOneWidget);
    expect(find.text('2.5 → 3.4'), findsOneWidget);
    expect(find.text('Fish Discrepancy'), findsOneWidget);
    expect(find.text('20 → 20'), findsOneWidget);

    final action = find.byKey(const ValueKey('alert-resolve-button'));
    expect(action, findsOneWidget);
    expect(tester.getSize(action).height, closeTo(49, 0.01));

    await tester.tap(action);
    await tester.pump();
    expect(
      controller.alerts.singleWhere((item) => item.id == alert.id).resolved,
      isTrue,
    );
    expect(controller.selectedAlertId, isNull);
    expect(tester.takeException(), isNull);
  });

  testWidgets('history uses latest seven and matches reading row content', (
    tester,
  ) async {
    final controller = FixtureOceanEyesController();
    addTearDown(controller.dispose);
    final newest = DateTime(2026, 8, 1, 12);
    controller.history = List<HistoryReading>.generate(
      9,
      (index) => HistoryReading(
        date: newest.subtract(Duration(hours: index)),
        clarity: index + 1,
        fishCount: 20 - index,
        summary: 'Not rendered in the reference row.',
        ph: 7.2,
        temp: 26.3,
      ),
      growable: false,
    );

    await pumpScreen(tester, HistoryScreen(controller: controller));

    final chart = tester.widget<OceanLineChart>(find.byType(OceanLineChart));
    expect(chart.points, hasLength(7));
    expect(
      chart.points.map((point) => point.value),
      orderedEquals(<double>[7, 6, 5, 4, 3, 2, 1]),
    );

    expect(find.text('Clarity: 1/10'), findsOneWidget);
    expect(find.text('Aug 1 · 12:00 PM · 20 fish visible'), findsOneWidget);
    expect(find.text('Aug 1 · 08:00 AM · 16 fish visible'), findsOneWidget);
    expect(find.text('pH 7.2'), findsNWidgets(8));
    expect(find.text('26.3°C'), findsNWidgets(8));
    expect(find.text('Not rendered in the reference row.'), findsNothing);
    expect(find.text('Clarity: 9/10'), findsNothing);

    final older = tester.widget<Text>(find.text('OLDER'));
    expect(older.style?.fontSize, 13);
    expect(tester.takeException(), isNull);
  });

  testWidgets('alerts and history remain overflow-free at 360px', (
    tester,
  ) async {
    final controller = FixtureOceanEyesController();
    addTearDown(controller.dispose);
    controller.applyFixture(FixtureScenario.populated, notify: false);

    await pumpScreen(tester, AlertsScreen(controller: controller), width: 360);
    expect(tester.takeException(), isNull);

    final alert = controller.alerts.first;
    await pumpScreen(
      tester,
      AlertDetailScreen(controller: controller, alert: alert),
      width: 360,
    );
    expect(tester.takeException(), isNull);

    await pumpScreen(tester, HistoryScreen(controller: controller), width: 360);
    expect(tester.takeException(), isNull);
  });
}
