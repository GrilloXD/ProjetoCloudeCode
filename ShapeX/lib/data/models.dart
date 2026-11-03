enum Muscle {
  peito('Peito'),
  costas('Costas'),
  deltoideLateral('Deltoide lateral'),
  deltoideAnterior('Deltoide anterior'),
  deltoidePosterior('Deltoide posterior'),
  biceps('Bíceps'),
  triceps('Tríceps'),
  antebraco('Antebraço'),
  quadriceps('Quadríceps'),
  posteriores('Posteriores'),
  gluteos('Glúteos'),
  panturrilha('Panturrilha'),
  abdomen('Abdômen'),
  trapezio('Trapézio'),
  lombar('Lombar'),
  adutores('Adutores');

  const Muscle(this.label);
  final String label;

  static Muscle fromName(String name) =>
      Muscle.values.firstWhere((m) => m.name == name, orElse: () => Muscle.peito);

  static const tracked = [
    peito,
    costas,
    deltoideLateral,
    deltoidePosterior,
    deltoideAnterior,
    biceps,
    triceps,
    quadriceps,
    posteriores,
    gluteos,
    panturrilha,
    abdomen,
  ];
}

enum Equipment {
  maquina('Máquina'),
  polia('Polia'),
  halteres('Halteres'),
  barra('Barra'),
  smith('Smith'),
  pesoCorporal('Peso corporal');

  const Equipment(this.label);
  final String label;

  static Equipment fromName(String name) =>
      Equipment.values.firstWhere((e) => e.name == name, orElse: () => Equipment.maquina);
}

enum LoadType {
  weighted,
  bodyweight,
  assisted;

  static LoadType fromName(String name) =>
      LoadType.values.firstWhere((e) => e.name == name, orElse: () => LoadType.weighted);
}

class Exercise {
  Exercise({
    required this.id,
    required this.name,
    required this.primary,
    this.secondary = const [],
    required this.equipment,
    required this.pattern,
    this.loadType = LoadType.weighted,
    this.unilateral = false,
    required this.increment,
    this.instructions = const [],
    this.tip = '',
    this.custom = false,
  });

  final String id;
  final String name;
  final Muscle primary;
  final List<Muscle> secondary;
  final Equipment equipment;
  final String pattern;
  final LoadType loadType;
  final bool unilateral;
  double increment;
  final List<String> instructions;
  final String tip;
  final bool custom;

  Map<String, Object?> toRow() => {
        'id': id,
        'name': name,
        'primary_muscle': primary.name,
        'secondary': secondary.map((m) => m.name).join(','),
        'equipment': equipment.name,
        'pattern': pattern,
        'load_type': loadType.name,
        'unilateral': unilateral ? 1 : 0,
        'increment': increment,
        'instructions': instructions.join('\n'),
        'tip': tip,
        'custom': custom ? 1 : 0,
      };

  factory Exercise.fromRow(Map<String, Object?> r) {
    final sec = (r['secondary'] as String? ?? '');
    final ins = (r['instructions'] as String? ?? '');
    return Exercise(
      id: r['id'] as String,
      name: r['name'] as String,
      primary: Muscle.fromName(r['primary_muscle'] as String),
      secondary: sec.isEmpty ? const [] : sec.split(',').map(Muscle.fromName).toList(),
      equipment: Equipment.fromName(r['equipment'] as String),
      pattern: r['pattern'] as String,
      loadType: LoadType.fromName(r['load_type'] as String? ?? 'weighted'),
      unilateral: (r['unilateral'] as int? ?? 0) == 1,
      increment: (r['increment'] as num).toDouble(),
      instructions: ins.isEmpty ? const [] : ins.split('\n'),
      tip: r['tip'] as String? ?? '',
      custom: (r['custom'] as int? ?? 0) == 1,
    );
  }
}

class RoutineExercise {
  RoutineExercise({
    this.id,
    required this.routineId,
    required this.exerciseId,
    required this.position,
    required this.sets,
    required this.repMin,
    required this.repMax,
    required this.restSec,
    this.rir = '',
    this.note = '',
  });

  int? id;
  int routineId;
  String exerciseId;
  int position;
  int sets;
  int repMin;
  int repMax;
  int restSec;
  String rir;
  String note;

  Map<String, Object?> toRow() => {
        if (id != null) 'id': id,
        'routine_id': routineId,
        'exercise_id': exerciseId,
        'position': position,
        'sets': sets,
        'rep_min': repMin,
        'rep_max': repMax,
        'rest_sec': restSec,
        'rir': rir,
        'note': note,
      };

  factory RoutineExercise.fromRow(Map<String, Object?> r) => RoutineExercise(
        id: r['id'] as int,
        routineId: r['routine_id'] as int,
        exerciseId: r['exercise_id'] as String,
        position: r['position'] as int,
        sets: r['sets'] as int,
        repMin: r['rep_min'] as int,
        repMax: r['rep_max'] as int,
        restSec: r['rest_sec'] as int,
        rir: r['rir'] as String? ?? '',
        note: r['note'] as String? ?? '',
      );
}

class Routine {
  Routine({
    this.id,
    required this.name,
    this.focus = '',
    this.weekday,
    required this.position,
    List<RoutineExercise>? exercises,
  }) : exercises = exercises ?? [];

  int? id;
  String name;
  String focus;
  int? weekday;
  int position;
  List<RoutineExercise> exercises;

  int get totalSets => exercises.fold(0, (a, e) => a + e.sets);
}

class SetLog {
  SetLog({
    this.id,
    required this.sessionExerciseId,
    required this.index,
    this.weight,
    this.reps,
    this.done = false,
    this.doneAt,
  });

  int? id;
  int sessionExerciseId;
  int index;
  double? weight;
  int? reps;
  bool done;
  DateTime? doneAt;

  factory SetLog.fromRow(Map<String, Object?> r) => SetLog(
        id: r['id'] as int,
        sessionExerciseId: r['session_exercise_id'] as int,
        index: r['set_index'] as int,
        weight: (r['weight'] as num?)?.toDouble(),
        reps: r['reps'] as int?,
        done: (r['done'] as int? ?? 0) == 1,
        doneAt: r['done_at'] == null
            ? null
            : DateTime.fromMillisecondsSinceEpoch(r['done_at'] as int),
      );
}

class SessionExercise {
  SessionExercise({
    this.id,
    required this.sessionId,
    required this.exerciseId,
    required this.position,
    required this.setsPlanned,
    required this.repMin,
    required this.repMax,
    required this.restSec,
    this.rir = '',
    List<SetLog>? sets,
  }) : sets = sets ?? [];

  int? id;
  int sessionId;
  String exerciseId;
  int position;
  int setsPlanned;
  int repMin;
  int repMax;
  int restSec;
  String rir;
  List<SetLog> sets;

  List<SetLog> get doneSets => sets.where((s) => s.done).toList();

  factory SessionExercise.fromRow(Map<String, Object?> r) => SessionExercise(
        id: r['id'] as int,
        sessionId: r['session_id'] as int,
        exerciseId: r['exercise_id'] as String,
        position: r['position'] as int,
        setsPlanned: r['sets_planned'] as int,
        repMin: r['rep_min'] as int,
        repMax: r['rep_max'] as int,
        restSec: r['rest_sec'] as int,
        rir: r['rir'] as String? ?? '',
      );
}

class Session {
  Session({
    this.id,
    this.routineId,
    required this.name,
    required this.startedAt,
    this.endedAt,
    List<SessionExercise>? exercises,
  }) : exercises = exercises ?? [];

  int? id;
  int? routineId;
  String name;
  DateTime startedAt;
  DateTime? endedAt;
  List<SessionExercise> exercises;

  bool get active => endedAt == null;

  Duration get duration => (endedAt ?? DateTime.now()).difference(startedAt);

  int get doneSetCount => exercises.fold(0, (a, e) => a + e.doneSets.length);

  double get volume => exercises.fold(
        0.0,
        (a, e) => a +
            e.doneSets.fold(0.0, (b, s) => b + (s.weight ?? 0) * (s.reps ?? 0)),
      );

  factory Session.fromRow(Map<String, Object?> r) => Session(
        id: r['id'] as int,
        routineId: r['routine_id'] as int?,
        name: r['name'] as String,
        startedAt: DateTime.fromMillisecondsSinceEpoch(r['started_at'] as int),
        endedAt: r['ended_at'] == null
            ? null
            : DateTime.fromMillisecondsSinceEpoch(r['ended_at'] as int),
      );
}

class BodyWeight {
  BodyWeight(this.date, this.weight);
  final DateTime date;
  final double weight;
}

class Substitution {
  Substitution({
    required this.routineId,
    required this.oldExerciseId,
    required this.newExerciseId,
    required this.at,
  });

  final int routineId;
  final String oldExerciseId;
  final String newExerciseId;
  final DateTime at;
}

class SetEntry {
  const SetEntry(this.weight, this.reps);
  final double weight;
  final int reps;
}

class ExercisePerformance {
  ExercisePerformance({required this.sessionId, required this.date, required this.sets});
  final int sessionId;
  final DateTime date;
  final List<SetEntry> sets;
}
