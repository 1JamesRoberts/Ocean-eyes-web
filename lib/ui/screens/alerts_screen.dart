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
        if (!controller.tankConnected)
          StateCard(
            icon: LucideIcons.link,
            title: 'Connect a tank',
            description: 'Alerts will appear after a tank is connected.',
            action: GlassButton(
              label: 'Connect a tank',
              icon: LucideIcons.qrCode,
              onPressed: controller.openOnboarding,
            ),
          )
        else if (alerts.isEmpty)
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
    final stripeColor = alert.severity == AlertSeverity.critical
        ? OceanColors.critical
        : OceanColors.warning;

    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _StripedSurface(
          stripeColor: stripeColor,
          stripeWidth: 6,
          radius: OceanRadii.card,
          child: GlassCard(
            padding: const EdgeInsets.fromLTRB(22, 17, 17, 17),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    const Icon(
                      LucideIcons.triangleAlert,
                      size: 20,
                      color: OceanColors.warning,
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
        _DiagnosticGrid(alert: alert),
        const SizedBox(height: 44),
        GlassCard(
          padding: const EdgeInsets.all(17),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Action Plan & Tips', style: OceanTypography.strong),
              const SizedBox(height: OceanSpacing.xs),
              Text(alert.actionPlan, style: OceanTypography.bodyMuted),
            ],
          ),
        ),
        const SizedBox(height: 48),
        if (!alert.resolved)
          _ResolveAlertButton(
            onPressed: () {
              controller.resolveAlert(alert.id);
              controller.popAlertDetail();
            },
          )
        else
          const _ResolvedAlertStatus(),
      ],
    );
  }
}

class _DiagnosticGrid extends StatelessWidget {
  const _DiagnosticGrid({required this.alert});

  final AlertItem alert;

  @override
  Widget build(BuildContext context) {
    final clarity = alert.clarityBefore.isNotEmpty;
    final fish = alert.fishBefore.isNotEmpty;
    if (!clarity && !fish) return const SizedBox.shrink();

    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Expanded(
            child: clarity
                ? _DiagnosticCard(
                    label: 'Clarity Shift',
                    before: alert.clarityBefore,
                    after: alert.clarityAfter,
                  )
                : const SizedBox.shrink(),
          ),
          const SizedBox(width: OceanSpacing.md),
          Expanded(
            child: fish
                ? _DiagnosticCard(
                    label: 'Fish Discrepancy',
                    before: alert.fishBefore,
                    after: alert.fishAfter,
                  )
                : const SizedBox.shrink(),
          ),
        ],
      ),
    );
  }
}

class _DiagnosticCard extends StatelessWidget {
  const _DiagnosticCard({
    required this.label,
    required this.before,
    required this.after,
  });

  final String label;
  final String before;
  final String after;

  @override
  Widget build(BuildContext context) {
    return GlassCard(
      padding: const EdgeInsets.all(17),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(
            label,
            textAlign: TextAlign.center,
            style: OceanTypography.caption,
          ),
          const SizedBox(height: 6),
          Text(
            '$before → $after',
            textAlign: TextAlign.center,
            style: OceanTypography.title,
          ),
        ],
      ),
    );
  }
}

class _ResolveAlertButton extends StatelessWidget {
  const _ResolveAlertButton({required this.onPressed});

  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      key: const ValueKey('alert-resolve-button'),
      button: true,
      label: 'Mark Alert as Resolved',
      child: ExcludeSemantics(
        child: SizedBox(
          width: double.infinity,
          child: DecoratedBox(
            decoration: BoxDecoration(
              color: OceanColors.action,
              borderRadius: BorderRadius.circular(OceanRadii.pill),
              boxShadow: [
                BoxShadow(
                  color: OceanColors.prussianBlue.withValues(alpha: 0.20),
                  blurRadius: 12,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: Material(
              color: Colors.transparent,
              borderRadius: BorderRadius.circular(OceanRadii.pill),
              child: InkWell(
                onTap: onPressed,
                borderRadius: BorderRadius.circular(OceanRadii.pill),
                child: Padding(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 24,
                    vertical: 14,
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(
                        LucideIcons.check,
                        size: 18,
                        color: OceanColors.white,
                      ),
                      const SizedBox(width: OceanSpacing.xs),
                      Flexible(
                        child: Text(
                          'Mark Alert as Resolved',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: OceanTypography.title.copyWith(
                            color: OceanColors.white,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ],
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

class _ResolvedAlertStatus extends StatelessWidget {
  const _ResolvedAlertStatus();

  @override
  Widget build(BuildContext context) {
    return Semantics(
      container: true,
      label: 'Resolved alert',
      child: ExcludeSemantics(
        child: Container(
          alignment: Alignment.center,
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            color: OceanColors.good.withValues(alpha: 0.10),
            borderRadius: BorderRadius.circular(16),
          ),
          child: Text(
            '✓ Resolved Alert',
            style: OceanTypography.strong.copyWith(color: OceanColors.good),
          ),
        ),
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
    final stripeColor = alert.resolved
        ? OceanColors.good
        : alert.severity == AlertSeverity.critical
        ? OceanColors.critical
        : OceanColors.warning;
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
              padding: const EdgeInsets.fromLTRB(17, 14, 14, 10),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.center,
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
                        const SizedBox(width: OceanSpacing.sm),
                        const _ResolvedBadge(),
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

class _ResolvedBadge extends StatelessWidget {
  const _ResolvedBadge();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
      decoration: BoxDecoration(
        color: OceanColors.good.withValues(alpha: 0.10),
        borderRadius: BorderRadius.circular(OceanRadii.pill),
      ),
      child: Text(
        'Resolved',
        style: OceanTypography.caption.copyWith(color: OceanColors.good),
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
