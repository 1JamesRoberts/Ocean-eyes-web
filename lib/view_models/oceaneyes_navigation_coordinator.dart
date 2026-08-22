import 'package:flutter/foundation.dart';

import '../models/aquarium_models.dart';

enum _NavigationIntent { addFish, analyticsSpecies, analyticsRange }

/// Owns route state and one-shot presentation intents for OceanEyes.
///
/// Keeping this state out of [OceanEyesController] makes navigation transitions
/// independently testable while the controller remains the UI's stable facade.
class OceanEyesNavigationCoordinator {
  OceanEyesNavigationCoordinator({required VoidCallback onChanged})
    : _onChanged = onChanged;

  final VoidCallback _onChanged;

  PrimaryTab activeTab = PrimaryTab.dashboard;
  SecondaryRoute? secondaryRoute;
  String? selectedAlertId;
  PrimaryTab secondaryOrigin = PrimaryTab.dashboard;
  int scrollEpoch = 0;

  final Set<_NavigationIntent> _pendingIntents = {};

  void configureLaunch(Uri uri) {
    activeTab = switch (uri.queryParameters['tab']) {
      'my_fish' || 'fish' => PrimaryTab.myFish,
      'analytics' => PrimaryTab.analytics,
      'account' => PrimaryTab.account,
      _ => PrimaryTab.dashboard,
    };
    switch (uri.queryParameters['route']) {
      case 'alerts':
        secondaryOrigin = activeTab;
        secondaryRoute = SecondaryRoute.alerts;
      case 'history':
        secondaryOrigin = activeTab;
        secondaryRoute = SecondaryRoute.history;
    }
    final requestedAlert = uri.queryParameters['alert'];
    if (secondaryRoute == SecondaryRoute.alerts && requestedAlert != null) {
      selectedAlertId = requestedAlert;
    }
  }

  void selectTab(PrimaryTab tab) {
    activeTab = tab;
    secondaryRoute = null;
    selectedAlertId = null;
    scrollEpoch += 1;
    _onChanged();
  }

  void openAlerts({PrimaryTab? origin}) => _openSecondaryRoute(
    SecondaryRoute.alerts,
    origin ?? PrimaryTab.dashboard,
  );

  void openHistory() =>
      _openSecondaryRoute(SecondaryRoute.history, PrimaryTab.dashboard);

  void openAlertDetail(String id) => _openSecondaryRoute(
    SecondaryRoute.alerts,
    secondaryRoute == SecondaryRoute.alerts ? secondaryOrigin : activeTab,
    id,
  );

  void openNotificationAlert(String alertId) =>
      _openSecondaryRoute(SecondaryRoute.alerts, activeTab, alertId);

  void popAlertDetail() {
    if (selectedAlertId == null) return;
    selectedAlertId = null;
    scrollEpoch += 1;
    _onChanged();
  }

  void closeSecondaryRoute() {
    selectedAlertId = null;
    secondaryRoute = null;
    activeTab = secondaryOrigin;
    scrollEpoch += 1;
    _onChanged();
  }

  void requestAddFish() {
    if (activeTab != PrimaryTab.myFish) {
      activeTab = PrimaryTab.myFish;
      secondaryRoute = null;
      selectedAlertId = null;
      scrollEpoch += 1;
    }
    _requestIntent(_NavigationIntent.addFish);
  }

  bool consumeAddFishRequest() => _consumeIntent(_NavigationIntent.addFish);

  void requestAnalyticsSpecies() =>
      _requestIntent(_NavigationIntent.analyticsSpecies);

  bool consumeAnalyticsSpeciesRequest() =>
      _consumeIntent(_NavigationIntent.analyticsSpecies);

  void requestAnalyticsRange() =>
      _requestIntent(_NavigationIntent.analyticsRange);

  bool consumeAnalyticsRangeRequest() =>
      _consumeIntent(_NavigationIntent.analyticsRange);

  void resetTransientIntents() {
    selectedAlertId = null;
    _pendingIntents.clear();
    scrollEpoch += 1;
  }

  void _openSecondaryRoute(
    SecondaryRoute route,
    PrimaryTab origin, [
    String? alertId,
  ]) {
    secondaryOrigin = origin;
    secondaryRoute = route;
    selectedAlertId = alertId;
    scrollEpoch += 1;
    _onChanged();
  }

  void _requestIntent(_NavigationIntent intent) {
    _pendingIntents.add(intent);
    _onChanged();
  }

  bool _consumeIntent(_NavigationIntent intent) =>
      _pendingIntents.remove(intent);
}
