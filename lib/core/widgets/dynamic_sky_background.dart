import 'dart:math';

import 'package:flutter/material.dart';

import '../theme/app_colors.dart';

enum _SkyPhase {
  night,
  preDawn,
  sunrise,
  morning,
  midday,
  afternoon,
  goldenHour,
  sunset,
  dusk,
  evening,
}

class DynamicSkyBackground extends StatefulWidget {
  final Widget child;
  final bool showCelestialBody; // sun or moon
  final bool showStars;

  const DynamicSkyBackground({
    super.key,
    required this.child,
    this.showCelestialBody = true,
    this.showStars = true,
  });

  @override
  State<DynamicSkyBackground> createState() => _DynamicSkyBackgroundState();
}

class _Star {
  final double x;
  final double y;
  final double size;
  final double twinkleSpeed;

  _Star({
    required this.x,
    required this.y,
    required this.size,
    required this.twinkleSpeed,
  });
}

class _DynamicSkyBackgroundState extends State<DynamicSkyBackground>
    with TickerProviderStateMixin {
  late AnimationController _transitionController;
  late AnimationController _celestialController;
  late AnimationController _twinkleController;

  List<Color> _currentColors = AppColors.skyNight;
  List<Color> _targetColors = AppColors.skyNight;
  _SkyPhase _currentPhase = _SkyPhase.night;

  final List<_Star> _stars = [];
  final _random = Random();

  @override
  void initState() {
    super.initState();

    _transitionController = AnimationController(
      duration: const Duration(minutes: 2),
      vsync: this,
    );
    _celestialController = AnimationController(
      duration: const Duration(seconds: 8),
      vsync: this,
    )..repeat(reverse: true);
    _twinkleController = AnimationController(
      duration: const Duration(seconds: 3),
      vsync: this,
    )..repeat(reverse: true);

    _generateStars();
    _updateSkyForCurrentTime();

    // Update sky every minute
    Stream.periodic(const Duration(minutes: 1)).listen((_) {
      if (mounted) _updateSkyForCurrentTime();
    });
  }

  void _generateStars() {
    for (int i = 0; i < 60; i++) {
      _stars.add(
        _Star(
          x: _random.nextDouble(),
          y: _random.nextDouble() * 0.7, // stars in upper 70% of screen
          size: _random.nextDouble() * 2.5 + 0.5,
          twinkleSpeed: _random.nextDouble(),
        ),
      );
    }
  }

  _SkyPhase _getPhaseForHour(int hour, int minute) {
    final time = hour + minute / 60.0;
    if (time >= 0 && time < 5) return _SkyPhase.night;
    if (time >= 5 && time < 6) return _SkyPhase.preDawn;
    if (time >= 6 && time < 7.5) return _SkyPhase.sunrise;
    if (time >= 7.5 && time < 11) return _SkyPhase.morning;
    if (time >= 11 && time < 14) return _SkyPhase.midday;
    if (time >= 14 && time < 16.5) return _SkyPhase.afternoon;
    if (time >= 16.5 && time < 18.5) return _SkyPhase.goldenHour;
    if (time >= 18.5 && time < 20) return _SkyPhase.sunset;
    if (time >= 20 && time < 21.5) return _SkyPhase.dusk;
    return _SkyPhase.evening;
  }

  List<Color> _colorsForPhase(_SkyPhase phase) {
    switch (phase) {
      case _SkyPhase.night:
        return AppColors.skyNight;
      case _SkyPhase.preDawn:
        return AppColors.skyPreDawn;
      case _SkyPhase.sunrise:
        return AppColors.skySunrise;
      case _SkyPhase.morning:
        return AppColors.skyMorning;
      case _SkyPhase.midday:
        return AppColors.skyMidday;
      case _SkyPhase.afternoon:
        return AppColors.skyAfternoon;
      case _SkyPhase.goldenHour:
        return AppColors.skyGoldenHour;
      case _SkyPhase.sunset:
        return AppColors.skySunset;
      case _SkyPhase.dusk:
        return AppColors.skyDusk;
      case _SkyPhase.evening:
        return AppColors.skyEvening;
    }
  }

  void _updateSkyForCurrentTime() {
    final now = DateTime.now();
    final phase = _getPhaseForHour(now.hour, now.minute);
    if (phase == _currentPhase) return;

    setState(() {
      _currentColors = _targetColors;
      _targetColors = _colorsForPhase(phase);
      _currentPhase = phase;
    });
    _transitionController.forward(from: 0);
  }

  // Sun position: rises from left horizon, peaks at top, sets on right
  // Moon: opposite arc
  Offset _getSunPosition(Size size) {
    final now = DateTime.now();
    final hour = now.hour + now.minute / 60.0;
    // Sun visible 6am–8pm (14 hour arc)
    final progress = ((hour - 6) / 14).clamp(0.0, 1.0);
    // Arc: starts bottom-left, peaks top-centre, ends bottom-right
    final x = progress * size.width;
    final y = size.height * 0.6 - sin(progress * pi) * size.height * 0.55;
    return Offset(x, y);
  }

  Offset _getMoonPosition(Size size) {
    final now = DateTime.now();
    final hour = now.hour + now.minute / 60.0;
    // Moon visible roughly 8pm–6am
    final nightHour = hour >= 20 ? hour - 20 : hour + 4;
    final progress = (nightHour / 14).clamp(0.0, 1.0);
    final x = progress * size.width;
    final y = size.height * 0.5 - sin(progress * pi) * size.height * 0.45;
    return Offset(x, y);
  }

  bool get _isSunVisible {
    final hour = DateTime.now().hour;
    return hour >= 6 && hour < 20;
  }

  double get _starsOpacity {
    switch (_currentPhase) {
      case _SkyPhase.night:
      case _SkyPhase.preDawn:
      case _SkyPhase.evening:
        return 0.9;
      case _SkyPhase.dusk:
      case _SkyPhase.sunset:
        return 0.4;
      case _SkyPhase.sunrise:
        return 0.15;
      default:
        return 0.0;
    }
  }

  @override
  void dispose() {
    _transitionController.dispose();
    _celestialController.dispose();
    _twinkleController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final size = Size(constraints.maxWidth, constraints.maxHeight);
        return AnimatedBuilder(
          animation: Listenable.merge([
            _transitionController,
            _celestialController,
            _twinkleController,
          ]),
          builder: (context, _) {
            // Interpolate gradient colours during transition
            final t = _transitionController.value;
            final interpolatedColors = List.generate(
              max(_currentColors.length, _targetColors.length),
              (i) {
                final c1 =
                    i < _currentColors.length ? _currentColors[i] : _currentColors.last;
                final c2 =
                    i < _targetColors.length ? _targetColors[i] : _targetColors.last;
                return Color.lerp(c1, c2, t)!;
              },
            );

            return Stack(
              children: [
                // Sky gradient background
                Container(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                      colors: interpolatedColors,
                    ),
                  ),
                ),
                // Stars (visible at night)
                if (widget.showStars && _starsOpacity > 0)
                  Opacity(
                    opacity: _starsOpacity,
                    child: CustomPaint(
                      size: size,
                      painter: _StarsPainter(
                        stars: _stars,
                        twinkleProgress: _twinkleController.value,
                      ),
                    ),
                  ),
                // Sun or Moon
                if (widget.showCelestialBody)
                  _isSunVisible ? _buildSun(size) : _buildMoon(size),
                // Horizon glow layer
                Positioned(
                  bottom: 0,
                  left: 0,
                  right: 0,
                  child: _buildHorizonGlow(),
                ),
                // Actual screen content on top
                widget.child,
              ],
            );
          },
        );
      },
    );
  }

  Widget _buildSun(Size size) {
    final pos = _getSunPosition(size);
    final hour = DateTime.now().hour;
    // Sun size: larger near horizon, smaller at peak
    final altitudeProgress = sin(
      ((hour - 6) / 14).clamp(0.0, 1.0) * pi,
    );
    final sunSize = 40.0 + (1 - altitudeProgress) * 30;
    // Sun glow intensity: strongest near horizon
    final glowSize = sunSize + (1 - altitudeProgress) * 80;
    final glowOpacity = 0.3 + (1 - altitudeProgress) * 0.4;
    // Wobble animation
    final wobble = _celestialController.value * 3;

    return Positioned(
      left: pos.dx - glowSize / 2,
      top: pos.dy - glowSize / 2 + wobble,
      child: SizedBox(
        width: glowSize,
        height: glowSize,
        child: Stack(
          alignment: Alignment.center,
          children: [
            // Outer glow
            Container(
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: RadialGradient(
                  colors: [
                    AppColors.orangeAmber.withOpacity(glowOpacity),
                    AppColors.orangePrimary.withOpacity(glowOpacity * 0.5),
                    Colors.transparent,
                  ],
                ),
              ),
            ),
            // Sun disc
            Container(
              width: sunSize,
              height: sunSize,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: const RadialGradient(
                  colors: [
                    Color(0xFFFFEE88),
                    Color(0xFFFFCC33),
                    Color(0xFFFF8800),
                  ],
                ),
                boxShadow: [
                  BoxShadow(
                    color: AppColors.orangeAmber.withOpacity(0.8),
                    blurRadius: 30,
                    spreadRadius: 5,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMoon(Size size) {
    final pos = _getMoonPosition(size);
    final wobble = _celestialController.value * 2;

    return Positioned(
      left: pos.dx - 30,
      top: pos.dy - 30 + wobble,
      child: SizedBox(
        width: 60,
        height: 60,
        child: Stack(
          alignment: Alignment.center,
          children: [
            // Moon glow
            Container(
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: RadialGradient(
                  colors: [
                    const Color(0xFFFFEECC).withOpacity(0.3),
                    const Color(0xFFFFCC88).withOpacity(0.1),
                    Colors.transparent,
                  ],
                ),
              ),
            ),
            // Moon disc (crescent via overlay)
            Container(
              width: 28,
              height: 28,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: const Color(0xFFFFF0C8),
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFFFFCC88).withOpacity(0.6),
                    blurRadius: 15,
                    spreadRadius: 2,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHorizonGlow() {
    Color glowColor;
    double glowHeight;
    double opacity;

    switch (_currentPhase) {
      case _SkyPhase.sunrise:
        glowColor = AppColors.orangePrimary;
        glowHeight = 120;
        opacity = 0.6;
        break;
      case _SkyPhase.goldenHour:
        glowColor = AppColors.orangeEmber;
        glowHeight = 150;
        opacity = 0.7;
        break;
      case _SkyPhase.sunset:
        glowColor = AppColors.orangeDeep;
        glowHeight = 180;
        opacity = 0.8;
        break;
      case _SkyPhase.morning:
      case _SkyPhase.afternoon:
        glowColor = AppColors.orangeAmber;
        glowHeight = 80;
        opacity = 0.3;
        break;
      default:
        glowColor = AppColors.orangeDeep;
        glowHeight = 60;
        opacity = 0.1;
    }

    return Container(
      height: glowHeight,
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.bottomCenter,
          end: Alignment.topCenter,
          colors: [
            glowColor.withOpacity(opacity),
            Colors.transparent,
          ],
        ),
      ),
    );
  }
}

class _StarsPainter extends CustomPainter {
  final List<_Star> stars;
  final double twinkleProgress;

  _StarsPainter({
    required this.stars,
    required this.twinkleProgress,
  });

  @override
  void paint(Canvas canvas, Size size) {
    for (final star in stars) {
      final twinkle =
          (sin(star.twinkleSpeed * pi * 2 + twinkleProgress * pi * 2) + 1) / 2;
      final opacity = 0.3 + twinkle * 0.7;
      final paint = Paint()
        ..color = const Color(0xFFFFEECC).withOpacity(opacity)
        ..maskFilter = MaskFilter.blur(BlurStyle.normal, star.size * 0.5);
      canvas.drawCircle(
        Offset(star.x * size.width, star.y * size.height),
        star.size,
        paint,
      );
    }
  }

  @override
  bool shouldRepaint(_StarsPainter old) => old.twinkleProgress != twinkleProgress;
}

