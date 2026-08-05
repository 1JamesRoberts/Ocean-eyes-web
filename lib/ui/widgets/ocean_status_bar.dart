import 'dart:async';

import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../core/theme/oceaneyes_tokens.dart';

/// The authored mobile-ui phone chrome. It intentionally lives inside the
/// 393px reference frame so web and deterministic device captures share the
/// same 54px coordinate system.
class OceanStatusBar extends StatefulWidget {
  const OceanStatusBar({super.key});

  @override
  State<OceanStatusBar> createState() => _OceanStatusBarState();
}

class _OceanStatusBarState extends State<OceanStatusBar> {
  late DateTime _now = DateTime.now();
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      final next = DateTime.now();
      if (next.minute != _now.minute && mounted) setState(() => _now = next);
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final minute = _now.minute.toString().padLeft(2, '0');
    return ExcludeSemantics(
      child: SizedBox(
        height: OceanGeometry.statusBarHeight,
        child: ColoredBox(
          color: OceanColors.frame,
          child: Stack(
            children: [
              const Positioned(
                top: 11,
                left: 0,
                right: 0,
                child: Center(
                  child: DecoratedBox(
                    decoration: BoxDecoration(
                      color: Color(0xFF030303),
                      borderRadius: BorderRadius.all(Radius.circular(17.5)),
                    ),
                    child: SizedBox(width: 119, height: 35),
                  ),
                ),
              ),
              Positioned(
                top: 16,
                left: 17.5,
                child: Text(
                  '${_now.hour.toString().padLeft(2, '0')}:$minute',
                  style: const TextStyle(
                    fontFamily: 'Segoe UI',
                    fontSize: 17,
                    height: 22 / 17,
                    fontWeight: FontWeight.w600,
                    letterSpacing: -1,
                    color: OceanColors.white,
                  ),
                ),
              ),
              const Positioned(
                top: 15,
                right: 15,
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      LucideIcons.signal500,
                      size: 16,
                      color: OceanColors.white,
                    ),
                    SizedBox(width: 7),
                    Icon(
                      LucideIcons.wifi500,
                      size: 16,
                      color: OceanColors.white,
                    ),
                    SizedBox(width: 7),
                    SizedBox(
                      width: 25,
                      height: 13,
                      child: CustomPaint(painter: _BatteryPainter()),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _BatteryPainter extends CustomPainter {
  const _BatteryPainter();

  @override
  void paint(Canvas canvas, Size size) {
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        const Rect.fromLTWH(2, 2, 19, 9),
        const Radius.circular(1),
      ),
      Paint()..color = OceanColors.white,
    );
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
