import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:oceaneyes/integrations/ml/onnx_fish_inference.dart';
import 'package:oceaneyes/models/aquarium_models.dart';
import 'package:oceaneyes/models/production_data.dart';
import 'package:oceaneyes/ui/widgets/aquarium_hero.dart';
import 'package:oceaneyes/view_models/oceaneyes_controller.dart';

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

  testWidgets(
    'hero renders live inference detections instead of fixture boxes',
    (tester) async {
      final controller = OceanEyesController(localPreviewEnabled: true)
        ..cameraStage = CameraStage.active
        ..activeTab = PrimaryTab.account
        ..fishDetections = [
          FishDetection(
            box: NormalizedFishBox.fromEdges(
              left: 0.35,
              top: 0.40,
              right: 0.65,
              bottom: 0.60,
            ),
            detectionConfidence: 0.81,
            speciesId: 'cardinal_tetra',
            classificationConfidence: 0.94,
          ),
        ]
        ..heatmapSourceDimensions = const DetectionFrameDimensions(
          width: 1920,
          height: 1080,
        );
      try {
        await tester.pumpWidget(
          MaterialApp(
            home: AquariumHero(controller: controller, page: AppPage.primary),
          ),
        );

        expect(find.text('Cardinal Tetra 94%'), findsOneWidget);
        expect(find.text('Guppy 89%'), findsNothing);
        expect(find.text('Corydoras 82%'), findsNothing);
      } finally {
        controller.dispose();
      }
    },
  );

  test('owner and monitor roles map to the monitor side', () {
    expect(ProductionTankMemberRole.owner.liveRole, ProductionLiveRole.monitor);
    expect(
      ProductionTankMemberRole.monitor.liveRole,
      ProductionLiveRole.monitor,
    );
    expect(ProductionTankMemberRole.viewer.liveRole, ProductionLiveRole.viewer);
  });
}
