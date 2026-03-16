import 'package:flutter/material.dart';

import '../theme/app_colors.dart';

class StarRatingWidget extends StatefulWidget {
  final double rating;
  final double size;
  final bool interactive;
  final ValueChanged<double>? onRatingChanged;

  const StarRatingWidget({
    super.key,
    required this.rating,
    this.size = 28,
    this.interactive = true,
    this.onRatingChanged,
  });

  @override
  State<StarRatingWidget> createState() => _StarRatingWidgetState();
}

class _StarRatingWidgetState extends State<StarRatingWidget>
    with TickerProviderStateMixin {
  late double _rating;
  final List<AnimationController> _controllers = [];
  final List<Animation<double>> _scaleAnimations = [];

  @override
  void initState() {
    super.initState();
    _rating = widget.rating;
    for (int i = 0; i < 5; i++) {
      final controller = AnimationController(
        duration: const Duration(milliseconds: 200),
        vsync: this,
      );
      _controllers.add(controller);
      _scaleAnimations.add(
        TweenSequence([
          TweenSequenceItem(
            tween: Tween(begin: 1.0, end: 1.3),
            weight: 50,
          ),
          TweenSequenceItem(
            tween: Tween(begin: 1.3, end: 1.0),
            weight: 50,
          ),
        ]).animate(
          CurvedAnimation(
            parent: controller,
            curve: Curves.elasticOut,
          ),
        ),
      );
    }
  }

  @override
  void dispose() {
    for (final c in _controllers) {
      c.dispose();
    }
    super.dispose();
  }

  void _onStarTap(int index) {
    if (!widget.interactive) return;
    setState(() => _rating = index + 1.0);
    _controllers[index].forward(from: 0);
    widget.onRatingChanged?.call(_rating);
  }

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: List.generate(5, (i) {
        final filled = i < _rating;
        final half = !filled && i < _rating + 0.5;
        return GestureDetector(
          onTap: () => _onStarTap(i),
          child: AnimatedBuilder(
            animation: _scaleAnimations[i],
            builder: (context, _) => Transform.scale(
              scale: _scaleAnimations[i].value,
              child: Padding(
                padding:
                    const EdgeInsets.symmetric(horizontal: 2),
                child: Icon(
                  filled
                      ? Icons.star_rounded
                      : half
                          ? Icons.star_half_rounded
                          : Icons.star_outline_rounded,
                  size: widget.size,
                  color: filled || half
                      ? AppColors.orangeAmber
                      : AppColors.darkTextMuted,
                  shadows: filled || half
                      ? [
                          Shadow(
                            color:
                                AppColors.orangeAmber.withOpacity(0.6),
                            blurRadius: 8,
                          )
                        ]
                      : null,
                ),
              ),
            ),
          ),
        );
      }),
    );
  }
}

