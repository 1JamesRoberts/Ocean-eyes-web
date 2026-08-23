import 'aquarium_models.dart';
import 'production_auth.dart';
import 'production_data.dart';

/// Asynchronous, tank-scoped production persistence.
///
/// This remains separate from the synchronous SharedPreferences repositories.
/// Firebase SDK snapshots and sentinel values must not cross this boundary.
abstract interface class ProductionOceanEyesRepository
    implements AuthTokenDataPort {
  String? get currentUserId;

  Stream<ProductionTank?> watchTank(String tankId);

  Stream<List<ProductionReading>> watchReadings(
    String tankId, {
    int limit = 120,
  });

  Stream<ProductionReadingBundle> watchReadingBundle(
    String tankId, {
    int limit = 120,
  });

  Stream<List<HistoryReading>> watchHistory(String tankId, {int limit = 120});

  Stream<ProductionAnalyticsData> watchAnalytics(
    String tankId, {
    int limit = 120,
  });

  Stream<List<FishEntry>> watchFishInventory(String tankId);

  Stream<List<ProductionAlert>> watchAlerts(String tankId, {int limit = 40});

  Stream<ProductionUser?> watchCurrentUser();

  Stream<List<String>> watchLinkedTankIds();

  Stream<ProductionLiveState?> watchLiveState(String tankId);

  Stream<List<ProductionLiveRequest>> watchLiveRequests(String tankId);

  Future<ProductionTank?> getTank(String tankId);

  Future<String> createTank(String name);

  Future<bool> joinTank(String tankId);

  Future<void> unlinkTank(String tankId);

  Future<void> deleteTank(String tankId);

  Future<void> updateTankName(String tankId, String name);

  Future<void> updateThresholds(
    String tankId,
    ProductionTankThresholds thresholds,
  );

  Future<void> updateCalibration(String tankId, double waterLineY);

  Future<void> requestRecalibration(String tankId, bool requested);

  Future<void> writeReading(ProductionReadingDraft reading);

  Future<void> evaluateAlerts(String tankId);

  Future<void> resolveAlert(String alertId);

  Future<void> snoozeAlert(String alertId, Duration duration);

  Future<void> addFish(ProductionFishDraft fish);

  Future<void> updateFishCount(String fishId, int count);

  Future<void> updateDetectedFish(String fishId, int detected);

  Future<void> removeFish(String fishId);

  Future<void> saveFcmToken(String token);

  @override
  Future<void> removeFcmToken(String token);

  Future<List<String>> linkedTankIdsForUser(String userId);

  Future<void> requestLive(String tankId);

  Future<void> clearLiveRequest(String tankId);

  Future<void> setLiveActive(String tankId, bool active);

  Future<void> pingLive(String tankId);
}
