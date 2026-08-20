import 'dart:typed_data';

import 'package:image/image.dart' as image;

/// Coarse lifecycle state for the production camera.
enum CameraCapturePhase {
  idle,
  requestingPermission,
  opening,
  ready,
  capturing,
  suspended,
  permissionDenied,
  unavailable,
  failed,
  disposed,
}

/// Platform-independent projection of the camera permission result.
enum CameraPermissionState {
  unknown,
  granted,
  denied,
  permanentlyDenied,
  restricted,
  unsupported,
}

enum CameraLensFacing { back, front, external, unknown }

enum CameraCaptureResolution { low, medium, high, veryHigh, maximum }

/// Stable lens ordering shared by native and web camera implementations.
///
/// A rear camera is preferred for aquarium monitoring, but the remaining
/// cameras stay in the list so the presentation layer can still switch to a
/// front or external lens.
abstract final class CameraLensOrdering {
  static List<T> preferred<T>(
    Iterable<T> lenses, {
    required bool preferBackCamera,
    required bool Function(T lens) isBackCamera,
  }) {
    final discovered = List<T>.of(lenses);
    if (!preferBackCamera) return discovered;
    return <T>[
      ...discovered.where(isBackCamera),
      ...discovered.where((lens) => !isBackCamera(lens)),
    ];
  }
}

class CameraLensInfo {
  const CameraLensInfo({
    required this.id,
    required this.name,
    required this.facing,
    required this.sensorOrientation,
  });

  final String id;
  final String name;
  final CameraLensFacing facing;
  final int sensorOrientation;
}

class CameraCaptureConfiguration {
  const CameraCaptureConfiguration({
    this.resolution = CameraCaptureResolution.medium,
    this.enableAudio = false,
    this.preferBackCamera = true,
    this.discoveryTimeout = const Duration(seconds: 4),
    this.initializationTimeout = const Duration(seconds: 6),
    this.permissionTimeout = const Duration(seconds: 10),
    this.captureTimeout = const Duration(seconds: 15),
  });

  final CameraCaptureResolution resolution;
  final bool enableAudio;
  final bool preferBackCamera;
  final Duration discoveryTimeout;
  final Duration initializationTimeout;
  final Duration permissionTimeout;
  final Duration captureTimeout;
}

/// Hardware handoff settle times retained from the production monitor app.
///
/// Some devices do not make a released camera immediately available to a
/// second media stack. Tests can inject [none] while production uses the
/// conservative defaults.
class CameraHandoffConfiguration {
  const CameraHandoffConfiguration({
    this.afterCameraRelease = const Duration(milliseconds: 500),
    this.afterLiveDisconnect = const Duration(milliseconds: 300),
  });

  const CameraHandoffConfiguration.none()
    : afterCameraRelease = Duration.zero,
      afterLiveDisconnect = Duration.zero;

  final Duration afterCameraRelease;
  final Duration afterLiveDisconnect;
}

typedef CameraHandoffDelay = Future<void> Function(Duration duration);

class CameraCaptureSnapshot {
  const CameraCaptureSnapshot({
    required this.phase,
    required this.permission,
    this.lenses = const [],
    this.activeLensIndex,
    this.minimumZoom = 1,
    this.maximumZoom = 1,
    this.zoom = 1,
    this.errorMessage,
  });

  const CameraCaptureSnapshot.initial()
    : phase = CameraCapturePhase.idle,
      permission = CameraPermissionState.unknown,
      lenses = const [],
      activeLensIndex = null,
      minimumZoom = 1,
      maximumZoom = 1,
      zoom = 1,
      errorMessage = null;

  final CameraCapturePhase phase;
  final CameraPermissionState permission;
  final List<CameraLensInfo> lenses;
  final int? activeLensIndex;
  final double minimumZoom;
  final double maximumZoom;
  final double zoom;
  final String? errorMessage;

  bool get isReady => phase == CameraCapturePhase.ready;
  bool get canSwitchLens => lenses.length > 1;
  bool get canZoom => maximumZoom > minimumZoom;

  CameraLensInfo? get activeLens {
    final index = activeLensIndex;
    if (index == null || index < 0 || index >= lenses.length) return null;
    return lenses[index];
  }

  CameraCaptureSnapshot copyWith({
    CameraCapturePhase? phase,
    CameraPermissionState? permission,
    List<CameraLensInfo>? lenses,
    int? activeLensIndex,
    bool clearActiveLens = false,
    double? minimumZoom,
    double? maximumZoom,
    double? zoom,
    String? errorMessage,
    bool clearError = false,
  }) {
    return CameraCaptureSnapshot(
      phase: phase ?? this.phase,
      permission: permission ?? this.permission,
      lenses: lenses ?? this.lenses,
      activeLensIndex: clearActiveLens
          ? null
          : (activeLensIndex ?? this.activeLensIndex),
      minimumZoom: minimumZoom ?? this.minimumZoom,
      maximumZoom: maximumZoom ?? this.maximumZoom,
      zoom: zoom ?? this.zoom,
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
    );
  }
}

/// A decoded camera frame and the portion below the calibrated water line.
///
/// [encodedBytes] are retained for optional upload/audit. Inference should use
/// [waterRegion] for fish detection and [fullFrame] for turbidity estimation.
class CapturedCameraFrame {
  const CapturedCameraFrame({
    required this.encodedBytes,
    required this.fullFrame,
    required this.waterRegion,
    required this.waterRegionTopPixels,
    required this.waterRegionTopNormalized,
    required this.capturedAt,
  });

  final Uint8List encodedBytes;
  final image.Image fullFrame;
  final image.Image waterRegion;
  final int waterRegionTopPixels;
  final double waterRegionTopNormalized;
  final DateTime capturedAt;

  bool get isCropped => waterRegionTopPixels > 0;
}

abstract interface class CameraCaptureGateway {
  bool get isSupported;

  CameraCaptureSnapshot get snapshot;

  /// Emits every state transition after construction.
  ///
  /// Read [snapshot] first when an immediate value is required.
  Stream<CameraCaptureSnapshot> get states;

  /// Requests permission when [requestPermission] is true, discovers lenses,
  /// and opens the preferred camera.
  Future<CameraCaptureSnapshot> initialize({bool requestPermission = true});

  /// Captures and decodes one still frame. A concurrent capture returns null.
  Future<CapturedCameraFrame?> capture({double? normalizedWaterLineY});

  Future<CameraCaptureSnapshot> switchLens();

  Future<CameraCaptureSnapshot> setZoom(double zoom);

  /// Waits for an in-flight still capture, then releases the camera device.
  /// LiveKit can safely acquire the camera after this completes.
  Future<void> suspend();

  /// Reopens the last selected lens without prompting for permission.
  Future<CameraCaptureSnapshot> resume();

  Future<void> dispose();
}

class CameraCaptureException implements Exception {
  const CameraCaptureException(this.message, [this.cause]);

  final String message;
  final Object? cause;

  @override
  String toString() => cause == null
      ? 'CameraCaptureException: $message'
      : 'CameraCaptureException: $message ($cause)';
}
