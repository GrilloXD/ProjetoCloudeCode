import 'package:flutter/material.dart';

import '../../data/models.dart';
import '../../logic/analytics.dart';
import '../../logic/formatters.dart';
import '../../state/app_state.dart';
import '../settings/about_program_screen.dart';
import '../theme.dart';
import '../widgets/common.dart';
import '../widgets/loader.dart';
import '../workout/workout_screen.dart';
import 'programs_screen.dart';
import 'routine_detail_screen.dart';
import 'routine_editor_screen.dart';

List<Routine> sortByWeekday(List<Routine> rs) => [...rs]
  ..sort((a, b) {
    final wa = a.weekday ?? 99;
    final wb = b.weekday ?? 99;
    return wa != wb ? wa.compareTo(wb) : a.position.compareTo(b.position);
  });

Future<void> startRoutine(BuildContext context, Routine r) async {
  final app = AppScope.read(context);
  if (app.workout != null) {
    final choice = await showDialog<String>(
      context: context,
      builder: (c) => AlertDialog(
        title: const Text('Treino em andamento', style: TextStyle(fontWeight: FontWeight.w800)),
        content: Text('${app.workout!.session.name} ainda está aberto.',
            style: const TextStyle(color: AppColors.textDim)),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(c, 'discard'),
            style: TextButton.styleFrom(foregroundColor: AppColors.danger),
            child: const Text('Descartar e iniciar'),
          ),
          TextButton(onPressed: () => Navigator.pop(c, 'resume'), child: const Text('Retomar')),
        ],
      ),
    );
    if (!context.mounted || choice == null) return;
    if (choice == 'resume') {
      await openWorkout(context);
      return;
    }
    await app.workout!.discard();
  }
  await app.startWorkout(r);
  if (context.mounted) await openWorkout(context);
}

class RoutinesScreen extends StatelessWidget {
  const RoutinesScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Treinos'),
        actions: [
          IconButton(
            tooltip: 'Novo treino',
            icon: const Icon(Icons.add_rounded),
            onPressed: () async {
              final app = AppScope.read(context);
              final nav = Navigator.of(context);
              final id = await app.repo.createRoutine('Novo treino');
              app.changed();
              nav.push(MaterialPageRoute(builder: (_) => RoutineEditorScreen(routineId: id)));
            },
          ),
        ],
      ),
      body: Loader<(List<Routine>, ProgramStatus)>(
        load: (a) async => (await a.repo.routines(), await ProgramStatus.load(a)),
        builder: (context, data) {
          final (routines, status) = data;
          final app = AppScope.of(context);
          final sorted = sortByWeekday(routines);
          final planned = plannedSetsPerMuscle(routines.where((r) => r.weekday != null), app.exercises);
          final freq = plannedFrequency(routines, app.exercises);
          final scheduled = routines.where((r) => r.weekday != null).length;
          final weeklySets = routines.where((r) => r.weekday != null).fold(0, (a, r) => a + r.totalSets);
          return ListView(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 32),
            children: [
              ProgramStatusCard(status: status),
              const SectionHeader('Sua semana'),
              for (final r in sorted)
                Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: RoutineCard(routine: r),
                ),
              const SizedBox(height: 4),
              XCard(
                onTap: () => _showVolume(context, planned, freq),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const Expanded(
                          child: Text('Programa semanal',
                              style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800)),
                        ),
                        Text('$scheduled dias · $weeklySets séries',
                            style: const TextStyle(color: AppColors.textDim, fontWeight: FontWeight.w700)),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Wrap(
                      spacing: 6,
                      runSpacing: 6,
                      children: [
                        for (final m in Muscle.tracked)
                          if ((planned[m] ?? 0) > 0)
                            Pill('${m.label} ${setsLabel(planned[m]!)}'
                                '${(freq[m] ?? 0) > 0 ? ' · ${freq[m]}x' : ''}'),
                      ],
                    ),
                    const SizedBox(height: 10),
                    const Text('Séries por semana (indiretas contam 0,5) e frequência. Toque para detalhes.',
                        style: TextStyle(color: AppColors.textMute, fontSize: 12)),
                  ],
                ),
              ),
              const SizedBox(height: 10),
              XCard(
                onTap: () => Navigator.of(context)
                    .push(MaterialPageRoute(builder: (_) => const AboutProgramScreen())),
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                child: const Row(
                  children: [
                    Icon(Icons.science_outlined, color: AppColors.accent),
                    SizedBox(width: 12),
                    Expanded(
                      child: Text('Por que este programa',
                          style: TextStyle(fontWeight: FontWeight.w700)),
                    ),
                    Icon(Icons.chevron_right_rounded, color: AppColors.textMute),
                  ],
                ),
              ),
              const SizedBox(height: 6),
              OutlinedButton.icon(
                onPressed: () async {
                  final app = AppScope.read(context);
                  if (app.workout != null) {
                    await openWorkout(context);
                    return;
                  }
                  await app.startEmptyWorkout();
                  if (context.mounted) await openWorkout(context);
                },
                icon: const Icon(Icons.bolt_rounded),
                label: const Text('Treino livre'),
              ),
            ],
          );
        },
      ),
    );
  }

  void _showVolume(BuildContext context, Map<Muscle, double> planned, Map<Muscle, int> freq) {
    final insights = volumeInsights(planned);
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      builder: (c) => DraggableScrollableSheet(
        expand: false,
        initialChildSize: 0.75,
        builder: (c, scroll) => ListView(
          controller: scroll,
          padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
          children: [
            const Text('Volume semanal planejado', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
            const SizedBox(height: 4),
            const Text('Faixa de referência: 10 a 20 séries por músculo por semana.',
                style: TextStyle(color: AppColors.textDim)),
            const SizedBox(height: 12),
            for (final m in Muscle.tracked)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 7),
                child: Row(
                  children: [
                    Expanded(child: Text(m.label, style: const TextStyle(fontWeight: FontWeight.w600))),
                    Text('${freq[m] ?? 0}x',
                        style: const TextStyle(color: AppColors.textDim, fontFeatures: tabular)),
                    const SizedBox(width: 18),
                    SizedBox(
                      width: 70,
                      child: Text('${setsLabel(planned[m] ?? 0)} séries',
                          textAlign: TextAlign.right,
                          style: TextStyle(
                            fontWeight: FontWeight.w800,
                            fontFeatures: tabular,
                            color: (planned[m] ?? 0) > volumeHigh ? AppColors.warn : AppColors.text,
                          )),
                    ),
                  ],
                ),
              ),
            if (insights.isNotEmpty) ...[
              const SizedBox(height: 12),
              for (final i in insights) InsightTile(i),
            ],
          ],
        ),
      ),
    );
  }
}

class RoutineCard extends StatelessWidget {
  const RoutineCard({super.key, required this.routine, this.highlight = false});

  final Routine routine;
  final bool highlight;

  @override
  Widget build(BuildContext context) {
    final app = AppScope.of(context);
    final r = routine;
    return XCard(
      borderColor: highlight ? AppColors.accent.withValues(alpha: 0.5) : null,
      onTap: () => Navigator.of(context)
          .push(MaterialPageRoute(builder: (_) => RoutineDetailScreen(routineId: r.id!))),
      child: Row(
        children: [
          Container(
            width: 50,
            height: 50,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: highlight ? AppColors.accent : AppColors.cardHigh,
              borderRadius: BorderRadius.circular(14),
            ),
            child: Text(
              r.weekday == null ? '--' : weekdayShort[r.weekday! - 1].toUpperCase(),
              style: TextStyle(
                fontWeight: FontWeight.w900,
                fontSize: 13,
                color: highlight ? AppColors.onAccent : AppColors.text,
              ),
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(r.name, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
                if (r.focus.isNotEmpty) ...[
                  const SizedBox(height: 2),
                  Text(r.focus,
                      style: const TextStyle(color: AppColors.textDim, fontSize: 13),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis),
                ],
                const SizedBox(height: 4),
                Text(
                  '${r.exercises.length} exercícios · ${r.totalSets} séries · ~${estimateMinutes(r, app.exercises)} min',
                  style: const TextStyle(color: AppColors.textMute, fontSize: 12.5, fontWeight: FontWeight.w600),
                ),
              ],
            ),
          ),
          const Icon(Icons.chevron_right_rounded, color: AppColors.textMute),
        ],
      ),
    );
  }
}
