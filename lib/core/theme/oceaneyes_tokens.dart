import 'package:flutter/material.dart';

/// Authoritative OceanEyes visual tokens for the Flutter client.
abstract final class OceanColors {
  static const pineTeal = Color(0xFF00584E);
  static const verdigris = Color(0xFF009D8D);
  static const turquoise = Color(0xFF00C8B3);
  static const turquoiseSurf = Color(0xFF00A9CC);
  static const skySurge = Color(0xFF00C0E8);
  static const azureMist = Color(0xFFE5F5F8);
  static const azureMist2 = Color(0xFFDEEFF3);
  static const white = Color(0xFFFFFFFF);
  static const slateGrey = Color(0xFF828E97);
  static const scrollbarThumb = Color(0xFF8D8B8C);
  static const prussianBlue = Color(0xFF051E32);
  static const frame = Color(0xFF1A1A1A);

  static const good = Color(0xFF10B981);
  static const warning = Color(0xFFF59E0B);
  static const critical = Color(0xFFEF4444);

  // Compatibility aliases used by widgets while retaining the exact
  // mobile-ui branch palette.
  static const neonIce = skySurge;
  static const darkCyan = pineTeal;
  static const tropicalTeal = turquoise;
  static const pearlAqua = azureMist2;
  static const goodInk = good;
  static const warningInk = warning;
  static const criticalInk = critical;

  static const canvas = azureMist2;
  static const ink = prussianBlue;
  static const inkMuted = slateGrey;
  static const accent = verdigris;
  static const accentSecondary = turquoise;
  static const action = pineTeal;
  static const navigationActive = pineTeal;
}

abstract final class OceanSpacing {
  static const xxs = 4.0;
  static const xs = 8.0;
  static const sm = 12.0;
  static const md = 16.0;
  static const lg = 20.0;
  static const xl = 24.0;
  static const xxl = 32.0;
}

abstract final class OceanRadii {
  static const card = 32.0;
  static const panel = 24.0;
  static const inline = 12.0;
  static const navigation = 32.0;
  static const navigationItem = 24.0;
  static const pill = 999.0;
}

abstract final class OceanGeometry {
  static const referenceWidth = 393.0;
  static const referenceHeight = 852.0;
  static const statusBarHeight = 54.0;
  static const contentRadius = 20.0;
  static const heroHeight = 221.0;
  static const heroBlendExtension = 56.0;
  static const heroSurfaceTop = 217.0;
  static const heroContentClipStart = 213.0;
  static const heroContentSpacer = 241.0;
  static const contentGutter = 16.0;
  static const navigationHeight = 64.0;
  static const navigationSide = 16.0;
  static const navigationBottom = 12.0;
  static const minimumTouchTarget = 44.0;

  static double navigationHeightFor(BuildContext context) {
    final scaledLabel = MediaQuery.textScalerOf(context).scale(10);
    final extra = (scaledLabel - 10) * 1.5;
    return (navigationHeight + extra).clamp(navigationHeight, 82);
  }
}

abstract final class OceanMotion {
  static const smooth = Duration(milliseconds: 250);
  static const fade = Duration(milliseconds: 200);
  static const sheet = Duration(milliseconds: 180);
  static const donut = Duration(milliseconds: 480);

  static const smoothCurve = Cubic(0.4, 0, 0.2, 1);
  static const emphasizedCurve = Cubic(0.22, 1, 0.36, 1);

  static Duration responsive(BuildContext context, Duration duration) {
    return MediaQuery.maybeOf(context)?.disableAnimations == true
        ? Duration.zero
        : duration;
  }
}

abstract final class OceanTypography {
  static const family = 'Hanken Grotesk';
  static const letterSpacing = -0.16;

  static const title = TextStyle(
    fontFamily: family,
    fontSize: 17,
    height: 1.3,
    fontWeight: FontWeight.w700,
    letterSpacing: -0.17,
    color: OceanColors.ink,
  );

  static const strong = TextStyle(
    fontFamily: family,
    fontSize: 16,
    height: 1.35,
    fontWeight: FontWeight.w600,
    letterSpacing: letterSpacing,
    color: OceanColors.ink,
  );

  static const body = TextStyle(
    fontFamily: family,
    fontSize: 16,
    height: 1.45,
    fontWeight: FontWeight.w400,
    letterSpacing: letterSpacing,
    color: OceanColors.ink,
  );

  static const bodyMuted = TextStyle(
    fontFamily: family,
    fontSize: 16,
    height: 1.45,
    fontWeight: FontWeight.w400,
    letterSpacing: letterSpacing,
    color: OceanColors.inkMuted,
  );

  static const caption = TextStyle(
    fontFamily: family,
    fontSize: 14,
    height: 1.35,
    fontWeight: FontWeight.w500,
    letterSpacing: -0.14,
    color: OceanColors.inkMuted,
  );

  static const section = TextStyle(
    fontFamily: family,
    fontSize: 26,
    height: 1.15,
    fontWeight: FontWeight.w700,
    letterSpacing: -0.26,
    color: OceanColors.ink,
  );
}
