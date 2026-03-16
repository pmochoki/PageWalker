import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_colors.dart';
import '../../core/theme/app_text.dart';
import '../../core/widgets/book_cover_widget.dart';
import '../../core/widgets/glass_card.dart';
import '../../core/widgets/gradient_button.dart';
import '../../core/widgets/star_rating_widget.dart';
import '../../core/widgets/trope_chip.dart';
import 'widgets/character_ranking_widget.dart';
import 'widgets/scrapbook_section.dart';
import 'widgets/series_ranking_widget.dart';
import 'widgets/status_selector.dart';

class BookDetailScreen extends StatelessWidget {
  final String bookId;

  const BookDetailScreen({super.key, required this.bookId});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: AppColors.gradientDark,
          ),
        ),
        child: CustomScrollView(
          slivers: [
            SliverAppBar(
              expandedHeight: 300,
              pinned: true,
              backgroundColor: Colors.transparent,
              flexibleSpace: FlexibleSpaceBar(
                background: _Header(bookId: bookId),
              ),
            ),
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
                child: Column(
                  children: [
                    const StatusSelector().animate().fadeIn(),
                    const SizedBox(height: 16),
                    _RatersDigest().animate().fadeIn(
                          delay: 80.ms,
                        ),
                    const SizedBox(height: 16),
                    const ScrapbookSection().animate().fadeIn(
                          delay: 160.ms,
                        ),
                    const SizedBox(height: 16),
                    const CharacterRankingWidget()
                        .animate()
                        .fadeIn(delay: 220.ms),
                    const SizedBox(height: 16),
                    const SeriesRankingWidget()
                        .animate()
                        .fadeIn(delay: 260.ms),
                    const SizedBox(height: 20),
                    GradientButton(
                      label: 'See what readers are saying',
                      width: double.infinity,
                      icon: const Icon(
                        Icons.chat_bubble_outline_rounded,
                        color: Colors.white,
                      ),
                      onPressed: () {
                        context.push('/social');
                      },
                    )
                        .animate()
                        .fadeIn(delay: 280.ms)
                        .slideY(begin: 0.1, end: 0),
                    const SizedBox(height: 32),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Header extends StatelessWidget {
  final String bookId;

  const _Header({required this.bookId});

  @override
  Widget build(BuildContext context) {
    return Stack(
      fit: StackFit.expand,
      children: [
        ImageFiltered(
          imageFilter:
              ImageFilter.blur(sigmaX: 20, sigmaY: 20),
          child: Container(
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                colors: AppColors.gradientEmber,
              ),
            ),
          ),
        ),
        Align(
          alignment: Alignment.center,
          child: Hero(
            tag: 'book-cover-$bookId',
            child: const BookCoverWidget(
              width: 140,
              height: 210,
            ),
          ),
        ),
      ],
    );
  }
}

class _RatersDigest extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return GlassCard(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Rater’s Digest',
            style: AppText.display(18),
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              const StarRatingWidget(
                rating: 4.0,
                size: 26,
              ),
              const SizedBox(width: 12),
              Text(
                'Tap stars to rate',
                style: AppText.body(
                  13,
                  context: context,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Text(
            'Tier',
            style: AppText.bodySemiBold(14),
          ),
          const SizedBox(height: 10),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: const [
              _TierChip(
                label: 'God Tier',
                gradient: AppColors.gradientAmber,
              ),
              _TierChip(label: 'A Class'),
              _TierChip(label: '✦ B Class'),
              _TierChip(label: 'C Class'),
            ],
          ),
        ],
      ),
    );
  }
}

class _TierChip extends StatelessWidget {
  final String label;
  final List<Color>? gradient;

  const _TierChip({required this.label, this.gradient});

  @override
  Widget build(BuildContext context) {
    return GlassCard(
      borderRadius: 999,
      gradientColors: gradient,
      padding: const EdgeInsets.symmetric(
        horizontal: 14,
        vertical: 8,
      ),
      child: Text(
        label,
        style: AppText.bodySemiBold(
          13,
          color: gradient != null
              ? Colors.black
              : Theme.of(context).brightness == Brightness.dark
                  ? AppColors.darkTextPrimary
                  : AppColors.lightTextPrimary,
        ),
      ),
    );
  }
}

