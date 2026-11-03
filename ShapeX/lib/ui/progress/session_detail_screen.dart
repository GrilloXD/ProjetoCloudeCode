import 'package:flutter/material.dart';

import '../../data/models.dart';
import '../../logic/formatters.dart';
import '../../state/app_state.dart';
import '../theme.dart';
import '../widgets/common.dart';
import '../widgets/loader.dart';
import '../widgets/muscle_map.dart';

class SessionDetailScreen extends StatelessWidget {
  const SessionDetailScreen({super.key, required this.sessionId});

  final int sessionId;

  @override
  Widget build(BuildContext context) {
    return Loader<Session?>(
      load: (a) async {
        final list = await a.repo.sessions();
        return list.where((s) => s.id == sessionId).firstOrNull;
      },
      builder: (context, s) {
        if (s == null) return const Scaffold(body: Center(child: Text('Sessão removida')));
        final app = AppScope.of(context);
        return Scaffold(
          appBar: AppBar(
            title: Text(s.name),
            actions: [
              IconButton(
                tooltip: 'Apagar sessão',
                icon: const Icon(Icons.delete_outline_rounded, color: AppColors.danger),
                onPressed: () async {
                  final nav = Navigator.of(context);
                  final ok = await confirm(context, 'Apagar sessão?',
                      'O histórico, os gráficos e os recordes serão recalculados sem ela.',
                      ok: 'Apagar', danger: true);
                  if (!ok) return;
                  await app.repo.deleteSession(s.id!);
                  app.changed();
                  nav.pop();
                },
              ),
            ],
          ),
          body: ListView(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 32),
            children: [
              Text(
                '${fmtDateLong(s.startedAt)} · ${s.startedAt.hour.toString().padLeft(2, '0')}:${s.startedAt.minute.toString().padLeft(2, '0')}',
                style: const TextStyle(color: AppColors.textDim, fontWeight: FontWeight.w600),
              ),
              const SizedBox(height: 12),
              XCard(
                child: Row(
                  children: [
                    Expanded(child: StatTile(label: 'Duração', value: fmtDuration(s.duration))),
                    Expanded(child: StatTile(label: 'Séries', value: '${s.doneSetCount}')),
                    Expanded(child: StatTile(label: 'Volume', value: fmtThousands(s.volume), unit: 'kg')),
                  ],
                ),
              ),
              const SizedBox(height: 12),
              for (final se in s.exercises)
                Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: XCard(
                    padding: const EdgeInsets.all(14),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            ExerciseThumb(app.exercises[se.exerciseId], size: 40),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Text(app.exercises[se.exerciseId]?.name ?? se.exerciseId,
                                  style: const TextStyle(fontWeight: FontWeight.w800)),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        for (var i = 0; i < se.sets.length; i++)
                          Padding(
                            padding: const EdgeInsets.symmetric(vertical: 3),
                            child: Row(
                              children: [
                                SizedBox(
                                  width: 28,
                                  child: Text('${i + 1}',
                                      style: const TextStyle(color: AppColors.textDim, fontWeight: FontWeight.w700)),
                                ),
                                Text('${fmtKg(se.sets[i].weight)} kg × ${se.sets[i].reps ?? '-'}',
                                    style: const TextStyle(fontWeight: FontWeight.w700, fontFeatures: tabular)),
                              ],
                            ),
                          ),
                      ],
                    ),
                  ),
                ),
            ],
          ),
        );
      },
    );
  }
}
