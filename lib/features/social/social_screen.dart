import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';

import '../../core/theme/app_colors.dart';
import '../../core/theme/app_text.dart';
import '../../core/widgets/book_cover_widget.dart';
import '../../core/widgets/glass_card.dart';
import '../../core/widgets/gradient_button.dart';
import '../../core/widgets/dynamic_sky_background.dart';
import '../../core/widgets/star_rating_widget.dart';

class SocialScreen extends StatefulWidget {
  const SocialScreen({super.key});

  @override
  State<SocialScreen> createState() => _SocialScreenState();
}

class _SocialScreenState extends State<SocialScreen> {
  void _openWriteReview() {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => const _WriteReviewSheet(),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      floatingActionButton: GradientButton(
        label: 'Write a Review',
        icon: const Icon(
          Icons.edit_rounded,
          color: Colors.white,
        ),
        onPressed: _openWriteReview,
      ),
      body: DynamicSkyBackground(
        child: SafeArea(
          child: ListView.builder(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 80),
            itemCount: 10,
            itemBuilder: (context, index) {
              return GlassCard(
                margin: const EdgeInsets.only(bottom: 12),
                padding: const EdgeInsets.all(14),
                child: _ReviewCard(index: index),
              )
                  .animate()
                  .fadeIn(
                    delay: (index * 60).ms,
                    duration: 400.ms,
                  )
                  .slideY(begin: 0.1, end: 0);
            },
          ),
        ),
      ),
    );
  }
}

class _ReviewCard extends StatefulWidget {
  final int index;

  const _ReviewCard({required this.index});

  @override
  State<_ReviewCard> createState() => _ReviewCardState();
}

class _ReviewCardState extends State<_ReviewCard>
    with SingleTickerProviderStateMixin {
  bool _liked = false;
  bool _showSpoiler = false;
  late AnimationController _likeController;

  @override
  void initState() {
    super.initState();
    _likeController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 180),
      lowerBound: 0.9,
      upperBound: 1.1,
    );
  }

  @override
  void dispose() {
    _likeController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: const LinearGradient(
                  colors: AppColors.gradientOrange,
                ),
                border: Border.all(
                  color: AppColors.orangeAmber.withOpacity(0.8),
                  width: 2,
                ),
              ),
              child: const Center(
                child: Text(
                  'PW',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 14,
                  ),
                ),
              ),
            ),
            const SizedBox(width: 10),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '@reader${widget.index}',
                  style: AppText.bodySemiBold(13, context: context),
                ),
                Text(
                  'Bookwyrm in her feels',
                  style: AppText.body(
                    11,
                    context: context,
                  ),
                ),
              ],
            ),
            const Spacer(),
            const BookCoverWidget(
              width: 40,
              height: 60,
            ),
          ],
        ),
        const SizedBox(height: 10),
        const StarRatingWidget(
          rating: 4.5,
          size: 18,
          interactive: false,
        ),
        const SizedBox(height: 8),
        GestureDetector(
          onTap: () {
            setState(() {
              _showSpoiler = !_showSpoiler;
            });
          },
          child: AnimatedOpacity(
            opacity: _showSpoiler ? 1 : 0.3,
            duration: const Duration(milliseconds: 250),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(12),
              child: Stack(
                children: [
                  Padding(
                    padding: const EdgeInsets.all(4),
                    child: Text(
                      'This book grabbed my heart, shattered it, and then gently stitched it back together with starlight and feral tenderness.',
                      style: AppText.body(13),
                    ),
                  ),
                  if (!_showSpoiler)
                    Positioned.fill(
                      child: Container(
                        color: AppColors.darkCard
                            .withOpacity(0.8),
                        child: Center(
                          child: Text(
                            'Tap to reveal spoilers',
                            style: AppText.body(
                              12,
                              context: context,
                            ),
                          ),
                        ),
                      ),
                    ),
                ],
              ),
            ),
          ),
        ),
        const SizedBox(height: 8),
        Row(
          children: [
            ScaleTransition(
              scale: _likeController
                  .drive(Tween(begin: 0.9, end: 1.1)),
              child: GestureDetector(
                onTap: () {
                  setState(() {
                    _liked = !_liked;
                  });
                  _likeController
                    ..reset()
                    ..forward();
                },
                child: Icon(
                  _liked
                      ? Icons.favorite_rounded
                      : Icons.favorite_border_rounded,
                  color: _liked
                      ? AppColors.orangeBright
                      : AppColors.darkTextMuted,
                ),
              ),
            ),
            const SizedBox(width: 6),
            Text(
              _liked ? 'You and 238 others' : '238 likes',
              style: AppText.body(
                11,
                context: context,
              ),
            ),
          ],
        ),
      ],
    );
  }
}

class _WriteReviewSheet extends StatefulWidget {
  const _WriteReviewSheet();

  @override
  State<_WriteReviewSheet> createState() =>
      _WriteReviewSheetState();
}

class _WriteReviewSheetState extends State<_WriteReviewSheet> {
  final _bookController = TextEditingController();
  final _reviewController = TextEditingController();
  double _rating = 0;
  bool _spoiler = false;

  @override
  void dispose() {
    _bookController.dispose();
    _reviewController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return DraggableScrollableSheet(
      initialChildSize: 0.7,
      minChildSize: 0.5,
      maxChildSize: 0.9,
      builder: (context, controller) {
        return GlassCard(
          margin: const EdgeInsets.all(8),
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
          child: ListView(
            controller: controller,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: AppColors.textMuted,
                    borderRadius: BorderRadius.circular(999),
                  ),
                ),
              ),
              const SizedBox(height: 12),
              Text(
                'Share your review',
                style: AppText.display(18),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _bookController,
                decoration: const InputDecoration(
                  labelText: 'Search book',
                ),
                style: AppText.body(14),
              ),
              const SizedBox(height: 12),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Your rating',
                    style: AppText.bodySemiBold(13),
                  ),
                  StarRatingWidget(
                    rating: _rating,
                    size: 24,
                    onRatingChanged: (value) {
                      setState(() => _rating = value);
                    },
                  ),
                ],
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _reviewController,
                maxLines: 4,
                decoration: const InputDecoration(
                  labelText: 'Your thoughts',
                ),
                style: AppText.body(14),
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  Text(
                    'Contains spoilers',
                    style: AppText.body(13),
                  ),
                  const SizedBox(width: 6),
                  Switch(
                    value: _spoiler,
                    onChanged: (v) {
                      setState(() => _spoiler = v);
                    },
                    activeColor: AppColors.primary,
                  ),
                ],
              ),
              const SizedBox(height: 16),
              GradientButton(
                label: 'Share Review',
                width: double.infinity,
                onPressed: () {
                  Navigator.of(context).pop();
                },
              ),
            ],
          ),
        );
      },
    );
  }
}

