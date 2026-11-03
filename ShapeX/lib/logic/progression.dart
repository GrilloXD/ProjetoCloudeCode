import 'dart:math' as math;

import '../data/models.dart';
import 'formatters.dart';

enum RecKind { start, increase, keep, below, reduce }

class Recommendation {
  const Recommendation({
    required this.kind,
    required this.title,
    this.detail,
    this.weight,
    this.targetReps = const [],
  });

  final RecKind kind;
  final String title;
  final String? detail;
  final double? weight;
  final List<int> targetReps;

  bool get actionable => kind == RecKind.increase || kind == RecKind.reduce;
}

double e1rm(double weight, int reps) => reps <= 0 ? 0 : weight * (1 + reps / 30.0);

double _hardest(Exercise ex, Iterable<double> weights) => ex.loadType == LoadType.assisted
    ? weights.reduce(math.min)
    : weights.reduce(math.max);

double _roundStep(double value, double step) {
  if (step <= 0) return value;
  final n = (value / step).round();
  return math.max(step, n * step);
}

/// Progressão dupla: mantém a carga até todas as séries planejadas chegarem
/// ao topo da faixa; então sobe o menor incremento disponível no equipamento.
Recommendation recommend({
  required Exercise exercise,
  required int sets,
  required int repMin,
  required int repMax,
  required List<ExercisePerformance> history,
}) {
  final valid = history.where((h) => h.sets.isNotEmpty).toList();
  if (valid.isEmpty) {
    return Recommendation(
      kind: RecKind.start,
      title: 'Primeira vez: escolha uma carga para $repMin a $repMax reps com 1 a 2 de sobra',
      detail: 'Registre o que fizer. A partir da próxima sessão o app calcula a meta.',
    );
  }

  final assisted = exercise.loadType == LoadType.assisted;
  final inc = exercise.increment;
  final last = valid.last;
  final top = _hardest(exercise, last.sets.map((s) => s.weight));
  final atTop = last.sets.where((s) => s.weight == top).toList();

  final hit = atTop.length >= sets && atTop.take(sets).every((s) => s.reps >= repMax);
  if (hit) {
    final next = assisted ? math.max(0.0, top - inc) : top + inc;
    final String title;
    if (assisted) {
      title = 'Meta batida ($sets×$repMax). Reduza a assistência para ${fmtKg(next)} kg';
    } else if (exercise.loadType == LoadType.bodyweight && top == 0) {
      title = 'Meta batida ($sets×$repMax). Adicione ${fmtKg(next)} kg de carga extra';
    } else {
      title = 'Meta batida ($sets×$repMax). Suba para ${fmtKg(next)} kg';
    }
    return Recommendation(
      kind: RecKind.increase,
      title: title,
      detail: 'Com a carga nova, trabalhe de novo até $repMax reps em todas as séries.',
      weight: next,
      targetReps: List.filled(sets, repMin),
    );
  }

  final below = atTop.any((s) => s.reps < repMin);
  if (below && valid.length >= 2) {
    final prev = valid[valid.length - 2];
    final prevTop = _hardest(exercise, prev.sets.map((s) => s.weight));
    final prevBelow = prev.sets.where((s) => s.weight == prevTop).any((s) => s.reps < repMin);
    final sameOrHarder = assisted ? prevTop <= top : prevTop >= top;
    if (prevBelow && sameOrHarder && top > 0) {
      final step = _roundStep(math.max(inc, top * 0.075), inc);
      final next = assisted ? top + step : math.max(0.0, top - step);
      return Recommendation(
        kind: RecKind.reduce,
        title: assisted
            ? 'Abaixo de $repMin reps em 2 sessões. Aumente a assistência para ${fmtKg(next)} kg'
            : 'Abaixo de $repMin reps em 2 sessões. Reduza para ${fmtKg(next)} kg',
        detail: 'Voltar um pouco permite treinar dentro da faixa com boa execução.',
        weight: next,
        targetReps: List.filled(sets, repMin),
      );
    }
  }

  final targets = List<int>.generate(sets, (i) {
    if (i < atTop.length) return math.min(repMax, math.max(repMin, atTop[i].reps + 1));
    return repMin;
  });

  if (below) {
    return Recommendation(
      kind: RecKind.below,
      title: 'Abaixo de $repMin reps: mantenha ${fmtKg(top)} kg e busque completar a faixa',
      weight: top,
      targetReps: targets,
    );
  }

  return Recommendation(
    kind: RecKind.keep,
    title: 'Mantenha ${fmtKg(top)} kg e busque +1 rep por série (meta: $repMax)',
    weight: top,
    targetReps: targets,
  );
}

double performanceScore(Exercise ex, List<SetEntry> sets) {
  if (sets.isEmpty) return 0;
  switch (ex.loadType) {
    case LoadType.weighted:
      return sets.map((s) => e1rm(s.weight, s.reps)).reduce(math.max);
    case LoadType.bodyweight:
      return sets.map((s) => s.reps * (1 + s.weight / 20)).reduce(math.max);
    case LoadType.assisted:
      return sets.map((s) => s.reps - s.weight / 5).reduce(math.max);
  }
}

/// Estagnação: nas últimas [window] sessões o melhor desempenho não superou
/// o das [window] sessões anteriores.
bool isStagnant(Exercise ex, List<ExercisePerformance> history, {int window = 3}) {
  final v = history.where((h) => h.sets.isNotEmpty).toList();
  if (v.length < window + 1) return false;
  final scores = v.map((h) => performanceScore(ex, h.sets)).toList();
  final split = scores.length - window;
  final baseStart = math.max(0, split - window);
  final baseline = scores.sublist(baseStart, split).reduce(math.max);
  final recent = scores.sublist(split).reduce(math.max);
  return recent <= baseline * 1.005;
}

class PersonalRecords {
  PersonalRecords({
    this.maxWeight,
    this.maxWeightReps,
    this.maxWeightDate,
    this.bestE1rm,
    this.bestE1rmSet,
    this.bestE1rmDate,
    this.maxReps,
    this.maxRepsDate,
  });

  final double? maxWeight;
  final int? maxWeightReps;
  final DateTime? maxWeightDate;
  final double? bestE1rm;
  final SetEntry? bestE1rmSet;
  final DateTime? bestE1rmDate;
  final int? maxReps;
  final DateTime? maxRepsDate;

  bool get isEmpty => maxWeight == null && maxReps == null;
}

PersonalRecords personalRecords(Exercise ex, List<ExercisePerformance> history) {
  double? maxW;
  int? maxWReps;
  DateTime? maxWDate;
  double? best;
  SetEntry? bestSet;
  DateTime? bestDate;
  int? maxR;
  DateTime? maxRDate;
  final assisted = ex.loadType == LoadType.assisted;
  for (final h in history) {
    for (final s in h.sets) {
      final better = maxW == null ||
          (assisted ? s.weight < maxW : s.weight > maxW) ||
          (s.weight == maxW && s.reps > (maxWReps ?? 0));
      if (better) {
        maxW = s.weight;
        maxWReps = s.reps;
        maxWDate = h.date;
      }
      if (maxR == null || s.reps > maxR) {
        maxR = s.reps;
        maxRDate = h.date;
      }
      if (ex.loadType == LoadType.weighted) {
        final v = e1rm(s.weight, s.reps);
        if (best == null || v > best) {
          best = v;
          bestSet = s;
          bestDate = h.date;
        }
      }
    }
  }
  return PersonalRecords(
    maxWeight: maxW,
    maxWeightReps: maxWReps,
    maxWeightDate: maxWDate,
    bestE1rm: best,
    bestE1rmSet: bestSet,
    bestE1rmDate: bestDate,
    maxReps: maxR,
    maxRepsDate: maxRDate,
  );
}

/// Recordes novos de uma sessão comparando com o histórico anterior a ela.
List<String> newRecords(Exercise ex, List<SetEntry> current, List<ExercisePerformance> before) {
  if (current.isEmpty || before.every((h) => h.sets.isEmpty)) return const [];
  final prev = personalRecords(ex, before);
  final cur = personalRecords(ex, [
    ExercisePerformance(sessionId: -1, date: DateTime.now(), sets: current),
  ]);
  final out = <String>[];
  final assisted = ex.loadType == LoadType.assisted;
  if (cur.maxWeight != null && prev.maxWeight != null) {
    final heavier = assisted ? cur.maxWeight! < prev.maxWeight! : cur.maxWeight! > prev.maxWeight!;
    if (heavier && (ex.loadType != LoadType.bodyweight || cur.maxWeight! > 0)) {
      out.add(assisted
          ? 'Menor assistência: ${fmtKg(cur.maxWeight)} kg'
          : 'Maior carga: ${fmtKg(cur.maxWeight)} kg × ${cur.maxWeightReps}');
    }
  }
  if (cur.bestE1rm != null && prev.bestE1rm != null && cur.bestE1rm! > prev.bestE1rm! * 1.001) {
    out.add('Melhor 1RM estimado: ${fmtKg(cur.bestE1rm!.roundToDouble())} kg');
  }
  if (ex.loadType != LoadType.weighted &&
      cur.maxReps != null &&
      prev.maxReps != null &&
      cur.maxReps! > prev.maxReps!) {
    out.add('Mais repetições: ${cur.maxReps}');
  }
  return out;
}
