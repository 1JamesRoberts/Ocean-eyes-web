import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:intl/intl.dart' show DateFormat;
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../core/theme/oceaneyes_tokens.dart';
import '../../models/aquarium_models.dart';
import '../../view_models/oceaneyes_controller.dart';
import '../widgets/glass.dart';

class HistoryScreen extends StatelessWidget {
  const HistoryScreen({super.key, required this.controller});

  final OceanEyesController controller;

  @override
  Widget build(BuildContext context) {
    final readings = controller.history;
    final ph = _metricValue(controller.waterMetrics, 'pH Level');
    final temperature = _metricValue(controller.waterMetrics, 'Temperature');

    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        GlassCard(
          padding: const EdgeInsets.fromLTRB(20, 14, 20, 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const _HistorySectionHeader(
                icon: LucideIcons.waves,
                title: 'Water Clarity Trend',
                divider: true,
              ),
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 10),
                child: _MiniClarityChart(readings: readings, height: 180),
              ),
              const SizedBox(height: OceanSpacing.xs),
              const _TimelineLabels(),
            ],
          ),
        ),
        // The web section header carries a -4 px top margin inside a 16 px
        // page gap, so its visible edge begins 12 px below the chart card.
        const SizedBox(height: OceanSpacing.sm),
        const _HistorySectionHeader(
          icon: LucideIcons.database,
          title: 'Recent Readings',
        ),
        const SizedBox(height: OceanSpacing.md),
        if (readings.isNotEmpty)
          ..._withSpacing(
            readings
                .take(8)
                .map(
                  (reading) => _HistoryReadingRow(
                    reading: reading,
                    ph: ph,
                    temperature: temperature,
                  ),
                ),
          ),
      ],
    );
  }
}

class _HistorySectionHeader extends StatelessWidget {
  const _HistorySectionHeader({
    required this.icon,
    required this.title,
    this.divider = false,
  });

  final IconData icon;
  final String title;
  final bool divider;

  @override
  Widget build(BuildContext context) {
    final row = Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(top: 2),
          child: Icon(icon, size: 16, color: OceanColors.ink),
        ),
        const SizedBox(width: OceanSpacing.xs),
        Expanded(child: Text(title, style: OceanTypography.title)),
      ],
    );
    if (!divider) return row;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        row,
        const SizedBox(height: 10),
        Divider(
          height: 1,
          color: OceanColors.slateGrey.withValues(alpha: 0.15),
        ),
        const SizedBox(height: OceanSpacing.xxs),
      ],
    );
  }
}

class _MiniClarityChart extends StatelessWidget {
  const _MiniClarityChart({required this.readings, required this.height});

  final List<HistoryReading> readings;
  final double height;

  @override
  Widget build(BuildContext context) {
    final ordered = readings.reversed.toList(growable: false);
    final visible = ordered.length > 7
        ? ordered.sublist(ordered.length - 7)
        : ordered;
    if (visible.isEmpty) {
      return Semantics(
        container: true,
        label: 'No water clarity readings available',
        child: SizedBox(
          height: 140,
          child: Center(
            child: Text(
              'No water clarity readings available',
              textAlign: TextAlign.center,
              style: OceanTypography.bodyMuted,
            ),
          ),
        ),
      );
    }

    return Semantics(
      image: true,
      label:
          'Water clarity trend. '
          '${visible.map((reading) => _number(reading.clarity)).join(', ')}.',
      child: SizedBox(
        width: double.infinity,
        height: height,
        child: CustomPaint(
          painter: _MiniClarityChartPainter(
            values: visible.map((reading) => reading.clarity).toList(),
            textDirection: Directionality.of(context),
          ),
        ),
      ),
    );
  }
}

class _MiniClarityChartPainter extends CustomPainter {
  const _MiniClarityChartPainter({
    required this.values,
    required this.textDirection,
  });

  static const _padding = 20.0;
  static const _labelGap = 8.0;

  final List<double> values;
  final TextDirection textDirection;

  @override
  void paint(Canvas canvas, Size size) {
    final maxClarity = values.reduce(math.max);
    final maxValue = math.max(5.0, maxClarity.ceilToDouble());
    final plotTop = _padding + _labelGap;
    final plotHeight = size.height - _padding - plotTop;
    final baseline = size.height - _padding;
    final horizontalSpan = size.width - 2 * _padding;
    final points = <Offset>[
      for (var index = 0; index < values.length; index++)
        Offset(
          _padding + index * horizontalSpan / math.max(1, values.length - 1),
          baseline - values[index] * plotHeight / maxValue,
        ),
    ];

    final baselinePaint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1
      ..color = OceanColors.azureMist2;
    canvas.drawLine(
      Offset(_padding, baseline),
      Offset(size.width - _padding, baseline),
      baselinePaint,
    );

    final dashedPaint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 0.5
      ..color = OceanColors.azureMist2;
    _drawDashedLine(
      canvas,
      Offset(_padding, size.height / 2),
      Offset(size.width - _padding, size.height / 2),
      dashedPaint,
    );
    _drawDashedLine(
      canvas,
      const Offset(_padding, _padding),
      Offset(size.width - _padding, _padding),
      dashedPaint,
    );
    final verticalPaint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 0.5
      ..color = OceanColors.azureMist2.withValues(alpha: 0.50);
    for (final point in points) {
      _drawDashedLine(
        canvas,
        Offset(point.dx, _padding),
        Offset(point.dx, baseline),
        verticalPaint,
      );
    }

    final areaPath = Path()
      ..moveTo(points.first.dx, baseline)
      ..lineTo(points.first.dx, points.first.dy);
    for (final point in points.skip(1)) {
      areaPath.lineTo(point.dx, point.dy);
    }
    areaPath
      ..lineTo(points.last.dx, baseline)
      ..close();
    canvas.drawPath(
      areaPath,
      Paint()
        ..style = PaintingStyle.fill
        ..shader = LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [
            OceanColors.skySurge.withValues(alpha: 0.30),
            OceanColors.skySurge.withValues(alpha: 0),
          ],
        ).createShader(areaPath.getBounds()),
    );

    final linePath = Path()..moveTo(points.first.dx, points.first.dy);
    for (final point in points.skip(1)) {
      linePath.lineTo(point.dx, point.dy);
    }
    canvas.drawPath(
      linePath,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 2.5
        ..strokeCap = StrokeCap.round
        ..color = OceanColors.skySurge,
    );

    for (var index = 0; index < points.length; index++) {
      final point = points[index];
      canvas.drawCircle(
        point,
        4,
        Paint()
          ..style = PaintingStyle.fill
          ..color = OceanColors.skySurge,
      );
      canvas.drawCircle(
        point,
        4,
        Paint()
          ..style = PaintingStyle.stroke
          ..strokeWidth = 2
          ..color = OceanColors.white,
      );
      final label = TextPainter(
        text: TextSpan(
          text: _number(values[index]),
          style: const TextStyle(
            fontFamily: OceanTypography.family,
            fontSize: 9,
            height: 1,
            fontWeight: FontWeight.w700,
            color: OceanColors.ink,
          ),
        ),
        textDirection: textDirection,
      )..layout();
      final baseline = label.computeDistanceToActualBaseline(
        TextBaseline.alphabetic,
      );
      label.paint(
        canvas,
        Offset(point.dx - label.width / 2, point.dy - 8 - baseline),
      );
    }
  }

  void _drawDashedLine(Canvas canvas, Offset start, Offset end, Paint paint) {
    final delta = end - start;
    final length = delta.distance;
    if (length == 0) return;
    final direction = delta / length;
    var distance = 0.0;
    while (distance < length) {
      final dashEnd = math.min(distance + 3, length);
      canvas.drawLine(
        start + direction * distance,
        start + direction * dashEnd,
        paint,
      );
      distance += 6;
    }
  }

  @override
  bool shouldRepaint(covariant _MiniClarityChartPainter oldDelegate) => true;
}

class _TimelineLabels extends StatelessWidget {
  const _TimelineLabels();

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: 'Timeline from older readings through recent scans to today',
      child: ExcludeSemantics(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 10),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('OLDER', style: OceanTypography.caption),
              Expanded(
                child: Text(
                  'RECENT SCANS',
                  maxLines: 1,
                  textAlign: TextAlign.center,
                  style: OceanTypography.caption,
                ),
              ),
              Text('TODAY', style: OceanTypography.caption),
            ],
          ),
        ),
      ),
    );
  }
}

class _HistoryReadingRow extends StatelessWidget {
  const _HistoryReadingRow({
    required this.reading,
    required this.ph,
    required this.temperature,
  });

  final HistoryReading reading;
  final String ph;
  final String temperature;

  @override
  Widget build(BuildContext context) {
    final day = DateFormat('MMM d').format(reading.date);
    final time = DateFormat('hh:mm a').format(reading.date);
    final clarity = _number(reading.clarity);
    final metadata = '$day · $time · ${reading.fishCount} fish visible';

    return Semantics(
      container: true,
      readOnly: true,
      label:
          'Clarity $clarity out of 10. $metadata. '
          'pH $ph. Temperature $temperature degrees Celsius.',
      child: ExcludeSemantics(
        child: Container(
          padding: const EdgeInsets.symmetric(
            horizontal: OceanSpacing.md,
            vertical: OceanSpacing.sm,
          ),
          decoration: BoxDecoration(
            color: OceanColors.white.withValues(alpha: 0.20),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: OceanColors.white.withValues(alpha: 0.20),
            ),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Clarity: $clarity/10', style: OceanTypography.strong),
                    const SizedBox(height: 2),
                    Text(metadata, style: OceanTypography.caption),
                  ],
                ),
              ),
              const SizedBox(width: OceanSpacing.sm),
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text('pH $ph', style: OceanTypography.caption),
                  const SizedBox(width: OceanSpacing.sm),
                  Text('$temperature°C', style: OceanTypography.caption),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

String _metricValue(List<WaterMetric> metrics, String label) {
  for (final metric in metrics) {
    if (metric.label == label) return metric.value;
  }
  return '—';
}

String _number(double value) => value == value.roundToDouble()
    ? value.round().toString()
    : value.toString();

List<Widget> _withSpacing(Iterable<Widget> children) {
  final result = <Widget>[];
  for (final child in children) {
    if (result.isNotEmpty) result.add(const SizedBox(height: OceanSpacing.md));
    result.add(child);
  }
  return result;
}
