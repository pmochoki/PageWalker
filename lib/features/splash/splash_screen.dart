import 'dart:math';

import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_colors.dart';
import '../../core/theme/app_text.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashParticle {
  double x, y, vx, vy, opacity, size;
  Color color;

  _SplashParticle({
    required this.x,
    required this.y,
    required this.vx,
    required this.vy,
    required this.opacity,
    required this.size,
    required this.color,
  });
}

class _SplashScreenState extends State<SplashScreen>
    with TickerProviderStateMixin {
  late AnimationController _particleController;
  late AnimationController _logoController;
  late AnimationController _bgController;
  final _particles = <_SplashParticle>[];
  bool _showParticles = false;
  bool _showLogo = false;
  bool _showTagline = false;
  final _colors = [
    AppColors.orangePrimary,
    AppColors.orangeBright,
    AppColors.orangeAmber,
    AppColors.orangeEmber,
    const Color(0xFFFFFFFF),
  ];

  @override
  void initState() {
    super.initState();
    _bgController = AnimationController(
      duration: const Duration(seconds: 4),
      vsync: this,
    )..repeat(reverse: true);
    _particleController = AnimationController(
      duration: const Duration(milliseconds: 1200),
      vsync: this,
    );
    _logoController = AnimationController(
      duration: const Duration(seconds: 3),
      vsync: this,
    );
    _runSequence();
  }

  Future<void> _runSequence() async {
    // 0.3s — initial star
    await Future.delayed(const Duration(milliseconds: 300));
    if (!mounted) return;

    // 0.6s — explosion
    await Future.delayed(const Duration(milliseconds: 300));
    if (!mounted) return;
    _generateParticles();
    setState(() => _showParticles = true);
    _particleController.forward();

    // 1.0s — logo appears
    await Future.delayed(const Duration(milliseconds: 400));
    if (!mounted) return;
    setState(() => _showLogo = true);

    // 1.8s — tagline appears
    await Future.delayed(const Duration(milliseconds: 800));
    if (!mounted) return;
    setState(() => _showTagline = true);

    // 3.5s — navigate to home or auth
    await Future.delayed(const Duration(milliseconds: 1700));
    if (!mounted) return;
    context.go('/auth/login');
  }

  void _generateParticles() {
    final rng = Random();
    const cx = 0.5, cy = 0.5;
    for (int i = 0; i < 30; i++) {
      final angle = rng.nextDouble() * 2 * pi;
      final speed = rng.nextDouble() * 0.3 + 0.1;
      _particles.add(
        _SplashParticle(
          x: cx,
          y: cy,
          vx: cos(angle) * speed,
          vy: sin(angle) * speed,
          opacity: 1.0,
          size: rng.nextDouble() * 6 + 3,
          color: _colors[rng.nextInt(_colors.length)],
        ),
      );
    }
  }

  @override
  void dispose() {
    _particleController.dispose();
    _logoController.dispose();
    _bgController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.of(context).size;
    return Scaffold(
      backgroundColor: Colors.black,
      body: AnimatedBuilder(
        animation: _bgController,
        builder: (context, _) {
          return Container(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [
                  Color.lerp(
                        const Color(0xFF0A0A0A),
                        const Color(0xFF1A0500),
                        _bgController.value,
                      ) ??
                      const Color(0xFF0A0A0A),
                  const Color(0xFF0A0A0A),
                ],
              ),
            ),
            child: Stack(
              children: [
                // Explosion particles
                if (_showParticles)
                  AnimatedBuilder(
                    animation: _particleController,
                    builder: (context, _) {
                      return CustomPaint(
                        size: size,
                        painter: _ParticlePainter(
                          particles: _particles,
                          progress: _particleController.value,
                        ),
                      );
                    },
                  ),
                // Central content
                Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      // Gold centre star
                      const Text(
                        '✦',
                        style: TextStyle(
                          fontSize: 24,
                          color: AppColors.orangeAmber,
                          shadows: [
                            Shadow(
                              color: AppColors.orangeAmber,
                              blurRadius: 20,
                            ),
                          ],
                        ),
                      )
                          .animate()
                          .fadeIn(duration: 400.ms)
                          .scale(begin: const Offset(0.5, 0.5)),
                      const SizedBox(height: 24),
                      // Logo
                      if (_showLogo)
                        Column(
                          children: [
                            Text(
                              'Pagewalker',
                              style: AppText.script(52).copyWith(
                                shadows: const [
                                  Shadow(
                                    color: AppColors.orangePrimary,
                                    blurRadius: 30,
                                  ),
                                  Shadow(
                                    color: AppColors.orangeGlow,
                                    blurRadius: 60,
                                  ),
                                ],
                              ),
                            )
                                .animate()
                                .fadeIn(duration: 600.ms)
                                .scale(
                                  begin: const Offset(0.7, 0.7),
                                  curve: Curves.easeOutBack,
                                ),
                            const SizedBox(height: 12),
                            if (_showTagline)
                              Text(
                                'Your story begins here',
                                style: AppText.displayItalic(18),
                              )
                                  .animate()
                                  .fadeIn(duration: 800.ms)
                                  .slideY(begin: 0.3, end: 0),
                          ],
                        ),
                    ],
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}

class _ParticlePainter extends CustomPainter {
  final List<_SplashParticle> particles;
  final double progress;

  _ParticlePainter({
    required this.particles,
    required this.progress,
  });

  @override
  void paint(Canvas canvas, Size size) {
    for (final p in particles) {
      final x = (p.x + p.vx * progress) * size.width;
      final y = (p.y + p.vy * progress) * size.height;
      final opacity = (1.0 - progress).clamp(0.0, 1.0);
      final paint = Paint()
        ..color = p.color.withOpacity(opacity)
        ..maskFilter = const MaskFilter.blur(
          BlurStyle.normal,
          2,
        );
      canvas.drawCircle(
        Offset(x, y),
        p.size * (1 - progress * 0.5),
        paint,
      );
    }
  }

  @override
  bool shouldRepaint(_ParticlePainter old) =>
      old.progress != progress;
}

