import 'package:flutter_test/flutter_test.dart';
import 'package:shape_x/data/models.dart';
import 'package:shape_x/data/seed/exercise_catalog.dart';
import 'package:shape_x/data/seed/program_seed.dart';
import 'package:shape_x/logic/analytics.dart';

final exMap = {for (final e in exerciseCatalog) e.id: e};

List<Routine> routinesOf(SeedProgram p) => [
      for (var i = 0; i < p.routines.length; i++)
        Routine(
          id: i + 1,
          name: p.routines[i].name,
          weekday: p.routines[i].weekday,
          position: i,
          exercises: [
            for (final s in p.routines[i].slots)
              RoutineExercise(
                routineId: i + 1,
                exerciseId: s.exerciseId,
                position: 0,
                sets: s.sets,
                repMin: s.repMin,
                repMax: s.repMax,
                restSec: s.restSec,
              ),
          ],
        ),
    ];

void main() {
  test('catálogo com ids únicos e instruções em todo exercício', () {
    final ids = exerciseCatalog.map((e) => e.id).toList();
    expect(ids.toSet().length, ids.length);
    for (final e in exerciseCatalog) {
      expect(e.instructions, isNotEmpty, reason: e.id);
      expect(e.increment, greaterThan(0), reason: e.id);
    }
  });

  for (final p in programs) {
    group(p.name, () {
      final routines = routinesOf(p);

      test('exercícios existem, faixas válidas e um treino por dia', () {
        for (final r in p.routines) {
          for (final s in r.slots) {
            expect(exMap.containsKey(s.exerciseId), isTrue, reason: s.exerciseId);
            expect(s.repMin <= s.repMax, isTrue);
          }
        }
        final days = p.routines.map((r) => r.weekday).toList();
        expect(days.toSet().length, days.length);
        if (p.nextId != null) expect(programById(p.nextId).id, p.nextId);
      });

      test('nenhum músculo acima de 20 séries e sessões entre 45 e 75 min', () {
        expect(volumeInsights(plannedSetsPerMuscle(routines, exMap)), isEmpty);
        for (final r in routines) {
          expect(estimateMinutes(r, exMap), inInclusiveRange(45, 75), reason: r.name);
        }
      });
    });
  }

  test('Tradicional: grupos juntos, pernas 1 vez e 4 semanas', () {
    final routines = routinesOf(tradicional);
    expect(tradicional.weeks, 4);
    expect(tradicional.nextId, 'ciencia');
    expect(routines.map((r) => r.name), [
      'Peito e Tríceps',
      'Costas e Bíceps',
      'Ombros e Abdômen',
      'Pernas',
      'Peito e Costas',
    ]);
    expect(routines.map((r) => r.totalSets).toList(), [20, 20, 19, 19, 16]);

    final direct = directSetsPerMuscle(routines, exMap);
    expect(direct[Muscle.peito], 18);
    expect(direct[Muscle.costas], 18);
    expect(direct[Muscle.deltoideLateral], 11);
    expect(direct[Muscle.deltoidePosterior], 3);
    expect(direct[Muscle.biceps], 8);
    expect(direct[Muscle.triceps], 8);
    expect(direct[Muscle.quadriceps], 9);
    expect(direct[Muscle.posteriores], 6);
    expect(direct[Muscle.panturrilha], 4);
    expect(direct[Muscle.abdomen], 6);

    final v = plannedSetsPerMuscle(routines, exMap);
    expect(v[Muscle.costas], 19.5);
    expect(v[Muscle.deltoideLateral], 12.5);
    expect(v[Muscle.biceps], 15.5);
    expect(v[Muscle.triceps], 15.5);
    expect(v[Muscle.gluteos], 4.5);

    final f = plannedFrequency(routines, exMap);
    expect(f[Muscle.peito], 2);
    expect(f[Muscle.costas], 2);
    expect(f[Muscle.deltoideLateral], 2);
    expect(f[Muscle.quadriceps], 1);
    expect(f[Muscle.posteriores], 1);
  });

  test('Shape X Ciência: tudo 2 vezes por semana e 8 semanas', () {
    final routines = routinesOf(ciencia);
    expect(ciencia.weeks, 8);
    expect(routines.map((r) => r.totalSets).toList(), [18, 20, 19, 21, 19]);

    final direct = directSetsPerMuscle(routines, exMap);
    expect(direct[Muscle.peito], 15);
    expect(direct[Muscle.costas], 15);
    expect(direct[Muscle.deltoideLateral], 10);
    expect(direct[Muscle.biceps], 8);
    expect(direct[Muscle.triceps], 8);
    expect(direct[Muscle.quadriceps], 12);
    expect(direct[Muscle.posteriores], 9);
    expect(direct[Muscle.gluteos], 3);
    expect(direct[Muscle.panturrilha], 8);
    expect(direct[Muscle.abdomen], 6);

    final v = plannedSetsPerMuscle(routines, exMap);
    expect(v[Muscle.costas], 16.5);
    expect(v[Muscle.biceps], 15.5);
    expect(v[Muscle.triceps], 12.5);
    expect(v[Muscle.posteriores], 10.5);
    expect(v[Muscle.gluteos], 9);

    final f = plannedFrequency(routines, exMap);
    for (final m in [
      Muscle.peito,
      Muscle.costas,
      Muscle.biceps,
      Muscle.triceps,
      Muscle.quadriceps,
      Muscle.posteriores,
      Muscle.panturrilha,
      Muscle.abdomen,
    ]) {
      expect(f[m], 2, reason: m.label);
    }
    expect(f[Muscle.deltoideLateral], 3);
  });
}
