import 'package:flutter/material.dart';

import '../../core/theme/oceaneyes_tokens.dart';
import '../../models/aquarium_models.dart';
import '../../view_models/oceaneyes_controller.dart';
import '../screens/account_screen.dart';
import '../screens/alerts_screen.dart';
import '../screens/analytics_screen.dart';
import '../screens/dashboard_screen.dart';
import '../screens/history_screen.dart';
import '../screens/my_fish_screen.dart';
import '../widgets/aquarium_hero.dart';
import '../widgets/ocean_status_bar.dart';

class OceanEyesShell extends StatefulWidget {
  const OceanEyesShell({
    super.key,
    required this.controller,
    required this.page,
  });

  final OceanEyesController controller;
  final AppPage page;

  @override
  State<OceanEyesShell> createState() => _OceanEyesShellState();
}

class _OceanEyesShellState extends State<OceanEyesShell> {
  late final ScrollController _scrollController = ScrollController();
  late int _lastScrollEpoch = widget.controller.scrollEpoch;

  @override
  void didUpdateWidget(covariant OceanEyesShell oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (_lastScrollEpoch != widget.controller.scrollEpoch) {
      _lastScrollEpoch = widget.controller.scrollEpoch;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted && _scrollController.hasClients) {
          _scrollController.jumpTo(0);
        }
      });
    }
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final bottomSafe = MediaQuery.paddingOf(context).bottom;
    final navigationClearance =
        OceanGeometry.navigationHeightFor(context) +
        (bottomSafe > OceanGeometry.navigationBottom
            ? bottomSafe
            : OceanGeometry.navigationBottom) +
        16;
    final home =
        widget.page == AppPage.primary &&
        widget.controller.activeTab == PrimaryTab.dashboard;
    final contentTopPadding =
        OceanGeometry.heroContentSpacer + (home ? 0.0 : -8.0);

    return Scaffold(
      backgroundColor: Colors.transparent,
      resizeToAvoidBottomInset: true,
      body: Semantics(
        scopesRoute: true,
        namesRoute: true,
        explicitChildNodes: true,
        label: _routeLabel,
        child: Stack(
          clipBehavior: Clip.none,
          children: [
            Positioned.fill(
              child: AquariumAmbientBackdrop(controller: widget.controller),
            ),
            Positioned(
              top: OceanGeometry.statusBarHeight,
              left: 0,
              right: 0,
              child: ExcludeFocus(
                excluding: widget.controller.fullscreenCamera,
                child: AquariumHero(
                  controller: widget.controller,
                  page: widget.page,
                ),
              ),
            ),
            Positioned(
              top: OceanGeometry.statusBarHeight,
              left: 0,
              right: 0,
              bottom: 0,
              child: ExcludeFocus(
                excluding: widget.controller.fullscreenCamera,
                child: ClipPath(
                  clipper: const _HeroContentClipper(),
                  clipBehavior: Clip.antiAlias,
                  child: SingleChildScrollView(
                    key: ValueKey(
                      'screen-scroll-${widget.page.name}-${widget.controller.activeTab.name}',
                    ),
                    controller: _scrollController,
                    keyboardDismissBehavior:
                        ScrollViewKeyboardDismissBehavior.onDrag,
                    physics: const BouncingScrollPhysics(
                      parent: AlwaysScrollableScrollPhysics(),
                    ),
                    padding: EdgeInsets.fromLTRB(
                      OceanGeometry.contentGutter,
                      contentTopPadding,
                      OceanGeometry.contentGutter,
                      navigationClearance,
                    ),
                    child: AnimatedSwitcher(
                      duration: OceanMotion.responsive(
                        context,
                        OceanMotion.smooth,
                      ),
                      switchInCurve: Curves.easeOut,
                      switchOutCurve: Curves.easeIn,
                      transitionBuilder: (child, animation) => FadeTransition(
                        opacity: animation,
                        child: SlideTransition(
                          position: Tween<Offset>(
                            begin: const Offset(0, 0.012),
                            end: Offset.zero,
                          ).animate(animation),
                          child: child,
                        ),
                      ),
                      child: KeyedSubtree(
                        key: ValueKey(
                          '${widget.page.name}-${widget.controller.activeTab.name}',
                        ),
                        child: _screen,
                      ),
                    ),
                  ),
                ),
              ),
            ),
            if (!widget.controller.fullscreenCamera)
              const Positioned(
                top: 0,
                left: 0,
                right: 0,
                child: OceanStatusBar(),
              ),
            if (widget.controller.fullscreenCamera)
              FullscreenCameraOverlay(controller: widget.controller),
          ],
        ),
      ),
    );
  }

  Widget get _screen {
    return switch (widget.page) {
      AppPage.alerts => AlertsScreen(controller: widget.controller),
      AppPage.alertDetail =>
        widget.controller.selectedAlert == null
            ? AlertsScreen(controller: widget.controller)
            : AlertDetailScreen(
                controller: widget.controller,
                alert: widget.controller.selectedAlert!,
              ),
      AppPage.history => HistoryScreen(controller: widget.controller),
      AppPage.primary => switch (widget.controller.activeTab) {
        PrimaryTab.dashboard => DashboardScreen(controller: widget.controller),
        PrimaryTab.myFish => MyFishScreen(controller: widget.controller),
        PrimaryTab.analytics => AnalyticsScreen(controller: widget.controller),
        PrimaryTab.account => AccountScreen(controller: widget.controller),
      },
    };
  }

  String get _routeLabel {
    return switch (widget.page) {
      AppPage.alerts => 'Alerts',
      AppPage.alertDetail => 'Alert diagnostics',
      AppPage.history => 'Water clarity history',
      AppPage.primary => switch (widget.controller.activeTab) {
        PrimaryTab.dashboard => 'Dashboard',
        PrimaryTab.myFish => 'My Fish',
        PrimaryTab.analytics => 'Analytics',
        PrimaryTab.account => 'Account and aquarium controls',
      },
    };
  }
}

class _HeroContentClipper extends CustomClipper<Path> {
  const _HeroContentClipper();

  @override
  Path getClip(Size size) {
    final clippedRegion = Rect.fromLTRB(
      OceanGeometry.contentGutter,
      OceanGeometry.heroContentClipStart,
      size.width - OceanGeometry.contentGutter,
      size.height,
    );
    return Path()..addRRect(
      RRect.fromRectAndCorners(
        clippedRegion,
        topLeft: const Radius.circular(OceanRadii.card),
        topRight: const Radius.circular(OceanRadii.card),
      ),
    );
  }

  @override
  bool shouldReclip(covariant _HeroContentClipper oldClipper) => false;
}
