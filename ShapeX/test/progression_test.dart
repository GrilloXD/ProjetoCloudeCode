import 'package:flutter_test/flutter_test.dart';
import 'package:shape_x/data/models.dart';
import 'package:shape_x/data/seed/exercise_catalog.dart';
import 'package:shape_x/logic/formatters.dart';
import 'package:shape_x/logic/progression.dart';

Exercise ex(String id) => exerciseCatalog.firstWhere((e) => e.id == id);

ExercisePerformance perf(int day, List<(double, int)> sets) => ExercisePerformance(
      sessionId: day,
      date: DateTime(2026, 11, day),
      sets: [for (final s in sets) SetEntry(s.$1, s.$2)],
    );

void main() {
  group('progressão dupla', () {
    final machine = ex('supino_convergente');

    test('sem histórico pede carga inicial, sem usar cargas antigas', () {
      final r = recommend(exercise: machine, sets: 3, repMin: 8, repMax: 12, history: const []);
      expect(r.kind, RecKind.start);
      expect(r.weight, isNull);
    });

    test('mantém a carga enquanto não bate o topo em todas as séries', () {
      final r = recommend(
        exercise: machine,
        sets: 3,
        repMin: 8,
        repMax: 12,
        history: [perf(1, [(40, 12), (40, 11), (40, 10)])],
      );
      expect(r.kind, RecKind.keep);
      expect(r.weight, 40);
      expect(r.targetReps, [12, 12, 11]);
    });

    test('sobe o incremento do equipamento quando bate o topo em todas', () {
      final r = recommend(
        exercise: machine,
        sets: 3,
        repMin: 8,
        repMax: 12,
        history: [perf(1, [(40, 12), (40, 12), (40, 12)])],
      );
      expect(r.kind, RecKind.increase);
      expect(r.weight, 45);
      expect(r.title, 'Meta batida (3×12). Suba para 45 kg');
      expect(r.targetReps, [8, 8, 8]);
    });

    test('respeita incremento de halteres e de polia', () {
      final db = recommend(
        exercise: ex('supino_inclinado_halteres'),
        sets: 3,
        repMin: 8,
        repMax: 12,
        history: [perf(1, [(24, 12), (24, 12), (24, 12)])],
      );
      expect(db.weight, 26);
      final cable = recommend(
        exercise: ex('elevacao_lateral_polia'),
        sets: 4,
        repMin: 12,
        repMax: 15,
        history: [perf(1, [(7.5, 15), (7.5, 15), (7.5, 15), (7.5, 15)])],
      );
      expect(cable.weight, 10);
      expect(fmtKg(cable.weight), '10');
    });

    test('menos séries que o planejado não conta como meta batida', () {
      final r = recommend(
        exercise: machine,
        sets: 3,
        repMin: 8,
        repMax: 12,
        history: [perf(1, [(40, 12), (40, 12)])],
      );
      expect(r.kind, RecKind.keep);
    });

    test('abaixo da faixa duas vezes sugere reduzir a carga', () {
      final once = recommend(
        exercise: machine,
        sets: 3,
        repMin: 8,
        repMax: 12,
        history: [perf(1, [(60, 7), (60, 6), (60, 6)])],
      );
      expect(once.kind, RecKind.below);
      final twice = recommend(
        exercise: machine,
        sets: 3,
        repMin: 8,
        repMax: 12,
        history: [
          perf(1, [(60, 7), (60, 6), (60, 6)]),
          perf(8, [(60, 7), (60, 7), (60, 6)]),
        ],
      );
      expect(twice.kind, RecKind.reduce);
      expect(twice.weight, 55);
    });

    test('barra assistida progride reduzindo a assistência', () {
      final r = recommend(
        exercise: ex('barra_assistida'),
        sets: 3,
        repMin: 6,
        repMax: 10,
        history: [perf(1, [(30, 10), (30, 10), (30, 10)])],
      );
      expect(r.kind, RecKind.increase);
      expect(r.weight, 25);
    });
  });

  group('estagnação', () {
    final machine = ex('supino_convergente');

    test('detecta 3 sessões sem superar as anteriores', () {
      final h = [
        perf(1, [(40, 10), (40, 10), (40, 9)]),
        perf(8, [(40, 10), (40, 10), (40, 9)]),
        perf(15, [(40, 9), (40, 9), (40, 9)]),
        perf(22, [(40, 10), (40, 9), (40, 9)]),
      ];
      expect(isStagnant(machine, h), isTrue);
    });

    test('não acusa quando há progresso', () {
      final h = [
        perf(1, [(40, 10), (40, 10), (40, 9)]),
        perf(8, [(40, 11), (40, 10), (40, 10)]),
        perf(15, [(40, 12), (40, 11), (40, 10)]),
        perf(22, [(45, 9), (45, 8), (45, 8)]),
      ];
      expect(isStagnant(machine, h), isFalse);
    });

    test('precisa de pelo menos 4 sessões', () {
      expect(isStagnant(machine, [perf(1, [(40, 10)]), perf(2, [(40, 10)]), perf(3, [(40, 10)])]), isFalse);
    });
  });

  group('recordes', () {
    final machine = ex('supino_convergente');

    test('maior carga e 1RM estimado', () {
      final pr = personalRecords(machine, [
        perf(1, [(40, 12), (45, 8)]),
        perf(8, [(42.5, 10)]),
      ]);
      expect(pr.maxWeight, 45);
      expect(pr.maxWeightReps, 8);
      expect(pr.bestE1rm, closeTo(57.0, 0.05));
    });

    test('novos recordes só contam com histórico anterior', () {
      expect(newRecords(machine, const [SetEntry(50, 8)], const []), isEmpty);
      final r = newRecords(machine, const [SetEntry(50, 8)], [perf(1, [(45, 8)])]);
      expect(r, contains('Maior carga: 50 kg × 8'));
    });
  });

  group('formatação', () {
    test('kg com vírgula', () {
      expect(fmtKg(42.5), '42,5');
      expect(fmtKg(40), '40');
      expect(fmtKg(1.25), '1,25');
      expect(parseNum('37,5'), 37.5);
      expect(parseNum('37.5'), 37.5);
      expect(fmtThousands(12340), '12.340');
    });
  });
}
