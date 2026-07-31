import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../core/theme/oceaneyes_tokens.dart';
import '../../models/aquarium_models.dart';
import '../../view_models/oceaneyes_controller.dart';
import '../widgets/glass.dart';
import '../widgets/screen_primitives.dart';

class AlertsScreen extends StatelessWidget {
  const AlertsScreen({super.key, required this.controller});

  final OceanEyesController controller;

  @override
  Widget build(BuildContext context) {
    final alerts = controller.alerts;

    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (alerts.isEmpty)
          const StateCard(
            icon: LucideIcons.bellOff,
            title: 'No alerts yet',
            description:
                'Aquarium safety events and resolved notices will appear here.',
          )
        else
          ..._withSpacing(
            alerts.map(
              (alert) => _AlertRow(
                alert: alert,
                onTap: () => controller.openAlertDetail(alert.id),
              ),
            ),
          ),
      ],
    );
  }
}

class AlertDetailScreen extends StatelessWidget {
  const AlertDetailScreen({
    super.key,
    required this.controller,
    required this.alert,
  });

  final OceanEyesController controller;
  final AlertItem alert;

  @override
  Widget build(BuildContext context) {
    final severityColor = _severityColor(alert.severity);

    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _StripedSurface(
          stripeColor: severityColor,
          stripeWidth: 6,
          radius: OceanRadii.card,
          child: GlassCard(
            padding: const EdgeInsets.all(OceanSpacing.md),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Icon(
                      LucideIcons.triangleAlert,
                      size: 20,
                      color: severityColor,
                    ),
                    const SizedBox(width: OceanSpacing.xs),
                    Expanded(
                      child: Text(alert.title, style: OceanTypography.title),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                Text(alert.timeLabel, style: OceanTypography.caption),
                const SizedBox(height: OceanSpacing.md),
                Text(alert.message, style: OceanTypography.body),
              ],
            ),
          ),
        ),
        const SizedBox(height: OceanSpacing.xl),
        GlassCard(
          padding: const EdgeInsets.all(OceanSpacing.md),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Action Plan & Tips', style: OceanTypography.strong),
              const SizedBox(height: OceanSpacing.xs),
              Text(alert.actionPlan, style: OceanTypography.bodyMuted),
            ],
          ),
        ),
        const SizedBox(height: OceanSpacing.xl),
        if (!alert.resolved)
          GlassButton(
            label: 'Mark Alert as Resolved',
            icon: LucideIcons.check,
            expanded: true,
            onPressed: () {
              controller.resolveAlert(alert.id);
              controller.popAlertDetail();
            },
          )
        else
          Semantics(
            container: true,
            label: 'Resolved alert',
            child: Container(
              constraints: const BoxConstraints(
                minHeight: OceanGeometry.minimumTouchTarget,
              ),
              alignment: Alignment.center,
              padding: const EdgeInsets.symmetric(
                horizontal: OceanSpacing.sm,
                vertical: OceanSpacing.xs,
              ),
              decoration: BoxDecoration(
                color: OceanColors.good.withValues(alpha: 0.10),
                borderRadius: BorderRadius.circular(16),
              ),
              child: Text(
                '✓ Resolved Alert',
                style: OceanTypography.strong.copyWith(
                  color: OceanColors.goodInk,
                ),
              ),
            ),
          ),
      ],
    );
  }
}

class _AlertRow extends StatelessWidget {
  const _AlertRow({required this.alert, required this.onTap});

  final AlertItem alert;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final stripeColor = alert.resolved
        ? OceanColors.good
        : _severityColor(alert.severity);
    final status = alert.resolved ? 'Resolved' : 'Active';
    final semanticsLabel =
        '$status ${_severityLabel(alert.severity)} alert. '
        '${alert.title}. ${alert.message}. ${alert.timeLabel}.';

    return Semantics(
      container: true,
      button: true,
      label: semanticsLabel,
      onTap: onTap,
      child: ExcludeSemantics(
        child: AnimatedOpacity(
          opacity: alert.resolved ? 0.60 : 1,
          duration: OceanMotion.responsive(context, OceanMotion.smooth),
          child: _StripedSurface(
            stripeColor: stripeColor,
            stripeWidth: 4,
            radius: 16,
            child: GlassPanel(
              onTap: onTap,
              padding: const EdgeInsets.fromLTRB(14, 14, 14, 10),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        child: Text(alert.title, style: OceanTypography.strong),
                      ),
                      const SizedBox(width: OceanSpacing.xs),
                      const Icon(
                        LucideIcons.chevronRight,
                        size: 18,
                        color: OceanColors.inkMuted,
                      ),
                    ],
                  ),
                  const SizedBox(height: OceanSpacing.xxs),
                  Text(alert.message, style: OceanTypography.caption),
                  const SizedBox(height: OceanSpacing.xs),
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          alert.timeLabel,
                          style: OceanTypography.caption,
                        ),
                      ),
                      if (alert.resolved) ...[
                        const SizedBox(width: OceanSpacing.xs),
                        GlassPill(
                          color: OceanColors.good.withValues(alpha: 0.10),
                          foregroundColor: OceanColors.goodInk,
                          child: const Text('Resolved'),
                        ),
                      ],
                    ],
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

class _StripedSurface extends StatelessWidget {
  const _StripedSurface({
    required this.stripeColor,
    required this.stripeWidth,
    required this.radius,
    required this.child,
  });

  final Color stripeColor;
  final double stripeWidth;
  final double radius;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(radius),
      child: Stack(
        fit: StackFit.passthrough,
        children: [
          child,
          Positioned(
            top: 0,
            bottom: 0,
            left: 0,
            child: IgnorePointer(
              child: ColoredBox(
                color: stripeColor,
                child: SizedBox(width: stripeWidth),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

Color _severityColor(AlertSeverity severity) => switch (severity) {
  AlertSeverity.critical => OceanColors.critical,
  AlertSeverity.warning => OceanColors.warning,
  AlertSeverity.info => OceanColors.verdigris,
};

String _severityLabel(AlertSeverity severity) => switch (severity) {
  AlertSeverity.critical => 'critical',
  AlertSeverity.warning => 'warning',
  AlertSeverity.info => 'information',
};

List<Widget> _withSpacing(Iterable<Widget> children) {
  final result = <Widget>[];
  for (final child in children) {
    if (result.isNotEmpty) result.add(const SizedBox(height: OceanSpacing.md));
    result.add(child);
  }
  return result;
}
