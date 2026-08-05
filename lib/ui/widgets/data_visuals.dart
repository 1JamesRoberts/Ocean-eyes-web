import 'dart:math' as math;
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../core/theme/oceaneyes_tokens.dart';
import '../../models/aquarium_models.dart';
import '../../models/species_catalog.dart';

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
            Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  '$score',
                  style: const TextStyle(
                    fontFamily: 'Inter',
                    fontSize: 40,
                    height: 1,
                    fontWeight: FontWeight.w700,
                    letterSpacing: -2.4,
                    color: OceanColors.ink,
                  ),
                ),
                const SizedBox(height: 4),
                const Text(
                  '/100',
                  style: TextStyle(
                    fontFamily: 'Inter',
                    fontSize: 13,
                    height: 1,
                    fontWeight: FontWeight.w400,
                    letterSpacing: -0.13,
                    color: OceanColors.slateGrey,
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

class _HealthRingPainter extends CustomPainter {
  const _HealthRingPainter({required this.progress});

  final double progress;

  @override
  void paint(Canvas canvas, Size size) {
    final center = size.center(Offset.zero);
    final scale = size.shortestSide / 112;
    final radius = 50 * scale;
    final strokeWidth = 9 * scale;
    final rect = Rect.fromCircle(center: center, radius: radius);

    canvas.drawCircle(
      center,
      radius,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 11 * scale
        ..color = OceanColors.white.withValues(alpha: 0.50),
    );

    canvas.drawCircle(
      center,
      radius,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = strokeWidth
        ..color = OceanColors.prussianBlue.withValues(alpha: 0.03),
    );

    final paint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth
      ..strokeCap = StrokeCap.round
      // The source SVG is rotated -90 degrees, which turns its declared
      // top-left -> bottom-right gradient into this visual diagonal.
      ..shader = const LinearGradient(
        begin: Alignment.bottomLeft,
        end: Alignment.topRight,
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
    final strokeWidth = size < 40 ? 3.0 : 5.0;
    return Semantics(
      label: '$percent percent of expected fish visible',
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          SizedBox.square(
            dimension: size,
            child: Stack(
              alignment: Alignment.center,
              children: [
                Positioned.fill(
                  child: CustomPaint(
                    painter: _VisibilityRingPainter(
                      progress: progress.clamp(0, 1),
                      strokeWidth: strokeWidth,
                      color: _color,
                    ),
                  ),
                ),
                Icon(LucideIcons.eye, size: size * 0.36, color: _color),
              ],
            ),
          ),
          if (showLabel) ...[
            const SizedBox(width: 10),
            ConstrainedBox(
              constraints: BoxConstraints(
                minWidth: MediaQuery.sizeOf(context).width > 600 ? 36 : 0,
              ),
              child: Text(
                '$percent%',
                style: OceanTypography.strong.copyWith(color: _color),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _VisibilityRingPainter extends CustomPainter {
  const _VisibilityRingPainter({
    required this.progress,
    required this.strokeWidth,
    required this.color,
  });

  final double progress;
  final double strokeWidth;
  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final center = size.center(Offset.zero);
    final radius = (size.shortestSide - strokeWidth) / 2;
    final rect = Rect.fromCircle(center: center, radius: radius);

    canvas.drawCircle(
      center,
      radius,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = strokeWidth
        ..color = OceanColors.prussianBlue.withValues(alpha: 0.03),
    );
    if (progress <= 0) return;
    canvas.drawArc(
      rect,
      -math.pi / 2,
      math.pi * 2 * progress,
      false,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = strokeWidth
        ..strokeCap = StrokeCap.round
        ..color = color,
    );
  }

  @override
  bool shouldRepaint(covariant _VisibilityRingPainter oldDelegate) =>
      oldDelegate.progress != progress ||
      oldDelegate.strokeWidth != strokeWidth ||
      oldDelegate.color != color;
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

  // The deployed catalog uses hand-picked colors for the classifier species.
  // Those entries are hexadecimal in the web catalog (rather than HSL), so
  // keep their exact values here instead of falling back to the generic teal.
  static const _classifierColors = <String, int>{
    'angelfish': 0xFFE8D5B7,
    'betta': 0xFFFFB6C1,
    'cardinal_tetra': 0xFF4169E1,
    'cherry_barb': 0xFFDC143C,
    'clown_loach': 0xFFFF8C00,
    'corydoras': 0xFFDAA520,
    'discus': 0xFF9370DB,
    'dwarf_gourami': 0xFF20B2AA,
    'german_blue_ram': 0xFF1E90FF,
    'goldfish': 0xFFFFD700,
    'guppy': 0xFFFF69B4,
    'harlequin_rasbora': 0xFFFF6347,
    'molly': 0xFFB0C4DE,
    'neon_tetra': 0xFF00CED1,
    'oscar': 0xFF8B4513,
    'otocinclus': 0xFFA9A9A9,
    'platy': 0xFFFF4500,
    'plecostomus': 0xFF556B2F,
    'rummy_nose_tetra': 0xFFFF0000,
    'siamese_algae_eater': 0xFFC0C0C0,
    'swordtail': 0xFFFF8C00,
    'tiger_barb': 0xFFFF6347,
    'zebra_danio': 0xFF4169E1,
  };

  static const _catalogAliases = <String, String>{
    'black_skirt_tetra': 'black_widow_tetra',
  };

  static Color colorForSpeciesId(String speciesId) {
    final exact = _classifierColors[speciesId];
    if (exact != null) return Color(exact);
    final catalogId = _catalogAliases[speciesId] ?? speciesId;
    return Color(SpeciesCatalog.colorValueFor(catalogId));
  }

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
                colors: fish
                    .map((entry) => colorForSpeciesId(entry.speciesId))
                    .toList(growable: false),
              ),
            ),
            Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  '$total',
                  style: const TextStyle(
                    fontFamily: 'Inter',
                    fontSize: 28,
                    height: 1,
                    fontWeight: FontWeight.w800,
                    color: OceanColors.ink,
                    decoration: TextDecoration.none,
                  ),
                ),
                Text(
                  'Total Fish',
                  style: const TextStyle(
                    fontFamily: 'Inter',
                    fontSize: 11,
                    height: 1.25,
                    fontWeight: FontWeight.w400,
                    letterSpacing: -0.11,
                    color: OceanColors.inkMuted,
                    decoration: TextDecoration.none,
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
      radius: size.shortestSide * 0.40,
    );
    final separator = values.length > 1 ? 3 / 80 : 0.0;

    void drawSegments(Paint paint, {required bool useSpeciesColor}) {
      var start = -math.pi / 2;
      for (var index = 0; index < values.length; index += 1) {
        final sweep = math.pi * 2 * values[index] / total;
        final visibleSweep = math.max(0.0, sweep - separator);
        if (visibleSweep > 0) {
          canvas.drawArc(
            rect,
            start,
            visibleSweep,
            false,
            paint
              ..color = useSpeciesColor
                  ? colors[index % colors.length]
                  : OceanColors.white.withValues(alpha: 0.50),
          );
        }
        start += sweep;
      }
    }

    drawSegments(
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = strokeWidth + size.shortestSide * 0.01
        ..strokeCap = StrokeCap.butt,
      useSpeciesColor: false,
    );
    drawSegments(
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = strokeWidth
        ..strokeCap = StrokeCap.butt,
      useSpeciesColor: true,
    );
  }

  @override
  bool shouldRepaint(covariant _DonutPainter oldDelegate) =>
      oldDelegate.values != values || oldDelegate.colors != colors;
}

class OceanLineChart extends StatefulWidget {
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
  State<OceanLineChart> createState() => _OceanLineChartState();
}

class _OceanLineChartState extends State<OceanLineChart> {
  int? _activeIndex;

  bool get _isMiniClarity => widget.showValueLabels;
  bool get _isClarityFallback => !widget.showValueLabels && !widget.fill;

  List<ChartPoint> get _chartPoints {
    if (!_isMiniClarity && !_isClarityFallback && widget.points.length > 80) {
      return _samplePoints(widget.points, 80);
    }
    return widget.points;
  }

  double get _effectiveHeight {
    if (_isClarityFallback) return 260;
    if (_isMiniClarity && widget.minimumY == 100 && widget.height == 164) {
      return 140;
    }
    return widget.height;
  }

  @override
  void didUpdateWidget(covariant OceanLineChart oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.points != widget.points ||
        oldWidget.fill != widget.fill ||
        oldWidget.showValueLabels != widget.showValueLabels) {
      _activeIndex = null;
    }
  }

  @override
  Widget build(BuildContext context) {
    if (widget.points.isEmpty) {
      final emptyHeight = _isMiniClarity
          ? 140.0
          : _isClarityFallback
          ? 240.0
          : _effectiveHeight;
      return _EmptyChart(
        semanticLabel: widget.semanticLabel,
        height: emptyHeight,
        message: _isMiniClarity
            ? 'No water clarity readings available'
            : _isClarityFallback
            ? 'No water clarity history for this date.'
            : widget.height >= 120
            ? 'No detection data available'
            : 'No data available',
        hint: _isClarityFallback
            ? 'Water clarity is only recorded when the turbidity-specific '
                  'endpoint is used.'
            : null,
      );
    }
    final chartPoints = _chartPoints;
    return Semantics(
      label:
          '${widget.semanticLabel}. ${chartPoints.map((point) => '${point.label}: ${point.value.toStringAsFixed(1)}').join(', ')}',
      image: true,
      child: LayoutBuilder(
        builder: (context, constraints) {
          final availableWidth = constraints.maxWidth.isFinite
              ? constraints.maxWidth
              : MediaQuery.sizeOf(context).width;
          if (_isMiniClarity) {
            final visiblePoints = chartPoints.length <= 7
                ? chartPoints
                : chartPoints.sublist(chartPoints.length - 7);
            return SizedBox(
              width: double.infinity,
              height: _effectiveHeight,
              child: CustomPaint(
                painter: _MiniClarityPainter(
                  points: visiblePoints,
                  color: widget.color,
                  textDirection: Directionality.of(context),
                ),
              ),
            );
          }

          final bleed =
              !_isClarityFallback && MediaQuery.sizeOf(context).width < 768
              ? 8.0
              : 0.0;
          final paintWidth = availableWidth + bleed * 2;
          final active = _activeIndex == null
              ? null
              : chartPoints[_activeIndex!.clamp(0, chartPoints.length - 1)];

          return SizedBox(
            width: double.infinity,
            height: _effectiveHeight,
            child: MouseRegion(
              onHover: (event) => _updateActiveIndex(
                event.localPosition.dx + bleed,
                paintWidth,
              ),
              onExit: (_) => _clearActiveIndex(),
              child: GestureDetector(
                behavior: HitTestBehavior.opaque,
                onTapDown: (details) => _updateActiveIndex(
                  details.localPosition.dx + bleed,
                  paintWidth,
                ),
                onHorizontalDragUpdate: (details) => _updateActiveIndex(
                  details.localPosition.dx + bleed,
                  paintWidth,
                ),
                onHorizontalDragEnd: (_) => _clearActiveIndex(),
                child: Stack(
                  clipBehavior: Clip.none,
                  children: [
                    Positioned(
                      left: -bleed,
                      top: 0,
                      width: paintWidth,
                      height: _effectiveHeight,
                      child: CustomPaint(
                        painter: _RechartsLinePainter(
                          points: chartPoints,
                          color: widget.color,
                          area: widget.fill,
                          clarityFallback: _isClarityFallback,
                          activeIndex: _activeIndex,
                          textDirection: Directionality.of(context),
                        ),
                      ),
                    ),
                    if (active != null)
                      Positioned(
                        left: _tooltipLeft(
                          availableWidth,
                          paintWidth,
                          bleed,
                          _activeIndex!,
                        ),
                        top: 12,
                        child: _ChartTooltip(
                          label: _formatChartTime(active.label),
                          value: _isClarityFallback
                              ? '${active.value.toStringAsFixed(2)} FNU'
                              : active.value.toStringAsFixed(3),
                          series: _isClarityFallback
                              ? 'Water Clarity'
                              : 'Mean NND',
                        ),
                      ),
                  ],
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  void _updateActiveIndex(double x, double width) {
    final left = _isClarityFallback ? 60.0 : 32.0;
    final right = _isClarityFallback ? width - 16 : width;
    final plotWidth = math.max(1.0, right - left);
    final normalized = ((x - left) / plotWidth).clamp(0.0, 1.0);
    final chartPoints = _chartPoints;
    final next = chartPoints.length == 1
        ? 0
        : (normalized * (chartPoints.length - 1)).round();
    if (next == _activeIndex) return;
    setState(() => _activeIndex = next);
  }

  void _clearActiveIndex() {
    if (_activeIndex == null) return;
    setState(() => _activeIndex = null);
  }

  double _tooltipLeft(
    double availableWidth,
    double paintWidth,
    double bleed,
    int index,
  ) {
    final left = _isClarityFallback ? 60.0 : 32.0;
    final right = _isClarityFallback ? paintWidth - 16 : paintWidth;
    final chartPoints = _chartPoints;
    final fraction = chartPoints.length == 1
        ? 0.5
        : index / (chartPoints.length - 1);
    final center = left + (right - left) * fraction - bleed;
    return (center - 70).clamp(0.0, math.max(0.0, availableWidth - 140));
  }
}

class _EmptyChart extends StatelessWidget {
  const _EmptyChart({
    required this.semanticLabel,
    required this.height,
    this.message = 'No data available',
    this.hint,
  });

  final String semanticLabel;
  final double height;
  final String message;
  final String? hint;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      container: true,
      image: true,
      label:
          '$semanticLabel. $message${message.endsWith('.') ? '' : '.'}${hint == null ? '' : ' $hint'}',
      child: ExcludeSemantics(
        child: SizedBox(
          width: double.infinity,
          height: height,
          child: Center(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    message,
                    textAlign: TextAlign.center,
                    style: OceanTypography.bodyMuted,
                  ),
                  if (hint != null) ...[
                    const SizedBox(height: 8),
                    Text(
                      hint!,
                      textAlign: TextAlign.center,
                      style: OceanTypography.caption.copyWith(
                        color: OceanColors.slateGrey.withValues(alpha: 0.70),
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _MiniClarityPainter extends CustomPainter {
  const _MiniClarityPainter({
    required this.points,
    required this.color,
    required this.textDirection,
  });

  final List<ChartPoint> points;
  final Color color;
  final TextDirection textDirection;

  @override
  void paint(Canvas canvas, Size size) {
    if (points.isEmpty || size.width <= 40 || size.height <= 40) return;
    const padding = 20.0;
    const labelGap = 8.0;
    final baselineY = size.height - padding;
    final plotTop = padding + labelGap;
    final plotHeight = size.height - padding - plotTop;
    final maxValue = math.max(
      5.0,
      points.map((point) => point.value).reduce(math.max).ceilToDouble(),
    );
    const gridColor = Color(0x26828E97);

    canvas.drawLine(
      Offset(padding, baselineY),
      Offset(size.width - padding, baselineY),
      Paint()
        ..color = gridColor
        ..strokeWidth = 1,
    );
    final dashedGrid = Paint()
      ..color = gridColor
      ..strokeWidth = 0.5;
    _drawDashedLine(
      canvas,
      Offset(padding, size.height / 2),
      Offset(size.width - padding, size.height / 2),
      dashedGrid,
      dash: 3,
      gap: 3,
    );
    _drawDashedLine(
      canvas,
      const Offset(padding, padding),
      Offset(size.width - padding, padding),
      dashedGrid,
      dash: 3,
      gap: 3,
    );

    final offsets = <Offset>[];
    for (var index = 0; index < points.length; index += 1) {
      final x = points.length == 1
          ? padding
          : padding + index * (size.width - 2 * padding) / (points.length - 1);
      final y = baselineY - points[index].value * plotHeight / maxValue;
      offsets.add(Offset(x, y));
      _drawDashedLine(
        canvas,
        Offset(x, padding),
        Offset(x, baselineY),
        Paint()
          ..color = const Color(0x13828E97)
          ..strokeWidth = 0.5,
        dash: 3,
        gap: 3,
      );
    }

    final path = Path()..moveTo(offsets.first.dx, offsets.first.dy);
    for (final offset in offsets.skip(1)) {
      path.lineTo(offset.dx, offset.dy);
    }
    final fillPath = Path.from(path)
      ..lineTo(offsets.last.dx, baselineY)
      ..lineTo(offsets.first.dx, baselineY)
      ..close();
    canvas.drawPath(
      fillPath,
      Paint()
        ..shader = const LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [Color(0x4D00C8B3), Color(0x0000C8B3)],
        ).createShader(fillPath.getBounds()),
    );
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
      canvas.drawCircle(offsets[index], 4, Paint()..color = color);
      canvas.drawCircle(
        offsets[index],
        4,
        Paint()
          ..style = PaintingStyle.stroke
          ..strokeWidth = 2
          ..color = OceanColors.white,
      );
      _paintChartText(
        canvas,
        _formatRawValue(points[index].value),
        Offset(offsets[index].dx, offsets[index].dy - 8),
        textDirection,
        fontSize: 9,
        fontWeight: FontWeight.w700,
        color: OceanColors.prussianBlue,
        horizontalAnchor: _TextAnchor.middle,
        verticalAnchor: _TextAnchor.alphabeticBaseline,
      );
    }
  }

  @override
  bool shouldRepaint(covariant _MiniClarityPainter oldDelegate) =>
      oldDelegate.points != points ||
      oldDelegate.color != color ||
      oldDelegate.textDirection != textDirection;
}

class _RechartsLinePainter extends CustomPainter {
  const _RechartsLinePainter({
    required this.points,
    required this.color,
    required this.area,
    required this.clarityFallback,
    required this.activeIndex,
    required this.textDirection,
  });

  final List<ChartPoint> points;
  final Color color;
  final bool area;
  final bool clarityFallback;
  final int? activeIndex;
  final TextDirection textDirection;

  @override
  void paint(Canvas canvas, Size size) {
    if (points.isEmpty || size.width <= 60 || size.height <= 40) return;
    final left = clarityFallback ? 60.0 : 32.0;
    final right = clarityFallback ? 16.0 : 0.0;
    final plot = Rect.fromLTRB(left, 8, size.width - right, size.height - 30);
    final values = points.map((point) => point.value).toList(growable: false);
    final ticks = clarityFallback
        ? _autoTicks(values)
        : _zeroBasedTicks(values, allowDecimals: true);
    final minY = ticks.first;
    final maxY = ticks.last;
    final range = math.max(0.000001, maxY - minY);
    const gridColor = Color(0x26828E97);
    final gridPaint = Paint()
      ..color = gridColor
      ..strokeWidth = 1;

    for (final tick in ticks) {
      final fraction = (tick - minY) / range;
      final y = plot.bottom - plot.height * fraction;
      _drawDashedLine(
        canvas,
        Offset(plot.left, y),
        Offset(plot.right, y),
        gridPaint,
        dash: 3,
        gap: 3,
      );
      _paintChartText(
        canvas,
        _formatAxisNumber(tick),
        Offset(plot.left - 5, y),
        textDirection,
        fontSize: 12,
        fontWeight: FontWeight.w400,
        color: OceanColors.slateGrey,
        horizontalAnchor: _TextAnchor.end,
        verticalAnchor: _TextAnchor.middle,
      );
      canvas.drawLine(
        Offset(plot.left - 6, y),
        Offset(plot.left, y),
        gridPaint,
      );
    }

    final xTicks = clarityFallback
        ? _categoryAxisTicks(points)
        : _detectionAxisTicks(points);
    for (final tick in xTicks) {
      final x = plot.left + plot.width * tick.fraction;
      _drawDashedLine(
        canvas,
        Offset(x, plot.top),
        Offset(x, plot.bottom),
        gridPaint,
        dash: 3,
        gap: 3,
      );
    }

    canvas.drawLine(
      Offset(plot.left, plot.top),
      Offset(plot.left, plot.bottom),
      gridPaint,
    );
    canvas.drawLine(
      Offset(plot.left, plot.bottom),
      Offset(plot.right, plot.bottom),
      gridPaint,
    );
    for (final tick in xTicks) {
      final x = plot.left + plot.width * tick.fraction;
      canvas.drawLine(
        Offset(x, plot.bottom),
        Offset(x, plot.bottom + 6),
        gridPaint,
      );
      _paintChartText(
        canvas,
        tick.label,
        Offset(x, plot.bottom + 9),
        textDirection,
        fontSize: 12,
        fontWeight: FontWeight.w400,
        color: OceanColors.slateGrey,
        horizontalAnchor: _TextAnchor.middle,
        verticalAnchor: _TextAnchor.start,
      );
    }

    final offsets = <Offset>[];
    for (var index = 0; index < points.length; index += 1) {
      final fraction = points.length == 1 ? 0.5 : index / (points.length - 1);
      final x = plot.left + plot.width * fraction;
      final normalized = (points[index].value - minY) / range;
      final y = plot.bottom - plot.height * normalized;
      offsets.add(Offset(x, y));
    }
    final path = _monotonePath(offsets);
    if (activeIndex case final index?
        when index >= 0 && index < offsets.length) {
      final x = offsets[index].dx;
      canvas.drawLine(
        Offset(x, plot.top),
        Offset(x, plot.bottom),
        Paint()
          ..color = const Color(0xFFCCCCCC)
          ..strokeWidth = 1,
      );
    }
    if (area) {
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
            stops: const [0.05, 0.95],
            colors: [color.withValues(alpha: 0.25), color.withValues(alpha: 0)],
          ).createShader(fillPath.getBounds()),
      );
    }
    canvas.drawPath(
      path,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 2
        ..strokeCap = StrokeCap.round
        ..strokeJoin = StrokeJoin.round
        ..color = color,
    );
    for (var index = 0; index < offsets.length; index += 1) {
      final active = index == activeIndex;
      if (active) {
        canvas.drawCircle(
          offsets[index],
          6,
          Paint()..color = OceanColors.white,
        );
        canvas.drawCircle(offsets[index], 5, Paint()..color = color);
      } else {
        canvas.drawCircle(offsets[index], 3, Paint()..color = color);
      }
    }
  }

  @override
  bool shouldRepaint(covariant _RechartsLinePainter oldDelegate) =>
      oldDelegate.points != points ||
      oldDelegate.color != color ||
      oldDelegate.area != area ||
      oldDelegate.clarityFallback != clarityFallback ||
      oldDelegate.activeIndex != activeIndex ||
      oldDelegate.textDirection != textDirection;
}

class OceanBarChart extends StatefulWidget {
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
  State<OceanBarChart> createState() => _OceanBarChartState();
}

class _OceanBarChartState extends State<OceanBarChart> {
  int? _activeIndex;

  List<ChartPoint> get _chartPoints => _binPoints(widget.points, 20);

  @override
  void didUpdateWidget(covariant OceanBarChart oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.points != widget.points) _activeIndex = null;
  }

  @override
  Widget build(BuildContext context) {
    if (widget.points.isEmpty) {
      return _EmptyChart(
        semanticLabel: widget.semanticLabel,
        height: widget.height,
        message: widget.height >= 120
            ? 'No detection data available'
            : 'No data available',
      );
    }
    final chartPoints = _chartPoints;
    return Semantics(
      label:
          '${widget.semanticLabel}. ${chartPoints.map((point) => '${point.label}: ${point.value.round()} fish').join(', ')}',
      image: true,
      child: LayoutBuilder(
        builder: (context, constraints) {
          final availableWidth = constraints.maxWidth.isFinite
              ? constraints.maxWidth
              : MediaQuery.sizeOf(context).width;
          final bleed = MediaQuery.sizeOf(context).width < 768 ? 8.0 : 0.0;
          final paintWidth = availableWidth + bleed * 2;
          final active = _activeIndex == null
              ? null
              : chartPoints[_activeIndex!.clamp(0, chartPoints.length - 1)];
          return SizedBox(
            width: double.infinity,
            height: widget.height,
            child: MouseRegion(
              onHover: (event) => _updateActiveIndex(
                event.localPosition.dx + bleed,
                paintWidth,
              ),
              onExit: (_) => _clearActiveIndex(),
              child: GestureDetector(
                behavior: HitTestBehavior.opaque,
                onTapDown: (details) => _updateActiveIndex(
                  details.localPosition.dx + bleed,
                  paintWidth,
                ),
                onHorizontalDragUpdate: (details) => _updateActiveIndex(
                  details.localPosition.dx + bleed,
                  paintWidth,
                ),
                onHorizontalDragEnd: (_) => _clearActiveIndex(),
                child: Stack(
                  clipBehavior: Clip.none,
                  children: [
                    Positioned(
                      left: -bleed,
                      top: 0,
                      width: paintWidth,
                      height: widget.height,
                      child: CustomPaint(
                        painter: _BarChartPainter(
                          points: chartPoints,
                          axisPoints: widget.points,
                          activeIndex: _activeIndex,
                          textDirection: Directionality.of(context),
                        ),
                      ),
                    ),
                    if (active != null)
                      Positioned(
                        left: _tooltipLeft(
                          availableWidth,
                          paintWidth,
                          bleed,
                          _activeIndex!,
                        ),
                        top: 12,
                        child: _ChartTooltip(
                          label: _formatChartTime(active.label),
                          value: '${active.value.round()} fish',
                          series: 'Count',
                        ),
                      ),
                  ],
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  void _updateActiveIndex(double x, double width) {
    final plotWidth = math.max(1.0, width - 32);
    final chartPoints = _chartPoints;
    final slot = plotWidth / chartPoints.length;
    final next = ((x - 32) / slot).floor().clamp(0, chartPoints.length - 1);
    if (next == _activeIndex) return;
    setState(() => _activeIndex = next);
  }

  void _clearActiveIndex() {
    if (_activeIndex == null) return;
    setState(() => _activeIndex = null);
  }

  double _tooltipLeft(
    double availableWidth,
    double paintWidth,
    double bleed,
    int index,
  ) {
    final slot = (paintWidth - 32) / _chartPoints.length;
    final center = 32 + slot * (index + 0.5) - bleed;
    return (center - 70).clamp(0.0, math.max(0.0, availableWidth - 140));
  }
}

class _BarChartPainter extends CustomPainter {
  const _BarChartPainter({
    required this.points,
    required this.axisPoints,
    required this.activeIndex,
    required this.textDirection,
  });

  final List<ChartPoint> points;
  final List<ChartPoint> axisPoints;
  final int? activeIndex;
  final TextDirection textDirection;

  @override
  void paint(Canvas canvas, Size size) {
    if (points.isEmpty || size.width <= 40 || size.height <= 40) return;
    final rect = Rect.fromLTRB(32, 8, size.width, size.height - 30);
    final ticks = _zeroBasedTicks(
      points.map((point) => point.value).toList(growable: false),
      allowDecimals: false,
    );
    final maxY = ticks.last;
    final grid = Paint()
      ..color = const Color(0x26828E97)
      ..strokeWidth = 1;
    for (final tick in ticks) {
      final y = rect.bottom - rect.height * tick / maxY;
      _drawDashedLine(
        canvas,
        Offset(rect.left, y),
        Offset(rect.right, y),
        grid,
        dash: 5,
        gap: 6,
      );
      _paintChartText(
        canvas,
        tick.round().toString(),
        Offset(rect.left - 5, y),
        textDirection,
        fontSize: 12,
        fontWeight: FontWeight.w400,
        color: OceanColors.slateGrey,
        horizontalAnchor: _TextAnchor.end,
        verticalAnchor: _TextAnchor.middle,
      );
    }
    final slot = points.length == 1
        ? rect.width / 5
        : rect.width / points.length;
    final barWidth = slot * 0.82;
    final xTicks = _detectionAxisTicks(axisPoints);
    final tickLeft = points.length == 1 ? rect.left : rect.left + slot / 2;
    final tickWidth = points.length == 1 ? rect.width : rect.width - slot;
    for (final tick in xTicks) {
      final x = tickLeft + tickWidth * tick.fraction;
      _drawDashedLine(
        canvas,
        Offset(x, rect.top),
        Offset(x, rect.bottom),
        grid,
        dash: 5,
        gap: 6,
      );
    }
    canvas.drawLine(
      Offset(rect.left, rect.bottom),
      Offset(rect.right, rect.bottom),
      grid,
    );
    for (var index = 0; index < points.length; index += 1) {
      final height = rect.height * (points[index].value / maxY).clamp(0.0, 1.0);
      final centerX = points.length == 1
          ? rect.center.dx
          : rect.left + slot * (index + 0.5);
      final left = centerX - barWidth / 2;
      if (index == activeIndex) {
        canvas.drawRect(
          Rect.fromLTWH(centerX - slot / 2, rect.top, slot, rect.height),
          Paint()..color = OceanColors.slateGrey.withValues(alpha: 0.30),
        );
      }
      if (height > 0) {
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
              colors: [OceanColors.verdigris, OceanColors.darkCyan],
            ).createShader(bar.outerRect),
        );
      }
    }
    for (final tick in xTicks) {
      final x = tickLeft + tickWidth * tick.fraction;
      canvas.drawLine(Offset(x, rect.bottom), Offset(x, rect.bottom + 6), grid);
      _paintChartText(
        canvas,
        tick.label,
        Offset(x, rect.bottom + 9),
        textDirection,
        fontSize: 12,
        fontWeight: FontWeight.w400,
        color: OceanColors.slateGrey,
        horizontalAnchor: _TextAnchor.middle,
        verticalAnchor: _TextAnchor.start,
      );
    }
  }

  @override
  bool shouldRepaint(covariant _BarChartPainter oldDelegate) =>
      oldDelegate.points != points ||
      oldDelegate.axisPoints != axisPoints ||
      oldDelegate.activeIndex != activeIndex ||
      oldDelegate.textDirection != textDirection;
}

class _ChartTooltip extends StatelessWidget {
  const _ChartTooltip({
    required this.label,
    required this.value,
    required this.series,
  });

  final String label;
  final String value;
  final String series;

  @override
  Widget build(BuildContext context) {
    const style = TextStyle(
      fontFamily: 'Inter',
      fontSize: 13,
      height: 1.2,
      color: OceanColors.prussianBlue,
      fontWeight: FontWeight.w400,
    );
    return IgnorePointer(
      child: Container(
        constraints: const BoxConstraints(maxWidth: 140),
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
          color: const Color(0xB3FFFFFF),
          border: Border.all(color: const Color(0x4DFFFFFF)),
          borderRadius: BorderRadius.circular(16),
        ),
        child: DefaultTextStyle(
          style: style,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label, maxLines: 1, overflow: TextOverflow.ellipsis),
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 4),
                child: Text('$series : $value'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

enum _TextAnchor { start, middle, end, alphabeticBaseline }

void _paintChartText(
  Canvas canvas,
  String value,
  Offset anchor,
  TextDirection textDirection, {
  required double fontSize,
  required FontWeight fontWeight,
  required Color color,
  required _TextAnchor horizontalAnchor,
  required _TextAnchor verticalAnchor,
}) {
  final painter = TextPainter(
    text: TextSpan(
      text: value,
      style: TextStyle(
        fontFamily: 'Inter',
        fontSize: fontSize,
        height: 1,
        color: color,
        fontWeight: fontWeight,
      ),
    ),
    textDirection: textDirection,
  )..layout();
  final dx = switch (horizontalAnchor) {
    _TextAnchor.start => anchor.dx,
    _TextAnchor.middle => anchor.dx - painter.width / 2,
    _TextAnchor.end => anchor.dx - painter.width,
    _TextAnchor.alphabeticBaseline => anchor.dx,
  };
  final dy = switch (verticalAnchor) {
    _TextAnchor.start => anchor.dy,
    _TextAnchor.middle => anchor.dy - painter.height / 2,
    _TextAnchor.end => anchor.dy - painter.height,
    _TextAnchor.alphabeticBaseline =>
      anchor.dy -
          painter.computeDistanceToActualBaseline(TextBaseline.alphabetic),
  };
  painter.paint(canvas, Offset(dx, dy));
}

void _drawDashedLine(
  Canvas canvas,
  Offset start,
  Offset end,
  Paint paint, {
  required double dash,
  required double gap,
}) {
  final delta = end - start;
  final length = delta.distance;
  if (length <= 0) return;
  final unit = delta / length;
  var distance = 0.0;
  while (distance < length) {
    final dashEnd = math.min(length, distance + dash);
    canvas.drawLine(start + unit * distance, start + unit * dashEnd, paint);
    distance += dash + gap;
  }
}

List<ChartPoint> _samplePoints(List<ChartPoint> points, int limit) {
  if (points.length <= limit) return points;
  return List<ChartPoint>.generate(limit, (index) {
    final sourceIndex = (index * (points.length - 1) / (limit - 1)).round();
    return points[sourceIndex];
  }, growable: false);
}

List<ChartPoint> _binPoints(List<ChartPoint> points, int limit) {
  if (points.length <= limit) return points;
  final totals = List<double>.filled(limit, 0);
  final samples = List<int>.filled(limit, 0);
  final labels = List<String>.filled(limit, points.first.label);
  for (var index = 0; index < points.length; index += 1) {
    final binIndex = math.min(index * limit ~/ points.length, limit - 1);
    totals[binIndex] += points[index].value;
    samples[binIndex] += 1;
    labels[binIndex] = points[index].label;
  }
  return List<ChartPoint>.generate(
    limit,
    (index) => ChartPoint(
      labels[index],
      (totals[index] / samples[index]).roundToDouble(),
    ),
    growable: false,
  );
}

List<double> _zeroBasedTicks(
  List<double> values, {
  required bool allowDecimals,
}) {
  final rawMax = math.max(0.0, values.reduce(math.max));
  if (rawMax == 0) {
    return allowDecimals ? const [0, 0.25, 0.5, 0.75, 1] : const [0, 1];
  }
  if (!allowDecimals && rawMax < 4) {
    return List<double>.generate(
      rawMax.ceil() + 1,
      (index) => index.toDouble(),
    );
  }
  var step = _niceStep(rawMax / 4, round: false);
  if (!allowDecimals) step = math.max(1, step.ceilToDouble());
  final niceMax = math.max(step * 4, (rawMax / step).ceil() * step);
  final tickCount = (niceMax / step).round();
  return List<double>.generate(tickCount + 1, (index) => index * step);
}

List<double> _autoTicks(List<double> values) {
  var rawMin = values.reduce(math.min);
  var rawMax = values.reduce(math.max);
  if (rawMin == rawMax) {
    final padding = rawMin == 0 ? 1.0 : rawMin.abs() * 0.1;
    rawMin -= padding;
    rawMax += padding;
  }
  final step = _niceStep((rawMax - rawMin) / 4, round: false);
  final niceMin = (rawMin / step).floor() * step;
  final niceMax = (rawMax / step).ceil() * step;
  final count = math.max(1, ((niceMax - niceMin) / step).round());
  return List<double>.generate(count + 1, (index) => niceMin + step * index);
}

double _niceStep(double value, {required bool round}) {
  if (!value.isFinite || value <= 0) return 1;
  final exponent = (math.log(value) / math.ln10).floor();
  final fraction = value / math.pow(10, exponent);
  final niceFraction = round
      ? fraction < 1.5
            ? 1.0
            : fraction < 3
            ? 2.0
            : fraction < 7
            ? 5.0
            : 10.0
      : fraction <= 1
      ? 1.0
      : fraction <= 2
      ? 2.0
      : fraction <= 2.5
      ? 2.5
      : fraction <= 5
      ? 5.0
      : 10.0;
  return niceFraction * math.pow(10, exponent);
}

List<int> _categoryTickIndexes(int pointCount) {
  if (pointCount <= 5) return List<int>.generate(pointCount, (index) => index);
  final indexes = <int>[0];
  for (var index = 1; index < pointCount - 1; index += 1) {
    if (index.isOdd) indexes.add(index);
  }
  if (indexes.last != pointCount - 1) indexes.add(pointCount - 1);
  return indexes;
}

class _AxisTick {
  const _AxisTick(this.fraction, this.label);

  final double fraction;
  final String label;
}

List<_AxisTick> _categoryAxisTicks(List<ChartPoint> points) {
  return _categoryTickIndexes(points.length)
      .map((index) {
        final fraction = points.length == 1 ? 0.5 : index / (points.length - 1);
        return _AxisTick(fraction, points[index].label);
      })
      .toList(growable: false);
}

List<_AxisTick> _detectionAxisTicks(List<ChartPoint> points) {
  const tickCount = 5;
  final start = _parseFixtureHour(points.first.label);
  final end = _inferredEndHour(points);
  return List<_AxisTick>.generate(tickCount, (index) {
    final fraction = index / (tickCount - 1);
    if (start != null && end != null) {
      final axisStart = points.length == 1 ? start - 1 / 120 : start;
      final adjustedEnd = points.length == 1
          ? start + 1 / 120
          : end > start
          ? end
          : end + 24;
      return _AxisTick(
        fraction,
        _formatHour(axisStart + (adjustedEnd - axisStart) * fraction),
      );
    }
    final pointIndex = points.length == 1
        ? 0
        : (fraction * (points.length - 1)).round();
    return _AxisTick(fraction, _formatChartTime(points[pointIndex].label));
  });
}

double? _inferredEndHour(List<ChartPoint> points) {
  final parsed = _parseFixtureHour(points.last.label);
  if (parsed != null) return parsed;
  if (points.last.label.trim().toLowerCase() != 'now' || points.length < 2) {
    return null;
  }
  final previous = _parseFixtureHour(points[points.length - 2].label);
  if (previous == null) return null;
  if (points.length < 3) return previous + 1 / 60;
  final beforePrevious = _parseFixtureHour(points[points.length - 3].label);
  if (beforePrevious == null) return previous + 1 / 60;
  var interval = previous - beforePrevious;
  if (interval <= 0) interval += 24;
  return previous + interval;
}

double? _parseFixtureHour(String value, {double? nowFallback}) {
  final normalized = value.trim().toLowerCase();
  if (normalized == 'now') return nowFallback;
  final match = RegExp(
    r'^(\d{1,2})(?::(\d{2}))?\s*([ap])(?:m)?$',
  ).firstMatch(normalized);
  if (match == null) return null;
  var hour = int.parse(match.group(1)!);
  final minute = int.tryParse(match.group(2) ?? '0') ?? 0;
  if (hour == 12) hour = 0;
  if (match.group(3) == 'p') hour += 12;
  return hour + minute / 60;
}

String _formatHour(double rawHour) {
  var totalMinutes = (rawHour * 60).round();
  totalMinutes %= 24 * 60;
  final hour24 = totalMinutes ~/ 60;
  final minute = totalMinutes % 60;
  final suffix = hour24 >= 12 ? 'PM' : 'AM';
  final displayHour = hour24 % 12 == 0 ? 12 : hour24 % 12;
  return '${displayHour.toString().padLeft(2, '0')}:${minute.toString().padLeft(2, '0')} $suffix';
}

String _formatChartTime(String value) {
  final hour = _parseFixtureHour(value);
  return hour == null ? value : _formatHour(hour);
}

String _formatRawValue(double value) {
  if (value == value.roundToDouble()) return value.round().toString();
  return value.toString();
}

String _formatAxisNumber(double value) {
  if (value == value.roundToDouble()) return value.round().toString();
  final absolute = value.abs();
  if (absolute >= 1) return value.toStringAsFixed(1);
  if (absolute >= 0.01) return value.toStringAsFixed(2);
  return value.toStringAsFixed(3);
}

Path _monotonePath(List<Offset> points) {
  final path = Path();
  if (points.isEmpty) return path;
  path.moveTo(points.first.dx, points.first.dy);
  if (points.length == 1) return path;
  if (points.length == 2) {
    path.lineTo(points.last.dx, points.last.dy);
    return path;
  }

  final slopes = <double>[];
  for (var index = 0; index < points.length - 1; index += 1) {
    final dx = points[index + 1].dx - points[index].dx;
    slopes.add(dx == 0 ? 0 : (points[index + 1].dy - points[index].dy) / dx);
  }
  final tangents = List<double>.filled(points.length, 0);
  tangents[0] = slopes[0];
  tangents[points.length - 1] = slopes.last;
  for (var index = 1; index < points.length - 1; index += 1) {
    if (slopes[index - 1] * slopes[index] <= 0) {
      tangents[index] = 0;
    } else {
      tangents[index] = (slopes[index - 1] + slopes[index]) / 2;
    }
  }
  for (var index = 0; index < slopes.length; index += 1) {
    if (slopes[index] == 0) {
      tangents[index] = 0;
      tangents[index + 1] = 0;
      continue;
    }
    final a = tangents[index] / slopes[index];
    final b = tangents[index + 1] / slopes[index];
    final magnitude = math.sqrt(a * a + b * b);
    if (magnitude > 3) {
      final scale = 3 / magnitude;
      tangents[index] = scale * a * slopes[index];
      tangents[index + 1] = scale * b * slopes[index];
    }
  }
  for (var index = 0; index < points.length - 1; index += 1) {
    final start = points[index];
    final end = points[index + 1];
    final dx = end.dx - start.dx;
    path.cubicTo(
      start.dx + dx / 3,
      start.dy + tangents[index] * dx / 3,
      end.dx - dx / 3,
      end.dy - tangents[index + 1] * dx / 3,
      end.dx,
      end.dy,
    );
  }
  return path;
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
