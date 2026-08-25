import 'dart:math' as math;
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:intl/intl.dart';
import 'package:livekit_client/livekit_client.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../core/theme/oceaneyes_tokens.dart';
import '../../integrations/ml/onnx_fish_inference.dart';
import '../../models/aquarium_models.dart';
import '../../models/classifiable_species.dart';
import '../../models/fish_motion_scene.dart';
import '../../models/production_data.dart';
import '../../view_models/oceaneyes_controller.dart';
import 'data_visuals.dart';

class AquariumAmbientBackdrop extends StatelessWidget {
  const AquariumAmbientBackdrop({super.key, required this.controller});

  final OceanEyesController controller;

  @override
  Widget build(BuildContext context) {
    final grey = controller.ambientBaseGrey.round().clamp(0, 255);
    final canvasColor = grey == 255
        ? OceanColors.azureMist
        : Color.fromARGB(255, grey, grey, grey);
    final fadeStart = (controller.ambientFadeStart / 100).clamp(0.0, 0.80);
    final fadeEnd = (controller.ambientFadeEnd / 100).clamp(
      fadeStart + 0.05,
      1.0,
    );
    final reducedMotion =
        MediaQuery.maybeOf(context)?.disableAnimations == true;
    final streaming = switch (controller.cameraStage) {
      CameraStage.active ||
      CameraStage.aiProcessing ||
      CameraStage.measuringTurbidity => true,
      _ => false,
    };
    final hasPlatformVideo =
        controller.remoteVideoTrack is VideoTrack ||
        controller.localVideoTrack is VideoTrack ||
        controller.cameraPreview != null;
    return Stack(
      fit: StackFit.expand,
      children: [
        ColoredBox(color: canvasColor),
        Positioned(
          top: OceanGeometry.heroHeight - 4,
          left: 0,
          right: 0,
          bottom: 0,
          child: LayoutBuilder(
            builder: (context, constraints) => Stack(
              clipBehavior: Clip.none,
              fit: StackFit.expand,
              children: [
                if (streaming && !reducedMotion && !hasPlatformVideo)
                  Positioned(
                    left: -32,
                    top: -32,
                    right: -32,
                    bottom: -32,
                    child: ShaderMask(
                      blendMode: BlendMode.dstIn,
                      shaderCallback: (bounds) => LinearGradient(
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                        colors: const [
                          Colors.white,
                          Colors.white,
                          Colors.transparent,
                        ],
                        stops: [0, fadeStart, fadeEnd],
                      ).createShader(bounds),
                      child: ImageFiltered(
                        imageFilter: ui.ImageFilter.blur(
                          sigmaX: controller.ambientBlur,
                          sigmaY: controller.ambientBlur,
                        ),
                        child: Opacity(
                          opacity: (controller.ambientOpacity * 0.10).clamp(
                            0,
                            1,
                          ),
                          child: Transform.scale(
                            scale: 1.05,
                            child: FittedBox(
                              fit: BoxFit.fill,
                              child: _AmbientBottomSample(
                                controller: controller,
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                DecoratedBox(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                      colors: [
                        Colors.transparent,
                        OceanColors.white.withValues(alpha: 0.10),
                        OceanColors.white.withValues(alpha: 0.12),
                        OceanColors.white.withValues(alpha: 0.08),
                      ],
                      stops: [
                        0,
                        (40 / constraints.maxHeight).clamp(0.0, 0.44),
                        0.44,
                        1,
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class _AmbientBottomSample extends StatelessWidget {
  const _AmbientBottomSample({required this.controller});

  final OceanEyesController controller;

  @override
  Widget build(BuildContext context) {
    const sourceWidth = 64.0;
    const sourceHeight = 36.0;
    const cropHeight = sourceHeight * 0.15;
    return SizedBox(
      width: sourceWidth,
      height: cropHeight,
      child: ClipRect(
        child: OverflowBox(
          alignment: Alignment.bottomCenter,
          minWidth: sourceWidth,
          maxWidth: sourceWidth,
          minHeight: sourceHeight,
          maxHeight: sourceHeight,
          child: SizedBox(
            width: sourceWidth,
            height: sourceHeight,
            child: AquariumStreamImage(
              controller: controller,
              fit: BoxFit.fill,
            ),
          ),
        ),
      ),
    );
  }
}

/// Applies the same stream adjustments in the hero and fullscreen view.
class AquariumStreamImage extends StatelessWidget {
  const AquariumStreamImage({
    super.key,
    required this.controller,
    this.fit = BoxFit.cover,
    this.alignment = Alignment.center,
    this.applyAdjustments = true,
  });

  final OceanEyesController controller;
  final BoxFit fit;
  final AlignmentGeometry alignment;
  final bool applyAdjustments;

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

    final remoteTrack = controller.remoteVideoTrack;
    final localTrack = controller.localVideoTrack;
    final cameraPreview = controller.cameraPreview;
    final capturedFrame = controller.latestCameraFrameBytes;
    final Widget streamImage;
    if (remoteTrack is VideoTrack) {
      streamImage = VideoTrackRenderer(
        remoteTrack,
        fit: fit == BoxFit.contain ? VideoViewFit.contain : VideoViewFit.cover,
      );
    } else if (localTrack is VideoTrack) {
      streamImage = VideoTrackRenderer(
        localTrack,
        fit: fit == BoxFit.contain ? VideoViewFit.contain : VideoViewFit.cover,
      );
    } else if (cameraPreview != null) {
      streamImage = cameraPreview;
    } else if (capturedFrame != null) {
      streamImage = Image.memory(
        capturedFrame,
        fit: fit,
        alignment: alignment,
        gaplessPlayback: true,
      );
    } else if (controller.localPreviewEnabled) {
      streamImage = Image.asset(
        'assets/images/aquarium_hero.png',
        fit: fit,
        alignment: alignment,
      );
    } else {
      streamImage = const _ProductionUnavailableFeed();
    }

    // Texture/HTML video surfaces must stay out of post-processing layers.
    if (!applyAdjustments) return streamImage;

    Widget image = ColorFiltered(
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
      child: streamImage,
    );

    if (controller.temperature != 0) {
      final color = controller.temperature > 0
          ? const Color(0xFFFFB000)
          : const Color(0xFF00A0FF);
      image = ColorFiltered(
        colorFilter: ColorFilter.mode(
          color.withValues(
            alpha: (controller.temperature.abs() / 300).clamp(0, 1),
          ),
          BlendMode.color,
        ),
        child: image,
      );
    }
    if (controller.tint != 0) {
      final color = controller.tint > 0
          ? const Color(0xFFFF00BB)
          : const Color(0xFF00FF44);
      image = ColorFiltered(
        colorFilter: ColorFilter.mode(
          color.withValues(alpha: (controller.tint.abs() / 400).clamp(0, 1)),
          BlendMode.color,
        ),
        child: image,
      );
    }
    return image;
  }
}

class _ProductionUnavailableFeed extends StatelessWidget {
  const _ProductionUnavailableFeed();

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: 'Live feed unavailable',
      container: true,
      child: LayoutBuilder(
        builder: (context, constraints) {
          final compact =
              constraints.maxWidth < 180 || constraints.maxHeight < 120;
          return ColoredBox(
            key: const ValueKey('production-live-feed-unavailable'),
            color: OceanColors.prussianBlue,
            child: Center(
              child: compact
                  ? const Icon(
                      Icons.videocam_off_outlined,
                      color: OceanColors.pearlAqua,
                      size: 24,
                    )
                  : Padding(
                      padding: const EdgeInsets.all(OceanSpacing.lg),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(
                            Icons.videocam_off_outlined,
                            color: OceanColors.pearlAqua,
                            size: 32,
                          ),
                          const SizedBox(height: OceanSpacing.sm),
                          Text(
                            'Live feed unavailable',
                            textAlign: TextAlign.center,
                            style: OceanTypography.strong.copyWith(
                              color: OceanColors.white,
                            ),
                          ),
                          const SizedBox(height: OceanSpacing.xs),
                          Text(
                            'Connect a monitor or retry the camera connection.',
                            textAlign: TextAlign.center,
                            style: OceanTypography.caption.copyWith(
                              color: OceanColors.pearlAqua,
                            ),
                          ),
                        ],
                      ),
                    ),
            ),
          );
        },
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

  /// Camera and WebRTC previews are platform-backed surfaces. They cannot be
  /// reliably rendered through the hero's destination-in mask, so keep those
  /// surfaces in the normal compositing path.
  bool get _hasPlatformVideo =>
      _isStreaming &&
      (controller.remoteVideoTrack is VideoTrack ||
          controller.localVideoTrack is VideoTrack ||
          controller.cameraPreview != null);

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
    final fadeStart = (controller.heroFadeStart / 100).clamp(0.0, 0.80);
    final fadeStops = <double>[
      0,
      fadeStart,
      fadeStart + (1 - fadeStart) * 0.20,
      fadeStart + (1 - fadeStart) * 0.50,
      fadeStart + (1 - fadeStart) * 0.80,
      1,
    ];
    return SizedBox(
      height: OceanGeometry.heroHeight + OceanGeometry.heroBlendExtension,
      child: Stack(
        clipBehavior: Clip.none,
        fit: StackFit.expand,
        children: [
          if (_hasPlatformVideo)
            Stack(
              fit: StackFit.expand,
              children: [
                ColoredBox(
                  color: OceanColors.prussianBlue,
                  child: _isStreaming
                      ? AquariumStreamImage(
                          controller: controller,
                          fit: BoxFit.cover,
                          alignment: Alignment.center,
                          applyAdjustments: false,
                        )
                      : const SizedBox.expand(),
                ),
                _HeroPlatformVideoFade(controller: controller),
              ],
            )
          else
            ShaderMask(
              blendMode: BlendMode.dstIn,
              shaderCallback: (bounds) => LinearGradient(
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
                stops: fadeStops,
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
                  colors: [Color(0x33000000), Colors.transparent],
                ),
              ),
            ),
          if (_isStreaming &&
              controller.aiEnabled &&
              controller.showDetections &&
              controller.fishDetections.isNotEmpty &&
              controller.heatmapSourceDimensions.isValid &&
              page == AppPage.primary &&
              controller.activeTab == PrimaryTab.account)
            Positioned.fill(
              child: IgnorePointer(
                child: _DetectionBoxes(
                  detections: controller.fishDetections,
                  sourceDimensions: controller.heatmapSourceDimensions,
                ),
              ),
            ),
          if (controller.activeTab == PrimaryTab.analytics &&
              page == AppPage.primary)
            const Positioned.fill(child: HeatmapOverlay(visible: true)),
          if (controller.activeTab == PrimaryTab.myFish &&
              page == AppPage.primary &&
              controller.fish.isNotEmpty)
            Positioned.fill(
              child: ShaderMask(
                blendMode: BlendMode.dstIn,
                shaderCallback: (bounds) => LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: const [
                    Colors.black,
                    Colors.black,
                    Color(0xB3000000),
                    Color(0x33000000),
                    Color(0x1A000000),
                    Colors.transparent,
                  ],
                  stops: fadeStops,
                ).createShader(bounds),
                child: _FishMotionOverlay(controller: controller),
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
                            LiveRoleChip(role: controller.liveRole),
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
                              Shadow(
                                color: Color(0x40051E32),
                                offset: Offset(0, 1),
                                blurRadius: 2,
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

class _HeroPlatformVideoFade extends StatelessWidget {
  const _HeroPlatformVideoFade({required this.controller});

  final OceanEyesController controller;

  @override
  Widget build(BuildContext context) {
    final fadeStart = (controller.heroFadeStart / 100).clamp(0.0, 0.80);
    final grey = controller.ambientBaseGrey.round().clamp(0, 255);
    final background = grey == 255
        ? OceanColors.azureMist
        : Color.fromARGB(255, grey, grey, grey);
    final stops = <double>[
      0,
      fadeStart,
      fadeStart + (1 - fadeStart) * 0.20,
      fadeStart + (1 - fadeStart) * 0.50,
      fadeStart + (1 - fadeStart) * 0.80,
      1,
    ];
    return IgnorePointer(
      child: DecoratedBox(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [
              Colors.transparent,
              Colors.transparent,
              background.withValues(alpha: 0.25),
              background.withValues(alpha: 0.60),
              background.withValues(alpha: 0.84),
              background,
            ],
            stops: stops,
          ),
        ),
      ),
    );
  }
}

class LiveRoleChip extends StatelessWidget {
  const LiveRoleChip({super.key, required this.role});

  final ProductionLiveRole role;

  IconData get _icon => switch (role) {
    ProductionLiveRole.monitor => LucideIcons.smartphone,
    ProductionLiveRole.viewer => LucideIcons.eye,
  };

  String get _semanticLabel => switch (role) {
    ProductionLiveRole.monitor => 'Live Monitor side',
    ProductionLiveRole.viewer => 'Live Viewer side',
  };

  @override
  Widget build(BuildContext context) {
    return _HeroPill(
      semanticLabel: _semanticLabel,
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(_icon, size: 13),
          const SizedBox(width: 4),
          const Text('Live'),
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
    this.active = false,
    this.circle = false,
    this.includeSemantics = true,
  });

  final Widget child;
  final String semanticLabel;
  final VoidCallback? onTap;
  final bool active;
  final bool circle;
  final bool includeSemantics;

  @override
  Widget build(BuildContext context) {
    final radius = BorderRadius.circular(circle ? 16 : OceanRadii.pill);
    Widget pill = DecoratedBox(
      decoration: BoxDecoration(
        borderRadius: radius,
        boxShadow: [
          BoxShadow(
            color: OceanColors.prussianBlue.withValues(alpha: 0.05),
            blurRadius: 20,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: radius,
        child: BackdropFilter(
          filter: ui.ImageFilter.blur(sigmaX: 6, sigmaY: 6),
          child: Stack(
            children: [
              Container(
                constraints: circle
                    ? const BoxConstraints.tightFor(width: 32, height: 32)
                    : const BoxConstraints(minHeight: 32),
                padding: circle
                    ? EdgeInsets.zero
                    : const EdgeInsets.symmetric(horizontal: 8),
                alignment: Alignment.center,
                color: active
                    ? OceanColors.turquoise.withValues(alpha: 0.06)
                    : null,
                child: DefaultTextStyle(
                  style: const TextStyle(
                    fontFamily: 'Inter',
                    fontSize: 12,
                    height: 1.35,
                    fontWeight: FontWeight.w400,
                    letterSpacing: -0.12,
                    color: OceanColors.white,
                    decoration: TextDecoration.none,
                  ),
                  child: IconTheme(
                    data: const IconThemeData(
                      color: OceanColors.white,
                      size: 13,
                    ),
                    child: child,
                  ),
                ),
              ),
              const Positioned.fill(
                child: IgnorePointer(child: _HeroInsetHighlights()),
              ),
            ],
          ),
        ),
      ),
    );
    if (onTap != null) {
      pill = Material(
        color: Colors.transparent,
        borderRadius: radius,
        child: InkWell(
          onTap: onTap,
          borderRadius: radius,
          overlayColor: WidgetStateProperty.resolveWith((states) {
            if (states.contains(WidgetState.hovered)) {
              return OceanColors.verdigris.withValues(alpha: 0.06);
            }
            return Colors.transparent;
          }),
          child: pill,
        ),
      );
    }
    if (!includeSemantics) return pill;
    return Semantics(
      container: true,
      excludeSemantics: true,
      label: semanticLabel,
      button: onTap != null,
      child: pill,
    );
  }
}

class _HeroInsetHighlights extends StatelessWidget {
  const _HeroInsetHighlights();

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
    final connect = controller.cameraStage == CameraStage.requestingPermission
        ? null
        : controller.connectStream;
    final isLoading =
        controller.cameraStage == CameraStage.requestingPermission;
    return Center(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(36, 32, 36, 38),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (isLoading)
              const SizedBox.square(
                dimension: 24,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  color: OceanColors.slateGrey,
                ),
              )
            else
              const Icon(
                LucideIcons.video,
                size: 24,
                color: OceanColors.slateGrey,
              ),
            const SizedBox(height: 8),
            Text(
              'Feed is idle. Connect stream to monitor.',
              textAlign: TextAlign.center,
              style: OceanTypography.caption,
            ),
            const SizedBox(height: 8),
            Semantics(
              button: true,
              enabled: connect != null,
              label: 'Connect Stream',
              child: Material(
                color: OceanColors.action,
                borderRadius: BorderRadius.circular(24),
                child: InkWell(
                  onTap: connect,
                  borderRadius: BorderRadius.circular(24),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 8,
                    ),
                    child: Text(
                      isLoading ? 'Connecting…' : 'Connect Stream',
                      style: OceanTypography.caption.copyWith(
                        color: OceanColors.white,
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
          child: Text(
            controller.selectedSpecies == 'All species'
                ? 'All Species'
                : controller.selectedSpecies,
            overflow: TextOverflow.ellipsis,
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
        child: SizedBox(
          width: 32,
          height: 44,
          child: InkWell(
            onTap: onTap,
            customBorder: const CircleBorder(),
            child: Center(
              child: _HeroPill(
                semanticLabel: tooltip,
                active: active,
                circle: true,
                includeSemantics: false,
                child: loading
                    ? const SizedBox.square(
                        dimension: 16,
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
  const _DetectionBoxes({
    required this.detections,
    required this.sourceDimensions,
  });

  final List<FishDetection> detections;
  final DetectionFrameDimensions sourceDimensions;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final imageRect = calculateHeatmapObjectCoverRect(
          sourceWidth: sourceDimensions.width.toDouble(),
          sourceHeight: sourceDimensions.height.toDouble(),
          containerWidth: constraints.maxWidth,
          containerHeight: constraints.maxHeight,
        );
        if (imageRect == Rect.zero) return const SizedBox.shrink();

        return Stack(
          clipBehavior: Clip.none,
          children: [
            for (final detection in detections)
              _DetectionBox(
                detection: detection,
                rect: Rect.fromLTRB(
                  imageRect.left + detection.box.left * imageRect.width,
                  imageRect.top + detection.box.top * imageRect.height,
                  imageRect.left + detection.box.right * imageRect.width,
                  imageRect.top + detection.box.bottom * imageRect.height,
                ),
              ),
          ],
        );
      },
    );
  }
}

class _DetectionBox extends StatelessWidget {
  const _DetectionBox({required this.detection, required this.rect});

  final FishDetection detection;
  final Rect rect;

  @override
  Widget build(BuildContext context) {
    final speciesId = detection.speciesId;
    final boxWidth = rect.width;
    final fontSize = (boxWidth * 0.12).clamp(10.0, 22.0).toDouble();
    final boxColor = speciesId == null || speciesId.trim().isEmpty
        ? OceanColors.neonIce
        : SpeciesDonut.colorForSpeciesId(
            ClassifiableSpeciesCatalog.resolveId(speciesId),
          );
    final label = _detectionLabel(detection);

    return Positioned.fromRect(
      rect: rect,
      child: DecoratedBox(
        decoration: BoxDecoration(
          border: Border.all(color: boxColor, width: 1),
        ),
        child: Stack(
          clipBehavior: Clip.none,
          children: [
            Positioned(
              left: 2,
              top: -(fontSize + 4),
              child: Text(
                label,
                maxLines: 1,
                softWrap: false,
                overflow: TextOverflow.visible,
                style: TextStyle(
                  fontFamily: 'Inter',
                  fontSize: fontSize,
                  height: 1.2,
                  color: boxColor.withValues(alpha: 0.85),
                  fontWeight: FontWeight.w400,
                  shadows: const [
                    Shadow(
                      color: Color(0x99000000),
                      offset: Offset(0, 1),
                      blurRadius: 2,
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

String _detectionLabel(FishDetection detection) {
  final speciesId = detection.speciesId;
  final name = speciesId == null || speciesId.trim().isEmpty
      ? 'Fish'
      : _speciesDisplayName(ClassifiableSpeciesCatalog.resolveId(speciesId));
  final confidence =
      detection.classificationConfidence ?? detection.detectionConfidence;
  if (!confidence.isFinite) return name;
  return '$name ${(confidence.clamp(0.0, 1.0) * 100).round()}%';
}

String _speciesDisplayName(String speciesId) {
  for (final species in ClassifiableSpeciesCatalog.options) {
    if (species.id == speciesId) return species.name;
  }
  return speciesId
      .split('_')
      .where((word) => word.isNotEmpty)
      .map(
        (word) => '${word.substring(0, 1).toUpperCase()}${word.substring(1)}',
      )
      .join(' ');
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
    duration: const Duration(hours: 1),
  );
  late FishMotionScene _scene = FishMotionSceneBuilder.build(
    widget.controller.fish,
  );
  final Map<String, ui.Image> _images = {};
  final Set<String> _failedPaths = {};
  final Set<String> _requestedPaths = {};
  bool _reducedMotion = false;

  @override
  void initState() {
    super.initState();
    _loadSceneImages();
  }

  @override
  void didUpdateWidget(covariant _FishMotionOverlay oldWidget) {
    super.didUpdateWidget(oldWidget);
    _scene = FishMotionSceneBuilder.build(widget.controller.fish);
    _loadSceneImages();
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _reducedMotion = MediaQuery.of(context).disableAnimations;
    if (_reducedMotion) {
      _animation.stop();
      _animation.value = 0;
    } else if (!_animation.isAnimating) {
      _animation.repeat();
    }
  }

  Future<void> _loadSceneImages() async {
    final paths = _scene.swimmers
        .map((sprite) => sprite.imagePath)
        .toSet()
        .where(
          (path) =>
              !_images.containsKey(path) &&
              !_failedPaths.contains(path) &&
              _requestedPaths.add(path),
        )
        .toList(growable: false);
    if (paths.isEmpty) return;

    final loaded = await Future.wait(
      paths.map((path) async => (path, await _loadFishMotionImage(path))),
    );
    if (!mounted) return;
    setState(() {
      for (final (path, image) in loaded) {
        if (image == null) {
          _failedPaths.add(path);
        } else {
          _images[path] = image;
        }
      }
    });
  }

  @override
  void dispose() {
    _animation.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_scene.swimmers.isEmpty && _scene.unsupportedCount == 0) {
      return const SizedBox.shrink();
    }
    final failedFishCount = _scene.swimmers
        .where((sprite) => _failedPaths.contains(sprite.imagePath))
        .length;
    final awaitingArtCount = _scene.unsupportedCount + failedFishCount;

    return ExcludeSemantics(
      child: IgnorePointer(
        child: Stack(
          fit: StackFit.expand,
          clipBehavior: Clip.hardEdge,
          children: [
            DecoratedBox(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    OceanColors.turquoise.withValues(alpha: 0.035),
                    Colors.transparent,
                    OceanColors.prussianBlue.withValues(alpha: 0.10),
                  ],
                  stops: const [0, 0.5, 1],
                ),
              ),
            ),
            if (_scene.swimmers.isNotEmpty)
              RepaintBoundary(
                child: CustomPaint(
                  painter: _FishMotionPainter(
                    scene: _scene,
                    images: _images,
                    animation: _animation,
                    reducedMotion: _reducedMotion,
                  ),
                  isComplex: true,
                  willChange: !_reducedMotion,
                ),
              ),
            if (awaitingArtCount > 0)
              Positioned(
                right: 16,
                bottom: 12,
                child: _AwaitingArtPill(count: awaitingArtCount),
              ),
          ],
        ),
      ),
    );
  }
}

final Map<String, Future<ui.Image?>> _fishMotionImageCache = {};

Future<ui.Image?> _loadFishMotionImage(String assetPath) =>
    _fishMotionImageCache.putIfAbsent(assetPath, () async {
      try {
        final data = await rootBundle.load(assetPath);
        final bytes = data.buffer.asUint8List(
          data.offsetInBytes,
          data.lengthInBytes,
        );
        final codec = await ui.instantiateImageCodec(bytes);
        try {
          return (await codec.getNextFrame()).image;
        } finally {
          codec.dispose();
        }
      } catch (_) {
        return null;
      }
    });

class _AwaitingArtPill extends StatelessWidget {
  const _AwaitingArtPill({required this.count});

  final int count;

  @override
  Widget build(BuildContext context) {
    final radius = BorderRadius.circular(OceanRadii.pill);
    return ClipRRect(
      borderRadius: radius,
      child: BackdropFilter(
        filter: ui.ImageFilter.blur(sigmaX: 6, sigmaY: 6),
        child: Stack(
          children: [
            Container(
              constraints: const BoxConstraints(minHeight: 28),
              padding: const EdgeInsets.symmetric(horizontal: 8),
              alignment: Alignment.center,
              child: Text(
                '$count awaiting art',
                style: const TextStyle(
                  fontFamily: 'Inter',
                  fontSize: 10,
                  height: 1.35,
                  fontWeight: FontWeight.w400,
                  letterSpacing: -0.10,
                  color: OceanColors.white,
                  decoration: TextDecoration.none,
                ),
              ),
            ),
            const Positioned.fill(
              child: IgnorePointer(child: _HeroInsetHighlights()),
            ),
          ],
        ),
      ),
    );
  }
}

class _FishMotionPainter extends CustomPainter {
  _FishMotionPainter({
    required this.scene,
    required this.images,
    required this.animation,
    required this.reducedMotion,
  }) : super(repaint: reducedMotion ? null : animation);

  final FishMotionScene scene;
  final Map<String, ui.Image> images;
  final AnimationController animation;
  final bool reducedMotion;

  @override
  void paint(Canvas canvas, Size size) {
    if (size.isEmpty) return;
    final rawElapsedSeconds = reducedMotion ? 0.0 : animation.value * 3600;
    final elapsedSeconds = reducedMotion
        ? 0.0
        : (rawElapsedSeconds * fishMotionFps).floor() / fishMotionFps;
    final frame = reducedMotion
        ? fishMotionStillFrame
        : FishMotionMath.wrapFrame(
            fishMotionStillFrame +
                elapsedSeconds * fishMotionFps * fishMotionPlaybackRate,
          );
    final viewport = FishMotionViewport(width: size.width, height: size.height);
    final orderedSwimmers = [...scene.swimmers]
      ..sort((first, second) => first.depth.compareTo(second.depth));

    canvas.save();
    canvas.clipRect(Offset.zero & size);
    for (final sprite in orderedSwimmers) {
      final image = images[sprite.imagePath];
      if (image == null) continue;
      _drawFish(canvas, image, sprite, viewport, elapsedSeconds, frame);
    }
    canvas.restore();
  }

  void _drawFish(
    Canvas canvas,
    ui.Image image,
    FishMotionSprite sprite,
    FishMotionViewport viewport,
    double elapsedSeconds,
    double frame,
  ) {
    const driftStrength = 0.57;
    const depthStrength = 0.08;
    final dimensions = FishMotionMath.calculateBodyDimensions(
      viewport,
      sprite.lengthCm,
    );
    final bodySpan = dimensions.width;
    final baseHeight = dimensions.height;
    final slices = (bodySpan * 0.5).clamp(24.0, 40.0).round();
    final stripSourceWidth = image.width / slices;
    final pixelsPerUnit = bodySpan / 30;
    final phaseFrame = frame + sprite.bodyPhase * 20;
    final pose = FishMotionMath.calculateSwimPose(
      sprite,
      elapsedSeconds,
      viewport,
      bodySpan,
      baseHeight,
    );
    final edgeAlpha = FishMotionMath.calculateEdgeAlpha(
      pose.x,
      viewport.width,
      bodySpan / 2,
    );
    if (edgeAlpha <= 0) return;

    final points = <FishMotionPoint>[];
    for (var index = 0; index < slices; index += 1) {
      final unit = (index + 0.5) / slices;
      final originalX =
          (FishMotionMath.meshMinX +
              (FishMotionMath.meshMaxX - FishMotionMath.meshMinX) * unit) *
          FishMotionMath.scaleX;
      points.add(FishMotionMath.calculateMotionPoint(originalX, phaseFrame));
    }
    final anchor = FishMotionMath.calculateMotionPoint(
      FishMotionMath.rotationCenterX,
      phaseFrame,
    );
    final driftX =
        (anchor.x - FishMotionMath.rotationCenterX) *
        pixelsPerUnit *
        driftStrength;
    final driftY = -anchor.y * pixelsPerUnit * driftStrength;
    final alpha = edgeAlpha * (0.86 + sprite.depth * 0.14);
    final paint = Paint()
      ..filterQuality = FilterQuality.high
      ..color = OceanColors.white.withValues(alpha: alpha);

    canvas.save();
    canvas.translate(pose.x + driftX, pose.y + driftY);
    canvas.rotate(pose.pitch);
    canvas.scale(pose.facingScale.toDouble(), 1);
    for (var index = 0; index < slices; index += 1) {
      final point = points[index];
      final screenX =
          (point.x - anchor.x) * pixelsPerUnit +
          (index / slices - 0.5) * bodySpan;
      final screenY = -(point.y - anchor.y) * pixelsPerUnit;
      final depthScale = 1 + point.depth * depthStrength;
      final sourceX = index * stripSourceWidth;
      final drawWidth = math.max(1.0, bodySpan / slices);

      canvas.save();
      canvas.translate(screenX, screenY);
      canvas.scale(depthScale, depthScale);
      canvas.drawImageRect(
        image,
        Rect.fromLTWH(
          sourceX,
          0,
          stripSourceWidth + 1,
          image.height.toDouble(),
        ),
        Rect.fromLTWH(
          -drawWidth / 2,
          -baseHeight / 2,
          drawWidth + 1,
          baseHeight,
        ),
        paint,
      );
      canvas.restore();
    }
    canvas.restore();
  }

  @override
  bool shouldRepaint(covariant _FishMotionPainter oldDelegate) => true;
}
