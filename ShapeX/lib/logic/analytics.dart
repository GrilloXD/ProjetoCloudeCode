import '../data/models.dart';
import 'formatters.dart';

const secondaryWeight = 0.5;
const volumeHigh = 20.0;
const volumeExcessive = 25.0;

void _addSets(Map<Muscle, double> out, Exercise ex, num sets) {
  out[ex.primary] = (out[ex.primary] ?? 0) + sets;
  for (final m in ex.secondary) {
    out[m] = (out[m] ?? 0) + sets * secondaryWeight;
  }
}

/// Séries por músculo: série direta conta 1, indireta conta 0,5.
Map<Muscle, double> performedSetsPerMuscle(Iterable<Session> sessions, Map<String, Exercise> ex) {
  final out = <Muscle, double>{};
  for (final s in sessions) {
    for (final se in s.exercises) {
      final e = ex[se.exerciseId];
      if (e == null) continue;
      final n = se.doneSets.length;
      if (n > 0) _addSets(out, e, n);
    }
  }
  return out;
}

Map<Muscle, double> plannedSetsPerMuscle(Iterable<Routine> routines, Map<String, Exercise> ex) {
  final out = <Muscle, double>{};
  for (final r in routines) {
    for (final re in r.exercises) {
      final e = ex[re.exerciseId];
      if (e != null) _addSets(out, e, re.sets);
    }
  }
  return out;
}

Map<Muscle, int> directSetsPerMuscle(Iterable<Routine> routines, Map<String, Exercise> ex) {
  final out = <Muscle, int>{};
  for (final r in routines) {
    for (final re in r.exercises) {
      final e = ex[re.exerciseId];
      if (e != null) out[e.primary] = (out[e.primary] ?? 0) + re.sets;
    }
  }
  return out;
}

/// Quantos dias diferentes da semana cada músculo recebeu séries diretas.
Map<Muscle, int> muscleFrequency(Iterable<Session> sessions, Map<String, Exercise> ex) {
  final days = <Muscle, Set<String>>{};
  for (final s in sessions) {
    final k = dayKey(s.startedAt);
    for (final se in s.exercises) {
      final e = ex[se.exerciseId];
      if (e == null || se.doneSets.isEmpty) continue;
      days.putIfAbsent(e.primary, () => <String>{}).add(k);
    }
  }
  return days.map((m, d) => MapEntry(m, d.length));
}

Map<Muscle, int> plannedFrequency(Iterable<Routine> routines, Map<String, Exercise> ex) {
  final out = <Muscle, int>{};
  for (final r in routines.where((r) => r.weekday != null)) {
    final muscles = <Muscle>{};
    for (final re in r.exercises) {
      final e = ex[re.exerciseId];
      if (e != null) muscles.add(e.primary);
    }
    for (final m in muscles) {
      out[m] = (out[m] ?? 0) + 1;
    }
  }
  return out;
}

class Insight {
  const Insight(this.level, this.title, this.detail);
  final InsightLevel level;
  final String title;
  final String detail;
}

enum InsightLevel { good, info, warn }

List<Insight> volumeInsights(Map<Muscle, double> planned) {
  final out = <Insight>[];
  for (final e in planned.entries) {
    if (!Muscle.tracked.contains(e.key)) continue;
    if (e.value > volumeExcessive) {
      out.add(Insight(InsightLevel.warn, 'Volume excessivo em ${e.key.label}',
          '${setsLabel(e.value)} séries por semana. Acima de 25 o ganho extra tende a ser pequeno e a recuperação piora.'));
    } else if (e.value > volumeHigh) {
      out.add(Insight(InsightLevel.info, 'Volume alto em ${e.key.label}',
          '${setsLabel(e.value)} séries por semana. Observe recuperação, sono e desempenho.'));
    }
  }
  return out;
}

class WeekBucket {
  WeekBucket(this.start, this.sessions);
  final DateTime start;
  final List<Session> sessions;

  int get count => sessions.length;
  int get sets => sessions.fold(0, (a, s) => a + s.doneSetCount);
  double get volume => sessions.fold(0.0, (a, s) => a + s.volume);
}

List<WeekBucket> weekBuckets(List<Session> sessions, {required int weeks, DateTime? now}) {
  final current = startOfWeek(now ?? DateTime.now());
  final out = <WeekBucket>[];
  for (var i = weeks - 1; i >= 0; i--) {
    final start = DateTime(current.year, current.month, current.day - 7 * i);
    final end = DateTime(start.year, start.month, start.day + 7);
    out.add(WeekBucket(
      start,
      sessions
          .where((s) => !s.startedAt.isBefore(start) && s.startedAt.isBefore(end))
          .toList(),
    ));
  }
  return out;
}

List<BodyWeight> movingAverage(List<BodyWeight> data, {int days = 7}) {
  final out = <BodyWeight>[];
  for (var i = 0; i < data.length; i++) {
    final from = data[i].date.subtract(Duration(days: days - 1));
    final window = data.where((b) => !b.date.isBefore(from) && !b.date.isAfter(data[i].date));
    final avg = window.fold(0.0, (a, b) => a + b.weight) / window.length;
    out.add(BodyWeight(data[i].date, avg));
  }
  return out;
}

int estimateMinutes(Routine r, Map<String, Exercise> ex) {
  var sec = 8 * 60;
  for (final re in r.exercises) {
    final uni = ex[re.exerciseId]?.unilateral ?? false;
    final work = uni ? 80 : 45;
    sec += re.sets * (work + re.restSec);
  }
  return (sec / 60).round();
}
