import 'package:flutter/material.dart';

import '../../data/models.dart';
import '../../logic/substitutions.dart';
import '../../state/app_state.dart';
import '../theme.dart';
import '../widgets/muscle_map.dart';
import 'library_screen.dart';

Future<String?> showSubstituteSheet(BuildContext context, Exercise ex) {
  final app = AppScope.read(context);
  final list = equivalents(ex, app.exercises.values);
  return showModalBottomSheet<String>(
    context: context,
    isScrollControlled: true,
    builder: (c) => DraggableScrollableSheet(
      expand: false,
      initialChildSize: 0.7,
      maxChildSize: 0.92,
      builder: (c, scroll) => ListView(
        controller: scroll,
        padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
        children: [
          const Text('Substituir por um equivalente',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
          const SizedBox(height: 4),
          Text('Mesmo padrão de movimento e músculo de ${ex.name}.',
              style: const TextStyle(color: AppColors.textDim)),
          const SizedBox(height: 12),
          for (final e in list)
            ListTile(
              contentPadding: const EdgeInsets.symmetric(vertical: 2),
              leading: ExerciseThumb(e, size: 46),
              title: Text(e.name, style: const TextStyle(fontWeight: FontWeight.w700)),
              subtitle: Text('${e.primary.label} · ${e.equipment.label}',
                  style: const TextStyle(color: AppColors.textDim)),
              onTap: () => Navigator.pop(c, e.id),
            ),
          const SizedBox(height: 8),
          OutlinedButton.icon(
            onPressed: () async {
              final id = await pickExercise(c);
              if (id != null && c.mounted) Navigator.pop(c, id);
            },
            icon: const Icon(Icons.search_rounded),
            label: const Text('Escolher outro na biblioteca'),
          ),
        ],
      ),
    ),
  );
}
