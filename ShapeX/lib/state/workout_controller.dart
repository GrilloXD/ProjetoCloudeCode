import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';

import '../data/models.dart';
import '../data/repository.dart';
import '../logic/formatters.dart';
import '../logic/progression.dart';
import 'app_state.dart';

class FinishSummary {
  FinishSummary({
    required this.name,
    required this.duration,
    required this.sets,
    required this.volume,
    required this.exercises,
    required this.records,
    required this.goals,
  });

  final String name;
  final Duration duration;
  final int sets;
  final double volume;
  final int exercises;
  final List<(String, String)> records;
  final List<(String, String)> goals;
}

const _compoundPatterns = {
  'press_incline', 'press_flat', 'dip', 'vertical_pull', 'horizontal_row', 'ohp',
  'squat', 'leg_press', 'lunge', 'hinge', 'hip_thrust', 'triceps_press',
};

class WorkoutController extends ChangeNotifier {
  WorkoutController._(this.app, this.session);

  final AppState app;
  Session session;
  Repository get repo => app.repo;

  final recs = <int, Recommendation>{};
  final previous = <int, List<SetEntry>>{};
  final applied = <int, double>{};
  final stagnant = <int>{};
  final tick = ValueNotifier<int>(0);

  DateTime? restEndsAt;
  int restTotal = 0;
  Timer? _timer;
  bool _disposed = false;

  static Future<WorkoutController> load(AppState app, int sessionId) async {
    final s = await app.repo.loadSession(sessionId);
    final c = WorkoutController._(app, s);
    await c._computeAll();
    final end = await app.repo.getSetting('rest_end');
    final total = await app.repo.getSetting('rest_total');
    final owner = await app.repo.getSetting('rest_session');
    if (end != null && owner == '$sessionId') {
      final t = DateTime.fromMillisecondsSinceEpoch(int.parse(end));
      if (t.isAfter(DateTime.now())) {
        c.restEndsAt = t;
        c.restTotal = int.tryParse(total ?? '') ?? 60;
      }
    }
    c._timer = Timer.periodic(const Duration(seconds: 1), (_) => c._onTick());
    return c;
  }

  void stop() {
    _disposed = true;
    _timer?.cancel();
  }

  @override
  void dispose() {
    stop();
    tick.dispose();
    super.dispose();
  }

  void _notify() {
    if (!_disposed) notifyListeners();
  }

  Exercise? exerciseOf(SessionExercise se) => app.exercises[se.exerciseId];

  Future<void> _computeAll() async {
    final hist = await repo.historyFor(session.exercises.map((e) => e.exerciseId),
        excludeSessionId: session.id);
    for (final se in session.exercises) {
      _computeFor(se, hist[se.exerciseId] ?? const []);
    }
  }

  Future<void> _computeOne(SessionExercise se) async {
    final h = await repo.exerciseHistory(se.exerciseId, excludeSessionId: session.id);
    _computeFor(se, h);
  }

  void _computeFor(SessionExercise se, List<ExercisePerformance> h) {
    final ex = exerciseOf(se);
    if (ex == null) return;
    recs[se.id!] = recommend(
      exercise: ex,
      sets: se.setsPlanned,
      repMin: se.repMin,
      repMax: se.repMax,
      history: h,
    );
    previous[se.id!] = h.isEmpty ? const [] : h.last.sets;
    if (isStagnant(ex, h)) {
      stagnant.add(se.id!);
    } else {
      stagnant.remove(se.id!);
    }
  }

  SetEntry? previousSet(SessionExercise se, int i) {
    final p = previous[se.id];
    if (p == null || p.isEmpty) return null;
    return i < p.length ? p[i] : null;
  }

  double? weightHint(SessionExercise se, int i) {
    for (var j = i - 1; j >= 0; j--) {
      final s = se.sets[j];
      if (s.done && s.weight != null) return s.weight;
    }
    final a = applied[se.id];
    if (a != null) return a;
    final p = previous[se.id];
    if (p != null && p.isNotEmpty) return p[math.min(i, p.length - 1)].weight;
    final ex = exerciseOf(se);
    if (ex != null && ex.loadType != LoadType.weighted) return 0;
    return null;
  }

  int? repsHint(SessionExercise se, int i) {
    final rec = recs[se.id];
    if (rec != null && rec.kind != RecKind.start) {
      if (rec.kind == RecKind.increase && applied[se.id] == null) return se.repMax;
      if (rec.targetReps.isNotEmpty) return rec.targetReps[math.min(i, rec.targetReps.length - 1)];
    }
    for (var j = i - 1; j >= 0; j--) {
      final s = se.sets[j];
      if (s.done && s.reps != null) return s.reps;
    }
    return null;
  }

  Future<void> updateValues(SetLog s, {double? weight, int? reps, bool clearWeight = false, bool clearReps = false}) async {
    if (weight != null || clearWeight) s.weight = weight;
    if (reps != null || clearReps) s.reps = reps;
    await repo.saveSet(s);
  }

  /// Marca ou desmarca a série. Retorna uma mensagem quando faltar dado.
  Future<String?> toggleSet(SessionExercise se, SetLog s) async {
    if (s.done) {
      s.done = false;
      s.doneAt = null;
      await repo.saveSet(s);
      _notify();
      return null;
    }
    final i = se.sets.indexOf(s);
    final w = s.weight ?? weightHint(se, i);
    final r = s.reps ?? repsHint(se, i);
    if (w == null) return 'Informe a carga da série';
    if (r == null || r <= 0) return 'Informe as repetições';
    s.weight = w;
    s.reps = r;
    s.done = true;
    s.doneAt = DateTime.now();
    await repo.saveSet(s);
    HapticFeedback.mediumImpact();
    final last = se.sets.every((x) => x.done) && se == session.exercises.lastOrNull;
    if (!last) startRest(se.restSec);
    _notify();
    return null;
  }

  Future<void> addSet(SessionExercise se) async {
    final s = await repo.addSet(se);
    se.sets.add(s);
    _notify();
  }

  Future<void> removeSet(SessionExercise se, SetLog s) async {
    se.sets.remove(s);
    _notify();
    await repo.removeSet(s.id!);
  }

  void applyRecommendation(SessionExercise se) {
    final w = recs[se.id]?.weight;
    if (w == null) return;
    applied[se.id!] = w;
    HapticFeedback.selectionClick();
    _notify();
  }

  void undoApply(SessionExercise se) {
    applied.remove(se.id);
    _notify();
  }

  Future<void> setRest(SessionExercise se, int seconds) async {
    se.restSec = seconds;
    await repo.updateSessionExercise(se);
    _notify();
  }

  Future<void> addExercise(String exerciseId) async {
    final ex = app.exercises[exerciseId];
    final compound = ex != null && _compoundPatterns.contains(ex.pattern);
    final se = await repo.addSessionExercise(
      session.id!,
      exerciseId,
      sets: 3,
      repMin: compound ? 8 : 10,
      repMax: compound ? 12 : 15,
      restSec: compound ? 120 : 75,
      rir: compound ? '1 a 2 RIR' : '0 a 1 RIR',
    );
    session.exercises.add(se);
    await _computeOne(se);
    _notify();
  }

  Future<void> removeExercise(SessionExercise se) async {
    await repo.removeSessionExercise(se.id!);
    session.exercises.remove(se);
    _notify();
  }

  Future<void> replaceExercise(SessionExercise se, String exerciseId, {bool inRoutine = false}) async {
    if (inRoutine && session.routineId != null) {
      final r = await repo.routine(session.routineId!);
      final slot = r?.exercises.where((e) => e.exerciseId == se.exerciseId).firstOrNull;
      if (slot != null) await repo.substituteSlot(slot, exerciseId);
    }
    await repo.replaceSessionExercise(se.id!, exerciseId);
    se.exerciseId = exerciseId;
    applied.remove(se.id);
    for (final s in se.sets.where((s) => !s.done)) {
      s.weight = null;
      s.reps = null;
      await repo.saveSet(s);
    }
    await _computeOne(se);
    app.changed();
    _notify();
  }

  // DESCANSO

  int get restRemaining {
    final e = restEndsAt;
    if (e == null) return 0;
    return math.max(0, (e.difference(DateTime.now()).inMilliseconds / 1000).ceil());
  }

  bool get resting => restEndsAt != null;

  void startRest(int seconds) {
    restTotal = seconds;
    restEndsAt = DateTime.now().add(Duration(seconds: seconds));
    _persistRest();
    tick.value++;
  }

  void addRest(int delta) {
    final e = restEndsAt;
    if (e == null) return;
    final next = e.add(Duration(seconds: delta));
    if (!next.isAfter(DateTime.now())) {
      skipRest();
      return;
    }
    restEndsAt = next;
    restTotal = math.max(1, restTotal + delta);
    _persistRest();
    tick.value++;
  }

  void skipRest() {
    restEndsAt = null;
    _persistRest();
    tick.value++;
  }

  Future<void>? _persisting;

  Future<void> flush() => _persisting ?? Future.value();

  void _persistRest() {
    if (_disposed) return;
    final e = restEndsAt;
    _persisting = Future.wait([
      repo.setSetting('rest_end', e?.millisecondsSinceEpoch.toString()),
      repo.setSetting('rest_total', e == null ? null : '$restTotal'),
      repo.setSetting('rest_session', e == null ? null : '${session.id}'),
    ]);
  }

  void _onTick() {
    if (_disposed) return;
    final e = restEndsAt;
    final now = DateTime.now();
    if (e != null && !now.isBefore(e)) {
      restEndsAt = null;
      _persistRest();
      if (now.difference(e).inSeconds < 5) _alert();
    }
    tick.value++;
  }

  Future<void> _alert() async {
    SystemSound.play(SystemSoundType.alert);
    if (!app.vibrate) return;
    await HapticFeedback.vibrate();
    await Future<void>.delayed(const Duration(milliseconds: 350));
    await HapticFeedback.heavyImpact();
  }

  // FIM

  int get pendingSets => session.exercises.fold(0, (a, e) => a + e.sets.where((s) => !s.done).length);

  int get doneSets => session.doneSetCount;

  Future<FinishSummary?> finish() async {
    final ids = session.exercises.map((e) => e.exerciseId);
    final hist = await repo.historyFor(ids, excludeSessionId: session.id);
    final records = <(String, String)>[];
    final goals = <(String, String)>[];
    for (final se in session.exercises) {
      final ex = exerciseOf(se);
      if (ex == null) continue;
      final done = se.doneSets.map((s) => SetEntry(s.weight ?? 0, s.reps ?? 0)).toList();
      if (done.isEmpty) continue;
      final before = hist[se.exerciseId] ?? const [];
      for (final r in newRecords(ex, done, before)) {
        records.add((ex.name, r));
      }
      final after = recommend(
        exercise: ex,
        sets: se.setsPlanned,
        repMin: se.repMin,
        repMax: se.repMax,
        history: [
          ...before,
          ExercisePerformance(sessionId: session.id!, date: session.startedAt, sets: done),
        ],
      );
      if (after.kind == RecKind.increase || after.kind == RecKind.reduce) {
        goals.add((ex.name, after.title));
      }
    }
    final end = DateTime.now();
    final ok = await repo.finishSession(session.id!, at: end);
    skipRest();
    if (!ok) {
      app.clearWorkout();
      return null;
    }
    final saved = await repo.loadSession(session.id!);
    final summary = FinishSummary(
      name: saved.name,
      duration: end.difference(saved.startedAt),
      sets: saved.doneSetCount,
      volume: saved.volume,
      exercises: saved.exercises.length,
      records: records,
      goals: goals,
    );
    app.clearWorkout();
    return summary;
  }

  Future<void> discard() async {
    skipRest();
    await repo.deleteSession(session.id!);
    app.clearWorkout();
  }

  String elapsedLabel() => fmtElapsed(DateTime.now().difference(session.startedAt));
}
