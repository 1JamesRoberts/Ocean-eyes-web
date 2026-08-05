import 'package:flutter/material.dart';

/// Authoritative OceanEyes visual tokens for the Flutter client.
abstract final class OceanColors {
  static const neonIce = Color(0xFF00FFE5);
  static const turquoise = Color(0xFF00C8B3);
  static const darkCyan = Color(0xFF00645A);
  static const verdigris = Color(0xFF32A198);
  static const tropicalTeal = Color(0xFF79BEB7);
  static const pearlAqua = Color(0xFF9BCBC7);
  static const azureMist = Color(0xFFF4FFFE);
  static const white = Color(0xFFFFFFFF);
  static const slateGrey = Color(0xFF828E97);
  static const prussianBlue = Color(0xFF051E32);

  static const good = Color(0xFF10B981);
  static const warning = Color(0xFFF59E0B);
  static const critical = Color(0xFFEF4444);

  // The mobile-deploy reference uses the same status colors for text and
  // decorative marks.
  static const goodInk = good;
  static const warningInk = warning;
  static const criticalInk = critical;

  static const canvas = azureMist;
  static const ink = prussianBlue;
  static const inkMuted = slateGrey;
  static const accent = verdigris;
  static const accentSecondary = turquoise;
  static const action = prussianBlue;
  static const navigationActive = darkCyan;
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
  static const card = 28.0;
  static const inline = 12.0;
  static const navigation = 32.0;
  static const navigationItem = 24.0;
  static const pill = 999.0;
}

abstract final class OceanGeometry {
  static const referenceWidth = 393.0;
  static const referenceHeight = 852.0;
  static const heroHeight = 221.0;
  static const heroBlendExtension = 56.0;
  // The React shell starts inside a 16 px padded main element. Its rounded
  // viewport is 197 px below that origin and the first content row is another
  // 28 px below the viewport edge.
  static const heroViewportTop = 213.0;
  static const heroContentLeading = 28.0;
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
  static const title = TextStyle(
    fontFamily: 'Inter',
    fontSize: 16,
    height: 1.3,
    fontWeight: FontWeight.w600,
    letterSpacing: -0.16,
    color: OceanColors.ink,
    decoration: TextDecoration.none,
  );

  static const strong = TextStyle(
    fontFamily: 'Inter',
    fontSize: 15,
    height: 1.35,
    fontWeight: FontWeight.w600,
    letterSpacing: -0.15,
    color: OceanColors.ink,
    decoration: TextDecoration.none,
  );

  static const body = TextStyle(
    fontFamily: 'Inter',
    fontSize: 15,
    height: 1.45,
    fontWeight: FontWeight.w400,
    letterSpacing: -0.15,
    color: OceanColors.ink,
    decoration: TextDecoration.none,
  );

  static const bodyMuted = TextStyle(
    fontFamily: 'Inter',
    fontSize: 15,
    height: 1.45,
    fontWeight: FontWeight.w400,
    letterSpacing: -0.15,
    color: OceanColors.inkMuted,
    decoration: TextDecoration.none,
  );

  static const caption = TextStyle(
    fontFamily: 'Inter',
    fontSize: 13,
    height: 1.35,
    fontWeight: FontWeight.w500,
    letterSpacing: -0.13,
    color: OceanColors.inkMuted,
    decoration: TextDecoration.none,
  );

  static const section = TextStyle(
    fontFamily: 'Inter',
    fontSize: 24,
    height: 1.15,
    fontWeight: FontWeight.w700,
    letterSpacing: -0.24,
    color: OceanColors.ink,
    decoration: TextDecoration.none,
  );
}
