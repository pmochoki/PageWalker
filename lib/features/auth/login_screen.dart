import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../core/config/supabase_config.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_text.dart';
import '../../core/widgets/glass_card.dart';
import '../../core/widgets/gradient_button.dart';
import '../../core/widgets/dynamic_sky_background.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _formKey = GlobalKey<FormState>();
  bool _isLoading = false;
  String? _errorMessage;

  SupabaseClient get _client => SupabaseConfig.client;

  Future<void> _signIn() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });
    try {
      final res = await _client.auth.signInWithPassword(
        email: _emailController.text.trim(),
        password: _passwordController.text,
      );
      if (res.session != null) {
        if (!mounted) return;
        context.go('/home');
      } else {
        setState(() {
          _errorMessage = 'Could not sign in. Please try again.';
        });
      }
    } on AuthException catch (e) {
      setState(() {
        _errorMessage = e.message;
      });
    } catch (_) {
      setState(() {
        _errorMessage =
            'Something went wrong. Please try again in a moment.';
      });
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: DynamicSkyBackground(
        child: SafeArea(
          child: Center(
            child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(
                  horizontal: 24,
                  vertical: 16,
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      'Pagewalker',
                      style: AppText.script(52).copyWith(
                        shadows: const [
                          Shadow(
                            color: AppColors.orangePrimary,
                            blurRadius: 30,
                          ),
                        ],
                      ),
                      textAlign: TextAlign.center,
                    )
                        .animate()
                        .fadeIn(duration: 500.ms)
                        .slideY(begin: -0.2, end: 0),
                    const SizedBox(height: 8),
                    Text(
                      'Your story begins here',
                      style: AppText.displayItalic(18),
                      textAlign: TextAlign.center,
                    )
                        .animate()
                        .fadeIn(delay: 200.ms, duration: 500.ms)
                        .slideY(begin: -0.1, end: 0),
                    const SizedBox(height: 32),
                    if (_errorMessage != null)
                      GlassCard(
                        padding: const EdgeInsets.all(12),
                        borderColor: Colors.red.withOpacity(0.5),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Icon(
                              Icons.error_outline,
                              color: Colors.red,
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                _errorMessage!,
                                style: AppText.body(13, context: context),
                              ),
                            ),
                          ],
                        ),
                      )
                          .animate()
                          .fadeIn(duration: 300.ms)
                          .slideY(begin: -0.1, end: 0),
                    if (_errorMessage != null) const SizedBox(height: 16),
                    GlassCard(
                      padding: const EdgeInsets.all(20),
                      child: Form(
                        key: _formKey,
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            Text(
                              'Welcome back, dreamer ✦',
                              style: AppText.display(22, context: context),
                            )
                                .animate()
                                .fadeIn(duration: 400.ms),
                            const SizedBox(height: 4),
                            Text(
                              'Sign in to keep walking through your worlds.',
                              style: AppText.body(
                                14,
                                context: context,
                              ),
                            )
                                .animate()
                                .fadeIn(delay: 100.ms, duration: 400.ms),
                            const SizedBox(height: 20),
                            TextFormField(
                              controller: _emailController,
                              keyboardType: TextInputType.emailAddress,
                              decoration: const InputDecoration(
                                labelText: 'Email',
                              ),
                              style: AppText.body(14, context: context),
                              validator: (value) {
                                if (value == null ||
                                    value.trim().isEmpty) {
                                  return 'Please enter your email';
                                }
                                if (!value.contains('@')) {
                                  return 'Please enter a valid email';
                                }
                                return null;
                              },
                            )
                                .animate()
                                .fadeIn(delay: 150.ms, duration: 400.ms)
                                .slideY(begin: 0.1, end: 0),
                            const SizedBox(height: 16),
                            TextFormField(
                              controller: _passwordController,
                              obscureText: true,
                              decoration: const InputDecoration(
                                labelText: 'Password',
                              ),
                              style: AppText.body(14, context: context),
                              validator: (value) {
                                if (value == null ||
                                    value.trim().isEmpty) {
                                  return 'Please enter your password';
                                }
                                if (value.length < 6) {
                                  return 'Password must be at least 6 characters';
                                }
                                return null;
                              },
                            )
                                .animate()
                                .fadeIn(delay: 200.ms, duration: 400.ms)
                                .slideY(begin: 0.1, end: 0),
                            const SizedBox(height: 24),
                            GradientButton(
                              label: 'Sign In',
                              isLoading: _isLoading,
                              onPressed: _isLoading ? null : _signIn,
                            )
                                .animate()
                                .fadeIn(delay: 250.ms, duration: 400.ms)
                                .slideY(begin: 0.1, end: 0),
                            const SizedBox(height: 12),
                            GestureDetector(
                              onTap: () {
                                context.go('/auth/signup');
                              },
                              child: Center(
                                child: Text(
                                  'Don’t have an account? Sign Up',
                                  style: AppText.body(
                                    13,
                                    context: context,
                                  ),
                                ),
                              ),
                            )
                                .animate()
                                .fadeIn(delay: 300.ms, duration: 400.ms),
                          ],
                        ),
                      ),
                    )
                        .animate()
                        .fadeIn(delay: 150.ms, duration: 500.ms)
                        .slideY(begin: 0.15, end: 0),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

