// Gera capturas das telas para revisão visual:
// flutter test test_screens/screens_test.dart --update-goldens
import 'dart:io';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shape_x/app.dart';
import 'package:shape_x/data/models.dart';
import 'package:shape_x/logic/formatters.dart';
import 'package:shape_x/state/app_state.dart';
import 'package:shape_x/state/workout_controller.dart';
import 'package:shape_x/ui/library/exercise_detail_screen.dart';
import 'package:shape_x/ui/routines/programs_screen.dart';
import 'package:shape_x/ui/routines/routine_detail_screen.dart';
import 'package:shape_x/ui/theme.dart';
import 'package:shape_x/ui/workout/workout_screen.dart';
import 'package:shape_x/ui/workout/workout_summary_screen.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';

import '../test/helpers.dart';

Future<void> _loadFonts() async {
  final root = Platform.environment['FLUTTER_ROOT']!;
  final dir = '$root/bin/cache/artifacts/material_fonts';
  Future<ByteData> bytes(String f) async => ByteData.view((await File('$dir/$f').readAsBytes()).buffer);
  final roboto = FontLoader('Roboto');
  for (final f in ['roboto-regular.ttf', 'roboto-medium.ttf', 'roboto-bold.ttf', 'roboto-black.ttf']) {
    roboto.addFont(bytes(f));
  }
  await roboto.load();
  await (FontLoader('MaterialIcons')..addFont(bytes('materialicons-regular.otf'))).load();
}

double _base(Exercise e) {
  if (e.id == 'leg_press') return 140;
  if (e.id == 'hack_squat') return 60;
  return switch (e.equipment) {
    Equipment.maquina => 45,
    Equipment.polia => 15,
    Equipment.halteres => 18,
    Equipment.barra => 30,
    Equipment.smith => 30,
    Equipment.pesoCorporal => 0,
  };
}

Future<void> _seed(AppState app) async {
  final routines = await app.repo.routines();
  final now = DateTime.now();
  final week0 = startOfWeek(now).subtract(const Duration(days: 21));
  for (var k = 0; k < 4; k++) {
    for (final r in routines) {
      final day = week0.add(Duration(days: 7 * k + r.weekday! - 1));
      if (!day.isBefore(dateOnly(now))) continue;
      final sets = <String, List<(double, int)>>{};
      for (final re in r.exercises) {
        final e = app.exercises[re.exerciseId]!;
        final reps = math.min(re.repMax, re.repMin + 1 + k);
        sets[e.id] = List.generate(re.sets, (i) => (_base(e), math.max(re.repMin, reps - (i == re.sets - 1 && k < 2 ? 1 : 0))));
      }
      await seedSession(app.repo, r, DateTime(day.year, day.month, day.day, 18, 10), sets);
    }
  }
  for (var i = 0; i < 24; i++) {
    final d = dateOnly(now).subtract(Duration(days: 23 - i));
    final w = 89.4 - i * 0.03 + (i % 3 == 0 ? 0.3 : (i % 3 == 1 ? -0.2 : 0.1));
    await app.repo.saveBodyWeight(d, double.parse(w.toStringAsFixed(1)));
  }
}

Widget _wrap(AppState app, Widget home) => AppScope(
      state: app,
      child: MaterialApp(
        debugShowCheckedModeBanner: false,
        theme: buildTheme(),
        locale: const Locale('pt', 'BR'),
        supportedLocales: const [Locale('pt', 'BR')],
        localizationsDelegates: const [
          GlobalMaterialLocalizations.delegate,
          GlobalWidgetsLocalizations.delegate,
          GlobalCupertinoLocalizations.delegate,
        ],
        home: home,
      ),
    );

Future<void> _settle(WidgetTester tester) async {
  for (var i = 0; i < 8; i++) {
    await tester.pump(const Duration(milliseconds: 100));
  }
}

Future<void> _shot(WidgetTester tester, Widget w, String name) async {
  await tester.pumpWidget(RepaintBoundary(key: const Key('root'), child: w));
  await _settle(tester);
  await expectLater(find.byKey(const Key('root')), matchesGoldenFile('shots/$name.png'));
}

void main() {
  sqfliteFfiInit();

  testWidgets('capturas das telas', (tester) async {
    mockPlatform();
    tester.view.physicalSize = const Size(412 * 2.0, 915 * 2.0);
    tester.view.devicePixelRatio = 2.0;
    addTearDown(tester.view.reset);
    await tester.runAsync(_loadFonts);

    final path = (await tester.runAsync(tempDbPath))!;
    final app = (await tester.runAsync(() => openApp(path, factory: databaseFactoryFfiNoIsolate)))!;
    await tester.runAsync(() => _seed(app));

    await _shot(tester, ShapeXApp(state: app), '01_inicio');

    final routines = (await tester.runAsync(() => app.repo.routines()))!;
    await _shot(tester, _wrap(app, RoutineDetailScreen(routineId: routines.first.id!)), '02_treino_detalhe');

    await _shot(tester, _wrap(app, const ExerciseDetailScreen(exerciseId: 'supino_inclinado_maquina')),
        '03_exercicio');

    final w = (await tester.runAsync(() => app.startWorkout(routines.first)))!;
    await tester.runAsync(() async {
      final se = w.session.exercises.first;
      w.applyRecommendation(se);
      await w.toggleSet(se, se.sets[0]);
      await w.toggleSet(se, se.sets[1]);
      await w.flush();
    });
    await _shot(tester, _wrap(app, const WorkoutScreen()), '04_treino_em_andamento');

    await _shot(
      tester,
      _wrap(
        app,
        WorkoutSummaryScreen(
          summary: FinishSummary(
            name: 'Peito e Tríceps',
            duration: const Duration(minutes: 58),
            sets: 19,
            volume: 9820,
            exercises: 6,
            records: const [('Supino Inclinado na Máquina', 'Maior carga: 50 kg × 8')],
            goals: const [('Peck Deck (Voador)', 'Meta batida (3×15). Suba para 50 kg')],
            previous: Session(
              name: 'Peito e Tríceps',
              startedAt: DateTime(2026, 10, 27, 18),
              endedAt: DateTime(2026, 10, 27, 19, 1),
              exercises: [
                SessionExercise(
                  sessionId: 0,
                  exerciseId: 'supino_convergente',
                  position: 0,
                  setsPlanned: 18,
                  repMin: 8,
                  repMax: 12,
                  restSec: 120,
                  sets: [
                    for (var i = 0; i < 18; i++)
                      SetLog(sessionExerciseId: 0, index: i, weight: 51, reps: 10, done: true),
                  ],
                ),
              ],
            ),
            compared: 6,
            improved: 4,
            worse: 1,
          ),
        ),
      ),
      '05_resumo',
    );

    w.stop();
    app.workout = null;
    final shell = ShapeXApp(state: app);
    await tester.pumpWidget(RepaintBoundary(key: const Key('root'), child: shell));
    await _settle(tester);
    await tester.tap(find.byIcon(Icons.fitness_center_outlined));
    await _settle(tester);
    await expectLater(find.byKey(const Key('root')), matchesGoldenFile('shots/06_biblioteca.png'));

    await tester.tap(find.byIcon(Icons.insights_outlined));
    await _settle(tester);
    await tester.tap(find.text('Gráficos'));
    await _settle(tester);
    await expectLater(find.byKey(const Key('root')), matchesGoldenFile('shots/07_graficos.png'));

    await tester.tap(find.text('Peso'));
    await _settle(tester);
    await expectLater(find.byKey(const Key('root')), matchesGoldenFile('shots/08_peso.png'));

    await tester.tap(find.byIcon(Icons.calendar_view_week_outlined));
    await _settle(tester);
    await expectLater(find.byKey(const Key('root')), matchesGoldenFile('shots/09_semana.png'));

    await _shot(tester, _wrap(app, const ProgramsScreen()), '10_programas');

    await tester.pumpWidget(const SizedBox());
    await tester.runAsync(() => app.repo.adb.close());
  });
}
