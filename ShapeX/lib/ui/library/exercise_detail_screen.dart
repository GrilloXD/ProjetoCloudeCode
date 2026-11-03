import 'package:flutter/material.dart';

import '../../data/models.dart';
import '../../logic/formatters.dart';
import '../../logic/progression.dart';
import '../../logic/substitutions.dart';
import '../../state/app_state.dart';
import '../theme.dart';
import '../widgets/charts.dart';
import '../widgets/common.dart';
import '../widgets/loader.dart';
import '../widgets/muscle_map.dart';

enum _Metric { carga, reps, e1rm, volume }

class ExerciseDetailScreen extends StatefulWidget {
  const ExerciseDetailScreen({super.key, required this.exerciseId});

  final String exerciseId;

  @override
  State<ExerciseDetailScreen> createState() => _ExerciseDetailScreenState();
}

class _ExerciseDetailScreenState extends State<ExerciseDetailScreen> {
  _Metric _metric = _Metric.carga;

  List<LinePoint> _series(List<ExercisePerformance> h, Exercise ex) {
    return [
      for (final p in h)
        if (p.sets.isNotEmpty)
          LinePoint(
            p.date,
            switch (_metric) {
              _Metric.carga => ex.loadType == LoadType.assisted
                  ? p.sets.map((s) => s.weight).reduce((a, b) => a < b ? a : b)
                  : p.sets.map((s) => s.weight).reduce((a, b) => a > b ? a : b),
              _Metric.reps => p.sets.fold(0.0, (a, s) => a + s.reps),
              _Metric.e1rm => p.sets.map((s) => e1rm(s.weight, s.reps)).reduce((a, b) => a > b ? a : b),
              _Metric.volume => p.sets.fold(0.0, (a, s) => a + s.weight * s.reps),
            },
          ),
    ];
  }

  Future<void> _editIncrement(Exercise ex) async {
    final app = AppScope.read(context);
    const options = [1.0, 1.25, 2.0, 2.5, 4.0, 5.0, 10.0];
    final v = await showModalBottomSheet<double>(
      context: context,
      builder: (c) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Menor aumento possível neste equipamento',
                  style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800)),
              const SizedBox(height: 6),
              const Text('O app usa esse valor para recomendar a próxima carga.',
                  style: TextStyle(color: AppColors.textDim)),
              const SizedBox(height: 14),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  for (final o in options)
                    ChoiceChip(
                      label: Text('${fmtKg(o)} kg'),
                      selected: o == ex.increment,
                      labelStyle: TextStyle(
                        color: o == ex.increment ? AppColors.onAccent : AppColors.text,
                        fontWeight: FontWeight.w700,
                      ),
                      onSelected: (_) => Navigator.pop(c, o),
                    ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
    if (v == null) return;
    await app.repo.setIncrement(ex.id, v);
    app.changed();
  }

  @override
  Widget build(BuildContext context) {
    final app = AppScope.of(context);
    final ex = app.exercises[widget.exerciseId];
    if (ex == null) {
      return const Scaffold(body: Center(child: Text('Exercício não encontrado')));
    }
    return Scaffold(
      appBar: AppBar(),
      body: Loader<List<ExercisePerformance>>(
        load: (a) => a.repo.exerciseHistory(ex.id),
        builder: (context, history) {
          final pr = personalRecords(ex, history);
          final points = _series(history, ex);
          final eq = equivalents(ex, app.exercises.values, limit: 6);
          return ListView(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 32),
            children: [
              Text(ex.name, style: Theme.of(context).textTheme.headlineSmall),
              const SizedBox(height: 10),
              Wrap(spacing: 6, runSpacing: 6, children: [
                Pill(ex.primary.label, color: AppColors.accent, filled: true),
                for (final m in ex.secondary) Pill(m.label),
                Pill(ex.equipment.label, icon: Icons.fitness_center_rounded),
                if (ex.unilateral) const Pill('Unilateral'),
              ]),
              const SizedBox(height: 14),
              XCard(
                padding: const EdgeInsets.all(12),
                child: Column(
                  children: [
                    SizedBox(height: 250, child: MuscleMap.forExercise(ex)),
                    const SizedBox(height: 8),
                    const Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        _Legend(color: AppColors.accent, label: 'Principal'),
                        SizedBox(width: 18),
                        _Legend(color: Color(0x61C6F24E), label: 'Auxiliar'),
                      ],
                    ),
                  ],
                ),
              ),
              if (ex.instructions.isNotEmpty) ...[
                const SectionHeader('Como executar'),
                XCard(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      for (var i = 0; i < ex.instructions.length; i++)
                        Padding(
                          padding: const EdgeInsets.symmetric(vertical: 5),
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Container(
                                width: 22,
                                height: 22,
                                alignment: Alignment.center,
                                decoration: BoxDecoration(
                                  color: AppColors.accent.withValues(alpha: 0.14),
                                  shape: BoxShape.circle,
                                ),
                                child: Text('${i + 1}',
                                    style: const TextStyle(
                                        color: AppColors.accent, fontSize: 12, fontWeight: FontWeight.w800)),
                              ),
                              const SizedBox(width: 10),
                              Expanded(child: Text(ex.instructions[i], style: const TextStyle(height: 1.4))),
                            ],
                          ),
                        ),
                      if (ex.tip.isNotEmpty) ...[
                        const SizedBox(height: 8),
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Icon(Icons.lightbulb_outline_rounded, size: 18, color: AppColors.gold),
                            const SizedBox(width: 8),
                            Expanded(
                                child: Text(ex.tip,
                                    style: const TextStyle(color: AppColors.textDim, height: 1.4))),
                          ],
                        ),
                      ],
                    ],
                  ),
                ),
              ],
              const SectionHeader('Recordes'),
              XCard(
                child: pr.isEmpty
                    ? const Text('Nenhum registro ainda.', style: TextStyle(color: AppColors.textDim))
                    : Row(
                        children: [
                          Expanded(
                            child: StatTile(
                              label: ex.loadType == LoadType.assisted ? 'Menor assistência' : 'Maior carga',
                              value: fmtKg(pr.maxWeight),
                              unit: 'kg × ${pr.maxWeightReps}',
                            ),
                          ),
                          if (pr.bestE1rm != null)
                            Expanded(
                              child: StatTile(
                                  label: '1RM estimado', value: fmtKg(pr.bestE1rm!.roundToDouble()), unit: 'kg'),
                            ),
                          Expanded(child: StatTile(label: 'Sessões', value: '${history.length}')),
                        ],
                      ),
              ),
              const SectionHeader('Evolução'),
              XCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    SegmentedButton<_Metric>(
                      segments: const [
                        ButtonSegment(value: _Metric.carga, label: Text('Carga')),
                        ButtonSegment(value: _Metric.reps, label: Text('Reps')),
                        ButtonSegment(value: _Metric.e1rm, label: Text('1RM')),
                        ButtonSegment(value: _Metric.volume, label: Text('Volume')),
                      ],
                      selected: {_metric},
                      showSelectedIcon: false,
                      onSelectionChanged: (s) => setState(() => _metric = s.first),
                    ),
                    const SizedBox(height: 14),
                    LineChart(points: points, unit: _metric == _Metric.reps ? 'reps' : 'kg'),
                  ],
                ),
              ),
              const SectionHeader('Histórico'),
              if (history.isEmpty)
                const XCard(child: Text('Sem sessões registradas.', style: TextStyle(color: AppColors.textDim)))
              else
                XCard(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  child: Column(
                    children: [
                      for (final p in history.reversed.take(12))
                        Padding(
                          padding: const EdgeInsets.symmetric(vertical: 8),
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              SizedBox(
                                width: 64,
                                child: Text(fmtDate(p.date),
                                    style: const TextStyle(fontWeight: FontWeight.w700, fontFeatures: tabular)),
                              ),
                              Expanded(
                                child: Text(
                                  p.sets.map((s) => '${fmtKg(s.weight)}×${s.reps}').join('   '),
                                  style: const TextStyle(color: AppColors.textDim, fontFeatures: tabular),
                                ),
                              ),
                            ],
                          ),
                        ),
                    ],
                  ),
                ),
              const SectionHeader('Ajustes'),
              XCard(
                onTap: () => _editIncrement(ex),
                child: Row(
                  children: [
                    const Icon(Icons.tune_rounded, color: AppColors.textDim),
                    const SizedBox(width: 12),
                    const Expanded(
                      child: Text('Incremento de carga', style: TextStyle(fontWeight: FontWeight.w700)),
                    ),
                    Text('${fmtKg(ex.increment)} kg',
                        style: const TextStyle(color: AppColors.accent, fontWeight: FontWeight.w800)),
                  ],
                ),
              ),
              if (eq.isNotEmpty) ...[
                const SectionHeader('Equivalentes'),
                XCard(
                  padding: const EdgeInsets.symmetric(vertical: 4),
                  child: Column(
                    children: [
                      for (final e in eq)
                        ListTile(
                          leading: ExerciseThumb(e, size: 42),
                          title: Text(e.name, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
                          subtitle: Text(e.equipment.label, style: const TextStyle(color: AppColors.textDim)),
                          onTap: () => Navigator.of(context).push(
                              MaterialPageRoute(builder: (_) => ExerciseDetailScreen(exerciseId: e.id))),
                        ),
                    ],
                  ),
                ),
              ],
            ],
          );
        },
      ),
    );
  }
}

class _Legend extends StatelessWidget {
  const _Legend({required this.color, required this.label});

  final Color color;
  final String label;

  @override
  Widget build(BuildContext context) => Row(
        children: [
          Container(width: 10, height: 10, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
          const SizedBox(width: 6),
          Text(label, style: const TextStyle(color: AppColors.textDim, fontSize: 12, fontWeight: FontWeight.w600)),
        ],
      );
}
