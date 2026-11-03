import '../models.dart';

Exercise _ex(
  String id,
  String name,
  Muscle primary,
  List<Muscle> secondary,
  Equipment equipment,
  String pattern,
  double increment,
  List<String> steps,
  String tip, {
  LoadType loadType = LoadType.weighted,
  bool unilateral = false,
}) =>
    Exercise(
      id: id,
      name: name,
      primary: primary,
      secondary: secondary,
      equipment: equipment,
      pattern: pattern,
      increment: increment,
      instructions: steps,
      tip: tip,
      loadType: loadType,
      unilateral: unilateral,
    );

final List<Exercise> exerciseCatalog = [
  // PEITO
  _ex('supino_inclinado_maquina', 'Supino Inclinado na Máquina', Muscle.peito,
      [Muscle.deltoideAnterior, Muscle.triceps], Equipment.maquina, 'press_incline', 5, [
    'Ajuste o banco para a pegada ficar na linha da parte alta do peito.',
    'Escápulas encaixadas para trás e para baixo, peito alto.',
    'Desça até sentir o peito alongar e empurre sem travar os cotovelos.',
  ], 'Cotovelos a uns 45 graus do tronco. Não tire o quadril do banco.'),
  _ex('supino_convergente', 'Supino Convergente (Máquina)', Muscle.peito,
      [Muscle.deltoideAnterior, Muscle.triceps], Equipment.maquina, 'press_flat', 5, [
    'Pegada na altura do meio do peito, escápulas encaixadas.',
    'Empurre aproximando as mãos no final do movimento.',
    'Volte devagar até o alongamento completo do peito.',
  ], 'Controle a volta em 2 a 3 segundos.'),
  _ex('chest_press', 'Chest Press Sentado', Muscle.peito,
      [Muscle.deltoideAnterior, Muscle.triceps], Equipment.maquina, 'press_flat', 5, [
    'Banco ajustado para a pegada ficar no meio do peito.',
    'Empurre à frente mantendo os ombros para trás.',
    'Retorne até o peito alongar, sem perder a postura.',
  ], 'Se os ombros sobem na volta, reduza a amplitude um pouco.'),
  _ex('supino_inclinado_halteres', 'Supino Inclinado com Halteres', Muscle.peito,
      [Muscle.deltoideAnterior, Muscle.triceps], Equipment.halteres, 'press_incline', 2, [
    'Banco entre 30 e 45 graus, halteres na linha da parte alta do peito.',
    'Desça abrindo os cotovelos a uns 45 graus até alongar bem o peito.',
    'Empurre para cima e levemente para dentro.',
  ], 'Os halteres permitem descer mais que a barra. Aproveite o alongamento.'),
  _ex('supino_inclinado_smith', 'Supino Inclinado no Smith', Muscle.peito,
      [Muscle.deltoideAnterior, Muscle.triceps], Equipment.smith, 'press_incline', 2, [
    'Banco a 30 graus, barra descendo na parte alta do peito.',
    'Escápulas encaixadas, pés firmes no chão.',
    'Desça controlando e empurre sem travar os cotovelos.',
  ], 'Posicione o banco para a barra tocar logo abaixo da clavícula.'),
  _ex('supino_reto_smith', 'Supino Reto no Smith', Muscle.peito,
      [Muscle.deltoideAnterior, Muscle.triceps], Equipment.smith, 'press_flat', 2, [
    'Barra alinhada com o meio do peito.',
    'Escápulas encaixadas e leve arco natural nas costas.',
    'Desça até perto do peito e empurre de forma controlada.',
  ], 'Cotovelos a uns 45 graus, nunca totalmente abertos.'),
  _ex('supino_reto_barra', 'Supino Reto com Barra', Muscle.peito,
      [Muscle.deltoideAnterior, Muscle.triceps], Equipment.barra, 'press_flat', 2, [
    'Pegada um pouco mais larga que os ombros.',
    'Escápulas encaixadas, pés firmes, barra descendo no meio do peito.',
    'Empurre para cima e levemente para trás.',
  ], 'Use segurança ou parceiro em séries próximas da falha.'),
  _ex('supino_reto_halteres', 'Supino Reto com Halteres', Muscle.peito,
      [Muscle.deltoideAnterior, Muscle.triceps], Equipment.halteres, 'press_flat', 2, [
    'Deite com os halteres na linha do meio do peito.',
    'Desça até alongar o peito, cotovelos a uns 45 graus.',
    'Empurre aproximando levemente os halteres.',
  ], 'Mais amplitude que a barra, com menos estresse no ombro.'),
  _ex('peck_deck', 'Peck Deck (Voador)', Muscle.peito, [Muscle.deltoideAnterior],
      Equipment.maquina, 'fly', 5, [
    'Banco ajustado para as mãos ficarem na altura do peito.',
    'Cotovelos levemente flexionados e fixos durante todo o movimento.',
    'Feche os braços contraindo o peito e volte até alongar.',
  ], 'Peito alto e ombros para trás. Não deixe os ombros irem à frente.'),
  _ex('crossover_baixo_cima', 'Crossover de Baixo para Cima', Muscle.peito,
      [Muscle.deltoideAnterior], Equipment.polia, 'fly_incline', 2.5, [
    'Polias na posição mais baixa, um passo à frente.',
    'Suba os braços em arco até a altura dos olhos, juntando as mãos.',
    'Volte devagar até alongar a parte alta do peito.',
  ], 'Foco na porção superior (clavicular) do peito.'),
  _ex('crucifixo_polia_media', 'Crucifixo na Polia (altura média)', Muscle.peito,
      [Muscle.deltoideAnterior], Equipment.polia, 'fly', 2.5, [
    'Polias na altura do peito, um passo à frente.',
    'Braços abertos com leve flexão de cotovelo.',
    'Feche à frente do peito e volte até alongar.',
  ], 'Mantenha os ombros para trás durante todo o arco.'),
  _ex('crossover_alto_baixo', 'Crossover de Cima para Baixo', Muscle.peito,
      [Muscle.deltoideAnterior], Equipment.polia, 'fly', 2.5, [
    'Polias no alto, tronco levemente inclinado à frente.',
    'Desça os braços em arco até a frente do quadril.',
    'Volte controlando até alongar o peito.',
  ], 'Enfatiza a porção inferior do peito.'),
  _ex('crucifixo_inclinado_halteres', 'Crucifixo Inclinado com Halteres', Muscle.peito,
      [Muscle.deltoideAnterior], Equipment.halteres, 'fly_incline', 2, [
    'Banco a 30 graus, halteres acima do peito.',
    'Abra os braços em arco com leve flexão de cotovelo.',
    'Desça até alongar o peito e feche contraindo.',
  ], 'Pare a descida quando sentir o ombro e não o peito.'),
  _ex('mergulho_paralelas', 'Mergulho nas Paralelas', Muscle.peito,
      [Muscle.triceps, Muscle.deltoideAnterior], Equipment.pesoCorporal, 'dip', 2.5, [
    'Tronco levemente inclinado à frente.',
    'Desça até os ombros ficarem na altura dos cotovelos.',
    'Empurre até quase estender os braços.',
  ], 'Se sentir o ombro, prefira a versão em máquina.',
      loadType: LoadType.bodyweight),

  // COSTAS
  _ex('puxada_aberta', 'Puxada Alta Aberta (pronada)', Muscle.costas,
      [Muscle.biceps, Muscle.deltoidePosterior], Equipment.polia, 'vertical_pull', 5, [
    'Pegada um pouco mais larga que os ombros, coxas travadas.',
    'Puxe levando os cotovelos para baixo e para os lados do tronco.',
    'Suba devagar até os braços estenderem e as dorsais alongarem.',
  ], 'Peito alto, sem jogar o tronco para trás.'),
  _ex('puxada_neutra', 'Puxada Neutra (Triângulo)', Muscle.costas, [Muscle.biceps],
      Equipment.polia, 'vertical_pull', 5, [
    'Triângulo no cabo, tronco levemente inclinado para trás.',
    'Puxe até a parte alta do peito com os cotovelos colados ao corpo.',
    'Volte até alongar completamente as dorsais.',
  ], 'Pense em puxar com os cotovelos, não com as mãos.'),
  _ex('puxada_supinada', 'Puxada Supinada (pegada fechada)', Muscle.costas,
      [Muscle.biceps], Equipment.polia, 'vertical_pull', 5, [
    'Pegada supinada na largura dos ombros.',
    'Puxe até o queixo passar a barra, cotovelos para baixo.',
    'Suba controlando até estender os braços.',
  ], 'Boa opção para quem sente o ombro na pegada aberta.'),
  _ex('puxada_unilateral', 'Puxada Unilateral na Polia', Muscle.costas, [Muscle.biceps],
      Equipment.polia, 'vertical_pull', 2.5, [
    'Ajoelhado ou sentado, pegador acima da cabeça.',
    'Puxe o cotovelo em direção ao quadril.',
    'Volte até alongar bem a lateral do tronco.',
  ], 'Permite maior amplitude e foco em cada lado.',
      unilateral: true),
  _ex('puxada_articulada', 'Puxada Articulada (Máquina)', Muscle.costas,
      [Muscle.biceps], Equipment.maquina, 'vertical_pull', 5, [
    'Ajuste o assento para alcançar os pegadores com braços estendidos.',
    'Puxe levando os cotovelos para baixo.',
    'Volte devagar até alongar as dorsais.',
  ], 'Trajetória guiada ajuda a manter a técnica perto da falha.'),
  _ex('barra_fixa', 'Barra Fixa', Muscle.costas, [Muscle.biceps], Equipment.pesoCorporal,
      'vertical_pull', 2.5, [
    'Pegada pronada um pouco mais larga que os ombros.',
    'Suba até o queixo passar a barra, peito em direção à barra.',
    'Desça até estender totalmente os braços.',
  ], 'Registre carga extra no cinto quando houver. Sem carga, registre 0.',
      loadType: LoadType.bodyweight),
  _ex('barra_assistida', 'Barra Fixa Assistida (Gravitron)', Muscle.costas,
      [Muscle.biceps], Equipment.maquina, 'vertical_pull', 5, [
    'Escolha a assistência e apoie os joelhos na plataforma.',
    'Suba até o queixo passar a barra.',
    'Desça devagar até estender os braços.',
  ], 'Aqui o peso é assistência: progredir é diminuir o número.',
      loadType: LoadType.assisted),
  _ex('remada_articulada', 'Remada Articulada (apoio no peito)', Muscle.costas,
      [Muscle.deltoidePosterior, Muscle.biceps, Muscle.trapezio], Equipment.maquina,
      'horizontal_row', 5, [
    'Peito apoiado, braços estendidos à frente.',
    'Puxe levando os cotovelos para trás e juntando as escápulas.',
    'Volte até alongar as costas, deixando as escápulas abrirem.',
  ], 'O apoio no peito tira a lombar da jogada.'),
  _ex('remada_cavalinho_apoio', 'Remada Cavalinho com Apoio (T-Bar)', Muscle.costas,
      [Muscle.deltoidePosterior, Muscle.biceps, Muscle.trapezio], Equipment.maquina,
      'horizontal_row', 5, [
    'Peito no apoio, pegada neutra ou pronada.',
    'Puxe até o pegador chegar perto do peito.',
    'Desça devagar até estender os braços.',
  ], 'Cotovelos perto do corpo focam dorsais; abertos focam a parte alta.'),
  _ex('remada_baixa', 'Remada Baixa na Polia (Triângulo)', Muscle.costas,
      [Muscle.biceps, Muscle.deltoidePosterior], Equipment.polia, 'horizontal_row', 5, [
    'Sentado, joelhos levemente flexionados, tronco ereto.',
    'Puxe o triângulo até o abdômen com os cotovelos rentes ao corpo.',
    'Volte até alongar as costas sem arredondar a lombar.',
  ], 'Evite balançar o tronco para ganhar impulso.'),
  _ex('remada_unilateral_halter', 'Remada Unilateral com Halter (Serrote)', Muscle.costas,
      [Muscle.biceps, Muscle.deltoidePosterior], Equipment.halteres, 'horizontal_row', 2, [
    'Joelho e mão apoiados no banco, coluna neutra.',
    'Puxe o halter em direção ao quadril.',
    'Desça até alongar bem a dorsal.',
  ], 'Pense em levar o cotovelo para o bolso de trás.',
      unilateral: true),
  _ex('remada_maquina_sentado', 'Remada Sentada na Máquina (pegada neutra)',
      Muscle.costas, [Muscle.biceps, Muscle.deltoidePosterior], Equipment.maquina,
      'horizontal_row', 5, [
    'Peito no apoio, pegada neutra.',
    'Puxe os cotovelos para trás mantendo o peito no apoio.',
    'Volte devagar até estender os braços.',
  ], 'Não tire o peito do apoio no final da série.'),
  _ex('pullover_polia', 'Pullover na Polia (braços estendidos)', Muscle.costas, const [],
      Equipment.polia, 'pullover', 2.5, [
    'Polia alta com corda ou barra, tronco inclinado à frente.',
    'Com braços quase estendidos, traga o cabo até as coxas.',
    'Suba devagar até alongar as dorsais acima da cabeça.',
  ], 'Isola as dorsais sem cansar os bíceps.'),
  _ex('pullover_maquina', 'Pullover na Máquina', Muscle.costas, const [],
      Equipment.maquina, 'pullover', 5, [
    'Ajuste o eixo da máquina na altura do ombro.',
    'Leve os braços em arco de cima para baixo.',
    'Volte até o alongamento completo das dorsais.',
  ], 'Controle a fase de alongamento.'),

  // OMBROS
  _ex('elevacao_lateral_maquina', 'Elevação Lateral na Máquina', Muscle.deltoideLateral,
      const [], Equipment.maquina, 'lateral_raise', 5, [
    'Ajuste o banco para o eixo da máquina ficar na linha do ombro.',
    'Eleve os braços lateralmente até a altura dos ombros.',
    'Desça controlando, sem deixar a carga encostar.',
  ], 'Movimento conduzido pelos cotovelos, ombros longe das orelhas.'),
  _ex('elevacao_lateral_polia', 'Elevação Lateral na Polia (unilateral)',
      Muscle.deltoideLateral, const [], Equipment.polia, 'lateral_raise', 2.5, [
    'Polia na altura do quadril, cabo passando à frente ou atrás do corpo.',
    'Eleve o braço lateralmente até a altura do ombro.',
    'Desça devagar até o braço cruzar levemente à frente do corpo.',
  ], 'A polia mantém tensão na parte de baixo do movimento.',
      unilateral: true),
  _ex('elevacao_lateral_halteres', 'Elevação Lateral com Halteres (sentado)',
      Muscle.deltoideLateral, const [], Equipment.halteres, 'lateral_raise', 2, [
    'Sentado, tronco ereto, halteres ao lado do corpo.',
    'Eleve os braços com cotovelos levemente flexionados até a linha dos ombros.',
    'Desça controlando em 2 segundos.',
  ], 'Sentado evita roubar com o quadril.'),
  _ex('desenvolvimento_maquina', 'Desenvolvimento na Máquina', Muscle.deltoideAnterior,
      [Muscle.deltoideLateral, Muscle.triceps], Equipment.maquina, 'ohp', 5, [
    'Pegadores na altura dos ombros, costas apoiadas.',
    'Empurre para cima sem travar os cotovelos.',
    'Desça até as mãos ficarem perto da altura do queixo.',
  ], 'Não arqueie a lombar para empurrar.'),
  _ex('desenvolvimento_smith', 'Desenvolvimento no Smith', Muscle.deltoideAnterior,
      [Muscle.deltoideLateral, Muscle.triceps], Equipment.smith, 'ohp', 2, [
    'Banco com encosto quase vertical, barra à frente do rosto.',
    'Empurre para cima até quase estender os braços.',
    'Desça até a altura do queixo.',
  ], 'Mantenha o abdômen firme.'),
  _ex('desenvolvimento_halteres', 'Desenvolvimento com Halteres', Muscle.deltoideAnterior,
      [Muscle.deltoideLateral, Muscle.triceps], Equipment.halteres, 'ohp', 2, [
    'Sentado, halteres na altura das orelhas.',
    'Empurre para cima aproximando os halteres.',
    'Desça controlando até a altura das orelhas.',
  ], 'Cotovelos levemente à frente do corpo.'),
  _ex('crucifixo_inverso_maquina', 'Crucifixo Inverso na Máquina',
      Muscle.deltoidePosterior, [Muscle.trapezio, Muscle.costas], Equipment.maquina,
      'rear_delt', 5, [
    'De frente para a máquina, pegadores na altura dos ombros.',
    'Abra os braços para trás em arco, cotovelos levemente flexionados.',
    'Volte devagar sem deixar a carga encostar.',
  ], 'Não junte as escápulas com força; o foco é o ombro de trás.'),
  _ex('face_pull', 'Face Pull na Polia (corda)', Muscle.deltoidePosterior,
      [Muscle.trapezio], Equipment.polia, 'rear_delt', 2.5, [
    'Polia na altura do rosto, corda com pegada neutra.',
    'Puxe em direção à testa abrindo as mãos.',
    'Volte estendendo os braços com controle.',
  ], 'Cotovelos altos, na linha dos ombros.'),
  _ex('crucifixo_inverso_polia', 'Crucifixo Inverso na Polia (cruzado)',
      Muscle.deltoidePosterior, [Muscle.trapezio], Equipment.polia, 'rear_delt', 2.5, [
    'Polias na altura dos ombros, cabos cruzados à frente.',
    'Abra os braços para trás na linha dos ombros.',
    'Volte devagar até os cabos cruzarem.',
  ], 'Movimento curto e controlado, sem balanço.'),
  _ex('remada_alta_polia', 'Remada Alta na Polia (pegada aberta)',
      Muscle.deltoideLateral, [Muscle.trapezio], Equipment.polia, 'upright_row', 2.5, [
    'Barra na polia baixa, pegada mais larga que os ombros.',
    'Puxe levando os cotovelos para os lados até a linha dos ombros.',
    'Desça controlando.',
  ], 'Pare na linha dos ombros. Evite se houver dor no ombro.'),

  // BÍCEPS
  _ex('rosca_scott_maquina', 'Rosca Scott na Máquina', Muscle.biceps,
      [Muscle.antebraco], Equipment.maquina, 'curl_preacher', 5, [
    'Axilas encaixadas no apoio, braços estendidos.',
    'Flexione os cotovelos até a contração total.',
    'Desça devagar até quase estender os braços.',
  ], 'Não tire os cotovelos do apoio.'),
  _ex('rosca_scott_barra', 'Rosca Scott com Barra W', Muscle.biceps,
      [Muscle.antebraco], Equipment.barra, 'curl_preacher', 2, [
    'Axilas no apoio, pegada na parte interna da barra W.',
    'Suba até a contração sem tirar os cotovelos do banco.',
    'Desça controlando até quase estender.',
  ], 'A parte de baixo é a mais importante. Desça devagar.'),
  _ex('rosca_bayesiana', 'Rosca Bayesiana (cabo atrás do corpo)', Muscle.biceps,
      [Muscle.antebraco], Equipment.polia, 'curl_long', 2.5, [
    'De costas para a polia baixa, braço estendido para trás.',
    'Flexione o cotovelo mantendo o braço atrás do tronco.',
    'Volte até alongar bem o bíceps.',
  ], 'Treina o bíceps em posição alongada.',
      unilateral: true),
  _ex('rosca_polia_barra', 'Rosca na Polia (barra)', Muscle.biceps, [Muscle.antebraco],
      Equipment.polia, 'curl', 2.5, [
    'Polia baixa com barra, cotovelos ao lado do corpo.',
    'Flexione os cotovelos até a contração.',
    'Desça controlando até estender.',
  ], 'Cotovelos parados, sem balançar o tronco.'),
  _ex('rosca_inclinada_halteres', 'Rosca Inclinada com Halteres', Muscle.biceps,
      [Muscle.antebraco], Equipment.halteres, 'curl_long', 2, [
    'Banco a 45 graus, braços pendurados atrás do tronco.',
    'Flexione os cotovelos sem trazê-los à frente.',
    'Desça até alongar o bíceps.',
  ], 'Alternativa com halteres à rosca bayesiana.'),
  _ex('rosca_direta_barra', 'Rosca Direta com Barra W', Muscle.biceps,
      [Muscle.antebraco], Equipment.barra, 'curl', 2, [
    'Em pé, pegada na largura dos ombros.',
    'Flexione os cotovelos mantendo-os ao lado do corpo.',
    'Desça até estender os braços.',
  ], 'Sem impulso com o quadril.'),
  _ex('rosca_maquina', 'Rosca Bíceps na Máquina', Muscle.biceps, [Muscle.antebraco],
      Equipment.maquina, 'curl', 5, [
    'Cotovelos alinhados com o eixo da máquina.',
    'Flexione até a contração total.',
    'Volte devagar até quase estender.',
  ], 'Ajuste o banco antes da primeira série.'),
  _ex('rosca_martelo_corda', 'Rosca Martelo na Polia (corda)', Muscle.biceps,
      [Muscle.antebraco], Equipment.polia, 'hammer', 2.5, [
    'Polia baixa com corda, pegada neutra.',
    'Flexione os cotovelos mantendo-os ao lado do corpo.',
    'Desça controlando até estender.',
  ], 'Trabalha braquial e antebraço, dando espessura ao braço.'),
  _ex('rosca_martelo_halteres', 'Rosca Martelo com Halteres', Muscle.biceps,
      [Muscle.antebraco], Equipment.halteres, 'hammer', 2, [
    'Em pé, halteres com pegada neutra.',
    'Flexione os cotovelos sem girar os punhos.',
    'Desça devagar.',
  ], 'Alterne os braços ou faça juntos, sem balanço.'),

  // TRÍCEPS
  _ex('triceps_frances_polia', 'Tríceps Francês na Polia (corda)', Muscle.triceps,
      const [], Equipment.polia, 'triceps_overhead', 2.5, [
    'De costas para a polia, corda atrás da cabeça, tronco inclinado à frente.',
    'Estenda os cotovelos para frente e para cima.',
    'Volte até alongar bem o tríceps atrás da cabeça.',
  ], 'Acima da cabeça o tríceps alonga mais, especialmente a cabeça longa.'),
  _ex('triceps_frances_halter', 'Tríceps Francês com Halter (duas mãos)',
      Muscle.triceps, const [], Equipment.halteres, 'triceps_overhead', 2, [
    'Sentado com encosto, halter seguro com as duas mãos acima da cabeça.',
    'Desça o halter atrás da cabeça flexionando os cotovelos.',
    'Estenda os braços sem abrir demais os cotovelos.',
  ], 'Encosto alto ajuda a proteger a lombar.'),
  _ex('triceps_polia_barra', 'Tríceps na Polia (barra reta ou V)', Muscle.triceps,
      const [], Equipment.polia, 'triceps_pushdown', 2.5, [
    'Polia alta, cotovelos colados ao corpo.',
    'Estenda os cotovelos até travar o tríceps.',
    'Suba controlando até os antebraços passarem da horizontal.',
  ], 'Só o antebraço se move.'),
  _ex('triceps_corda', 'Tríceps na Polia com Corda', Muscle.triceps, const [],
      Equipment.polia, 'triceps_pushdown', 2.5, [
    'Polia alta com corda, cotovelos ao lado do corpo.',
    'Estenda e abra a corda no final.',
    'Volte devagar.',
  ], 'Abrir a corda no final aumenta a contração.'),
  _ex('triceps_extensao_maquina', 'Tríceps Extensão na Máquina', Muscle.triceps,
      const [], Equipment.maquina, 'triceps_extension', 5, [
    'Cotovelos apoiados e alinhados com o eixo da máquina.',
    'Estenda os braços até a contração total.',
    'Volte devagar até o tríceps alongar.',
  ], 'Ajuste o banco para os cotovelos ficarem na linha do eixo.'),
  _ex('triceps_testa_polia', 'Tríceps Testa na Polia', Muscle.triceps, const [],
      Equipment.polia, 'triceps_extension', 2.5, [
    'Deitado no banco, de cabeça para a polia baixa, barra acima do rosto.',
    'Flexione os cotovelos levando a barra para trás da cabeça.',
    'Estenda os braços mantendo os cotovelos apontados para cima.',
  ], 'A polia é mais confortável para o cotovelo que a barra livre.'),
  _ex('triceps_testa_barra', 'Tríceps Testa na Barra W', Muscle.triceps, const [],
      Equipment.barra, 'triceps_extension', 2, [
    'Deitado, barra acima do peito com braços estendidos.',
    'Flexione os cotovelos levando a barra até a testa ou atrás da cabeça.',
    'Estenda de volta sem abrir os cotovelos.',
  ], 'Se o cotovelo incomodar, troque pela versão na polia.'),
  _ex('triceps_mergulho_maquina', 'Mergulho na Máquina (Tríceps)', Muscle.triceps,
      [Muscle.peito, Muscle.deltoideAnterior], Equipment.maquina, 'triceps_press', 5, [
    'Sentado, pegadores ao lado do corpo.',
    'Empurre para baixo até estender os braços.',
    'Suba controlando até os cotovelos passarem de 90 graus.',
  ], 'Tronco ereto foca o tríceps.'),

  // ANTEBRAÇO
  _ex('rosca_punho', 'Rosca de Punho na Barra', Muscle.antebraco, const [],
      Equipment.barra, 'wrist', 2, [
    'Antebraços apoiados no banco, punhos para fora.',
    'Deixe a barra rolar até os dedos e flexione os punhos.',
    'Desça controlando.',
  ], 'Amplitude completa, sem pressa.'),

  // QUADRÍCEPS
  _ex('hack_squat', 'Agachamento no Hack', Muscle.quadriceps,
      [Muscle.gluteos, Muscle.adutores], Equipment.maquina, 'squat', 5, [
    'Costas apoiadas, pés na largura dos ombros, no meio da plataforma.',
    'Desça até as coxas passarem da paralela, sem tirar a lombar do apoio.',
    'Suba empurrando a plataforma com o pé inteiro.',
  ], 'Pés mais baixos aumentam o foco no quadríceps.'),
  _ex('leg_press', 'Leg Press 45°', Muscle.quadriceps, [Muscle.gluteos, Muscle.adutores],
      Equipment.maquina, 'leg_press', 10, [
    'Pés na largura do quadril, no meio ou um pouco abaixo da plataforma.',
    'Desça até o limite em que o quadril não sai do banco.',
    'Empurre sem travar os joelhos.',
  ], 'Se o quadril descola do banco, a amplitude passou do ponto.'),
  _ex('agachamento_smith', 'Agachamento no Smith', Muscle.quadriceps,
      [Muscle.gluteos, Muscle.adutores], Equipment.smith, 'squat', 2, [
    'Barra nos trapézios, pés levemente à frente do corpo.',
    'Desça até as coxas passarem da paralela.',
    'Suba mantendo o tronco firme.',
  ], 'Pés à frente deixam o tronco mais vertical.'),
  _ex('agachamento_livre', 'Agachamento Livre com Barra', Muscle.quadriceps,
      [Muscle.gluteos, Muscle.adutores, Muscle.lombar], Equipment.barra, 'squat', 2, [
    'Barra nos trapézios, pés na largura dos ombros.',
    'Desça com o tronco firme até a maior profundidade com boa técnica.',
    'Suba empurrando o chão.',
  ], 'Exige mais técnica e estabilidade que o hack.'),
  _ex('agachamento_pendulo', 'Agachamento Pêndulo (Máquina)', Muscle.quadriceps,
      [Muscle.gluteos], Equipment.maquina, 'squat', 5, [
    'Costas apoiadas, pés no meio da plataforma.',
    'Desça até a máxima profundidade confortável.',
    'Suba controlando sem travar os joelhos.',
  ], 'Ótima alternativa ao hack, com grande amplitude.'),
  _ex('cadeira_extensora', 'Cadeira Extensora', Muscle.quadriceps, const [],
      Equipment.maquina, 'knee_extension', 5, [
    'Encosto ajustado para o joelho alinhar com o eixo da máquina.',
    'Estenda os joelhos até contrair o quadríceps.',
    'Desça devagar até perto de 90 graus.',
  ], 'Encosto mais inclinado para trás alonga mais o reto femoral.'),
  _ex('bulgaro_smith', 'Agachamento Búlgaro no Smith', Muscle.quadriceps,
      [Muscle.gluteos], Equipment.smith, 'lunge', 2, [
    'Pé de trás apoiado no banco, pé da frente bem à frente.',
    'Desça até a coxa da frente ficar paralela ao chão.',
    'Suba empurrando com o pé da frente.',
  ], 'Tronco mais inclinado puxa para glúteo; mais vertical, para quadríceps.',
      unilateral: true),
  _ex('bulgaro_halteres', 'Agachamento Búlgaro com Halteres', Muscle.quadriceps,
      [Muscle.gluteos], Equipment.halteres, 'lunge', 2, [
    'Halteres ao lado do corpo, pé de trás no banco.',
    'Desça até a coxa da frente ficar paralela.',
    'Suba com o peso no pé da frente.',
  ], 'Comece pela perna mais fraca.',
      unilateral: true),

  // POSTERIORES
  _ex('flexora_sentada', 'Cadeira Flexora (sentada)', Muscle.posteriores, const [],
      Equipment.maquina, 'leg_curl', 5, [
    'Joelho alinhado com o eixo, coxas presas pelo apoio.',
    'Flexione os joelhos até o máximo.',
    'Volte devagar até estender as pernas.',
  ], 'Sentado, o posterior trabalha mais alongado que na mesa.'),
  _ex('flexora_deitada', 'Mesa Flexora (deitada)', Muscle.posteriores, const [],
      Equipment.maquina, 'leg_curl', 5, [
    'Deitado, joelhos logo fora do banco, quadril apoiado.',
    'Flexione os joelhos sem tirar o quadril do banco.',
    'Desça controlando até quase estender.',
  ], 'Não deixe o quadril subir para ajudar.'),
  _ex('flexora_unilateral_pe', 'Flexora Unilateral em Pé', Muscle.posteriores,
      const [], Equipment.maquina, 'leg_curl', 2.5, [
    'Em pé, apoio logo acima do calcanhar.',
    'Flexione o joelho sem mexer o quadril.',
    'Volte devagar.',
  ], 'Mantenha o tronco parado.',
      unilateral: true),
  _ex('stiff_halteres', 'Stiff com Halteres', Muscle.posteriores,
      [Muscle.gluteos, Muscle.lombar], Equipment.halteres, 'hinge', 2, [
    'Em pé, halteres à frente das coxas, joelhos levemente flexionados.',
    'Leve o quadril para trás descendo os halteres rente às pernas.',
    'Desça até sentir o posterior alongar e volte contraindo os glúteos.',
  ], 'Coluna neutra o tempo todo. A amplitude termina onde a lombar começa a arredondar.'),
  _ex('stiff_barra', 'Stiff com Barra (Romeno)', Muscle.posteriores,
      [Muscle.gluteos, Muscle.lombar], Equipment.barra, 'hinge', 2, [
    'Barra à frente das coxas, pegada na largura dos ombros.',
    'Quadril para trás, barra descendo rente às pernas.',
    'Volte estendendo o quadril.',
  ], 'Use straps se a pegada limitar a série.'),

  // GLÚTEOS
  _ex('hip_thrust_maquina', 'Elevação Pélvica na Máquina', Muscle.gluteos,
      [Muscle.posteriores], Equipment.maquina, 'hip_thrust', 5, [
    'Costas no apoio, pés na largura do quadril.',
    'Eleve o quadril até alinhar tronco e coxas.',
    'Desça controlando.',
  ], 'Queixo levemente para baixo e costelas fechadas no topo.'),
  _ex('hip_thrust_barra', 'Elevação Pélvica com Barra', Muscle.gluteos,
      [Muscle.posteriores], Equipment.barra, 'hip_thrust', 2, [
    'Costas no banco, barra com proteção sobre o quadril.',
    'Eleve o quadril até o alinhamento com o tronco.',
    'Desça até quase tocar o chão.',
  ], 'Segure 1 segundo no topo.'),
  _ex('gluteo_maquina', 'Glúteo na Máquina (coice)', Muscle.gluteos,
      [Muscle.posteriores], Equipment.maquina, 'hip_extension', 5, [
    'Apoie o tronco e posicione o pé na plataforma.',
    'Empurre a perna para trás estendendo o quadril.',
    'Volte devagar.',
  ], 'Sem arquear a lombar.',
      unilateral: true),
  _ex('cadeira_abdutora', 'Cadeira Abdutora', Muscle.gluteos, const [],
      Equipment.maquina, 'abduction', 5, [
    'Sentado, tronco levemente inclinado à frente.',
    'Abra as pernas contra a resistência.',
    'Volte controlando.',
  ], 'Trabalha o glúteo médio.'),
  _ex('hiperextensao_45', 'Hiperextensão 45° (foco em glúteo)', Muscle.gluteos,
      [Muscle.posteriores, Muscle.lombar], Equipment.pesoCorporal, 'hip_extension', 2.5, [
    'Apoio logo abaixo do quadril, pés levemente abertos.',
    'Desça levando o quadril para trás com a coluna neutra.',
    'Suba contraindo os glúteos até alinhar o corpo.',
  ], 'Registre a anilha segurada como carga.',
      loadType: LoadType.bodyweight),
  _ex('cadeira_adutora', 'Cadeira Adutora', Muscle.adutores, const [],
      Equipment.maquina, 'adduction', 5, [
    'Sentado com as pernas abertas na máquina.',
    'Feche as pernas contra a resistência.',
    'Volte devagar até alongar.',
  ], 'Controle a abertura.'),

  // PANTURRILHA
  _ex('panturrilha_pe_maquina', 'Panturrilha em Pé na Máquina', Muscle.panturrilha,
      const [], Equipment.maquina, 'calf_standing', 5, [
    'Ponta dos pés na plataforma, joelhos estendidos.',
    'Desça o calcanhar até o máximo alongamento e pause 1 a 2 segundos.',
    'Suba até a ponta dos pés.',
  ], 'A pausa embaixo é o que mais importa.'),
  _ex('panturrilha_leg_press', 'Panturrilha no Leg Press', Muscle.panturrilha,
      const [], Equipment.maquina, 'calf_standing', 10, [
    'Ponta dos pés na borda da plataforma, joelhos estendidos.',
    'Deixe a plataforma descer até alongar e pause.',
    'Empurre com a ponta dos pés.',
  ], 'Não flexione os joelhos para ajudar.'),
  _ex('panturrilha_sentada', 'Panturrilha Sentada', Muscle.panturrilha, const [],
      Equipment.maquina, 'calf_seated', 5, [
    'Joelhos sob o apoio, ponta dos pés na plataforma.',
    'Desça até o máximo alongamento e pause.',
    'Suba até a contração total.',
  ], 'Joelho flexionado trabalha mais o sóleo.'),
  _ex('panturrilha_smith', 'Panturrilha em Pé no Smith', Muscle.panturrilha,
      const [], Equipment.smith, 'calf_standing', 2, [
    'Barra nos trapézios, ponta dos pés sobre uma anilha ou step.',
    'Desça até alongar e pause.',
    'Suba até a ponta dos pés.',
  ], 'Mantenha os joelhos estendidos.'),

  // ABDÔMEN
  _ex('abdominal_polia', 'Abdominal na Polia (ajoelhado)', Muscle.abdomen, const [],
      Equipment.polia, 'abs_flexion', 2.5, [
    'Ajoelhado, corda ao lado da cabeça.',
    'Enrole o tronco levando as costelas em direção ao quadril.',
    'Volte devagar alongando o abdômen.',
  ], 'O quadril fica parado; quem se move é a coluna.'),
  _ex('abdominal_maquina', 'Abdominal na Máquina', Muscle.abdomen, const [],
      Equipment.maquina, 'abs_flexion', 5, [
    'Sentado, pés presos, pegadores na altura do peito.',
    'Flexione o tronco contraindo o abdômen.',
    'Volte controlando.',
  ], 'Expire na contração.'),
  _ex('elevacao_pernas_paralela', 'Elevação de Pernas na Paralela', Muscle.abdomen,
      const [], Equipment.pesoCorporal, 'abs_hip_flexion', 2.5, [
    'Antebraços apoiados, costas no encosto.',
    'Eleve os joelhos e enrole o quadril em direção ao peito.',
    'Desça devagar sem balançar.',
  ], 'Enrolar o quadril é o que ativa o abdômen.',
      loadType: LoadType.bodyweight),
  _ex('elevacao_pernas_barra', 'Elevação de Pernas na Barra', Muscle.abdomen, const [],
      Equipment.pesoCorporal, 'abs_hip_flexion', 2.5, [
    'Pendurado na barra, ombros ativos.',
    'Eleve os joelhos enrolando o quadril.',
    'Desça controlando.',
  ], 'Evite balançar o corpo.',
      loadType: LoadType.bodyweight),
];
