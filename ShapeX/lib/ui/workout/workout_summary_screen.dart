import 'package:flutter/material.dart';

import '../../logic/formatters.dart';
import '../../state/workout_controller.dart';
import '../theme.dart';
import '../widgets/common.dart';

class WorkoutSummaryScreen extends StatelessWidget {
  const WorkoutSummaryScreen({super.key, required this.summary});

  final FinishSummary summary;

  @override
  Widget build(BuildContext context) {
    final s = summary;
    return Scaffold(
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(20, 32, 20, 24),
          children: [
            Center(
              child: Container(
                width: 76,
                height: 76,
                decoration: BoxDecoration(
                  color: AppColors.accent.withValues(alpha: 0.14),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.check_rounded, size: 44, color: AppColors.accent),
              ),
            ),
            const SizedBox(height: 18),
            const Text('Treino concluído',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 26, fontWeight: FontWeight.w800, letterSpacing: -0.5)),
            const SizedBox(height: 4),
            Text(s.name,
                textAlign: TextAlign.center,
                style: const TextStyle(color: AppColors.textDim, fontSize: 16, fontWeight: FontWeight.w600)),
            const SizedBox(height: 24),
            XCard(
              child: Row(
                children: [
                  Expanded(child: StatTile(label: 'Duração', value: fmtDuration(s.duration))),
                  Expanded(child: StatTile(label: 'Séries', value: '${s.sets}')),
                  Expanded(child: StatTile(label: 'Volume', value: fmtThousands(s.volume), unit: 'kg')),
                ],
              ),
            ),
            if (s.records.isNotEmpty) ...[
              const SectionHeader('Recordes pessoais'),
              XCard(
                child: Column(
                  children: [
                    for (final r in s.records)
                      Padding(
                        padding: const EdgeInsets.symmetric(vertical: 6),
                        child: Row(
                          children: [
                            const Icon(Icons.emoji_events_outlined, color: AppColors.gold, size: 20),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(r.$1, style: const TextStyle(fontWeight: FontWeight.w700)),
                                  Text(r.$2, style: const TextStyle(color: AppColors.gold, fontSize: 13)),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                  ],
                ),
              ),
            ],
            if (s.goals.isNotEmpty) ...[
              const SectionHeader('Para a próxima sessão'),
              XCard(
                child: Column(
                  children: [
                    for (final g in s.goals)
                      Padding(
                        padding: const EdgeInsets.symmetric(vertical: 6),
                        child: Row(
                          children: [
                            const Icon(Icons.trending_up_rounded, color: AppColors.accent, size: 20),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(g.$1, style: const TextStyle(fontWeight: FontWeight.w700)),
                                  Text(g.$2, style: const TextStyle(color: AppColors.textDim, fontSize: 13)),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                  ],
                ),
              ),
            ],
            const SizedBox(height: 28),
            FilledButton(
              key: const Key('summary_done'),
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('Concluir'),
            ),
          ],
        ),
      ),
    );
  }
}
