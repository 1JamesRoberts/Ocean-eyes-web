import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../core/theme/oceaneyes_tokens.dart';
import '../widgets/glass.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({
    super.key,
    required this.isLoading,
    required this.isExiting,
    required this.onSignIn,
  });

  final bool isLoading;
  final bool isExiting;
  final VoidCallback onSignIn;

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen>
    with SingleTickerProviderStateMixin {
  late final AnimationController _entrance;
  late final CurvedAnimation _curve;

  @override
  void initState() {
    super.initState();
    _entrance = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 550),
    )..forward();
    _curve = CurvedAnimation(
      parent: _entrance,
      curve: OceanMotion.emphasizedCurve,
    );
  }

  @override
  void dispose() {
    _curve.dispose();
    _entrance.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final media = MediaQuery.of(context);
    final exitDuration = media.disableAnimations
        ? Duration.zero
        : const Duration(milliseconds: 250);
    return Semantics(
      container: true,
      scopesRoute: true,
      namesRoute: true,
      explicitChildNodes: true,
      label: 'Smart aquarium monitoring',
      child: AnimatedOpacity(
        opacity: widget.isExiting ? 0 : 1,
        duration: exitDuration,
        curve: Curves.easeIn,
        child: FadeTransition(
          opacity: _curve,
          child: AnimatedBuilder(
            animation: _curve,
            builder: (context, child) => Transform.translate(
              offset: Offset(0, 14 * (1 - _curve.value)),
              child: Transform.scale(
                scale: 0.99 + (0.01 * _curve.value),
                child: child,
              ),
            ),
            child: Stack(
              fit: StackFit.expand,
              children: [
                Image.asset(
                  'assets/images/oceaneyes_login_aquarium.png',
                  fit: BoxFit.cover,
                  alignment: Alignment.center,
                ),
                ColoredBox(
                  color: OceanColors.prussianBlue.withValues(alpha: 0.25),
                ),
                Align(
                  alignment: Alignment.bottomCenter,
                  child: FractionallySizedBox(
                    heightFactor: 0.40,
                    widthFactor: 1,
                    child: DecoratedBox(
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          begin: Alignment.bottomCenter,
                          end: Alignment.topCenter,
                          colors: [
                            OceanColors.prussianBlue.withValues(alpha: 0.75),
                            OceanColors.prussianBlue.withValues(alpha: 0),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
                SafeArea(
                  minimum: const EdgeInsets.fromLTRB(16, 16, 16, 20),
                  child: Center(
                    child: SingleChildScrollView(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          ConstrainedBox(
                            constraints: const BoxConstraints(maxWidth: 345),
                            child: GlassCard(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 24,
                                vertical: 28,
                              ),
                              child: Column(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  const _OceanEyesBrand(),
                                  const SizedBox(height: 28),
                                  Text(
                                    'Smart aquarium monitoring',
                                    textAlign: TextAlign.center,
                                    style: const TextStyle(
                                      fontFamily: 'Inter',
                                      fontSize: 27,
                                      height: 1.08,
                                      fontWeight: FontWeight.w800,
                                      letterSpacing: -1.215,
                                      color: OceanColors.white,
                                      decoration: TextDecoration.none,
                                    ),
                                  ),
                                  const SizedBox(height: 12),
                                  ConstrainedBox(
                                    constraints: const BoxConstraints(
                                      maxWidth: 250,
                                    ),
                                    child: Text(
                                      'Track your aquarium with AI-powered insights.',
                                      textAlign: TextAlign.center,
                                      style: OceanTypography.bodyMuted.copyWith(
                                        color: OceanColors.white.withValues(
                                          alpha: 0.70,
                                        ),
                                      ),
                                    ),
                                  ),
                                  const SizedBox(height: 28),
                                  _GoogleButton(
                                    loading: widget.isLoading,
                                    onPressed: widget.onSignIn,
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _OceanEyesBrand extends StatelessWidget {
  const _OceanEyesBrand();

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: 'OceanEyes',
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const SizedBox(
            width: 80,
            height: 64,
            child: CustomPaint(painter: _OceanEyesMarkPainter()),
          ),
          const SizedBox(height: 4),
          Text.rich(
            const TextSpan(
              children: [
                TextSpan(text: 'Ocean'),
                TextSpan(
                  text: 'Eyes',
                  style: TextStyle(color: OceanColors.turquoise),
                ),
              ],
            ),
            style: const TextStyle(
              fontFamily: 'Inter',
              fontSize: 35,
              height: 1,
              fontWeight: FontWeight.w800,
              letterSpacing: -2.275,
              color: OceanColors.white,
              decoration: TextDecoration.none,
            ),
          ),
        ],
      ),
    );
  }
}

class _GoogleButton extends StatefulWidget {
  const _GoogleButton({required this.loading, required this.onPressed});

  final bool loading;
  final VoidCallback onPressed;

  @override
  State<_GoogleButton> createState() => _GoogleButtonState();
}

class _GoogleButtonState extends State<_GoogleButton>
    with SingleTickerProviderStateMixin {
  bool _hovered = false;
  bool _pressed = false;
  late final AnimationController _spinner;

  @override
  void initState() {
    super.initState();
    _spinner = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 900),
    );
    if (widget.loading) _spinner.repeat();
  }

  @override
  void didUpdateWidget(covariant _GoogleButton oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.loading == oldWidget.loading) return;
    if (widget.loading) {
      _spinner.repeat();
    } else {
      _spinner
        ..stop()
        ..value = 0;
    }
  }

  @override
  void dispose() {
    _spinner.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final lifted = _hovered && !_pressed && !widget.loading;
    return Semantics(
      button: true,
      enabled: !widget.loading,
      label: widget.loading ? 'Connecting to Google' : 'Continue with Google',
      child: AnimatedSlide(
        duration: OceanMotion.smooth,
        curve: OceanMotion.smoothCurve,
        offset: lifted ? const Offset(0, -2 / 56) : Offset.zero,
        child: ConstrainedBox(
          constraints: const BoxConstraints(minHeight: 56),
          child: AnimatedContainer(
            duration: OceanMotion.smooth,
            curve: OceanMotion.smoothCurve,
            decoration: BoxDecoration(
              color: OceanColors.white,
              borderRadius: BorderRadius.circular(OceanRadii.inline),
              border: Border.all(color: OceanColors.white),
              boxShadow: [
                BoxShadow(
                  color: OceanColors.prussianBlue.withValues(
                    alpha: lifted ? 0.25 : 0.20,
                  ),
                  blurRadius: lifted ? 16 : 12,
                  offset: Offset(0, lifted ? 6 : 4),
                ),
              ],
            ),
            child: Material(
              color: Colors.transparent,
              borderRadius: BorderRadius.circular(OceanRadii.inline),
              child: InkWell(
                onTap: widget.loading ? null : widget.onPressed,
                onHover: (value) => setState(() => _hovered = value),
                onHighlightChanged: (value) => setState(() => _pressed = value),
                mouseCursor: widget.loading
                    ? SystemMouseCursors.wait
                    : SystemMouseCursors.click,
                borderRadius: BorderRadius.circular(OceanRadii.inline),
                child: Padding(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 20,
                    vertical: 12,
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      if (widget.loading)
                        SizedBox.square(
                          dimension: 24,
                          child: RotationTransition(
                            turns: _spinner,
                            child: const Icon(
                              LucideIcons.loaderCircle,
                              size: 24,
                              color: OceanColors.darkCyan,
                            ),
                          ),
                        )
                      else
                        const SizedBox.square(
                          dimension: 24,
                          child: CustomPaint(painter: _GoogleMarkPainter()),
                        ),
                      const SizedBox(width: 12),
                      Flexible(
                        child: FittedBox(
                          fit: BoxFit.scaleDown,
                          child: Text(
                            widget.loading
                                ? 'Connecting…'
                                : 'Continue with Google',
                            style: OceanTypography.strong.copyWith(
                              color: OceanColors.ink,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _OceanEyesMarkPainter extends CustomPainter {
  const _OceanEyesMarkPainter();

  @override
  void paint(Canvas canvas, Size size) {
    canvas.save();
    canvas.scale(size.width / 96, size.height / 76);
    final upper = Path()
      ..moveTo(10, 39)
      ..cubicTo(22, 20, 48, 12, 75, 25)
      ..cubicTo(81, 28, 86, 32, 90, 37)
      ..cubicTo(81, 33, 72, 31, 63, 31)
      ..cubicTo(45, 31, 29, 39, 18, 54)
      ..lineTo(10, 39)
      ..close();
    final lower = Path()
      ..moveTo(8, 50)
      ..cubicTo(28, 68, 55, 70, 81, 57)
      ..cubicTo(87, 54, 91, 51, 95, 47)
      ..cubicTo(83, 52, 71, 53, 60, 52)
      ..cubicTo(42, 50, 29, 43, 16, 33);
    void stroke(Path path, Color color) {
      canvas.drawPath(
        path,
        Paint()
          ..style = PaintingStyle.stroke
          ..strokeWidth = 6
          ..strokeCap = StrokeCap.round
          ..strokeJoin = StrokeJoin.round
          ..color = color,
      );
    }

    canvas.save();
    canvas.translate(0, 8);
    final shadow = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 6
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round
      ..color = OceanColors.turquoise.withValues(alpha: 0.24)
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 9);
    canvas.drawPath(upper, shadow);
    canvas.drawPath(lower, shadow);
    canvas.drawCircle(const Offset(49, 37), 11, shadow);
    final bubbleShadow = Paint()
      ..color = OceanColors.turquoise.withValues(alpha: 0.24)
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 9);
    canvas
      ..drawCircle(const Offset(78, 12), 4, bubbleShadow)
      ..drawCircle(const Offset(88, 21), 2.75, bubbleShadow)
      ..drawCircle(const Offset(85, 4), 2, bubbleShadow);
    canvas.restore();

    stroke(upper, OceanColors.turquoise);
    canvas.drawCircle(
      const Offset(49, 37),
      11,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 6
        ..color = OceanColors.turquoise,
    );
    stroke(lower, OceanColors.neonIce);
    final bubbles = Paint()..color = OceanColors.turquoise;
    canvas
      ..drawCircle(const Offset(78, 12), 4, bubbles)
      ..drawCircle(const Offset(88, 21), 2.75, bubbles)
      ..drawCircle(const Offset(85, 4), 2, bubbles)
      ..restore();
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

class _GoogleMarkPainter extends CustomPainter {
  const _GoogleMarkPainter();

  @override
  void paint(Canvas canvas, Size size) {
    canvas.save();
    canvas.scale(size.width / 24, size.height / 24);
    final blue = Path()
      ..moveTo(21.6, 12.23)
      ..relativeCubicTo(0, -0.71, -0.06, -1.4, -0.18, -2.07)
      ..lineTo(12, 10.16)
      ..lineTo(12, 14.08)
      ..lineTo(17.38, 14.08)
      ..relativeCubicTo(-0.24, 1.27, -0.93, 2.35, -2, 3.02)
      ..lineTo(15.38, 19.64)
      ..lineTo(18.62, 19.64)
      ..relativeCubicTo(1.9, -1.75, 2.98, -4.33, 2.98, -7.41)
      ..close();
    final green = Path()
      ..moveTo(12, 22)
      ..relativeCubicTo(2.7, 0, 4.97, -0.9, 6.62, -2.36)
      ..lineTo(15.38, 17.1)
      ..relativeCubicTo(-0.9, 0.6, -2.05, 0.96, -3.38, 0.96)
      ..relativeCubicTo(-2.61, 0, -4.82, -1.76, -5.61, -4.13)
      ..lineTo(3.04, 16.55)
      ..arcToPoint(
        const Offset(12, 22),
        radius: const Radius.circular(10),
        clockwise: false,
      )
      ..close();
    final yellow = Path()
      ..moveTo(6.39, 13.93)
      ..arcToPoint(
        const Offset(6.08, 12),
        radius: const Radius.circular(6),
        clockwise: false,
      )
      ..relativeCubicTo(0, -0.67, 0.11, -1.32, 0.31, -1.93)
      ..lineTo(6.39, 7.45)
      ..lineTo(3.04, 7.45)
      ..arcToPoint(
        const Offset(2, 12),
        radius: const Radius.circular(10),
        clockwise: false,
      )
      ..relativeCubicTo(0, 1.63, 0.39, 3.17, 1.04, 4.55)
      ..lineTo(6.39, 13.93)
      ..close();
    final red = Path()
      ..moveTo(12, 5.94)
      ..relativeCubicTo(1.47, 0, 2.79, 0.5, 3.83, 1.5)
      ..lineTo(18.7, 4.56)
      ..arcToPoint(
        const Offset(12, 2),
        radius: const Radius.circular(9.63),
        clockwise: false,
      )
      ..arcToPoint(
        const Offset(3.04, 7.45),
        radius: const Radius.circular(10),
        clockwise: false,
      )
      ..lineTo(6.39, 10.07)
      ..relativeCubicTo(0.79, -2.37, 3, -4.13, 5.61, -4.13)
      ..close();
    canvas
      ..drawPath(blue, Paint()..color = const Color(0xFF4285F4))
      ..drawPath(green, Paint()..color = const Color(0xFF34A853))
      ..drawPath(yellow, Paint()..color = const Color(0xFFFBBC05))
      ..drawPath(red, Paint()..color = const Color(0xFFEA4335))
      ..restore();
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
