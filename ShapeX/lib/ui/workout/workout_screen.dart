import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:wakelock_plus/wakelock_plus.dart';

import '../../data/models.dart';
import '../../logic/formatters.dart';
import '../../state/app_state.dart';
import '../../state/workout_controller.dart';
import '../library/exercise_detail_screen.dart';
import '../library/library_screen.dart';
import '../library/substitute_sheet.dart';
import '../theme.dart';
import '../widgets/common.dart';
import '../widgets/muscle_map.dart';
import 'workout_summary_screen.dart';

Future<void> openWorkout(BuildContext context) async {
  await Navigator.of(context).push(MaterialPageRoute(builder: (_) => const WorkoutScreen()));
}

class WorkoutScreen extends StatefulWidget {
  const WorkoutScreen({super.key});

  @override
  State<WorkoutScreen> createState() => _WorkoutScreenState();
}

class _WorkoutScreenState extends State<WorkoutScreen> {
  bool _wake = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final app = AppScope.read(context);
    if (app.keepAwake && !_wake) {
      _wake = true;
      WakelockPlus.enable().catchError((_) {});
    }
  }

  @override
  void dispose() {
    if (_wake) WakelockPlus.disable().catchError((_) {});
    super.dispose();
  }

  Future<void> _finish(WorkoutController w) async {
    final nav = Navigator.of(context);
    if (w.doneSets == 0) {
      final ok = await confirm(context, 'Nenhuma série concluída',
          'Sem séries marcadas não há o que salvar. Descartar este treino?',
          ok: 'Descartar', danger: true);
      if (!ok) return;
      await w.discard();
      if (mounted) nav.pop();
      return;
    }
    if (w.pendingSets > 0) {
      final ok = await confirm(context, 'Finalizar treino?',
          '${w.pendingSets} ${w.pendingSets == 1 ? 'série não marcada será descartada' : 'séries não marcadas serão descartadas'}. As concluídas ficam salvas.',
          ok: 'Finalizar');
      if (!ok) return;
    }
    final summary = await w.finish();
    if (!mounted) return;
    if (summary == null) {
      nav.pop();
      return;
    }
    nav.pushReplacement(MaterialPageRoute(builder: (_) => WorkoutSummaryScreen(summary: summary)));
  }

  Future<void> _discard(WorkoutController w) async {
    final nav = Navigator.of(context);
    final ok = await confirm(context, 'Descartar treino?',
        'Todas as séries desta sessão serão apagadas. Isso não pode ser desfeito.',
        ok: 'Descartar', danger: true);
    if (!ok) return;
    await w.discard();
    if (mounted) nav.pop();
  }

  Future<void> _addExercise(WorkoutController w) async {
    final id = await pickExercise(context);
    if (id != null) await w.addExercise(id);
  }

  @override
  Widget build(BuildContext context) {
    final app = AppScope.of(context);
    final w = app.workout;
    if (w == null) {
      return const Scaffold(body: SizedBox.shrink());
    }
    return ListenableBuilder(
      listenable: w,
      builder: (context, _) {
        final total = w.session.exercises.fold(0, (a, e) => a + e.sets.length);
        return Scaffold(
          appBar: AppBar(
            leading: IconButton(
              icon: const Icon(Icons.keyboard_arrow_down_rounded, size: 30),
              tooltip: 'Minimizar',
              onPressed: () => Navigator.pop(context),
            ),
            titleSpacing: 0,
            title: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(w.session.name, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
                ValueListenableBuilder<int>(
                  valueListenable: w.tick,
                  builder: (_, _, _) => Text(
                    '${w.elapsedLabel()}  ·  ${w.doneSets}/$total séries',
                    style: const TextStyle(
                        fontSize: 13, color: AppColors.textDim, fontFeatures: tabular, fontWeight: FontWeight.w600),
                  ),
                ),
              ],
            ),
            actions: [
              Padding(
                padding: const EdgeInsets.only(right: 12),
                child: FilledButton(
                  key: const Key('finish_workout'),
                  onPressed: () => _finish(w),
                  style: FilledButton.styleFrom(
                    minimumSize: const Size(0, 38),
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    textStyle: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: const Text('Finalizar'),
                ),
              ),
            ],
          ),
          body: GestureDetector(
            onTap: () => FocusScope.of(context).unfocus(),
            behavior: HitTestBehavior.translucent,
            child: ListView(
              padding: const EdgeInsets.fromLTRB(12, 4, 12, 40),
              keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
              children: [
                for (final se in w.session.exercises)
                  _ExerciseCard(key: ValueKey('se_${se.id}'), w: w, se: se),
                const SizedBox(height: 8),
                OutlinedButton.icon(
                  onPressed: () => _addExercise(w),
                  icon: const Icon(Icons.add_rounded),
                  label: const Text('Adicionar exercício'),
                ),
                const SizedBox(height: 10),
                TextButton(
                  onPressed: () => _discard(w),
                  style: TextButton.styleFrom(foregroundColor: AppColors.danger),
                  child: const Text('Descartar treino'),
                ),
              ],
            ),
          ),
          bottomNavigationBar: _RestBar(w: w, total: total),
        );
      },
    );
  }
}

class _ExerciseCard extends StatelessWidget {
  const _ExerciseCard({super.key, required this.w, required this.se});

  final WorkoutController w;
  final SessionExercise se;

  Future<void> _menu(BuildContext context, Exercise? ex) async {
    final choice = await showModalBottomSheet<String>(
      context: context,
      builder: (c) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            _sheetItem(c, Icons.menu_book_outlined, 'Como executar', 'info'),
            _sheetItem(c, Icons.swap_horiz_rounded, 'Substituir exercício', 'swap'),
            _sheetItem(c, Icons.timer_outlined, 'Ajustar descanso', 'rest'),
            _sheetItem(c, Icons.delete_outline_rounded, 'Remover do treino', 'remove', color: AppColors.danger),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
    if (!context.mounted || choice == null) return;
    switch (choice) {
      case 'info':
        if (ex != null) {
          Navigator.of(context).push(MaterialPageRoute(builder: (_) => ExerciseDetailScreen(exerciseId: ex.id)));
        }
      case 'swap':
        await _swap(context, ex);
      case 'rest':
        final sec = await pickRest(context, se.restSec);
        if (sec != null) await w.setRest(se, sec);
      case 'remove':
        final ok = await confirm(context, 'Remover exercício?',
            'As séries dele nesta sessão serão apagadas. O treino salvo não muda.',
            ok: 'Remover', danger: true);
        if (ok) await w.removeExercise(se);
    }
  }

  Future<void> _swap(BuildContext context, Exercise? ex) async {
    if (ex == null) return;
    final id = await showSubstituteSheet(context, ex);
    if (id == null || !context.mounted) return;
    var inRoutine = false;
    if (w.session.routineId != null) {
      final r = await showModalBottomSheet<bool>(
        context: context,
        builder: (c) => SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Padding(
                padding: EdgeInsets.fromLTRB(20, 0, 20, 8),
                child: Text('Onde aplicar a troca?', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800)),
              ),
              _sheetItemValue(c, Icons.today_outlined, 'Só neste treino de hoje', false),
              _sheetItemValue(c, Icons.event_repeat_outlined, 'Também no treino salvo', true),
              const Padding(
                padding: EdgeInsets.fromLTRB(20, 6, 20, 12),
                child: Text('O histórico do exercício antigo continua guardado.',
                    style: TextStyle(color: AppColors.textDim, fontSize: 13)),
              ),
            ],
          ),
        ),
      );
      if (r == null) return;
      inRoutine = r;
    }
    await w.replaceExercise(se, id, inRoutine: inRoutine);
  }

  @override
  Widget build(BuildContext context) {
    final ex = w.exerciseOf(se);
    final rec = w.recs[se.id];
    final prevTop = w.previous[se.id];
    final last = prevTop == null || prevTop.isEmpty
        ? null
        : prevTop.map((s) => s.weight).reduce((a, b) => a > b ? a : b);
    final stagnant = w.stagnant.contains(se.id);
    return XCard(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.fromLTRB(14, 14, 14, 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              GestureDetector(
                onTap: ex == null
                    ? null
                    : () => Navigator.of(context)
                        .push(MaterialPageRoute(builder: (_) => ExerciseDetailScreen(exerciseId: ex.id))),
                child: ExerciseThumb(ex, size: 52),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(ex?.name ?? se.exerciseId,
                        style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800, height: 1.2)),
                    const SizedBox(height: 3),
                    Text(
                      [ex?.primary.label, ex?.equipment.label].whereType<String>().join(' · '),
                      style: const TextStyle(color: AppColors.textDim, fontSize: 13, fontWeight: FontWeight.w600),
                    ),
                  ],
                ),
              ),
              IconButton(
                icon: const Icon(Icons.more_horiz_rounded, color: AppColors.textDim),
                onPressed: () => _menu(context, ex),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Wrap(
            spacing: 6,
            runSpacing: 6,
            children: [
              Pill(slotSummary(se.setsPlanned, se.repMin, se.repMax, ex?.unilateral ?? false)),
              GestureDetector(
                onTap: () async {
                  final sec = await pickRest(context, se.restSec);
                  if (sec != null) await w.setRest(se, sec);
                },
                child: Pill('descanso ${restLabel(se.restSec)}', icon: Icons.timer_outlined),
              ),
              if (se.rir.isNotEmpty) Pill(se.rir),
              if (last != null) Pill('última: ${fmtKg(last)} kg'),
            ],
          ),
          if (ex != null && ex.tip.isNotEmpty) ...[
            const SizedBox(height: 8),
            Text(ex.tip, style: const TextStyle(color: AppColors.textDim, fontSize: 12.5, height: 1.35)),
          ],
          if (rec != null) ...[
            const SizedBox(height: 10),
            RecBanner(
              rec,
              applied: w.applied.containsKey(se.id),
              onApply: rec.actionable && rec.weight != null
                  ? () => w.applied.containsKey(se.id) ? w.undoApply(se) : w.applyRecommendation(se)
                  : null,
            ),
          ],
          if (stagnant) ...[
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.fromLTRB(12, 6, 6, 6),
              decoration: BoxDecoration(
                color: AppColors.warn.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                children: [
                  const Icon(Icons.trending_flat_rounded, size: 18, color: AppColors.warn),
                  const SizedBox(width: 8),
                  const Expanded(
                    child: Text('Sem evolução nas últimas 3 sessões',
                        style: TextStyle(color: AppColors.warn, fontSize: 12.5, fontWeight: FontWeight.w700)),
                  ),
                  TextButton(
                    onPressed: () => _swap(context, ex),
                    style: TextButton.styleFrom(
                        foregroundColor: AppColors.warn, visualDensity: VisualDensity.compact),
                    child: const Text('Trocar'),
                  ),
                ],
              ),
            ),
          ],
          const SizedBox(height: 10),
          const _SetHeader(),
          for (var i = 0; i < se.sets.length; i++)
            _SetRow(key: ValueKey('set_${se.sets[i].id}'), w: w, se: se, index: i),
          Align(
            alignment: Alignment.centerLeft,
            child: TextButton.icon(
              onPressed: () => w.addSet(se),
              icon: const Icon(Icons.add_rounded, size: 18),
              label: const Text('Adicionar série'),
              style: TextButton.styleFrom(foregroundColor: AppColors.textDim),
            ),
          ),
        ],
      ),
    );
  }
}

Widget _sheetItem(BuildContext c, IconData icon, String label, String value, {Color? color}) => ListTile(
      leading: Icon(icon, color: color ?? AppColors.text),
      title: Text(label, style: TextStyle(fontWeight: FontWeight.w700, color: color)),
      onTap: () => Navigator.pop(c, value),
    );

Widget _sheetItemValue<T>(BuildContext c, IconData icon, String label, T value) => ListTile(
      leading: Icon(icon),
      title: Text(label, style: const TextStyle(fontWeight: FontWeight.w700)),
      onTap: () => Navigator.pop(c, value),
    );

Future<int?> pickRest(BuildContext context, int current) {
  const options = [45, 60, 75, 90, 120, 150, 180, 240];
  return showModalBottomSheet<int>(
    context: context,
    builder: (c) => SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Descanso entre séries', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800)),
            const SizedBox(height: 14),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                for (final o in options)
                  ChoiceChip(
                    label: Text(fmtClock(o)),
                    selected: o == current,
                    labelStyle: TextStyle(
                      color: o == current ? AppColors.onAccent : AppColors.text,
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
}

class _SetHeader extends StatelessWidget {
  const _SetHeader();

  @override
  Widget build(BuildContext context) {
    const s = TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: AppColors.textMute, letterSpacing: 0.8);
    return const Padding(
      padding: EdgeInsets.only(bottom: 4),
      child: Row(
        children: [
          SizedBox(width: 34, child: Text('SÉRIE', style: s)),
          SizedBox(width: 8),
          Expanded(child: Text('ANTERIOR', style: s)),
          SizedBox(width: 76, child: Text('KG', style: s, textAlign: TextAlign.center)),
          SizedBox(width: 8),
          SizedBox(width: 60, child: Text('REPS', style: s, textAlign: TextAlign.center)),
          SizedBox(width: 8),
          SizedBox(width: 44),
        ],
      ),
    );
  }
}

class _SetRow extends StatefulWidget {
  const _SetRow({super.key, required this.w, required this.se, required this.index});

  final WorkoutController w;
  final SessionExercise se;
  final int index;

  @override
  State<_SetRow> createState() => _SetRowState();
}

class _SetRowState extends State<_SetRow> {
  late final TextEditingController _kg;
  late final TextEditingController _reps;

  SetLog get s => widget.se.sets[widget.index];

  @override
  void initState() {
    super.initState();
    _kg = TextEditingController(text: s.weight == null ? '' : fmtKg(s.weight));
    _reps = TextEditingController(text: s.reps == null ? '' : '${s.reps}');
  }

  @override
  void didUpdateWidget(covariant _SetRow old) {
    super.didUpdateWidget(old);
    final kgText = s.weight == null ? '' : fmtKg(s.weight);
    if (s.done && _kg.text != kgText) _kg.text = kgText;
    final repsText = s.reps == null ? '' : '${s.reps}';
    if (s.done && _reps.text != repsText) _reps.text = repsText;
  }

  @override
  void dispose() {
    _kg.dispose();
    _reps.dispose();
    super.dispose();
  }

  Future<void> _toggle() async {
    FocusScope.of(context).unfocus();
    final msg = await widget.w.toggleSet(widget.se, s);
    if (!mounted) return;
    if (msg != null) {
      toast(context, msg);
      return;
    }
    setState(() {
      _kg.text = s.weight == null ? '' : fmtKg(s.weight);
      _reps.text = s.reps == null ? '' : '${s.reps}';
    });
  }

  @override
  Widget build(BuildContext context) {
    final w = widget.w;
    final se = widget.se;
    final i = widget.index;
    final prev = w.previousSet(se, i);
    final wh = w.weightHint(se, i);
    final rh = w.repsHint(se, i);
    final done = s.done;
    final row = AnimatedContainer(
      duration: const Duration(milliseconds: 180),
      margin: const EdgeInsets.symmetric(vertical: 3),
      padding: const EdgeInsets.symmetric(vertical: 4),
      decoration: BoxDecoration(
        color: done ? AppColors.accent.withValues(alpha: 0.09) : Colors.transparent,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          SizedBox(
            width: 34,
            child: Center(
              child: Text('${i + 1}',
                  style: TextStyle(
                    fontWeight: FontWeight.w800,
                    fontSize: 15,
                    color: done ? AppColors.accent : AppColors.text,
                  )),
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              prev == null ? '-' : '${fmtKg(prev.weight)} × ${prev.reps}',
              style: const TextStyle(color: AppColors.textDim, fontSize: 13.5, fontFeatures: tabular),
            ),
          ),
          SizedBox(
            width: 76,
            child: _NumField(
              key: Key('kg_${se.id}_$i'),
              controller: _kg,
              hint: wh == null ? 'kg' : fmtKg(wh),
              decimal: true,
              done: done,
              onChanged: (v) => w.updateValues(s, weight: parseNum(v), clearWeight: v.trim().isEmpty),
            ),
          ),
          const SizedBox(width: 8),
          SizedBox(
            width: 60,
            child: _NumField(
              key: Key('reps_${se.id}_$i'),
              controller: _reps,
              hint: rh == null ? 'reps' : '$rh',
              decimal: false,
              done: done,
              onChanged: (v) => w.updateValues(s, reps: int.tryParse(v.trim()), clearReps: v.trim().isEmpty),
            ),
          ),
          const SizedBox(width: 8),
          SizedBox(
            width: 44,
            height: 40,
            child: Material(
              color: done ? AppColors.accent : AppColors.cardHigh,
              borderRadius: BorderRadius.circular(12),
              child: InkWell(
                key: Key('check_${se.id}_$i'),
                borderRadius: BorderRadius.circular(12),
                onTap: _toggle,
                child: Icon(Icons.check_rounded,
                    color: done ? AppColors.onAccent : AppColors.textDim, size: 24),
              ),
            ),
          ),
        ],
      ),
    );
    return Dismissible(
      key: ValueKey('dismiss_${s.id}'),
      direction: DismissDirection.endToStart,
      background: Container(
        alignment: Alignment.centerRight,
        padding: const EdgeInsets.only(right: 18),
        decoration: BoxDecoration(
          color: AppColors.danger.withValues(alpha: 0.18),
          borderRadius: BorderRadius.circular(12),
        ),
        child: const Text('Remover', style: TextStyle(color: AppColors.danger, fontWeight: FontWeight.w800)),
      ),
      onDismissed: (_) => w.removeSet(se, s),
      child: row,
    );
  }
}

class _NumField extends StatelessWidget {
  const _NumField({
    super.key,
    required this.controller,
    required this.hint,
    required this.decimal,
    required this.done,
    required this.onChanged,
  });

  final TextEditingController controller;
  final String hint;
  final bool decimal;
  final bool done;
  final ValueChanged<String> onChanged;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 40,
      child: TextField(
        controller: controller,
        onChanged: onChanged,
        onTap: () => controller.selection = TextSelection(baseOffset: 0, extentOffset: controller.text.length),
        textAlign: TextAlign.center,
        keyboardType: TextInputType.numberWithOptions(decimal: decimal),
        inputFormatters: [
          FilteringTextInputFormatter.allow(decimal ? RegExp(r'[0-9.,]') : RegExp(r'[0-9]')),
          LengthLimitingTextInputFormatter(decimal ? 6 : 3),
        ],
        style: TextStyle(
          fontSize: 16,
          fontWeight: FontWeight.w800,
          fontFeatures: tabular,
          color: done ? AppColors.accent : AppColors.text,
        ),
        decoration: InputDecoration(
          hintText: hint,
          fillColor: done ? Colors.transparent : AppColors.cardHigh,
          contentPadding: const EdgeInsets.symmetric(horizontal: 4, vertical: 10),
          hintStyle: const TextStyle(color: AppColors.textMute, fontWeight: FontWeight.w700, fontSize: 15),
        ),
      ),
    );
  }
}

class _RestBar extends StatelessWidget {
  const _RestBar({required this.w, required this.total});

  final WorkoutController w;
  final int total;

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<int>(
      valueListenable: w.tick,
      builder: (context, _, _) {
        final resting = w.resting;
        final remaining = w.restRemaining;
        return Material(
          color: AppColors.surface,
          child: SafeArea(
            top: false,
            child: AnimatedSize(
              duration: const Duration(milliseconds: 200),
              child: resting
                  ? Padding(
                      padding: const EdgeInsets.fromLTRB(16, 10, 16, 12),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          ClipRRect(
                            borderRadius: BorderRadius.circular(4),
                            child: LinearProgressIndicator(
                              value: w.restTotal == 0 ? 0 : remaining / w.restTotal,
                              minHeight: 5,
                              backgroundColor: AppColors.cardHigh,
                              color: AppColors.accent,
                            ),
                          ),
                          const SizedBox(height: 10),
                          Row(
                            children: [
                              _RoundBtn(label: '-15', onTap: () => w.addRest(-15)),
                              Expanded(
                                child: Column(
                                  children: [
                                    Text(fmtClock(remaining),
                                        key: const Key('rest_time'),
                                        style: const TextStyle(
                                            fontSize: 30,
                                            fontWeight: FontWeight.w800,
                                            fontFeatures: tabular,
                                            letterSpacing: -1)),
                                    const Text('Descanso',
                                        style: TextStyle(
                                            color: AppColors.textDim, fontSize: 12, fontWeight: FontWeight.w700)),
                                  ],
                                ),
                              ),
                              _RoundBtn(label: '+15', onTap: () => w.addRest(15)),
                              const SizedBox(width: 8),
                              TextButton(
                                key: const Key('skip_rest'),
                                onPressed: w.skipRest,
                                child: const Text('Pular'),
                              ),
                            ],
                          ),
                        ],
                      ),
                    )
                  : Padding(
                      padding: const EdgeInsets.fromLTRB(16, 10, 16, 12),
                      child: Row(
                        children: [
                          Expanded(
                            child: ClipRRect(
                              borderRadius: BorderRadius.circular(4),
                              child: LinearProgressIndicator(
                                value: total == 0 ? 0 : w.doneSets / total,
                                minHeight: 5,
                                backgroundColor: AppColors.cardHigh,
                                color: AppColors.accent,
                              ),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Text('${w.doneSets} de $total séries',
                              style: const TextStyle(
                                  color: AppColors.textDim, fontWeight: FontWeight.w700, fontFeatures: tabular)),
                        ],
                      ),
                    ),
            ),
          ),
        );
      },
    );
  }
}

class _RoundBtn extends StatelessWidget {
  const _RoundBtn({required this.label, required this.onTap});

  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: AppColors.cardHigh,
      shape: const CircleBorder(),
      child: InkWell(
        customBorder: const CircleBorder(),
        onTap: onTap,
        child: SizedBox(
          width: 52,
          height: 52,
          child: Center(
            child: Text(label, style: const TextStyle(fontWeight: FontWeight.w800, fontFeatures: tabular)),
          ),
        ),
      ),
    );
  }
}
