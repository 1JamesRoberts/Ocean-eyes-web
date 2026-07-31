import 'dart:async';

import 'package:flutter/material.dart';

import '../core/theme/oceaneyes_theme.dart';
import '../core/theme/oceaneyes_tokens.dart';
import '../models/aquarium_models.dart';
import '../ui/shell/oceaneyes_shell.dart';
import '../view_models/oceaneyes_controller.dart';

class OceanEyesApp extends StatefulWidget {
  const OceanEyesApp({super.key, this.controller});

  final OceanEyesController? controller;

  @override
  State<OceanEyesApp> createState() => _OceanEyesAppState();
}

class _OceanEyesAppState extends State<OceanEyesApp> {
  late final OceanEyesController _controller =
      widget.controller ?? OceanEyesController();
  late final bool _ownsController = widget.controller == null;

  @override
  void dispose() {
    if (_ownsController) _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'OceanEyes',
      debugShowCheckedModeBanner: false,
      theme: OceanEyesTheme.light,
      themeMode: ThemeMode.light,
      builder: (context, child) => ColoredBox(
        color: OceanColors.prussianBlue,
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(
              maxWidth: OceanGeometry.referenceWidth,
            ),
            child: child ?? const SizedBox.shrink(),
          ),
        ),
      ),
      home: AnimatedBuilder(
        animation: _controller,
        builder: (context, _) {
          final handlesBack =
              _controller.fullscreenCamera ||
              _controller.secondaryRoute != null;
          return PopScope<Object?>(
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
            child: Navigator(pages: _pages, onDidRemovePage: _didRemovePage),
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
