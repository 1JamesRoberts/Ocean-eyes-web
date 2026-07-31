import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../core/theme/oceaneyes_tokens.dart';
import '../../models/aquarium_models.dart';

class HealthScoreRing extends StatelessWidget {
  const HealthScoreRing({super.key, required this.score, this.size = 116});

  final int score;
  final double size;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: 'Aquarium health score $score out of 100',
      readOnly: true,
      child: SizedBox.square(
        dimension: size,
        child: Stack(
          alignment: Alignment.center,
          children: [
            CustomPaint(
              size: Size.square(size),
              painter: _HealthRingPainter(progress: score / 100),
            ),
            SizedBox(
              width: size - 28,
              child: FittedBox(
                fit: BoxFit.scaleDown,
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      '$score',
                      style: OceanTypography.section.copyWith(
                        fontSize: 40,
                        height: 1,
                      ),
                    ),
                    Padding(
                      padding: const EdgeInsets.only(bottom: 4),
                      child: Text('/100', style: OceanTypography.caption),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _HealthRingPainter extends CustomPainter {
  const _HealthRingPainter({required this.progress});

  final double progress;

  @override
  void paint(Canvas canvas, Size size) {
    final center = size.center(Offset.zero);
    final radius = size.shortestSide / 2 - 8;
    canvas.drawCircle(
      center,
      radius,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 11
        ..color = OceanColors.white.withValues(alpha: 0.58),
    );
    final rect = Rect.fromCircle(center: center, radius: radius);
    final paint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 9
      ..strokeCap = StrokeCap.round
      ..shader = const SweepGradient(
        colors: [OceanColors.verdigris, OceanColors.neonIce],
      ).createShader(rect);
    canvas.drawArc(
      rect,
      -math.pi / 2,
      math.pi * 2 * progress.clamp(0, 1),
      false,
      paint,
    );
  }

  @override
  bool shouldRepaint(covariant _HealthRingPainter oldDelegate) {
    return oldDelegate.progress != progress;
  }
}

class VisibilityRing extends StatelessWidget {
  const VisibilityRing({
    super.key,
    required this.progress,
    this.size = 44,
    this.showLabel = true,
  });

  final double progress;
  final double size;
  final bool showLabel;

  Color get _color {
    if (progress >= 0.8) return const Color(0xFF16A34A);
    if (progress >= 0.5) return const Color(0xFFD97706);
    return const Color(0xFFDC2626);
  }

  @override
  Widget build(BuildContext context) {
    final percent = (progress * 100).round();
    return Semantics(
      label: '$percent percent of expected fish visible',
      child: SizedBox.square(
        dimension: size,
        child: Stack(
          alignment: Alignment.center,
          children: [
            CircularProgressIndicator(
              value: progress.clamp(0, 1),
              strokeWidth: size < 40 ? 3 : 4,
              strokeCap: StrokeCap.round,
              color: _color,
              backgroundColor: OceanColors.white.withValues(alpha: 0.45),
            ),
            if (showLabel)
              Text(
                '$percent%',
                style: OceanTypography.caption.copyWith(
                  fontSize: size < 40 ? 8 : 9,
                  color: OceanColors.ink,
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class SpeciesDonut extends StatelessWidget {
  const SpeciesDonut({super.key, required this.fish, this.size = 165});

  final List<FishEntry> fish;
  final double size;

  static const colors = [
    OceanColors.turquoise,
    OceanColors.verdigris,
    OceanColors.neonIce,
    Color(0xFFF59E0B),
    Color(0xFF8B5CF6),
    Color(0xFF3B82F6),
  ];

  @override
  Widget build(BuildContext context) {
    final total = fish.fold<int>(0, (sum, entry) => sum + entry.count);
    if (total == 0) {
      return SizedBox(
        height: 200,
        child: Center(
          child: Text(
            'No fish data available',
            style: OceanTypography.bodyMuted,
          ),
        ),
      );
    }
    return Semantics(
      label:
          '$total total fish across ${fish.length} species. ${fish.map((entry) => '${entry.name}: ${entry.count}').join(', ')}',
      child: SizedBox.square(
        dimension: size,
        child: Stack(
          alignment: Alignment.center,
          children: [
            CustomPaint(
              size: Size.square(size),
              painter: _DonutPainter(
                values: fish.map((entry) => entry.count).toList(),
                colors: colors,
              ),
            ),
            Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  '$total',
                  style: OceanTypography.section.copyWith(fontSize: 28),
                ),
                Text(
                  'Total Fish',
                  style: OceanTypography.caption.copyWith(fontSize: 11),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _DonutPainter extends CustomPainter {
  const _DonutPainter({required this.values, required this.colors});

  final List<int> values;
  final List<Color> colors;

  @override
  void paint(Canvas canvas, Size size) {
    final total = values.fold<int>(0, (sum, value) => sum + value);
    if (total == 0) return;
    final strokeWidth = size.shortestSide * 0.096;
    final rect = Rect.fromCircle(
      center: size.center(Offset.zero),
      radius: size.shortestSide / 2 - strokeWidth,
    );
    var start = -math.pi / 2;
    const separator = 0.025;
    for (var index = 0; index < values.length; index += 1) {
      final sweep = math.pi * 2 * values[index] / total;
      canvas.drawArc(
        rect,
        start + separator / 2,
        math.max(0, sweep - separator),
        false,
        Paint()
          ..style = PaintingStyle.stroke
          ..strokeWidth = strokeWidth
          ..strokeCap = StrokeCap.butt
          ..color = colors[index % colors.length],
      );
      start += sweep;
    }
  }

  @override
  bool shouldRepaint(covariant _DonutPainter oldDelegate) =>
      oldDelegate.values != values;
}

class OceanLineChart extends StatelessWidget {
  const OceanLineChart({
    super.key,
    required this.points,
    required this.semanticLabel,
    this.color = OceanColors.verdigris,
    this.height = 180,
    this.fill = true,
    this.showValueLabels = false,
    this.minimumY,
  });

  final List<ChartPoint> points;
  final String semanticLabel;
  final Color color;
  final double height;
  final bool fill;
  final bool showValueLabels;
  final double? minimumY;

  @override
  Widget build(BuildContext context) {
    if (points.isEmpty) {
      return _EmptyChart(semanticLabel: semanticLabel, height: height);
    }
    return Semantics(
      label:
          '$semanticLabel. ${points.map((point) => '${point.label}: ${point.value.toStringAsFixed(1)}').join(', ')}',
      image: true,
      child: SizedBox(
        width: double.infinity,
        height: height,
        child: CustomPaint(
          painter: _LineChartPainter(
            points: points,
            color: color,
            fill: fill,
            showValueLabels: showValueLabels,
            minimumY: minimumY,
            textDirection: Directionality.of(context),
          ),
        ),
      ),
    );
  }
}

class _EmptyChart extends StatelessWidget {
  const _EmptyChart({required this.semanticLabel, required this.height});

  final String semanticLabel;
  final double height;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      container: true,
      image: true,
      label: '$semanticLabel. No data available.',
      child: ExcludeSemantics(
        child: SizedBox(
          width: double.infinity,
          height: height,
          child: Center(
            child: Text('No data available', style: OceanTypography.bodyMuted),
          ),
        ),
      ),
    );
  }
}

class _LineChartPainter extends CustomPainter {
  const _LineChartPainter({
    required this.points,
    required this.color,
    required this.fill,
    required this.showValueLabels,
    required this.minimumY,
    required this.textDirection,
  });

  final List<ChartPoint> points;
  final Color color;
  final bool fill;
  final bool showValueLabels;
  final double? minimumY;
  final TextDirection textDirection;

  @override
  void paint(Canvas canvas, Size size) {
    if (points.isEmpty || size.width <= 40 || size.height <= 40) return;
    const left = 20.0;
    const right = 12.0;
    final top = showValueLabels ? 28.0 : 16.0;
    const bottom = 24.0;
    final plot = Rect.fromLTRB(
      left,
      top,
      size.width - right,
      size.height - bottom,
    );
    final rawMax = points.map((point) => point.value).reduce(math.max);
    final rawMin = points.map((point) => point.value).reduce(math.min);
    final maxY = math.max(minimumY ?? rawMax, rawMax).ceilToDouble();
    final minY = minimumY == null ? math.min(0, rawMin) : 0.0;
    final range = math.max(1, maxY - minY);

    final gridPaint = Paint()
      ..color = OceanColors.slateGrey.withValues(alpha: 0.15)
      ..strokeWidth = 0.7;
    for (var row = 0; row <= 2; row += 1) {
      final y = plot.top + plot.height * row / 2;
      canvas.drawLine(Offset(plot.left, y), Offset(plot.right, y), gridPaint);
    }
    for (var column = 0; column < points.length; column += 1) {
      final x = points.length == 1
          ? plot.left
          : plot.left + plot.width * column / (points.length - 1);
      canvas.drawLine(Offset(x, plot.top), Offset(x, plot.bottom), gridPaint);
    }

    final offsets = <Offset>[];
    for (var index = 0; index < points.length; index += 1) {
      final x = points.length == 1
          ? plot.left
          : plot.left + plot.width * index / (points.length - 1);
      final normalized = (points[index].value - minY) / range;
      final y = plot.bottom - plot.height * normalized;
      offsets.add(Offset(x, y));
    }

    final path = Path()..moveTo(offsets.first.dx, offsets.first.dy);
    for (final offset in offsets.skip(1)) {
      path.lineTo(offset.dx, offset.dy);
    }
    if (fill) {
      final fillPath = Path.from(path)
        ..lineTo(offsets.last.dx, plot.bottom)
        ..lineTo(offsets.first.dx, plot.bottom)
        ..close();
      canvas.drawPath(
        fillPath,
        Paint()
          ..shader = LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [color.withValues(alpha: 0.30), color.withValues(alpha: 0)],
          ).createShader(plot),
      );
    }
    canvas.drawPath(
      path,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 2.5
        ..strokeCap = StrokeCap.round
        ..strokeJoin = StrokeJoin.round
        ..color = color,
    );
    for (var index = 0; index < offsets.length; index += 1) {
      canvas.drawCircle(offsets[index], 5, Paint()..color = OceanColors.white);
      canvas.drawCircle(offsets[index], 3, Paint()..color = color);
      if (showValueLabels) {
        _paintText(
          canvas,
          points[index].value.toStringAsFixed(1),
          offsets[index] - const Offset(0, 17),
          9,
          FontWeight.w700,
        );
      }
      if (index == 0 || index == offsets.length - 1 || index.isOdd) {
        _paintText(
          canvas,
          points[index].label,
          Offset(offsets[index].dx, plot.bottom + 13),
          9,
          FontWeight.w500,
        );
      }
    }
  }

  void _paintText(
    Canvas canvas,
    String value,
    Offset center,
    double fontSize,
    FontWeight weight,
  ) {
    final painter = TextPainter(
      text: TextSpan(
        text: value,
        style: TextStyle(
          fontFamily: 'Inter',
          fontSize: fontSize,
          color: OceanColors.inkMuted,
          fontWeight: weight,
        ),
      ),
      textDirection: textDirection,
    )..layout();
    painter.paint(
      canvas,
      Offset(center.dx - painter.width / 2, center.dy - painter.height / 2),
    );
  }

  @override
  bool shouldRepaint(covariant _LineChartPainter oldDelegate) =>
      oldDelegate.points != points ||
      oldDelegate.color != color ||
      oldDelegate.showValueLabels != showValueLabels;
}

class OceanBarChart extends StatelessWidget {
  const OceanBarChart({
    super.key,
    required this.points,
    required this.semanticLabel,
    this.height = 180,
  });

  final List<ChartPoint> points;
  final String semanticLabel;
  final double height;

  @override
  Widget build(BuildContext context) {
    if (points.isEmpty) {
      return _EmptyChart(semanticLabel: semanticLabel, height: height);
    }
    return Semantics(
      label:
          '$semanticLabel. ${points.map((point) => '${point.label}: ${point.value.round()} fish').join(', ')}',
      image: true,
      child: SizedBox(
        width: double.infinity,
        height: height,
        child: CustomPaint(
          painter: _BarChartPainter(
            points: points,
            textDirection: Directionality.of(context),
          ),
        ),
      ),
    );
  }
}

class _BarChartPainter extends CustomPainter {
  const _BarChartPainter({required this.points, required this.textDirection});

  final List<ChartPoint> points;
  final TextDirection textDirection;

  @override
  void paint(Canvas canvas, Size size) {
    if (points.isEmpty || size.width <= 40 || size.height <= 40) return;
    const plot = EdgeInsets.fromLTRB(28, 12, 8, 24);
    final rect = Rect.fromLTRB(
      plot.left,
      plot.top,
      size.width - plot.right,
      size.height - plot.bottom,
    );
    final maxY = math.max(
      1,
      points.map((point) => point.value).reduce(math.max),
    );
    final grid = Paint()
      ..color = OceanColors.slateGrey.withValues(alpha: 0.15)
      ..strokeWidth = 0.7;
    for (var row = 0; row <= 3; row += 1) {
      final y = rect.top + rect.height * row / 3;
      canvas.drawLine(Offset(rect.left, y), Offset(rect.right, y), grid);
    }
    final slot = rect.width / points.length;
    final barWidth = slot * 0.58;
    for (var index = 0; index < points.length; index += 1) {
      final height = rect.height * points[index].value / maxY;
      final left = rect.left + slot * index + (slot - barWidth) / 2;
      final bar = RRect.fromRectAndCorners(
        Rect.fromLTWH(left, rect.bottom - height, barWidth, height),
        topLeft: const Radius.circular(3),
        topRight: const Radius.circular(3),
      );
      canvas.drawRRect(
        bar,
        Paint()
          ..shader = const LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [OceanColors.turquoise, OceanColors.verdigris],
          ).createShader(bar.outerRect),
      );
      if (index == 0 || index == points.length - 1 || index.isOdd) {
        final painter = TextPainter(
          text: TextSpan(
            text: points[index].label,
            style: const TextStyle(
              fontFamily: 'Inter',
              fontSize: 9,
              color: OceanColors.inkMuted,
            ),
          ),
          textDirection: textDirection,
        )..layout();
        painter.paint(
          canvas,
          Offset(left + barWidth / 2 - painter.width / 2, rect.bottom + 7),
        );
      }
    }
  }

  @override
  bool shouldRepaint(covariant _BarChartPainter oldDelegate) =>
      oldDelegate.points != points;
}

class HeatmapOverlay extends StatelessWidget {
  const HeatmapOverlay({super.key, required this.visible});

  final bool visible;

  @override
  Widget build(BuildContext context) {
    return IgnorePointer(
      child: AnimatedOpacity(
        opacity: visible ? 0.55 : 0,
        duration: OceanMotion.responsive(
          context,
          const Duration(milliseconds: 500),
        ),
        child: const RepaintBoundary(
          child: CustomPaint(painter: _HeatmapPainter()),
        ),
      ),
    );
  }
}

class _HeatmapPainter extends CustomPainter {
  const _HeatmapPainter();

  static const centers = <Offset>[
    Offset(0.15, 0.28),
    Offset(0.28, 0.62),
    Offset(0.46, 0.47),
    Offset(0.61, 0.36),
    Offset(0.72, 0.61),
    Offset(0.83, 0.27),
    Offset(0.9, 0.70),
  ];

  @override
  void paint(Canvas canvas, Size size) {
    for (var index = 0; index < centers.length; index += 1) {
      final center = Offset(
        centers[index].dx * size.width,
        centers[index].dy * size.height,
      );
      final radius = size.width * (index.isEven ? 0.13 : 0.10);
      canvas.drawCircle(
        center,
        radius,
        Paint()
          ..shader = RadialGradient(
            colors: [
              const Color(0xFFFF2D2D).withValues(alpha: 0.95),
              const Color(0xFFFFE600).withValues(alpha: 0.72),
              const Color(0xFF00D7FF).withValues(alpha: 0.35),
              const Color(0xFF001B8F).withValues(alpha: 0),
            ],
          ).createShader(Rect.fromCircle(center: center, radius: radius)),
      );
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
