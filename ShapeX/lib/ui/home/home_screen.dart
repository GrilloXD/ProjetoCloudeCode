import 'package:flutter/material.dart';

import '../../data/models.dart';
import '../../logic/analytics.dart';
import '../../logic/formatters.dart';
import '../../logic/progression.dart';
import '../../state/app_state.dart';
import '../progress/body_weight.dart';
import '../routines/routine_detail_screen.dart';
import '../routines/routines_screen.dart';
import '../settings/settings_screen.dart';
import '../theme.dart';
import '../widgets/charts.dart';
import '../widgets/common.dart';
import '../widgets/loader.dart';
import '../widgets/muscle_map.dart';
import '../workout/workout_screen.dart';

class _HomeData {
  _HomeData({
    required this.routines,
    required this.week,
    required this.weights,
    required this.ready,
    required this.stagnant,
  });

  final List<Routine> routines;
  final List<Session> week;
  final List<BodyWeight> weights;
  final List<(Exercise, Recommendation)> ready;
  final List<Exercise> stagnant;
}

Future<_HomeData> _load(AppState app) async {
  final now = DateTime.now();
  final routines = await app.repo.routines();
  final week = await app.repo.sessions(from: startOfWeek(now));
  final weights = await app.repo.bodyWeights();
  final scheduled = routines.where((r) => r.weekday != null).toList();
  final ids = scheduled.expand((r) => r.exercises.map((e) => e.exerciseId)).toSet();
  final hist = await app.repo.historyFor(ids);
  final ready = <(Exercise, Recommendation)>[];
  final stagnant = <Exercise>[];
  final seen = <String>{};
  for (final r in sortByWeekday(scheduled)) {
    for (final re in r.exercises) {
      final ex = app.exercises[re.exerciseId];
      if (ex == null || !seen.add(ex.id)) continue;
      final h = hist[ex.id] ?? const [];
      final rec = recommend(exercise: ex, sets: re.sets, repMin: re.repMin, repMax: re.repMax, history: h);
      if (rec.kind == RecKind.increase) ready.add((ex, rec));
      if (isStagnant(ex, h)) stagnant.add(ex);
    }
  }
  return _HomeData(routines: routines, week: week, weights: weights, ready: ready, stagnant: stagnant);
}

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        bottom: false,
        child: Loader<_HomeData>(
          load: _load,
          builder: (context, d) => _HomeBody(d: d),
        ),
      ),
    );
  }
}

class _HomeBody extends StatelessWidget {
  const _HomeBody({required this.d});

  final _HomeData d;

  @override
  Widget build(BuildContext context) {
    final app = AppScope.of(context);
    final now = DateTime.now();
    final today = dateOnly(now);
    final scheduled = sortByWeekday(d.routines.where((r) => r.weekday != null).toList());
    final todayRoutine = scheduled.where((r) => r.weekday == now.weekday).firstOrNull;
    final doneToday = d.week.where((s) => dateOnly(s.startedAt) == today).toList();
    final todayDone = todayRoutine != null && doneToday.any((s) => s.routineId == todayRoutine.id);
    Routine? next;
    for (var i = 1; i <= 7 && scheduled.isNotEmpty; i++) {
      final wd = (now.weekday - 1 + i) % 7 + 1;
      next = scheduled.where((r) => r.weekday == wd).firstOrNull;
      if (next != null) break;
    }
    final hero = (todayRoutine != null && !todayDone) ? todayRoutine : next;

    final planned = plannedSetsPerMuscle(scheduled, app.exercises);
    final performed = performedSetsPerMuscle(d.week, app.exercises);
    final weekSets = d.week.fold(0, (a, s) => a + s.doneSetCount);
    final weekVolume = d.week.fold(0.0, (a, s) => a + s.volume);
    final insights = <Insight>[
      for (final (ex, rec) in d.ready.take(4)) Insight(InsightLevel.good, ex.name, rec.title),
      for (final ex in d.stagnant.take(3))
        Insight(InsightLevel.warn, '${ex.name} sem evolução',
            '3 sessões sem superar o desempenho anterior. Revise sono e alimentação ou troque por um equivalente.'),
      ...volumeInsights(planned),
    ];

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
      children: [
        Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(fmtDateLong(now),
                      style: const TextStyle(color: AppColors.textDim, fontWeight: FontWeight.w600)),
                  const SizedBox(height: 2),
                  const Text('Shape X',
                      style: TextStyle(fontSize: 28, fontWeight: FontWeight.w900, letterSpacing: -0.8)),
                ],
              ),
            ),
            IconButton(
              tooltip: 'Ajustes',
              icon: const Icon(Icons.settings_outlined),
              onPressed: () => Navigator.of(context)
                  .push(MaterialPageRoute(builder: (_) => const SettingsScreen())),
            ),
          ],
        ),
        const SizedBox(height: 14),
        if (app.workout != null)
          XCard(
            color: AppColors.accent,
            onTap: () => openWorkout(context),
            child: Row(
              children: [
                const Icon(Icons.play_circle_fill_rounded, color: AppColors.onAccent, size: 30),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Treino em andamento',
                          style: TextStyle(color: AppColors.onAccent, fontWeight: FontWeight.w600)),
                      Text(app.workout!.session.name,
                          style: const TextStyle(
                              color: AppColors.onAccent, fontWeight: FontWeight.w900, fontSize: 18)),
                    ],
                  ),
                ),
                const Text('Retomar',
                    style: TextStyle(color: AppColors.onAccent, fontWeight: FontWeight.w900)),
              ],
            ),
          )
        else if (hero != null)
          _HeroCard(
            routine: hero,
            isToday: hero == todayRoutine,
            todayDone: todayDone,
            restDay: todayRoutine == null,
          )
        else
          const XCard(
            child: EmptyState(
              icon: Icons.calendar_today_outlined,
              title: 'Nenhum treino na semana',
              text: 'Defina os dias na aba Treinos.',
            ),
          ),
        if (hero != null && hero == todayRoutine && next != null && next != todayRoutine) ...[
          const SizedBox(height: 10),
          XCard(
            onTap: () => Navigator.of(context)
                .push(MaterialPageRoute(builder: (_) => RoutineDetailScreen(routineId: next!.id!))),
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            child: Row(
              children: [
                const Text('Próximo', style: TextStyle(color: AppColors.textDim, fontWeight: FontWeight.w600)),
                const SizedBox(width: 10),
                Expanded(
                  child: Text('${next.name} · ${weekdayLong[next.weekday! - 1]}',
                      style: const TextStyle(fontWeight: FontWeight.w800), overflow: TextOverflow.ellipsis),
                ),
                const Icon(Icons.chevron_right_rounded, color: AppColors.textMute),
              ],
            ),
          ),
        ],
        const SectionHeader('Esta semana'),
        XCard(
          child: Column(
            children: [
              _WeekStrip(routines: scheduled, week: d.week),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: StatTile(
                        label: 'Treinos', value: '${d.week.length}', unit: 'de ${scheduled.length}'),
                  ),
                  Expanded(child: StatTile(label: 'Séries', value: '$weekSets')),
                  Expanded(child: StatTile(label: 'Volume', value: fmtThousands(weekVolume), unit: 'kg')),
                ],
              ),
            ],
          ),
        ),
        const SectionHeader('Volume semanal por músculo'),
        XCard(
          child: Column(
            children: [
              for (final m in Muscle.tracked)
                if ((planned[m] ?? 0) > 0)
                  VolumeBar(muscle: m, done: performed[m] ?? 0, planned: planned[m]!),
              const SizedBox(height: 6),
              const Text('Feitas / planejadas. Indiretas contam 0,5.',
                  style: TextStyle(color: AppColors.textMute, fontSize: 12)),
            ],
          ),
        ),
        const SectionHeader('Peso corporal'),
        _WeightCard(weights: d.weights),
        if (insights.isNotEmpty) ...[
          const SectionHeader('Recomendações'),
          XCard(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Column(children: [for (final i in insights) InsightTile(i)]),
          ),
        ],
      ],
    );
  }
}

class _HeroCard extends StatelessWidget {
  const _HeroCard({
    required this.routine,
    required this.isToday,
    required this.todayDone,
    required this.restDay,
  });

  final Routine routine;
  final bool isToday;
  final bool todayDone;
  final bool restDay;

  @override
  Widget build(BuildContext context) {
    final app = AppScope.of(context);
    final r = routine;
    final muscles = <Muscle>{};
    for (final re in r.exercises) {
      final e = app.exercises[re.exerciseId];
      if (e != null) muscles.add(e.primary);
    }
    final String label;
    if (isToday) {
      label = 'TREINO DE HOJE';
    } else if (todayDone) {
      label = 'HOJE CONCLUÍDO  ·  PRÓXIMO: ${weekdayLong[r.weekday! - 1].toUpperCase()}';
    } else {
      label = 'HOJE É DESCANSO  ·  PRÓXIMO: ${weekdayLong[r.weekday! - 1].toUpperCase()}';
    }
    return XCard(
      padding: const EdgeInsets.fromLTRB(18, 18, 18, 18),
      borderColor: AppColors.accent.withValues(alpha: isToday ? 0.45 : 0.0),
      onTap: () => Navigator.of(context)
          .push(MaterialPageRoute(builder: (_) => RoutineDetailScreen(routineId: r.id!))),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        if (todayDone && !isToday) ...[
                          const Icon(Icons.check_circle_rounded, color: AppColors.accent, size: 15),
                          const SizedBox(width: 5),
                        ],
                        Flexible(
                          child: Text(label,
                              style: const TextStyle(
                                  fontSize: 11.5,
                                  fontWeight: FontWeight.w800,
                                  letterSpacing: 1,
                                  color: AppColors.accent)),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(r.name,
                        style: const TextStyle(fontSize: 26, fontWeight: FontWeight.w900, letterSpacing: -0.6)),
                    const SizedBox(height: 4),
                    Text(r.focus, style: const TextStyle(color: AppColors.textDim, height: 1.3)),
                    const SizedBox(height: 12),
                    Text(
                      '${r.exercises.length} exercícios · ${r.totalSets} séries · ~${estimateMinutes(r, app.exercises)} min',
                      style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              SizedBox(width: 92, height: 120, child: MuscleMap(primary: muscles)),
            ],
          ),
          const SizedBox(height: 16),
          if (isToday)
            FilledButton.icon(
              key: const Key('home_start'),
              onPressed: () => startRoutine(context, r),
              icon: const Icon(Icons.play_arrow_rounded),
              label: const Text('Iniciar treino'),
            )
          else
            OutlinedButton.icon(
              key: const Key('home_start'),
              onPressed: () => startRoutine(context, r),
              icon: const Icon(Icons.play_arrow_rounded),
              label: const Text('Iniciar mesmo assim'),
            ),
        ],
      ),
    );
  }
}

class _WeekStrip extends StatelessWidget {
  const _WeekStrip({required this.routines, required this.week});

  final List<Routine> routines;
  final List<Session> week;

  @override
  Widget build(BuildContext context) {
    final now = DateTime.now();
    final start = startOfWeek(now);
    return Row(
      children: [
        for (var i = 0; i < 7; i++)
          Expanded(
            child: Builder(builder: (context) {
              final day = DateTime(start.year, start.month, start.day + i);
              final done = week.any((s) => dateOnly(s.startedAt) == day);
              final planned = routines.any((r) => r.weekday == i + 1);
              final isToday = day == dateOnly(now);
              final Color bg;
              final Color fg;
              if (done) {
                bg = AppColors.accent;
                fg = AppColors.onAccent;
              } else if (planned) {
                bg = AppColors.cardHigh;
                fg = AppColors.text;
              } else {
                bg = Colors.transparent;
                fg = AppColors.textMute;
              }
              return Column(
                children: [
                  Text(weekdayShort[i],
                      style: TextStyle(
                        fontSize: 11.5,
                        fontWeight: FontWeight.w700,
                        color: isToday ? AppColors.accent : AppColors.textDim,
                      )),
                  const SizedBox(height: 6),
                  Container(
                    width: 34,
                    height: 34,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      color: bg,
                      shape: BoxShape.circle,
                      border: isToday && !done ? Border.all(color: AppColors.accent, width: 1.6) : null,
                    ),
                    child: done
                        ? Icon(Icons.check_rounded, size: 18, color: fg)
                        : Text('${day.day}',
                            style: TextStyle(fontWeight: FontWeight.w800, color: fg, fontSize: 13)),
                  ),
                ],
              );
            }),
          ),
      ],
    );
  }
}

class _WeightCard extends StatelessWidget {
  const _WeightCard({required this.weights});

  final List<BodyWeight> weights;

  @override
  Widget build(BuildContext context) {
    final last = weights.isEmpty ? null : weights.last;
    final avg = movingAverage(weights);
    double? delta;
    if (avg.length >= 2) {
      final ref = avg.lastWhere(
        (b) => !b.date.isAfter(avg.last.date.subtract(const Duration(days: 7))),
        orElse: () => avg.first,
      );
      delta = avg.last.weight - ref.weight;
    }
    return XCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Expanded(
                child: StatTile(
                  label: last == null ? 'Sem registros' : 'Último · ${fmtDate(last.date)}',
                  value: last == null ? '-' : fmtKg(last.weight),
                  unit: 'kg',
                ),
              ),
              if (delta != null)
                Expanded(
                  child: StatTile(
                    label: 'Média 7 dias',
                    value: '${delta >= 0 ? '+' : ''}${fmtNum(delta, maxDecimals: 1)}',
                    unit: 'kg/sem',
                  ),
                ),
              FilledButton.tonalIcon(
                key: const Key('add_weight'),
                onPressed: () => addBodyWeight(context),
                icon: const Icon(Icons.add_rounded),
                label: const Text('Peso'),
                style: FilledButton.styleFrom(
                  backgroundColor: AppColors.cardHigh,
                  foregroundColor: AppColors.text,
                  minimumSize: const Size(0, 44),
                ),
              ),
            ],
          ),
          if (weights.length >= 2) ...[
            const SizedBox(height: 14),
            Sparkline(weights.reversed.take(30).toList().reversed.map((b) => b.weight).toList()),
          ],
        ],
      ),
    );
  }
}
