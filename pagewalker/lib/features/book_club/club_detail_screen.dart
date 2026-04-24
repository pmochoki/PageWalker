import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:go_router/go_router.dart';

import '../../core/config/supabase_config.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_text.dart';
import '../../core/widgets/themed_background.dart';
import '../../core/widgets/glass_card.dart';
import '../../core/widgets/gradient_button.dart';
import '../../data/models/book.dart';
import '../../data/repositories/book_repository.dart';
import 'book_club_models.dart';

class ClubDetailScreen extends StatefulWidget {
  final String clubId;
  const ClubDetailScreen({super.key, required this.clubId});

  @override
  State<ClubDetailScreen> createState() => _ClubDetailScreenState();
}

class _ClubDetailScreenState extends State<ClubDetailScreen> {
  final _bookRepo = BookRepository();

  Future<(BookClub club, int membersCount, Book? currentBook)> _load() async {
    final clubRow = await SupabaseConfig.client
        .from('book_clubs')
        .select()
        .eq('id', widget.clubId)
        .single();
    final club = BookClub.fromSupabase(clubRow);

    final members = await SupabaseConfig.client
        .from('book_club_members')
        .select('id')
        .eq('club_id', widget.clubId);
    final count = (members as List).length;

    Book? current;
    if (club.currentBookId != null) {
      try {
        current = await _bookRepo.getBookById(club.currentBookId!);
      } catch (_) {}
    }
    return (club, count, current);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: ThemedBackground(
        child: SafeArea(
          child: FutureBuilder<(BookClub, int, Book?)>(
            future: _load(),
            builder: (context, snapshot) {
              final data = snapshot.data;
              final club = data?.$1;
              final membersCount = data?.$2 ?? 0;
              final currentBook = data?.$3;

              return CustomScrollView(
                slivers: [
                  SliverAppBar(
                    pinned: true,
                    backgroundColor: Colors.transparent,
                    elevation: 0,
                    leading: IconButton(
                      onPressed: () => context.pop(),
                      icon: const Icon(Icons.arrow_back_rounded),
                      color: AppColors.orangePrimary,
                    ),
                    title: Text(
                      club == null ? 'Book Club' : '${club.coverEmoji} ${club.name}',
                      style: AppText.display(20, context: context),
                    ),
                  ),
                  if (snapshot.connectionState == ConnectionState.waiting)
                    const SliverFillRemaining(
                      child: Center(
                        child: CircularProgressIndicator(
                          color: AppColors.orangePrimary,
                        ),
                      ),
                    )
                  else
                    SliverToBoxAdapter(
                      child: Padding(
                        padding: const EdgeInsets.fromLTRB(16, 10, 16, 24),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            GlassCard(
                              padding: const EdgeInsets.all(16),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    '$membersCount members',
                                    style: AppText.body(
                                      12,
                                      color: AppColors.textSecondary,
                                    ),
                                  ),
                                  const SizedBox(height: 10),
                                  if (currentBook != null)
                                    Row(
                                      children: [
                                        ClipRRect(
                                          borderRadius: BorderRadius.circular(12),
                                          child: SizedBox(
                                            width: 64,
                                            height: 96,
                                            child: currentBook.coverUrl == null
                                                ? Container(
                                                    color: AppColors.darkCard,
                                                    alignment: Alignment.center,
                                                    child: const Text('✦'),
                                                  )
                                                : Image.network(
                                                    currentBook.coverUrl!,
                                                    fit: BoxFit.cover,
                                                  ),
                                          ),
                                        ),
                                        const SizedBox(width: 12),
                                        Expanded(
                                          child: Column(
                                            crossAxisAlignment: CrossAxisAlignment.start,
                                            children: [
                                              Text(
                                                currentBook.title,
                                                style: AppText.bodySemiBold(15, context: context),
                                                maxLines: 2,
                                                overflow: TextOverflow.ellipsis,
                                              ),
                                              const SizedBox(height: 4),
                                              Text(
                                                currentBook.author,
                                                style: AppText.body(
                                                  12,
                                                  context: context,
                                                  color: AppColors.textSecondary,
                                                ),
                                                maxLines: 1,
                                                overflow: TextOverflow.ellipsis,
                                              ),
                                              const SizedBox(height: 10),
                                              GradientButton(
                                                label: 'Discuss this book →',
                                                width: double.infinity,
                                                onPressed: () => context.push('/clubs/${widget.clubId}/chat'),
                                              ),
                                            ],
                                          ),
                                        )
                                      ],
                                    )
                                  else
                                    Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          'No current book',
                                          style: AppText.bodySemiBold(14, context: context),
                                        ),
                                        const SizedBox(height: 6),
                                        Text(
                                          'Start a poll to choose your next read.',
                                          style: AppText.body(
                                            12,
                                            context: context,
                                            color: AppColors.textSecondary,
                                          ),
                                        ),
                                        const SizedBox(height: 10),
                                        GradientButton(
                                          label: 'Discuss →',
                                          width: double.infinity,
                                          onPressed: () => context.push('/clubs/${widget.clubId}/chat'),
                                        ),
                                      ],
                                    ),
                                ],
                              ),
                            ).animate().fadeIn(duration: 420.ms).slideY(begin: 0.08, end: 0),
                            const SizedBox(height: 12),
                            GlassCard(
                              padding: const EdgeInsets.all(16),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    'Invite code',
                                    style: AppText.bodySemiBold(14, color: AppColors.orangePrimary),
                                  ),
                                  const SizedBox(height: 8),
                                  Row(
                                    children: [
                                      Expanded(
                                        child: Text(
                                          club?.inviteCode ?? '—',
                                          style: AppText.bodySemiBold(14, context: context),
                                        ),
                                      ),
                                      IconButton(
                                        onPressed: club?.inviteCode == null
                                            ? null
                                            : () async {
                                                await Clipboard.setData(
                                                  ClipboardData(text: club!.inviteCode),
                                                );
                                                if (context.mounted) {
                                                  ScaffoldMessenger.of(context).showSnackBar(
                                                    const SnackBar(content: Text('Copied')),
                                                  );
                                                }
                                              },
                                        icon: const Icon(Icons.copy_rounded),
                                        color: AppColors.orangePrimary,
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                            ).animate().fadeIn(delay: 70.ms, duration: 420.ms).slideY(begin: 0.08, end: 0),
                          ],
                        ),
                      ),
                    ),
                ],
              );
            },
          ),
        ),
      ),
    );
  }
}

