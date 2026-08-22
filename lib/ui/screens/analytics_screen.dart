import 'dart:math' as math;
import 'dart:ui';

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
    if (!controller.tankConnected) {
      return StateCard(
        icon: LucideIcons.link,
        title: 'Connect a tank',
        description: 'Analytics will appear after a tank is connected.',
        action: GlassButton(
          label: 'Connect a tank',
          icon: LucideIcons.qrCode,
          onPressed: controller.openOnboarding,
        ),
      );
    }
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
  final selected = await _showAnalyticsOverlay<String>(
    context: context,
    alignment: Alignment.topRight,
    anchoredTop: OceanGeometry.heroHeight - 4,
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
  await _showAnalyticsOverlay<void>(
    context: context,
    child: _DateRangeEditorDialog(
      range: controller.analyticsRange,
      startTime: controller.analyticsStartTime,
      endTime: controller.analyticsEndTime,
      onChanged: (selection) => controller.setAnalyticsRange(
        selection.range,
        start: selection.startTime,
        end: selection.endTime,
      ),
    ),
  );
}

Future<T?> _showAnalyticsOverlay<T>({
  required BuildContext context,
  required Widget child,
  Alignment alignment = Alignment.topCenter,
  double anchoredTop = 52,
}) {
  return showGeneralDialog<T>(
    context: context,
    barrierDismissible: true,
    barrierLabel: 'Dismiss analytics controls',
    barrierColor: Colors.transparent,
    transitionDuration: OceanMotion.responsive(context, OceanMotion.sheet),
    pageBuilder: (context, _, _) {
      final size = MediaQuery.sizeOf(context);
      final resolvedTop = math
          .min(anchoredTop, math.max(16, size.height - 96))
          .toDouble();
      return Padding(
        padding: EdgeInsets.fromLTRB(16, resolvedTop, 16, 16),
        child: Align(
          alignment: Alignment.topCenter,
          child: SizedBox(
            width: math.min(OceanGeometry.referenceWidth - 32, size.width - 32),
            child: Align(
              alignment: alignment,
              child: Material(color: Colors.transparent, child: child),
            ),
          ),
        ),
      );
    },
    transitionBuilder: (context, animation, _, child) => FadeTransition(
      opacity: CurvedAnimation(parent: animation, curve: Curves.easeOut),
      child: child,
    ),
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
      constraints: BoxConstraints(maxWidth: 320, maxHeight: availableHeight),
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
    return Semantics(
      container: true,
      liveRegion: true,
      label: 'Loading analytics',
      child: ExcludeSemantics(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const GlassCard(
              padding: EdgeInsets.all(OceanSpacing.md),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Align(
                    alignment: Alignment.centerLeft,
                    child: _SkeletonBlock(
                      width: 176,
                      height: 20,
                      radius: 4,
                      color: OceanColors.pearlAqua,
                    ),
                  ),
                  SizedBox(height: OceanSpacing.lg),
                  _SkeletonBlock(height: 180),
                  SizedBox(height: OceanSpacing.lg),
                  Align(
                    alignment: Alignment.centerLeft,
                    child: _SkeletonBlock(
                      width: 192,
                      height: 20,
                      radius: 4,
                      color: OceanColors.pearlAqua,
                    ),
                  ),
                  SizedBox(height: OceanSpacing.lg),
                  _SkeletonBlock(height: 180),
                ],
              ),
            ),
            const SizedBox(height: OceanSpacing.md),
            const GlassCard(
              padding: EdgeInsets.all(OceanSpacing.md),
              child: SizedBox(
                height: 288,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Align(
                      alignment: Alignment.centerLeft,
                      child: _SkeletonBlock(
                        width: 160,
                        height: 20,
                        radius: 4,
                        color: OceanColors.pearlAqua,
                      ),
                    ),
                    SizedBox(height: OceanSpacing.lg),
                    _SkeletonBlock(height: 240),
                  ],
                ),
              ),
            ),
            const SizedBox(height: OceanSpacing.md),
            const GlassCard(
              padding: EdgeInsets.all(OceanSpacing.md),
              child: SizedBox(
                height: 164,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Align(
                      alignment: Alignment.centerLeft,
                      child: _SkeletonBlock(
                        width: 256,
                        height: 20,
                        radius: 4,
                        color: OceanColors.pearlAqua,
                      ),
                    ),
                    SizedBox(height: OceanSpacing.lg),
                    _SkeletonBlock(height: 80),
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

class _SkeletonBlock extends StatelessWidget {
  const _SkeletonBlock({
    this.width,
    this.height,
    this.radius = 8,
    this.color = OceanColors.azureMist,
  });

  final double? width;
  final double? height;
  final double radius;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: width,
      height: height,
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.70),
        borderRadius: BorderRadius.circular(radius),
      ),
    );
  }
}

class _AnalyticsEmptyState extends StatelessWidget {
  const _AnalyticsEmptyState({required this.range});

  final DateTimeRange range;

  @override
  Widget build(BuildContext context) {
    final title =
        'No data for ${_fullDate(range.start)} – ${_fullDate(range.end)}';
    const description =
        'Choose another range or run the AI pipeline to generate history.';
    return _AnalyticsStateCard(
      icon: LucideIcons.calendar,
      title: title,
      description: description,
    );
  }
}

class _AnalyticsErrorState extends StatelessWidget {
  const _AnalyticsErrorState({required this.onRetry});

  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return GlassCard(
      borderColor: OceanColors.critical,
      semanticLabel:
          'Analytics could not be loaded. The aquarium data service did not respond.',
      padding: EdgeInsets.zero,
      child: ColoredBox(
        color: OceanColors.critical.withValues(alpha: 0.10),
        child: Padding(
          padding: const EdgeInsets.all(OceanSpacing.md),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: OceanColors.critical.withValues(alpha: 0.10),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: const Icon(
                  LucideIcons.triangleAlert,
                  size: 22,
                  color: OceanColors.critical,
                ),
              ),
              const SizedBox(height: OceanSpacing.xs),
              Text(
                'Analytics could not be loaded',
                textAlign: TextAlign.center,
                style: OceanTypography.title,
              ),
              const SizedBox(height: OceanSpacing.xxs),
              Text(
                'The aquarium data service did not respond. Try loading the analytics again.',
                textAlign: TextAlign.center,
                style: OceanTypography.caption,
              ),
              const SizedBox(height: OceanSpacing.sm),
              _AnalyticsRetryButton(onPressed: onRetry),
            ],
          ),
        ),
      ),
    );
  }
}

class _AnalyticsStateCard extends StatelessWidget {
  const _AnalyticsStateCard({
    required this.icon,
    required this.title,
    required this.description,
  });

  final IconData icon;
  final String title;
  final String description;

  @override
  Widget build(BuildContext context) {
    return GlassCard(
      padding: EdgeInsets.zero,
      semanticLabel: '$title. $description',
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 40),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                color: OceanColors.verdigris.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(16),
              ),
              child: Icon(icon, size: 22, color: OceanColors.ink),
            ),
            const SizedBox(height: OceanSpacing.sm),
            Text(
              title,
              textAlign: TextAlign.center,
              style: OceanTypography.title,
            ),
            const SizedBox(height: OceanSpacing.xxs),
            Text(
              description,
              textAlign: TextAlign.center,
              style: OceanTypography.caption,
            ),
          ],
        ),
      ),
    );
  }
}

class _AnalyticsRetryButton extends StatelessWidget {
  const _AnalyticsRetryButton({required this.onPressed});

  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: OceanGeometry.minimumTouchTarget,
      child: DecoratedBox(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(OceanRadii.pill),
          boxShadow: [
            BoxShadow(
              color: OceanColors.prussianBlue.withValues(alpha: 0.05),
              blurRadius: 20,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(OceanRadii.pill),
          child: BackdropFilter(
            filter: ImageFilter.blur(sigmaX: 6, sigmaY: 6),
            child: Material(
              color: Colors.transparent,
              child: InkWell(
                onTap: onPressed,
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  child: Center(
                    child: Text('Retry', style: OceanTypography.caption),
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
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const _AnalyticsSectionHeader(
                icon: LucideIcons.fish,
                title: 'Fish Count Over Time',
              ),
              const SizedBox(height: OceanSpacing.sm),
              _AnalyticsChartBleed(
                child: OceanBarChart(
                  points: fishCountPoints,
                  semanticLabel: 'Fish count over time for $species',
                  height: 180,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: OceanSpacing.md),
        GlassCard(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const _AnalyticsSectionHeader(
                icon: LucideIcons.activity,
                title: 'Fish Spread Over Time',
              ),
              const SizedBox(height: OceanSpacing.sm),
              _AnalyticsChartBleed(
                child: OceanLineChart(
                  points: spreadPoints,
                  semanticLabel:
                      'Mean nearest-neighbor fish spread over time for $species',
                  color: OceanColors.warning,
                  height: 180,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: OceanSpacing.md),
        GlassCard(
          onTap: controller.openHistory,
          semanticLabel: 'Water Clarity Trend. Opens detailed clarity history.',
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const _AnalyticsSectionHeader(
                icon: LucideIcons.waves,
                title: 'Water Clarity Trend',
              ),
              const SizedBox(height: OceanSpacing.xxs),
              OceanLineChart(
                points: controller.claritySeries,
                semanticLabel: 'Water clarity trend, clarity score percent',
                color: OceanColors.verdigris,
                height: 140,
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

class _AnalyticsSectionHeader extends StatelessWidget {
  const _AnalyticsSectionHeader({required this.icon, required this.title});

  final IconData icon;
  final String title;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.only(top: 2),
              child: Icon(icon, size: 16, color: OceanColors.prussianBlue),
            ),
            const SizedBox(width: OceanSpacing.xs),
            Expanded(child: Text(title, style: OceanTypography.title)),
          ],
        ),
        const SizedBox(height: OceanSpacing.xs),
        Divider(
          height: 1,
          thickness: 1,
          color: OceanColors.slateGrey.withValues(alpha: 0.15),
        ),
      ],
    );
  }
}

class _AnalyticsChartBleed extends StatelessWidget {
  const _AnalyticsChartBleed({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    if (MediaQuery.sizeOf(context).width >= 768) return child;
    return LayoutBuilder(
      builder: (context, constraints) {
        final width = constraints.maxWidth + 16;
        return SizedBox(
          height: 180,
          child: OverflowBox(
            minWidth: width,
            maxWidth: width,
            minHeight: 180,
            maxHeight: 180,
            alignment: Alignment.center,
            child: SizedBox(width: width, height: 180, child: child),
          ),
        );
      },
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
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const _AnalyticsSectionHeader(
            icon: LucideIcons.brain,
            title: 'Fish Diagnostics',
          ),
          if (diagnostics.isEmpty)
            Padding(
              padding: const EdgeInsets.all(OceanSpacing.lg),
              child: Text(
                'No health diagnostic records found for $dateLabel.',
                textAlign: TextAlign.center,
                style: OceanTypography.bodyMuted,
              ),
            )
          else ...[
            const SizedBox(height: OceanSpacing.xs),
            for (var index = 0; index < diagnostics.length; index += 1) ...[
              _DiagnosisPanel(diagnostic: diagnostics[index]),
              if (index != diagnostics.length - 1)
                const SizedBox(height: OceanSpacing.sm),
            ],
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
    final time = DateFormat('h:mm:ss a').format(diagnostic.scannedAt);
    final normalizedStatus = diagnostic.status.toLowerCase();
    final isError = normalizedStatus == 'error';
    final isHealthy = normalizedStatus == 'healthy';
    final tone = isError
        ? OceanColors.critical
        : isHealthy
        ? OceanColors.good
        : OceanColors.warning;

    return Semantics(
      container: true,
      label:
          '${fish.name}. ${diagnostic.status}. ${diagnostic.confidence} percent '
          'confidence. Scanned at $time. Observation: '
          '${diagnostic.observation}',
      child: ExcludeSemantics(
        child: GlassPanel(
          borderColor: tone,
          padding: const EdgeInsets.fromLTRB(12, 12, 12, 8),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Wrap(
                alignment: WrapAlignment.spaceBetween,
                crossAxisAlignment: WrapCrossAlignment.center,
                spacing: OceanSpacing.xs,
                runSpacing: OceanSpacing.xs,
                children: [
                  Wrap(
                    crossAxisAlignment: WrapCrossAlignment.center,
                    spacing: OceanSpacing.xs,
                    runSpacing: OceanSpacing.xs,
                    children: [
                      Text(fish.name, style: OceanTypography.strong),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 8,
                          vertical: 2,
                        ),
                        decoration: BoxDecoration(
                          color: tone.withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(
                            OceanRadii.inline,
                          ),
                        ),
                        child: Text(
                          isError ? 'Error' : diagnostic.status,
                          style: OceanTypography.caption.copyWith(color: tone),
                        ),
                      ),
                      if (!isError)
                        Text(
                          '${diagnostic.confidence}% confidence',
                          style: OceanTypography.caption,
                        ),
                    ],
                  ),
                  Text(time, style: OceanTypography.caption),
                ],
              ),
              const SizedBox(height: OceanSpacing.xs),
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  ClipRRect(
                    borderRadius: BorderRadius.circular(OceanRadii.inline),
                    child: ConstrainedBox(
                      constraints: const BoxConstraints(
                        maxWidth: 160,
                        maxHeight: 110,
                      ),
                      child: Image.asset(
                        fish.assetPath,
                        fit: BoxFit.scaleDown,
                        alignment: Alignment.topLeft,
                        filterQuality: FilterQuality.none,
                        errorBuilder: (_, _, _) => const SizedBox.shrink(),
                      ),
                    ),
                  ),
                  const SizedBox(width: OceanSpacing.sm),
                  Expanded(
                    child: RichText(
                      text: TextSpan(
                        style: OceanTypography.body,
                        children: [
                          const TextSpan(
                            text: 'Observation: ',
                            style: TextStyle(fontWeight: FontWeight.w700),
                          ),
                          TextSpan(text: diagnostic.observation),
                        ],
                      ),
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
    required this.onChanged,
  });

  final DateTimeRange range;
  final TimeOfDay startTime;
  final TimeOfDay endTime;
  final ValueChanged<_RangeSelection> onChanged;

  @override
  State<_DateRangeEditorDialog> createState() => _DateRangeEditorDialogState();
}

class _DateRangeEditorDialogState extends State<_DateRangeEditorDialog> {
  late DateTime _startDate = DateUtils.dateOnly(widget.range.start);
  late DateTime _endDate = DateUtils.dateOnly(widget.range.end);
  late TimeOfDay _startTime = _normalizeWheelTime(widget.startTime);
  late TimeOfDay _endTime = _normalizeWheelTime(widget.endTime);
  _RangeField? _activeField;
  String? _validationError;

  @override
  Widget build(BuildContext context) {
    final mediaSize = MediaQuery.sizeOf(context);

    return ConstrainedBox(
      key: const ValueKey('analytics-range-editor'),
      constraints: BoxConstraints(
        maxWidth: math.min(320, mediaSize.width - 32).toDouble(),
        maxHeight: math.max(280, mediaSize.height - 68).toDouble(),
      ),
      child: Semantics(
        container: true,
        label: 'Date and time range editor',
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const SizedBox(
              width: 0,
              height: 0,
              child: Text('Date & time range'),
            ),
            SizedBox(
              width: math.min(288, mediaSize.width - 32).toDouble(),
              child: _HeroRangeEditorSurface(
                child: Column(
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
                  ],
                ),
              ),
            ),
            if (_activeField != null) ...[
              const SizedBox(height: OceanSpacing.sm),
              Flexible(
                child: GlassCard(
                  overlay: true,
                  padding: EdgeInsets.zero,
                  semanticLabel: 'Active date or time control',
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.fromLTRB(14, 14, 14, 10),
                    child: AnimatedSwitcher(
                      duration: OceanMotion.responsive(
                        context,
                        OceanMotion.fade,
                      ),
                      child: _activeEditor(),
                    ),
                  ),
                ),
              ),
            ],
            if (_validationError case final error?) ...[
              const SizedBox(height: OceanSpacing.xs),
              Text(
                error,
                textAlign: TextAlign.center,
                style: OceanTypography.caption.copyWith(
                  color: OceanColors.critical,
                ),
              ),
            ],
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
        onSelected: (date) =>
            _updateDraft(() => _startDate = DateUtils.dateOnly(date)),
      ),
      _RangeField.endDate => _OceanCalendar(
        key: const ValueKey('end-calendar'),
        selectedDate: _endDate,
        onSelected: (date) =>
            _updateDraft(() => _endDate = DateUtils.dateOnly(date)),
      ),
      _RangeField.startTime => _OceanTimeWheel(
        key: const ValueKey('start-time-wheel'),
        initialTime: _startTime,
        semanticLabel: 'Start time',
        onChanged: (time) => _updateDraft(() => _startTime = time),
        onDone: () => setState(() => _activeField = null),
      ),
      _RangeField.endTime => _OceanTimeWheel(
        key: const ValueKey('end-time-wheel'),
        initialTime: _endTime,
        semanticLabel: 'End time',
        onChanged: (time) => _updateDraft(() => _endTime = time),
        onDone: () => setState(() => _activeField = null),
      ),
      null => const SizedBox.shrink(),
    };
  }

  void _updateDraft(VoidCallback update) {
    setState(() {
      update();
      _validationError = _rangeValidationMessage();
    });
    if (_validationError != null) return;
    final start = _combine(_startDate, _startTime);
    final end = _combine(_endDate, _endTime);
    widget.onChanged(
      _RangeSelection(
        range: DateTimeRange(start: start, end: end),
        startTime: _startTime,
        endTime: _endTime,
      ),
    );
  }

  String? _rangeValidationMessage() {
    final start = _combine(_startDate, _startTime);
    final end = _combine(_endDate, _endTime);
    if (end.isBefore(start)) return 'End must be after start.';
    if (end.isAtSameMomentAs(start)) {
      return 'Choose a range longer than zero minutes.';
    }
    return null;
  }
}

class _HeroRangeEditorSurface extends StatelessWidget {
  const _HeroRangeEditorSurface({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    final radius = BorderRadius.circular(OceanRadii.card);
    return DecoratedBox(
      decoration: BoxDecoration(
        borderRadius: radius,
        boxShadow: [
          BoxShadow(
            color: OceanColors.prussianBlue.withValues(alpha: 0.05),
            blurRadius: 20,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: radius,
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 6, sigmaY: 6),
          child: DecoratedBox(
            decoration: BoxDecoration(
              color: Colors.transparent,
              borderRadius: radius,
            ),
            child: Padding(
              padding: const EdgeInsets.fromLTRB(10, 10, 10, 8),
              child: child,
            ),
          ),
        ),
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
          width: 56,
          child: Text(
            label,
            textAlign: TextAlign.center,
            style: OceanTypography.strong.copyWith(
              color: OceanColors.white,
              fontWeight: FontWeight.w700,
            ),
          ),
        ),
        const SizedBox(width: OceanSpacing.xs),
        Expanded(
          flex: 5,
          child: _RangeFieldButton(
            label: _fullDate(date),
            semanticLabel: '$label date',
            active: activeDate,
            onTap: onDateTap,
          ),
        ),
        const SizedBox(width: OceanSpacing.xs),
        Expanded(
          flex: 4,
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
        height: 43.35,
        child: Material(
          color: Colors.transparent,
          borderRadius: BorderRadius.circular(OceanRadii.pill),
          child: InkWell(
            onTap: onTap,
            borderRadius: BorderRadius.circular(OceanRadii.pill),
            child: CustomPaint(
              foregroundPainter: active
                  ? const _TealOutlinePainter(radius: 22)
                  : null,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 8),
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: Colors.transparent,
                  borderRadius: BorderRadius.circular(OceanRadii.pill),
                  boxShadow: [
                    BoxShadow(
                      color: OceanColors.prussianBlue.withValues(alpha: 0.05),
                      blurRadius: 20,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Text(
                  label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: OceanTypography.body.copyWith(
                    color: OceanColors.white,
                    fontWeight: active ? FontWeight.w600 : FontWeight.w400,
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

class _OceanCalendar extends StatefulWidget {
  const _OceanCalendar({
    super.key,
    required this.selectedDate,
    required this.onSelected,
  });

  final DateTime selectedDate;
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
    final firstVisibleDay = first.subtract(Duration(days: leading));

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
                child: Row(
                  children: [
                    Flexible(
                      child: Text(
                        DateFormat('MMMM yyyy').format(_viewMonth),
                        style: OceanTypography.title,
                      ),
                    ),
                    const SizedBox(width: OceanSpacing.xxs),
                    const Icon(
                      LucideIcons.chevronDown,
                      size: 18,
                      color: OceanColors.slateGrey,
                    ),
                  ],
                ),
              ),
              _CalendarNavigationButton(
                icon: LucideIcons.chevronLeft,
                tooltip: 'Previous month',
                onPressed: () => setState(() {
                  _viewMonth = DateTime(_viewMonth.year, _viewMonth.month - 1);
                }),
              ),
              const SizedBox(width: OceanSpacing.xxs),
              _CalendarNavigationButton(
                icon: LucideIcons.chevronRight,
                tooltip: 'Next month',
                onPressed: () => setState(() {
                  _viewMonth = DateTime(_viewMonth.year, _viewMonth.month + 1);
                }),
              ),
            ],
          ),
          const SizedBox(height: OceanSpacing.md),
          Row(
            children: [
              for (final weekday in _weekdays)
                Expanded(
                  child: Text(
                    weekday,
                    textAlign: TextAlign.center,
                    style: OceanTypography.caption,
                  ),
                ),
            ],
          ),
          const SizedBox(height: OceanSpacing.xs),
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: cellCount,
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 7,
              mainAxisExtent: 36,
              mainAxisSpacing: 4,
            ),
            itemBuilder: (context, index) {
              final date = firstVisibleDay.add(Duration(days: index));
              return _CalendarDay(
                date: date,
                selected: DateUtils.isSameDay(date, widget.selectedDate),
                today: DateUtils.isSameDay(date, DateTime.now()),
                inMonth:
                    date.year == _viewMonth.year &&
                    date.month == _viewMonth.month,
                onTap: () => widget.onSelected(date),
              );
            },
          ),
        ],
      ),
    );
  }
}

class _CalendarNavigationButton extends StatelessWidget {
  const _CalendarNavigationButton({
    required this.icon,
    required this.tooltip,
    required this.onPressed,
  });

  final IconData icon;
  final String tooltip;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return Tooltip(
      message: tooltip,
      child: Semantics(
        button: true,
        label: tooltip,
        child: SizedBox.square(
          dimension: 36,
          child: DecoratedBox(
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              boxShadow: [
                BoxShadow(
                  color: OceanColors.prussianBlue.withValues(alpha: 0.05),
                  blurRadius: 20,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: ClipOval(
              child: BackdropFilter(
                filter: ImageFilter.blur(sigmaX: 6, sigmaY: 6),
                child: Material(
                  color: Colors.transparent,
                  shape: const CircleBorder(),
                  child: InkWell(
                    customBorder: const CircleBorder(),
                    onTap: onPressed,
                    child: Icon(icon, size: 18, color: OceanColors.slateGrey),
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

class _CalendarDay extends StatelessWidget {
  const _CalendarDay({
    required this.date,
    required this.selected,
    required this.today,
    required this.inMonth,
    required this.onTap,
  });

  final DateTime date;
  final bool selected;
  final bool today;
  final bool inMonth;
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
            child: CustomPaint(
              foregroundPainter: selected
                  ? const _TealOutlinePainter(radius: 18)
                  : null,
              child: Container(
                width: 36,
                height: 36,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  shape: selected ? BoxShape.circle : BoxShape.rectangle,
                  borderRadius: selected ? null : BorderRadius.circular(4),
                  color: Colors.transparent,
                  boxShadow: selected
                      ? [
                          BoxShadow(
                            color: OceanColors.prussianBlue.withValues(
                              alpha: 0.05,
                            ),
                            blurRadius: 20,
                            offset: const Offset(0, 4),
                          ),
                        ]
                      : null,
                ),
                child: Stack(
                  alignment: Alignment.center,
                  children: [
                    Text(
                      '${date.day}',
                      style: OceanTypography.body.copyWith(
                        color: selected
                            ? OceanColors.white
                            : inMonth
                            ? OceanColors.ink
                            : OceanColors.slateGrey.withValues(alpha: 0.60),
                        fontWeight: selected || today
                            ? FontWeight.w700
                            : FontWeight.w400,
                      ),
                    ),
                    if (today && !selected)
                      const Positioned(
                        bottom: 6,
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
    required this.onDone,
  });

  final TimeOfDay initialTime;
  final String semanticLabel;
  final ValueChanged<TimeOfDay> onChanged;
  final VoidCallback onDone;

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
          SizedBox(
            height: _itemExtent * 5 + 8,
            child: Stack(
              children: [
                Positioned(
                  top: _itemExtent * 2,
                  left: 8,
                  right: 8,
                  child: IgnorePointer(
                    child: CustomPaint(
                      foregroundPainter: const _TealOutlinePainter(radius: 12),
                      child: Container(
                        height: _itemExtent,
                        decoration: BoxDecoration(
                          color: Colors.transparent,
                          borderRadius: BorderRadius.circular(
                            OceanRadii.inline,
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 4,
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: _WheelColumn(
                          controller: _hourController,
                          itemCount: 12,
                          selectedIndex: _hourIndex,
                          labelForIndex: (index) =>
                              (index + 1).toString().padLeft(2, '0'),
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
                ),
              ],
            ),
          ),
          const SizedBox(height: OceanSpacing.sm),
          GlassButton(label: 'Done', expanded: true, onPressed: widget.onDone),
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
      diameterRatio: 100,
      perspective: 0.0001,
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
                          : OceanTypography.body.copyWith(
                              color: OceanColors.slateGrey.withValues(
                                alpha: 0.60,
                              ),
                            ),
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

class _TealOutlinePainter extends CustomPainter {
  const _TealOutlinePainter({required this.radius});

  final double radius;

  @override
  void paint(Canvas canvas, Size size) {
    final rect = Offset.zero & size;
    final outline = rect.deflate(0.5);
    final resolvedRadius = math.min(radius, outline.shortestSide / 2);
    final paint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1
      ..shader = const LinearGradient(
        begin: Alignment.topCenter,
        end: Alignment.bottomCenter,
        colors: [OceanColors.turquoise, OceanColors.verdigris],
      ).createShader(rect);
    canvas.drawRRect(
      RRect.fromRectAndRadius(outline, Radius.circular(resolvedRadius)),
      paint,
    );
  }

  @override
  bool shouldRepaint(covariant _TealOutlinePainter oldDelegate) {
    return oldDelegate.radius != radius;
  }
}

DateTime _combine(DateTime date, TimeOfDay time) {
  return DateTime(date.year, date.month, date.day, time.hour, time.minute);
}

TimeOfDay _normalizeWheelTime(TimeOfDay time) {
  return time;
}

String _fullDate(DateTime date) => DateFormat('MMM dd, yyyy').format(date);

String _formatTime(TimeOfDay time) {
  final hour = time.hourOfPeriod == 0 ? 12 : time.hourOfPeriod;
  final minute = time.minute.toString().padLeft(2, '0');
  final period = time.period == DayPeriod.am ? 'AM' : 'PM';
  return '$hour:$minute $period';
}
