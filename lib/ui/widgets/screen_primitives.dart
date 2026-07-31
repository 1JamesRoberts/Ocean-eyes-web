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
      children: [
        Icon(icon, size: 16, color: OceanColors.ink),
        const SizedBox(width: 8),
        Expanded(child: Text(title, style: OceanTypography.title)),
        ?trailing,
      ],
    );
    if (!divider) return header;
    return Column(
      children: [
        header,
        const SizedBox(height: 8),
        Divider(
          height: 1,
          color: OceanColors.pearlAqua.withValues(alpha: 0.32),
        ),
      ],
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
    final statusColor = success ? OceanColors.goodInk : OceanColors.verdigris;
    return GlassCard(
      semanticLabel: '$title. $description',
      borderColor: success ? OceanColors.white.withValues(alpha: 0.40) : null,
      borderWidth: success ? 2 : 1,
      padding: EdgeInsets.symmetric(
        horizontal: 24,
        vertical: compact ? 24 : 40,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: statusColor.withValues(alpha: 0.10),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Icon(icon, size: 24, color: statusColor),
          ),
          const SizedBox(height: 14),
          Text(
            title,
            textAlign: TextAlign.center,
            style: OceanTypography.title,
          ),
          const SizedBox(height: 6),
          Text(
            description,
            textAlign: TextAlign.center,
            style: OceanTypography.bodyMuted,
          ),
          if (action != null) ...[const SizedBox(height: 18), action!],
        ],
      ),
    );
  }
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
  });

  final String title;
  final String subtitle;
  final IconData icon;
  final bool expanded;
  final ValueChanged<bool> onChanged;
  final Widget child;
  final bool enabled;
  final Widget? badge;

  @override
  Widget build(BuildContext context) {
    return GlassPanel(
      padding: EdgeInsets.zero,
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
                constraints: const BoxConstraints(minHeight: 60),
                child: Padding(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 8,
                  ),
                  child: Row(
                    children: [
                      Icon(
                        icon,
                        size: 19,
                        color: enabled
                            ? OceanColors.ink
                            : OceanColors.inkMuted.withValues(alpha: 0.45),
                      ),
                      const SizedBox(width: 10),
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
          ),
          AnimatedSize(
            duration: OceanMotion.responsive(
              context,
              const Duration(milliseconds: 300),
            ),
            curve: Curves.easeOut,
            alignment: Alignment.topCenter,
            child: expanded
                ? Padding(
                    padding: const EdgeInsets.fromLTRB(12, 2, 12, 12),
                    child: child,
                  )
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
              Text(valueText, style: OceanTypography.strong),
            ],
          ),
          SliderTheme(
            data: SliderTheme.of(context).copyWith(
              activeTrackColor: OceanColors.verdigris,
              inactiveTrackColor: OceanColors.slateGrey.withValues(alpha: 0.18),
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
        ],
      ),
    );
  }
}

class SwitchRow extends StatelessWidget {
  const SwitchRow({
    super.key,
    required this.title,
    required this.subtitle,
    required this.value,
    required this.onChanged,
    this.enabled = true,
  });

  final String title;
  final String subtitle;
  final bool value;
  final ValueChanged<bool> onChanged;
  final bool enabled;

  @override
  Widget build(BuildContext context) {
    return ConstrainedBox(
      constraints: const BoxConstraints(minHeight: 56),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  title,
                  style: OceanTypography.strong.copyWith(
                    color: enabled ? OceanColors.ink : OceanColors.inkMuted,
                  ),
                ),
                const SizedBox(height: 2),
                Text(subtitle, style: OceanTypography.caption),
              ],
            ),
          ),
          Switch(
            value: value,
            onChanged: enabled ? onChanged : null,
            activeThumbColor: OceanColors.white,
            activeTrackColor: OceanColors.verdigris,
            inactiveThumbColor: OceanColors.white,
            inactiveTrackColor: OceanColors.slateGrey.withValues(alpha: 0.25),
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
  });

  final String assetPath;
  final String name;
  final double size;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      image: true,
      label: '$name species artwork',
      child: Container(
        width: size,
        height: size,
        padding: EdgeInsets.all(size * 0.06),
        decoration: BoxDecoration(
          color: OceanColors.turquoise.withValues(alpha: 0.10),
          borderRadius: BorderRadius.circular(size * 0.30),
          border: Border.all(color: OceanColors.white.withValues(alpha: 0.28)),
        ),
        child: Image.asset(
          assetPath,
          fit: BoxFit.contain,
          errorBuilder: (_, _, _) => Center(
            child: Text(
              name
                  .split(' ')
                  .take(2)
                  .map((word) => word.isEmpty ? '' : word[0])
                  .join(),
              style: OceanTypography.title,
            ),
          ),
        ),
      ),
    );
  }
}
