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
  late AnimationController _bgController;
  late AnimationController _mainController;

  @override
  void initState() {
    super.initState();
    _bgController = AnimationController(
      duration: const Duration(seconds: 4),
      vsync: this,
    )..repeat(reverse: true);
    _mainController = AnimationController(
      duration: const Duration(seconds: 4),
      vsync: this,
    )..addStatusListener((status) {
        if (status == AnimationStatus.completed && mounted) {
          context.go('/auth/login');
        }
      });
    _mainController.forward();
  }

  @override
  void dispose() {
    _mainController.dispose();
    _bgController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.of(context).size;
    return Scaffold(
      backgroundColor: Colors.black,
      body: AnimatedBuilder(
        animation: Listenable.merge([_bgController, _mainController]),
        builder: (context, _) {
          final t = _mainController.value;

          // Phases:
          // 0.00–0.35: book walks in from left
          // 0.15–0.55: "Pagewalker" types in
          // 0.50–0.80: book opens, light glows
          // 0.80–1.00: whole scene fades out

          final walkT = (t / 0.35).clamp(0.0, 1.0);
          final textT = ((t - 0.15) / 0.40).clamp(0.0, 1.0);
          final openT = ((t - 0.50) / 0.30).clamp(0.0, 1.0);
          final fadeOutT = ((t - 0.80) / 0.20).clamp(0.0, 1.0);

          final title = 'Pagewalker';
          final lettersToShow =
              (title.length * textT).clamp(0, title.length.toDouble()).round();
          final titleText = title.substring(0, lettersToShow);

          final dx = lerpDouble(
                -size.width * 0.6,
                0.0,
                Curves.easeOut.transform(walkT),
              ) ??
              0.0;
          final bounce = -6 *
              sin(pi * (t * 2.5).clamp(0.0, 1.0)); // subtle vertical bobbing

          final overallOpacity = 1.0 - fadeOutT;

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
                // Central content: star, walking book, typed logo and glow
                Center(
                  child: Opacity(
                    opacity: overallOpacity,
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
                        const SizedBox(height: 40),
                        // Warm glow behind book when open
                        SizedBox(
                          height: 120,
                          width: size.width * 0.8,
                          child: Stack(
                            alignment: Alignment.center,
                            children: [
                              if (openT > 0)
                                CustomPaint(
                                  size: Size(size.width * 0.6, 80),
                                  painter: _BookGlowPainter(openT),
                                ),
                              Transform.translate(
                                offset: Offset(dx, bounce),
                                child: _WalkingBook(openAmount: openT),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 24),
                        // "Pagewalker" typed out with glow
                        if (lettersToShow > 0)
                          Text(
                            titleText,
                            style: AppText.script(52).copyWith(
                              shadows: [
                                Shadow(
                                  color: AppColors.orangePrimary
                                      .withOpacity(0.6 + 0.4 * textT),
                                  blurRadius: 30,
                                ),
                                Shadow(
                                  color: AppColors.orangeGlow
                                      .withOpacity(0.4 + 0.4 * textT),
                                  blurRadius: 60,
                                ),
                              ],
                            ),
                          ),
                        const SizedBox(height: 8),
                        if (t > 0.4)
                          Text(
                            'Your story begins here',
                            style: AppText.displayItalic(18),
                          )
                              .animate()
                              .fadeIn(duration: 600.ms)
                              .slideY(begin: 0.3, end: 0),
                      ],
                    ),
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

/// Simple walking book used on the splash screen.
class _WalkingBook extends StatelessWidget {
  final double openAmount;

  const _WalkingBook({required this.openAmount});

  @override
  Widget build(BuildContext context) {
    return CustomPaint(
      painter: _WalkingBookPainter(openAmount: openAmount),
      size: const Size(80, 60),
    );
  }
}

class _WalkingBookPainter extends CustomPainter {
  final double openAmount;

  _WalkingBookPainter({required this.openAmount});

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()..style = PaintingStyle.fill;
    final stroke = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 3
      ..color = Colors.white;

    final bookRect = Rect.fromLTWH(
      size.width * 0.2,
      size.height * 0.05,
      size.width * 0.6,
      size.height * 0.45,
    );

    paint.color = AppColors.orangePrimary;
    canvas.drawRRect(
      RRect.fromRectAndRadius(bookRect, const Radius.circular(8)),
      paint,
    );

    canvas.drawLine(
      Offset(bookRect.left + 6, bookRect.top + 6),
      Offset(bookRect.left + 6, bookRect.bottom - 6),
      stroke,
    );

    final eyePaint = Paint()..color = Colors.white;
    canvas.drawCircle(
      Offset(bookRect.center.dx - 8, bookRect.center.dy - 4),
      2,
      eyePaint,
    );
    canvas.drawCircle(
      Offset(bookRect.center.dx + 4, bookRect.center.dy - 4),
      2,
      eyePaint,
    );

    final legPaint = Paint()
      ..color = Colors.white
      ..strokeWidth = 3
      ..strokeCap = StrokeCap.round;

    final baseY = bookRect.bottom + 4;
    canvas.drawLine(
      Offset(bookRect.left + 10, baseY),
      Offset(bookRect.left + 4, baseY + 14),
      legPaint,
    );
    canvas.drawLine(
      Offset(bookRect.right - 10, baseY),
      Offset(bookRect.right - 4, baseY + 10),
      legPaint,
    );

    final armPaint = Paint()
      ..color = Colors.white
      ..strokeWidth = 3
      ..strokeCap = StrokeCap.round;

    final midY = bookRect.center.dy;
    canvas.drawLine(
      Offset(bookRect.left + 4, midY),
      Offset(bookRect.left - 10, midY + 4),
      armPaint,
    );
    canvas.drawLine(
      Offset(bookRect.right - 4, midY),
      Offset(bookRect.right + 8, midY - 2),
      armPaint,
    );
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

/// Warm amber glow that emerges from the book as it opens.
class _BookGlowPainter extends CustomPainter {
  final double openAmount;

  _BookGlowPainter(this.openAmount);

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height * 0.45);
    final radius = size.width * (0.25 + 0.25 * openAmount);

    final gradient = RadialGradient(
      colors: [
        AppColors.orangeAmber.withOpacity(0.0),
        AppColors.orangeAmber.withOpacity(0.35 * openAmount),
        AppColors.orangeGlow.withOpacity(0.6 * openAmount),
      ],
      stops: const [0.0, 0.6, 1.0],
    );

    final rect = Rect.fromCircle(center: center, radius: radius);
    final paint = Paint()
      ..shader = gradient.createShader(rect)
      ..blendMode = BlendMode.plus;

    canvas.drawCircle(center, radius, paint);
  }

  @override
  bool shouldRepaint(covariant _BookGlowPainter oldDelegate) =>
      oldDelegate.openAmount != openAmount;
}


