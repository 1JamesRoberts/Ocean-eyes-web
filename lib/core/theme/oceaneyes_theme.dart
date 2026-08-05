import 'package:flutter/material.dart';

import 'oceaneyes_tokens.dart';

abstract final class OceanEyesTheme {
  static ThemeData get light {
    final colorScheme = ColorScheme.fromSeed(
      seedColor: OceanColors.verdigris,
      brightness: Brightness.light,
      primary: OceanColors.action,
      secondary: OceanColors.accentSecondary,
      surface: OceanColors.white,
      error: OceanColors.criticalInk,
    );

    return ThemeData(
      useMaterial3: true,
      fontFamily: OceanTypography.family,
      colorScheme: colorScheme,
      scaffoldBackgroundColor: OceanColors.prussianBlue,
      splashFactory: InkSparkle.splashFactory,
      textTheme: const TextTheme(
        headlineSmall: OceanTypography.section,
        titleMedium: OceanTypography.title,
        bodyMedium: OceanTypography.body,
        bodySmall: OceanTypography.caption,
      ),
      focusColor: OceanColors.pineTeal.withValues(alpha: 0.10),
      dividerColor: OceanColors.slateGrey.withValues(alpha: 0.15),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: OceanColors.white.withValues(alpha: 0.30),
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 14,
          vertical: 10,
        ),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(OceanRadii.inline),
          borderSide: BorderSide(
            width: 0.5,
            color: OceanColors.white.withValues(alpha: 0.30),
          ),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(OceanRadii.inline),
          borderSide: BorderSide(
            width: 0.5,
            color: OceanColors.white.withValues(alpha: 0.30),
          ),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(OceanRadii.inline),
          borderSide: BorderSide(
            width: 0.5,
            color: OceanColors.pineTeal.withValues(alpha: 0.40),
          ),
        ),
        hintStyle: OceanTypography.bodyMuted,
      ),
    );
  }
}
