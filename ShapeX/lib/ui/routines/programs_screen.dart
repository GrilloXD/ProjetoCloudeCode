import 'package:flutter/material.dart';

import '../../data/seed/program_seed.dart';
import '../../logic/formatters.dart';
import '../../state/app_state.dart';
import '../theme.dart';
import '../widgets/common.dart';
import '../widgets/loader.dart';

class ProgramStatus {
  ProgramStatus(this.program, this.since);

  final SeedProgram program;
  final DateTime? since;

  int get days => since == null ? 0 : DateTime.now().difference(since!).inDays;
  int get week => (days ~/ 7 + 1).clamp(1, program.weeks);
  bool get finished => days >= program.weeks * 7;
  SeedProgram? get next => program.nextId == null ? null : programById(program.nextId);

  static Future<ProgramStatus> load(AppState app) async =>
      ProgramStatus(await app.repo.activeProgram(), await app.repo.programSince());
}

Future<void> openPrograms(BuildContext context) =>
    Navigator.of(context).push(MaterialPageRoute(builder: (_) => const ProgramsScreen()));

class ProgramStatusCard extends StatelessWidget {
  const ProgramStatusCard({super.key, required this.status});

  final ProgramStatus status;

  @override
  Widget build(BuildContext context) {
    final s = status;
    final next = s.next;
    return XCard(
      onTap: () => openPrograms(context),
      borderColor: s.finished ? AppColors.accent.withValues(alpha: 0.5) : null,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              const Icon(Icons.flag_outlined, color: AppColors.accent, size: 20),
              const SizedBox(width: 8),
              Expanded(
                child: Text('Programa ${s.program.name}',
                    style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
              ),
              Text(s.finished ? 'Ciclo concluído' : 'Semana ${s.week} de ${s.program.weeks}',
                  style: TextStyle(
                    fontWeight: FontWeight.w800,
                    color: s.finished ? AppColors.accent : AppColors.textDim,
                    fontFeatures: tabular,
                  )),
            ],
          ),
          const SizedBox(height: 10),
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: (s.days / (s.program.weeks * 7)).clamp(0.0, 1.0),
              minHeight: 6,
              backgroundColor: AppColors.cardHigh,
              color: AppColors.accent,
            ),
          ),
          const SizedBox(height: 10),
          Text(
            s.finished
                ? (next == null
                    ? 'Hora de reavaliar o programa.'
                    : 'Hora de trocar. Próximo sugerido: ${next.name}. Toque para ver.')
                : 'Fica ${s.program.weeks} semanas${s.since == null ? '' : ', desde ${fmtDate(s.since!)}'}.'
                    '${next == null ? '' : ' Depois: ${next.name}, já pronto no app.'}',
            style: TextStyle(
              color: s.finished ? AppColors.text : AppColors.textDim,
              fontSize: 13,
              fontWeight: s.finished ? FontWeight.w700 : FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }
}

class ProgramsScreen extends StatelessWidget {
  const ProgramsScreen({super.key});

  Future<void> _use(BuildContext context, SeedProgram p) async {
    final app = AppScope.read(context);
    if (app.workout != null) {
      toast(context, 'Finalize o treino em andamento antes de trocar de programa');
      return;
    }
    final ok = await confirm(
      context,
      'Usar ${p.name}?',
      'Os treinos da semana passam a ser os deste programa por ${p.weeks} semanas. '
          'Sessões, recordes e peso corporal continuam salvos. Edições feitas nos treinos atuais serão substituídas.',
      ok: 'Usar programa',
    );
    if (!ok || !context.mounted) return;
    await app.repo.switchProgram(p.id);
    app.changed();
    if (context.mounted) {
      toast(context, 'Programa ${p.name} ativado');
      Navigator.of(context).pop();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Programas')),
      body: Loader<ProgramStatus>(
        load: ProgramStatus.load,
        builder: (context, status) => ListView(
          padding: const EdgeInsets.fromLTRB(16, 0, 16, 32),
          children: [
            const Text(
              'Cada programa tem uma duração. Quando ela acabar, o app avisa na tela inicial e você troca por aqui.',
              style: TextStyle(color: AppColors.textDim, height: 1.4),
            ),
            const SizedBox(height: 12),
            for (final p in programs)
              Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: _ProgramCard(
                  program: p,
                  active: p.id == status.program.id,
                  suggested: p.id == status.program.nextId,
                  onUse: () => _use(context, p),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _ProgramCard extends StatelessWidget {
  const _ProgramCard({
    required this.program,
    required this.active,
    required this.suggested,
    required this.onUse,
  });

  final SeedProgram program;
  final bool active;
  final bool suggested;
  final VoidCallback onUse;

  @override
  Widget build(BuildContext context) {
    final p = program;
    return XCard(
      borderColor: active ? AppColors.accent.withValues(alpha: 0.5) : null,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(p.name, style: const TextStyle(fontSize: 19, fontWeight: FontWeight.w900)),
              ),
              if (active) const Pill('Em uso', color: AppColors.accent, filled: true),
              if (suggested) const Pill('Próximo', color: AppColors.info, filled: true),
            ],
          ),
          const SizedBox(height: 6),
          Text(p.summary, style: const TextStyle(color: AppColors.textDim, height: 1.4)),
          const SizedBox(height: 10),
          Wrap(spacing: 6, runSpacing: 6, children: [
            Pill('${p.weeks} semanas', icon: Icons.event_outlined),
            Pill('${p.routines.length} dias'),
            Pill('${p.totalSets} séries por semana'),
          ]),
          const SizedBox(height: 12),
          for (final r in p.routines)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 3),
              child: Row(
                children: [
                  SizedBox(
                    width: 40,
                    child: Text(weekdayShort[r.weekday - 1],
                        style: const TextStyle(color: AppColors.textDim, fontWeight: FontWeight.w700)),
                  ),
                  Expanded(child: Text(r.name, style: const TextStyle(fontWeight: FontWeight.w700))),
                  Text('${r.slots.length} exerc.',
                      style: const TextStyle(color: AppColors.textMute, fontSize: 12.5)),
                ],
              ),
            ),
          const SizedBox(height: 12),
          if (active)
            const Text('Este é o programa atual.',
                textAlign: TextAlign.center, style: TextStyle(color: AppColors.textDim))
          else
            FilledButton(
              key: Key('use_${p.id}'),
              onPressed: onUse,
              child: const Text('Usar este programa'),
            ),
        ],
      ),
    );
  }
}
