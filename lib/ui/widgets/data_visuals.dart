import 'dart:async';
import 'dart:math' as math;
import 'dart:typed_data';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

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
            SizedBox.square(
              dimension: size * 0.8,
              child: FittedBox(
                fit: BoxFit.scaleDown,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      '$score',
                      style: OceanTypography.section.copyWith(
                        fontSize: 42.4,
                        height: 1,
                        letterSpacing: -2.544,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '/100',
                      style: OceanTypography.caption.copyWith(height: 1),
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
    final scale = size.shortestSide / 112;
    final radius = 50 * scale;
    final strokeWidth = 9 * scale;
    canvas.drawCircle(
      center,
      radius,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = strokeWidth
        ..color = OceanColors.azureMist,
    );
    final rect = Rect.fromCircle(center: center, radius: radius);
    final paint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth
      ..strokeCap = StrokeCap.round
      ..shader = const LinearGradient(
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
        colors: [OceanColors.turquoiseSurf, OceanColors.verdigris],
      ).createShader(rect);
    canvas.drawArc(
      rect,
      math.pi,
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
    final ring = SizedBox.square(
      dimension: size,
      child: Stack(
        alignment: Alignment.center,
        children: [
          CircularProgressIndicator(
            value: progress.clamp(0, 1),
            strokeWidth: 5,
            strokeCap: StrokeCap.round,
            color: _color,
            backgroundColor: OceanColors.azureMist,
          ),
          Icon(LucideIcons.eye, size: size * 0.36, color: _color),
        ],
      ),
    );
    return Semantics(
      label: '$percent percent of expected fish visible',
      child: showLabel
          ? Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                ring,
                const SizedBox(width: 10),
                ConstrainedBox(
                  constraints: const BoxConstraints(minWidth: 36),
                  child: Text(
                    '$percent%',
                    style: OceanTypography.strong.copyWith(color: _color),
                  ),
                ),
              ],
            )
          : ring,
    );
  }
}

class SpeciesDonut extends StatelessWidget {
  const SpeciesDonut({super.key, required this.fish, this.size = 165});

  final List<FishEntry> fish;
  final double size;

  static const fallbackColors = [
    OceanColors.turquoise,
    OceanColors.verdigris,
    OceanColors.skySurge,
    OceanColors.warning,
    Color(0xFF8B5CF6),
    Color(0xFF3B82F6),
  ];

  static Color colorFor(FishEntry fish, int index) => switch (fish.speciesId) {
    'angelfish' => const Color(0xFFE8D5B7),
    'betta' => const Color(0xFFFFB6C1),
    'cardinal_tetra' => const Color(0xFF4169E1),
    'cherry_barb' => const Color(0xFFDC143C),
    'corydoras' => const Color(0xFFDAA520),
    'dwarf_gourami' => const Color(0xFF20B2AA),
    'guppy' => const Color(0xFFFF69B4),
    'neon_tetra' => const Color(0xFF00CED1),
    _ => fallbackColors[index % fallbackColors.length],
  };

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
                colors: [
                  for (var index = 0; index < fish.length; index += 1)
                    colorFor(fish[index], index),
                ],
              ),
            ),
            Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  '$total',
                  style: OceanTypography.section.copyWith(
                    fontSize: 28,
                    letterSpacing: -0.28,
                  ),
                ),
                Text(
                  'Total Fish',
                  style: OceanTypography.caption.copyWith(
                    fontSize: 11,
                    letterSpacing: -0.11,
                  ),
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
          fontFamily: OceanTypography.family,
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
            colors: [OceanColors.verdigris, OceanColors.pineTeal],
          ).createShader(bar.outerRect),
      );
      if (index == 0 || index == points.length - 1 || index.isOdd) {
        final painter = TextPainter(
          text: TextSpan(
            text: points[index].label,
            style: const TextStyle(
              fontFamily: OceanTypography.family,
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

class HeatmapOverlay extends StatefulWidget {
  const HeatmapOverlay({
    super.key,
    required this.centers,
    required this.sourceDimensions,
    required this.visible,
  });

  final List<NormalizedDetectionCenter> centers;
  final DetectionFrameDimensions sourceDimensions;
  final bool visible;

  @override
  State<HeatmapOverlay> createState() => _HeatmapOverlayState();
}

class _HeatmapOverlayState extends State<HeatmapOverlay> {
  ui.Image? _texture;
  _HeatmapTextureKey? _requestedKey;
  _HeatmapTextureKey? _resolvedKey;
  int _generation = 0;

  @override
  void dispose() {
    _generation += 1;
    _texture?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final size = constraints.biggest;
        if (!size.width.isFinite ||
            !size.height.isFinite ||
            size.width <= 0 ||
            size.height <= 0) {
          return const SizedBox.shrink();
        }

        final key = _HeatmapTextureKey.fromWidget(size, widget);
        _ensureTexture(key);
        final texture = _resolvedKey == key ? _texture : null;

        return ExcludeSemantics(
          child: IgnorePointer(
            child: AnimatedOpacity(
              opacity: widget.visible ? 1 : 0,
              curve: Curves.easeInOut,
              duration: OceanMotion.responsive(
                context,
                const Duration(milliseconds: 500),
              ),
              child: RepaintBoundary(
                child: SizedBox.expand(
                  child: CustomPaint(
                    painter: texture == null
                        ? null
                        : _HeatmapImagePainter(texture),
                  ),
                ),
              ),
            ),
          ),
        );
      },
    );
  }

  void _ensureTexture(_HeatmapTextureKey key) {
    if (_requestedKey == key) return;
    _requestedKey = key;
    final generation = ++_generation;

    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted || generation != _generation) return;
      if (key.centers.isEmpty) {
        _installTexture(null, key);
        return;
      }
      unawaited(_generateTexture(key, generation));
    });
  }

  Future<void> _generateTexture(_HeatmapTextureKey key, int generation) async {
    final raster = buildHeatmapRaster(
      centers: key.centers,
      renderWidth: key.renderWidth,
      renderHeight: key.renderHeight,
    );
    if (raster == null) {
      if (mounted && generation == _generation) {
        _installTexture(null, key);
      }
      return;
    }

    final texture = await _decodeHeatmapRaster(raster);
    if (!mounted || generation != _generation || _requestedKey != key) {
      texture.dispose();
      return;
    }
    _installTexture(texture, key);
  }

  void _installTexture(ui.Image? texture, _HeatmapTextureKey key) {
    final previous = _texture;
    setState(() {
      _texture = texture;
      _resolvedKey = key;
    });
    if (previous != null && !identical(previous, texture)) {
      WidgetsBinding.instance.addPostFrameCallback((_) => previous.dispose());
    }
  }
}

class HeatmapRaster {
  const HeatmapRaster({
    required this.width,
    required this.height,
    required this.rgba,
  });

  final int width;
  final int height;
  final Uint8List rgba;
}

/// Ports the reference web renderer's Float32 Gaussian/JET texture exactly.
HeatmapRaster? buildHeatmapRaster({
  required List<NormalizedDetectionCenter> centers,
  required int renderWidth,
  required int renderHeight,
}) {
  if (centers.isEmpty || renderWidth <= 0 || renderHeight <= 0) return null;

  final density = Float32List(renderWidth * renderHeight);
  for (final center in centers) {
    final px = _javaScriptRound(center.nx * (renderWidth - 1));
    final py = _javaScriptRound(center.ny * (renderHeight - 1));
    if (px == null || py == null) continue;
    if (px >= 0 && px < renderWidth && py >= 0 && py < renderHeight) {
      final index = py * renderWidth + px;
      density[index] = density[index] + 1;
    }
  }

  final sigma = math.max(1, (renderWidth * 0.05).round()).toInt();
  final blurred = _gaussianBlur(density, renderWidth, renderHeight, sigma);
  var maxValue = 0.0;
  for (final value in blurred) {
    if (value > maxValue) maxValue = value;
  }

  final rgba = Uint8List(renderWidth * renderHeight * 4);
  if (maxValue > 0) {
    const alpha = 140; // Math.round(0.55 * 255)
    for (var index = 0; index < blurred.length; index += 1) {
      final lutIndex = ((blurred[index] / maxValue) * 255).round();
      final color = _jetLut[lutIndex];
      final offset = index * 4;
      rgba[offset] = color.red;
      rgba[offset + 1] = color.green;
      rgba[offset + 2] = color.blue;
      rgba[offset + 3] = alpha;
    }
  }

  return HeatmapRaster(width: renderWidth, height: renderHeight, rgba: rgba);
}

Rect calculateHeatmapObjectCoverRect({
  required double sourceWidth,
  required double sourceHeight,
  required double containerWidth,
  required double containerHeight,
}) {
  if (sourceWidth <= 0 ||
      sourceHeight <= 0 ||
      containerWidth <= 0 ||
      containerHeight <= 0) {
    return Rect.zero;
  }

  final scale = math.max(
    containerWidth / sourceWidth,
    containerHeight / sourceHeight,
  );
  final width = sourceWidth * scale;
  final height = sourceHeight * scale;
  return Rect.fromLTWH(
    (containerWidth - width) / 2,
    (containerHeight - height) / 2,
    width,
    height,
  );
}

Float32List _gaussianBlur(
  Float32List source,
  int width,
  int height,
  int sigma,
) {
  final radius = (sigma * 3).ceil();
  final kernelSize = radius * 2 + 1;
  final kernel = Float32List(kernelSize);
  var kernelSum = 0.0;

  for (var index = 0; index < kernelSize; index += 1) {
    final x = index - radius;
    kernel[index] = math.exp(-(x * x) / (2 * sigma * sigma));
    kernelSum += kernel[index];
  }
  for (var index = 0; index < kernelSize; index += 1) {
    kernel[index] = kernel[index] / kernelSum;
  }

  final horizontal = Float32List(width * height);
  for (var y = 0; y < height; y += 1) {
    final rowOffset = y * width;
    for (var x = 0; x < width; x += 1) {
      var accumulated = 0.0;
      for (var kernelIndex = 0; kernelIndex < kernelSize; kernelIndex += 1) {
        final sourceX = x + kernelIndex - radius;
        if (sourceX >= 0 && sourceX < width) {
          accumulated += source[rowOffset + sourceX] * kernel[kernelIndex];
        }
      }
      horizontal[rowOffset + x] = accumulated;
    }
  }

  final result = Float32List(width * height);
  for (var y = 0; y < height; y += 1) {
    for (var x = 0; x < width; x += 1) {
      var accumulated = 0.0;
      for (var kernelIndex = 0; kernelIndex < kernelSize; kernelIndex += 1) {
        final sourceY = y + kernelIndex - radius;
        if (sourceY >= 0 && sourceY < height) {
          accumulated += horizontal[sourceY * width + x] * kernel[kernelIndex];
        }
      }
      result[y * width + x] = accumulated;
    }
  }
  return result;
}

int? _javaScriptRound(double value) {
  if (!value.isFinite) return null;
  return (value + 0.5).floor();
}

class _Rgb {
  const _Rgb(this.red, this.green, this.blue);

  final int red;
  final int green;
  final int blue;
}

final List<_Rgb> _jetLut = List<_Rgb>.unmodifiable(
  List<_Rgb>.generate(256, (index) => _jetColor(index / 255)),
);

_Rgb _jetColor(double value) {
  final clamped = value.clamp(0.0, 1.0);
  if (clamped < 0.125) {
    final position = clamped / 0.125;
    return _Rgb(0, 0, (128 + position * 127).round());
  }
  if (clamped < 0.375) {
    final position = (clamped - 0.125) / 0.25;
    return _Rgb(0, (position * 255).round(), 255);
  }
  if (clamped < 0.625) {
    final position = (clamped - 0.375) / 0.25;
    return _Rgb((position * 255).round(), 255, ((1 - position) * 255).round());
  }
  if (clamped < 0.875) {
    final position = (clamped - 0.625) / 0.25;
    return _Rgb(255, ((1 - position) * 255).round(), 0);
  }
  final position = (clamped - 0.875) / 0.125;
  return _Rgb((255 - position * 127).round(), 0, 0);
}

class _HeatmapTextureKey {
  _HeatmapTextureKey({
    required this.renderWidth,
    required this.renderHeight,
    required List<NormalizedDetectionCenter> centers,
  }) : centers = List<NormalizedDetectionCenter>.unmodifiable(centers);

  factory _HeatmapTextureKey.fromWidget(Size size, HeatmapOverlay widget) {
    final renderWidth = math.min(800, math.max(1, size.width.round()));
    final sourceDimensions = widget.sourceDimensions;
    final sourceWidth = sourceDimensions.isValid ? sourceDimensions.width : 16;
    final sourceHeight = sourceDimensions.isValid ? sourceDimensions.height : 9;
    final renderHeight = math.max(
      1,
      (renderWidth * (sourceHeight / sourceWidth)).round(),
    );
    return _HeatmapTextureKey(
      renderWidth: renderWidth,
      renderHeight: renderHeight,
      centers: widget.centers,
    );
  }

  final int renderWidth;
  final int renderHeight;
  final List<NormalizedDetectionCenter> centers;

  @override
  bool operator ==(Object other) {
    if (other is! _HeatmapTextureKey ||
        other.renderWidth != renderWidth ||
        other.renderHeight != renderHeight ||
        other.centers.length != centers.length) {
      return false;
    }
    for (var index = 0; index < centers.length; index += 1) {
      if (other.centers[index] != centers[index]) return false;
    }
    return true;
  }

  @override
  int get hashCode =>
      Object.hash(renderWidth, renderHeight, Object.hashAll(centers));
}

Future<ui.Image> _decodeHeatmapRaster(HeatmapRaster raster) async {
  final buffer = await ui.ImmutableBuffer.fromUint8List(raster.rgba);
  final descriptor = ui.ImageDescriptor.raw(
    buffer,
    width: raster.width,
    height: raster.height,
    rowBytes: raster.width * 4,
    pixelFormat: ui.PixelFormat.rgba8888,
  );
  final codec = await descriptor.instantiateCodec();
  try {
    final frame = await codec.getNextFrame();
    return frame.image;
  } finally {
    codec.dispose();
    descriptor.dispose();
    buffer.dispose();
  }
}

class _HeatmapImagePainter extends CustomPainter {
  const _HeatmapImagePainter(this.texture);

  final ui.Image texture;

  @override
  void paint(Canvas canvas, Size size) {
    final destination = calculateHeatmapObjectCoverRect(
      sourceWidth: texture.width.toDouble(),
      sourceHeight: texture.height.toDouble(),
      containerWidth: size.width,
      containerHeight: size.height,
    );
    canvas
      ..save()
      ..clipRect(Offset.zero & size)
      ..drawImageRect(
        texture,
        Rect.fromLTWH(
          0,
          0,
          texture.width.toDouble(),
          texture.height.toDouble(),
        ),
        destination,
        Paint()..filterQuality = FilterQuality.low,
      )
      ..restore();
  }

  @override
  bool shouldRepaint(covariant _HeatmapImagePainter oldDelegate) =>
      oldDelegate.texture != texture;
}
