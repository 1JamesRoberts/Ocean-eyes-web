import 'dart:ui' show ImageFilter;

import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../core/theme/oceaneyes_tokens.dart';
import '../../models/aquarium_models.dart';
import '../../view_models/oceaneyes_controller.dart';
import 'data_visuals.dart';

class AquariumAmbientBackdrop extends StatelessWidget {
  const AquariumAmbientBackdrop({super.key, required this.controller});

  final OceanEyesController controller;

  @override
  Widget build(BuildContext context) {
    return const DecoratedBox(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.centerLeft,
          end: Alignment.centerRight,
          colors: [
            OceanColors.white,
            OceanColors.azureMist2,
            OceanColors.azureMist2,
            OceanColors.white,
          ],
          stops: [0, 0.05, 0.95, 1],
        ),
      ),
    );
  }
}

/// Applies the same stream adjustments everywhere the frozen camera fixture is
/// rendered so the hero and fullscreen view cannot drift apart.
class AquariumStreamImage extends StatelessWidget {
  const AquariumStreamImage({
    super.key,
    required this.controller,
    this.fit = BoxFit.cover,
    this.alignment = Alignment.center,
  });

  final OceanEyesController controller;
  final BoxFit fit;
  final AlignmentGeometry alignment;

  @override
  Widget build(BuildContext context) {
    final saturation = controller.saturation.clamp(0.5, 1.5);
    final contrast = controller.contrast.clamp(0.5, 1.5);
    final brightness = controller.brightness.clamp(0.7, 1.3);
    final inverseSaturation = 1 - saturation;
    final multiplier = contrast * brightness;
    final offset = 128 * (1 - contrast) * brightness;
    const redLuminance = 0.2126;
    const greenLuminance = 0.7152;
    const blueLuminance = 0.0722;

    return Stack(
      fit: StackFit.expand,
      children: [
        ColorFiltered(
          colorFilter: ColorFilter.matrix([
            (redLuminance * inverseSaturation + saturation) * multiplier,
            greenLuminance * inverseSaturation * multiplier,
            blueLuminance * inverseSaturation * multiplier,
            0,
            offset,
            redLuminance * inverseSaturation * multiplier,
            (greenLuminance * inverseSaturation + saturation) * multiplier,
            blueLuminance * inverseSaturation * multiplier,
            0,
            offset,
            redLuminance * inverseSaturation * multiplier,
            greenLuminance * inverseSaturation * multiplier,
            (blueLuminance * inverseSaturation + saturation) * multiplier,
            0,
            offset,
            0,
            0,
            0,
            1,
            0,
          ]),
          child: Image.asset(
            'assets/images/aquarium_hero.png',
            fit: fit,
            alignment: alignment,
          ),
        ),
        if (controller.temperature != 0)
          ColoredBox(
            color:
                (controller.temperature > 0
                        ? const Color(0xFFFFB000)
                        : const Color(0xFF00A0FF))
                    .withValues(
                      alpha: (controller.temperature.abs() / 300).clamp(0, 1),
                    ),
          ),
        if (controller.tint != 0)
          ColoredBox(
            color:
                (controller.tint > 0
                        ? const Color(0xFFFF00BB)
                        : const Color(0xFF00FF44))
                    .withValues(
                      alpha: (controller.tint.abs() / 400).clamp(0, 1),
                    ),
          ),
      ],
    );
  }
}

class AquariumHero extends StatelessWidget {
  const AquariumHero({super.key, required this.controller, required this.page});

  final OceanEyesController controller;
  final AppPage page;

  bool get _isStreaming => switch (controller.cameraStage) {
    CameraStage.active ||
    CameraStage.aiProcessing ||
    CameraStage.measuringTurbidity => true,
    _ => false,
  };

  String get _eyebrow {
    if (page == AppPage.alerts) return 'ALERTS';
    if (page == AppPage.alertDetail) return 'ALERT DIAGNOSTICS';
    if (page == AppPage.history) return 'CLARITY ANALYTICS';
    return switch (controller.activeTab) {
      PrimaryTab.dashboard => 'AQUARIUM OVERVIEW',
      PrimaryTab.myFish => 'AQUARIUM INVENTORY',
      PrimaryTab.analytics => 'AQUARIUM INTELLIGENCE',
      PrimaryTab.account => 'AQUARIUM CONTROLS',
    };
  }

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: OceanGeometry.heroHeight + OceanGeometry.heroBlendExtension,
      child: Stack(
        clipBehavior: Clip.none,
        fit: StackFit.expand,
        children: [
          ColoredBox(
            color: OceanColors.prussianBlue,
            child: _isStreaming
                ? AquariumStreamImage(
                    controller: controller,
                    fit: BoxFit.cover,
                    alignment: Alignment.center,
                  )
                : const SizedBox.expand(),
          ),
          if (_isStreaming)
            const DecoratedBox(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.center,
                  colors: [Color(0x33000000), Colors.transparent],
                ),
              ),
            ),
          Positioned.fill(
            child: HeatmapOverlay(
              centers: controller.selectedHeatmapCenters,
              sourceDimensions: controller.heatmapSourceDimensions,
              visible:
                  controller.activeTab == PrimaryTab.analytics &&
                  page == AppPage.primary,
            ),
          ),
          Positioned(
            top: OceanGeometry.heroSurfaceTop,
            left: 0,
            right: 0,
            bottom: 0,
            child: IgnorePointer(
              child: ShaderMask(
                blendMode: BlendMode.dstIn,
                shaderCallback: (bounds) => LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: const [Colors.transparent, Colors.black],
                  stops: [0, (40 / bounds.height).clamp(0, 1)],
                ).createShader(bounds),
                child: const DecoratedBox(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.centerLeft,
                      end: Alignment.centerRight,
                      colors: [
                        OceanColors.white,
                        OceanColors.azureMist2,
                        OceanColors.azureMist2,
                        OceanColors.white,
                      ],
                      stops: [0, 0.05, 0.95, 1],
                    ),
                  ),
                ),
              ),
            ),
          ),
          Positioned.fill(
            bottom: OceanGeometry.heroBlendExtension,
            child: Material(
              color: Colors.transparent,
              child: InkWell(
                onTap:
                    page == AppPage.primary &&
                        controller.activeTab != PrimaryTab.account
                    ? () => controller.selectTab(PrimaryTab.account)
                    : null,
                child: Stack(
                  children: [
                    if (_isStreaming)
                      Positioned(
                        top: 12,
                        left: 16,
                        child: Row(
                          children: [
                            _HeroPill(
                              semanticLabel: 'Camera is live',
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [const Text('Live')],
                              ),
                            ),
                            const SizedBox(width: 8),
                            _HeroPill(
                              semanticLabel:
                                  '${controller.detectedFish} fish detected',
                              child: Text('${controller.detectedFish} fish'),
                            ),
                          ],
                        ),
                      ),
                    Positioned(
                      left: 16,
                      bottom: 16,
                      child: Semantics(
                        header: true,
                        child: Text(
                          _eyebrow,
                          style: const TextStyle(
                            fontFamily: OceanTypography.family,
                            fontSize: 12,
                            height: 16 / 12,
                            fontWeight: FontWeight.w600,
                            letterSpacing: 1.32,
                            color: OceanColors.white,
                            shadows: [
                              Shadow(
                                color: Color(0x26000000),
                                blurRadius: 2,
                                offset: Offset(0, 1),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                    if (page != AppPage.primary)
                      Positioned(
                        top: 12,
                        right: 16,
                        child: _HeroBackButton(
                          onTap: page == AppPage.alertDetail
                              ? controller.popAlertDetail
                              : controller.closeSecondaryRoute,
                        ),
                      ),
                    if (page == AppPage.primary &&
                        controller.activeTab == PrimaryTab.myFish)
                      Positioned(
                        top: 12,
                        right: 16,
                        child: _HeroPill(
                          onTap: controller.requestAddFish,
                          semanticLabel: 'Add fish',
                          child: const Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(LucideIcons.plus, size: 13),
                              SizedBox(width: 4),
                              Text('Add fish'),
                            ],
                          ),
                        ),
                      ),
                    if (page == AppPage.primary &&
                        controller.activeTab == PrimaryTab.analytics)
                      Positioned(
                        right: 16,
                        bottom: 12,
                        child: _AnalyticsHeroControls(controller: controller),
                      ),
                    if (page == AppPage.primary &&
                        controller.activeTab == PrimaryTab.account &&
                        _isStreaming)
                      Positioned(
                        right: 16,
                        bottom: 12,
                        child: _CameraHeroControls(controller: controller),
                      ),
                  ],
                ),
              ),
            ),
          ),
          if (!_isStreaming)
            Positioned.fill(child: _CameraStateMessage(controller: controller)),
        ],
      ),
    );
  }
}

class _HeroPill extends StatelessWidget {
  const _HeroPill({
    super.key,
    required this.child,
    required this.semanticLabel,
    this.onTap,
  });

  final Widget child;
  final String semanticLabel;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    Widget content = DecoratedBox(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(OceanRadii.pill),
        boxShadow: [
          BoxShadow(
            color: OceanColors.pineTeal.withValues(alpha: 0.05),
            blurRadius: 20,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(OceanRadii.pill),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 6, sigmaY: 6),
          child: CustomPaint(
            foregroundPainter: const _GlassInsetPainter(radius: 999),
            child: Container(
              constraints: const BoxConstraints(minHeight: 32),
              padding: const EdgeInsets.symmetric(horizontal: 8),
              alignment: Alignment.center,
              color: Colors.transparent,
              child: DefaultTextStyle(
                style: const TextStyle(
                  fontFamily: OceanTypography.family,
                  fontSize: 12,
                  height: 1.35,
                  fontWeight: FontWeight.w400,
                  letterSpacing: -0.12,
                  color: OceanColors.white,
                ),
                child: IconTheme(
                  data: const IconThemeData(color: OceanColors.white, size: 13),
                  child: child,
                ),
              ),
            ),
          ),
        ),
      ),
    );
    if (onTap != null) {
      content = Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(OceanRadii.pill),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(OceanRadii.pill),
          child: content,
        ),
      );
    }
    return Semantics(
      label: semanticLabel,
      button: onTap != null,
      child: content,
    );
  }
}

class _HeroBackButton extends StatelessWidget {
  const _HeroBackButton({required this.onTap});

  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return _HeroPill(
      onTap: onTap,
      semanticLabel: 'Back',
      child: const Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(LucideIcons.arrowLeft, size: 13),
          SizedBox(width: 4),
          Text('Back'),
        ],
      ),
    );
  }
}

class _CameraStateMessage extends StatelessWidget {
  const _CameraStateMessage({required this.controller});

  final OceanEyesController controller;

  @override
  Widget build(BuildContext context) {
    final connecting =
        controller.cameraStage == CameraStage.requestingPermission;
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          connecting
              ? const SizedBox.square(
                  dimension: 24,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    color: OceanColors.slateGrey,
                  ),
                )
              : const Icon(
                  Icons.videocam_outlined,
                  size: 24,
                  color: OceanColors.slateGrey,
                ),
          const SizedBox(height: 8),
          const Text(
            'Feed is idle. Connect stream to monitor.',
            textAlign: TextAlign.center,
            style: OceanTypography.caption,
          ),
          const SizedBox(height: 16),
          DecoratedBox(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(24),
              gradient: const LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [OceanColors.verdigris, OceanColors.pineTeal],
              ),
              boxShadow: [
                BoxShadow(
                  color: OceanColors.pineTeal.withValues(alpha: 0.25),
                  blurRadius: 16,
                  offset: const Offset(0, 6),
                ),
              ],
            ),
            child: Material(
              color: Colors.transparent,
              borderRadius: BorderRadius.circular(24),
              child: InkWell(
                onTap: connecting
                    ? null
                    : () {
                        if (controller.cameraStage == CameraStage.unavailable) {
                          controller.connectDemoTank();
                        } else {
                          controller.requestCameraPermission();
                        }
                      },
                borderRadius: BorderRadius.circular(24),
                child: Padding(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 8,
                  ),
                  child: Text(
                    'Connect Stream',
                    style: OceanTypography.caption.copyWith(
                      color: OceanColors.white.withValues(alpha: 0.70),
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

class _AnalyticsHeroControls extends StatelessWidget {
  const _AnalyticsHeroControls({required this.controller});

  final OceanEyesController controller;

  @override
  Widget build(BuildContext context) {
    final rangeLabel = DateFormat(
      'd MMM',
    ).format(controller.analyticsRange.start);
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        _HeroPill(
          key: const ValueKey('analytics-date-filter'),
          onTap: controller.requestAnalyticsRange,
          semanticLabel: 'Analytics date range $rangeLabel',
          child: const Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(LucideIcons.history, size: 13),
              SizedBox(width: 4),
              Text('Range'),
            ],
          ),
        ),
        const SizedBox(width: 8),
        _HeroPill(
          key: const ValueKey('analytics-species-filter'),
          onTap: controller.requestAnalyticsSpecies,
          semanticLabel: 'Species filter ${controller.selectedSpecies}',
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(LucideIcons.fish, size: 13),
              const SizedBox(width: 4),
              Text(
                controller.selectedSpecies == 'All species'
                    ? 'All Species'
                    : controller.selectedSpecies,
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _CameraHeroControls extends StatelessWidget {
  const _CameraHeroControls({required this.controller});

  final OceanEyesController controller;

  @override
  Widget build(BuildContext context) {
    final busy =
        controller.cameraStage == CameraStage.aiProcessing ||
        controller.cameraStage == CameraStage.measuringTurbidity;
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        _HeroCircleButton(
          icon: LucideIcons.camera,
          tooltip: controller.usingFrontCamera
              ? 'Switch to tank camera'
              : 'Switch to device camera',
          active: controller.usingFrontCamera,
          onTap: busy ? null : controller.switchCamera,
        ),
        const SizedBox(width: 8),
        _HeroCircleButton(
          icon: LucideIcons.eye,
          tooltip: 'Measure water clarity',
          onTap: busy ? null : controller.measureTurbidity,
        ),
        const SizedBox(width: 8),
        _HeroCircleButton(
          icon: LucideIcons.brain,
          tooltip: controller.aiEnabled
              ? 'Stop AI analysis'
              : 'Start AI analysis',
          active: controller.aiEnabled,
          loading: controller.cameraStage == CameraStage.aiProcessing,
          onTap: busy ? null : () => controller.toggleAI(!controller.aiEnabled),
        ),
        const SizedBox(width: 8),
        const _HeroCircleButton(
          icon: LucideIcons.stethoscope,
          tooltip: 'Disease diagnosis is not yet available',
          onTap: null,
        ),
        const SizedBox(width: 8),
        _HeroCircleButton(
          icon: LucideIcons.maximize2,
          tooltip: 'Enter fullscreen',
          onTap: () => controller.setFullscreenCamera(true),
        ),
      ],
    );
  }
}

class _HeroCircleButton extends StatelessWidget {
  const _HeroCircleButton({
    required this.icon,
    required this.tooltip,
    required this.onTap,
    this.active = false,
    this.loading = false,
  });

  final IconData icon;
  final String tooltip;
  final VoidCallback? onTap;
  final bool active;
  final bool loading;

  @override
  Widget build(BuildContext context) {
    return Tooltip(
      message: tooltip,
      child: Semantics(
        button: true,
        enabled: onTap != null,
        label: tooltip,
        child: Opacity(
          opacity: onTap == null ? 0.35 : 1,
          child: SizedBox.square(
            dimension: 32,
            child: InkWell(
              onTap: onTap,
              customBorder: const CircleBorder(),
              child: Center(
                child: ClipOval(
                  child: BackdropFilter(
                    filter: ImageFilter.blur(sigmaX: 6, sigmaY: 6),
                    child: CustomPaint(
                      foregroundPainter: const _GlassInsetPainter(radius: 16),
                      child: Container(
                        width: 32,
                        height: 32,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: Colors.transparent,
                          boxShadow: [
                            BoxShadow(
                              color: OceanColors.pineTeal.withValues(
                                alpha: 0.05,
                              ),
                              blurRadius: 20,
                              offset: const Offset(0, 4),
                            ),
                          ],
                        ),
                        child: loading
                            ? const _SpinningLoaderIcon()
                            : Icon(
                                icon,
                                size: 14,
                                color: OceanColors.white,
                                shadows: active
                                    ? const [
                                        Shadow(
                                          color: OceanColors.white,
                                          blurRadius: 5,
                                        ),
                                      ]
                                    : null,
                              ),
                      ),
                    ),
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

class _SpinningLoaderIcon extends StatefulWidget {
  const _SpinningLoaderIcon();

  @override
  State<_SpinningLoaderIcon> createState() => _SpinningLoaderIconState();
}

class _SpinningLoaderIconState extends State<_SpinningLoaderIcon>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 1000),
  )..repeat();

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return RotationTransition(
      turns: _controller,
      child: const Icon(
        LucideIcons.loader2,
        size: 14,
        color: OceanColors.white,
      ),
    );
  }
}

class _GlassInsetPainter extends CustomPainter {
  const _GlassInsetPainter({required this.radius});

  final double radius;

  @override
  void paint(Canvas canvas, Size size) {
    final resolvedRadius = radius.clamp(0, size.shortestSide / 2).toDouble();
    final rect = Offset.zero & size;
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        rect.deflate(0.5),
        Radius.circular(resolvedRadius),
      ),
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1
        ..color = OceanColors.white.withValues(alpha: 0.25),
    );
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        rect.deflate(1.5),
        Radius.circular(
          (resolvedRadius - 1).clamp(0, resolvedRadius).toDouble(),
        ),
      ),
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 2
        ..color = OceanColors.pineTeal.withValues(alpha: 0.03),
    );
  }

  @override
  bool shouldRepaint(covariant _GlassInsetPainter oldDelegate) =>
      oldDelegate.radius != radius;
}
