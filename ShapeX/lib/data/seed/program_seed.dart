class SeedSlot {
  const SeedSlot(this.exerciseId, this.sets, this.repMin, this.repMax, this.restSec, this.rir,
      [this.note = '']);
  final String exerciseId;
  final int sets;
  final int repMin;
  final int repMax;
  final int restSec;
  final String rir;
  final String note;
}

class SeedRoutine {
  const SeedRoutine(this.name, this.focus, this.weekday, this.slots);
  final String name;
  final String focus;
  final int weekday;
  final List<SeedSlot> slots;
}

class SeedProgram {
  const SeedProgram({
    required this.id,
    required this.name,
    required this.summary,
    required this.weeks,
    required this.routines,
    this.nextId,
  });

  final String id;
  final String name;
  final String summary;
  final int weeks;
  final List<SeedRoutine> routines;
  final String? nextId;

  int get totalSets => routines.fold(0, (a, r) => a + r.slots.fold(0, (b, s) => b + s.sets));
}

/// Sobe quando algum programa padrão muda; instalações antigas recebem o
/// programa atualizado ao abrir o app, sem perder sessões nem recordes.
const programVersion = 2;

const defaultProgramId = 'tradicional';

const _comp = '1 a 2 RIR';
const _mach = '1 RIR';
const _iso = '0 a 1 RIR';
const _warm = 'Primeiro do dia: 2 séries de aquecimento progressivo antes.';
const _warmLegs = 'Primeiro do dia: 2 a 3 séries de aquecimento progressivo antes.';
const _sides = 'Faça um lado e logo em seguida o outro. Descanse depois dos dois.';

const tradicional = SeedProgram(
  id: 'tradicional',
  name: 'Tradicional',
  summary: 'Um grupo grande com um pequeno por dia, como peito e tríceps ou costas e bíceps. '
      'Pernas 1 vez por semana neste ciclo.',
  weeks: 4,
  nextId: 'ciencia',
  routines: [
    SeedRoutine('Peito e Tríceps', 'Peito com ênfase na parte superior e tríceps', 1, [
      SeedSlot('supino_inclinado_maquina', 3, 6, 10, 150, _comp, _warm),
      SeedSlot('supino_convergente', 3, 8, 12, 120, _mach),
      SeedSlot('crossover_baixo_cima', 3, 12, 15, 75, _iso),
      SeedSlot('peck_deck', 3, 12, 15, 90, _iso),
      SeedSlot('triceps_frances_polia', 3, 10, 12, 90, _mach),
      SeedSlot('triceps_polia_barra', 3, 10, 12, 75, _iso),
      SeedSlot('triceps_extensao_maquina', 2, 10, 15, 75, _iso),
    ]),
    SeedRoutine('Costas e Bíceps', 'Costas em largura e espessura e bíceps', 2, [
      SeedSlot('puxada_aberta', 3, 6, 10, 150, _comp, _warm),
      SeedSlot('remada_articulada', 3, 8, 12, 120, _mach),
      SeedSlot('puxada_neutra', 3, 8, 12, 120, _mach),
      SeedSlot('pullover_polia', 3, 12, 15, 75, _iso),
      SeedSlot('rosca_scott_maquina', 3, 8, 12, 90, _mach),
      SeedSlot('rosca_bayesiana', 3, 10, 12, 75, _iso,
          'Registre as reps de um braço. Descanse depois dos dois.'),
      SeedSlot('rosca_martelo_corda', 2, 10, 15, 60, _iso),
    ]),
    SeedRoutine('Ombros e Abdômen', 'Deltoide lateral em foco, deltoide posterior e abdômen', 3, [
      SeedSlot('desenvolvimento_maquina', 3, 8, 12, 120, _comp, _warm),
      SeedSlot('elevacao_lateral_maquina', 4, 12, 15, 75, _iso),
      SeedSlot('elevacao_lateral_polia', 3, 12, 15, 60, _iso, _sides),
      SeedSlot('crucifixo_inverso_maquina', 3, 12, 15, 75, _iso),
      SeedSlot('abdominal_polia', 3, 10, 15, 60, _iso),
      SeedSlot('elevacao_pernas_paralela', 3, 10, 15, 60, _iso),
    ]),
    SeedRoutine('Pernas', 'Quadríceps, posteriores, glúteos e panturrilha', 4, [
      SeedSlot('hack_squat', 3, 6, 10, 180, _comp, _warmLegs),
      SeedSlot('leg_press', 3, 8, 12, 150, _comp),
      SeedSlot('cadeira_extensora', 3, 10, 15, 90, _iso),
      SeedSlot('stiff_halteres', 3, 8, 10, 150, _comp),
      SeedSlot('flexora_sentada', 3, 10, 12, 90, _iso),
      SeedSlot('panturrilha_pe_maquina', 4, 8, 12, 90, _iso),
    ]),
    SeedRoutine('Peito e Costas', 'Peito superior, costas e deltoide lateral', 5, [
      SeedSlot('supino_inclinado_halteres', 3, 8, 12, 120, _comp, _warm),
      SeedSlot('puxada_supinada', 3, 8, 12, 120, _comp),
      SeedSlot('chest_press', 3, 8, 12, 120, _mach),
      SeedSlot('remada_cavalinho_apoio', 3, 8, 12, 120, _mach),
      SeedSlot('elevacao_lateral_halteres', 4, 12, 20, 60, _iso),
    ]),
  ],
);

const ciencia = SeedProgram(
  id: 'ciencia',
  name: 'Shape X Ciência',
  summary: 'Cada músculo 2 vezes por semana, pernas em dois dias, 10 a 20 séries semanais por músculo '
      'e exercícios simples, quase todos em máquinas e polias.',
  weeks: 8,
  routines: [
    SeedRoutine('Peito, Ombros e Tríceps', 'Peito em foco, deltoide lateral e tríceps', 1, [
      SeedSlot('supino_inclinado_maquina', 3, 6, 10, 150, _comp, _warm),
      SeedSlot('supino_convergente', 3, 8, 12, 120, _mach),
      SeedSlot('peck_deck', 3, 12, 15, 90, _iso),
      SeedSlot('elevacao_lateral_maquina', 4, 12, 15, 75, _iso),
      SeedSlot('triceps_frances_polia', 3, 10, 12, 90, _mach),
      SeedSlot('triceps_polia_barra', 2, 10, 12, 75, _iso),
    ]),
    SeedRoutine('Costas e Bíceps', 'Costas em foco, deltoide posterior e lateral e bíceps', 2, [
      SeedSlot('puxada_aberta', 3, 6, 10, 150, _comp, _warm),
      SeedSlot('remada_articulada', 3, 8, 12, 120, _mach),
      SeedSlot('puxada_neutra', 3, 8, 12, 120, _mach),
      SeedSlot('crucifixo_inverso_maquina', 3, 12, 15, 75, _iso),
      SeedSlot('elevacao_lateral_polia', 3, 12, 15, 60, _iso, _sides),
      SeedSlot('rosca_scott_maquina', 3, 8, 12, 90, _mach),
      SeedSlot('rosca_martelo_corda', 2, 10, 15, 60, _iso),
    ]),
    SeedRoutine('Pernas A', 'Quadríceps em foco, posteriores, panturrilha e abdômen', 3, [
      SeedSlot('hack_squat', 3, 6, 10, 180, _comp, _warmLegs),
      SeedSlot('leg_press', 3, 8, 12, 150, _comp),
      SeedSlot('cadeira_extensora', 3, 10, 15, 90, _iso),
      SeedSlot('flexora_sentada', 3, 10, 12, 90, _iso),
      SeedSlot('panturrilha_pe_maquina', 4, 8, 12, 90, _iso),
      SeedSlot('abdominal_polia', 3, 10, 15, 60, _iso),
    ]),
    SeedRoutine('Superior', 'Peito superior, costas, deltoide lateral e braços', 4, [
      SeedSlot('supino_inclinado_halteres', 3, 8, 12, 120, _comp, _warm),
      SeedSlot('puxada_supinada', 3, 8, 12, 120, _comp),
      SeedSlot('crossover_baixo_cima', 3, 12, 15, 75, _iso),
      SeedSlot('remada_cavalinho_apoio', 3, 8, 12, 120, _mach),
      SeedSlot('elevacao_lateral_halteres', 3, 12, 20, 60, _iso),
      SeedSlot('rosca_polia_barra', 3, 10, 12, 75, _iso),
      SeedSlot('triceps_extensao_maquina', 3, 10, 15, 75, _iso),
    ]),
    SeedRoutine('Pernas B', 'Posteriores e glúteos, quadríceps, panturrilha e abdômen', 5, [
      SeedSlot('agachamento_smith', 3, 8, 12, 150, _comp, _warmLegs),
      SeedSlot('stiff_halteres', 3, 8, 10, 150, _comp),
      SeedSlot('flexora_deitada', 3, 10, 12, 90, _iso),
      SeedSlot('hip_thrust_maquina', 3, 8, 12, 120, _mach),
      SeedSlot('panturrilha_sentada', 4, 10, 15, 75, _iso),
      SeedSlot('elevacao_pernas_paralela', 3, 10, 15, 60, _iso),
    ]),
  ],
);

const programs = [tradicional, ciencia];

SeedProgram programById(String? id) =>
    programs.firstWhere((p) => p.id == id, orElse: () => programs.first);

const patternFamilies = <String, List<String>>{
  'press_incline': ['press_flat', 'dip'],
  'press_flat': ['press_incline', 'dip'],
  'dip': ['press_flat', 'triceps_press'],
  'fly': ['fly_incline'],
  'fly_incline': ['fly'],
  'vertical_pull': ['pullover'],
  'pullover': ['vertical_pull'],
  'horizontal_row': [],
  'lateral_raise': ['upright_row'],
  'upright_row': ['lateral_raise'],
  'ohp': [],
  'rear_delt': [],
  'curl_preacher': ['curl', 'curl_long'],
  'curl_long': ['curl', 'curl_preacher'],
  'curl': ['curl_preacher', 'curl_long', 'hammer'],
  'hammer': ['curl'],
  'triceps_overhead': ['triceps_extension', 'triceps_pushdown'],
  'triceps_extension': ['triceps_overhead', 'triceps_pushdown'],
  'triceps_pushdown': ['triceps_extension', 'triceps_overhead'],
  'triceps_press': ['dip', 'triceps_pushdown'],
  'squat': ['leg_press', 'lunge'],
  'leg_press': ['squat', 'lunge'],
  'lunge': ['squat', 'leg_press'],
  'knee_extension': [],
  'leg_curl': ['hinge'],
  'hinge': ['leg_curl', 'hip_extension'],
  'hip_thrust': ['hip_extension', 'hinge'],
  'hip_extension': ['hip_thrust', 'hinge'],
  'abduction': ['hip_thrust'],
  'adduction': [],
  'calf_standing': ['calf_seated'],
  'calf_seated': ['calf_standing'],
  'abs_flexion': ['abs_hip_flexion'],
  'abs_hip_flexion': ['abs_flexion'],
  'wrist': ['hammer'],
};
