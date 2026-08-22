import 'package:flutter_test/flutter_test.dart';
import 'package:oceaneyes/models/aquarium_models.dart';
import 'package:oceaneyes/view_models/oceaneyes_navigation_coordinator.dart';

void main() {
  test('configures deep-linked navigation without emitting a transition', () {
    var changes = 0;
    final navigation = OceanEyesNavigationCoordinator(
      onChanged: () => changes += 1,
    );

    navigation.configureLaunch(
      Uri.parse('https://example.test/?tab=analytics&route=alerts&alert=a-1'),
    );

    expect(navigation.activeTab, PrimaryTab.analytics);
    expect(navigation.secondaryOrigin, PrimaryTab.analytics);
    expect(navigation.secondaryRoute, SecondaryRoute.alerts);
    expect(navigation.selectedAlertId, 'a-1');
    expect(changes, 0);
  });

  test('owns one-shot presentation intents', () {
    var changes = 0;
    final navigation = OceanEyesNavigationCoordinator(
      onChanged: () => changes += 1,
    );

    navigation
      ..requestAddFish()
      ..requestAnalyticsSpecies()
      ..requestAnalyticsRange();

    expect(navigation.activeTab, PrimaryTab.myFish);
    for (final consume in [
      navigation.consumeAddFishRequest,
      navigation.consumeAnalyticsSpeciesRequest,
      navigation.consumeAnalyticsRangeRequest,
    ]) {
      expect(consume(), isTrue);
      expect(consume(), isFalse);
    }
    expect(changes, 3);
  });

  test('preserves the route origin while changing alert details', () {
    final navigation = OceanEyesNavigationCoordinator(onChanged: () {});
    navigation.openAlerts(origin: PrimaryTab.analytics);

    navigation.openAlertDetail('a-2');
    expect(navigation.secondaryOrigin, PrimaryTab.analytics);
    expect(navigation.selectedAlertId, 'a-2');
  });

  test('restores the route origin when a secondary route closes', () {
    final navigation = OceanEyesNavigationCoordinator(onChanged: () {});
    navigation.activeTab = PrimaryTab.account;

    navigation.openAlertDetail('a-2');
    navigation.closeSecondaryRoute();

    expect(navigation.activeTab, PrimaryTab.account);
    expect(navigation.secondaryRoute, isNull);
    expect(navigation.selectedAlertId, isNull);
  });
}
