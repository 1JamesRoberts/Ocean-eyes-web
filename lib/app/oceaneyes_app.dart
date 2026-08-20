import 'dart:async';

import 'package:flutter/material.dart';

import '../core/theme/oceaneyes_theme.dart';
import '../core/theme/oceaneyes_tokens.dart';
import '../models/aquarium_models.dart';
import '../ui/screens/account_screen.dart';
import '../ui/screens/login_screen.dart';
import '../ui/shell/oceaneyes_shell.dart';
import '../view_models/oceaneyes_controller.dart';

class OceanEyesApp extends StatefulWidget {
  const OceanEyesApp({
    super.key,
    this.controller,
    this.disposeController = false,
  });

  final OceanEyesController? controller;
  final bool disposeController;

  @override
  State<OceanEyesApp> createState() => _OceanEyesAppState();
}

class _OceanEyesAppState extends State<OceanEyesApp>
    with SingleTickerProviderStateMixin, WidgetsBindingObserver {
  late final OceanEyesController _controller =
      widget.controller ?? OceanEyesController();
  late final bool _ownsController =
      widget.controller == null || widget.disposeController;
  late bool _showLogin = !_controller.isAuthenticated;
  bool _loginExiting = false;
  Timer? _loginExitTimer;
  late final AnimationController _dashboardEntrance;
  late final CurvedAnimation _dashboardOpacity;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _dashboardEntrance = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 250),
      value: _controller.isAuthenticated ? 1 : 0,
    );
    _dashboardOpacity = CurvedAnimation(
      parent: _dashboardEntrance,
      curve: Curves.easeOut,
    );
    _controller.addListener(_handleAuthentication);
  }

  void _handleAuthentication() {
    if (!_controller.isAuthenticated || !_showLogin || _loginExiting) return;
    _dashboardEntrance.forward(from: 0);
    setState(() => _loginExiting = true);
    _loginExitTimer?.cancel();
    _loginExitTimer = Timer(const Duration(milliseconds: 250), () {
      if (!mounted) return;
      setState(() => _showLogin = false);
    });
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _loginExitTimer?.cancel();
    _dashboardOpacity.dispose();
    _dashboardEntrance.dispose();
    _controller.removeListener(_handleAuthentication);
    if (_ownsController) _controller.dispose();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    _controller.handleAppLifecycleState(state);
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'OceanEyes',
      debugShowCheckedModeBanner: false,
      theme: OceanEyesTheme.light,
      themeMode: ThemeMode.light,
      builder: (context, child) => AnimatedBuilder(
        animation: _controller,
        builder: (context, _) => Material(
          color: OceanColors.prussianBlue,
          child: Stack(
            fit: StackFit.expand,
            children: [
              Center(
                child: ConstrainedBox(
                  constraints: const BoxConstraints(
                    maxWidth: OceanGeometry.referenceWidth,
                  ),
                  child: child ?? const SizedBox.shrink(),
                ),
              ),
              if (_controller.fullscreenCamera)
                FullscreenCameraOverlay(controller: _controller),
            ],
          ),
        ),
      ),
      home: AnimatedBuilder(
        animation: _controller,
        builder: (context, _) {
          final handlesBack =
              _controller.fullscreenCamera ||
              _controller.secondaryRoute != null;
          return Stack(
            fit: StackFit.expand,
            children: [
              if (_controller.isAuthenticated)
                FadeTransition(
                  opacity: _dashboardOpacity,
                  child: PopScope<Object?>(
                    canPop: !handlesBack,
                    onPopInvokedWithResult: (didPop, _) {
                      if (didPop || !handlesBack) return;
                      if (_controller.fullscreenCamera) {
                        if (_controller.inventoryDrawerOpen) {
                          _controller.toggleInventoryDrawer();
                        } else {
                          _controller.setFullscreenCamera(false);
                        }
                      } else if (_controller.selectedAlertId != null) {
                        _controller.popAlertDetail();
                      } else {
                        _controller.closeSecondaryRoute();
                      }
                    },
                    child: Navigator(
                      pages: _pages,
                      onDidRemovePage: _didRemovePage,
                    ),
                  ),
                ),
              if (_showLogin)
                Positioned.fill(
                  child: LoginScreen(
                    isLoading: _controller.isAuthenticating,
                    isExiting: _loginExiting,
                    onSignIn: _controller.signInWithGoogle,
                  ),
                ),
            ],
          );
        },
      ),
    );
  }

  List<Page<void>> get _pages {
    final pages = <Page<void>>[
      MaterialPage<void>(
        key: const ValueKey('primary'),
        name: '/',
        child: OceanEyesShell(controller: _controller, page: AppPage.primary),
      ),
    ];

    switch (_controller.secondaryRoute) {
      case SecondaryRoute.alerts:
        pages.add(
          MaterialPage<void>(
            key: const ValueKey('alerts'),
            name: '/alerts',
            child: OceanEyesShell(
              controller: _controller,
              page: AppPage.alerts,
            ),
          ),
        );
        if (_controller.selectedAlert != null) {
          pages.add(
            MaterialPage<void>(
              key: ValueKey('alert-${_controller.selectedAlertId}'),
              name: '/alerts/detail',
              child: OceanEyesShell(
                controller: _controller,
                page: AppPage.alertDetail,
              ),
            ),
          );
        }
        break;
      case SecondaryRoute.history:
        pages.add(
          MaterialPage<void>(
            key: const ValueKey('history'),
            name: '/history',
            child: OceanEyesShell(
              controller: _controller,
              page: AppPage.history,
            ),
          ),
        );
        break;
      case null:
        break;
    }
    return pages;
  }

  void _didRemovePage(Page<Object?> page) {
    scheduleMicrotask(() {
      if (!mounted) return;
      if (page.name == '/alerts/detail' &&
          _controller.selectedAlertId != null) {
        _controller.popAlertDetail();
      } else if ((page.name == '/alerts' || page.name == '/history') &&
          _controller.secondaryRoute != null) {
        _controller.closeSecondaryRoute();
      }
    });
  }
}
