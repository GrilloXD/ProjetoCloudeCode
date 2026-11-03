import '../data/models.dart';
import '../data/seed/program_seed.dart';

/// Exercícios equivalentes: mesmo padrão de movimento primeiro,
/// depois padrões próximos, depois mesmo músculo principal.
List<Exercise> equivalents(Exercise ex, Iterable<Exercise> all, {int limit = 14}) {
  final family = patternFamilies[ex.pattern] ?? const [];
  final scored = <(Exercise, int)>[];
  for (final e in all) {
    if (e.id == ex.id) continue;
    var score = 0;
    if (e.pattern == ex.pattern) {
      score = 3;
    } else if (family.contains(e.pattern) && e.primary == ex.primary) {
      score = 2;
    } else if (e.primary == ex.primary) {
      score = 1;
    }
    if (score > 0) scored.add((e, score));
  }
  scored.sort((a, b) {
    final c = b.$2.compareTo(a.$2);
    return c != 0 ? c : a.$1.name.compareTo(b.$1.name);
  });
  return scored.take(limit).map((s) => s.$1).toList();
}

class MuscleGroupFilter {
  const MuscleGroupFilter(this.label, this.muscles);
  final String label;
  final Set<Muscle> muscles;
}

const muscleGroups = [
  MuscleGroupFilter('Peito', {Muscle.peito}),
  MuscleGroupFilter('Costas', {Muscle.costas}),
  MuscleGroupFilter('Ombros', {Muscle.deltoideLateral, Muscle.deltoideAnterior, Muscle.deltoidePosterior}),
  MuscleGroupFilter('Bíceps', {Muscle.biceps}),
  MuscleGroupFilter('Tríceps', {Muscle.triceps}),
  MuscleGroupFilter('Antebraço', {Muscle.antebraco}),
  MuscleGroupFilter('Quadríceps', {Muscle.quadriceps}),
  MuscleGroupFilter('Posteriores', {Muscle.posteriores}),
  MuscleGroupFilter('Glúteos', {Muscle.gluteos, Muscle.adutores}),
  MuscleGroupFilter('Panturrilha', {Muscle.panturrilha}),
  MuscleGroupFilter('Abdômen', {Muscle.abdomen}),
];

String normalize(String s) {
  const from = 'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ';
  const to = 'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC';
  final b = StringBuffer();
  for (final ch in s.split('')) {
    final i = from.indexOf(ch);
    b.write(i >= 0 ? to[i] : ch);
  }
  return b.toString().toLowerCase();
}
