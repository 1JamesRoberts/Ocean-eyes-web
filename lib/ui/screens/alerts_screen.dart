import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../core/theme/oceaneyes_tokens.dart';
import '../../models/aquarium_models.dart';
import '../../view_models/oceaneyes_controller.dart';
import '../widgets/glass.dart';

class AlertsScreen extends StatelessWidget {
  const AlertsScreen({super.key, required this.controller});

  final OceanEyesController controller;

  @override
  Widget build(BuildContext context) {
    final alerts = controller.alerts;

    if (alerts.isEmpty) return const _AlertsEmptyState();

    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: _withSpacing(
        alerts.map(
          (alert) => _AlertRow(
            alert: alert,
            onTap: () => controller.openAlertDetail(alert.id),
          ),
        ),
      ),
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
    final stripeColor = _detailSeverityColor(alert.severity);

    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _AlertSurface.card(
          stripeColor: stripeColor,
          stripeWidth: 6,
          padding: const EdgeInsets.fromLTRB(24, 24, 24, 20),
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
        // The source keeps its empty two-column diagnostic grid in the flex
        // stack. AlertItem currently has no before/after fields, so the two
        // 24 px stack gaps and its 20 px bottom margin remain as whitespace.
        const SizedBox(height: 68),
        GlassCard(
          padding: const EdgeInsets.fromLTRB(24, 24, 24, 20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Action Plan & Tips', style: OceanTypography.strong),
              const SizedBox(height: OceanSpacing.xs),
              Text(alert.actionPlan, style: OceanTypography.bodyMuted),
            ],
          ),
        ),
        // GlassCard's source element has mb-6 in addition to the stack gap.
        const SizedBox(height: 48),
        if (!alert.resolved)
          _ResolveButton(
            onPressed: () {
              controller.resolveAlert(alert.id);
              controller.popAlertDetail();
            },
          )
        else
          const _ResolvedDetailStatus(),
      ],
    );
  }
}

class _AlertsEmptyState extends StatelessWidget {
  const _AlertsEmptyState();

  @override
  Widget build(BuildContext context) {
    return GlassCard(
      semanticLabel:
          'No alerts yet. Aquarium safety events and resolved notices '
          'will appear here.',
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 40),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: OceanColors.pineTeal.withValues(alpha: 0.08),
              borderRadius: BorderRadius.circular(16),
            ),
            child: const Icon(
              LucideIcons.bellOff,
              size: 22,
              color: OceanColors.pineTeal,
            ),
          ),
          const SizedBox(height: OceanSpacing.sm),
          Text(
            'No alerts yet',
            textAlign: TextAlign.center,
            style: OceanTypography.title,
          ),
          const SizedBox(height: OceanSpacing.xxs),
          Text(
            'Aquarium safety events and resolved notices will appear here.',
            textAlign: TextAlign.center,
            style: OceanTypography.caption,
          ),
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
    final stripeColor = alert.resolved
        ? OceanColors.good
        : _listSeverityColor(alert.severity);
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
          child: _AlertSurface.panel(
            stripeColor: stripeColor,
            stripeWidth: 4,
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 12),
            onTap: onTap,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    Expanded(
                      child: Text(alert.title, style: OceanTypography.strong),
                    ),
                    const Icon(
                      LucideIcons.chevronRight,
                      size: 18,
                      color: OceanColors.slateGrey,
                    ),
                  ],
                ),
                const SizedBox(height: OceanSpacing.xxs),
                Text(alert.message, style: OceanTypography.caption),
                const SizedBox(height: OceanSpacing.xs),
                Row(
                  crossAxisAlignment: CrossAxisAlignment.center,
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
    );
  }
}

class _AlertSurface extends StatelessWidget {
  const _AlertSurface._({
    required this.child,
    required this.stripeColor,
    required this.stripeWidth,
    required this.padding,
    required this.radius,
    required this.background,
    required this.borderColor,
    this.onTap,
  });

  const _AlertSurface.panel({
    required Widget child,
    required Color stripeColor,
    required double stripeWidth,
    required EdgeInsets padding,
    VoidCallback? onTap,
  }) : this._(
         child: child,
         stripeColor: stripeColor,
         stripeWidth: stripeWidth,
         padding: padding,
         radius: 16,
         background: const Color(0x33FFFFFF),
         borderColor: const Color(0x33FFFFFF),
         onTap: onTap,
       );

  const _AlertSurface.card({
    required Widget child,
    required Color stripeColor,
    required double stripeWidth,
    required EdgeInsets padding,
  }) : this._(
         child: child,
         stripeColor: stripeColor,
         stripeWidth: stripeWidth,
         padding: padding,
         radius: OceanRadii.card,
         background: OceanColors.white,
         borderColor: OceanColors.white,
       );

  final Widget child;
  final Color stripeColor;
  final double stripeWidth;
  final EdgeInsets padding;
  final double radius;
  final Color background;
  final Color borderColor;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final borderRadius = BorderRadius.circular(radius);
    final decoration = BoxDecoration(
      color: background,
      borderRadius: borderRadius,
      border: Border.all(color: borderColor),
    );
    final effectivePadding = EdgeInsets.fromLTRB(
      padding.left + stripeWidth,
      padding.top + 1,
      padding.right + 1,
      padding.bottom + 1,
    );

    final surface = onTap == null
        ? DecoratedBox(
            decoration: decoration,
            child: Padding(padding: effectivePadding, child: child),
          )
        : ConstrainedBox(
            constraints: const BoxConstraints(
              minHeight: OceanGeometry.minimumTouchTarget,
            ),
            child: Material(
              type: MaterialType.transparency,
              borderRadius: borderRadius,
              child: Ink(
                decoration: decoration,
                child: InkWell(
                  onTap: onTap,
                  borderRadius: borderRadius,
                  hoverColor: OceanColors.white.withValues(alpha: 0.50),
                  focusColor: Colors.transparent,
                  child: Padding(padding: effectivePadding, child: child),
                ),
              ),
            ),
          );

    return ClipRRect(
      borderRadius: borderRadius,
      child: Stack(
        fit: StackFit.passthrough,
        children: [
          surface,
          Positioned(
            left: 0,
            top: 0,
            bottom: 0,
            width: stripeWidth,
            child: IgnorePointer(child: ColoredBox(color: stripeColor)),
          ),
        ],
      ),
    );
  }
}

class _ResolveButton extends StatelessWidget {
  const _ResolveButton({required this.onPressed});

  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    const borderRadius = BorderRadius.all(Radius.circular(OceanRadii.pill));

    return ConstrainedBox(
      constraints: const BoxConstraints(
        minHeight: OceanGeometry.minimumTouchTarget,
      ),
      child: DecoratedBox(
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [OceanColors.verdigris, OceanColors.pineTeal],
          ),
          borderRadius: borderRadius,
          boxShadow: [
            BoxShadow(
              color: OceanColors.pineTeal.withValues(alpha: 0.20),
              blurRadius: 12,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Material(
          type: MaterialType.transparency,
          borderRadius: borderRadius,
          child: InkWell(
            onTap: onPressed,
            borderRadius: borderRadius,
            child: const Padding(
              padding: EdgeInsets.symmetric(horizontal: 24, vertical: 14),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(LucideIcons.check, size: 18, color: OceanColors.white),
                  SizedBox(width: OceanSpacing.xs),
                  Flexible(
                    child: Text(
                      'Mark Alert as Resolved',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontFamily: OceanTypography.family,
                        fontSize: 17,
                        height: 1.3,
                        fontWeight: FontWeight.w700,
                        letterSpacing: -0.17,
                        color: OceanColors.white,
                      ),
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

class _ResolvedDetailStatus extends StatelessWidget {
  const _ResolvedDetailStatus();

  @override
  Widget build(BuildContext context) {
    return Semantics(
      container: true,
      label: 'Resolved alert',
      child: Container(
        alignment: Alignment.center,
        padding: const EdgeInsets.all(OceanSpacing.sm),
        decoration: BoxDecoration(
          color: OceanColors.good.withValues(alpha: 0.10),
          borderRadius: BorderRadius.circular(16),
        ),
        child: Text(
          '✓ Resolved Alert',
          textAlign: TextAlign.center,
          style: OceanTypography.strong.copyWith(color: OceanColors.good),
        ),
      ),
    );
  }
}

Color _listSeverityColor(AlertSeverity severity) => switch (severity) {
  AlertSeverity.critical => OceanColors.critical,
  AlertSeverity.warning || AlertSeverity.info => OceanColors.warning,
};

Color _detailSeverityColor(AlertSeverity severity) => switch (severity) {
  AlertSeverity.critical => OceanColors.critical,
  AlertSeverity.warning || AlertSeverity.info => OceanColors.warning,
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
