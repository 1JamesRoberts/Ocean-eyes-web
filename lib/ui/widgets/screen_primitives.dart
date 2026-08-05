import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../core/theme/oceaneyes_tokens.dart';
import '../../models/species_catalog.dart';
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
        Expanded(
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Padding(
                padding: const EdgeInsets.only(top: 2),
                child: Icon(icon, size: 16, color: OceanColors.ink),
              ),
              const SizedBox(width: 8),
              Expanded(child: Text(title, style: OceanTypography.title)),
            ],
          ),
        ),
        if (trailing != null) ...[const SizedBox(width: 12), trailing!],
      ],
    );
    return Transform.translate(
      offset: const Offset(0, -4),
      child: divider
          ? Column(
              children: [
                header,
                const SizedBox(height: 10),
                Divider(
                  height: 1,
                  color: OceanColors.slateGrey.withValues(alpha: 0.15),
                ),
              ],
            )
          : Padding(padding: const EdgeInsets.only(bottom: 4), child: header),
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
    final statusColor = success ? OceanColors.good : OceanColors.pineTeal;
    return GlassCard(
      semanticLabel: '$title. $description',
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
              color: statusColor.withValues(alpha: 0.10),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Icon(icon, size: 22, color: statusColor),
          ),
          SizedBox(height: compact ? 8 : 12),
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
          if (action != null) ...[SizedBox(height: compact ? 12 : 16), action!],
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
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Semantics(
            button: true,
            expanded: expanded,
            enabled: enabled,
            child: InkWell(
              onTap: enabled ? () => onChanged(!expanded) : null,
              borderRadius: BorderRadius.circular(12),
              child: Row(
                children: [
                  Expanded(
                    child: Row(
                      children: [
                        SizedBox.square(
                          dimension: 36,
                          child: Center(
                            child: Icon(
                              icon,
                              size: 17,
                              color: enabled
                                  ? OceanColors.slateGrey
                                  : OceanColors.slateGrey.withValues(
                                      alpha: 0.45,
                                    ),
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
                              if (subtitle.isNotEmpty) ...[
                                const SizedBox(height: 2),
                                Text(subtitle, style: OceanTypography.caption),
                              ],
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                  if (badge != null) ...[const SizedBox(width: 12), badge!],
                  const SizedBox(width: 12),
                  AnimatedRotation(
                    turns: expanded ? 0.25 : 0,
                    duration: OceanMotion.responsive(
                      context,
                      const Duration(milliseconds: 300),
                    ),
                    curve: Curves.easeOut,
                    child: const Icon(
                      LucideIcons.chevronRight,
                      size: 18,
                      color: OceanColors.inkMuted,
                    ),
                  ),
                ],
              ),
            ),
          ),
          AnimatedSize(
            duration: OceanMotion.responsive(
              context,
              const Duration(milliseconds: 350),
            ),
            curve: const Cubic(0.16, 1, 0.3, 1),
            alignment: Alignment.topCenter,
            child: expanded
                ? Padding(padding: const EdgeInsets.only(top: 16), child: child)
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
              inactiveTrackColor: OceanColors.azureMist,
              thumbColor: OceanColors.white,
              overlayColor: OceanColors.verdigris.withValues(alpha: 0.12),
              trackHeight: 8,
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
    final normalizedAssetPath = assetPath.replaceAll('\\', '/');
    var speciesId = normalizedAssetPath
        .split('/')
        .last
        .replaceFirst(RegExp(r'\.[^.]+$'), '')
        .replaceAll('-', '_');
    var initials = name
        .trim()
        .split(RegExp(r'\s+'))
        .where((word) => word.isNotEmpty)
        .take(2)
        .map((word) => word[0])
        .join();
    var hasCatalogEntry = false;
    for (final species in SpeciesCatalog.options) {
      if (species.id == speciesId ||
          species.assetPath.replaceAll('\\', '/') == normalizedAssetPath) {
        speciesId = species.id;
        initials = species.initials;
        hasCatalogEntry = true;
        break;
      }
    }
    final fallbackColor = hasCatalogEntry
        ? Color(SpeciesCatalog.colorValueFor(speciesId))
        : const Color(0xFF94A3B8);
    final fallbackFontSize = size * 0.3 < 9 ? 9.0 : size * 0.3;

    return Semantics(
      image: true,
      label: '$name species artwork',
      child: ClipRRect(
        borderRadius: BorderRadius.circular(8),
        child: SizedBox(
          width: size,
          height: size,
          child: Image.asset(
            assetPath,
            fit: BoxFit.contain,
            errorBuilder: (_, _, _) => DecoratedBox(
              decoration: BoxDecoration(
                color: fallbackColor,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(
                  color: OceanColors.white.withValues(alpha: 0.20),
                ),
              ),
              child: Center(
                child: Text(
                  initials,
                  style: TextStyle(
                    fontFamily: OceanTypography.family,
                    fontSize: fallbackFontSize,
                    height: 1,
                    fontWeight: FontWeight.w700,
                    color: OceanColors.white,
                    shadows: [
                      Shadow(
                        color: OceanColors.prussianBlue.withValues(alpha: 0.30),
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
      ),
    );
  }
}
