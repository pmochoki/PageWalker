import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';

import '../../core/config/supabase_config.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_text.dart';
import '../../core/widgets/glass_card.dart';
import '../../core/widgets/gradient_button.dart';
import '../../data/models/book.dart';
import '../../data/repositories/book_repository.dart';
import 'book_club_models.dart';

class ClubPollCreationSheet extends StatefulWidget {
  final String clubId;
  const ClubPollCreationSheet({super.key, required this.clubId});

  @override
  State<ClubPollCreationSheet> createState() => _ClubPollCreationSheetState();
}

class _ClubPollCreationSheetState extends State<ClubPollCreationSheet> {
  final _repo = BookRepository();
  final _question = TextEditingController(text: 'What should we read next?');
  final _search = TextEditingController();
  DateTime? _endsAt;

  final _options = <Book>[];
  List<Book> _results = [];
  Timer? _debounce;
  bool _searching = false;
  bool _creating = false;

  @override
  void dispose() {
    _debounce?.cancel();
    _question.dispose();
    _search.dispose();
    super.dispose();
  }

  void _onSearchChanged() {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 350), () async {
      final q = _search.text.trim();
      if (q.length < 3) {
        if (mounted) setState(() => _results = []);
        return;
      }
      setState(() => _searching = true);
      try {
        final res = await _repo.searchBooks(q);
        if (!mounted) return;
        setState(() => _results = res);
      } finally {
        if (mounted) setState(() => _searching = false);
      }
    });
  }

  Future<void> _create() async {
    final user = SupabaseConfig.client.auth.currentUser;
    if (user == null) return;
    if (_options.isEmpty) return;

    setState(() => _creating = true);
    try {
      final pollRow = await SupabaseConfig.client
          .from('book_club_polls')
          .insert({
            'club_id': widget.clubId,
            'created_by': user.id,
            'question': _question.text.trim().isEmpty
                ? 'What should we read next?'
                : _question.text.trim(),
            'ends_at': _endsAt?.toIso8601String(),
          })
          .select()
          .single();

      final poll = ClubPoll.fromSupabase(pollRow);

      for (final b in _options) {
        await SupabaseConfig.client.from('book_club_poll_options').insert({
          'poll_id': poll.id,
          'book_id': b.id,
          'label': '${b.title} — ${b.author}',
        });
      }

      // Also post a poll message in chat so it appears in the feed.
      await SupabaseConfig.client.from('book_club_messages').insert({
        'club_id': widget.clubId,
        'user_id': user.id,
        'content': poll.id,
        'message_type': 'poll',
        'contains_spoiler': false,
      });

      if (!mounted) return;
      Navigator.of(context).pop(true);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Could not create poll: $e')),
      );
    } finally {
      if (mounted) setState(() => _creating = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Padding(
        padding: EdgeInsets.only(
          left: 12,
          right: 12,
          top: 12,
          bottom: MediaQuery.of(context).viewInsets.bottom + 12,
        ),
        child: GlassCard(
          padding: const EdgeInsets.all(16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                'Start a poll',
                style: AppText.display(18, context: context),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _question,
                decoration: const InputDecoration(labelText: 'Question'),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _search,
                onChanged: (_) => _onSearchChanged(),
                decoration: const InputDecoration(
                  labelText: 'Add book options (search)',
                  hintText: 'Type a title...',
                ),
              ),
              const SizedBox(height: 10),
              if (_options.isNotEmpty)
                Wrap(
                  spacing: 10,
                  runSpacing: 10,
                  children: _options.map((b) {
                    return _OptionChip(
                      label: b.title,
                      onRemove: () => setState(() => _options.remove(b)),
                    );
                  }).toList(),
                ),
              const SizedBox(height: 10),
              if (_searching)
                const LinearProgressIndicator(color: AppColors.orangePrimary),
              if (_results.isNotEmpty)
                SizedBox(
                  height: 180,
                  child: ListView.builder(
                    itemCount: _results.length,
                    itemBuilder: (context, i) {
                      final b = _results[i];
                      return ListTile(
                        dense: true,
                        title: Text(
                          b.title,
                          style: AppText.bodySemiBold(13, context: context),
                        ),
                        subtitle: Text(
                          b.author,
                          style: AppText.body(12, context: context),
                        ),
                        trailing: IconButton(
                          onPressed: _options.length >= 4 ||
                                  _options.any((o) => o.id == b.id)
                              ? null
                              : () => setState(() => _options.add(b)),
                          icon: const Icon(Icons.add_circle_rounded),
                          color: AppColors.orangePrimary,
                        ),
                      );
                    },
                  ),
                ),
              const SizedBox(height: 10),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () async {
                        final picked = await showDatePicker(
                          context: context,
                          firstDate: DateTime.now(),
                          lastDate: DateTime.now().add(const Duration(days: 30)),
                        );
                        if (picked == null || !mounted) return;
                        final time = await showTimePicker(
                          context: context,
                          initialTime: const TimeOfDay(hour: 20, minute: 0),
                        );
                        if (time == null || !mounted) return;
                        setState(() {
                          _endsAt = DateTime(
                            picked.year,
                            picked.month,
                            picked.day,
                            time.hour,
                            time.minute,
                          );
                        });
                      },
                      style: OutlinedButton.styleFrom(
                        foregroundColor: AppColors.orangePrimary,
                        side: BorderSide(
                          color: AppColors.orangePrimary.withOpacity(0.45),
                        ),
                        minimumSize: const Size.fromHeight(48),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14),
                        ),
                      ),
                      child: Text(_endsAt == null ? 'Set end time' : 'Ends set'),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: GradientButton(
                      label: 'Create Poll',
                      width: double.infinity,
                      isLoading: _creating,
                      onPressed: _creating ? null : _create,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ).animate().slideY(begin: 0.18, end: 0).fadeIn(),
      ),
    );
  }
}

class _OptionChip extends StatelessWidget {
  final String label;
  final VoidCallback onRemove;
  const _OptionChip({required this.label, required this.onRemove});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(999),
        color: AppColors.darkCard,
        border: Border.all(color: AppColors.orangePrimary.withOpacity(0.25)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            label,
            style: AppText.body(12, context: context),
          ),
          const SizedBox(width: 6),
          GestureDetector(
            onTap: onRemove,
            child: Icon(
              Icons.close_rounded,
              size: 16,
              color: Colors.white.withOpacity(0.55),
            ),
          ),
        ],
      ),
    );
  }
}

