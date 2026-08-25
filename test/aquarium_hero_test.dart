import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:oceaneyes/models/production_data.dart';
import 'package:oceaneyes/ui/widgets/aquarium_hero.dart';

void main() {
  Widget buildChip(ProductionLiveRole role) {
    return MaterialApp(
      home: Center(child: LiveRoleChip(role: role)),
    );
  }

  testWidgets('monitor Live chip uses a smartphone icon and label', (
    tester,
  ) async {
    final semantics = tester.ensureSemantics();
    try {
      await tester.pumpWidget(buildChip(ProductionLiveRole.monitor));

      expect(find.text('Live'), findsOneWidget);
      expect(find.byIcon(LucideIcons.smartphone), findsOneWidget);
      expect(find.byIcon(LucideIcons.eye), findsNothing);
      expect(find.bySemanticsLabel('Live Monitor side'), findsOneWidget);
    } finally {
      semantics.dispose();
    }
  });

  testWidgets('viewer Live chip uses an eye icon and label', (tester) async {
    final semantics = tester.ensureSemantics();
    try {
      await tester.pumpWidget(buildChip(ProductionLiveRole.viewer));

      expect(find.text('Live'), findsOneWidget);
      expect(find.byIcon(LucideIcons.eye), findsOneWidget);
      expect(find.byIcon(LucideIcons.smartphone), findsNothing);
      expect(find.bySemanticsLabel('Live Viewer side'), findsOneWidget);
    } finally {
      semantics.dispose();
    }
  });

  test('owner and monitor roles map to the monitor side', () {
    expect(ProductionTankMemberRole.owner.liveRole, ProductionLiveRole.monitor);
    expect(
      ProductionTankMemberRole.monitor.liveRole,
      ProductionLiveRole.monitor,
    );
    expect(ProductionTankMemberRole.viewer.liveRole, ProductionLiveRole.viewer);
  });
}
