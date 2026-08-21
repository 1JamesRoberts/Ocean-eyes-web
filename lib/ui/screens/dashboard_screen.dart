import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../core/theme/oceaneyes_tokens.dart';
import '../../models/aquarium_models.dart';
import '../../view_models/oceaneyes_controller.dart';
import '../widgets/data_visuals.dart';
import '../widgets/glass.dart';
import '../widgets/screen_primitives.dart';

/// Dashboard content rendered below the shared aquarium hero.
class DashboardScreen extends StatelessWidget {
  const DashboardScreen({super.key, required this.controller});

  final OceanEyesController controller;

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: controller,
      builder: (context, _) => _DashboardBody(controller: controller),
    );
  }
}

class _DashboardBody extends StatelessWidget {
  const _DashboardBody({required this.controller});

  final OceanEyesController controller;

  @override
  Widget build(BuildContext context) {
    final waiting = controller.dashboardHealth == DashboardHealthState.waiting;
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (controller.showTankSetupBanner) ...[
          StateCard(
            icon: LucideIcons.link,
            title: 'Connect a tank',
            description:
                'Set up a new tank or join an existing one to start seeing aquarium data here.',
            action: GlassButton(
              label: 'Connect a tank',
              icon: LucideIcons.qrCode,
              expanded: true,
              onPressed: controller.openOnboarding,
            ),
          ),
        ] else if (waiting)
          const _DashboardStateCard(
            icon: LucideIcons.radio,
            title: 'Waiting for monitor data',
            description:
                'OceanEyes will populate this dashboard after the inference '
                'service processes its first frame.',
          )
        else ...[
          Transform.translate(
            offset: const Offset(0, -OceanSpacing.xs),
            child: _HealthCard(controller: controller),
          ),
          // Transform only changes paint position. Eight layout pixels after
          // the translated card preserve the reference's visible 16 px gap.
          const SizedBox(height: OceanSpacing.xs),
          _FishInventorySummary(controller: controller),
          const SizedBox(height: OceanSpacing.md),
          _ParametersCard(controller: controller),
          const SizedBox(height: OceanSpacing.md),
          _AlertsSection(controller: controller),
        ],
      ],
    );
  }
}

class _HealthCard extends StatelessWidget {
  const _HealthCard({required this.controller});

  final OceanEyesController controller;

  @override
  Widget build(BuildContext context) {
    final metrics = controller.waterMetrics;
    final clarityMetric = _metric(metrics, 'Turbidity');
    final phMetric = _metric(metrics, 'pH Level');
    final temperatureMetric = _metric(metrics, 'Temperature');
    final health = _calculateHealth(metrics);
    final clarity = _twoDecimals(clarityMetric.value);
    final ph = phMetric.value;
    final temperature = temperatureMetric.value;

    return GlassCard(
      semanticLabel:
          'Aquarium Health. ${health.status}. ${health.message} '
          'Health score ${health.displayScore} out of 100.',
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      child: MediaQuery.withClampedTextScaling(
        maxScaleFactor: 1,
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            HealthScoreRing(score: health.displayScore),
            const SizedBox(width: 16),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 4),
                child: Stack(
                  children: [
                    Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Padding(
                          padding: const EdgeInsets.only(right: 28),
                          child: Row(
                            children: [
                              Container(
                                width: 10,
                                height: 10,
                                decoration: BoxDecoration(
                                  color: health.color,
                                  shape: BoxShape.circle,
                                ),
                              ),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  health.status,
                                  style: OceanTypography.caption.copyWith(
                                    color: health.color,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 8),
                        const Text(
                          'Aquarium Health',
                          maxLines: 1,
                          overflow: TextOverflow.clip,
                          style: OceanTypography.title,
                        ),
                        const SizedBox(height: 8),
                        Text(
                          health.message,
                          style: OceanTypography.caption.copyWith(
                            height: 1.25,
                            fontWeight: FontWeight.w400,
                          ),
                        ),
                        const SizedBox(height: 16),
                        Row(
                          children: [
                            Expanded(
                              child: _HealthParameterChip(
                                icon: LucideIcons.droplets,
                                semanticLabel: 'Clarity',
                                value: '$clarity FNU',
                              ),
                            ),
                            const SizedBox(width: 6),
                            Expanded(
                              child: _HealthParameterChip(
                                icon: LucideIcons.flaskConical,
                                semanticLabel: 'pH',
                                value: '$ph pH',
                              ),
                            ),
                            const SizedBox(width: 6),
                            Expanded(
                              child: _HealthParameterChip(
                                icon: LucideIcons.thermometer,
                                semanticLabel: 'Temperature',
                                value: '$temperature°C',
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                    const Positioned(
                      top: 0,
                      right: 0,
                      child: Icon(
                        LucideIcons.chevronRight,
                        size: 18,
                        color: OceanColors.inkMuted,
                      ),
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

class _HealthParameterChip extends StatelessWidget {
  const _HealthParameterChip({
    required this.icon,
    required this.semanticLabel,
    required this.value,
  });

  final IconData icon;
  final String semanticLabel;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: '$semanticLabel: $value',
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 6),
        decoration: BoxDecoration(
          color: OceanColors.prussianBlue.withValues(alpha: 0.03),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, size: 16, color: OceanColors.verdigris),
            const SizedBox(width: 4),
            Flexible(
              child: Text(
                value,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: OceanTypography.caption.copyWith(
                  fontSize: MediaQuery.sizeOf(context).width >= 640 ? 12 : 10,
                  color: OceanColors.ink,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _FishInventorySummary extends StatelessWidget {
  const _FishInventorySummary({required this.controller});

  final OceanEyesController controller;

  @override
  Widget build(BuildContext context) {
    final fish = controller.fish.take(3).toList(growable: false);
    return _HeadedCard(
      title: 'My Fish',
      icon: LucideIcons.fishSymbol,
      action: _HeaderActionButton(
        icon: LucideIcons.chevronRight,
        semanticLabel: 'Manage fish list',
        onTap: () => controller.selectTab(PrimaryTab.myFish),
      ),
      child: fish.isEmpty
          ? const GlassPanel(
              padding: EdgeInsets.zero,
              child: _DashboardStateContent(
                icon: LucideIcons.fishSymbol,
                title: 'No fish added',
                description:
                    'Add your first fish to compare inventory with AI '
                    'detections.',
                compact: true,
              ),
            )
          : Column(
              children: [
                for (var index = 0; index < fish.length; index++) ...[
                  _InventoryRow(fish: fish[index]),
                  if (index != fish.length - 1)
                    Divider(
                      height: 1,
                      color: OceanColors.slateGrey.withValues(alpha: 0.15),
                    ),
                ],
              ],
            ),
    );
  }
}

class _InventoryRow extends StatelessWidget {
  const _InventoryRow({required this.fish});

  final FishEntry fish;

  @override
  Widget build(BuildContext context) {
    final complete = fish.detected == fish.count;
    final foreground = complete ? OceanColors.good : OceanColors.critical;
    final background = complete
        ? OceanColors.verdigris.withValues(alpha: 0.12)
        : OceanColors.critical.withValues(alpha: 0.12);
    Widget details() => Column(
      mainAxisAlignment: MainAxisAlignment.center,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          fish.name,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: OceanTypography.strong,
        ),
        Text('${fish.detected} detected', style: OceanTypography.caption),
      ],
    );
    Widget statusPill() => Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(OceanRadii.pill),
      ),
      child: Text(
        complete ? 'All Visible' : '${fish.detected} / ${fish.count}',
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        style: OceanTypography.caption.copyWith(
          height: 1,
          letterSpacing: -0.13,
          color: foreground,
        ),
      ),
    );
    return Semantics(
      label:
          '${fish.name}, ${fish.detected} detected out of ${fish.count}. '
          '${complete ? 'All Visible' : 'Visibility incomplete'}',
      child: ConstrainedBox(
        constraints: const BoxConstraints(minHeight: 56),
        child: LayoutBuilder(
          builder: (context, constraints) {
            final largeText = MediaQuery.textScalerOf(context).scale(13) > 17.5;
            final identity = Row(
              children: [
                FishAvatar(
                  assetPath: fish.assetPath,
                  name: fish.name,
                  size: 56,
                ),
                const SizedBox(width: 12),
                Expanded(child: details()),
              ],
            );
            if (largeText || constraints.maxWidth < 280) {
              return Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  identity,
                  const SizedBox(height: 6),
                  Align(alignment: Alignment.centerRight, child: statusPill()),
                ],
              );
            }
            return Row(
              children: [
                Expanded(child: identity),
                const SizedBox(width: 6),
                statusPill(),
              ],
            );
          },
        ),
      ),
    );
  }
}

class _ParametersCard extends StatelessWidget {
  const _ParametersCard({required this.controller});

  final OceanEyesController controller;

  @override
  Widget build(BuildContext context) {
    final metrics = controller.waterMetrics;
    final parameters = <_ParameterValue>[
      _ParameterValue(
        icon: LucideIcons.droplets,
        label: 'Clarity',
        value: _twoDecimals(_metric(metrics, 'Turbidity').value),
        unit: 'FNU',
        onTap: controller.openHistory,
      ),
      _ParameterValue(
        icon: LucideIcons.flaskConical,
        label: 'pH',
        value: _metric(metrics, 'pH Level').value,
        unit: 'pH',
      ),
      _ParameterValue(
        icon: LucideIcons.thermometer,
        label: 'Temp',
        value: _metric(metrics, 'Temperature').value,
        unit: '°C',
      ),
      _ParameterValue(
        icon: LucideIcons.shield,
        label: 'NO₂',
        value: _metric(metrics, 'Nitrite').value,
        unit: 'ppm',
        warning: (_metricValue(metrics, 'Nitrite') ?? 0) > 0.2,
      ),
      const _ParameterValue(
        icon: LucideIcons.cloud,
        label: 'CO₂',
        value: '—',
        unit: 'ppm',
        unavailable: true,
      ),
    ];

    return _HeadedCard(
      title: 'Parameters',
      icon: LucideIcons.flaskConical,
      action: _HeaderActionButton(
        icon: LucideIcons.chevronRight,
        semanticLabel: 'View water parameter history',
        onTap: controller.openHistory,
      ),
      child: MediaQuery.withClampedTextScaling(
        maxScaleFactor: 1,
        child: SizedBox(
          height: 85.5,
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              for (var index = 0; index < parameters.length; index++) ...[
                Expanded(child: _ParameterTile(parameter: parameters[index])),
                if (index != parameters.length - 1) const SizedBox(width: 8),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class _ParameterValue {
  const _ParameterValue({
    required this.icon,
    required this.label,
    required this.value,
    required this.unit,
    this.warning = false,
    this.unavailable = false,
    this.onTap,
  });

  final IconData icon;
  final String label;
  final String value;
  final String unit;
  final bool warning;
  final bool unavailable;
  final VoidCallback? onTap;
}

class _ParameterTile extends StatelessWidget {
  const _ParameterTile({required this.parameter});

  final _ParameterValue parameter;

  @override
  Widget build(BuildContext context) {
    final statusColor = parameter.unavailable
        ? OceanColors.slateGrey.withValues(alpha: 0.35)
        : parameter.warning
        ? OceanColors.critical
        : OceanColors.good;
    final valueColor = parameter.warning
        ? OceanColors.criticalInk
        : OceanColors.ink;

    return Semantics(
      button: parameter.onTap != null,
      label:
          '${parameter.label}: ${parameter.value} ${parameter.unit}. '
          '${parameter.unavailable
              ? 'Unavailable'
              : parameter.warning
              ? 'Needs attention'
              : 'Good'}',
      child: GlassPanel(
        onTap: parameter.onTap,
        padding: const EdgeInsets.fromLTRB(8, 8, 8, 4),
        child: Column(
          children: [
            Icon(parameter.icon, size: 16, color: OceanColors.verdigris),
            const SizedBox(height: 6),
            Text(
              parameter.label,
              maxLines: 1,
              style: OceanTypography.caption.copyWith(
                fontSize: 10,
                height: 1.35,
                fontWeight: FontWeight.w600,
                letterSpacing: -0.10,
              ),
            ),
            const SizedBox(height: 6),
            FittedBox(
              fit: BoxFit.scaleDown,
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.baseline,
                textBaseline: TextBaseline.alphabetic,
                children: [
                  Text(
                    parameter.value,
                    style: TextStyle(
                      fontFamily: 'Inter',
                      fontSize: 14,
                      height: 1,
                      fontWeight: FontWeight.w700,
                      letterSpacing: -0.14,
                      color: valueColor,
                    ),
                  ),
                  const SizedBox(width: 2),
                  Text(
                    parameter.unit,
                    style: TextStyle(
                      fontFamily: 'Inter',
                      fontSize: 10,
                      height: 1,
                      fontWeight: FontWeight.w600,
                      letterSpacing: -0.10,
                      color: valueColor,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 8),
            Container(
              width: 8,
              height: 8,
              decoration: BoxDecoration(
                color: statusColor,
                shape: BoxShape.circle,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _AlertsSection extends StatelessWidget {
  const _AlertsSection({required this.controller});

  final OceanEyesController controller;

  @override
  Widget build(BuildContext context) {
    final activeAlerts = controller.alerts
        .where((alert) => !alert.resolved)
        .toList(growable: false);
    if (activeAlerts.isEmpty) {
      return const _DashboardStateCard(
        icon: LucideIcons.shieldCheck,
        title: 'System operating safely',
        description: 'No active safety alarms require your attention.',
        compact: true,
        success: true,
        dashed: true,
      );
    }

    return _HeadedCard(
      title: 'Alerts',
      icon: LucideIcons.shieldAlert,
      child: Column(
        children: [
          for (var index = 0; index < activeAlerts.length; index++) ...[
            _AlertRow(
              alert: activeAlerts[index],
              onTap: () => controller.openAlertDetail(activeAlerts[index].id),
            ),
            if (index != activeAlerts.length - 1) const SizedBox(height: 12),
          ],
        ],
      ),
    );
  }
}

class _AlertRow extends StatelessWidget {
  const _AlertRow({required this.alert, required this.onTap});

  final AlertItem alert;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final severityColor = alert.severity == AlertSeverity.critical
        ? OceanColors.critical
        : OceanColors.warning;
    return Semantics(
      button: true,
      label: '${alert.title}. ${alert.message}',
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(16),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(16),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(16),
            child: Stack(
              children: [
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.fromLTRB(17, 14, 14, 14),
                  decoration: BoxDecoration(
                    color: OceanColors.white.withValues(alpha: 0.20),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(
                      color: OceanColors.white.withValues(alpha: 0.20),
                    ),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              alert.title,
                              style: OceanTypography.strong,
                            ),
                          ),
                          const SizedBox(width: 8),
                          const Icon(
                            LucideIcons.chevronRight,
                            size: 16,
                            color: OceanColors.inkMuted,
                          ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Text(alert.message, style: OceanTypography.caption),
                    ],
                  ),
                ),
                Positioned(
                  top: 0,
                  bottom: 0,
                  left: 0,
                  width: 4,
                  child: ColoredBox(color: severityColor),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _HeadedCard extends StatelessWidget {
  const _HeadedCard({
    required this.title,
    required this.icon,
    required this.child,
    this.action,
  });

  final String title;
  final IconData icon;
  final Widget child;
  final Widget? action;

  @override
  Widget build(BuildContext context) {
    return GlassCard(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          CardHeader(title: title, icon: icon, trailing: action, divider: true),
          child,
        ],
      ),
    );
  }
}

class _HeaderActionButton extends StatefulWidget {
  const _HeaderActionButton({
    required this.icon,
    required this.semanticLabel,
    required this.onTap,
  });

  final IconData icon;
  final String semanticLabel;
  final VoidCallback onTap;

  @override
  State<_HeaderActionButton> createState() => _HeaderActionButtonState();
}

class _HeaderActionButtonState extends State<_HeaderActionButton> {
  bool _hovered = false;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      label: widget.semanticLabel,
      child: Tooltip(
        message: widget.semanticLabel,
        child: MouseRegion(
          cursor: SystemMouseCursors.click,
          onEnter: (_) => setState(() => _hovered = true),
          onExit: (_) => setState(() => _hovered = false),
          child: GestureDetector(
            behavior: HitTestBehavior.opaque,
            onTap: widget.onTap,
            child: AnimatedOpacity(
              opacity: _hovered ? 0.80 : 1,
              duration: OceanMotion.responsive(context, OceanMotion.smooth),
              child: SizedBox.square(
                dimension: 18,
                child: Icon(widget.icon, size: 18, color: OceanColors.inkMuted),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _DashboardStateCard extends StatelessWidget {
  const _DashboardStateCard({
    required this.icon,
    required this.title,
    required this.description,
    this.compact = false,
    this.success = false,
    this.dashed = false,
  });

  final IconData icon;
  final String title;
  final String description;
  final bool compact;
  final bool success;
  final bool dashed;

  @override
  Widget build(BuildContext context) {
    final card = GlassCard(
      semanticLabel: '$title. $description',
      borderColor: dashed ? Colors.transparent : null,
      borderWidth: dashed ? 2 : 1,
      padding: EdgeInsets.zero,
      child: Padding(
        padding: EdgeInsets.all(dashed ? 2 : 1),
        child: _DashboardStateContent(
          icon: icon,
          title: title,
          description: description,
          compact: compact,
          success: success,
        ),
      ),
    );
    if (!dashed) return card;
    return CustomPaint(
      foregroundPainter: _DashedRoundedBorderPainter(
        color: OceanColors.white.withValues(alpha: 0.40),
        radius: OceanRadii.card,
      ),
      child: card,
    );
  }
}

class _DashboardStateContent extends StatelessWidget {
  const _DashboardStateContent({
    required this.icon,
    required this.title,
    required this.description,
    this.compact = false,
    this.success = false,
  });

  final IconData icon;
  final String title;
  final String description;
  final bool compact;
  final bool success;

  @override
  Widget build(BuildContext context) {
    final iconColor = success ? OceanColors.good : OceanColors.ink;
    final iconBackground = success
        ? OceanColors.good.withValues(alpha: 0.10)
        : OceanColors.verdigris.withValues(alpha: 0.08);
    return Padding(
      padding: EdgeInsets.symmetric(
        horizontal: compact ? 16 : 24,
        vertical: compact ? 16 : 40,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: iconBackground,
              borderRadius: BorderRadius.circular(16),
            ),
            child: Icon(icon, size: 22, color: iconColor),
          ),
          SizedBox(height: compact ? 8 : 12),
          ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 384),
            child: Column(
              children: [
                Text(
                  title,
                  textAlign: TextAlign.center,
                  style: OceanTypography.title,
                ),
                const SizedBox(height: 4),
                Text(
                  description,
                  textAlign: TextAlign.center,
                  style: OceanTypography.caption,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _DashedRoundedBorderPainter extends CustomPainter {
  const _DashedRoundedBorderPainter({
    required this.color,
    required this.radius,
  });

  final Color color;
  final double radius;

  @override
  void paint(Canvas canvas, Size size) {
    const strokeWidth = 2.0;
    final strokeInset = strokeWidth / 2;
    final path = Path()
      ..addRRect(
        RRect.fromRectAndRadius(
          Rect.fromLTWH(
            strokeInset,
            strokeInset,
            size.width - strokeWidth,
            size.height - strokeWidth,
          ),
          Radius.circular(radius - strokeInset),
        ),
      );
    final paint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth
      ..color = color;
    for (final metric in path.computeMetrics()) {
      var distance = 0.0;
      while (distance < metric.length) {
        final end = math.min(distance + 7, metric.length);
        canvas.drawPath(metric.extractPath(distance, end), paint);
        distance += 11;
      }
    }
  }

  @override
  bool shouldRepaint(covariant _DashedRoundedBorderPainter oldDelegate) =>
      oldDelegate.color != color || oldDelegate.radius != radius;
}

class _HealthPresentation {
  const _HealthPresentation({
    required this.displayScore,
    required this.status,
    required this.message,
    required this.color,
  });

  final int displayScore;
  final String status;
  final String message;
  final Color color;
}

_HealthPresentation _calculateHealth(List<WaterMetric> metrics) {
  const idealPh = 7.2;
  final ph = _metricValue(metrics, 'pH Level') ?? idealPh;
  final clarity = _metricValue(metrics, 'Turbidity') ?? 0;
  final ammonia = _metricValue(metrics, 'Ammonia') ?? 0;
  final nitrite = _metricValue(metrics, 'Nitrite') ?? 0;
  final rawScore = math.max(
    1,
    10 -
        (idealPh - ph).abs() * 4 -
        math.max(0, clarity - 0.5) * 0.8 -
        ammonia * 20 -
        nitrite * 3,
  );
  final score = double.parse(rawScore.toStringAsFixed(1));

  if (score >= 8) {
    return _HealthPresentation(
      displayScore: (score * 10).round(),
      status: 'Excellent',
      message: 'Your tank is thriving.',
      color: OceanColors.good,
    );
  }
  if (score >= 6) {
    return _HealthPresentation(
      displayScore: (score * 10).round(),
      status: 'Attention',
      message: 'Some conditions need watching.',
      color: OceanColors.warning,
    );
  }
  return _HealthPresentation(
    displayScore: (score * 10).round(),
    status: 'Critical',
    message: 'Your tank needs attention.',
    color: OceanColors.critical,
  );
}

WaterMetric _metric(List<WaterMetric> metrics, String label) =>
    metrics.firstWhere((metric) => metric.label == label);

double? _metricValue(List<WaterMetric> metrics, String label) {
  for (final metric in metrics) {
    if (metric.label == label) return double.tryParse(metric.value.trim());
  }
  return null;
}

String _twoDecimals(String value) {
  final parsed = double.tryParse(value);
  return parsed == null ? value : parsed.toStringAsFixed(2);
}
