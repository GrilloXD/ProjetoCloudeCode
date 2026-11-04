import 'package:sqflite/sqflite.dart';

import '../logic/formatters.dart';
import 'database.dart';
import 'models.dart';
import 'seed/program_seed.dart';

class Repository {
  Repository(this.adb);

  final AppDatabase adb;
  Database get db => adb.db;

  Map<String, Exercise>? _exCache;

  // EXERCÍCIOS

  Future<Map<String, Exercise>> exerciseMap({bool refresh = false}) async {
    if (_exCache != null && !refresh) return _exCache!;
    final rows = await db.query('exercises', orderBy: 'name COLLATE NOCASE');
    _exCache = {for (final r in rows) r['id'] as String: Exercise.fromRow(r)};
    return _exCache!;
  }

  Future<List<Exercise>> exercises() async => (await exerciseMap()).values.toList();

  Future<void> setIncrement(String id, double increment) async {
    await db.update('exercises', {'increment': increment}, where: 'id = ?', whereArgs: [id]);
    _exCache?[id]?.increment = increment;
  }

  Future<String> createExercise(Exercise e) async {
    await db.insert('exercises', e.toRow());
    _exCache = null;
    return e.id;
  }

  Future<bool> deleteCustomExercise(String id) async {
    final used = Sqflite.firstIntValue(await db.rawQuery(
            'SELECT (SELECT COUNT(*) FROM session_exercises WHERE exercise_id = ?) + '
            '(SELECT COUNT(*) FROM routine_exercises WHERE exercise_id = ?)',
            [id, id])) ??
        0;
    if (used > 0) return false;
    await db.delete('exercises', where: 'id = ? AND custom = 1', whereArgs: [id]);
    _exCache = null;
    return true;
  }

  // ROTINAS

  Future<List<Routine>> routines() async {
    final rows = await db.query('routines', orderBy: 'position, id');
    final reRows = await db.query('routine_exercises', orderBy: 'position, id');
    final byRoutine = <int, List<RoutineExercise>>{};
    for (final r in reRows) {
      final re = RoutineExercise.fromRow(r);
      byRoutine.putIfAbsent(re.routineId, () => []).add(re);
    }
    return rows
        .map((r) => Routine(
              id: r['id'] as int,
              name: r['name'] as String,
              focus: r['focus'] as String? ?? '',
              weekday: r['weekday'] as int?,
              position: r['position'] as int,
              exercises: byRoutine[r['id']] ?? [],
            ))
        .toList();
  }

  Future<Routine?> routine(int id) async {
    final all = await routines();
    for (final r in all) {
      if (r.id == id) return r;
    }
    return null;
  }

  Future<int> createRoutine(String name, {int? weekday}) async {
    final pos = Sqflite.firstIntValue(
            await db.rawQuery('SELECT COALESCE(MAX(position), -1) + 1 FROM routines')) ??
        0;
    return db.insert('routines', {'name': name, 'focus': '', 'weekday': weekday, 'position': pos});
  }

  Future<void> updateRoutine(Routine r) async {
    await db.transaction((txn) async {
      if (r.weekday != null) {
        await txn.update('routines', {'weekday': null},
            where: 'weekday = ? AND id != ?', whereArgs: [r.weekday, r.id]);
      }
      await txn.update('routines', {'name': r.name, 'focus': r.focus, 'weekday': r.weekday},
          where: 'id = ?', whereArgs: [r.id]);
    });
  }

  Future<void> deleteRoutine(int id) async {
    await db.delete('routines', where: 'id = ?', whereArgs: [id]);
  }

  Future<void> updateSlot(RoutineExercise re) async {
    await db.update('routine_exercises', re.toRow(), where: 'id = ?', whereArgs: [re.id]);
  }

  Future<int> addSlot(int routineId, String exerciseId,
      {int sets = 3, int repMin = 8, int repMax = 12, int restSec = 90, String rir = '1 RIR'}) async {
    final pos = Sqflite.firstIntValue(await db.rawQuery(
            'SELECT COALESCE(MAX(position), -1) + 1 FROM routine_exercises WHERE routine_id = ?',
            [routineId])) ??
        0;
    return db.insert('routine_exercises', {
      'routine_id': routineId,
      'exercise_id': exerciseId,
      'position': pos,
      'sets': sets,
      'rep_min': repMin,
      'rep_max': repMax,
      'rest_sec': restSec,
      'rir': rir,
      'note': '',
    });
  }

  Future<void> removeSlot(int slotId) async {
    await db.delete('routine_exercises', where: 'id = ?', whereArgs: [slotId]);
  }

  Future<void> reorderSlots(List<int> slotIds) async {
    final b = db.batch();
    for (var i = 0; i < slotIds.length; i++) {
      b.update('routine_exercises', {'position': i}, where: 'id = ?', whereArgs: [slotIds[i]]);
    }
    await b.commit(noResult: true);
  }

  /// Troca o exercício da rotina. O histórico do exercício antigo continua
  /// guardado e a troca fica registrada.
  Future<void> substituteSlot(RoutineExercise re, String newExerciseId) async {
    await db.transaction((txn) async {
      await txn.insert('substitutions', {
        'routine_id': re.routineId,
        'old_exercise_id': re.exerciseId,
        'new_exercise_id': newExerciseId,
        'at': DateTime.now().millisecondsSinceEpoch,
      });
      await txn.update('routine_exercises', {'exercise_id': newExerciseId},
          where: 'id = ?', whereArgs: [re.id]);
    });
    re.exerciseId = newExerciseId;
  }

  Future<List<Substitution>> substitutions(int routineId) async {
    final rows = await db.query('substitutions',
        where: 'routine_id = ?', whereArgs: [routineId], orderBy: 'at DESC');
    return rows
        .map((r) => Substitution(
              routineId: r['routine_id'] as int,
              oldExerciseId: r['old_exercise_id'] as String,
              newExerciseId: r['new_exercise_id'] as String,
              at: DateTime.fromMillisecondsSinceEpoch(r['at'] as int),
            ))
        .toList();
  }

  // SESSÕES

  Future<Session?> activeSession() async {
    final rows = await db.query('sessions',
        where: 'ended_at IS NULL', orderBy: 'started_at DESC', limit: 1);
    if (rows.isEmpty) return null;
    return loadSession(rows.first['id'] as int);
  }

  Future<Session> loadSession(int id) async {
    final list = await _loadSessions('id = ?', [id]);
    return list.first;
  }

  Future<int> startSession(Routine r, {DateTime? at}) async {
    return db.transaction((txn) async {
      final sid = await txn.insert('sessions', {
        'routine_id': r.id,
        'name': r.name,
        'started_at': (at ?? DateTime.now()).millisecondsSinceEpoch,
      });
      for (var i = 0; i < r.exercises.length; i++) {
        final re = r.exercises[i];
        final seId = await txn.insert('session_exercises', {
          'session_id': sid,
          'exercise_id': re.exerciseId,
          'position': i,
          'sets_planned': re.sets,
          'rep_min': re.repMin,
          'rep_max': re.repMax,
          'rest_sec': re.restSec,
          'rir': re.rir,
        });
        for (var k = 0; k < re.sets; k++) {
          await txn.insert('set_logs', {'session_exercise_id': seId, 'set_index': k, 'done': 0});
        }
      }
      return sid;
    });
  }

  Future<int> startEmptySession(String name) async {
    return db.insert('sessions', {
      'routine_id': null,
      'name': name,
      'started_at': DateTime.now().millisecondsSinceEpoch,
    });
  }

  Future<SessionExercise> addSessionExercise(int sessionId, String exerciseId,
      {int sets = 3, int repMin = 8, int repMax = 12, int restSec = 90, String rir = ''}) async {
    return db.transaction((txn) async {
      final pos = Sqflite.firstIntValue(await txn.rawQuery(
              'SELECT COALESCE(MAX(position), -1) + 1 FROM session_exercises WHERE session_id = ?',
              [sessionId])) ??
          0;
      final se = SessionExercise(
        sessionId: sessionId,
        exerciseId: exerciseId,
        position: pos,
        setsPlanned: sets,
        repMin: repMin,
        repMax: repMax,
        restSec: restSec,
        rir: rir,
      );
      se.id = await txn.insert('session_exercises', {
        'session_id': sessionId,
        'exercise_id': exerciseId,
        'position': pos,
        'sets_planned': sets,
        'rep_min': repMin,
        'rep_max': repMax,
        'rest_sec': restSec,
        'rir': rir,
      });
      for (var k = 0; k < sets; k++) {
        final id = await txn
            .insert('set_logs', {'session_exercise_id': se.id, 'set_index': k, 'done': 0});
        se.sets.add(SetLog(id: id, sessionExerciseId: se.id!, index: k));
      }
      return se;
    });
  }

  Future<void> removeSessionExercise(int seId) async {
    await db.delete('session_exercises', where: 'id = ?', whereArgs: [seId]);
  }

  Future<void> replaceSessionExercise(int seId, String exerciseId) async {
    await db.update('session_exercises', {'exercise_id': exerciseId},
        where: 'id = ?', whereArgs: [seId]);
  }

  Future<void> updateSessionExercise(SessionExercise se) async {
    await db.update(
        'session_exercises',
        {
          'rest_sec': se.restSec,
          'sets_planned': se.setsPlanned,
          'rep_min': se.repMin,
          'rep_max': se.repMax,
        },
        where: 'id = ?',
        whereArgs: [se.id]);
  }

  Future<SetLog> addSet(SessionExercise se) async {
    final index = se.sets.isEmpty ? 0 : se.sets.last.index + 1;
    final id = await db
        .insert('set_logs', {'session_exercise_id': se.id, 'set_index': index, 'done': 0});
    return SetLog(id: id, sessionExerciseId: se.id!, index: index);
  }

  Future<void> removeSet(int setId) async {
    await db.delete('set_logs', where: 'id = ?', whereArgs: [setId]);
  }

  Future<void> saveSet(SetLog s) async {
    await db.update(
        'set_logs',
        {
          'weight': s.weight,
          'reps': s.reps,
          'done': s.done ? 1 : 0,
          'done_at': s.doneAt?.millisecondsSinceEpoch,
        },
        where: 'id = ?',
        whereArgs: [s.id]);
  }

  /// Finaliza a sessão guardando só as séries concluídas.
  /// Retorna false se nada foi registrado (a sessão é descartada).
  Future<bool> finishSession(int id, {DateTime? at}) async {
    return db.transaction((txn) async {
      await txn.rawDelete(
          'DELETE FROM set_logs WHERE done = 0 AND session_exercise_id IN '
          '(SELECT id FROM session_exercises WHERE session_id = ?)',
          [id]);
      await txn.rawDelete(
          'DELETE FROM session_exercises WHERE session_id = ? AND id NOT IN '
          '(SELECT session_exercise_id FROM set_logs)',
          [id]);
      final left = Sqflite.firstIntValue(await txn
              .rawQuery('SELECT COUNT(*) FROM session_exercises WHERE session_id = ?', [id])) ??
          0;
      if (left == 0) {
        await txn.delete('sessions', where: 'id = ?', whereArgs: [id]);
        return false;
      }
      await txn.update('sessions', {'ended_at': (at ?? DateTime.now()).millisecondsSinceEpoch},
          where: 'id = ?', whereArgs: [id]);
      return true;
    });
  }

  Future<void> deleteSession(int id) async {
    await db.delete('sessions', where: 'id = ?', whereArgs: [id]);
  }

  Future<List<Session>> sessions({DateTime? from, DateTime? to, int? limit}) {
    final where = <String>['ended_at IS NOT NULL'];
    final args = <Object?>[];
    if (from != null) {
      where.add('started_at >= ?');
      args.add(from.millisecondsSinceEpoch);
    }
    if (to != null) {
      where.add('started_at < ?');
      args.add(to.millisecondsSinceEpoch);
    }
    return _loadSessions(where.join(' AND '), args, limit: limit);
  }

  /// Última sessão finalizada com o mesmo nome de treino, para comparação.
  Future<Session?> previousSessionNamed(String name, {required int excludeId}) async {
    final list = await _loadSessions(
        'name = ? AND ended_at IS NOT NULL AND id != ?', [name, excludeId],
        limit: 1);
    return list.firstOrNull;
  }

  Future<int> sessionCount() async =>
      Sqflite.firstIntValue(
          await db.rawQuery('SELECT COUNT(*) FROM sessions WHERE ended_at IS NOT NULL')) ??
      0;

  Future<List<Session>> _loadSessions(String where, List<Object?> args, {int? limit}) async {
    final rows = await db.query('sessions',
        where: where, whereArgs: args, orderBy: 'started_at DESC', limit: limit);
    final sessions = rows.map(Session.fromRow).toList();
    if (sessions.isEmpty) return sessions;
    final ids = sessions.map((s) => s.id!).join(',');
    final seRows = await db.rawQuery(
        'SELECT * FROM session_exercises WHERE session_id IN ($ids) ORDER BY position, id');
    final ses = seRows.map(SessionExercise.fromRow).toList();
    if (ses.isNotEmpty) {
      final seIds = ses.map((e) => e.id!).join(',');
      final setRows = await db.rawQuery(
          'SELECT * FROM set_logs WHERE session_exercise_id IN ($seIds) ORDER BY set_index, id');
      final bySe = <int, List<SetLog>>{};
      for (final r in setRows) {
        final s = SetLog.fromRow(r);
        bySe.putIfAbsent(s.sessionExerciseId, () => []).add(s);
      }
      for (final se in ses) {
        se.sets = bySe[se.id] ?? [];
      }
    }
    final bySession = <int, List<SessionExercise>>{};
    for (final se in ses) {
      bySession.putIfAbsent(se.sessionId, () => []).add(se);
    }
    for (final s in sessions) {
      s.exercises = bySession[s.id] ?? [];
    }
    return sessions;
  }

  // HISTÓRICO POR EXERCÍCIO

  Future<Map<String, List<ExercisePerformance>>> historyFor(Iterable<String> exerciseIds,
      {int? excludeSessionId}) async {
    final ids = exerciseIds.toSet().toList();
    final out = {for (final id in ids) id: <ExercisePerformance>[]};
    if (ids.isEmpty) return out;
    final marks = List.filled(ids.length, '?').join(',');
    final rows = await db.rawQuery('''
      SELECT s.id AS sid, s.started_at AS started, se.exercise_id AS ex, sl.weight AS w, sl.reps AS r
      FROM set_logs sl
      JOIN session_exercises se ON se.id = sl.session_exercise_id
      JOIN sessions s ON s.id = se.session_id
      WHERE se.exercise_id IN ($marks) AND s.ended_at IS NOT NULL AND sl.done = 1
        AND sl.reps IS NOT NULL ${excludeSessionId != null ? 'AND s.id != ?' : ''}
      ORDER BY s.started_at, se.position, sl.set_index, sl.id
    ''', [...ids, ?excludeSessionId]);
    final perf = <String, Map<int, ExercisePerformance>>{};
    for (final r in rows) {
      final ex = r['ex'] as String;
      final sid = r['sid'] as int;
      final map = perf.putIfAbsent(ex, () => {});
      final p = map.putIfAbsent(
          sid,
          () => ExercisePerformance(
                sessionId: sid,
                date: DateTime.fromMillisecondsSinceEpoch(r['started'] as int),
                sets: [],
              ));
      p.sets.add(SetEntry((r['w'] as num?)?.toDouble() ?? 0, r['r'] as int));
    }
    for (final e in perf.entries) {
      out[e.key] = e.value.values.toList()..sort((a, b) => a.date.compareTo(b.date));
    }
    return out;
  }

  Future<List<ExercisePerformance>> exerciseHistory(String exerciseId,
          {int? excludeSessionId}) async =>
      (await historyFor([exerciseId], excludeSessionId: excludeSessionId))[exerciseId]!;

  Future<List<String>> performedExerciseIds() async {
    final rows = await db.rawQuery('''
      SELECT DISTINCT se.exercise_id AS ex FROM session_exercises se
      JOIN sessions s ON s.id = se.session_id WHERE s.ended_at IS NOT NULL
    ''');
    return rows.map((r) => r['ex'] as String).toList();
  }

  // PESO CORPORAL

  Future<List<BodyWeight>> bodyWeights() async {
    final rows = await db.query('body_weights', orderBy: 'date');
    return rows
        .map((r) => BodyWeight(parseDayKey(r['date'] as String), (r['weight'] as num).toDouble()))
        .toList();
  }

  Future<void> saveBodyWeight(DateTime date, double weight) async {
    await db.insert('body_weights', {'date': dayKey(date), 'weight': weight},
        conflictAlgorithm: ConflictAlgorithm.replace);
  }

  Future<void> deleteBodyWeight(DateTime date) async {
    await db.delete('body_weights', where: 'date = ?', whereArgs: [dayKey(date)]);
  }

  // CONFIGURAÇÕES

  Future<String?> getSetting(String key) async {
    final rows = await db.query('settings', where: 'key = ?', whereArgs: [key]);
    return rows.isEmpty ? null : rows.first['value'] as String;
  }

  Future<void> setSetting(String key, String? value) async {
    if (value == null) {
      await db.delete('settings', where: 'key = ?', whereArgs: [key]);
    } else {
      await db.insert('settings', {'key': key, 'value': value},
          conflictAlgorithm: ConflictAlgorithm.replace);
    }
  }

  Future<void> resetAll() async {
    await db.transaction((txn) async {
      for (final t in [
        'set_logs',
        'session_exercises',
        'sessions',
        'routine_exercises',
        'routines',
        'substitutions',
        'body_weights',
        'settings',
      ]) {
        await txn.delete(t);
      }
      await AppDatabase.seedProgram(txn);
    });
  }

  Future<void> restoreDefaultProgram() async {
    await db.transaction((txn) async {
      await txn.delete('routines');
      await txn.delete('substitutions');
      await AppDatabase.seedProgram(txn);
    });
  }

  // PROGRAMAS

  Future<SeedProgram> activeProgram() async => programById(await getSetting('program_id'));

  Future<DateTime?> programSince() async {
    final v = int.tryParse(await getSetting('program_since') ?? '');
    return v == null ? null : DateTime.fromMillisecondsSinceEpoch(v);
  }

  /// Dia em que o ciclo do programa começou: o primeiro treino feito nele,
  /// ou a data escolhida à mão. Nulo enquanto nenhum treino foi feito.
  Future<DateTime?> programStart() async {
    final v = await getSetting('program_started');
    return v == null ? null : parseDayKey(v);
  }

  Future<void> setProgramStart(DateTime day) => setSetting('program_started', dayKey(day));

  Future<void> markProgramStarted(DateTime day) async {
    if (await getSetting('program_started') == null) await setProgramStart(day);
  }

  /// Troca os treinos pelos do programa escolhido e reinicia a contagem de
  /// semanas. Sessões, recordes e peso corporal continuam salvos.
  Future<void> switchProgram(String programId) async {
    await db.transaction((txn) async {
      await txn.delete('routines');
      await txn.delete('substitutions');
      await AppDatabase.seedProgram(txn, programId: programId);
    });
  }
}
