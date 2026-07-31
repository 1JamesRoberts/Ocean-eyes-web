import 'dart:math' as math;
import 'dart:ui' show ImageFilter;

import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../core/theme/oceaneyes_tokens.dart';
import '../../models/aquarium_models.dart';
import '../../view_models/oceaneyes_controller.dart';
import 'data_visuals.dart';
import 'glass.dart';

class AquariumAmbientBackdrop extends StatelessWidget {
  const AquariumAmbientBackdrop({super.key, required this.controller});

  final OceanEyesController controller;

  @override
  Widget build(BuildContext context) {
    if (MediaQuery.maybeOf(context)?.disableAnimations == true) {
      return const ColoredBox(color: OceanColors.azureMist);
    }
    return Stack(
      fit: StackFit.expand,
      children: [
        const ColoredBox(color: OceanColors.azureMist),
        Positioned(
          left: -32,
          right: -32,
          top: OceanGeometry.heroHeight - 4,
          bottom: -32,
          child: ImageFiltered(
            imageFilter: ImageFilter.blur(
              sigmaX: controller.ambientBlur,
              sigmaY: controller.ambientBlur,
            ),
            child: Opacity(
              opacity: (controller.ambientOpacity * 0.10).clamp(0, 1),
              child: Transform.scale(
                scale: 1.05,
                alignment: Alignment.topCenter,
                child: AquariumStreamImage(
                  controller: controller,
                  fit: BoxFit.cover,
                  alignment: Alignment.bottomCenter,
                ),
              ),
            ),
          ),
        ),
        Positioned.fill(
          top: OceanGeometry.heroHeight,
          child: DecoratedBox(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [
                  OceanColors.white.withValues(alpha: 0.10),
                  OceanColors.azureMist.withValues(alpha: 0.82),
                  OceanColors.azureMist,
                ],
                stops: const [0, 0.38, 1],
              ),
            ),
          ),
        ),
      ],
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

    return ColorFiltered(
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
    final safeTop = MediaQuery.paddingOf(context).top;
    return SizedBox(
      height: OceanGeometry.heroHeight + OceanGeometry.heroBlendExtension,
      child: Stack(
        clipBehavior: Clip.none,
        fit: StackFit.expand,
        children: [
          ShaderMask(
            blendMode: BlendMode.dstIn,
            shaderCallback: (bounds) => const LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: [
                Colors.black,
                Colors.black,
                Color(0xB3000000),
                Color(0x33000000),
                Color(0x1A000000),
                Colors.transparent,
              ],
              stops: [0, 0.70, 0.76, 0.85, 0.94, 1],
            ).createShader(bounds),
            child: ColoredBox(
              color: OceanColors.prussianBlue,
              child: _isStreaming
                  ? AquariumStreamImage(
                      controller: controller,
                      fit: BoxFit.cover,
                      alignment: Alignment.center,
                    )
                  : const SizedBox.expand(),
            ),
          ),
          if (_isStreaming)
            const DecoratedBox(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.center,
                  colors: [Color(0x66000000), Colors.transparent],
                ),
              ),
            ),
          if (_isStreaming && controller.aiEnabled && controller.showDetections)
            const Positioned.fill(
              child: IgnorePointer(child: _DetectionBoxes()),
            ),
          if (controller.activeTab == PrimaryTab.analytics &&
              page == AppPage.primary)
            const Positioned.fill(child: HeatmapOverlay(visible: true)),
          if (controller.activeTab == PrimaryTab.myFish &&
              page == AppPage.primary &&
              controller.fish.isNotEmpty)
            Positioned.fill(child: _FishMotionOverlay(controller: controller)),
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
                        top: math.max(12, safeTop + 6),
                        left: 16,
                        child: Row(
                          children: [
                            _HeroPill(
                              semanticLabel: 'Camera is live',
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Container(
                                    width: 7,
                                    height: 7,
                                    decoration: const BoxDecoration(
                                      color: OceanColors.critical,
                                      shape: BoxShape.circle,
                                    ),
                                  ),
                                  const SizedBox(width: 5),
                                  const Text('Live'),
                                ],
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
                      )
                    else
                      Positioned.fill(
                        child: _CameraStateMessage(controller: controller),
                      ),
                    Positioned(
                      left: 16,
                      bottom: 16,
                      child: Semantics(
                        header: true,
                        child: Text(
                          _eyebrow,
                          style: const TextStyle(
                            fontFamily: 'Inter',
                            fontSize: 12,
                            height: 1.2,
                            fontWeight: FontWeight.w600,
                            letterSpacing: 1.32,
                            color: OceanColors.white,
                            shadows: [
                              Shadow(color: Color(0x73051E32), blurRadius: 8),
                            ],
                          ),
                        ),
                      ),
                    ),
                    if (page != AppPage.primary)
                      Positioned(
                        top: math.max(12, safeTop + 6),
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
                        top: math.max(12, safeTop + 6),
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
                        right: 12,
                        bottom: 6,
                        child: _CameraHeroControls(controller: controller),
                      ),
                  ],
                ),
              ),
            ),
          ),
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
    return Semantics(
      label: semanticLabel,
      button: onTap != null,
      child: GlassPill(
        onTap: onTap,
        foregroundColor: OceanColors.white,
        color: OceanColors.prussianBlue.withValues(alpha: 0.18),
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
        child: child,
      ),
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
    final (icon, title, detail) = switch (controller.cameraStage) {
      CameraStage.beforePermission => (
        LucideIcons.camera,
        'Camera access required',
        'Allow access to start monitoring automatically.',
      ),
      CameraStage.requestingPermission => (
        LucideIcons.loaderCircle,
        'Requesting camera access',
        'Check the system permission prompt.',
      ),
      CameraStage.denied => (
        LucideIcons.cameraOff,
        'Camera permission denied',
        'Open Account to retry or update system settings.',
      ),
      CameraStage.unavailable => (
        LucideIcons.wifiOff,
        'Camera unavailable',
        'No compatible camera was found.',
      ),
      _ => (
        LucideIcons.video,
        'Feed is idle',
        'Open Account to start aquarium monitoring.',
      ),
    };
    final isLoading =
        controller.cameraStage == CameraStage.requestingPermission;
    return Center(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(36, 38, 36, 42),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (isLoading)
              const SizedBox.square(
                dimension: 30,
                child: CircularProgressIndicator(
                  strokeWidth: 2.5,
                  color: OceanColors.white,
                ),
              )
            else
              Icon(icon, size: 30, color: OceanColors.white),
            const SizedBox(height: 9),
            Text(
              title,
              textAlign: TextAlign.center,
              style: OceanTypography.strong.copyWith(color: OceanColors.white),
            ),
            const SizedBox(height: 3),
            Text(
              detail,
              textAlign: TextAlign.center,
              style: OceanTypography.caption.copyWith(
                color: OceanColors.white.withValues(alpha: 0.72),
              ),
            ),
          ],
        ),
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
          icon: LucideIcons.switchCamera,
          tooltip: controller.usingFrontCamera
              ? 'Switch to tank camera'
              : 'Switch to device camera',
          active: controller.usingFrontCamera,
          onTap: busy ? null : controller.switchCamera,
        ),
        _HeroCircleButton(
          icon: LucideIcons.testTube2,
          tooltip: 'Measure water clarity',
          onTap: busy ? null : controller.measureTurbidity,
        ),
        _HeroCircleButton(
          icon: LucideIcons.sparkles,
          tooltip: controller.aiEnabled
              ? 'Stop AI analysis'
              : 'Start AI analysis',
          active: controller.aiEnabled,
          loading: controller.cameraStage == CameraStage.aiProcessing,
          onTap: busy ? null : () => controller.toggleAI(!controller.aiEnabled),
        ),
        const _HeroCircleButton(
          icon: LucideIcons.stethoscope,
          tooltip: 'Disease diagnosis is not yet available',
          onTap: null,
        ),
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
        child: SizedBox.square(
          dimension: 44,
          child: InkWell(
            onTap: onTap,
            customBorder: const CircleBorder(),
            child: Center(
              child: Container(
                width: 32,
                height: 32,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: OceanColors.prussianBlue.withValues(alpha: 0.18),
                  border: Border.all(
                    color: active
                        ? OceanColors.neonIce.withValues(alpha: 0.85)
                        : OceanColors.white.withValues(alpha: 0.30),
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: OceanColors.prussianBlue.withValues(alpha: 0.12),
                      blurRadius: 12,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: loading
                    ? const Padding(
                        padding: EdgeInsets.all(8),
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: OceanColors.white,
                        ),
                      )
                    : Icon(
                        icon,
                        size: 15,
                        color: onTap == null
                            ? OceanColors.white.withValues(alpha: 0.35)
                            : OceanColors.white,
                      ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _DetectionBoxes extends StatelessWidget {
  const _DetectionBoxes();

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: const [
        _DetectionBox(
          left: 0.12,
          top: 0.33,
          width: 0.15,
          height: 0.18,
          label: 'Cardinal Tetra 94%',
        ),
        _DetectionBox(
          left: 0.48,
          top: 0.44,
          width: 0.18,
          height: 0.20,
          label: 'Guppy 89%',
        ),
        _DetectionBox(
          left: 0.72,
          top: 0.25,
          width: 0.13,
          height: 0.17,
          label: 'Corydoras 82%',
        ),
      ],
    );
  }
}

class _DetectionBox extends StatelessWidget {
  const _DetectionBox({
    required this.left,
    required this.top,
    required this.width,
    required this.height,
    required this.label,
  });

  final double left;
  final double top;
  final double width;
  final double height;
  final String label;

  @override
  Widget build(BuildContext context) {
    final referenceWidth = math.min(
      MediaQuery.sizeOf(context).width,
      OceanGeometry.referenceWidth,
    );
    return Positioned(
      left: referenceWidth * left,
      top: OceanGeometry.heroHeight * top,
      width: referenceWidth * width,
      height: OceanGeometry.heroHeight * height,
      child: DecoratedBox(
        decoration: BoxDecoration(
          border: Border.all(color: OceanColors.neonIce, width: 1.5),
          boxShadow: [
            BoxShadow(
              color: OceanColors.neonIce.withValues(alpha: 0.22),
              blurRadius: 5,
            ),
          ],
        ),
        child: Align(
          alignment: Alignment.topLeft,
          child: Transform.translate(
            offset: const Offset(-1.5, -16),
            child: DecoratedBox(
              decoration: const BoxDecoration(color: OceanColors.neonIce),
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 3, vertical: 1),
                child: Text(
                  label,
                  maxLines: 1,
                  overflow: TextOverflow.clip,
                  style: const TextStyle(
                    fontFamily: 'Inter',
                    fontSize: 8,
                    height: 1.2,
                    color: OceanColors.prussianBlue,
                    fontWeight: FontWeight.w600,
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

class _FishMotionOverlay extends StatefulWidget {
  const _FishMotionOverlay({required this.controller});

  final OceanEyesController controller;

  @override
  State<_FishMotionOverlay> createState() => _FishMotionOverlayState();
}

class _FishMotionOverlayState extends State<_FishMotionOverlay>
    with SingleTickerProviderStateMixin {
  late final AnimationController _animation = AnimationController(
    vsync: this,
    duration: const Duration(seconds: 12),
  );

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (MediaQuery.of(context).disableAnimations) {
      _animation.stop();
      _animation.value = 0.42;
    } else if (!_animation.isAnimating) {
      _animation.repeat();
    }
  }

  @override
  void dispose() {
    _animation.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final swimmers = widget.controller.fish.take(4).toList(growable: false);
    return IgnorePointer(
      child: AnimatedBuilder(
        animation: _animation,
        builder: (context, _) => LayoutBuilder(
          builder: (context, constraints) => Stack(
            children: [
              for (var index = 0; index < swimmers.length; index += 1)
                Positioned(
                  left:
                      ((_animation.value + index * 0.27) % 1.15) *
                          (constraints.maxWidth + 70) -
                      70,
                  top:
                      52 +
                      index * 30 +
                      math.sin(_animation.value * math.pi * 2 + index) * 9,
                  child: Opacity(
                    opacity: 0.72,
                    child: Image.asset(
                      swimmers[index].assetPath,
                      width: 52 + index * 6,
                      height: 38 + index * 4,
                      fit: BoxFit.contain,
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
