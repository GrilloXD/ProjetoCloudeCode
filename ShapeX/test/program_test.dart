import 'package:flutter_test/flutter_test.dart';
import 'package:shape_x/data/models.dart';
import 'package:shape_x/data/seed/exercise_catalog.dart';
import 'package:shape_x/data/seed/program_seed.dart';
import 'package:shape_x/logic/analytics.dart';

void main() {
  final exMap = {for (final e in exerciseCatalog) e.id: e};
  final routines = [
    for (var i = 0; i < programSeed.length; i++)
      Routine(
        id: i + 1,
        name: programSeed[i].name,
        weekday: programSeed[i].weekday,
        position: i,
        exercises: [
          for (final s in programSeed[i].slots)
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

  test('todo exercício do programa existe no catálogo', () {
    for (final r in programSeed) {
      for (final s in r.slots) {
        expect(exMap.containsKey(s.exerciseId), isTrue, reason: s.exerciseId);
        expect(s.repMin <= s.repMax, isTrue);
      }
    }
  });

  test('ids do catálogo são únicos e todo exercício tem instruções', () {
    final ids = exerciseCatalog.map((e) => e.id).toList();
    expect(ids.toSet().length, ids.length);
    for (final e in exerciseCatalog) {
      expect(e.instructions, isNotEmpty, reason: e.id);
      expect(e.increment, greaterThan(0), reason: e.id);
    }
  });

  test('séries diretas por semana batem com o planejamento', () {
    final direct = directSetsPerMuscle(routines, exMap);
    expect(direct[Muscle.peito], 15);
    expect(direct[Muscle.costas], 14);
    expect(direct[Muscle.deltoideLateral], 12);
    expect(direct[Muscle.deltoidePosterior], 3);
    expect(direct[Muscle.biceps], 8);
    expect(direct[Muscle.triceps], 8);
    expect(direct[Muscle.quadriceps], 15);
    expect(direct[Muscle.posteriores], 9);
    expect(direct[Muscle.panturrilha], 8);
    expect(direct[Muscle.abdomen], 6);
    expect(direct[Muscle.gluteos], isNull);
  });

  test('volume com indiretas (0,5) e nenhum músculo acima de 20', () {
    final v = plannedSetsPerMuscle(routines, exMap);
    expect(v[Muscle.peito], 15);
    expect(v[Muscle.costas], 15.5);
    expect(v[Muscle.deltoideLateral], 12);
    expect(v[Muscle.deltoideAnterior], 7.5);
    expect(v[Muscle.deltoidePosterior], 7.5);
    expect(v[Muscle.biceps], 14);
    expect(v[Muscle.triceps], 12.5);
    expect(v[Muscle.quadriceps], 15);
    expect(v[Muscle.posteriores], 9);
    expect(v[Muscle.gluteos], 6);
    expect(volumeInsights(v), isEmpty);
  });

  test('frequência semanal dos prioritários', () {
    final f = plannedFrequency(routines, exMap);
    expect(f[Muscle.peito], 3);
    expect(f[Muscle.deltoideLateral], 3);
    expect(f[Muscle.costas], 2);
    expect(f[Muscle.biceps], 2);
    expect(f[Muscle.triceps], 2);
    expect(f[Muscle.quadriceps], 2);
    expect(f[Muscle.posteriores], 2);
  });

  test('total de séries e duração estimada por sessão', () {
    expect(routines.map((r) => r.totalSets).toList(), [19, 19, 21, 19, 20]);
    for (final r in routines) {
      final m = estimateMinutes(r, exMap);
      expect(m, inInclusiveRange(45, 75), reason: '${r.name}: $m min');
    }
  });
}
