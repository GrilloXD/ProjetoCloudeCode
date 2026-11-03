import 'package:flutter/material.dart';

import '../../data/models.dart';
import '../../logic/substitutions.dart';
import '../../state/app_state.dart';
import '../theme.dart';
import '../widgets/common.dart';
import '../widgets/muscle_map.dart';
import 'exercise_detail_screen.dart';

Future<String?> pickExercise(BuildContext context) => Navigator.of(context)
    .push<String>(MaterialPageRoute(builder: (_) => const LibraryScreen(pick: true)));

class LibraryScreen extends StatefulWidget {
  const LibraryScreen({super.key, this.pick = false});

  final bool pick;

  @override
  State<LibraryScreen> createState() => _LibraryScreenState();
}

class _LibraryScreenState extends State<LibraryScreen> {
  final _search = TextEditingController();
  MuscleGroupFilter? _group;
  Equipment? _equipment;

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  List<Exercise> _filtered(Iterable<Exercise> all) {
    final q = normalize(_search.text.trim());
    return all.where((e) {
      if (_group != null && !_group!.muscles.contains(e.primary)) return false;
      if (_equipment != null && e.equipment != _equipment) return false;
      if (q.isNotEmpty && !normalize(e.name).contains(q)) return false;
      return true;
    }).toList()
      ..sort((a, b) => a.name.compareTo(b.name));
  }

  void _open(Exercise e) {
    if (widget.pick) {
      Navigator.pop(context, e.id);
    } else {
      Navigator.of(context).push(MaterialPageRoute(builder: (_) => ExerciseDetailScreen(exerciseId: e.id)));
    }
  }

  @override
  Widget build(BuildContext context) {
    final app = AppScope.of(context);
    final list = _filtered(app.exercises.values);
    final grouped = _group == null && _search.text.trim().isEmpty;
    final children = <Widget>[];
    if (grouped) {
      for (final g in muscleGroups) {
        final items = list.where((e) => g.muscles.contains(e.primary)).toList();
        if (items.isEmpty) continue;
        children.add(SectionHeader('${g.label}  ·  ${items.length}', padding: const EdgeInsets.fromLTRB(20, 18, 20, 6)));
        children.addAll(items.map((e) => _ExerciseTile(e, onTap: () => _open(e))));
      }
      final rest = list.where((e) => !muscleGroups.any((g) => g.muscles.contains(e.primary))).toList();
      if (rest.isNotEmpty) {
        children.add(const SectionHeader('Outros', padding: EdgeInsets.fromLTRB(20, 18, 20, 6)));
        children.addAll(rest.map((e) => _ExerciseTile(e, onTap: () => _open(e))));
      }
    } else {
      children.addAll(list.map((e) => _ExerciseTile(e, onTap: () => _open(e))));
    }
    if (list.isEmpty) {
      children.add(const EmptyState(
          icon: Icons.search_off_rounded, title: 'Nenhum exercício encontrado', text: 'Ajuste a busca ou os filtros.'));
    }

    return Scaffold(
      appBar: AppBar(
        title: Text(widget.pick ? 'Escolher exercício' : 'Exercícios'),
        actions: [
          IconButton(
            tooltip: 'Criar exercício',
            icon: const Icon(Icons.add_rounded),
            onPressed: () async {
              final id = await showCreateExercise(context);
              if (id != null && widget.pick && context.mounted) Navigator.pop(context, id);
            },
          ),
        ],
      ),
      body: CustomScrollView(
        slivers: [
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 4, 16, 8),
              child: TextField(
                controller: _search,
                onChanged: (_) => setState(() {}),
                decoration: InputDecoration(
                  hintText: 'Buscar exercício',
                  prefixIcon: const Icon(Icons.search_rounded, color: AppColors.textDim),
                  suffixIcon: _search.text.isEmpty
                      ? null
                      : IconButton(
                          icon: const Icon(Icons.close_rounded),
                          onPressed: () => setState(_search.clear),
                        ),
                ),
              ),
            ),
          ),
          SliverToBoxAdapter(
            child: _ChipRow(
              children: [
                _chip('Todos', _group == null, () => setState(() => _group = null)),
                for (final g in muscleGroups)
                  _chip(g.label, _group == g, () => setState(() => _group = _group == g ? null : g)),
              ],
            ),
          ),
          SliverToBoxAdapter(
            child: _ChipRow(
              children: [
                _chip('Todo equipamento', _equipment == null, () => setState(() => _equipment = null)),
                for (final e in Equipment.values)
                  _chip(e.label, _equipment == e,
                      () => setState(() => _equipment = _equipment == e ? null : e)),
              ],
            ),
          ),
          SliverList(delegate: SliverChildListDelegate(children)),
          const SliverToBoxAdapter(child: SizedBox(height: 24)),
        ],
      ),
    );
  }

  Widget _chip(String label, bool selected, VoidCallback onTap) => Padding(
        padding: const EdgeInsets.only(right: 8),
        child: ChoiceChip(
          label: Text(label),
          selected: selected,
          labelStyle: TextStyle(
            color: selected ? AppColors.onAccent : AppColors.text,
            fontWeight: FontWeight.w700,
          ),
          onSelected: (_) => onTap(),
        ),
      );
}

class _ChipRow extends StatelessWidget {
  const _ChipRow({required this.children});

  final List<Widget> children;

  @override
  Widget build(BuildContext context) => SizedBox(
        height: 48,
        child: ListView(
          scrollDirection: Axis.horizontal,
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
          children: children,
        ),
      );
}

class _ExerciseTile extends StatelessWidget {
  const _ExerciseTile(this.e, {required this.onTap});

  final Exercise e;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        child: Row(
          children: [
            ExerciseThumb(e, size: 50),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(e.name, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
                  const SizedBox(height: 2),
                  Text('${e.primary.label} · ${e.equipment.label}${e.custom ? ' · personalizado' : ''}',
                      style: const TextStyle(color: AppColors.textDim, fontSize: 13)),
                ],
              ),
            ),
            const Icon(Icons.chevron_right_rounded, color: AppColors.textMute),
          ],
        ),
      ),
    );
  }
}

Future<String?> showCreateExercise(BuildContext context) {
  return showModalBottomSheet<String>(
    context: context,
    isScrollControlled: true,
    builder: (c) => const _CreateExerciseSheet(),
  );
}

class _CreateExerciseSheet extends StatefulWidget {
  const _CreateExerciseSheet();

  @override
  State<_CreateExerciseSheet> createState() => _CreateExerciseSheetState();
}

class _CreateExerciseSheetState extends State<_CreateExerciseSheet> {
  final _name = TextEditingController();
  Muscle _primary = Muscle.peito;
  Equipment _equipment = Equipment.maquina;
  bool _unilateral = false;

  @override
  void dispose() {
    _name.dispose();
    super.dispose();
  }

  double get _defaultIncrement => switch (_equipment) {
        Equipment.maquina => 5,
        Equipment.polia => 2.5,
        Equipment.halteres => 2,
        Equipment.barra => 2,
        Equipment.smith => 2,
        Equipment.pesoCorporal => 2.5,
      };

  Future<void> _save() async {
    final name = _name.text.trim();
    if (name.isEmpty) return;
    final app = AppScope.read(context);
    final nav = Navigator.of(context);
    final id = 'custom_${DateTime.now().millisecondsSinceEpoch}';
    await app.repo.createExercise(Exercise(
      id: id,
      name: name,
      primary: _primary,
      equipment: _equipment,
      pattern: 'custom_${_primary.name}',
      increment: _defaultIncrement,
      unilateral: _unilateral,
      loadType: _equipment == Equipment.pesoCorporal ? LoadType.bodyweight : LoadType.weighted,
      custom: true,
    ));
    await app.refreshExercises();
    nav.pop(id);
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.fromLTRB(20, 0, 20, MediaQuery.of(context).viewInsets.bottom + 20),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text('Novo exercício', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
          const SizedBox(height: 14),
          TextField(
            controller: _name,
            autofocus: true,
            textCapitalization: TextCapitalization.words,
            decoration: const InputDecoration(hintText: 'Nome do exercício'),
          ),
          const SizedBox(height: 12),
          DropdownButtonFormField<Muscle>(
            initialValue: _primary,
            decoration: const InputDecoration(labelText: 'Músculo principal'),
            items: [
              for (final m in Muscle.values) DropdownMenuItem(value: m, child: Text(m.label)),
            ],
            onChanged: (v) => setState(() => _primary = v ?? _primary),
          ),
          const SizedBox(height: 12),
          DropdownButtonFormField<Equipment>(
            initialValue: _equipment,
            decoration: const InputDecoration(labelText: 'Equipamento'),
            items: [
              for (final e in Equipment.values) DropdownMenuItem(value: e, child: Text(e.label)),
            ],
            onChanged: (v) => setState(() => _equipment = v ?? _equipment),
          ),
          SwitchListTile(
            contentPadding: EdgeInsets.zero,
            title: const Text('Unilateral (um lado por vez)'),
            value: _unilateral,
            onChanged: (v) => setState(() => _unilateral = v),
          ),
          const SizedBox(height: 8),
          FilledButton(onPressed: _save, child: const Text('Salvar')),
        ],
      ),
    );
  }
}
