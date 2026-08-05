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
    final warning = controller.dashboardHealth == DashboardHealthState.warning;

    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (waiting)
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
            child: _HealthCard(controller: controller, warning: warning),
          ),
          // The web card carries a negative top margin. Pairing the visual
          // translation with an 8 px spacer preserves the 16 px gap below it.
          const SizedBox(height: OceanSpacing.sm),
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
  const _HealthCard({required this.controller, required this.warning});

  final OceanEyesController controller;
  final bool warning;

  @override
  Widget build(BuildContext context) {
    final metrics = controller.waterMetrics;
    final clarity = _twoDecimals(_metric(metrics, 'Turbidity').value);
    final ph = _metric(metrics, 'pH Level').value;
    final temperature = _metric(metrics, 'Temperature').value;
    final score = warning ? 68 : 92;
    final statusColor = warning ? OceanColors.warning : OceanColors.good;
    final status = warning ? 'Attention' : 'Excellent';
    final message = warning
        ? 'Some conditions need watching.'
        : 'Your tank is thriving.';

    return GlassCard(
      semanticLabel:
          'Aquarium Health. $status. $message Health score $score out of 100.',
      padding: const EdgeInsets.symmetric(
        horizontal: OceanSpacing.md,
        vertical: OceanSpacing.sm,
      ),
      child: Row(
        children: [
          HealthScoreRing(score: score),
          const SizedBox(width: OceanSpacing.md),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: OceanSpacing.xxs),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        width: 10,
                        height: 10,
                        decoration: BoxDecoration(
                          color: statusColor,
                          shape: BoxShape.circle,
                        ),
                      ),
                      const SizedBox(width: OceanSpacing.xs),
                      Expanded(
                        child: Text(
                          status,
                          style: OceanTypography.caption.copyWith(
                            color: statusColor,
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                      const Icon(
                        LucideIcons.chevronRight,
                        size: 18,
                        color: OceanColors.inkMuted,
                      ),
                    ],
                  ),
                  const SizedBox(height: OceanSpacing.xs),
                  const Text('Aquarium Health', style: OceanTypography.title),
                  const SizedBox(height: OceanSpacing.xs),
                  Text(
                    message,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: OceanTypography.caption.copyWith(
                      fontSize: 14,
                      height: 1.25,
                    ),
                  ),
                  const SizedBox(height: OceanSpacing.md),
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
            ),
          ),
        ],
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
        padding: const EdgeInsets.all(6),
        decoration: BoxDecoration(
          color: OceanColors.azureMist,
          borderRadius: BorderRadius.circular(10),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, size: 16, color: OceanColors.turquoiseSurf),
            const SizedBox(width: OceanSpacing.xxs),
            Flexible(
              child: FittedBox(
                fit: BoxFit.scaleDown,
                child: Text(
                  value,
                  maxLines: 1,
                  style: OceanTypography.caption.copyWith(
                    fontSize: 10,
                    color: OceanColors.ink,
                    fontWeight: FontWeight.w600,
                  ),
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
                  Padding(
                    padding: EdgeInsets.only(
                      top: index == 0 ? OceanSpacing.sm : 0,
                      bottom: OceanSpacing.sm,
                    ),
                    child: _InventoryRow(fish: fish[index]),
                  ),
                  if (index != fish.length - 1) ...[
                    Divider(
                      height: 1,
                      color: OceanColors.slateGrey.withValues(alpha: 0.15),
                    ),
                    const SizedBox(height: OceanSpacing.sm),
                  ],
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
    final statusColor = complete ? OceanColors.good : OceanColors.critical;
    final statusBackground = complete
        ? OceanColors.navigationActive.withValues(alpha: 0.12)
        : const Color(0xFFBA1A1A).withValues(alpha: 0.12);

    return Semantics(
      label:
          '${fish.name}, ${fish.detected} detected out of ${fish.count}. '
          '${complete ? 'All Visible' : 'Visibility incomplete'}',
      child: Row(
        children: [
          SizedBox.square(
            dimension: 48,
            child: Center(
              child: FishAvatar(
                assetPath: fish.assetPath,
                name: fish.name,
                size: 40,
              ),
            ),
          ),
          const SizedBox(width: OceanSpacing.sm),
          Expanded(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  fish.name,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: OceanTypography.strong,
                ),
                const SizedBox(height: 2),
                Text(
                  '${fish.detected} / ${fish.count} detected',
                  style: OceanTypography.caption,
                ),
              ],
            ),
          ),
          const SizedBox(width: 6),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: statusBackground,
              borderRadius: BorderRadius.circular(OceanRadii.pill),
            ),
            child: Text(
              complete ? 'All Visible' : '${fish.detected} / ${fish.count}',
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              textScaler: MediaQuery.textScalerOf(
                context,
              ).clamp(maxScaleFactor: 1.15),
              style: OceanTypography.caption.copyWith(color: statusColor),
            ),
          ),
        ],
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
        warning: _metric(metrics, 'Nitrite').isWarning,
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
      child: SizedBox(
        height: math.max(
          85,
          85 + (MediaQuery.textScalerOf(context).scale(14) - 14) * 3,
        ),
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
        ? OceanColors.critical
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
          mainAxisAlignment: MainAxisAlignment.start,
          children: [
            Icon(parameter.icon, size: 16, color: OceanColors.turquoiseSurf),
            const SizedBox(height: 6),
            Text(
              parameter.label,
              maxLines: 1,
              style: OceanTypography.caption.copyWith(
                fontSize: 10,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 6),
            Expanded(
              child: FittedBox(
                fit: BoxFit.scaleDown,
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.baseline,
                  textBaseline: TextBaseline.alphabetic,
                  children: [
                    Text(
                      parameter.value,
                      style: OceanTypography.title.copyWith(
                        fontSize: 15,
                        height: 1,
                        fontWeight: FontWeight.w700,
                        color: valueColor,
                      ),
                    ),
                    const SizedBox(width: 2),
                    Text(
                      parameter.unit,
                      style: OceanTypography.caption.copyWith(
                        fontSize: 10,
                        height: 1,
                        fontWeight: FontWeight.w600,
                        color: valueColor,
                      ),
                    ),
                  ],
                ),
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
      child: GlassPanel(
        onTap: onTap,
        padding: EdgeInsets.zero,
        child: IntrinsicHeight(
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Container(
                width: 4,
                decoration: BoxDecoration(
                  color: severityColor,
                  borderRadius: const BorderRadius.horizontal(
                    left: Radius.circular(15),
                  ),
                ),
              ),
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.all(OceanSpacing.md),
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
              ),
            ],
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
      padding: const EdgeInsets.fromLTRB(20, 18, 20, 16),
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

class _HeaderActionButton extends StatelessWidget {
  const _HeaderActionButton({
    required this.icon,
    required this.semanticLabel,
    required this.onTap,
  });

  final IconData icon;
  final String semanticLabel;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      label: semanticLabel,
      child: Tooltip(
        message: semanticLabel,
        child: InkResponse(
          onTap: onTap,
          radius: 18,
          child: SizedBox.square(
            dimension: 24,
            child: Icon(icon, size: 18, color: OceanColors.inkMuted),
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
      child: _DashboardStateContent(
        icon: icon,
        title: title,
        description: description,
        compact: compact,
        success: success,
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
    final tone = success ? OceanColors.good : OceanColors.navigationActive;
    return Padding(
      padding: EdgeInsets.symmetric(
        horizontal: compact ? OceanSpacing.md : OceanSpacing.xl,
        vertical: compact ? OceanSpacing.md : 40,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: tone.withValues(alpha: success ? 0.10 : 0.08),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Icon(icon, size: 22, color: tone),
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

WaterMetric _metric(List<WaterMetric> metrics, String label) =>
    metrics.firstWhere((metric) => metric.label == label);

String _twoDecimals(String value) {
  final parsed = double.tryParse(value);
  return parsed == null ? value : parsed.toStringAsFixed(2);
}
