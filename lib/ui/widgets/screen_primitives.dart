import 'dart:math' as math;
import 'dart:ui' show ImageFilter;

import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../core/theme/oceaneyes_tokens.dart';
import 'glass.dart';

class ScreenHeader extends StatelessWidget {
  const ScreenHeader({
    super.key,
    required this.title,
    this.icon,
    this.trailing,
    this.onBack,
    this.backLabel = 'Back',
  });

  final String title;
  final IconData? icon;
  final Widget? trailing;
  final VoidCallback? onBack;
  final String backLabel;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        if (onBack != null) ...[
          GlassIconButton(
            icon: LucideIcons.arrowLeft,
            tooltip: backLabel,
            onPressed: onBack,
          ),
          const SizedBox(width: 8),
        ],
        if (icon != null) ...[
          Icon(icon, size: 19, color: OceanColors.ink),
          const SizedBox(width: 8),
        ],
        Expanded(child: Text(title, style: OceanTypography.title)),
        ?trailing,
      ],
    );
  }
}

class CardHeader extends StatelessWidget {
  const CardHeader({
    super.key,
    required this.title,
    required this.icon,
    this.trailing,
    this.divider = false,
  });

  final String title;
  final IconData icon;
  final Widget? trailing;
  final bool divider;

  @override
  Widget build(BuildContext context) {
    final header = Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(top: 2),
          child: Icon(icon, size: 16, color: OceanColors.ink),
        ),
        const SizedBox(width: 8),
        Expanded(child: Text(title, style: OceanTypography.title)),
        ?trailing,
      ],
    );
    if (!divider) return header;
    return Transform.translate(
      offset: const Offset(0, -4),
      child: Column(
        children: [
          header,
          const SizedBox(height: 8),
          Divider(
            height: 1,
            color: OceanColors.slateGrey.withValues(alpha: 0.15),
          ),
        ],
      ),
    );
  }
}

class StateCard extends StatelessWidget {
  const StateCard({
    super.key,
    required this.icon,
    required this.title,
    required this.description,
    this.action,
    this.compact = false,
    this.success = false,
  });

  final IconData icon;
  final String title;
  final String description;
  final Widget? action;
  final bool compact;
  final bool success;

  @override
  Widget build(BuildContext context) {
    final statusColor = success ? OceanColors.good : OceanColors.ink;
    final statusBackground = success
        ? OceanColors.good.withValues(alpha: 0.10)
        : OceanColors.verdigris.withValues(alpha: 0.08);
    final card = GlassCard(
      semanticLabel: '$title. $description',
      borderColor: success ? Colors.transparent : null,
      borderWidth: success ? 2 : 1,
      padding: compact
          ? const EdgeInsets.all(16)
          : const EdgeInsets.symmetric(horizontal: 24, vertical: 40),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: statusBackground,
              borderRadius: BorderRadius.circular(16),
            ),
            child: Icon(icon, size: 22, color: statusColor),
          ),
          SizedBox(height: compact ? 8 : 12),
          Column(
            mainAxisSize: MainAxisSize.min,
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
          if (action != null) ...[SizedBox(height: compact ? 12 : 16), action!],
        ],
      ),
    );
    if (!success) return card;
    return Stack(
      children: [
        card,
        const Positioned.fill(
          child: IgnorePointer(
            child: CustomPaint(painter: _DashedSuccessBorderPainter()),
          ),
        ),
      ],
    );
  }
}

class _DashedSuccessBorderPainter extends CustomPainter {
  const _DashedSuccessBorderPainter();

  @override
  void paint(Canvas canvas, Size size) {
    final path = Path()
      ..addRRect(
        RRect.fromRectAndRadius(
          Offset.zero & size,
          const Radius.circular(OceanRadii.card),
        ),
      );
    final paint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2
      ..color = OceanColors.white.withValues(alpha: 0.40);
    for (final metric in path.computeMetrics()) {
      var distance = 0.0;
      while (distance < metric.length) {
        canvas.drawPath(
          metric.extractPath(distance, (distance + 6).clamp(0, metric.length)),
          paint,
        );
        distance += 10;
      }
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

class DisclosureCard extends StatelessWidget {
  const DisclosureCard({
    super.key,
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.expanded,
    required this.onChanged,
    required this.child,
    this.enabled = true,
    this.badge,
    this.iconColor,
    this.panelColor,
    this.panelBorderColor,
  });

  final String title;
  final String subtitle;
  final IconData icon;
  final bool expanded;
  final ValueChanged<bool> onChanged;
  final Widget child;
  final bool enabled;
  final Widget? badge;
  final Color? iconColor;
  final Color? panelColor;
  final Color? panelBorderColor;

  @override
  Widget build(BuildContext context) {
    return GlassPanel(
      color: panelColor,
      borderColor: panelBorderColor,
      child: Column(
        children: [
          Semantics(
            button: true,
            expanded: expanded,
            enabled: enabled,
            child: InkWell(
              onTap: enabled ? () => onChanged(!expanded) : null,
              borderRadius: BorderRadius.circular(16),
              child: ConstrainedBox(
                constraints: const BoxConstraints(minHeight: 44),
                child: Row(
                  children: [
                    SizedBox.square(
                      dimension: 36,
                      child: Center(
                        child: Icon(
                          icon,
                          size: 17,
                          color: enabled
                              ? (iconColor ?? OceanColors.inkMuted)
                              : OceanColors.inkMuted.withValues(alpha: 0.45),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(
                            title,
                            style: OceanTypography.strong.copyWith(
                              color: enabled
                                  ? OceanColors.ink
                                  : OceanColors.inkMuted,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            subtitle,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: OceanTypography.caption,
                          ),
                        ],
                      ),
                    ),
                    if (badge != null) ...[badge!, const SizedBox(width: 6)],
                    AnimatedRotation(
                      turns: expanded ? 0.25 : 0,
                      duration: OceanMotion.responsive(
                        context,
                        OceanMotion.smooth,
                      ),
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
          ),
          AnimatedSize(
            duration: OceanMotion.responsive(
              context,
              const Duration(milliseconds: 300),
            ),
            curve: Curves.easeOut,
            alignment: Alignment.topCenter,
            child: expanded
                ? Padding(padding: const EdgeInsets.only(top: 12), child: child)
                : const SizedBox(width: double.infinity),
          ),
        ],
      ),
    );
  }
}

class OceanSlider extends StatefulWidget {
  const OceanSlider({
    super.key,
    required this.label,
    required this.value,
    required this.min,
    required this.max,
    required this.onChanged,
    this.onChangeEnd,
    this.divisions,
    this.valueLabel,
  });

  final String label;
  final double value;
  final double min;
  final double max;
  final ValueChanged<double> onChanged;
  final ValueChanged<double>? onChangeEnd;
  final int? divisions;
  final String? valueLabel;

  @override
  State<OceanSlider> createState() => _OceanSliderState();
}

class _OceanSliderState extends State<OceanSlider> {
  late double _previewValue = widget.value;

  @override
  void didUpdateWidget(covariant OceanSlider oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.value != widget.value) _previewValue = widget.value;
  }

  @override
  Widget build(BuildContext context) {
    final valueText = widget.valueLabel ?? _previewValue.toStringAsFixed(0);
    return Semantics(
      label: widget.label,
      value: valueText,
      slider: true,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(widget.label, style: OceanTypography.caption),
              ),
              Text(
                valueText,
                style: OceanTypography.caption.copyWith(
                  color: OceanColors.darkCyan,
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          SizedBox(
            height: 20,
            child: SliderTheme(
              data: SliderTheme.of(context).copyWith(
                activeTrackColor: OceanColors.verdigris,
                inactiveTrackColor: OceanColors.slateGrey.withValues(
                  alpha: 0.18,
                ),
                thumbColor: OceanColors.white,
                overlayColor: OceanColors.verdigris.withValues(alpha: 0.12),
                trackHeight: 4,
                thumbShape: const RoundSliderThumbShape(
                  enabledThumbRadius: 8,
                  elevation: 2,
                ),
              ),
              child: Slider(
                value: _previewValue.clamp(widget.min, widget.max),
                min: widget.min,
                max: widget.max,
                divisions: widget.divisions,
                onChanged: (value) {
                  setState(() => _previewValue = value);
                  widget.onChanged(value);
                },
                onChangeEnd: widget.onChangeEnd,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class SwitchRow extends StatelessWidget {
  const SwitchRow({
    super.key,
    required this.title,
    this.subtitle,
    required this.value,
    required this.onChanged,
    this.enabled = true,
  });

  final String title;
  final String? subtitle;
  final bool value;
  final ValueChanged<bool> onChanged;
  final bool enabled;

  @override
  Widget build(BuildContext context) {
    return ConstrainedBox(
      constraints: BoxConstraints(minHeight: subtitle == null ? 44 : 56),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  title,
                  style: subtitle == null
                      ? OceanTypography.bodyMuted
                      : OceanTypography.strong.copyWith(
                          color: enabled
                              ? OceanColors.ink
                              : OceanColors.inkMuted,
                        ),
                ),
                if (subtitle != null) ...[
                  const SizedBox(height: 2),
                  Text(subtitle!, style: OceanTypography.caption),
                ],
              ],
            ),
          ),
          Semantics(
            toggled: value,
            enabled: enabled,
            button: true,
            child: InkResponse(
              onTap: enabled ? () => onChanged(!value) : null,
              radius: 22,
              child: SizedBox(
                width: 44,
                height: 44,
                child: Center(
                  child: AnimatedContainer(
                    duration: OceanMotion.responsive(
                      context,
                      OceanMotion.smooth,
                    ),
                    width: 44,
                    height: 24,
                    padding: const EdgeInsets.all(4),
                    decoration: BoxDecoration(
                      color: value
                          ? OceanColors.verdigris
                          : OceanColors.slateGrey.withValues(alpha: 0.20),
                      borderRadius: BorderRadius.circular(999),
                    ),
                    child: AnimatedAlign(
                      duration: OceanMotion.responsive(
                        context,
                        OceanMotion.smooth,
                      ),
                      alignment: value
                          ? Alignment.centerRight
                          : Alignment.centerLeft,
                      child: const DecoratedBox(
                        decoration: BoxDecoration(
                          color: OceanColors.white,
                          shape: BoxShape.circle,
                        ),
                        child: SizedBox.square(dimension: 16),
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class FishAvatar extends StatelessWidget {
  const FishAvatar({
    super.key,
    required this.assetPath,
    required this.name,
    this.size = 56,
    this.radius,
  });

  final String assetPath;
  final String name;
  final double size;
  final double? radius;

  @override
  Widget build(BuildContext context) {
    final resolvedRadius = radius ?? size * 0.25;
    return Semantics(
      image: true,
      label: '$name species artwork',
      child: SizedBox(
        width: size,
        height: size,
        child: Stack(
          fit: StackFit.expand,
          children: [
            Positioned(
              bottom: size * 0.20,
              left: size * 0.28,
              width: size * 0.44,
              height: math.max(1, size * 0.02),
              child: ImageFiltered(
                imageFilter: ImageFilter.blur(sigmaX: 3, sigmaY: 3),
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    color: OceanColors.prussianBlue.withValues(alpha: 0.18),
                    borderRadius: BorderRadius.circular(size),
                  ),
                ),
              ),
            ),
            ClipRRect(
              borderRadius: BorderRadius.circular(resolvedRadius),
              child: Image.asset(
                assetPath,
                fit: BoxFit.contain,
                errorBuilder: (_, _, _) => DecoratedBox(
                  decoration: BoxDecoration(
                    color: OceanColors.verdigris,
                    borderRadius: BorderRadius.circular(resolvedRadius),
                    border: Border.all(
                      color: OceanColors.white.withValues(alpha: 0.20),
                    ),
                  ),
                  child: Center(
                    child: Text(
                      name
                          .split(' ')
                          .take(2)
                          .map((word) => word.isEmpty ? '' : word[0])
                          .join(),
                      style: OceanTypography.title.copyWith(
                        fontSize: math.max(9, size * 0.34),
                        fontWeight: FontWeight.w700,
                        color: OceanColors.white,
                        shadows: [
                          Shadow(
                            color: OceanColors.prussianBlue.withValues(
                              alpha: 0.30,
                            ),
                            offset: const Offset(0, 1),
                            blurRadius: 2,
                          ),
                        ],
                      ),
                    ),
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
