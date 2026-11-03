import 'package:flutter/material.dart';

import '../../data/models.dart';
import '../../logic/analytics.dart';
import '../../logic/formatters.dart';
import '../../state/app_state.dart';
import '../library/library_screen.dart';
import '../library/substitute_sheet.dart';
import '../theme.dart';
import '../widgets/common.dart';
import '../widgets/muscle_map.dart';
import '../workout/workout_screen.dart' show pickRest;

class RoutineEditorScreen extends StatefulWidget {
  const RoutineEditorScreen({super.key, required this.routineId});

  final int routineId;

  @override
  State<RoutineEditorScreen> createState() => _RoutineEditorScreenState();
}

class _RoutineEditorScreenState extends State<RoutineEditorScreen> {
  Routine? _r;
  List<Routine> _all = [];
  final _name = TextEditingController();
  final _focus = TextEditingController();

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _name.dispose();
    _focus.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    final app = AppScope.read(context);
    final all = await app.repo.routines();
    final r = all.where((x) => x.id == widget.routineId).firstOrNull;
    if (!mounted) return;
    setState(() {
      _all = all;
      _r = r;
      if (r != null && _name.text.isEmpty) {
        _name.text = r.name;
        _focus.text = r.focus;
      }
    });
  }

  Future<void> _saveMeta({int? weekday, bool clearWeekday = false}) async {
    final r = _r;
    if (r == null) return;
    final app = AppScope.read(context);
    r.name = _name.text.trim().isEmpty ? 'Treino' : _name.text.trim();
    r.focus = _focus.text.trim();
    if (clearWeekday) {
      r.weekday = null;
    } else if (weekday != null) {
      r.weekday = weekday;
    }
    await app.repo.updateRoutine(r);
    app.changed();
    await _load();
  }

  Future<void> _addExercise() async {
    final id = await pickExercise(context);
    if (id == null || !mounted) return;
    final app = AppScope.read(context);
    await app.repo.addSlot(widget.routineId, id);
    app.changed();
    await _load();
  }

  Future<void> _editSlot(RoutineExercise re) async {
    final app = AppScope.read(context);
    final ex = app.exercises[re.exerciseId];
    final action = await showModalBottomSheet<String>(
      context: context,
      isScrollControlled: true,
      builder: (c) => _SlotEditor(re: re, exercise: ex),
    );
    if (!mounted) return;
    if (action == 'swap' && ex != null) {
      final id = await showSubstituteSheet(context, ex);
      if (id == null || !mounted) return;
      final ok = await confirm(context, 'Substituir exercício?',
          'Trocar ${ex.name} por ${app.exercises[id]?.name}. O histórico do exercício antigo continua salvo.',
          ok: 'Substituir');
      if (!ok) return;
      await app.repo.substituteSlot(re, id);
    } else if (action == 'remove') {
      final ok = await confirm(context, 'Remover do treino?',
          'O histórico de ${ex?.name ?? 'exercício'} continua salvo.', ok: 'Remover', danger: true);
      if (!ok) return;
      await app.repo.removeSlot(re.id!);
    } else if (action == 'save') {
      await app.repo.updateSlot(re);
    } else {
      return;
    }
    app.changed();
    await _load();
  }

  Future<void> _delete() async {
    final app = AppScope.read(context);
    final nav = Navigator.of(context);
    final ok = await confirm(context, 'Apagar treino?',
        'O treino sai da semana. Sessões já feitas continuam no histórico.', ok: 'Apagar', danger: true);
    if (!ok) return;
    await app.repo.deleteRoutine(widget.routineId);
    app.changed();
    nav.popUntil((r) => r.isFirst);
  }

  @override
  Widget build(BuildContext context) {
    final app = AppScope.of(context);
    final r = _r;
    if (r == null) {
      return const Scaffold(body: Center(child: CircularProgressIndicator(strokeWidth: 2)));
    }
    final planned = plannedSetsPerMuscle(_all.where((x) => x.weekday != null), app.exercises);
    final warnings = volumeInsights(planned);
    return Scaffold(
      appBar: AppBar(
        title: const Text('Editar treino'),
        actions: [
          IconButton(
            tooltip: 'Apagar treino',
            icon: const Icon(Icons.delete_outline_rounded, color: AppColors.danger),
            onPressed: _delete,
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _addExercise,
        backgroundColor: AppColors.accent,
        foregroundColor: AppColors.onAccent,
        icon: const Icon(Icons.add_rounded),
        label: const Text('Exercício', style: TextStyle(fontWeight: FontWeight.w800)),
      ),
      body: ReorderableListView(
        padding: const EdgeInsets.fromLTRB(16, 0, 16, 96),
        buildDefaultDragHandles: false,
        header: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            TextField(
              controller: _name,
              decoration: const InputDecoration(labelText: 'Nome'),
              onSubmitted: (_) => _saveMeta(),
              onTapOutside: (_) => _saveMeta(),
            ),
            const SizedBox(height: 10),
            TextField(
              controller: _focus,
              decoration: const InputDecoration(labelText: 'Foco (músculos)'),
              onSubmitted: (_) => _saveMeta(),
              onTapOutside: (_) => _saveMeta(),
            ),
            const SizedBox(height: 14),
            const Text('Dia da semana', style: TextStyle(color: AppColors.textDim, fontWeight: FontWeight.w700)),
            const SizedBox(height: 8),
            Wrap(
              spacing: 6,
              runSpacing: 6,
              children: [
                for (var d = 1; d <= 7; d++)
                  ChoiceChip(
                    label: Text(weekdayShort[d - 1]),
                    selected: r.weekday == d,
                    labelStyle: TextStyle(
                      color: r.weekday == d ? AppColors.onAccent : AppColors.text,
                      fontWeight: FontWeight.w700,
                    ),
                    onSelected: (_) => r.weekday == d ? _saveMeta(clearWeekday: true) : _saveMeta(weekday: d),
                  ),
              ],
            ),
            if (warnings.isNotEmpty) ...[
              const SizedBox(height: 12),
              for (final w in warnings) InsightTile(w),
            ],
            const SizedBox(height: 14),
            const Text('Segure e arraste para reordenar. Toque para editar.',
                style: TextStyle(color: AppColors.textMute, fontSize: 12.5)),
            const SizedBox(height: 8),
          ],
        ),
        onReorderItem: (oldI, newI) async {
          final app = AppScope.read(context);
          final list = [...r.exercises];
          final item = list.removeAt(oldI);
          list.insert(newI, item);
          setState(() => r.exercises = list);
          await app.repo.reorderSlots(list.map((e) => e.id!).toList());
          app.changed();
        },
        children: [
          for (var i = 0; i < r.exercises.length; i++)
            ReorderableDelayedDragStartListener(
              key: ValueKey('slot_${r.exercises[i].id}'),
              index: i,
              child: Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: XCard(
                  onTap: () => _editSlot(r.exercises[i]),
                  padding: const EdgeInsets.all(12),
                  child: Row(
                    children: [
                      ExerciseThumb(app.exercises[r.exercises[i].exerciseId], size: 44),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(app.exercises[r.exercises[i].exerciseId]?.name ?? '',
                                style: const TextStyle(fontWeight: FontWeight.w700)),
                            Text(
                              '${slotSummary(r.exercises[i].sets, r.exercises[i].repMin, r.exercises[i].repMax, false)} · descanso ${restLabel(r.exercises[i].restSec)}',
                              style: const TextStyle(color: AppColors.textDim, fontSize: 12.5),
                            ),
                          ],
                        ),
                      ),
                      const Icon(Icons.drag_indicator_rounded, color: AppColors.textMute),
                    ],
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _SlotEditor extends StatefulWidget {
  const _SlotEditor({required this.re, required this.exercise});

  final RoutineExercise re;
  final Exercise? exercise;

  @override
  State<_SlotEditor> createState() => _SlotEditorState();
}

class _SlotEditorState extends State<_SlotEditor> {
  late int sets = widget.re.sets;
  late int repMin = widget.re.repMin;
  late int repMax = widget.re.repMax;
  late int rest = widget.re.restSec;
  late final _note = TextEditingController(text: widget.re.note);

  @override
  void dispose() {
    _note.dispose();
    super.dispose();
  }

  void _save() {
    widget.re
      ..sets = sets
      ..repMin = repMin
      ..repMax = repMax
      ..restSec = rest
      ..note = _note.text.trim();
    Navigator.pop(context, 'save');
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.fromLTRB(20, 0, 20, MediaQuery.of(context).viewInsets.bottom + 20),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(widget.exercise?.name ?? '', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
          const SizedBox(height: 14),
          _Stepper(label: 'Séries', value: sets, min: 1, max: 10, onChanged: (v) => setState(() => sets = v)),
          _Stepper(
              label: 'Reps mínimas',
              value: repMin,
              min: 1,
              max: repMax,
              onChanged: (v) => setState(() => repMin = v)),
          _Stepper(
              label: 'Reps máximas',
              value: repMax,
              min: repMin,
              max: 40,
              onChanged: (v) => setState(() => repMax = v)),
          ListTile(
            contentPadding: EdgeInsets.zero,
            title: const Text('Descanso', style: TextStyle(fontWeight: FontWeight.w600)),
            trailing: Text(fmtClock(rest),
                style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16, color: AppColors.accent)),
            onTap: () async {
              final v = await pickRest(context, rest);
              if (v != null) setState(() => rest = v);
            },
          ),
          TextField(
            controller: _note,
            decoration: const InputDecoration(labelText: 'Observação (opcional)'),
          ),
          const SizedBox(height: 16),
          FilledButton(onPressed: _save, child: const Text('Salvar')),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: () => Navigator.pop(context, 'swap'),
                  icon: const Icon(Icons.swap_horiz_rounded),
                  label: const Text('Substituir'),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: () => Navigator.pop(context, 'remove'),
                  style: OutlinedButton.styleFrom(foregroundColor: AppColors.danger),
                  icon: const Icon(Icons.delete_outline_rounded),
                  label: const Text('Remover'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _Stepper extends StatelessWidget {
  const _Stepper({
    required this.label,
    required this.value,
    required this.min,
    required this.max,
    required this.onChanged,
  });

  final String label;
  final int value;
  final int min;
  final int max;
  final ValueChanged<int> onChanged;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Expanded(child: Text(label, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15))),
          IconButton.filledTonal(
            onPressed: value > min ? () => onChanged(value - 1) : null,
            icon: const Icon(Icons.remove_rounded),
          ),
          SizedBox(
            width: 44,
            child: Text('$value',
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800, fontFeatures: tabular)),
          ),
          IconButton.filledTonal(
            onPressed: value < max ? () => onChanged(value + 1) : null,
            icon: const Icon(Icons.add_rounded),
          ),
        ],
      ),
    );
  }
}
