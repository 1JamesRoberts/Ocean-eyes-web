import 'dart:async';

import 'package:cloud_functions/cloud_functions.dart';
import 'package:livekit_client/livekit_client.dart';

enum OceanEyesLiveRole { viewer, monitor }

enum OceanEyesLiveConnectionState {
  disconnected,
  connecting,
  connected,
  reconnecting,
  failed,
}

class OceanEyesLiveSnapshot {
  const OceanEyesLiveSnapshot({
    required this.state,
    this.remoteVideoTrack,
    this.error,
  });

  final OceanEyesLiveConnectionState state;
  final Object? remoteVideoTrack;
  final Object? error;
}

abstract interface class OceanEyesLiveGateway {
  Stream<OceanEyesLiveSnapshot> get snapshots;

  OceanEyesLiveSnapshot get current;

  bool get isConnected;

  Future<void> connect(
    String tankId, {
    required OceanEyesLiveRole role,
    bool useFrontCamera = false,
  });

  Future<void> disconnect();

  Future<void> dispose();
}

/// One LiveKit room session. Tokens are always minted by the authenticated
/// callable Function; API secrets never enter the client.
class LiveKitGateway implements OceanEyesLiveGateway {
  LiveKitGateway({FirebaseFunctions? functions, Room Function()? roomFactory})
    : _functions = functions ?? FirebaseFunctions.instance,
      _roomFactory = roomFactory ?? Room.new;

  final FirebaseFunctions _functions;
  final Room Function() _roomFactory;
  final StreamController<OceanEyesLiveSnapshot> _snapshots =
      StreamController<OceanEyesLiveSnapshot>.broadcast();
  Room? _room;
  EventsListener<RoomEvent>? _listener;
  VideoTrack? _remoteVideoTrack;
  OceanEyesLiveConnectionState _state =
      OceanEyesLiveConnectionState.disconnected;
  Object? _lastError;

  @override
  Stream<OceanEyesLiveSnapshot> get snapshots => _snapshots.stream;

  @override
  OceanEyesLiveSnapshot get current => OceanEyesLiveSnapshot(
    state: _state,
    remoteVideoTrack: _remoteVideoTrack,
    error: _lastError,
  );
  @override
  bool get isConnected => _state == OceanEyesLiveConnectionState.connected;

  @override
  Future<void> connect(
    String tankId, {
    required OceanEyesLiveRole role,
    bool useFrontCamera = false,
  }) async {
    if (tankId.trim().isEmpty) {
      throw ArgumentError.value(tankId, 'tankId', 'Cannot be empty');
    }
    await disconnect();
    _setState(OceanEyesLiveConnectionState.connecting);

    try {
      final response = await _functions.httpsCallable('getLiveKitToken').call({
        'tankId': tankId.trim(),
        'role': role.name,
      });
      final data = Map<String, Object?>.from(response.data as Map);
      final token = data['token'];
      final url = data['url'];
      if (token is! String || token.isEmpty || url is! String || url.isEmpty) {
        throw StateError('LiveKit token function returned an invalid payload.');
      }

      final room = _roomFactory();
      final listener = room.createListener();
      _room = room;
      _listener = listener;
      listener
        ..on<TrackSubscribedEvent>((event) {
          if (event.track is VideoTrack) {
            _remoteVideoTrack = event.track as VideoTrack;
            _emit();
          }
        })
        ..on<TrackUnsubscribedEvent>((event) {
          if (identical(_remoteVideoTrack, event.track)) {
            _remoteVideoTrack = null;
            _emit();
          }
        })
        ..on<RoomReconnectingEvent>((_) {
          _setState(OceanEyesLiveConnectionState.reconnecting);
        })
        ..on<RoomReconnectedEvent>((_) {
          _setState(OceanEyesLiveConnectionState.connected);
          _pickExistingRemoteVideo();
        })
        ..on<RoomDisconnectedEvent>((event) {
          _remoteVideoTrack = null;
          _setState(
            OceanEyesLiveConnectionState.disconnected,
            error: event.reason,
          );
        });

      await room.connect(url, token);
      if (role == OceanEyesLiveRole.monitor) {
        await room.localParticipant?.setCameraEnabled(
          true,
          cameraCaptureOptions: CameraCaptureOptions(
            cameraPosition: useFrontCamera
                ? CameraPosition.front
                : CameraPosition.back,
          ),
        );
      } else {
        _pickExistingRemoteVideo();
      }
      _setState(OceanEyesLiveConnectionState.connected);
    } catch (error) {
      _lastError = error;
      await _cleanRoom();
      _setState(OceanEyesLiveConnectionState.failed, error: error);
      rethrow;
    }
  }

  void _pickExistingRemoteVideo() {
    final room = _room;
    if (room == null) return;
    for (final participant in room.remoteParticipants.values) {
      for (final publication in participant.videoTrackPublications) {
        final track = publication.track;
        if (track != null) {
          _remoteVideoTrack = track;
          _emit();
          return;
        }
      }
    }
  }

  @override
  Future<void> disconnect() async {
    await _cleanRoom();
    _remoteVideoTrack = null;
    _lastError = null;
    _setState(OceanEyesLiveConnectionState.disconnected);
  }

  Future<void> _cleanRoom() async {
    await _listener?.dispose();
    _listener = null;
    final room = _room;
    _room = null;
    if (room != null) {
      await room.disconnect();
      await room.dispose();
    }
  }

  void _setState(OceanEyesLiveConnectionState state, {Object? error}) {
    _state = state;
    _lastError = error;
    _emit();
  }

  void _emit() {
    if (!_snapshots.isClosed) _snapshots.add(current);
  }

  @override
  Future<void> dispose() async {
    await _cleanRoom();
    await _snapshots.close();
  }
}
