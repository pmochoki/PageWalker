import 'dart:math';

import 'package:confetti/confetti.dart';
import 'package:flutter/material.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text.dart';
import '../../../core/widgets/book_cover_widget.dart';
import '../../../core/widgets/glass_card.dart';
import '../../../core/widgets/gradient_button.dart';

class SpinWheelModal extends StatefulWidget {
  final ConfettiController confettiController;

  const SpinWheelModal({
    super.key,
    required this.confettiController,
  });

  @override
  State<SpinWheelModal> createState() => _SpinWheelModalState();
}

class _SpinWheelModalState extends State<SpinWheelModal>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _animation;
  final _random = Random();
  double _targetAngle = 0;
  int _selectedIndex = 0;

  final _books = List<String>.generate(
    8,
    (i) => 'Book ${i + 1}',
  );

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 5),
    );
    _animation = CurvedAnimation(
      parent: _controller,
      curve: Curves.easeOutQuart,
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _spin() {
    final spins = 4 + _random.nextInt(4);
    final segmentAngle = 2 * pi / _books.length;
    _selectedIndex = _random.nextInt(_books.length);
    final randomOffset = _random.nextDouble() * segmentAngle;
    _targetAngle = spins * 2 * pi +
        _selectedIndex * segmentAngle +
        randomOffset;

    _controller
      ..reset()
      ..forward().whenComplete(() {
        widget.confettiController.play();
        setState(() {});
      });
  }

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.of(context).size;
    return Container(
      height: size.height * 0.9,
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: AppColors.gradientDark,
        ),
      ),
      child: Stack(
        children: [
          Align(
            alignment: Alignment.topCenter,
            child: ConfettiWidget(
              confettiController: widget.confettiController,
              blastDirectionality:
                  BlastDirectionality.explosive,
              emissionFrequency: 0.02,
              numberOfParticles: 24,
              gravity: 0.2,
              colors: const [
                AppColors.orangePrimary,
                AppColors.orangeBright,
                AppColors.orangeAmber,
              ],
            ),
          ),
          SafeArea(
            child: Column(
              children: [
                Padding(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 20,
                    vertical: 8,
                  ),
                  child: Row(
                    mainAxisAlignment:
                        MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Spin the TBR wheel',
                        style: AppText.display(20),
                      ),
                      IconButton(
                        onPressed: () =>
                            Navigator.of(context).pop(),
                        icon: const Icon(
                          Icons.close,
                          color: Colors.white,
                        ),
                      ),
                    ],
                  ),
                ),
                Expanded(
                  child: Column(
                    mainAxisAlignment:
                        MainAxisAlignment.center,
                    children: [
                      SizedBox(
                        height: size.width * 0.9,
                        width: size.width * 0.9,
                        child: Stack(
                          alignment: Alignment.center,
                          children: [
                            AnimatedBuilder(
                              animation: _animation,
                              builder: (context, _) {
                                final angle = _targetAngle *
                                    _animation.value;
                                return Transform.rotate(
                                  angle: angle,
                                  child: CustomPaint(
                                    size: Size.square(
                                      size.width * 0.8,
                                    ),
                                    painter: _WheelPainter(
                                      books: _books,
                                    ),
                                  ),
                                );
                              },
                            ),
                            Positioned(
                              top: 16,
                              child: CustomPaint(
                                size: const Size(30, 40),
                                painter: _ArrowPainter(),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 24),
                      Padding(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 20,
                        ),
                        child: GradientButton(
                          label: '✦ SPIN',
                          width: double.infinity,
                          onPressed: _spin,
                        ),
                      ),
                      const SizedBox(height: 16),
                      DraggableScrollableSheet(
                        initialChildSize: 0.18,
                        minChildSize: 0.18,
                        maxChildSize: 0.5,
                        builder: (context, controller) {
                          final selectedTitle =
                              _books[_selectedIndex];
                          return GlassCard(
                            borderRadius: 24,
                            margin:
                                const EdgeInsets.symmetric(
                              horizontal: 16,
                            ),
                            padding: const EdgeInsets.all(16),
                            child: ListView(
                              controller: controller,
                              children: [
                                Row(
                                  children: [
                                    const BookCoverWidget(
                                      width: 70,
                                      height: 105,
                                    ),
                                    const SizedBox(width: 16),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment:
                                            CrossAxisAlignment
                                                .start,
                                        children: [
                                          Text(
                                            selectedTitle,
                                            style:
                                                AppText.bodySemiBold(
                                              16,
                                            ),
                                          ),
                                          const SizedBox(
                                              height: 4),
                                          Text(
                                            'A randomly selected adventure from your TBR.',
                                            style: AppText.body(
                                              13,
                                              color: AppColors
                                                  .textSecondary,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 16),
                                Row(
                                  children: [
                                    Expanded(
                                      child: GradientButton(
                                        label: 'Start Reading',
                                        onPressed: () {
                                          Navigator.of(context)
                                              .pop();
                                        },
                                      ),
                                    ),
                                    const SizedBox(width: 12),
                                    Expanded(
                                      child: OutlinedButton(
                                        style:
                                            OutlinedButton
                                                .styleFrom(
                                          side:
                                              const BorderSide(
                                            color: AppColors
                                                .primary,
                                          ),
                                          shape:
                                              RoundedRectangleBorder(
                                            borderRadius:
                                                BorderRadius
                                                    .circular(
                                              30,
                                            ),
                                          ),
                                        ),
                                        onPressed: _spin,
                                        child: Text(
                                          'Spin Again',
                                          style:
                                              AppText.bodySemiBold(
                                            14,
                                            color: AppColors
                                                .primary,
                                          ),
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          );
                        },
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _WheelPainter extends CustomPainter {
  final List<String> books;

  _WheelPainter({required this.books});

  @override
  void paint(Canvas canvas, Size size) {
    final center =
        Offset(size.width / 2, size.height / 2);
    final radius =
        min(size.width, size.height) / 2 - 8;
    final segmentAngle = 2 * pi / books.length;
    final paint = Paint()
      ..style = PaintingStyle.fill;
    final colors = [
      AppColors.orangePrimary,
      AppColors.orangeBright,
      AppColors.orangeEmber,
      AppColors.orangeAmber,
    ];

    for (int i = 0; i < books.length; i++) {
      paint.color = colors[i % colors.length];
      final startAngle = -pi / 2 + i * segmentAngle;
      canvas.drawArc(
        Rect.fromCircle(center: center, radius: radius),
        startAngle,
        segmentAngle,
        true,
        paint,
      );

      final textPainter = TextPainter(
        text: TextSpan(
          text: books[i],
          style: AppText.body(
            11,
            color: Colors.white,
          ),
        ),
        textDirection: TextDirection.ltr,
        maxLines: 1,
      )..layout(maxWidth: radius * 0.9);

      final angle = startAngle + segmentAngle / 2;
      final textRadius = radius * 0.65;
      final textOffset = Offset(
        center.dx + cos(angle) * textRadius -
            textPainter.width / 2,
        center.dy + sin(angle) * textRadius -
            textPainter.height / 2,
      );
      textPainter.paint(canvas, textOffset);
    }
  }

  @override
  bool shouldRepaint(covariant _WheelPainter oldDelegate) {
    return oldDelegate.books != books;
  }
}

class _ArrowPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()..color = AppColors.orangeAmber;
    final path = Path()
      ..moveTo(size.width / 2, 0)
      ..lineTo(size.width, size.height)
      ..lineTo(0, size.height)
      ..close();
    canvas.drawPath(path, paint);
    canvas.drawCircle(
      Offset(size.width / 2, size.height),
      6,
      Paint()..color = AppColors.orangeDeep,
    );
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) =>
      false;
}

