import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../core/theme/oceaneyes_tokens.dart';
import '../../models/aquarium_models.dart';
import '../../view_models/oceaneyes_controller.dart';
import '../widgets/data_visuals.dart';
import '../widgets/glass.dart';
import '../widgets/screen_primitives.dart';

class HistoryScreen extends StatelessWidget {
  const HistoryScreen({super.key, required this.controller});

  final OceanEyesController controller;

  @override
  Widget build(BuildContext context) {
    final readings = controller.history;
    final chartPoints = readings.reversed
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
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const CardHeader(
                icon: LucideIcons.waves,
                title: 'Water Clarity Trend',
                divider: true,
              ),
              const SizedBox(height: 10),
              if (chartPoints.isEmpty)
                Semantics(
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
                )
              else
                OceanLineChart(
                  points: chartPoints,
                  semanticLabel: 'Water clarity trend in FNU',
                  height: 180,
                  showValueLabels: true,
                  minimumY: 5,
                ),
              const SizedBox(height: OceanSpacing.xs),
              const _TimelineLabels(),
            ],
          ),
        ),
        const SizedBox(height: OceanSpacing.md),
        const CardHeader(icon: LucideIcons.database, title: 'Recent Readings'),
        if (readings.isNotEmpty) ...[
          const SizedBox(height: OceanSpacing.xs),
          ..._withSpacing(
            readings
                .take(8)
                .map((reading) => _HistoryReadingRow(reading: reading)),
          ),
        ],
      ],
    );
  }
}

class _TimelineLabels extends StatelessWidget {
  const _TimelineLabels();

  @override
  Widget build(BuildContext context) {
    final style = OceanTypography.caption.copyWith(
      fontSize: 10,
      fontWeight: FontWeight.w600,
      letterSpacing: 0.2,
    );

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
    final time = DateFormat('h:mm a').format(reading.date);
    final clarity = reading.clarity.toStringAsFixed(1);
    final metadata = '$day · $time · ${reading.fishCount} fish visible';

    return Semantics(
      container: true,
      readOnly: true,
      label: 'Clarity $clarity FNU. $metadata. ${reading.summary}',
      child: ExcludeSemantics(
        child: GlassPanel(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      'Clarity: $clarity FNU',
                      style: OceanTypography.strong,
                    ),
                  ),
                  const SizedBox(width: OceanSpacing.xs),
                  GlassPill(
                    color: OceanColors.verdigris.withValues(alpha: 0.10),
                    foregroundColor: OceanColors.darkCyan,
                    padding: const EdgeInsets.symmetric(
                      horizontal: 10,
                      vertical: 4,
                    ),
                    child: Text('${reading.fishCount} fish'),
                  ),
                ],
              ),
              const SizedBox(height: OceanSpacing.xxs),
              Text(metadata, style: OceanTypography.caption),
              const SizedBox(height: OceanSpacing.xs),
              Text(reading.summary, style: OceanTypography.bodyMuted),
            ],
          ),
        ),
      ),
    );
  }
}

List<Widget> _withSpacing(Iterable<Widget> children) {
  final result = <Widget>[];
  for (final child in children) {
    if (result.isNotEmpty) result.add(const SizedBox(height: OceanSpacing.md));
    result.add(child);
  }
  return result;
}
