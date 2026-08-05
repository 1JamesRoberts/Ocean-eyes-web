import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../core/theme/oceaneyes_tokens.dart';
import '../../models/aquarium_models.dart';
import '../../view_models/oceaneyes_controller.dart';
import '../widgets/data_visuals.dart';
import '../widgets/glass.dart';

class HistoryScreen extends StatelessWidget {
  const HistoryScreen({super.key, required this.controller});

  final OceanEyesController controller;

  @override
  Widget build(BuildContext context) {
    final readings = controller.history;
    final chartPoints = readings
        .take(7)
        .toList(growable: false)
        .reversed
        .map(
          (reading) => ChartPoint(
            DateFormat('ha').format(reading.date).toLowerCase(),
            reading.clarity,
          ),
        )
        .toList(growable: false);

    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        GlassCard(
          padding: const EdgeInsets.fromLTRB(17, 13, 17, 15),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const _TrendHeader(),
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 10),
                child: OceanLineChart(
                  points: chartPoints,
                  semanticLabel: 'Water clarity trend, score out of 10',
                  height: 180,
                  showValueLabels: true,
                  minimumY: 5,
                ),
              ),
              const SizedBox(height: OceanSpacing.xs),
              const _TimelineLabels(),
            ],
          ),
        ),
        const SizedBox(height: OceanSpacing.sm),
        const _RecentReadingsHeader(),
        const SizedBox(height: OceanSpacing.md),
        ..._withSpacing(
          readings
              .take(8)
              .map((reading) => _HistoryReadingRow(reading: reading)),
        ),
      ],
    );
  }
}

class _TrendHeader extends StatelessWidget {
  const _TrendHeader();

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Padding(
              padding: EdgeInsets.only(top: 2),
              child: Icon(
                LucideIcons.waves,
                size: 16,
                color: OceanColors.prussianBlue,
              ),
            ),
            const SizedBox(width: OceanSpacing.xs),
            Expanded(
              child: Text('Water Clarity Trend', style: OceanTypography.title),
            ),
          ],
        ),
        const SizedBox(height: OceanSpacing.xs),
        Divider(
          height: 1,
          color: OceanColors.slateGrey.withValues(alpha: 0.15),
        ),
        const SizedBox(height: OceanSpacing.xxs),
      ],
    );
  }
}

class _RecentReadingsHeader extends StatelessWidget {
  const _RecentReadingsHeader();

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Padding(
          padding: EdgeInsets.only(top: 2),
          child: Icon(
            LucideIcons.database,
            size: 16,
            color: OceanColors.prussianBlue,
          ),
        ),
        const SizedBox(width: OceanSpacing.xs),
        Expanded(child: Text('Recent Readings', style: OceanTypography.title)),
      ],
    );
  }
}

class _TimelineLabels extends StatelessWidget {
  const _TimelineLabels();

  @override
  Widget build(BuildContext context) {
    const style = OceanTypography.caption;

    return Semantics(
      label: 'Timeline from older readings through recent scans to today',
      child: ExcludeSemantics(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 10),
          child: Row(
            children: [
              Expanded(child: Text('OLDER', style: style)),
              Expanded(
                child: Text(
                  'RECENT SCANS',
                  textAlign: TextAlign.center,
                  style: style,
                ),
              ),
              Expanded(
                child: Text('TODAY', textAlign: TextAlign.end, style: style),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _HistoryReadingRow extends StatelessWidget {
  const _HistoryReadingRow({required this.reading});

  final HistoryReading reading;

  @override
  Widget build(BuildContext context) {
    final day = DateFormat('MMM d').format(reading.date);
    final time = DateFormat('hh:mm a').format(reading.date);
    final clarity = _formatReadingValue(reading.clarity);
    final ph = reading.ph == null ? '—' : _formatReadingValue(reading.ph!);
    final temp = reading.temp == null
        ? '—'
        : _formatReadingValue(reading.temp!);
    final metadata = '$day · $time · ${reading.fishCount} fish visible';

    return Semantics(
      container: true,
      readOnly: true,
      label: 'Clarity $clarity out of 10. $metadata. pH $ph. $temp degrees C.',
      child: ExcludeSemantics(
        child: GlassPanel(
          key: ValueKey(
            'history-reading-${reading.date.microsecondsSinceEpoch}',
          ),
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              Expanded(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Clarity: $clarity/10', style: OceanTypography.strong),
                    const SizedBox(height: 2),
                    Text(metadata, style: OceanTypography.caption),
                  ],
                ),
              ),
              const SizedBox(width: OceanSpacing.sm),
              DefaultTextStyle(
                style: OceanTypography.caption,
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text('pH $ph'),
                    const SizedBox(width: OceanSpacing.sm),
                    Text('$temp°C'),
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

String _formatReadingValue(double value) {
  if (value == value.roundToDouble()) return value.round().toString();
  return value.toString();
}

List<Widget> _withSpacing(Iterable<Widget> children) {
  final result = <Widget>[];
  for (final child in children) {
    if (result.isNotEmpty) result.add(const SizedBox(height: OceanSpacing.md));
    result.add(child);
  }
  return result;
}
