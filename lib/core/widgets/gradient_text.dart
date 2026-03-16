import 'package:flutter/material.dart';

import '../theme/app_colors.dart';
import '../theme/app_text.dart';

class GradientText extends StatelessWidget {
  final String text;
  final double size;
  final List<Color> colors;
  final bool italic;

  const GradientText(
    this.text, {
    super.key,
    required this.size,
    this.colors = AppColors.gradientOrange,
    this.italic = false,
  });

  @override
  Widget build(BuildContext context) {
    final baseStyle =
        italic ? AppText.displayItalic(size, context: context) : AppText.display(size, context: context);

    return ShaderMask(
      shaderCallback: (bounds) => LinearGradient(
        colors: colors,
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
      ).createShader(Rect.fromLTWH(0, 0, bounds.width, bounds.height)),
      child: Text(
        text,
        style: baseStyle,
      ),
    );
  }
}

