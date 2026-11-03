import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../data/models.dart';
import '../../logic/analytics.dart';
import '../../logic/formatters.dart';
import '../../state/app_state.dart';
import '../theme.dart';
import '../widgets/charts.dart';
import '../widgets/common.dart';
import '../widgets/loader.dart';

Future<void> addBodyWeight(BuildContext context) async {
  final app = AppScope.read(context);
  final weights = await app.repo.bodyWeights();
  if (!context.mounted) return;
  final ctrl = TextEditingController(text: weights.isEmpty ? '' : fmtKg(weights.last.weight));
  var date = dateOnly(DateTime.now());
  final ok = await showDialog<bool>(
    context: context,
    builder: (c) => StatefulBuilder(
      builder: (c, setD) => AlertDialog(
        title: const Text('Registrar peso', style: TextStyle(fontWeight: FontWeight.w800)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              key: const Key('weight_field'),
              controller: ctrl,
              autofocus: true,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'[0-9.,]'))],
              style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w800, fontFeatures: tabular),
              decoration: const InputDecoration(suffixText: 'kg', hintText: '0,0'),
            ),
            const SizedBox(height: 10),
            TextButton.icon(
              onPressed: () async {
                final d = await showDatePicker(
                  context: c,
                  initialDate: date,
                  firstDate: DateTime(2020),
                  lastDate: DateTime.now(),
                );
                if (d != null) setD(() => date = d);
              },
              icon: const Icon(Icons.event_outlined),
              label: Text(fmtDateFull(date)),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(c, false),
            style: TextButton.styleFrom(foregroundColor: AppColors.textDim),
            child: const Text('Cancelar'),
          ),
          TextButton(
            key: const Key('weight_save'),
            onPressed: () => Navigator.pop(c, true),
            child: const Text('Salvar'),
          ),
        ],
      ),
    ),
  );
  final v = parseNum(ctrl.text);
  ctrl.dispose();
  if (ok != true || v == null || v < 20 || v > 400) return;
  await app.repo.saveBodyWeight(date, v);
  app.changed();
}

class BodyWeightTab extends StatelessWidget {
  const BodyWeightTab({super.key});

  @override
  Widget build(BuildContext context) {
    return Loader<List<BodyWeight>>(
      load: (a) => a.repo.bodyWeights(),
      builder: (context, data) {
        final avg = movingAverage(data);
        return ListView(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 32),
          children: [
            XCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: StatTile(
                          label: 'Atual',
                          value: data.isEmpty ? '-' : fmtKg(data.last.weight),
                          unit: 'kg',
                        ),
                      ),
                      Expanded(
                        child: StatTile(
                          label: 'Média 7 dias',
                          value: avg.isEmpty ? '-' : fmtNum(avg.last.weight, maxDecimals: 1),
                          unit: 'kg',
                        ),
                      ),
                      FilledButton.icon(
                        onPressed: () => addBodyWeight(context),
                        icon: const Icon(Icons.add_rounded),
                        label: const Text('Peso'),
                        style: FilledButton.styleFrom(minimumSize: const Size(0, 44)),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  LineChart(
                    points: [for (final b in data) LinePoint(b.date, b.weight)],
                    overlay: [for (final b in avg) LinePoint(b.date, b.weight)],
                    height: 200,
                  ),
                  const SizedBox(height: 6),
                  const Text('Linha cinza: média móvel de 7 dias. Pese-se ao acordar, nas mesmas condições.',
                      style: TextStyle(color: AppColors.textMute, fontSize: 12)),
                ],
              ),
            ),
            const SectionHeader('Registros'),
            if (data.isEmpty)
              const XCard(child: Text('Nenhum registro.', style: TextStyle(color: AppColors.textDim)))
            else
              XCard(
                padding: const EdgeInsets.symmetric(vertical: 4),
                child: Column(
                  children: [
                    for (final b in data.reversed)
                      Dismissible(
                        key: ValueKey('bw_${dayKey(b.date)}'),
                        direction: DismissDirection.endToStart,
                        background: Container(
                          alignment: Alignment.centerRight,
                          padding: const EdgeInsets.only(right: 18),
                          color: AppColors.danger.withValues(alpha: 0.18),
                          child: const Text('Apagar',
                              style: TextStyle(color: AppColors.danger, fontWeight: FontWeight.w800)),
                        ),
                        onDismissed: (_) async {
                          final app = AppScope.read(context);
                          await app.repo.deleteBodyWeight(b.date);
                          app.changed();
                        },
                        child: ListTile(
                          title: Text(fmtDateLong(b.date), style: const TextStyle(fontWeight: FontWeight.w600)),
                          trailing: Text('${fmtKg(b.weight)} kg',
                              style: const TextStyle(fontWeight: FontWeight.w800, fontFeatures: tabular)),
                        ),
                      ),
                  ],
                ),
              ),
          ],
        );
      },
    );
  }
}
