import 'package:flutter_test/flutter_test.dart';
import 'package:oceaneyes/integrations/camera/camera_capture_gateway.dart';
import 'package:oceaneyes/integrations/ml/onnx_fish_inference.dart';

void main() {
  test('conditional facades expose platform implementations', () async {
    final camera = ProductionCameraCaptureGateway();
    final inference = OnnxFishInference();

    expect(camera, isA<CameraCaptureGateway>());
    expect(inference, isA<FishInferenceEngine>());
    expect(camera.isSupported, isTrue);

    if (!inference.isSupported) {
      await inference.initialize();
      expect(inference.availability, FishInferenceAvailability.unsupported);
    }

    await camera.dispose();
    await inference.dispose();
  });
}
