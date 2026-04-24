import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../core/config/supabase_config.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_text.dart';
import '../../core/widgets/glass_card.dart';
import '../../core/widgets/gradient_button.dart';
import '../../core/widgets/themed_background.dart';

/// Same deep link host as OAuth; add to Supabase Auth redirect URLs.
const String _mobilePasswordRedirect = 'com.pagewalker.app://login-callback';

class ForgotPasswordScreen extends StatefulWidget {
  const ForgotPasswordScreen({super.key});

  @override
  State<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends State<ForgotPasswordScreen> {
  final _emailController = TextEditingController();
  final _formKey = GlobalKey<FormState>();
  bool _isLoading = false;
  String? _errorMessage;
  String? _successMessage;

  SupabaseClient get _client => SupabaseConfig.client;

  Future<void> _sendReset() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _isLoading = true;
      _errorMessage = null;
      _successMessage = null;
    });
    try {
      await _client.auth.resetPasswordForEmail(
        _emailController.text.trim(),
        redirectTo: kIsWeb ? null : _mobilePasswordRedirect,
      );
      if (!mounted) return;
      setState(() {
        _successMessage =
            'If an account exists for that email, we sent a reset link. '
            'Check your inbox and spam folder. On the app, open the link to choose a new password.';
      });
    } on AuthException catch (e) {
      setState(() => _errorMessage = e.message);
    } catch (_) {
      setState(() {
        _errorMessage = 'Something went wrong. Please try again in a moment.';
      });
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  void dispose() {
    _emailController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: ThemedBackground(
        child: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    'Reset password',
                    style: AppText.display(26, context: context),
                    textAlign: TextAlign.center,
                  ).animate().fadeIn(duration: 400.ms),
                  const SizedBox(height: 8),
                  Text(
                    'We will email you a link to choose a new password.',
                    style: AppText.body(14, context: context),
                    textAlign: TextAlign.center,
                  ).animate().fadeIn(delay: 80.ms, duration: 400.ms),
                  const SizedBox(height: 28),
                  if (_errorMessage != null)
                    GlassCard(
                      padding: const EdgeInsets.all(12),
                      borderColor: Colors.red.withValues(alpha: 0.5),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Icon(Icons.error_outline, color: Colors.red),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              _errorMessage!,
                              style: AppText.body(13, context: context),
                            ),
                          ),
                        ],
                      ),
                    ),
                  if (_errorMessage != null) const SizedBox(height: 16),
                  if (_successMessage != null)
                    GlassCard(
                      padding: const EdgeInsets.all(12),
                      borderColor:
                          AppColors.webLogoOrange.withValues(alpha: 0.35),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Icon(
                            Icons.mark_email_read_outlined,
                            color: AppColors.webLogoOrange,
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              _successMessage!,
                              style: AppText.body(13, context: context),
                            ),
                          ),
                        ],
                      ),
                    ),
                  if (_successMessage != null) const SizedBox(height: 16),
                  GlassCard(
                    padding: const EdgeInsets.all(20),
                    child: Form(
                      key: _formKey,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          TextFormField(
                            controller: _emailController,
                            keyboardType: TextInputType.emailAddress,
                            decoration: const InputDecoration(
                              labelText: 'Email',
                            ),
                            style: AppText.body(14, context: context),
                            validator: (value) {
                              if (value == null || value.trim().isEmpty) {
                                return 'Please enter your email';
                              }
                              if (!value.contains('@')) {
                                return 'Please enter a valid email';
                              }
                              return null;
                            },
                          ),
                          const SizedBox(height: 22),
                          GradientButton(
                            label: 'Send reset link',
                            isLoading: _isLoading,
                            onPressed: _isLoading ? null : _sendReset,
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  TextButton(
                    onPressed: () => context.go('/auth/login'),
                    child: const Text('Back to sign in'),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
