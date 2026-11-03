import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';

import 'state/app_state.dart';
import 'ui/home/home_screen.dart';
import 'ui/library/library_screen.dart';
import 'ui/progress/progress_screen.dart';
import 'ui/routines/routines_screen.dart';
import 'ui/theme.dart';
import 'ui/workout/workout_screen.dart';

class ShapeXApp extends StatelessWidget {
  const ShapeXApp({super.key, required this.state});

  final AppState state;

  @override
  Widget build(BuildContext context) {
    return AppScope(
      state: state,
      child: MaterialApp(
        title: 'Shape X',
        debugShowCheckedModeBanner: false,
        theme: buildTheme(),
        locale: const Locale('pt', 'BR'),
        supportedLocales: const [Locale('pt', 'BR')],
        localizationsDelegates: const [
          GlobalMaterialLocalizations.delegate,
          GlobalWidgetsLocalizations.delegate,
          GlobalCupertinoLocalizations.delegate,
        ],
        home: const RootShell(),
      ),
    );
  }
}

class RootShell extends StatefulWidget {
  const RootShell({super.key});

  @override
  State<RootShell> createState() => RootShellState();
}

class RootShellState extends State<RootShell> {
  int index = 0;

  void go(int i) => setState(() => index = i);

  @override
  Widget build(BuildContext context) {
    final app = AppScope.of(context);
    return Scaffold(
      body: IndexedStack(
        index: index,
        children: const [
          HomeScreen(),
          RoutinesScreen(),
          LibraryScreen(),
          ProgressScreen(),
        ],
      ),
      bottomNavigationBar: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (app.workout != null) const ActiveWorkoutBar(),
          NavigationBar(
            selectedIndex: index,
            onDestinationSelected: go,
            destinations: const [
              NavigationDestination(
                  icon: Icon(Icons.home_outlined), selectedIcon: Icon(Icons.home_rounded), label: 'Início'),
              NavigationDestination(
                  icon: Icon(Icons.calendar_view_week_outlined),
                  selectedIcon: Icon(Icons.calendar_view_week_rounded),
                  label: 'Treinos'),
              NavigationDestination(
                  icon: Icon(Icons.fitness_center_outlined),
                  selectedIcon: Icon(Icons.fitness_center_rounded),
                  label: 'Exercícios'),
              NavigationDestination(
                  icon: Icon(Icons.insights_outlined), selectedIcon: Icon(Icons.insights_rounded), label: 'Progresso'),
            ],
          ),
        ],
      ),
    );
  }
}

class ActiveWorkoutBar extends StatelessWidget {
  const ActiveWorkoutBar({super.key});

  @override
  Widget build(BuildContext context) {
    final app = AppScope.of(context);
    final w = app.workout!;
    return Material(
      color: AppColors.cardHigh,
      child: InkWell(
        onTap: () => openWorkout(context),
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 10, 12, 10),
          child: Row(
            children: [
              Container(
                width: 8,
                height: 8,
                decoration: const BoxDecoration(color: AppColors.accent, shape: BoxShape.circle),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: ValueListenableBuilder<int>(
                  valueListenable: w.tick,
                  builder: (_, _, _) => Text(
                    '${w.session.name}  ·  ${w.elapsedLabel()}'
                    '${w.resting ? '  ·  descanso ${fmtRestShort(w.restRemaining)}' : ''}',
                    style: const TextStyle(fontWeight: FontWeight.w700, fontFeatures: tabular),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ),
              const Text('Retomar',
                  style: TextStyle(color: AppColors.accent, fontWeight: FontWeight.w800)),
              const Icon(Icons.chevron_right_rounded, color: AppColors.accent),
            ],
          ),
        ),
      ),
    );
  }
}

String fmtRestShort(int s) => '${s ~/ 60}:${(s % 60).toString().padLeft(2, '0')}';
