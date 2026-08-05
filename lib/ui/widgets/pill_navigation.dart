import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../core/theme/oceaneyes_tokens.dart';
import '../../models/aquarium_models.dart';
import '../../view_models/oceaneyes_controller.dart';

class PillNavigation extends StatelessWidget {
  const PillNavigation({super.key, required this.controller});

  final OceanEyesController controller;

  static const tabs = <(PrimaryTab, String, IconData)>[
    (PrimaryTab.dashboard, 'Dashboard', LucideIcons.house),
    (PrimaryTab.myFish, 'My Fish', LucideIcons.fish),
    (
      PrimaryTab.analytics,
      'Analytics',
      LucideIcons.chartNoAxesColumnIncreasing,
    ),
    (PrimaryTab.account, 'Account', LucideIcons.user),
  ];

  @override
  Widget build(BuildContext context) {
    final bottom = mathMax(
      OceanGeometry.navigationBottom,
      MediaQuery.paddingOf(context).bottom,
    );
    final activeIndex = controller.activeTab.index;
    final indicatorColor = Color.lerp(
      OceanColors.white,
      OceanColors.turquoise,
      0.20,
    )!;
    return Positioned(
      left: OceanGeometry.navigationSide,
      right: OceanGeometry.navigationSide,
      bottom: bottom,
      height: OceanGeometry.navigationHeight,
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 360),
        child: DecoratedBox(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(OceanRadii.navigation),
            boxShadow: [
              BoxShadow(
                color: OceanColors.prussianBlue.withValues(alpha: 0.10),
                blurRadius: 24,
                offset: const Offset(0, 8),
              ),
            ],
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(OceanRadii.navigation),
            child: BackdropFilter(
              filter: ImageFilter.blur(sigmaX: 15, sigmaY: 15),
              child: DecoratedBox(
                decoration: BoxDecoration(
                  color: OceanColors.white.withValues(alpha: 0.30),
                  borderRadius: BorderRadius.circular(OceanRadii.navigation),
                  border: Border.all(
                    color: OceanColors.white.withValues(alpha: 0.35),
                  ),
                ),
                child: LayoutBuilder(
                  builder: (context, constraints) {
                    final innerWidth = constraints.maxWidth - 16;
                    final slotWidth = innerWidth / tabs.length;
                    return Stack(
                      children: [
                        AnimatedPositioned(
                          duration: OceanMotion.responsive(
                            context,
                            OceanMotion.smooth,
                          ),
                          curve: OceanMotion.smoothCurve,
                          left: 8 + slotWidth * activeIndex,
                          top: 6,
                          width: slotWidth,
                          bottom: 6,
                          child: DecoratedBox(
                            decoration: BoxDecoration(
                              borderRadius: BorderRadius.circular(
                                OceanRadii.navigationItem,
                              ),
                              border: Border.all(
                                color: OceanColors.navigationActive,
                                width: 1.5,
                              ),
                              gradient: LinearGradient(
                                colors: [
                                  indicatorColor,
                                  indicatorColor.withValues(alpha: 0.286),
                                ],
                              ),
                            ),
                          ),
                        ),
                        Padding(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 8,
                            vertical: 6,
                          ),
                          child: Row(
                            children: [
                              for (final tab in tabs)
                                Expanded(
                                  child: _NavigationItem(
                                    tab: tab.$1,
                                    label: tab.$2,
                                    icon: tab.$3,
                                    active: controller.activeTab == tab.$1,
                                    alertCount: tab.$1 == PrimaryTab.dashboard
                                        ? controller.unresolvedAlertCount
                                        : 0,
                                    onTap: () => controller.selectTab(tab.$1),
                                  ),
                                ),
                            ],
                          ),
                        ),
                      ],
                    );
                  },
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  double mathMax(double a, double b) => a > b ? a : b;
}

class _NavigationItem extends StatelessWidget {
  const _NavigationItem({
    required this.tab,
    required this.label,
    required this.icon,
    required this.active,
    required this.alertCount,
    required this.onTap,
  });

  final PrimaryTab tab;
  final String label;
  final IconData icon;
  final bool active;
  final int alertCount;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final color = active ? OceanColors.navigationActive : OceanColors.inkMuted;
    return Semantics(
      selected: active,
      button: true,
      label: alertCount > 0 ? '$label, $alertCount active alerts' : label,
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(OceanRadii.navigationItem),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(OceanRadii.navigationItem),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Stack(
                clipBehavior: Clip.none,
                children: [
                  Icon(icon, size: 20, color: color),
                  if (alertCount > 0)
                    Positioned(
                      right: -6,
                      top: -3,
                      child: Container(
                        constraints: const BoxConstraints(
                          minWidth: 15,
                          minHeight: 15,
                        ),
                        padding: const EdgeInsets.symmetric(horizontal: 3),
                        alignment: Alignment.center,
                        decoration: BoxDecoration(
                          color: OceanColors.critical,
                          borderRadius: BorderRadius.circular(999),
                          border: Border.all(
                            color: OceanColors.white.withValues(alpha: 0.80),
                            width: 1.5,
                          ),
                        ),
                        child: Text(
                          '$alertCount',
                          style: const TextStyle(
                            fontFamily: 'Inter',
                            fontSize: 9,
                            height: 1,
                            fontWeight: FontWeight.w700,
                            color: OceanColors.white,
                          ),
                        ),
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 2),
              Text(
                label,
                maxLines: 1,
                style: TextStyle(
                  fontFamily: 'Inter',
                  fontSize: 10,
                  height: 1,
                  fontWeight: FontWeight.w600,
                  color: color,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
