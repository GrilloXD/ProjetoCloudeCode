import 'package:flutter_test/flutter_test.dart';
import 'package:shape_x/logic/progression.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';

import 'helpers.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  sqfliteFfiInit();
  setUp(mockPlatform);

  test('treino registrado sobrevive a fechar o app no meio e reabrir', () async {
    final path = await tempDbPath();
    var app = await openApp(path);
    final routines = await app.repo.routines();
    expect(routines.map((r) => r.name), [
      'Peito e Tríceps',
      'Costas e Bíceps',
      'Ombros e Abdômen',
      'Pernas',
      'Peito e Costas',
    ]);

    final w = await app.startWorkout(routines.first);
    final supino = w.session.exercises.first;
    expect(supino.exerciseId, 'supino_inclinado_maquina');
    expect(w.recs[supino.id]!.kind, RecKind.start);
    expect(await w.toggleSet(supino, supino.sets.first), isNotNull,
        reason: 'sem histórico e sem carga digitada, a série não pode ser marcada');

    for (final s in supino.sets) {
      await w.updateValues(s, weight: 40, reps: 10);
      expect(await w.toggleSet(supino, s), isNull);
    }
    expect(w.resting, isTrue);
    expect(w.restTotal, 150);
    expect(w.restRemaining, inInclusiveRange(148, 150));
    w.addRest(15);
    expect(w.restTotal, 165);

    final convergente = w.session.exercises[1];
    await w.updateValues(convergente.sets.first, weight: 50, reps: 9);
    await w.toggleSet(convergente, convergente.sets.first);
    expect(w.doneSets, 4);

    await w.flush();
    w.stop();
    await app.repo.adb.close();

    app = await openApp(path);
    expect(app.workout, isNotNull, reason: 'sessão aberta deve ser retomada');
    final w2 = app.workout!;
    expect(w2.doneSets, 4);
    expect(w2.resting, isTrue, reason: 'cronômetro de descanso persiste');
    final summary = await w2.finish();
    expect(summary, isNotNull);
    expect(summary!.sets, 4);
    expect(summary.exercises, 2);
    expect(summary.volume, 40 * 10 * 3 + 50 * 9);
    expect(summary.goals.any((g) => g.$1 == 'Supino Inclinado na Máquina' && g.$2.contains('45 kg')), isTrue);
    expect(app.workout, isNull);
    await app.repo.adb.close();

    app = await openApp(path);
    expect(app.workout, isNull);
    final sessions = await app.repo.sessions();
    expect(sessions, hasLength(1));
    expect(sessions.first.doneSetCount, 4);
    expect(sessions.first.endedAt, isNotNull);

    final w3 = await app.startWorkout((await app.repo.routines()).first);
    final first = w3.session.exercises.first;
    final rec = w3.recs[first.id]!;
    expect(rec.kind, RecKind.increase);
    expect(rec.weight, 45);
    expect(w3.weightHint(first, 0), 40, reason: 'sem autorização, a carga sugerida não é aplicada');
    expect(w3.repsHint(first, 0), 10);
    w3.applyRecommendation(first);
    expect(w3.weightHint(first, 0), 45);
    expect(w3.repsHint(first, 0), 6);
    expect(await w3.toggleSet(first, first.sets.first), isNull, reason: 'um toque usa a sugestão');
    expect(first.sets.first.weight, 45);
    expect(first.sets.first.reps, 6);
    expect(w3.weightHint(first, 1), 45);

    final convergente3 = w3.session.exercises[1];
    expect(w3.recs[convergente3.id]!.kind, RecKind.keep);
    expect(w3.previousSet(convergente3, 0)!.weight, 50);
    await w3.discard();
    expect(await app.repo.sessions(), hasLength(1));

    await app.repo.saveBodyWeight(DateTime(2026, 11, 3), 89);
    await app.repo.saveBodyWeight(DateTime(2026, 11, 3), 88.6);
    await app.repo.adb.close();

    app = await openApp(path);
    final bw = await app.repo.bodyWeights();
    expect(bw, hasLength(1));
    expect(bw.single.weight, 88.6);
    await app.repo.adb.close();
  });

  test('substituir exercício na rotina preserva o histórico do antigo', () async {
    final path = await tempDbPath();
    final app = await openApp(path);
    final r = (await app.repo.routines()).first;
    await seedSession(app.repo, r, DateTime(2026, 10, 26, 18), {
      'supino_convergente': [(50, 12), (50, 11), (50, 10)],
    });
    final slot = r.exercises.firstWhere((e) => e.exerciseId == 'supino_convergente');
    await app.repo.substituteSlot(slot, 'chest_press');
    final r2 = (await app.repo.routines()).first;
    expect(r2.exercises.map((e) => e.exerciseId), contains('chest_press'));
    expect(r2.exercises.map((e) => e.exerciseId), isNot(contains('supino_convergente')));
    expect(await app.repo.substitutions(r.id!), hasLength(1));
    final old = await app.repo.exerciseHistory('supino_convergente');
    expect(old, hasLength(1));
    expect(old.single.sets.map((s) => s.reps), [12, 11, 10]);
    await app.repo.adb.close();
  });

  test('restaurar programa não apaga sessões', () async {
    final path = await tempDbPath();
    final app = await openApp(path);
    final r = (await app.repo.routines()).first;
    await seedSession(app.repo, r, DateTime(2026, 10, 26, 18), {
      'peck_deck': [(60, 15), (60, 14), (60, 13)],
    });
    await app.repo.removeSlot(r.exercises.first.id!);
    await app.repo.restoreDefaultProgram();
    final rs = await app.repo.routines();
    expect(rs, hasLength(5));
    expect(rs.first.exercises, hasLength(7));
    expect(await app.repo.sessions(), hasLength(1));
    await app.repo.adb.close();
  });

  test('instalação nova começa no Tradicional e a troca de programa mantém o histórico', () async {
    final path = await tempDbPath();
    var app = await openApp(path);
    expect((await app.repo.activeProgram()).id, 'tradicional');
    final since = await app.repo.programSince();
    expect(since, isNotNull);
    expect(DateTime.now().difference(since!).inMinutes, lessThan(1));

    final r = (await app.repo.routines()).first;
    await seedSession(app.repo, r, DateTime(2026, 10, 26, 18), {
      'supino_inclinado_maquina': [(45, 10), (45, 9), (45, 8)],
    });
    await app.repo.switchProgram('ciencia');
    await app.repo.adb.close();

    app = await openApp(path);
    expect((await app.repo.activeProgram()).id, 'ciencia');
    expect((await app.repo.routines()).map((r) => r.name), [
      'Peito, Ombros e Tríceps',
      'Costas e Bíceps',
      'Pernas A',
      'Superior',
      'Pernas B',
    ]);
    expect(await app.repo.sessions(), hasLength(1));
    expect(await app.repo.exerciseHistory('supino_inclinado_maquina'), hasLength(1));
    await app.repo.adb.close();
  });

  test('quem tinha a versão anterior do app recebe o Tradicional sem perder sessões', () async {
    final path = await tempDbPath();
    var app = await openApp(path);
    final r = (await app.repo.routines()).first;
    await seedSession(app.repo, r, DateTime(2026, 10, 26, 18), {
      'peck_deck': [(60, 15), (60, 14), (60, 13)],
    });
    await app.repo.updateRoutine(r..name = 'Superior A');
    await app.repo.setSetting('program_version', null);
    await app.repo.setSetting('program_id', null);
    await app.repo.adb.close();

    app = await openApp(path);
    expect((await app.repo.activeProgram()).id, 'tradicional');
    expect((await app.repo.routines()).first.name, 'Peito e Tríceps');
    expect(await app.repo.sessions(), hasLength(1));
    await app.repo.adb.close();
  });
}
