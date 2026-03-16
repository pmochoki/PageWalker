import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../theme/app_colors.dart';
import '../../features/splash/splash_screen.dart';
import '../../features/auth/login_screen.dart';
import '../../features/auth/signup_screen.dart';
import '../../features/home/home_screen.dart';
import '../../features/library/library_screen.dart';
import '../../features/discover/discover_screen.dart';
import '../../features/social/social_screen.dart';
import '../../features/profile/profile_screen.dart';
import '../../features/book_detail/book_detail_screen.dart';

final appRouter = GoRouter(
  initialLocation: '/',
  routes: [
    GoRoute(
      path: '/',
      builder: (context, state) => const SplashScreen(),
    ),
    GoRoute(
      path: '/auth/login',
      pageBuilder: (context, state) => _fadePage(
        const LoginScreen(),
      ),
    ),
    GoRoute(
      path: '/auth/signup',
      pageBuilder: (context, state) => _fadePage(
        const SignupScreen(),
      ),
    ),
    ShellRoute(
      builder: (context, state, child) => MainShell(child: child),
      routes: [
        GoRoute(
          path: '/home',
          builder: (c, s) => const HomeScreen(),
        ),
        GoRoute(
          path: '/library',
          builder: (c, s) => const LibraryScreen(),
        ),
        GoRoute(
          path: '/discover',
          builder: (c, s) => const DiscoverScreen(),
        ),
        GoRoute(
          path: '/social',
          builder: (c, s) => const SocialScreen(),
        ),
        GoRoute(
          path: '/profile',
          builder: (c, s) => const ProfileScreen(),
        ),
      ],
    ),
    GoRoute(
      path: '/book/:id',
      pageBuilder: (context, state) => _fadePage(
        BookDetailScreen(
          bookId: state.pathParameters['id']!,
        ),
      ),
    ),
  ],
);

CustomTransitionPage _fadePage(Widget child) {
  return CustomTransitionPage(
    child: child,
    transitionsBuilder:
        (context, animation, secondaryAnimation, child) {
      return FadeTransition(
        opacity: animation,
        child: SlideTransition(
          position: Tween<Offset>(
            begin: const Offset(0, 0.04),
            end: Offset.zero,
          ).animate(
            CurvedAnimation(
              parent: animation,
              curve: Curves.easeOutCubic,
            ),
          ),
          child: child,
        ),
      );
    },
  );
}

class MainShell extends StatefulWidget {
  final Widget child;

  const MainShell({super.key, required this.child});

  @override
  State<MainShell> createState() => _MainShellState();
}

class _MainShellState extends State<MainShell> {
  int _currentIndex = 0;
  final _routes = [
    '/home',
    '/library',
    '/discover',
    '/social',
    '/profile',
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: widget.child,
      bottomNavigationBar: _PagewalkerNavBar(
        currentIndex: _currentIndex,
        onTap: (i) {
          setState(() => _currentIndex = i);
          context.go(_routes[i]);
        },
      ),
    );
  }
}

class _PagewalkerNavBar extends StatelessWidget {
  final int currentIndex;
  final ValueChanged<int> onTap;

  const _PagewalkerNavBar({
    required this.currentIndex,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final items = [
      (Icons.home_rounded, Icons.home_outlined, 'Home'),
      (
        Icons.local_library_rounded,
        Icons.local_library_outlined,
        'Library'
      ),
      (Icons.auto_awesome_rounded,
          Icons.auto_awesome_outlined, 'Discover'),
      (
        Icons.chat_bubble_rounded,
        Icons.chat_bubble_outline_rounded,
        'Social'
      ),
      (Icons.person_rounded, Icons.person_outline_rounded, 'Profile'),
    ];
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      decoration: BoxDecoration(
        color: isDark ? AppColors.darkBg : AppColors.lightBg,
        border: Border(
          top: BorderSide(
            color: AppColors.orangePrimary.withOpacity(0.2),
            width: 1,
          ),
        ),
        boxShadow: [
          BoxShadow(
            color: AppColors.orangePrimary.withOpacity(0.1),
            blurRadius: 20,
            offset: const Offset(0, -5),
          ),
        ],
      ),
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 8),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: List.generate(items.length, (i) {
              final selected = currentIndex == i;
              return GestureDetector(
                onTap: () => onTap(i),
                behavior: HitTestBehavior.opaque,
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 200),
                  padding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 8,
                  ),
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(20),
                    color: selected
                        ? AppColors.orangePrimary.withOpacity(0.12)
                        : Colors.transparent,
                  ),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        selected ? items[i].$1 : items[i].$2,
                        color: selected
                            ? AppColors.orangePrimary
                            : (isDark
                                ? AppColors.darkTextMuted
                                : AppColors.lightTextMuted),
                        size: 24,
                        shadows: selected
                            ? const [
                                Shadow(
                                  color: Color(0xFFC084FC),
                                  blurRadius: 8,
                                )
                              ]
                            : null,
                      ),
                      const SizedBox(height: 2),
                      Text(
                        items[i].$3,
                        style: TextStyle(
                          fontSize: 10,
                          color: selected
                              ? AppColors.orangePrimary
                              : (isDark
                                  ? AppColors.darkTextMuted
                                  : AppColors.lightTextMuted),
                          fontWeight: selected
                              ? FontWeight.w700
                              : FontWeight.w400,
                        ),
                      ),
                    ],
                  ),
                ),
              );
            }),
          ),
        ),
      ),
    );
  }
}

