import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'app/oceaneyes_app.dart';
import 'app/oceaneyes_bootstrap.dart';
import 'core/theme/oceaneyes_tokens.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.light,
      systemNavigationBarColor: OceanColors.prussianBlue,
      systemNavigationBarIconBrightness: Brightness.light,
    ),
  );
  try {
    final controller = await bootstrapOceanEyesController();
    runApp(OceanEyesApp(controller: controller, disposeController: true));
  } on OceanEyesBootstrapException catch (error) {
    runApp(OceanEyesStartupErrorApp(message: error.message));
  } catch (error, stackTrace) {
    debugPrint('OceanEyes startup failed: $error\n$stackTrace');
    runApp(
      const OceanEyesStartupErrorApp(
        message: 'OceanEyes could not start. Check the app configuration.',
      ),
    );
  }
}
