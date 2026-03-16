import 'package:flutter/material.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text.dart';

class StatusSelector extends StatefulWidget {
  const StatusSelector({super.key});

  @override
  State<StatusSelector> createState() => _StatusSelectorState();
}

class _StatusSelectorState extends State<StatusSelector> {
  int _selected = 0;
  final _labels = const ['TBR', 'Reading', 'Read', 'DNF'];

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: List.generate(_labels.length, (index) {
        final selected = _selected == index;
        return Expanded(
          child: GestureDetector(
            onTap: () {
              setState(() => _selected = index);
            },
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              margin: const EdgeInsets.symmetric(horizontal: 4),
              padding: const EdgeInsets.symmetric(
                vertical: 8,
              ),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(999),
                gradient: selected
                    ? const LinearGradient(
                        colors: AppColors.gradientOrange,
                      )
                    : null,
                border: Border.all(
                  color: selected
                      ? Colors.transparent
                      : AppColors.orangePrimary.withOpacity(0.4),
                ),
                color: selected ? null : AppColors.darkCard,
              ),
              child: Center(
                child: Text(
                  _labels[index],
                  style: AppText.bodySemiBold(
                    13,
                    color: selected
                        ? Colors.white
                        : AppColors.darkTextSecondary,
                  ),
                ),
              ),
            ),
          ),
        );
      }),
    );
  }
}

