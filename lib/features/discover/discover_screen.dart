import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:lottie/lottie.dart';

import '../../core/theme/app_colors.dart';
import '../../core/theme/app_text.dart';
import '../../core/widgets/book_cover_widget.dart';
import '../../core/widgets/glass_card.dart';
import '../../core/widgets/gradient_button.dart';
import '../../core/widgets/dynamic_sky_background.dart';
import '../../core/widgets/trope_chip.dart';
import '../../data/repositories/book_repository.dart';

class DiscoverScreen extends StatefulWidget {
  const DiscoverScreen({super.key});

  @override
  State<DiscoverScreen> createState() =>
      _DiscoverScreenState();
}

class _DiscoverScreenState extends State<DiscoverScreen> {
  final _moodController = TextEditingController();
  final _repository = BookRepository();
  final _moods = const [
    'Make me cry',
    'Dark & twisted',
    'Cozy',
    'Chaos',
    'Slow burn',
    'Magic',
    'Light & funny',
  ];
  bool _loading = false;
  List<String> _topBooks = const [];
  List<String> _topTropes = const [];
  List<String> _results = const [];

  Future<void> _findNextRead() async {
    if (_moodController.text.trim().isEmpty) return;
    setState(() {
      _loading = true;
      _results = const [];
    });
    try {
      final books =
          await _repository.getMoodRecommendations(
        moodInput: _moodController.text.trim(),
        topBooks: _topBooks,
        topTropes: _topTropes,
      );
      setState(() {
        _results = books.map((e) => e.title).toList();
      });
    } catch (_) {
      setState(() {
        _results = const [];
      });
    } finally {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: DynamicSkyBackground(
        child: SafeArea(
          child: ListView(
            padding: const EdgeInsets.fromLTRB(
              16,
              16,
              16,
              24,
            ),
            children: [
                Text(
                  'What’s your vibe?',
                  style: AppText.display(26),
                )
                    .animate()
                    .fadeIn(duration: 500.ms)
                    .slideY(begin: -0.1, end: 0),
                const SizedBox(height: 12),
                GlassCard(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment:
                        CrossAxisAlignment.start,
                    children: [
                      TextField(
                        controller: _moodController,
                        maxLines: 2,
                        decoration:
                            const InputDecoration(
                          hintText:
                              'Tell Pagewalker how you want to feel...',
                        ),
                        style: AppText.body(14),
                      ),
                      const SizedBox(height: 12),
                      SizedBox(
                        height: 38,
                        child: ListView.separated(
                          scrollDirection:
                              Axis.horizontal,
                          itemCount: _moods.length,
                          separatorBuilder: (_, __) =>
                              const SizedBox(width: 8),
                          itemBuilder: (context, index) {
                            final label = _moods[index];
                            return TropeChip(
                              label: label,
                              selected: false,
                              onTap: () {
                                _moodController.text =
                                    label;
                              },
                            );
                          },
                        ),
                      ),
                      const SizedBox(height: 16),
                      GradientButton(
                        label: 'Find my next read ✦',
                        width: double.infinity,
                        onPressed:
                            _loading ? null : _findNextRead,
                        isLoading: _loading,
                      ),
                    ],
                  ),
                )
                    .animate()
                    .fadeIn(delay: 120.ms, duration: 500.ms)
                    .slideY(begin: 0.1, end: 0),
                const SizedBox(height: 20),
                if (_loading)
                  Center(
                    child: Column(
                      children: [
                        SizedBox(
                          height: 140,
                          child: Lottie.asset(
                            'assets/animations/sparkle.json',
                            repeat: true,
                          ),
                        ),
                        Text(
                          'Consulting the story stars...',
                          style: AppText.body(
                            14,
                            color:
                                AppColors.textSecondary,
                          ),
                        ),
                      ],
                    ),
                  ),
                if (!_loading && _results.isNotEmpty)
                  Column(
                    crossAxisAlignment:
                        CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Recommendations',
                        style: AppText.display(20),
                      )
                          .animate()
                          .fadeIn(
                            delay: 160.ms,
                            duration: 400.ms,
                          ),
                      const SizedBox(height: 12),
                      ..._results
                          .asMap()
                          .entries
                          .map(
                            (entry) => GlassCard(
                              margin:
                                  const EdgeInsets.only(
                                bottom: 10,
                              ),
                              padding:
                                  const EdgeInsets.all(12),
                              child: Row(
                                children: [
                                  const BookCoverWidget(
                                    width: 60,
                                    height: 90,
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment
                                              .start,
                                      children: [
                                        Text(
                                          entry.value,
                                          style: AppText
                                              .bodySemiBold(
                                            15,
                                          ),
                                        ),
                                        const SizedBox(
                                            height: 4),
                                        Text(
                                          'A book that matches your current vibe in the most delicious way.',
                                          style: AppText
                                              .displayItalic(
                                            13,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                            )
                                .animate()
                                .fadeIn(
                                  delay: (200 +
                                          entry.key *
                                              60)
                                      .ms,
                                  duration: 400.ms,
                                )
                                .slideY(
                                  begin: 0.1,
                                  end: 0,
                                ),
                          )
                          .toList(),
                    ],
                  ),
                const SizedBox(height: 24),
                Text(
                  'Curated for you',
                  style: AppText.display(20),
                ),
                const SizedBox(height: 12),
                SizedBox(
                  height: 190,
                  child: PageView.builder(
                    controller:
                        PageController(viewportFraction: 0.7),
                    itemCount: 5,
                    itemBuilder: (context, index) {
                      return Padding(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 6,
                        ),
                        child: GlassCard(
                          padding:
                              const EdgeInsets.all(12),
                          child: Column(
                            crossAxisAlignment:
                                CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Collection ${index + 1}',
                                style:
                                    AppText.bodySemiBold(14),
                              ),
                              const SizedBox(height: 8),
                              Row(
                                children: const [
                                  BookCoverWidget(
                                    width: 60,
                                    height: 90,
                                  ),
                                  SizedBox(width: 8),
                                  BookCoverWidget(
                                    width: 60,
                                    height: 90,
                                  ),
                                  SizedBox(width: 8),
                                  BookCoverWidget(
                                    width: 60,
                                    height: 90,
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
                ),
                const SizedBox(height: 24),
                Text(
                  'Hot right now',
                  style: AppText.display(20),
                ),
                const SizedBox(height: 12),
                ...List.generate(
                  4,
                  (index) => GlassCard(
                    margin: const EdgeInsets.only(bottom: 10),
                    padding: const EdgeInsets.all(12),
                    child: Row(
                      children: [
                        const BookCoverWidget(
                          width: 52,
                          height: 78,
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment:
                                CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Trending title ${index + 1}',
                                style:
                                    AppText.bodySemiBold(15),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                '#BookTok made me do it',
                                style: AppText.body(
                                  13,
                                  color:
                                      AppColors.textSecondary,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

