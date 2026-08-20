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

    navigation.requestAddFish();

    expect(navigation.activeTab, PrimaryTab.myFish);
    expect(navigation.consumeAddFishRequest(), isTrue);
    expect(navigation.consumeAddFishRequest(), isFalse);
    expect(changes, 1);
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
