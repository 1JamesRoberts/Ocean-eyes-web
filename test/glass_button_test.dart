import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:oceaneyes/core/theme/oceaneyes_theme.dart';
import 'package:oceaneyes/ui/widgets/glass.dart';

void main() {
  testWidgets('centers content in an expanded glass button', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: OceanEyesTheme.light,
        home: const Scaffold(
          body: SizedBox(
            width: 320,
            child: GlassButton(
              label: 'Create tank',
              icon: Icons.add,
              expanded: true,
              onPressed: _noop,
            ),
          ),
        ),
      ),
    );

    final button = find.byType(TextButton);
    final content = find.ancestor(
      of: find.text('Create tank'),
      matching: find.byType(Row),
    );

    expect(button, findsOneWidget);
    expect(content, findsOneWidget);
    expect(
      tester.getCenter(content).dx,
      closeTo(tester.getCenter(button).dx, 0.01),
    );
    expect(tester.takeException(), isNull);
  });
}

void _noop() {}
