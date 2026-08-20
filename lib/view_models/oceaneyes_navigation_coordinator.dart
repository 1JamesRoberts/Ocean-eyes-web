import 'package:flutter/foundation.dart';

import '../models/aquarium_models.dart';

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

  bool _addFishRequestPending = false;
  bool _analyticsSpeciesRequestPending = false;
  bool _analyticsRangeRequestPending = false;

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

  void openAlerts({PrimaryTab? origin}) {
    secondaryOrigin = origin ?? PrimaryTab.dashboard;
    secondaryRoute = SecondaryRoute.alerts;
    selectedAlertId = null;
    scrollEpoch += 1;
    _onChanged();
  }

  void openHistory() {
    secondaryOrigin = PrimaryTab.dashboard;
    secondaryRoute = SecondaryRoute.history;
    selectedAlertId = null;
    scrollEpoch += 1;
    _onChanged();
  }

  void openAlertDetail(String id) {
    if (secondaryRoute != SecondaryRoute.alerts) {
      secondaryOrigin = activeTab;
    }
    secondaryRoute = SecondaryRoute.alerts;
    selectedAlertId = id;
    scrollEpoch += 1;
    _onChanged();
  }

  void openNotificationAlert(String alertId) {
    secondaryOrigin = activeTab;
    secondaryRoute = SecondaryRoute.alerts;
    selectedAlertId = alertId;
    scrollEpoch += 1;
    _onChanged();
  }

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
    _addFishRequestPending = true;
    _onChanged();
  }

  bool consumeAddFishRequest() {
    if (!_addFishRequestPending) return false;
    _addFishRequestPending = false;
    return true;
  }

  void requestAnalyticsSpecies() {
    _analyticsSpeciesRequestPending = true;
    _onChanged();
  }

  bool consumeAnalyticsSpeciesRequest() {
    if (!_analyticsSpeciesRequestPending) return false;
    _analyticsSpeciesRequestPending = false;
    return true;
  }

  void requestAnalyticsRange() {
    _analyticsRangeRequestPending = true;
    _onChanged();
  }

  bool consumeAnalyticsRangeRequest() {
    if (!_analyticsRangeRequestPending) return false;
    _analyticsRangeRequestPending = false;
    return true;
  }

  void resetTransientIntents() {
    selectedAlertId = null;
    _addFishRequestPending = false;
    _analyticsSpeciesRequestPending = false;
    _analyticsRangeRequestPending = false;
    scrollEpoch += 1;
  }
}
