import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../core/theme/oceaneyes_tokens.dart';
import '../../models/aquarium_models.dart';
import '../../view_models/oceaneyes_controller.dart';
import '../widgets/data_visuals.dart';
import '../widgets/glass.dart';
import '../widgets/screen_primitives.dart';

class AnalyticsScreen extends StatefulWidget {
  const AnalyticsScreen({super.key, required this.controller});

  final OceanEyesController controller;

  @override
  State<AnalyticsScreen> createState() => _AnalyticsScreenState();
}

class _AnalyticsScreenState extends State<AnalyticsScreen> {
  OceanEyesController get controller => widget.controller;

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: controller,
      builder: (context, _) {
        _scheduleHeroFilterRequest(context);
        return Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            AnimatedSwitcher(
              duration: OceanMotion.responsive(context, OceanMotion.fade),
              switchInCurve: Curves.easeOut,
              switchOutCurve: Curves.easeIn,
              child: KeyedSubtree(
                key: ValueKey(controller.analyticsState),
                child: _stateContent(controller),
              ),
            ),
          ],
        );
      },
    );
  }

  void _scheduleHeroFilterRequest(BuildContext context) {
    final showSpecies = controller.consumeAnalyticsSpeciesRequest();
    final showRange = controller.consumeAnalyticsRangeRequest();
    if (!showSpecies && !showRange) return;
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      if (!mounted) return;
      if (showSpecies) {
        await _showAnalyticsSpeciesSelector(context, controller);
        return;
      }
      if (showRange) await _showAnalyticsRangeEditor(context, controller);
    });
  }

  Widget _stateContent(OceanEyesController controller) {
    return switch (controller.analyticsState) {
      AnalyticsContentState.loading => const _AnalyticsLoadingState(),
      AnalyticsContentState.empty => _AnalyticsEmptyState(
        range: controller.analyticsRange,
      ),
      AnalyticsContentState.error => _AnalyticsErrorState(
        onRetry: controller.retryAnalytics,
      ),
      AnalyticsContentState.populated => _AnalyticsPopulatedState(
        controller: controller,
      ),
    };
  }
}

Future<void> _showAnalyticsSpeciesSelector(
  BuildContext context,
  OceanEyesController controller,
) async {
  final options = <String>[
    'All species',
    ...controller.fish.map((entry) => entry.name),
  ];
  final selected = await showOceanDialog<String>(
    context: context,
    child: _SpeciesSelectorDialog(
      options: options.toSet().toList(growable: false),
      selected: controller.selectedSpecies,
    ),
  );
  if (selected != null) controller.setSelectedSpecies(selected);
}

Future<void> _showAnalyticsRangeEditor(
  BuildContext context,
  OceanEyesController controller,
) async {
  final result = await showOceanDialog<_RangeSelection>(
    context: context,
    barrierDismissible: false,
    child: _DateRangeEditorDialog(
      range: controller.analyticsRange,
      startTime: controller.analyticsStartTime,
      endTime: controller.analyticsEndTime,
    ),
  );
  if (result == null) return;
  controller.setAnalyticsRange(
    result.range,
    start: result.startTime,
    end: result.endTime,
  );
}

class _SpeciesSelectorDialog extends StatelessWidget {
  const _SpeciesSelectorDialog({required this.options, required this.selected});

  final List<String> options;
  final String selected;

  @override
  Widget build(BuildContext context) {
    final availableHeight = math.max(
      260.0,
      MediaQuery.sizeOf(context).height - 64,
    );
    return ConstrainedBox(
      constraints: BoxConstraints(maxWidth: 361, maxHeight: availableHeight),
      child: GlassCard(
        overlay: true,
        padding: const EdgeInsets.fromLTRB(12, 12, 12, 10),
        semanticLabel: 'Species selector',
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'Filter by species',
                    style: OceanTypography.title,
                  ),
                ),
                GlassIconButton(
                  icon: LucideIcons.x,
                  tooltip: 'Close species selector',
                  onPressed: () => Navigator.of(context).pop(),
                ),
              ],
            ),
            const SizedBox(height: OceanSpacing.xxs),
            Flexible(
              child: ListView.separated(
                shrinkWrap: true,
                itemCount: options.length,
                separatorBuilder: (_, _) => const SizedBox(height: 2),
                itemBuilder: (context, index) {
                  final option = options[index];
                  final isSelected = option == selected;
                  return Semantics(
                    selected: isSelected,
                    button: true,
                    label: option,
                    onTap: () => Navigator.of(context).pop(option),
                    excludeSemantics: true,
                    child: Material(
                      color: isSelected
                          ? OceanColors.verdigris.withValues(alpha: 0.12)
                          : Colors.transparent,
                      borderRadius: BorderRadius.circular(OceanRadii.inline),
                      child: InkWell(
                        borderRadius: BorderRadius.circular(OceanRadii.inline),
                        onTap: () => Navigator.of(context).pop(option),
                        child: SizedBox(
                          height: OceanGeometry.minimumTouchTarget,
                          child: Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 12),
                            child: Row(
                              children: [
                                Expanded(
                                  child: Text(
                                    option,
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: isSelected
                                        ? OceanTypography.strong
                                        : OceanTypography.body,
                                  ),
                                ),
                                if (isSelected)
                                  const Icon(
                                    LucideIcons.check,
                                    size: 18,
                                    color: OceanColors.darkCyan,
                                  ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _AnalyticsLoadingState extends StatelessWidget {
  const _AnalyticsLoadingState();

  @override
  Widget build(BuildContext context) {
    const heights = [232.0, 232.0, 210.0, 176.0];
    return Semantics(
      container: true,
      liveRegion: true,
      label: 'Loading analytics',
      child: ExcludeSemantics(
        child: Column(
          children: [
            for (var index = 0; index < heights.length; index += 1) ...[
              GlassCard(
                child: SizedBox(
                  height: heights[index],
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Align(
                        alignment: Alignment.centerLeft,
                        child: _SkeletonBlock(
                          width: index == 3 ? 154 : 174,
                          height: 18,
                        ),
                      ),
                      const SizedBox(height: OceanSpacing.lg),
                      const Expanded(child: _SkeletonBlock()),
                    ],
                  ),
                ),
              ),
              if (index != heights.length - 1)
                const SizedBox(height: OceanSpacing.md),
            ],
          ],
        ),
      ),
    );
  }
}

class _SkeletonBlock extends StatelessWidget {
  const _SkeletonBlock({this.width, this.height});

  final double? width;
  final double? height;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: width,
      height: height,
      decoration: BoxDecoration(
        color: OceanColors.pearlAqua.withValues(alpha: 0.26),
        borderRadius: BorderRadius.circular(OceanRadii.inline),
      ),
    );
  }
}

class _AnalyticsEmptyState extends StatelessWidget {
  const _AnalyticsEmptyState({required this.range});

  final DateTimeRange range;

  @override
  Widget build(BuildContext context) {
    return StateCard(
      icon: LucideIcons.calendarDays,
      title: 'No data for ${_fullDate(range.start)} – ${_fullDate(range.end)}',
      description:
          'Choose another range or run the AI pipeline to generate history.',
    );
  }
}

class _AnalyticsErrorState extends StatelessWidget {
  const _AnalyticsErrorState({required this.onRetry});

  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return GlassCard(
      borderColor: OceanColors.critical.withValues(alpha: 0.62),
      semanticLabel:
          'Analytics could not be loaded. The aquarium data service did not respond.',
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 30),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: OceanColors.critical.withValues(alpha: 0.10),
              borderRadius: BorderRadius.circular(OceanRadii.inline),
            ),
            child: const Icon(
              LucideIcons.triangleAlert,
              size: 24,
              color: OceanColors.critical,
            ),
          ),
          const SizedBox(height: 14),
          Text(
            'Analytics could not be loaded',
            textAlign: TextAlign.center,
            style: OceanTypography.title,
          ),
          const SizedBox(height: 6),
          Text(
            'The aquarium data service did not respond. Try loading the analytics again.',
            textAlign: TextAlign.center,
            style: OceanTypography.bodyMuted,
          ),
          const SizedBox(height: 18),
          GlassButton(
            label: 'Retry',
            icon: LucideIcons.refreshCw,
            style: GlassButtonStyle.outline,
            onPressed: onRetry,
          ),
        ],
      ),
    );
  }
}

class _AnalyticsPopulatedState extends StatelessWidget {
  const _AnalyticsPopulatedState({required this.controller});

  final OceanEyesController controller;

  @override
  Widget build(BuildContext context) {
    final species = controller.selectedSpecies;
    final fishCountPoints = controller.fishCountPoints;
    final spreadPoints = controller.spreadPoints;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        GlassCard(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const CardHeader(
                icon: LucideIcons.fish,
                title: 'Fish Count Over Time',
                divider: true,
              ),
              const SizedBox(height: OceanSpacing.sm),
              OceanBarChart(
                points: fishCountPoints,
                semanticLabel: 'Fish count over time for $species',
                height: 180,
              ),
            ],
          ),
        ),
        const SizedBox(height: OceanSpacing.md),
        GlassCard(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const CardHeader(
                icon: LucideIcons.activity,
                title: 'Fish Spread Over Time',
                divider: true,
              ),
              const SizedBox(height: OceanSpacing.sm),
              OceanLineChart(
                points: spreadPoints,
                semanticLabel:
                    'Mean nearest-neighbor fish spread over time for $species',
                color: OceanColors.warning,
                height: 180,
              ),
            ],
          ),
        ),
        const SizedBox(height: OceanSpacing.md),
        GlassCard(
          onTap: controller.openHistory,
          semanticLabel: 'Water Clarity Trend. Opens detailed clarity history.',
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              CardHeader(
                icon: LucideIcons.waves,
                title: 'Water Clarity Trend',
                divider: true,
                trailing: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      'History',
                      style: OceanTypography.caption.copyWith(
                        color: OceanColors.darkCyan,
                      ),
                    ),
                    const SizedBox(width: 2),
                    const Icon(
                      LucideIcons.chevronRight,
                      size: 16,
                      color: OceanColors.darkCyan,
                    ),
                  ],
                ),
              ),
              const SizedBox(height: OceanSpacing.sm),
              OceanLineChart(
                points: controller.claritySeries,
                semanticLabel: 'Water clarity trend, clarity score percent',
                color: OceanColors.verdigris,
                height: 164,
                showValueLabels: true,
                minimumY: 100,
              ),
            ],
          ),
        ),
        const SizedBox(height: OceanSpacing.md),
        _DiagnosticsCard(controller: controller),
      ],
    );
  }
}

class _DiagnosticsCard extends StatelessWidget {
  const _DiagnosticsCard({required this.controller});

  final OceanEyesController controller;

  @override
  Widget build(BuildContext context) {
    final diagnostics = controller.fishDiagnostics;
    final dateLabel =
        '${_fullDate(controller.analyticsRange.start)} – ${_fullDate(controller.analyticsRange.end)}';

    return GlassCard(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const CardHeader(
            icon: LucideIcons.brain,
            title: 'Fish Diagnostics',
            divider: true,
          ),
          const SizedBox(height: OceanSpacing.sm),
          if (diagnostics.isEmpty)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: OceanSpacing.lg),
              child: Text(
                'No health diagnostic records found for $dateLabel.',
                textAlign: TextAlign.center,
                style: OceanTypography.bodyMuted,
              ),
            )
          else
            for (var index = 0; index < diagnostics.length; index += 1) ...[
              _DiagnosisPanel(diagnostic: diagnostics[index]),
              if (index != diagnostics.length - 1)
                const SizedBox(height: OceanSpacing.sm),
            ],
        ],
      ),
    );
  }
}

class _DiagnosisPanel extends StatelessWidget {
  const _DiagnosisPanel({required this.diagnostic});

  final FishDiagnostic diagnostic;

  @override
  Widget build(BuildContext context) {
    final fish = diagnostic.fish;
    final time = DateFormat('h:mm a').format(diagnostic.scannedAt);

    return Semantics(
      container: true,
      label:
          '${fish.name}. ${diagnostic.status}. ${diagnostic.confidence} percent '
          'confidence. Scanned at $time. Observation: '
          '${diagnostic.observation}',
      child: ExcludeSemantics(
        child: GlassPanel(
          borderColor: OceanColors.good.withValues(alpha: 0.52),
          padding: const EdgeInsets.all(12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      fish.name,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: OceanTypography.strong,
                    ),
                  ),
                  const SizedBox(width: OceanSpacing.xs),
                  GlassPill(
                    color: OceanColors.good.withValues(alpha: 0.11),
                    foregroundColor: OceanColors.goodInk,
                    padding: const EdgeInsets.symmetric(
                      horizontal: 9,
                      vertical: 3,
                    ),
                    child: Text(diagnostic.status),
                  ),
                ],
              ),
              const SizedBox(height: OceanSpacing.xs),
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  ClipRRect(
                    borderRadius: BorderRadius.circular(OceanRadii.inline),
                    child: Image.asset(
                      fish.assetPath,
                      width: 72,
                      height: 72,
                      fit: BoxFit.cover,
                      errorBuilder: (_, _, _) => Container(
                        width: 72,
                        height: 72,
                        color: OceanColors.pearlAqua.withValues(alpha: 0.20),
                        alignment: Alignment.center,
                        child: const Icon(
                          LucideIcons.fish,
                          color: OceanColors.inkMuted,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: OceanSpacing.sm),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          '${diagnostic.confidence}% confidence · $time',
                          style: OceanTypography.caption,
                        ),
                        const SizedBox(height: OceanSpacing.xxs),
                        Text(
                          'Observation: ${diagnostic.observation}',
                          style: OceanTypography.body.copyWith(fontSize: 13),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _RangeSelection {
  const _RangeSelection({
    required this.range,
    required this.startTime,
    required this.endTime,
  });

  final DateTimeRange range;
  final TimeOfDay startTime;
  final TimeOfDay endTime;
}

enum _RangeField { startDate, startTime, endDate, endTime }

class _DateRangeEditorDialog extends StatefulWidget {
  const _DateRangeEditorDialog({
    required this.range,
    required this.startTime,
    required this.endTime,
  });

  final DateTimeRange range;
  final TimeOfDay startTime;
  final TimeOfDay endTime;

  @override
  State<_DateRangeEditorDialog> createState() => _DateRangeEditorDialogState();
}

class _DateRangeEditorDialogState extends State<_DateRangeEditorDialog> {
  late DateTime _startDate = DateUtils.dateOnly(widget.range.start);
  late DateTime _endDate = DateUtils.dateOnly(widget.range.end);
  late TimeOfDay _startTime = widget.startTime;
  late TimeOfDay _endTime = widget.endTime;
  _RangeField _activeField = _RangeField.startDate;

  bool get _showingCalendar =>
      _activeField == _RangeField.startDate ||
      _activeField == _RangeField.endDate;

  @override
  Widget build(BuildContext context) {
    final mediaSize = MediaQuery.sizeOf(context);
    final desiredHeight = _showingCalendar ? 680.0 : 610.0;
    final height = math.min(desiredHeight, mediaSize.height - 64).toDouble();

    return SizedBox(
      key: const ValueKey('analytics-range-editor'),
      width: math.min(361, mediaSize.width - 32).toDouble(),
      height: height,
      child: GlassCard(
        overlay: true,
        padding: const EdgeInsets.fromLTRB(12, 12, 12, 10),
        semanticLabel: 'Date and time range editor',
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'Date & time range',
                    style: OceanTypography.title,
                  ),
                ),
                GlassIconButton(
                  icon: LucideIcons.x,
                  tooltip: 'Cancel date range changes',
                  onPressed: () => Navigator.of(context).pop(),
                ),
              ],
            ),
            const SizedBox(height: OceanSpacing.xs),
            Expanded(
              child: SingleChildScrollView(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    _RangeEditorRow(
                      label: 'Starts',
                      date: _startDate,
                      time: _startTime,
                      activeDate: _activeField == _RangeField.startDate,
                      activeTime: _activeField == _RangeField.startTime,
                      onDateTap: () =>
                          setState(() => _activeField = _RangeField.startDate),
                      onTimeTap: () =>
                          setState(() => _activeField = _RangeField.startTime),
                    ),
                    const SizedBox(height: OceanSpacing.xs),
                    _RangeEditorRow(
                      label: 'Ends',
                      date: _endDate,
                      time: _endTime,
                      activeDate: _activeField == _RangeField.endDate,
                      activeTime: _activeField == _RangeField.endTime,
                      onDateTap: () =>
                          setState(() => _activeField = _RangeField.endDate),
                      onTimeTap: () =>
                          setState(() => _activeField = _RangeField.endTime),
                    ),
                    const SizedBox(height: OceanSpacing.sm),
                    AnimatedSwitcher(
                      duration: OceanMotion.responsive(
                        context,
                        OceanMotion.fade,
                      ),
                      child: _activeEditor(),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: OceanSpacing.sm),
            Row(
              children: [
                Expanded(
                  child: GlassButton(
                    label: 'Cancel',
                    style: GlassButtonStyle.outline,
                    expanded: true,
                    onPressed: () => Navigator.of(context).pop(),
                  ),
                ),
                const SizedBox(width: OceanSpacing.xs),
                Expanded(
                  child: GlassButton(
                    label: 'Apply',
                    icon: LucideIcons.check,
                    expanded: true,
                    onPressed: _apply,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _activeEditor() {
    return switch (_activeField) {
      _RangeField.startDate => _OceanCalendar(
        key: const ValueKey('start-calendar'),
        selectedDate: _startDate,
        rangeStart: _startDate,
        rangeEnd: _endDate,
        onSelected: (date) {
          setState(() {
            _startDate = DateUtils.dateOnly(date);
            if (_startDate.isAfter(_endDate)) _endDate = _startDate;
          });
        },
      ),
      _RangeField.endDate => _OceanCalendar(
        key: const ValueKey('end-calendar'),
        selectedDate: _endDate,
        rangeStart: _startDate,
        rangeEnd: _endDate,
        onSelected: (date) {
          setState(() {
            _endDate = DateUtils.dateOnly(date);
            if (_endDate.isBefore(_startDate)) _startDate = _endDate;
          });
        },
      ),
      _RangeField.startTime => _OceanTimeWheel(
        key: const ValueKey('start-time-wheel'),
        initialTime: _startTime,
        semanticLabel: 'Start time',
        onChanged: (time) => _startTime = time,
      ),
      _RangeField.endTime => _OceanTimeWheel(
        key: const ValueKey('end-time-wheel'),
        initialTime: _endTime,
        semanticLabel: 'End time',
        onChanged: (time) => _endTime = time,
      ),
    };
  }

  void _apply() {
    var startTime = _startTime;
    var endTime = _endTime;
    var start = _combine(_startDate, startTime);
    var end = _combine(_endDate, endTime);
    if (end.isBefore(start)) {
      endTime = startTime;
      end = start;
    }
    Navigator.of(context).pop(
      _RangeSelection(
        range: DateTimeRange(start: start, end: end),
        startTime: startTime,
        endTime: endTime,
      ),
    );
  }
}

class _RangeEditorRow extends StatelessWidget {
  const _RangeEditorRow({
    required this.label,
    required this.date,
    required this.time,
    required this.activeDate,
    required this.activeTime,
    required this.onDateTap,
    required this.onTimeTap,
  });

  final String label;
  final DateTime date;
  final TimeOfDay time;
  final bool activeDate;
  final bool activeTime;
  final VoidCallback onDateTap;
  final VoidCallback onTimeTap;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        SizedBox(
          width: 52,
          child: Text(
            label,
            textAlign: TextAlign.center,
            style: OceanTypography.caption.copyWith(
              color: OceanColors.ink,
              fontWeight: FontWeight.w700,
            ),
          ),
        ),
        const SizedBox(width: 4),
        Expanded(
          flex: 6,
          child: _RangeFieldButton(
            label: _fullDate(date),
            semanticLabel: '$label date',
            active: activeDate,
            onTap: onDateTap,
          ),
        ),
        const SizedBox(width: 6),
        Expanded(
          flex: 5,
          child: _RangeFieldButton(
            label: _formatTime(time),
            semanticLabel: '$label time',
            active: activeTime,
            onTap: onTimeTap,
          ),
        ),
      ],
    );
  }
}

class _RangeFieldButton extends StatelessWidget {
  const _RangeFieldButton({
    required this.label,
    required this.semanticLabel,
    required this.active,
    required this.onTap,
  });

  final String label;
  final String semanticLabel;
  final bool active;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      selected: active,
      label: semanticLabel,
      value: label,
      onTap: onTap,
      excludeSemantics: true,
      child: SizedBox(
        height: OceanGeometry.minimumTouchTarget,
        child: GlassPanel(
          onTap: onTap,
          borderColor: active
              ? OceanColors.verdigris
              : OceanColors.white.withValues(alpha: 0.30),
          color: active ? OceanColors.verdigris.withValues(alpha: 0.10) : null,
          padding: const EdgeInsets.symmetric(horizontal: 8),
          child: Center(
            child: Text(
              label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: OceanTypography.caption.copyWith(
                color: active ? OceanColors.darkCyan : OceanColors.ink,
                fontWeight: FontWeight.w600,
                fontSize: 12,
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _OceanCalendar extends StatefulWidget {
  const _OceanCalendar({
    super.key,
    required this.selectedDate,
    required this.rangeStart,
    required this.rangeEnd,
    required this.onSelected,
  });

  final DateTime selectedDate;
  final DateTime rangeStart;
  final DateTime rangeEnd;
  final ValueChanged<DateTime> onSelected;

  @override
  State<_OceanCalendar> createState() => _OceanCalendarState();
}

class _OceanCalendarState extends State<_OceanCalendar> {
  static const _weekdays = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

  late DateTime _viewMonth = DateTime(
    widget.selectedDate.year,
    widget.selectedDate.month,
  );

  @override
  Widget build(BuildContext context) {
    final first = DateTime(_viewMonth.year, _viewMonth.month);
    final leading = first.weekday % DateTime.daysPerWeek;
    final dayCount = DateTime(_viewMonth.year, _viewMonth.month + 1, 0).day;
    final cellCount = ((leading + dayCount + 6) ~/ 7) * 7;

    return Semantics(
      container: true,
      label: 'Calendar for ${DateFormat('MMMM yyyy').format(_viewMonth)}',
      child: Column(
        key: ValueKey('${_viewMonth.year}-${_viewMonth.month}'),
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  DateFormat('MMMM yyyy').format(_viewMonth),
                  style: OceanTypography.title,
                ),
              ),
              GlassIconButton(
                icon: LucideIcons.chevronLeft,
                tooltip: 'Previous month',
                onPressed: () => setState(() {
                  _viewMonth = DateTime(_viewMonth.year, _viewMonth.month - 1);
                }),
              ),
              const SizedBox(width: 4),
              GlassIconButton(
                icon: LucideIcons.chevronRight,
                tooltip: 'Next month',
                onPressed: () => setState(() {
                  _viewMonth = DateTime(_viewMonth.year, _viewMonth.month + 1);
                }),
              ),
            ],
          ),
          const SizedBox(height: OceanSpacing.xxs),
          Row(
            children: [
              for (final weekday in _weekdays)
                Expanded(
                  child: Text(
                    weekday,
                    textAlign: TextAlign.center,
                    style: OceanTypography.caption.copyWith(fontSize: 10),
                  ),
                ),
            ],
          ),
          const SizedBox(height: OceanSpacing.xxs),
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: cellCount,
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 7,
              mainAxisExtent: OceanGeometry.minimumTouchTarget,
            ),
            itemBuilder: (context, index) {
              final day = index - leading + 1;
              if (day < 1 || day > dayCount) return const SizedBox.shrink();
              final date = DateTime(_viewMonth.year, _viewMonth.month, day);
              return _CalendarDay(
                date: date,
                selected: DateUtils.isSameDay(date, widget.selectedDate),
                today: DateUtils.isSameDay(date, DateTime.now()),
                inRange:
                    !date.isBefore(DateUtils.dateOnly(widget.rangeStart)) &&
                    !date.isAfter(DateUtils.dateOnly(widget.rangeEnd)),
                onTap: () => widget.onSelected(date),
              );
            },
          ),
        ],
      ),
    );
  }
}

class _CalendarDay extends StatelessWidget {
  const _CalendarDay({
    required this.date,
    required this.selected,
    required this.today,
    required this.inRange,
    required this.onTap,
  });

  final DateTime date;
  final bool selected;
  final bool today;
  final bool inRange;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final label = DateFormat('EEEE, d MMMM yyyy').format(date);
    return Semantics(
      button: true,
      selected: selected,
      label: label,
      onTap: onTap,
      excludeSemantics: true,
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(OceanRadii.pill),
          child: Center(
            child: Container(
              width: 40,
              height: 40,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: selected
                    ? OceanColors.verdigris
                    : inRange
                    ? OceanColors.turquoise.withValues(alpha: 0.09)
                    : Colors.transparent,
                border: selected
                    ? Border.all(
                        color: OceanColors.neonIce.withValues(alpha: 0.78),
                        width: 2,
                      )
                    : null,
              ),
              child: Stack(
                alignment: Alignment.center,
                children: [
                  Text(
                    '${date.day}',
                    style: OceanTypography.body.copyWith(
                      color: selected ? OceanColors.white : OceanColors.ink,
                      fontWeight: selected || today
                          ? FontWeight.w700
                          : FontWeight.w400,
                    ),
                  ),
                  if (today && !selected)
                    const Positioned(
                      bottom: 4,
                      child: DecoratedBox(
                        decoration: BoxDecoration(
                          color: OceanColors.verdigris,
                          shape: BoxShape.circle,
                        ),
                        child: SizedBox.square(dimension: 4),
                      ),
                    ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _OceanTimeWheel extends StatefulWidget {
  const _OceanTimeWheel({
    super.key,
    required this.initialTime,
    required this.semanticLabel,
    required this.onChanged,
  });

  final TimeOfDay initialTime;
  final String semanticLabel;
  final ValueChanged<TimeOfDay> onChanged;

  @override
  State<_OceanTimeWheel> createState() => _OceanTimeWheelState();
}

class _OceanTimeWheelState extends State<_OceanTimeWheel> {
  static const _itemExtent = OceanGeometry.minimumTouchTarget;

  late int _hourIndex;
  late int _minuteIndex;
  late int _periodIndex;
  late final FixedExtentScrollController _hourController;
  late final FixedExtentScrollController _minuteController;
  late final FixedExtentScrollController _periodController;

  @override
  void initState() {
    super.initState();
    final displayHour = widget.initialTime.hourOfPeriod == 0
        ? 12
        : widget.initialTime.hourOfPeriod;
    _hourIndex = displayHour - 1;
    _minuteIndex = widget.initialTime.minute;
    _periodIndex = widget.initialTime.period == DayPeriod.am ? 0 : 1;
    _hourController = FixedExtentScrollController(initialItem: _hourIndex);
    _minuteController = FixedExtentScrollController(initialItem: _minuteIndex);
    _periodController = FixedExtentScrollController(initialItem: _periodIndex);
  }

  @override
  void dispose() {
    _hourController.dispose();
    _minuteController.dispose();
    _periodController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Semantics(
      container: true,
      label: '${widget.semanticLabel} time wheel',
      child: Column(
        key: const ValueKey('ocean-time-wheel'),
        children: [
          Row(
            children: [
              for (final label in const ['HOUR', 'MINUTE', 'PERIOD'])
                Expanded(
                  child: Text(
                    label,
                    textAlign: TextAlign.center,
                    style: OceanTypography.caption.copyWith(fontSize: 10),
                  ),
                ),
            ],
          ),
          const SizedBox(height: OceanSpacing.xxs),
          SizedBox(
            height: _itemExtent * 5,
            child: Stack(
              children: [
                Align(
                  alignment: Alignment.center,
                  child: IgnorePointer(
                    child: Container(
                      height: _itemExtent,
                      decoration: BoxDecoration(
                        color: OceanColors.verdigris.withValues(alpha: 0.09),
                        borderRadius: BorderRadius.circular(OceanRadii.inline),
                        border: Border.all(
                          color: OceanColors.verdigris.withValues(alpha: 0.72),
                        ),
                      ),
                    ),
                  ),
                ),
                Row(
                  children: [
                    Expanded(
                      child: _WheelColumn(
                        controller: _hourController,
                        itemCount: 12,
                        selectedIndex: _hourIndex,
                        labelForIndex: (index) => '${index + 1}',
                        semanticPrefix: 'Hour',
                        onSelected: (index) {
                          setState(() => _hourIndex = index);
                          _emit();
                        },
                        onTapped: (index) => _tapToIndex(
                          controller: _hourController,
                          index: index,
                          update: () => _hourIndex = index,
                        ),
                      ),
                    ),
                    Expanded(
                      child: _WheelColumn(
                        controller: _minuteController,
                        itemCount: 60,
                        selectedIndex: _minuteIndex,
                        labelForIndex: (index) =>
                            index.toString().padLeft(2, '0'),
                        semanticPrefix: 'Minute',
                        onSelected: (index) {
                          setState(() => _minuteIndex = index);
                          _emit();
                        },
                        onTapped: (index) => _tapToIndex(
                          controller: _minuteController,
                          index: index,
                          update: () => _minuteIndex = index,
                        ),
                      ),
                    ),
                    Expanded(
                      child: _WheelColumn(
                        controller: _periodController,
                        itemCount: 2,
                        selectedIndex: _periodIndex,
                        labelForIndex: (index) => index == 0 ? 'AM' : 'PM',
                        semanticPrefix: 'Period',
                        onSelected: (index) {
                          setState(() => _periodIndex = index);
                          _emit();
                        },
                        onTapped: (index) => _tapToIndex(
                          controller: _periodController,
                          index: index,
                          update: () => _periodIndex = index,
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  void _tapToIndex({
    required FixedExtentScrollController controller,
    required int index,
    required VoidCallback update,
  }) {
    setState(update);
    _emit();
    final duration = OceanMotion.responsive(context, OceanMotion.smooth);
    if (duration == Duration.zero) {
      controller.jumpToItem(index);
    } else {
      controller.animateToItem(
        index,
        duration: duration,
        curve: OceanMotion.smoothCurve,
      );
    }
  }

  void _emit() {
    final hour12 = _hourIndex + 1;
    final hour = _periodIndex == 0
        ? (hour12 == 12 ? 0 : hour12)
        : (hour12 == 12 ? 12 : hour12 + 12);
    widget.onChanged(TimeOfDay(hour: hour, minute: _minuteIndex));
  }
}

class _WheelColumn extends StatelessWidget {
  const _WheelColumn({
    required this.controller,
    required this.itemCount,
    required this.selectedIndex,
    required this.labelForIndex,
    required this.semanticPrefix,
    required this.onSelected,
    required this.onTapped,
  });

  final FixedExtentScrollController controller;
  final int itemCount;
  final int selectedIndex;
  final String Function(int index) labelForIndex;
  final String semanticPrefix;
  final ValueChanged<int> onSelected;
  final ValueChanged<int> onTapped;

  @override
  Widget build(BuildContext context) {
    return ListWheelScrollView.useDelegate(
      controller: controller,
      itemExtent: OceanGeometry.minimumTouchTarget,
      diameterRatio: 1.65,
      perspective: 0.003,
      physics: const FixedExtentScrollPhysics(),
      onSelectedItemChanged: onSelected,
      childDelegate: ListWheelChildBuilderDelegate(
        childCount: itemCount,
        builder: (context, index) {
          if (index < 0 || index >= itemCount) return null;
          final label = labelForIndex(index);
          final selected = index == selectedIndex;
          return Semantics(
            button: true,
            selected: selected,
            label: '$semanticPrefix $label',
            onTap: () => onTapped(index),
            excludeSemantics: true,
            child: Material(
              color: Colors.transparent,
              child: InkWell(
                onTap: () => onTapped(index),
                child: SizedBox(
                  height: OceanGeometry.minimumTouchTarget,
                  child: Center(
                    child: Text(
                      label,
                      style: selected
                          ? OceanTypography.strong
                          : OceanTypography.bodyMuted,
                    ),
                  ),
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}

DateTime _combine(DateTime date, TimeOfDay time) {
  return DateTime(date.year, date.month, date.day, time.hour, time.minute);
}

String _fullDate(DateTime date) => DateFormat('dd MMM yyyy').format(date);

String _formatTime(TimeOfDay time) {
  final hour = time.hourOfPeriod == 0 ? 12 : time.hourOfPeriod;
  final minute = time.minute.toString().padLeft(2, '0');
  final period = time.period == DayPeriod.am ? 'AM' : 'PM';
  return '$hour:$minute $period';
}
