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
  final controller = await bootstrapOceanEyesController();
  runApp(OceanEyesApp(controller: controller, disposeController: true));
}
