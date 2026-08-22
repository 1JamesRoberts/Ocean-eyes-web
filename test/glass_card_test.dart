import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:oceaneyes/core/theme/oceaneyes_theme.dart';
import 'package:oceaneyes/core/theme/oceaneyes_tokens.dart';
import 'package:oceaneyes/ui/widgets/glass.dart';

void main() {
  testWidgets('default GlassCard uses the shared backdrop shadow', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: OceanEyesTheme.light,
        home: const GlassCard(child: Text('Main card')),
      ),
    );

    final decoration = _outerDecoration(tester);
    expect(decoration.boxShadow, const [OceanShadows.card]);
  });

  testWidgets('overlay GlassCard keeps its existing shadow', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: OceanEyesTheme.light,
        home: const GlassCard(overlay: true, child: Text('Overlay card')),
      ),
    );

    final shadow = _outerDecoration(tester).boxShadow!.single;
    expect(shadow.color, OceanColors.prussianBlue.withValues(alpha: 0.12));
    expect(shadow.blurRadius, 32);
    expect(shadow.offset, const Offset(0, 8));
  });

  testWidgets('GlassPanel remains shadow-free', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: OceanEyesTheme.light,
        home: const GlassPanel(child: Text('Nested panel')),
      ),
    );

    final decoration = tester
        .widget<DecoratedBox>(find.byType(DecoratedBox))
        .decoration;
    expect((decoration as BoxDecoration).boxShadow, isNull);
  });

  testWidgets('standard GlassCard uses transparent blur edge sampling', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: OceanEyesTheme.light,
        home: const GlassCard(child: Text('Standard card')),
      ),
    );

    final filter = tester.widget<BackdropFilter>(find.byType(BackdropFilter));
    expect(filter.filter.toString(), contains('2.0, 2.0, decal'));
  });

  testWidgets('overlay GlassCard uses transparent blur edge sampling', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: OceanEyesTheme.light,
        home: const GlassCard(overlay: true, child: Text('Overlay card')),
      ),
    );

    final filter = tester.widget<BackdropFilter>(find.byType(BackdropFilter));
    expect(filter.filter.toString(), contains('12.0, 12.0, decal'));
  });
}

BoxDecoration _outerDecoration(WidgetTester tester) {
  return tester
          .widgetList<DecoratedBox>(find.byType(DecoratedBox))
          .first
          .decoration
      as BoxDecoration;
}
