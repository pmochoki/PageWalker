import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'core/config/supabase_config.dart';
import 'core/providers/theme_provider.dart';
import 'core/router/app_router.dart';
import 'core/services/notification_service.dart';
import 'core/theme/app_theme.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
    DeviceOrientation.portraitDown,
  ]);
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
    ),
  );
  await NotificationService().initialize();
  await SupabaseConfig.initialize();
  SupabaseConfig.client.auth.onAuthStateChange.listen((data) {
    if (data.event == AuthChangeEvent.passwordRecovery) {
      appRouter.go('/auth/update-password');
    }
  });
  if (!SupabaseConfig.isConnected) {
    debugPrint(
      'WARNING: Supabase credentials not set or still contain placeholders in env.dart',
    );
  }
  runApp(const ProviderScope(child: PagewalkerApp()));
}

class PagewalkerApp extends ConsumerWidget {
  const PagewalkerApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final themeMode = ref.watch(themeProvider);
    final appTheme = ref.watch(appThemeProvider);
    return MaterialApp.router(
      title: 'Pagewalker',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.buildTheme(appTheme, ThemeMode.light),
      darkTheme: AppTheme.buildTheme(appTheme, ThemeMode.dark),
      themeMode: themeMode,
      routerConfig: appRouter,
    );
  }
}
