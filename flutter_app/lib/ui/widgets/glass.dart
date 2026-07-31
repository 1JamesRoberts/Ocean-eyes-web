import 'dart:ui';

import 'package:flutter/material.dart';

import '../../core/theme/oceaneyes_tokens.dart';

class GlassCard extends StatelessWidget {
  const GlassCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(OceanSpacing.md),
    this.margin,
    this.onTap,
    this.overlay = false,
    this.borderColor,
    this.borderWidth = 1,
    this.radius = OceanRadii.card,
    this.opacity = 1,
    this.semanticLabel,
  });

  final Widget child;
  final EdgeInsetsGeometry padding;
  final EdgeInsetsGeometry? margin;
  final VoidCallback? onTap;
  final bool overlay;
  final Color? borderColor;
  final double borderWidth;
  final double radius;
  final double opacity;
  final String? semanticLabel;

  @override
  Widget build(BuildContext context) {
    final borderRadius = BorderRadius.circular(radius);
    final background = overlay
        ? OceanColors.white.withValues(alpha: 0.40 * opacity)
        : OceanColors.azureMist.withValues(alpha: 0.42 * opacity);
    final resolvedBorder =
        borderColor ?? OceanColors.pearlAqua.withValues(alpha: 0.72 * opacity);

    Widget content = ClipRRect(
      borderRadius: borderRadius,
      child: BackdropFilter(
        filter: ImageFilter.blur(
          sigmaX: overlay ? 12 : 2,
          sigmaY: overlay ? 12 : 2,
        ),
        child: DecoratedBox(
          decoration: BoxDecoration(
            color: background,
            borderRadius: borderRadius,
            border: Border.all(color: resolvedBorder, width: borderWidth),
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                OceanColors.white.withValues(alpha: 0.22 * opacity),
                background,
                OceanColors.white.withValues(alpha: 0.08 * opacity),
              ],
              stops: const [0, 0.42, 1],
            ),
            boxShadow: [
              BoxShadow(
                color: OceanColors.prussianBlue.withValues(alpha: 0.05),
                blurRadius: 20,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Padding(padding: padding, child: child),
        ),
      ),
    );

    if (onTap != null) {
      content = Material(
        color: Colors.transparent,
        borderRadius: borderRadius,
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: onTap,
          borderRadius: borderRadius,
          child: content,
        ),
      );
    }

    if (semanticLabel != null) {
      content = Semantics(
        label: semanticLabel,
        button: onTap != null,
        container: true,
        child: content,
      );
    }

    return RepaintBoundary(
      child: Padding(padding: margin ?? EdgeInsets.zero, child: content),
    );
  }
}

class GlassPanel extends StatelessWidget {
  const GlassPanel({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.fromLTRB(10, 10, 10, 8),
    this.onTap,
    this.borderColor,
    this.radius = 16,
    this.color,
  });

  final Widget child;
  final EdgeInsetsGeometry padding;
  final VoidCallback? onTap;
  final Color? borderColor;
  final double radius;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    final borderRadius = BorderRadius.circular(radius);
    final body = Container(
      constraints: onTap == null
          ? null
          : const BoxConstraints(minHeight: OceanGeometry.minimumTouchTarget),
      padding: padding,
      decoration: BoxDecoration(
        color: color ?? OceanColors.white.withValues(alpha: 0.20),
        borderRadius: borderRadius,
        border: Border.all(
          color: borderColor ?? OceanColors.white.withValues(alpha: 0.20),
        ),
      ),
      child: child,
    );
    if (onTap == null) return body;
    return Material(
      color: Colors.transparent,
      borderRadius: borderRadius,
      child: InkWell(onTap: onTap, borderRadius: borderRadius, child: body),
    );
  }
}

enum GlassButtonStyle { primary, outline, destructive }

class GlassButton extends StatelessWidget {
  const GlassButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.icon,
    this.style = GlassButtonStyle.primary,
    this.expanded = false,
    this.loading = false,
  });

  final String label;
  final VoidCallback? onPressed;
  final IconData? icon;
  final GlassButtonStyle style;
  final bool expanded;
  final bool loading;

  @override
  Widget build(BuildContext context) {
    final foreground = style == GlassButtonStyle.outline
        ? OceanColors.ink
        : OceanColors.white;
    final background = switch (style) {
      GlassButtonStyle.primary => OceanColors.action,
      GlassButtonStyle.outline => Colors.transparent,
      GlassButtonStyle.destructive => OceanColors.criticalInk,
    };

    final child = AnimatedSwitcher(
      duration: OceanMotion.responsive(context, OceanMotion.fade),
      child: loading
          ? SizedBox(
              key: const ValueKey('loading'),
              width: 18,
              height: 18,
              child: CircularProgressIndicator(
                strokeWidth: 2,
                color: foreground,
              ),
            )
          : Row(
              key: const ValueKey('label'),
              mainAxisSize: MainAxisSize.min,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                if (icon != null) ...[
                  Icon(icon, size: 17, color: foreground),
                  const SizedBox(width: 8),
                ],
                Flexible(
                  child: Text(
                    label,
                    maxLines: 2,
                    textAlign: TextAlign.center,
                    overflow: TextOverflow.ellipsis,
                    style: OceanTypography.strong.copyWith(
                      color: foreground,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              ],
            ),
    );

    final button = ConstrainedBox(
      constraints: const BoxConstraints(
        minHeight: OceanGeometry.minimumTouchTarget,
      ),
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: background,
          borderRadius: BorderRadius.circular(OceanRadii.pill),
          border: style == GlassButtonStyle.outline
              ? Border.all(color: OceanColors.white.withValues(alpha: 0.35))
              : null,
          boxShadow: [
            BoxShadow(
              color: OceanColors.prussianBlue.withValues(alpha: 0.20),
              blurRadius: 12,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: TextButton(
          onPressed: loading ? null : onPressed,
          style: TextButton.styleFrom(
            foregroundColor: foreground,
            disabledForegroundColor: foreground.withValues(alpha: 0.45),
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 10),
            shape: const StadiumBorder(),
          ),
          child: child,
        ),
      ),
    );
    return expanded ? SizedBox(width: double.infinity, child: button) : button;
  }
}

class GlassIconButton extends StatelessWidget {
  const GlassIconButton({
    super.key,
    required this.icon,
    required this.tooltip,
    required this.onPressed,
    this.color = OceanColors.inkMuted,
    this.background,
    this.iconSize = 19,
    this.size = OceanGeometry.minimumTouchTarget,
  });

  final IconData icon;
  final String tooltip;
  final VoidCallback? onPressed;
  final Color color;
  final Color? background;
  final double iconSize;
  final double size;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      label: tooltip,
      enabled: onPressed != null,
      child: Tooltip(
        message: tooltip,
        child: SizedBox.square(
          dimension: size,
          child: IconButton(
            onPressed: onPressed,
            icon: Icon(icon, size: iconSize),
            color: color,
            disabledColor: color.withValues(alpha: 0.35),
            style: IconButton.styleFrom(
              backgroundColor:
                  background ?? OceanColors.white.withValues(alpha: 0.30),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(OceanRadii.inline),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class GlassPill extends StatelessWidget {
  const GlassPill({
    super.key,
    required this.child,
    this.onTap,
    this.color,
    this.foregroundColor = OceanColors.ink,
    this.padding = const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
  });

  final Widget child;
  final VoidCallback? onTap;
  final Color? color;
  final Color foregroundColor;
  final EdgeInsetsGeometry padding;

  @override
  Widget build(BuildContext context) {
    final content = Container(
      constraints: BoxConstraints(minHeight: onTap == null ? 0 : 44),
      padding: padding,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: color ?? OceanColors.white.withValues(alpha: 0.30),
        borderRadius: BorderRadius.circular(OceanRadii.pill),
        border: Border.all(color: OceanColors.white.withValues(alpha: 0.25)),
      ),
      child: DefaultTextStyle(
        style: OceanTypography.caption.copyWith(color: foregroundColor),
        child: IconTheme(
          data: IconThemeData(color: foregroundColor, size: 14),
          child: child,
        ),
      ),
    );
    if (onTap == null) return content;
    return Material(
      color: Colors.transparent,
      borderRadius: BorderRadius.circular(OceanRadii.pill),
      child: InkWell(
        borderRadius: BorderRadius.circular(OceanRadii.pill),
        onTap: onTap,
        child: content,
      ),
    );
  }
}

Future<T?> showOceanDialog<T>({
  required BuildContext context,
  required Widget child,
  bool barrierDismissible = true,
}) {
  return showGeneralDialog<T>(
    context: context,
    barrierDismissible: barrierDismissible,
    barrierLabel: 'Dismiss dialog',
    barrierColor: OceanColors.prussianBlue.withValues(alpha: 0.50),
    transitionDuration: OceanMotion.responsive(context, OceanMotion.sheet),
    pageBuilder: (_, _, _) => SafeArea(
      child: Center(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Material(color: Colors.transparent, child: child),
        ),
      ),
    ),
    transitionBuilder: (context, animation, _, child) => FadeTransition(
      opacity: CurvedAnimation(parent: animation, curve: Curves.easeOut),
      child: ScaleTransition(
        scale: Tween<double>(begin: 0.98, end: 1).animate(animation),
        child: child,
      ),
    ),
  );
}
