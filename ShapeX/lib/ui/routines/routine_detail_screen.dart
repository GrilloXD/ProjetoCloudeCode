import 'package:flutter/material.dart';

import '../../data/models.dart';
import '../../logic/analytics.dart';
import '../../logic/formatters.dart';
import '../../logic/progression.dart';
import '../../state/app_state.dart';
import '../library/exercise_detail_screen.dart';
import '../theme.dart';
import '../widgets/common.dart';
import '../widgets/loader.dart';
import '../widgets/muscle_map.dart';
import 'routine_editor_screen.dart';
import 'routines_screen.dart';

class _Data {
  _Data(this.routine, this.history, this.subs);
  final Routine? routine;
  final Map<String, List<ExercisePerformance>> history;
  final List<Substitution> subs;
}

class RoutineDetailScreen extends StatelessWidget {
  const RoutineDetailScreen({super.key, required this.routineId});

  final int routineId;

  Future<_Data> _load(AppState app) async {
    final r = await app.repo.routine(routineId);
    if (r == null) return _Data(null, const {}, const []);
    final h = await app.repo.historyFor(r.exercises.map((e) => e.exerciseId));
    final subs = await app.repo.substitutions(routineId);
    return _Data(r, h, subs);
  }

  @override
  Widget build(BuildContext context) {
    return Loader<_Data>(
      load: _load,
      builder: (context, d) {
        final app = AppScope.of(context);
        final r = d.routine;
        if (r == null) {
          return const Scaffold(body: Center(child: Text('Treino removido')));
        }
        return Scaffold(
          appBar: AppBar(
            title: Text(r.name),
            actions: [
              IconButton(
                tooltip: 'Editar',
                icon: const Icon(Icons.edit_outlined),
                onPressed: () => Navigator.of(context)
                    .push(MaterialPageRoute(builder: (_) => RoutineEditorScreen(routineId: r.id!))),
              ),
            ],
          ),
          body: ListView(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
            children: [
              if (r.focus.isNotEmpty)
                Text(r.focus, style: const TextStyle(color: AppColors.textDim, fontSize: 15)),
              const SizedBox(height: 6),
              Text(
                '${r.weekday == null ? 'Sem dia fixo' : weekdayLong[r.weekday! - 1]} · ${r.exercises.length} exercícios · ${r.totalSets} séries · ~${estimateMinutes(r, app.exercises)} min',
                style: const TextStyle(color: AppColors.textMute, fontWeight: FontWeight.w600),
              ),
              const SizedBox(height: 14),
              for (final re in r.exercises) _SlotTile(re: re, history: d.history[re.exerciseId] ?? const []),
              if (d.subs.isNotEmpty) ...[
                const SectionHeader('Substituições feitas'),
                for (final s in d.subs.take(6))
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 4, horizontal: 4),
                    child: Text(
                      '${fmtDate(s.at)}: ${app.exercises[s.oldExerciseId]?.name ?? s.oldExerciseId} → ${app.exercises[s.newExerciseId]?.name ?? s.newExerciseId}',
                      style: const TextStyle(color: AppColors.textDim, fontSize: 13),
                    ),
                  ),
              ],
            ],
          ),
          bottomNavigationBar: SafeArea(
            minimum: const EdgeInsets.fromLTRB(16, 8, 16, 12),
            child: FilledButton.icon(
              key: const Key('start_routine'),
              onPressed: r.exercises.isEmpty ? null : () => startRoutine(context, r),
              icon: const Icon(Icons.play_arrow_rounded),
              label: const Text('Iniciar este treino'),
            ),
          ),
        );
      },
    );
  }
}

class _SlotTile extends StatelessWidget {
  const _SlotTile({required this.re, required this.history});

  final RoutineExercise re;
  final List<ExercisePerformance> history;

  @override
  Widget build(BuildContext context) {
    final app = AppScope.of(context);
    final ex = app.exercises[re.exerciseId];
    final rec = ex == null
        ? null
        : recommend(exercise: ex, sets: re.sets, repMin: re.repMin, repMax: re.repMax, history: history);
    final last = history.isEmpty
        ? null
        : history.last.sets.map((s) => s.weight).reduce((a, b) => a > b ? a : b);
    final stagnant = ex != null && isStagnant(ex, history);
    return XCard(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      onTap: ex == null
          ? null
          : () => Navigator.of(context)
              .push(MaterialPageRoute(builder: (_) => ExerciseDetailScreen(exerciseId: ex.id))),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              ExerciseThumb(ex, size: 48),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(ex?.name ?? re.exerciseId,
                        style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15)),
                    const SizedBox(height: 3),
                    Text(
                      '${ex?.primary.label ?? ''} · descanso ${restLabel(re.restSec)}${last != null ? ' · última: ${fmtKg(last)} kg' : ''}',
                      style: const TextStyle(color: AppColors.textDim, fontSize: 12.5),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Text(slotSummary(re.sets, re.repMin, re.repMax, false),
                  style: const TextStyle(fontWeight: FontWeight.w800, fontFeatures: tabular)),
            ],
          ),
          if (re.note.isNotEmpty) ...[
            const SizedBox(height: 8),
            Text(re.note, style: const TextStyle(color: AppColors.textDim, fontSize: 12.5)),
          ],
          if (rec != null && rec.kind != RecKind.start) ...[
            const SizedBox(height: 10),
            RecBanner(rec, compact: true),
          ],
          if (stagnant) ...[
            const SizedBox(height: 8),
            const Text('Sem evolução nas últimas 3 sessões. Considere um equivalente.',
                style: TextStyle(color: AppColors.warn, fontSize: 12.5, fontWeight: FontWeight.w700)),
          ],
        ],
      ),
    );
  }
}
