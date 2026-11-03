import 'package:flutter/material.dart';

import '../../data/models.dart';
import '../../logic/analytics.dart';
import '../../logic/formatters.dart';
import '../../logic/progression.dart';
import '../../state/app_state.dart';
import '../library/exercise_detail_screen.dart';
import '../theme.dart';
import '../widgets/charts.dart';
import '../widgets/common.dart';
import '../widgets/loader.dart';
import '../widgets/muscle_map.dart';
import 'body_weight.dart';
import 'session_detail_screen.dart';

class ProgressScreen extends StatelessWidget {
  const ProgressScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 4,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Progresso'),
          bottom: const TabBar(
            isScrollable: true,
            tabAlignment: TabAlignment.start,
            dividerColor: Colors.transparent,
            indicatorColor: AppColors.accent,
            labelColor: AppColors.text,
            unselectedLabelColor: AppColors.textDim,
            labelStyle: TextStyle(fontWeight: FontWeight.w800, fontSize: 14),
            tabs: [
              Tab(text: 'Histórico'),
              Tab(text: 'Gráficos'),
              Tab(text: 'Recordes'),
              Tab(text: 'Peso'),
            ],
          ),
        ),
        body: const TabBarView(
          children: [
            _HistoryTab(),
            _ChartsTab(),
            _RecordsTab(),
            BodyWeightTab(),
          ],
        ),
      ),
    );
  }
}

class _HistoryTab extends StatelessWidget {
  const _HistoryTab();

  @override
  Widget build(BuildContext context) {
    return Loader<List<Session>>(
      load: (a) => a.repo.sessions(limit: 400),
      builder: (context, sessions) {
        if (sessions.isEmpty) {
          return const EmptyState(
            icon: Icons.history_rounded,
            title: 'Nenhum treino registrado',
            text: 'Os treinos finalizados aparecem aqui.',
          );
        }
        final children = <Widget>[];
        String? month;
        for (final s in sessions) {
          final m = '${monthLong[s.startedAt.month - 1]} ${s.startedAt.year}';
          if (m != month) {
            month = m;
            children.add(SectionHeader(m, padding: const EdgeInsets.fromLTRB(4, 18, 4, 8)));
          }
          children.add(Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: XCard(
              onTap: () => Navigator.of(context)
                  .push(MaterialPageRoute(builder: (_) => SessionDetailScreen(sessionId: s.id!))),
              padding: const EdgeInsets.all(14),
              child: Row(
                children: [
                  Container(
                    width: 48,
                    height: 48,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      color: AppColors.cardHigh,
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text('${s.startedAt.day}',
                            style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 17, height: 1)),
                        Text(weekdayShort[s.startedAt.weekday - 1],
                            style: const TextStyle(color: AppColors.textDim, fontSize: 11)),
                      ],
                    ),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(s.name, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15)),
                        const SizedBox(height: 3),
                        Text(
                          '${fmtDuration(s.duration)} · ${s.doneSetCount} séries · ${fmtThousands(s.volume)} kg',
                          style: const TextStyle(color: AppColors.textDim, fontSize: 13),
                        ),
                      ],
                    ),
                  ),
                  const Icon(Icons.chevron_right_rounded, color: AppColors.textMute),
                ],
              ),
            ),
          ));
        }
        return ListView(padding: const EdgeInsets.fromLTRB(16, 0, 16, 32), children: children);
      },
    );
  }
}

class _ChartsData {
  _ChartsData(this.sessions, this.routines, this.history);
  final List<Session> sessions;
  final List<Routine> routines;
  final Map<String, List<ExercisePerformance>> history;
}

class _ChartsTab extends StatefulWidget {
  const _ChartsTab();

  @override
  State<_ChartsTab> createState() => _ChartsTabState();
}

class _ChartsTabState extends State<_ChartsTab> {
  int _weekOffset = 0;

  static Future<_ChartsData> _load(AppState app) async {
    final from = startOfWeek(DateTime.now()).subtract(const Duration(days: 7 * 11));
    final sessions = await app.repo.sessions(from: from);
    final routines = await app.repo.routines();
    final ids = await app.repo.performedExerciseIds();
    final history = await app.repo.historyFor(ids);
    return _ChartsData(sessions, routines, history);
  }

  @override
  Widget build(BuildContext context) {
    return Loader<_ChartsData>(
      load: _load,
      builder: (context, d) {
        final app = AppScope.of(context);
        final buckets = weekBuckets(d.sessions, weeks: 12);
        final selected = buckets[buckets.length - 1 - _weekOffset];
        final scheduled = d.routines.where((r) => r.weekday != null);
        final planned = plannedSetsPerMuscle(scheduled, app.exercises);
        final performed = performedSetsPerMuscle(selected.sessions, app.exercises);
        final freq = muscleFrequency(selected.sessions, app.exercises);
        final plannedDays = scheduled.length.toDouble();
        final end = selected.start.add(const Duration(days: 6));
        final top = d.history.entries.where((e) => e.value.length >= 2).toList()
          ..sort((a, b) => b.value.length.compareTo(a.value.length));
        return ListView(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 32),
          children: [
            XCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Row(
                    children: [
                      const Expanded(
                        child: Text('Volume por músculo',
                            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
                      ),
                      IconButton(
                        visualDensity: VisualDensity.compact,
                        onPressed: _weekOffset < 11 ? () => setState(() => _weekOffset++) : null,
                        icon: const Icon(Icons.chevron_left_rounded),
                      ),
                      Text(
                        _weekOffset == 0 ? 'Esta semana' : '${fmtDate(selected.start)} a ${fmtDate(end)}',
                        style: const TextStyle(color: AppColors.textDim, fontWeight: FontWeight.w700),
                      ),
                      IconButton(
                        visualDensity: VisualDensity.compact,
                        onPressed: _weekOffset > 0 ? () => setState(() => _weekOffset--) : null,
                        icon: const Icon(Icons.chevron_right_rounded),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  for (final m in Muscle.tracked)
                    if ((planned[m] ?? 0) > 0 || (performed[m] ?? 0) > 0)
                      VolumeBar(muscle: m, done: performed[m] ?? 0, planned: planned[m] ?? 0),
                  const SizedBox(height: 8),
                  Text(
                    freq.isEmpty
                        ? 'Nenhum treino nesta semana.'
                        : 'Frequência: ${Muscle.tracked.where(freq.containsKey).map((m) => '${m.label} ${freq[m]}x').join(', ')}',
                    style: const TextStyle(color: AppColors.textMute, fontSize: 12),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),
            XCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Treinos por semana', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
                  const SizedBox(height: 4),
                  Text('Linha tracejada: ${plannedDays.toInt()} dias planejados',
                      style: const TextStyle(color: AppColors.textMute, fontSize: 12)),
                  const SizedBox(height: 12),
                  BarChart(
                    data: [
                      for (var i = 0; i < buckets.length; i++)
                        BarDatum(fmtDate(buckets[i].start).substring(0, 2), buckets[i].count.toDouble(),
                            highlight: i == buckets.length - 1),
                    ],
                    target: plannedDays,
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),
            XCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Séries por semana', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
                  const SizedBox(height: 12),
                  BarChart(
                    data: [
                      for (var i = 0; i < buckets.length; i++)
                        BarDatum(fmtDate(buckets[i].start).substring(0, 2), buckets[i].sets.toDouble(),
                            highlight: i == buckets.length - 1),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),
            XCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Volume de carga por semana',
                      style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
                  const SizedBox(height: 4),
                  const Text('Soma de carga × repetições, em toneladas',
                      style: TextStyle(color: AppColors.textMute, fontSize: 12)),
                  const SizedBox(height: 12),
                  BarChart(
                    data: [
                      for (var i = 0; i < buckets.length; i++)
                        BarDatum(fmtDate(buckets[i].start).substring(0, 2), buckets[i].volume / 1000,
                            highlight: i == buckets.length - 1),
                    ],
                    format: (v) => fmtNum(v, maxDecimals: 1),
                  ),
                ],
              ),
            ),
            const SectionHeader('Evolução por exercício'),
            if (top.isEmpty)
              const XCard(
                child: Text('Os gráficos aparecem depois de 2 sessões do mesmo exercício.',
                    style: TextStyle(color: AppColors.textDim)),
              )
            else
              for (final e in top.take(20))
                if (app.exercises[e.key] != null) _ExerciseTrend(ex: app.exercises[e.key]!, history: e.value),
          ],
        );
      },
    );
  }
}

class _ExerciseTrend extends StatelessWidget {
  const _ExerciseTrend({required this.ex, required this.history});

  final Exercise ex;
  final List<ExercisePerformance> history;

  @override
  Widget build(BuildContext context) {
    final values = [for (final h in history) performanceScore(ex, h.sets)];
    final first = values.first;
    final last = values.last;
    final pct = first <= 0 ? 0.0 : (last - first) / first * 100;
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: XCard(
        padding: const EdgeInsets.all(12),
        onTap: () => Navigator.of(context)
            .push(MaterialPageRoute(builder: (_) => ExerciseDetailScreen(exerciseId: ex.id))),
        child: Row(
          children: [
            ExerciseThumb(ex, size: 42),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(ex.name,
                      style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14),
                      overflow: TextOverflow.ellipsis),
                  Text('${history.length} sessões',
                      style: const TextStyle(color: AppColors.textDim, fontSize: 12)),
                ],
              ),
            ),
            SizedBox(width: 70, child: Sparkline(values, height: 30)),
            const SizedBox(width: 10),
            SizedBox(
              width: 54,
              child: Text(
                '${pct >= 0 ? '+' : ''}${fmtNum(pct, maxDecimals: 0)}%',
                textAlign: TextAlign.right,
                style: TextStyle(
                  fontWeight: FontWeight.w800,
                  fontFeatures: tabular,
                  color: pct > 0 ? AppColors.accent : (pct < 0 ? AppColors.warn : AppColors.textDim),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _RecordsTab extends StatelessWidget {
  const _RecordsTab();

  static Future<Map<String, List<ExercisePerformance>>> _load(AppState app) async {
    final ids = await app.repo.performedExerciseIds();
    return app.repo.historyFor(ids);
  }

  @override
  Widget build(BuildContext context) {
    return Loader<Map<String, List<ExercisePerformance>>>(
      load: _load,
      builder: (context, hist) {
        final app = AppScope.of(context);
        final items = hist.entries
            .where((e) => app.exercises[e.key] != null && e.value.isNotEmpty)
            .map((e) => (app.exercises[e.key]!, personalRecords(app.exercises[e.key]!, e.value)))
            .toList()
          ..sort((a, b) => a.$1.name.compareTo(b.$1.name));
        if (items.isEmpty) {
          return const EmptyState(
            icon: Icons.emoji_events_outlined,
            title: 'Sem recordes ainda',
            text: 'Finalize treinos para ver suas melhores marcas.',
          );
        }
        return ListView(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 32),
          children: [
            for (final (ex, pr) in items)
              Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: XCard(
                  padding: const EdgeInsets.all(14),
                  onTap: () => Navigator.of(context)
                      .push(MaterialPageRoute(builder: (_) => ExerciseDetailScreen(exerciseId: ex.id))),
                  child: Row(
                    children: [
                      ExerciseThumb(ex, size: 42),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(ex.name, style: const TextStyle(fontWeight: FontWeight.w700)),
                            const SizedBox(height: 2),
                            Text(
                              '${fmtKg(pr.maxWeight)} kg × ${pr.maxWeightReps} em ${fmtDate(pr.maxWeightDate!)}',
                              style: const TextStyle(color: AppColors.textDim, fontSize: 12.5),
                            ),
                          ],
                        ),
                      ),
                      if (pr.bestE1rm != null)
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            Text(fmtKg(pr.bestE1rm!.roundToDouble()),
                                style: const TextStyle(
                                    fontWeight: FontWeight.w900, fontSize: 18, fontFeatures: tabular)),
                            const Text('1RM est.', style: TextStyle(color: AppColors.textMute, fontSize: 11)),
                          ],
                        ),
                    ],
                  ),
                ),
              ),
          ],
        );
      },
    );
  }
}
