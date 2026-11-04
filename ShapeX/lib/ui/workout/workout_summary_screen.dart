import 'package:flutter/material.dart';

import '../../logic/formatters.dart';
import '../../state/workout_controller.dart';
import '../theme.dart';
import '../widgets/common.dart';

class _DeltaRow extends StatelessWidget {
  const _DeltaRow({
    required this.label,
    required this.value,
    required this.delta,
    this.unit = '',
    this.neutral = false,
  });

  final String label;
  final String value;
  final double? delta;
  final String unit;
  final bool neutral;

  @override
  Widget build(BuildContext context) {
    final d = delta;
    final rounded = d == null ? 0 : d.round();
    final color = neutral || rounded == 0
        ? AppColors.textDim
        : (rounded > 0 ? AppColors.accent : AppColors.warn);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 5),
      child: Row(
        children: [
          Expanded(
            child: Text(label, style: const TextStyle(color: AppColors.textDim, fontWeight: FontWeight.w600)),
          ),
          Text(value, style: const TextStyle(fontWeight: FontWeight.w800, fontFeatures: tabular)),
          SizedBox(
            width: 76,
            child: Text(
              d == null ? '' : (rounded == 0 ? 'igual' : '${rounded > 0 ? '+' : ''}$rounded$unit'),
              textAlign: TextAlign.right,
              style: TextStyle(color: color, fontWeight: FontWeight.w800, fontFeatures: tabular),
            ),
          ),
        ],
      ),
    );
  }
}

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
            if (s.previous != null || s.compared > 0) ...[
              SectionHeader(s.previous == null
                  ? 'Comparado ao histórico'
                  : 'Comparado ao último ${s.name} (${fmtDate(s.previous!.startedAt)})'),
              XCard(
                key: const Key('summary_compare'),
                child: Column(
                  children: [
                    if (s.previous != null) ...[
                      _DeltaRow(
                        label: 'Volume',
                        value: '${fmtThousands(s.volume)} kg',
                        delta: s.previous!.volume <= 0
                            ? null
                            : (s.volume - s.previous!.volume) / s.previous!.volume * 100,
                        unit: '%',
                      ),
                      _DeltaRow(
                        label: 'Séries',
                        value: '${s.sets}',
                        delta: (s.sets - s.previous!.doneSetCount).toDouble(),
                      ),
                      _DeltaRow(
                        label: 'Duração',
                        value: fmtDuration(s.duration),
                        delta: (s.duration.inMinutes - s.previous!.duration.inMinutes).toDouble(),
                        unit: ' min',
                        neutral: true,
                      ),
                    ],
                    if (s.compared > 0)
                      Padding(
                        padding: const EdgeInsets.only(top: 8),
                        child: Row(
                          children: [
                            const Icon(Icons.insights_rounded, size: 18, color: AppColors.accent),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                'Evoluiu em ${s.improved} de ${s.compared} exercícios'
                                '${s.worse > 0 ? ', caiu em ${s.worse}' : ''}.',
                                style: const TextStyle(fontWeight: FontWeight.w700),
                              ),
                            ),
                          ],
                        ),
                      ),
                  ],
                ),
              ),
            ],
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
