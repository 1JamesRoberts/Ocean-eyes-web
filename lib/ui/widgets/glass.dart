import 'dart:ui';

import 'package:flutter/material.dart';

import '../../core/theme/oceaneyes_tokens.dart';

class GlassCard extends StatelessWidget {
  const GlassCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.fromLTRB(20, 20, 20, 16),
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
        borderColor ??
        (overlay
            ? OceanColors.white.withValues(alpha: 0.30 * opacity)
            : OceanColors.pearlAqua.withValues(alpha: 0.72 * opacity));

    Widget content = DecoratedBox(
      decoration: BoxDecoration(
        borderRadius: borderRadius,
        boxShadow: overlay
            ? [
                BoxShadow(
                  color: OceanColors.prussianBlue.withValues(alpha: 0.12),
                  blurRadius: 32,
                  offset: const Offset(0, 8),
                ),
              ]
            : null,
      ),
      child: ClipRRect(
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
            ),
            child: Stack(
              children: [
                Padding(padding: padding, child: child),
                Positioned.fill(
                  child: IgnorePointer(
                    child: CustomPaint(
                      painter: _GlassInsetShadowPainter(
                        overlay: overlay,
                        opacity: opacity,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );

    if (onTap != null) {
      content = Material(
        color: Colors.transparent,
        borderRadius: borderRadius,
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

class _GlassInsetShadowPainter extends CustomPainter {
  const _GlassInsetShadowPainter({
    required this.overlay,
    required this.opacity,
  });

  final bool overlay;
  final double opacity;

  @override
  void paint(Canvas canvas, Size size) {
    if (overlay) {
      final light = Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1
        ..color = OceanColors.white.withValues(alpha: 0.25 * opacity);
      canvas
        ..drawLine(const Offset(1, 1), Offset(size.width - 1, 1), light)
        ..drawLine(const Offset(1, 1), Offset(1, size.height - 1), light);
      final shade = Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1
        ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 1)
        ..color = OceanColors.prussianBlue.withValues(alpha: 0.03 * opacity);
      canvas
        ..drawLine(
          Offset(1, size.height - 1),
          Offset(size.width - 1, size.height - 1),
          shade,
        )
        ..drawLine(
          Offset(size.width - 1, 1),
          Offset(size.width - 1, size.height - 1),
          shade,
        );
      return;
    }

    final top = Paint()
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 2.5)
      ..color = OceanColors.white.withValues(alpha: 0.30 * opacity);
    canvas.drawRect(Rect.fromLTWH(0, 2.5, size.width, 5), top);
    final bottom = Paint()
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 2.5)
      ..color = OceanColors.white.withValues(alpha: 0.50 * opacity);
    canvas.drawRect(Rect.fromLTWH(1, size.height - 7.5, size.width, 5), bottom);
    canvas.drawLine(
      const Offset(0, 1),
      Offset(size.width, 1),
      Paint()
        ..strokeWidth = 1
        ..color = OceanColors.tropicalTeal.withValues(alpha: 0.50 * opacity),
    );
  }

  @override
  bool shouldRepaint(covariant _GlassInsetShadowPainter oldDelegate) =>
      oldDelegate.overlay != overlay || oldDelegate.opacity != opacity;
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

enum GlassButtonSize { small, medium, large }

class GlassButton extends StatelessWidget {
  const GlassButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.icon,
    this.style = GlassButtonStyle.primary,
    this.expanded = false,
    this.loading = false,
    this.compact = false,
    this.size = GlassButtonSize.medium,
  });

  final String label;
  final VoidCallback? onPressed;
  final IconData? icon;
  final GlassButtonStyle style;
  final bool expanded;
  final bool loading;
  final bool compact;
  final GlassButtonSize size;

  @override
  Widget build(BuildContext context) {
    final resolvedSize = compact ? GlassButtonSize.small : size;
    final foreground = switch (style) {
      GlassButtonStyle.primary => OceanColors.white,
      GlassButtonStyle.outline => OceanColors.ink,
      GlassButtonStyle.destructive => OceanColors.critical,
    };
    final background = switch (style) {
      GlassButtonStyle.primary => OceanColors.action,
      GlassButtonStyle.outline => Colors.transparent,
      GlassButtonStyle.destructive => OceanColors.critical.withValues(
        alpha: 0.08,
      ),
    };
    final textStyle = switch (resolvedSize) {
      GlassButtonSize.small => OceanTypography.caption,
      GlassButtonSize.medium => OceanTypography.strong,
      GlassButtonSize.large => OceanTypography.title,
    };
    final padding = switch (resolvedSize) {
      GlassButtonSize.small => const EdgeInsets.symmetric(
        horizontal: 12,
        vertical: 6,
      ),
      GlassButtonSize.medium => const EdgeInsets.symmetric(
        horizontal: 20,
        vertical: 10,
      ),
      GlassButtonSize.large => const EdgeInsets.symmetric(
        horizontal: 24,
        vertical: 14,
      ),
    };
    final iconSize = switch (resolvedSize) {
      GlassButtonSize.small => 13.0,
      GlassButtonSize.medium => 17.0,
      GlassButtonSize.large => 18.0,
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
                  Icon(icon, size: iconSize, color: foreground),
                  const SizedBox(width: 8),
                ],
                Flexible(
                  child: Text(
                    label,
                    maxLines: 2,
                    textAlign: TextAlign.center,
                    overflow: TextOverflow.ellipsis,
                    style: textStyle.copyWith(color: foreground),
                  ),
                ),
              ],
            ),
    );

    final shadows = switch (style) {
      GlassButtonStyle.primary => [
        BoxShadow(
          color: OceanColors.prussianBlue.withValues(alpha: 0.20),
          blurRadius: 12,
          offset: const Offset(0, 4),
        ),
      ],
      GlassButtonStyle.outline => [
        BoxShadow(
          color: OceanColors.prussianBlue.withValues(alpha: 0.05),
          blurRadius: 20,
          offset: const Offset(0, 4),
        ),
      ],
      GlassButtonStyle.destructive => const <BoxShadow>[],
    };

    final textButton = TextButton(
      onPressed: loading ? null : onPressed,
      style: TextButton.styleFrom(
        foregroundColor: foreground,
        disabledForegroundColor: foreground.withValues(alpha: 0.45),
        padding: padding,
        shape: const StadiumBorder(),
      ),
      child: child,
    );

    final button = ConstrainedBox(
      constraints: const BoxConstraints(
        minHeight: OceanGeometry.minimumTouchTarget,
      ),
      child: DecoratedBox(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(OceanRadii.pill),
          boxShadow: shadows,
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(OceanRadii.pill),
          child: BackdropFilter(
            filter: ImageFilter.blur(
              sigmaX: style == GlassButtonStyle.outline ? 6 : 0,
              sigmaY: style == GlassButtonStyle.outline ? 6 : 0,
            ),
            child: DecoratedBox(
              decoration: BoxDecoration(
                color: background,
                borderRadius: BorderRadius.circular(OceanRadii.pill),
                border: style == GlassButtonStyle.destructive
                    ? Border.all(
                        color: OceanColors.critical.withValues(alpha: 0.30),
                      )
                    : null,
              ),
              child: Stack(
                alignment: Alignment.center,
                children: [
                  expanded
                      ? SizedBox(width: double.infinity, child: textButton)
                      : textButton,
                  if (style == GlassButtonStyle.outline)
                    const Positioned.fill(
                      child: IgnorePointer(child: _InlineInsetHighlights()),
                    ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
    return expanded ? SizedBox(width: double.infinity, child: button) : button;
  }
}

class _InlineInsetHighlights extends StatelessWidget {
  const _InlineInsetHighlights();

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        Positioned(
          top: 0,
          left: 0,
          right: 0,
          child: Container(
            height: 1,
            color: OceanColors.white.withValues(alpha: 0.25),
          ),
        ),
        Positioned(
          top: 0,
          bottom: 0,
          left: 0,
          child: Container(
            width: 1,
            color: OceanColors.white.withValues(alpha: 0.25),
          ),
        ),
        Positioned(
          bottom: 0,
          left: 0,
          right: 0,
          child: Container(
            height: 1,
            color: OceanColors.prussianBlue.withValues(alpha: 0.03),
          ),
        ),
        Positioned(
          top: 0,
          bottom: 0,
          right: 0,
          child: Container(
            width: 1,
            color: OceanColors.prussianBlue.withValues(alpha: 0.03),
          ),
        ),
      ],
    );
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
    this.minimumHeight,
    this.borderColor,
  });

  final Widget child;
  final VoidCallback? onTap;
  final Color? color;
  final Color foregroundColor;
  final EdgeInsetsGeometry padding;
  final double? minimumHeight;
  final Color? borderColor;

  @override
  Widget build(BuildContext context) {
    final content = Container(
      constraints: BoxConstraints(
        minHeight: minimumHeight ?? (onTap == null ? 0 : 44),
      ),
      padding: padding,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: color ?? OceanColors.white.withValues(alpha: 0.30),
        borderRadius: BorderRadius.circular(OceanRadii.pill),
        border: Border.all(
          color: borderColor ?? OceanColors.white.withValues(alpha: 0.25),
        ),
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
