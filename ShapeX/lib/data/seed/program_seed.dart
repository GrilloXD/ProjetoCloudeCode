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

const _comp = '1 a 2 RIR';
const _mach = '1 RIR';
const _iso = '0 a 1 RIR';

const programSeed = [
  SeedRoutine('Superior A', 'Peito em foco, costas e deltoide lateral', 1, [
    SeedSlot('supino_inclinado_maquina', 3, 6, 10, 150, _comp,
        'Primeiro do dia: 2 séries de aquecimento progressivo antes.'),
    SeedSlot('puxada_aberta', 3, 8, 12, 120, _comp),
    SeedSlot('supino_convergente', 3, 8, 12, 120, _mach),
    SeedSlot('remada_articulada', 3, 8, 12, 120, _mach),
    SeedSlot('peck_deck', 3, 12, 15, 90, _iso),
    SeedSlot('elevacao_lateral_maquina', 4, 12, 15, 75, _iso),
  ]),
  SeedRoutine('Inferior A', 'Quadríceps em foco, posteriores, panturrilha e abdômen', 2, [
    SeedSlot('hack_squat', 3, 6, 10, 180, _comp,
        'Primeiro do dia: 2 a 3 séries de aquecimento progressivo antes.'),
    SeedSlot('leg_press', 3, 8, 12, 150, _comp),
    SeedSlot('cadeira_extensora', 3, 10, 15, 90, _iso),
    SeedSlot('flexora_sentada', 3, 8, 12, 90, _iso),
    SeedSlot('panturrilha_pe_maquina', 4, 8, 12, 90, _iso),
    SeedSlot('abdominal_polia', 3, 10, 15, 60, _iso),
  ]),
  SeedRoutine('Ombros e Braços', 'Deltoide lateral e posterior, braços e peito superior', 3, [
    SeedSlot('elevacao_lateral_polia', 4, 12, 15, 60, _iso,
        'Faça um lado e logo em seguida o outro. Descanse depois dos dois.'),
    SeedSlot('crucifixo_inverso_maquina', 3, 12, 15, 75, _iso),
    SeedSlot('crossover_baixo_cima', 3, 12, 15, 75, _iso),
    SeedSlot('rosca_scott_maquina', 3, 8, 12, 90, _mach),
    SeedSlot('triceps_frances_polia', 3, 10, 12, 90, _mach),
    SeedSlot('rosca_martelo_corda', 2, 10, 15, 60, _iso),
    SeedSlot('triceps_polia_barra', 3, 10, 12, 75, _iso),
  ]),
  SeedRoutine('Inferior B', 'Posteriores e glúteos, quadríceps, panturrilha e abdômen', 4, [
    SeedSlot('stiff_halteres', 3, 8, 10, 150, _comp,
        'Primeiro do dia: 2 séries de aquecimento com carga leve.'),
    SeedSlot('bulgaro_smith', 3, 8, 12, 120, _comp,
        'Registre as reps de uma perna. Descanse depois das duas.'),
    SeedSlot('flexora_deitada', 3, 10, 12, 90, _iso),
    SeedSlot('cadeira_extensora', 3, 12, 15, 90, _iso),
    SeedSlot('panturrilha_sentada', 4, 10, 15, 75, _iso),
    SeedSlot('elevacao_pernas_paralela', 3, 10, 15, 60, _iso),
  ]),
  SeedRoutine('Superior B', 'Costas em foco (largura), peito superior e braços', 5, [
    SeedSlot('puxada_neutra', 3, 6, 10, 150, _comp,
        'Primeiro do dia: 2 séries de aquecimento progressivo antes.'),
    SeedSlot('supino_inclinado_halteres', 3, 8, 12, 120, _comp),
    SeedSlot('remada_cavalinho_apoio', 3, 8, 12, 120, _mach),
    SeedSlot('pullover_polia', 2, 12, 15, 75, _iso),
    SeedSlot('elevacao_lateral_halteres', 4, 12, 20, 60, _iso),
    SeedSlot('rosca_bayesiana', 3, 10, 12, 75, _iso,
        'Registre as reps de um braço. Descanse depois dos dois.'),
    SeedSlot('triceps_extensao_maquina', 2, 10, 15, 75, _iso),
  ]),
];

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
