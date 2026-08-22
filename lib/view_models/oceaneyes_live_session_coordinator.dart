import 'dart:async';

import '../integrations/camera/camera_capture_gateway.dart';
import '../integrations/livekit/livekit_gateway.dart';
import '../models/production_data.dart';
import '../models/production_repository.dart';
import 'oceaneyes_wake_lock_coordinator.dart';

/// Owns LiveKit session state, request leases, heartbeats, and camera handoff.
class OceanEyesLiveSessionCoordinator {
  OceanEyesLiveSessionCoordinator({
    required bool enabled,
    required ProductionOceanEyesRepository? repository,
    required CameraCaptureGateway? camera,
    required OceanEyesLiveGateway? gateway,
    required OceanEyesWakeLockCoordinator wakeLock,
    required CameraHandoffConfiguration handoffConfiguration,
    required CameraHandoffDelay handoffDelay,
    required String? Function() currentTankId,
    required ProductionTankMemberRole Function() currentRole,
    required bool Function() useFrontCamera,
    required bool Function() isDisposed,
    required void Function(Future<void> Function() operation)
    queueProductionWrite,
    required void Function(Object error, [StackTrace? stackTrace]) onError,
    required void Function() onChanged,
  }) : _enabled = enabled,
       _repository = repository,
       _camera = camera,
       _gateway = gateway,
       _wakeLock = wakeLock,
       _handoffConfiguration = handoffConfiguration,
       _handoffDelay = handoffDelay,
       _currentTankId = currentTankId,
       _currentRole = currentRole,
       _useFrontCamera = useFrontCamera,
       _isDisposed = isDisposed,
       _queueProductionWrite = queueProductionWrite,
       _onError = onError,
       _onChanged = onChanged;

  static const _requestHeartbeatInterval = Duration(seconds: 20);
  static const _requestLeaseDuration = Duration(seconds: 60);
  static const _requestSweepInterval = Duration(seconds: 5);

  final bool _enabled;
  final ProductionOceanEyesRepository? _repository;
  final CameraCaptureGateway? _camera;
  final OceanEyesLiveGateway? _gateway;
  final OceanEyesWakeLockCoordinator _wakeLock;
  final CameraHandoffConfiguration _handoffConfiguration;
  final CameraHandoffDelay _handoffDelay;
  final String? Function() _currentTankId;
  final ProductionTankMemberRole Function() _currentRole;
  final bool Function() _useFrontCamera;
  final bool Function() _isDisposed;
  final void Function(Future<void> Function() operation) _queueProductionWrite;
  final void Function(Object error, [StackTrace? stackTrace]) _onError;
  final void Function() _onChanged;

  Future<void> _operationQueue = Future<void>.value();
  StreamSubscription<OceanEyesLiveSnapshot>? _snapshotSubscription;
  Timer? _liveHeartbeat;
  Timer? _requestHeartbeat;
  Timer? _requestLeaseSweep;
  List<ProductionLiveRequest> _requests = const [];
  bool _publishing = false;
  bool _viewing = false;
  bool _disconnectRecoveryPending = false;

  Object? remoteVideoTrack;
  OceanEyesLiveConnectionState connectionState =
      OceanEyesLiveConnectionState.disconnected;

  bool get isPublishing => _publishing;
  bool get isConnected =>
      connectionState == OceanEyesLiveConnectionState.connected;

  void initialize() {
    final gateway = _gateway;
    if (!_enabled || gateway == null || _snapshotSubscription != null) return;
    _snapshotSubscription = gateway.snapshots.listen(
      _handleSnapshot,
      onError: _onError,
    );
  }

  void updateRequests(List<ProductionLiveRequest> requests) {
    _requests = List.unmodifiable(requests);
    final canPublish = _canPublish;
    _requestLeaseSweep?.cancel();
    _requestLeaseSweep = null;
    if (!canPublish) {
      if (_publishing) unawaited(stop());
      return;
    }
    _evaluateRequestLeases();
    if (requests.isNotEmpty) {
      _requestLeaseSweep = Timer.periodic(
        _requestSweepInterval,
        (_) => _evaluateRequestLeases(),
      );
    }
  }

  void clearRequests() {
    _requests = const [];
    _requestLeaseSweep?.cancel();
    _requestLeaseSweep = null;
  }

  void reevaluateRequests() => updateRequests(_requests);

  Future<void> startViewer() => _enqueue(_startViewer);

  Future<void> _startViewer() async {
    final tankId = _currentTankId();
    final repository = _repository;
    final gateway = _gateway;
    if (!_enabled ||
        tankId == null ||
        repository == null ||
        gateway == null ||
        _viewing ||
        _publishing) {
      return;
    }
    _viewing = true;
    var requestCreated = false;
    try {
      await repository.requestLive(tankId);
      requestCreated = true;
      await gateway.connect(tankId, role: OceanEyesLiveRole.viewer);
      _requestHeartbeat?.cancel();
      _requestHeartbeat = Timer.periodic(_requestHeartbeatInterval, (_) {
        _queueProductionWrite(() => repository.requestLive(tankId));
      });
    } catch (error, stackTrace) {
      _viewing = false;
      _requestHeartbeat?.cancel();
      _requestHeartbeat = null;
      _onError(error, stackTrace);
      if (requestCreated) {
        try {
          await repository.clearLiveRequest(tankId);
        } catch (_) {
          // Request leases provide eventual cleanup when Firebase is offline.
        }
      }
      try {
        await gateway.disconnect();
      } catch (_) {
        // Preserve the original connection failure.
      }
    }
  }

  Future<void> startMonitor() => _enqueue(_startMonitor);

  Future<void> _startMonitor() async {
    final tankId = _currentTankId();
    final repository = _repository;
    final gateway = _gateway;
    if (!_enabled ||
        tankId == null ||
        repository == null ||
        gateway == null ||
        _publishing ||
        _viewing ||
        !_canPublish) {
      return;
    }
    _publishing = true;
    _wakeLock.setLivePublishing(true);
    var roomConnected = false;
    try {
      await _camera?.suspend();
      if (_camera != null) {
        await _settle(_handoffConfiguration.afterCameraRelease);
      }
      await gateway.connect(
        tankId,
        role: OceanEyesLiveRole.monitor,
        useFrontCamera: _useFrontCamera(),
      );
      roomConnected = true;
      await repository.setLiveActive(tankId, true);
      _liveHeartbeat?.cancel();
      _liveHeartbeat = Timer.periodic(const Duration(seconds: 20), (_) {
        _queueProductionWrite(() => repository.pingLive(tankId));
      });
    } catch (error, stackTrace) {
      _publishing = false;
      _wakeLock.setLivePublishing(false);
      _onError(error, stackTrace);
      if (roomConnected) {
        try {
          await repository.setLiveActive(tankId, false);
        } catch (_) {
          // A stale live flag is rejected by its last-ping timestamp.
        }
      }
      try {
        await gateway.disconnect();
      } catch (_) {
        // Preserve the original startup failure.
      }
      try {
        if (_camera != null) {
          await _settle(_handoffConfiguration.afterLiveDisconnect);
        }
        await _camera?.resume();
      } catch (_) {
        // Preserve the original startup failure.
      }
    }
  }

  Future<void> stop({
    bool clearRequest = true,
    String? tankIdOverride,
    bool resumeCamera = true,
  }) => _enqueue(
    () => _stopSession(
      clearRequest: clearRequest,
      tankIdOverride: tankIdOverride,
      resumeCamera: resumeCamera,
    ),
  );

  Future<void> _stopSession({
    required bool clearRequest,
    String? tankIdOverride,
    required bool resumeCamera,
  }) async {
    final tankId = tankIdOverride ?? _currentTankId();
    final repository = _repository;
    _liveHeartbeat?.cancel();
    _liveHeartbeat = null;
    _requestHeartbeat?.cancel();
    _requestHeartbeat = null;
    _requestLeaseSweep?.cancel();
    _requestLeaseSweep = null;
    final wasPublishing = _publishing;
    final wasViewing = _viewing;
    _publishing = false;
    _viewing = false;
    _wakeLock.setLivePublishing(false);
    if (tankId != null && repository != null) {
      if (wasPublishing) {
        try {
          await repository.setLiveActive(tankId, false);
        } catch (error, stackTrace) {
          _onError(error, stackTrace);
        }
      }
      if (clearRequest && wasViewing) {
        try {
          await repository.clearLiveRequest(tankId);
        } catch (error, stackTrace) {
          _onError(error, stackTrace);
        }
      }
    }
    try {
      await _gateway?.disconnect();
    } catch (error, stackTrace) {
      _onError(error, stackTrace);
    }
    if (wasPublishing && resumeCamera) {
      try {
        if (_camera != null) {
          await _settle(_handoffConfiguration.afterLiveDisconnect);
        }
        await _camera?.resume();
      } catch (error, stackTrace) {
        _onError(error, stackTrace);
      }
    }
  }

  void _handleSnapshot(OceanEyesLiveSnapshot snapshot) {
    final previousState = connectionState;
    connectionState = snapshot.state;
    remoteVideoTrack = snapshot.remoteVideoTrack;
    if (snapshot.error != null) {
      _onError('Live stream: ${snapshot.error}');
    }
    final sessionWasConnected =
        previousState == OceanEyesLiveConnectionState.connected ||
        previousState == OceanEyesLiveConnectionState.reconnecting;
    final sessionTerminated =
        snapshot.state == OceanEyesLiveConnectionState.disconnected ||
        snapshot.state == OceanEyesLiveConnectionState.failed;
    if (sessionWasConnected &&
        sessionTerminated &&
        (_publishing || _viewing) &&
        !_disconnectRecoveryPending) {
      _disconnectRecoveryPending = true;
      final tankId = _currentTankId();
      unawaited(
        _enqueue(() async {
          try {
            await _stopSession(
              clearRequest: true,
              tankIdOverride: tankId,
              resumeCamera: true,
            );
          } finally {
            _disconnectRecoveryPending = false;
          }
        }),
      );
    }
    _onChanged();
  }

  void _evaluateRequestLeases() {
    if (_isDisposed() || !_canPublish) return;
    final oldestAccepted = DateTime.now().subtract(_requestLeaseDuration);
    final hasFreshRequest = _requests.any((request) {
      final requestedAt = request.requestedAt;
      return requestedAt != null && !requestedAt.isBefore(oldestAccepted);
    });
    if (hasFreshRequest && !_publishing) {
      unawaited(startMonitor());
    } else if (!hasFreshRequest && _publishing) {
      unawaited(stop());
    }
    if (!hasFreshRequest) {
      _requestLeaseSweep?.cancel();
      _requestLeaseSweep = null;
    }
  }

  bool get _canPublish {
    final role = _currentRole();
    return role == ProductionTankMemberRole.owner ||
        role == ProductionTankMemberRole.monitor;
  }

  Future<void> _enqueue(Future<void> Function() operation) {
    final result = _operationQueue.then((_) => operation());
    _operationQueue = result.then<void>(
      (_) {},
      onError: (Object error, StackTrace stackTrace) {
        _onError(error, stackTrace);
      },
    );
    return result;
  }

  Future<void> _settle(Duration duration) {
    if (duration == Duration.zero || duration.isNegative) {
      return Future<void>.value();
    }
    return _handoffDelay(duration);
  }

  Future<void> dispose({String? tankId}) async {
    _liveHeartbeat?.cancel();
    _requestHeartbeat?.cancel();
    _requestLeaseSweep?.cancel();
    await _snapshotSubscription?.cancel();
    _snapshotSubscription = null;
    await stop(tankIdOverride: tankId, resumeCamera: false);
    await _gateway?.dispose();
  }
}
