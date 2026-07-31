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
          const StateCard(
            icon: LucideIcons.radio,
            title: 'Waiting for monitor data',
            description:
                'OceanEyes will populate this dashboard after the inference '
                'service processes its first frame.',
          )
        else ...[
          _HealthCard(controller: controller, warning: warning),
          const SizedBox(height: OceanSpacing.md),
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
    final clarity = _metric(metrics, 'Turbidity').value;
    final ph = _metric(metrics, 'pH Level').value;
    final temperature = _metric(metrics, 'Temperature').value;
    final score = warning ? 68 : 92;
    final statusColor = warning ? OceanColors.warning : OceanColors.good;
    final statusTextColor = warning
        ? OceanColors.warningInk
        : OceanColors.goodInk;
    final status = warning ? 'Attention' : 'Excellent';
    final message = warning
        ? 'Some conditions need watching.'
        : 'Your tank is thriving.';

    return GlassCard(
      semanticLabel:
          'Aquarium Health. $status. $message Health score $score out of 100.',
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      child: LayoutBuilder(
        builder: (context, constraints) {
          final details = Column(
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
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      status,
                      style: OceanTypography.caption.copyWith(
                        color: statusTextColor,
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
              const SizedBox(height: 5),
              const Text('Aquarium Health', style: OceanTypography.title),
              const SizedBox(height: 5),
              Text(
                message,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: OceanTypography.caption,
              ),
              const SizedBox(height: 9),
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
          );

          if (constraints.maxWidth < 320) {
            return Column(
              children: [
                HealthScoreRing(score: score),
                const SizedBox(height: 12),
                details,
              ],
            );
          }
          return Row(
            children: [
              HealthScoreRing(score: score),
              const SizedBox(width: 16),
              Expanded(child: details),
            ],
          );
        },
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
        height: 32,
        padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 5),
        decoration: BoxDecoration(
          color: OceanColors.prussianBlue.withValues(alpha: 0.03),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Row(
          children: [
            Icon(icon, size: 14, color: OceanColors.verdigris),
            const SizedBox(width: 3),
            Expanded(
              child: FittedBox(
                fit: BoxFit.scaleDown,
                alignment: Alignment.centerLeft,
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
      action: GlassIconButton(
        icon: LucideIcons.chevronRight,
        tooltip: 'Manage fish list',
        onPressed: () => controller.selectTab(PrimaryTab.myFish),
        background: Colors.transparent,
      ),
      child: fish.isEmpty
          ? const GlassPanel(
              child: _InlineEmptyState(
                icon: LucideIcons.fishSymbol,
                title: 'No fish added',
                description:
                    'Add your first fish to compare inventory with AI '
                    'detections.',
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
    final color = complete ? OceanColors.good : OceanColors.critical;
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
        const SizedBox(height: 2),
        Text('${fish.detected} detected', style: OceanTypography.caption),
      ],
    );
    Widget statusPill() => GlassPill(
      color: color.withValues(alpha: 0.12),
      foregroundColor: complete ? OceanColors.goodInk : OceanColors.criticalInk,
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      child: Text(
        complete ? 'All Visible' : '${fish.detected} / ${fish.count}',
        maxLines: 1,
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
        warning: _metric(metrics, 'Turbidity').isWarning,
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
        warning: _metric(metrics, 'Temperature').isWarning,
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
      action: GlassIconButton(
        icon: LucideIcons.chevronRight,
        tooltip: 'View water parameter history',
        onPressed: controller.openHistory,
        background: Colors.transparent,
      ),
      child: SizedBox(
        height: math.max(
          76,
          76 + (MediaQuery.textScalerOf(context).scale(14) - 14) * 3,
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
        padding: const EdgeInsets.fromLTRB(4, 8, 4, 5),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Icon(parameter.icon, size: 16, color: OceanColors.verdigris),
            Text(
              parameter.label,
              maxLines: 1,
              style: OceanTypography.caption.copyWith(
                fontSize: 9.5,
                fontWeight: FontWeight.w600,
              ),
            ),
            FittedBox(
              fit: BoxFit.scaleDown,
              child: Text.rich(
                TextSpan(
                  children: [
                    TextSpan(
                      text: parameter.value,
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                        color: valueColor,
                      ),
                    ),
                    TextSpan(
                      text: ' ${parameter.unit}',
                      style: TextStyle(
                        fontSize: 9,
                        fontWeight: FontWeight.w600,
                        color: valueColor,
                      ),
                    ),
                  ],
                ),
                maxLines: 1,
              ),
            ),
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
      return const StateCard(
        icon: LucideIcons.shieldCheck,
        title: 'System operating safely',
        description: 'No active safety alarms require your attention.',
        compact: true,
        success: true,
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
                  padding: const EdgeInsets.all(13.5),
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
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          CardHeader(title: title, icon: icon, trailing: action, divider: true),
          const SizedBox(height: 10),
          child,
        ],
      ),
    );
  }
}

class _InlineEmptyState extends StatelessWidget {
  const _InlineEmptyState({
    required this.icon,
    required this.title,
    required this.description,
  });

  final IconData icon;
  final String title;
  final String description;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Column(
        children: [
          Icon(icon, size: 24, color: OceanColors.verdigris),
          const SizedBox(height: 8),
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
    );
  }
}

WaterMetric _metric(List<WaterMetric> metrics, String label) =>
    metrics.firstWhere((metric) => metric.label == label);

String _twoDecimals(String value) {
  final parsed = double.tryParse(value);
  return parsed == null ? value : parsed.toStringAsFixed(2);
}
