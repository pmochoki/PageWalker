import 'dart:ui';

import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:share_plus/share_plus.dart';

import '../../core/theme/app_colors.dart';
import '../../core/theme/app_text.dart';
import '../../core/widgets/book_cover_widget.dart';
import '../../core/widgets/glass_card.dart';
import '../../core/widgets/gradient_button.dart';
import '../../core/widgets/dynamic_sky_background.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen>
    with TickerProviderStateMixin {
  late AnimationController _avatarGlowController;
  final GlobalKey _wrapKey = GlobalKey();
  int _periodIndex = 0;

  final _periods = const [
    'Monthly',
    'Quarterly',
    'Biannual',
    'Yearly',
  ];

  @override
  void initState() {
    super.initState();
    _avatarGlowController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 3),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _avatarGlowController.dispose();
    super.dispose();
  }

  Future<void> _shareWrap() async {
    final renderObject =
        _wrapKey.currentContext?.findRenderObject();
    if (renderObject is! RenderRepaintBoundary) return;
    final image = await renderObject.toImage(
      pixelRatio: 3,
    );
    final byteData = await image.toByteData(
      format: ImageByteFormat.png,
    );
    if (byteData == null) return;
    final bytes = byteData.buffer.asUint8List();
    await Share.shareXFiles([
      XFile.fromData(
        bytes,
        name: 'pagewalker-wrap.png',
        mimeType: 'image/png',
      ),
    ]);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: DynamicSkyBackground(
        child: SafeArea(
          child: ListView(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
            children: [
                _Header(controller: _avatarGlowController)
                    .animate()
                    .fadeIn(duration: 500.ms),
                const SizedBox(height: 16),
                _StatsRow().animate().fadeIn(
                      delay: 80.ms,
                    ),
                const SizedBox(height: 16),
                _ReadingWrapSection(
                  periods: _periods,
                  periodIndex: _periodIndex,
                  onPeriodChanged: (i) {
                    setState(() => _periodIndex = i);
                  },
                  repaintKey: _wrapKey,
                  onShare: _shareWrap,
                ).animate().fadeIn(delay: 140.ms),
                const SizedBox(height: 16),
                _TierListSection()
                    .animate()
                    .fadeIn(delay: 200.ms),
                const SizedBox(height: 16),
                _TropeDnaSection()
                    .animate()
                    .fadeIn(delay: 260.ms),
                const SizedBox(height: 16),
                _BingoSection()
                    .animate()
                    .fadeIn(delay: 300.ms),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _Header extends StatelessWidget {
  final AnimationController controller;

  const _Header({required this.controller});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        children: [
          AnimatedBuilder(
            animation: controller,
            builder: (context, child) {
              final value = controller.value;
              final glow = 0.6 + 0.4 * value;
              return Container(
                padding: const EdgeInsets.all(4),
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  boxShadow: [
                    BoxShadow(
                      color: AppColors.orangePrimary
                          .withOpacity(glow * 0.6),
                      blurRadius: 30,
                    ),
                  ],
                  gradient: const RadialGradient(
                    colors: [
                      AppColors.orangePrimary,
                      AppColors.orangeDeep,
                    ],
                  ),
                ),
                child: child,
              );
            },
            child: const CircleAvatar(
              radius: 40,
              backgroundColor: AppColors.darkBg,
              child: Text(
                'PW',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 32,
                ),
              ),
            ),
          ),
          const SizedBox(height: 10),
          Text(
            'Pagewalker Muse',
            style: AppText.display(22),
          ),
          const SizedBox(height: 4),
          Text(
            '@bookishdreamer',
            style: AppText.body(
              13,
              context: context,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Collecting fictional heartbreaks and happily-ever-afters.',
            style: AppText.body(13),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }
}

class _StatsRow extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final stats = [
      ('Books Read', '128'),
      ('Avg Rating', '4.3'),
      ('Streak', '27'),
      ('Pages Read', '42k'),
    ];

    return Row(
      children: stats
          .map(
            (s) => Expanded(
              child: GlassCard(
                padding: const EdgeInsets.symmetric(
                  vertical: 10,
                ),
                margin: const EdgeInsets.symmetric(
                  horizontal: 4,
                ),
                child: Column(
                  children: [
                    Text(
                      s.$2,
                      style: AppText.display(18),
                    )
                        .animate()
                        .fadeIn(duration: 600.ms)
                        .tint(color: AppColors.gold),
                    const SizedBox(height: 2),
                    Text(
                      s.$1,
                      style: AppText.body(
                        11,
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          )
          .toList(),
    );
  }
}

class _ReadingWrapSection extends StatelessWidget {
  final List<String> periods;
  final int periodIndex;
  final ValueChanged<int> onPeriodChanged;
  final GlobalKey repaintKey;
  final VoidCallback onShare;

  const _ReadingWrapSection({
    required this.periods,
    required this.periodIndex,
    required this.onPeriodChanged,
    required this.repaintKey,
    required this.onShare,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Reading Wraps',
          style: AppText.display(18, context: context),
        ),
        const SizedBox(height: 10),
        Row(
          children: List.generate(periods.length, (index) {
            final selected = periodIndex == index;
            return Expanded(
              child: GestureDetector(
                onTap: () => onPeriodChanged(index),
                child: AnimatedContainer(
                  duration:
                      const Duration(milliseconds: 200),
                  margin: const EdgeInsets.symmetric(
                    horizontal: 4,
                  ),
                  padding: const EdgeInsets.symmetric(
                    vertical: 6,
                  ),
                  decoration: BoxDecoration(
                    borderRadius:
                        BorderRadius.circular(999),
                    gradient: selected
                        ? const LinearGradient(
                            colors: AppColors.gradientOrange,
                          )
                        : null,
                    border: Border.all(
                      color: selected
                          ? Colors.transparent
                          : AppColors.orangePrimary
                              .withOpacity(0.4),
                    ),
                    color:
                        selected ? null : AppColors.darkCard,
                  ),
                  child: Center(
                    child: Text(
                      periods[index],
                      style: AppText.body(
                        12,
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
        ),
        const SizedBox(height: 10),
        RepaintBoundary(
          key: repaintKey,
          child: GlassCard(
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment:
                  CrossAxisAlignment.start,
              children: [
                Row(
                  children: const [
                    BookCoverWidget(
                      width: 50,
                      height: 75,
                    ),
                    SizedBox(width: 6),
                    BookCoverWidget(
                      width: 50,
                      height: 75,
                    ),
                    SizedBox(width: 6),
                    BookCoverWidget(
                      width: 50,
                      height: 75,
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                Text(
                  'This period in stories',
                  style: AppText.bodySemiBold(14, context: context),
                ),
                const SizedBox(height: 4),
                Text(
                  '9 books · 3,214 pages · 4.5 avg rating',
                  style: AppText.body(
                    12,
                    context: context,
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 10),
        GradientButton(
          label: 'Share my Wrap',
          width: double.infinity,
          onPressed: onShare,
        ),
      ],
    );
  }
}

class _TierListSection extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final tiers = [
      ('God Tier', AppColors.tierGod),
      ('A Class', AppColors.tierA),
      ('✦ B Class', AppColors.tierB),
      ('C Class', AppColors.tierC),
    ];
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Tier List',
          style: AppText.display(18, context: context),
        ),
        const SizedBox(height: 8),
        ...tiers.map(
          (t) => ExpansionTile(
            tilePadding: EdgeInsets.zero,
            title: Text(
              t.$1,
              style: AppText.bodySemiBold(14),
            ),
            children: [
              GlassCard(
                padding: const EdgeInsets.all(10),
                child: Column(
                  children: List.generate(
                    3,
                    (index) => Padding(
                      padding:
                          const EdgeInsets.symmetric(
                        vertical: 4,
                      ),
                      child: Row(
                        children: [
                          const Icon(
                            Icons.drag_handle_rounded,
                            color: AppColors.textMuted,
                          ),
                          const SizedBox(width: 6),
                          Text(
                            'Beloved book ${index + 1}',
                            style: AppText.body(13),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _TropeDnaSection extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final sections = [
      PieChartSectionData(
        color: AppColors.primary,
        value: 35,
        title: '',
      ),
      PieChartSectionData(
        color: AppColors.secondary,
        value: 25,
        title: '',
      ),
      PieChartSectionData(
        color: AppColors.mystic,
        value: 20,
        title: '',
      ),
      PieChartSectionData(
        color: AppColors.gold,
        value: 20,
        title: '',
      ),
    ];

    return GlassCard(
      padding: const EdgeInsets.all(14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Your reading personality',
            style: AppText.display(18),
          ),
          const SizedBox(height: 10),
          SizedBox(
            height: 180,
            child: PieChart(
              PieChartData(
                sections: sections,
                sectionsSpace: 2,
                centerSpaceRadius: 40,
              ),
            ),
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 4,
            children: [
              _LegendDot(
                color: AppColors.primary,
                label: 'Romance',
              ),
              _LegendDot(
                color: AppColors.secondary,
                label: 'Angst',
              ),
              _LegendDot(
                color: AppColors.mystic,
                label: 'Magic',
              ),
              _LegendDot(
                color: AppColors.gold,
                label: 'Joy',
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _LegendDot extends StatelessWidget {
  final Color color;
  final String label;

  const _LegendDot({
    required this.color,
    required this.label,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 8,
          height: 8,
          decoration: BoxDecoration(
            color: color,
            shape: BoxShape.circle,
          ),
        ),
        const SizedBox(width: 4),
        Text(
          label,
          style: AppText.body(
            11,
            color: AppColors.textSecondary,
          ),
        ),
      ],
    );
  }
}

class _BingoSection extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return GlassCard(
      padding: const EdgeInsets.all(12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Reading Bingo',
            style: AppText.display(18),
          ),
          const SizedBox(height: 10),
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: 25,
            gridDelegate:
                const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 5,
              mainAxisSpacing: 4,
              crossAxisSpacing: 4,
            ),
            itemBuilder: (context, index) {
              final completed = index % 3 == 0;
              return AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(6),
                  gradient: completed
                      ? const LinearGradient(
                          colors: AppColors.gradientMystic,
                        )
                      : null,
                  border: Border.all(
                    color: completed
                        ? Colors.transparent
                        : AppColors.primary
                            .withOpacity(0.4),
                  ),
                  color:
                      completed ? null : AppColors.bgCard,
                ),
                child: Center(
                  child: Text(
                    'B${index + 1}',
                    style: AppText.body(
                      10,
                      color: completed
                          ? Colors.white
                          : AppColors.textSecondary,
                    ),
                  ),
                ),
              );
            },
          ),
        ],
      ),
    );
  }
}

