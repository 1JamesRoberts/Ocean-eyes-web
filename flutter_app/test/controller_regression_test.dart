import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:oceaneyes/app/oceaneyes_app.dart';
import 'package:oceaneyes/models/analytics_series_service.dart';
import 'package:oceaneyes/models/aquarium_models.dart';
import 'package:oceaneyes/models/demo_fixtures.dart';
import 'package:oceaneyes/models/fish_insights_service.dart';
import 'package:oceaneyes/models/fish_inventory_repository.dart';
import 'package:oceaneyes/ui/widgets/data_visuals.dart';
import 'package:oceaneyes/view_models/oceaneyes_controller.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('inventory persistence', () {
    test(
      'SharedPreferences repository round-trips complete fish entries',
      () async {
        SharedPreferences.setMockInitialValues({});
        final preferences = await SharedPreferences.getInstance();
        final repository = SharedPreferencesFishInventoryRepository(
          preferences,
        );
        final original = FishEntry(
          id: 'fish-custom',
          speciesId: 'custom_species',
          name: 'Custom Fish',
          scientificName: 'Piscis exemplum',
          assetPath: 'assets/images/fish/betta.png',
          count: 7,
          detected: 3,
          compatibility: 'Peaceful',
          careLevel: 'Intermediate',
          visible: false,
        );

        await repository.save([original]);
        final restored = repository.load();

        expect(restored, hasLength(1));
        expect(restored!.single.id, original.id);
        expect(restored.single.speciesId, original.speciesId);
        expect(restored.single.name, original.name);
        expect(restored.single.scientificName, original.scientificName);
        expect(restored.single.assetPath, original.assetPath);
        expect(restored.single.count, original.count);
        expect(restored.single.detected, original.detected);
        expect(restored.single.compatibility, original.compatibility);
        expect(restored.single.careLevel, original.careLevel);
        expect(restored.single.visible, isFalse);
      },
    );

    test(
      'controller preserves additions, deletions, and detected counts',
      () async {
        final repository = _MemoryFishInventoryRepository();
        final first = OceanEyesController(
          inventoryRepository: repository,
          launchUri: Uri.parse('https://oceaneyes.test/'),
        );

        first.deleteFish('fish-cardinal');
        first.addSpecies(
          DemoFixtures.species.singleWhere(
            (species) => species.id == 'neon_tetra',
          ),
        );
        for (var index = 0; index < 4; index++) {
          first.adjustFishCount('fish-guppy', -1);
        }
        first.toggleFishVisibility('fish-guppy');
        await first.flushPersistence();

        final restored = OceanEyesController(
          inventoryRepository: repository,
          launchUri: Uri.parse('https://oceaneyes.test/'),
        );
        final guppy = restored.fish.singleWhere(
          (fish) => fish.speciesId == 'guppy',
        );

        expect(
          restored.fish.any((fish) => fish.speciesId == 'cardinal_tetra'),
          isFalse,
        );
        expect(
          restored.fish.any((fish) => fish.speciesId == 'neon_tetra'),
          isTrue,
        );
        expect(guppy.count, 1);
        expect(guppy.detected, 1);
        expect(guppy.visible, isFalse);

        first.dispose();
        restored.dispose();
      },
    );
  });

  group('pure model services', () {
    test('fish insights derive community care ranges', () {
      final stats = FishInsightsService.tankStats(DemoFixtures.populatedFish());

      expect(stats.idealTankLitres, 75);
      expect(stats.temperatureRange, '23–27 °C');
      expect(stats.phRange, '6.8–7');
      expect(stats.compatibility, 86);
      expect(FishInsightsService.factsFor('unknown'), isNull);

      const unknown = FishEntry(
        id: 'unknown-fish',
        speciesId: 'unknown',
        name: 'Unknown Fish',
        scientificName: '',
        assetPath: 'assets/images/fish/betta.png',
        count: 1,
        detected: 1,
        compatibility: 'Unknown',
        careLevel: 'Unknown',
      );
      expect(FishInsightsService.tankStats([unknown]).compatibility, isNull);
      expect(
        FishInsightsService.pairCompatibility(
          FishInsightsService.factsFor('cardinal_tetra'),
          FishInsightsService.factsFor('unknown'),
        ),
        isNull,
      );
    });

    test('analytics projections respect the selected inventory species', () {
      final fish = DemoFixtures.populatedFish();
      final cardinal = AnalyticsSeriesService.fishCount(fish, 'Cardinal Tetra');
      final spread = AnalyticsSeriesService.spread(fish, 'Cardinal Tetra');

      expect(cardinal.map((point) => point.value), [7, 8, 7, 8, 8, 8, 8]);
      expect(spread.first.value, 34.4);
      expect(AnalyticsSeriesService.fishCount(fish, 'Unknown'), isEmpty);
      expect(AnalyticsSeriesService.spread(fish, 'Unknown'), isEmpty);
      expect(
        AnalyticsSeriesService.fishCount(const [], 'All species'),
        isEmpty,
      );
      expect(AnalyticsSeriesService.spread(const [], 'All species'), isEmpty);

      final diagnostics = AnalyticsSeriesService.diagnostics(
        fish,
        'All species',
      );
      expect(diagnostics, hasLength(2));
      expect(diagnostics.first.confidence, 96);
      expect(diagnostics.last.confidence, 93);
    });
  });

  test('fixture query ignores preferences and repository state', () async {
    SharedPreferences.setMockInitialValues({
      'aiEnabled': false,
      'showDetections': false,
      'brightness': 0.7,
      'ambientBlur': 0.0,
      'ambientOpacity': 0.0,
    });
    final preferences = await SharedPreferences.getInstance();
    final repository = _MemoryFishInventoryRepository([
      const FishEntry(
        id: 'persisted-only',
        speciesId: 'persisted_only',
        name: 'Persisted Fish',
        scientificName: 'Persisted fish',
        assetPath: 'assets/images/fish/betta.png',
        count: 1,
        detected: 0,
        compatibility: 'Unknown',
        careLevel: 'Unknown',
      ),
    ]);

    final controller = OceanEyesController(
      preferences: preferences,
      inventoryRepository: repository,
      launchUri: Uri.parse(
        'https://oceaneyes.test/?fixture=populated&tab=dashboard',
      ),
    );

    expect(repository.loadCount, 0);
    expect(controller.aiEnabled, isTrue);
    expect(controller.showDetections, isTrue);
    expect(controller.brightness, 1);
    expect(controller.ambientBlur, 48);
    expect(controller.ambientOpacity, 1);
    expect(controller.totalFish, 20);
    expect(controller.fish.any((fish) => fish.id == 'persisted-only'), isFalse);
    controller.dispose();
  });

  test('direct alert details capture the current primary origin', () {
    final controller = OceanEyesController(
      launchUri: Uri.parse('https://oceaneyes.test/?fixture=populated'),
    );

    controller.selectTab(PrimaryTab.account);
    controller.openAlerts();
    controller.selectTab(PrimaryTab.dashboard);
    controller.openAlertDetail('alert-turbidity');
    controller.popAlertDetail();
    controller.closeSecondaryRoute();

    expect(controller.activeTab, PrimaryTab.dashboard);
    controller.dispose();
  });

  test('deleting the selected species resets the analytics filter', () {
    final controller = OceanEyesController(
      launchUri: Uri.parse('https://oceaneyes.test/?fixture=populated'),
    );

    controller.setSelectedSpecies('Guppy');
    controller.deleteFish('fish-guppy');

    expect(controller.selectedSpecies, 'All species');
    expect(controller.fishCountPoints, isNotEmpty);
    controller.dispose();
  });

  testWidgets('empty chart primitives expose a visible semantic fallback', (
    tester,
  ) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: Column(
            children: [
              OceanLineChart(
                points: [],
                semanticLabel: 'Line chart',
                height: 100,
              ),
              OceanBarChart(
                points: [],
                semanticLabel: 'Bar chart',
                height: 100,
              ),
            ],
          ),
        ),
      ),
    );

    expect(find.text('No data available'), findsNWidgets(2));
    expect(
      find.bySemanticsLabel('Line chart. No data available.'),
      findsOneWidget,
    );
    expect(
      find.bySemanticsLabel('Bar chart. No data available.'),
      findsOneWidget,
    );
  });

  test('settings preview commits once and tank controls restore', () async {
    SharedPreferences.setMockInitialValues({});
    final preferences = await SharedPreferences.getInstance();
    final controller = OceanEyesController(
      preferences: preferences,
      launchUri: Uri.parse('https://oceaneyes.test/'),
    );

    controller.previewSetting('brightness', 0.8);
    await controller.flushPersistence();
    expect(preferences.containsKey('brightness'), isFalse);

    controller.commitSetting('brightness', 0.8);
    controller.renameTank('Studio Reef');
    controller.switchCamera();
    controller.disconnectTank();
    await controller.flushPersistence();

    final restored = OceanEyesController(
      preferences: preferences,
      launchUri: Uri.parse('https://oceaneyes.test/'),
    );
    expect(restored.brightness, 0.8);
    expect(restored.tankName, 'Studio Reef');
    expect(restored.usingFrontCamera, isTrue);
    expect(restored.tankConnected, isFalse);
    expect(restored.cameraStage, CameraStage.unavailable);

    controller.dispose();
    restored.dispose();
  });

  testWidgets(
    'add-fish intent is consumed and does not reopen on tab revisit',
    (tester) async {
      tester.view.physicalSize = const Size(393, 852);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      final controller = OceanEyesController(
        launchUri: Uri.parse(
          'https://oceaneyes.test/?fixture=fish_empty&tab=my_fish',
        ),
      );
      await tester.pumpWidget(OceanEyesApp(controller: controller));
      await tester.pumpAndSettle();

      controller.requestAddFish();
      await tester.pumpAndSettle();
      expect(find.text('Search common or scientific name'), findsOneWidget);

      await tester.tap(find.byTooltip('Close add fish'));
      await tester.pumpAndSettle();
      controller.selectTab(PrimaryTab.dashboard);
      await tester.pumpAndSettle();
      controller.selectTab(PrimaryTab.myFish);
      await tester.pumpAndSettle();

      expect(find.text('Search common or scientific name'), findsNothing);
      await tester.pumpWidget(const SizedBox.shrink());
      controller.dispose();
    },
  );
}

class _MemoryFishInventoryRepository implements FishInventoryRepository {
  _MemoryFishInventoryRepository([List<FishEntry>? initial])
    : _fish = initial == null ? null : List<FishEntry>.of(initial);

  List<FishEntry>? _fish;
  int loadCount = 0;

  @override
  List<FishEntry>? load() {
    loadCount += 1;
    final fish = _fish;
    return fish == null ? null : List<FishEntry>.of(fish);
  }

  @override
  Future<void> save(List<FishEntry> fish) async {
    _fish = List<FishEntry>.of(fish);
  }
}
