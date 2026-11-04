import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shape_x/app.dart';
import 'package:shape_x/ui/progress/progress_screen.dart';
import 'package:shape_x/ui/routines/programs_screen.dart';
import 'package:shape_x/ui/routines/routines_screen.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';

import 'helpers.dart';

Future<void> settle(WidgetTester tester, {int frames = 6}) async {
  for (var i = 0; i < frames; i++) {
    await tester.pump(const Duration(milliseconds: 120));
  }
}

void main() {
  sqfliteFfiInit();

  testWidgets('fluxo pela interface: iniciar, registrar, descansar, finalizar e reabrir', (tester) async {
    mockPlatform();
    tester.view.physicalSize = const Size(1080, 2340);
    tester.view.devicePixelRatio = 2.6;
    addTearDown(tester.view.reset);

    final path = (await tester.runAsync(tempDbPath))!;
    var app = (await tester.runAsync(() => openApp(path, factory: databaseFactoryFfiNoIsolate)))!;
    await tester.pumpWidget(ShapeXApp(state: app));
    await settle(tester);
    expect(find.text('Shape X'), findsOneWidget);

    await tester.tap(find.byIcon(Icons.calendar_view_week_outlined));
    await settle(tester);
    final card = find.widgetWithText(RoutineCard, 'Peito e Tríceps');
    expect(card, findsOneWidget);
    await tester.ensureVisible(card);
    await tester.pump();
    await tester.tap(card);
    await settle(tester);
    expect(find.text('Supino Inclinado na Máquina'), findsOneWidget);

    await tester.tap(find.byKey(const Key('start_routine')));
    await settle(tester, frames: 10);
    expect(app.workout, isNotNull);
    expect(find.byKey(const Key('finish_workout')), findsOneWidget);

    final seId = app.workout!.session.exercises.first.id;
    await tester.enterText(find.byKey(Key('kg_${seId}_0')), '42,5');
    await tester.enterText(find.byKey(Key('reps_${seId}_0')), '9');
    await tester.pump();
    await tester.tap(find.byKey(Key('check_${seId}_0')));
    await settle(tester);

    final set0 = app.workout!.session.exercises.first.sets[0];
    expect(set0.done, isTrue);
    expect(set0.weight, 42.5);
    expect(set0.reps, 9);
    expect(find.byKey(const Key('rest_time')), findsOneWidget);
    expect(find.text('Descanso'), findsOneWidget);
    final before = app.workout!.restRemaining;
    await tester.tap(find.text('+15'));
    await tester.pump();
    expect(app.workout!.restRemaining, greaterThanOrEqualTo(before + 14));
    await tester.tap(find.byKey(const Key('skip_rest')));
    await settle(tester);
    expect(find.byKey(const Key('rest_time')), findsNothing);

    await tester.tap(find.byKey(Key('check_${seId}_1')));
    await settle(tester);
    final set1 = app.workout!.session.exercises.first.sets[1];
    expect(set1.done, isTrue, reason: 'segunda série marcada com um toque');
    expect(set1.weight, 42.5);
    expect(set1.reps, 9);

    await tester.tap(find.byKey(const Key('finish_workout')));
    await settle(tester);
    expect(find.text('Finalizar treino?'), findsOneWidget);
    await tester.tap(find.descendant(of: find.byType(AlertDialog), matching: find.text('Finalizar')));
    await settle(tester, frames: 10);
    expect(find.text('Treino concluído'), findsOneWidget);
    expect(app.workout, isNull);
    await tester.tap(find.byKey(const Key('summary_done')));
    await settle(tester);

    await tester.pumpWidget(const SizedBox());
    await tester.runAsync(() => app.repo.adb.close());

    app = (await tester.runAsync(() => openApp(path, factory: databaseFactoryFfiNoIsolate)))!;
    await tester.pumpWidget(ShapeXApp(state: app));
    await settle(tester);
    await tester.tap(find.byIcon(Icons.insights_outlined));
    await settle(tester);
    final hist = find.descendant(of: find.byType(ProgressScreen), matching: find.text('Peito e Tríceps'));
    expect(hist, findsOneWidget);
    expect(find.descendant(of: find.byType(ProgressScreen), matching: find.textContaining('2 séries')),
        findsOneWidget);

    await tester.tap(hist);
    await settle(tester);
    expect(find.text('42,5 kg × 9'), findsNWidgets(2));
    tester.state<NavigatorState>(find.byType(Navigator).first).pop();
    await settle(tester);

    await tester.tap(find.byIcon(Icons.calendar_view_week_outlined));
    await settle(tester);
    expect(find.text('Semana 1 de 4'), findsOneWidget);
    await tester.tap(find.byType(ProgramStatusCard));
    await settle(tester);
    final useScience = find.byKey(const Key('use_ciencia'));
    await tester.ensureVisible(useScience);
    await tester.pump();
    await tester.tap(useScience);
    await settle(tester);
    await tester.tap(find.descendant(of: find.byType(AlertDialog), matching: find.text('Usar programa')));
    await settle(tester, frames: 10);
    expect(find.widgetWithText(RoutineCard, 'Pernas A'), findsOneWidget);
    expect(find.text('Começa no 1º treino'), findsOneWidget);
    await tester.tap(find.byIcon(Icons.insights_outlined));
    await settle(tester);
    expect(find.descendant(of: find.byType(ProgressScreen), matching: find.text('Peito e Tríceps')),
        findsOneWidget, reason: 'histórico continua depois da troca');

    await tester.pumpWidget(const SizedBox());
    await tester.runAsync(() => app.repo.adb.close());
  });
}
