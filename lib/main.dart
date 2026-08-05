import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'app/oceaneyes_app.dart';
import 'core/theme/oceaneyes_tokens.dart';
import 'view_models/oceaneyes_controller.dart';

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
  final controller = await OceanEyesController.bootstrap();
  runApp(OceanEyesApp(controller: controller));
}
