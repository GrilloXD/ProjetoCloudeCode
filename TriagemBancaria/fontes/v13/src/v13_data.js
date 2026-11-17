/* ═══════════════════════════════════════════════════════════════════════
   v13 — DADOS DE REFERÊNCIA
   Tetos históricos do consignado INSS, prioridades e vulnerabilidades,
   modelos de solicitação por modalidade e sinais de urgência.
   ═══════════════════════════════════════════════════════════════════════ */
var V13_VERSAO = 'v13.0';
var V13_DATA = '16/11/2026';

/* ── TETOS DE JUROS DO CONSIGNADO INSS (histórico) ───────────────────────
   Empréstimo consignado e cartão (RMC e, desde 2022, RCC), em % ao mês.
   Fontes: IN INSS/PRES 28/2008 consolidada (gov.br/inss), arts. 13, II, e 16, III,
   para 2008 a 2020 (conferidas no texto oficial); INs e Resoluções CNPS
   posteriores conforme tabela pública de vigências (conferir no DOU em caso
   de dúvida). "ini" = primeiro dia de vigência. */
var TETOS_INSS = [
  { ini: '2008-05-19', emp: 2.50, cartao: 3.50, norma: 'IN INSS/PRES 28, de 16/05/2008', oficial: true },
  { ini: '2015-08-17', emp: 2.14, cartao: 3.06, norma: 'IN INSS/PRES 80, de 14/08/2015', oficial: true },
  { ini: '2017-12-29', emp: 2.08, cartao: 3.00, norma: 'IN INSS/PRES 92, de 28/12/2017', oficial: true },
  { ini: '2020-03-19', emp: 1.80, cartao: 2.70, norma: 'IN INSS/PRES 106, de 18/03/2020', oficial: true },
  { ini: '2021-12-10', emp: 2.14, cartao: 3.06, norma: 'IN PRES/INSS 125, de 09/12/2021' },
  { ini: '2023-03-15', emp: 1.70, cartao: 2.62, norma: 'Resolução CNPS 1.350, de 13/03/2023' },
  { ini: '2023-03-30', emp: 1.97, cartao: 2.89, norma: 'Resolução CNPS 1.351, de 28/03/2023' },
  { ini: '2023-08-21', emp: 1.91, cartao: 2.83, norma: 'Resolução CNPS 1.356, de 17/08/2023' },
  { ini: '2023-10-23', emp: 1.84, cartao: 2.73, norma: 'Resolução CNPS 1.359, de 11/10/2023' },
  { ini: '2023-12-13', emp: 1.80, cartao: 2.67, norma: 'Resolução CNPS 1.360, de 04/12/2023' },
  { ini: '2024-01-24', emp: 1.76, cartao: 2.61, norma: 'Resolução CNPS 1.361, de 11/01/2024' },
  { ini: '2024-03-11', emp: 1.72, cartao: 2.55, norma: 'Resolução CNPS 1.362, de 28/02/2024' },
  { ini: '2024-05-08', emp: 1.68, cartao: 2.49, norma: 'Resolução CNPS 1.363, de 24/04/2024' },
  { ini: '2024-06-05', emp: 1.66, cartao: 2.46, norma: 'Resolução CNPS 1.365, de 28/05/2024' },
  { ini: '2025-01-17', emp: 1.80, cartao: 2.46, norma: 'Resolução CNPS 1.367, de 09/01/2025' },
  { ini: '2025-04-04', emp: 1.85, cartao: 2.46, norma: 'Resolução CNPS 1.368, de 26/03/2025' }
];
var TETOS_INSS_CONFERIDO_EM = '16/11/2026';
/* Teto do cheque especial: 8% a.m. desde 06/01/2020 (Resolução CMN 4.765, de 27/11/2019). */
var TETO_CHEQUE_INI = '2020-01-06';

/* Retorna os tetos aplicáveis a um mês (AAAA-MM) e, se informado, a um dia.
   Sem o dia, quando o teto mudou dentro do mês, devolve todas as faixas do mês. */
function tetosInssNoPeriodo(mesAno, dia) {
  if (!mesAno || !/^\d{4}-\d{2}$/.test(mesAno)) return [];
  var ini = mesAno + '-01', p = mesAno.split('-');
  var ult = new Date(parseInt(p[0], 10), parseInt(p[1], 10), 0).getDate();
  var fim = mesAno + '-' + String(ult).padStart(2, '0');
  if (dia) { var d = mesAno + '-' + String(dia).padStart(2, '0'); ini = d; fim = d; }
  var out = [];
  for (var i = 0; i < TETOS_INSS.length; i++) {
    var a = TETOS_INSS[i].ini, b = (i + 1 < TETOS_INSS.length) ? TETOS_INSS[i + 1].ini : '9999-12-31';
    if (a <= fim && b > ini) out.push(TETOS_INSS[i]);
  }
  return out;
}
function dataBR(iso) { var p = String(iso).split('-'); return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : iso; }

/* ── PRIORIDADES E VULNERABILIDADES ──────────────────────────────────────
   classe: 'prioridade' (prioridade prevista em lei) · 'vulnerabilidade'
   (condição que agrava a vulnerabilidade do consumidor) · 'atencao'
   (circunstância que merece atenção, sem prioridade legal automática).
   of = trecho para ofício a instituição financeira; inss = trecho para o INSS
   (Administração Pública); fund = fundamentos; conferir = o que a triagem deve checar. */
var VULN = [
  { id: 'idoso', rot: 'Pessoa idosa (60 anos ou mais)', classe: 'prioridade',
    of: 'pessoa idosa, com prioridade legal de atendimento e de tramitação, inclusive perante instituições financeiras (arts. 3º, § 1º, I, e 71, § 3º, da Lei nº 10.741/2003)',
    inss: 'pessoa idosa, com prioridade na tramitação de procedimentos administrativos (art. 71, § 3º, da Lei nº 10.741/2003 e art. 69-A, I, da Lei nº 9.784/1999)',
    fund: [['Lei 10.741/2003 (Estatuto da Pessoa Idosa) — arts. 3º, § 1º, I, e 71, caput e § 3º', 'Atendimento preferencial e prioridade na tramitação de processos e procedimentos, extensiva às instituições financeiras e à Administração Pública.'],
           ['CDC — arts. 39, IV, e 54-C, IV', 'Veda prevalecer-se da idade do consumidor e assediá-lo ou pressioná-lo a contratar crédito.']],
    conferir: 'Peça prioridade no ofício. Verifique se houve assédio na oferta (ligações insistentes, correspondente em casa, contratação por telefone) e se a pessoa entendeu o que assinou.' },
  { id: 'idoso80', rot: 'Pessoa com 80 anos ou mais', classe: 'prioridade',
    of: 'pessoa com mais de 80 anos, com prioridade especial (art. 71, § 5º, da Lei nº 10.741/2003)',
    inss: 'pessoa com mais de 80 anos, com prioridade especial (art. 71, § 5º, da Lei nº 10.741/2003)',
    fund: [['Lei 10.741/2003 — arts. 3º, § 2º, e 71, § 5º', 'Entre as pessoas idosas, é assegurada prioridade especial às maiores de 80 anos.']],
    conferir: 'Registre a idade exata. A prioridade especial prevalece sobre a das demais pessoas idosas.' },
  { id: 'pcd', rot: 'Pessoa com deficiência (PcD)', classe: 'prioridade',
    of: 'pessoa com deficiência, com direito a atendimento prioritário e a informações em formato acessível (art. 9º, II, V e VII, da Lei nº 13.146/2015 e art. 6º, parágrafo único, do CDC)',
    inss: 'pessoa com deficiência, com prioridade na tramitação de procedimentos administrativos (art. 9º, VII, da Lei nº 13.146/2015 e art. 69-A, II, da Lei nº 9.784/1999)',
    fund: [['Lei 13.146/2015 (Lei Brasileira de Inclusão) — art. 9º, II, V e VII', 'Atendimento prioritário em instituições de atendimento ao público, acesso a informações acessíveis e prioridade em procedimentos judiciais e administrativos.'],
           ['CDC — art. 6º, parágrafo único', 'A informação ao consumidor deve ser acessível à pessoa com deficiência.']],
    conferir: 'Verifique se a contratação respeitou a acessibilidade (leitura do contrato, intérprete, formato acessível) e se há curatela ou tomada de decisão apoiada.' },
  { id: 'doenca', rot: 'Pessoa com doença grave', classe: 'atencao',
    of: 'pessoa acometida de doença grave, circunstância que recomenda celeridade na resposta',
    inss: 'pessoa com doença grave, com prioridade na tramitação de procedimentos administrativos (art. 69-A, IV, da Lei nº 9.784/1999)',
    fund: [['Lei 9.784/1999 — art. 69-A, IV', 'Prioridade em procedimentos administrativos federais (aplica-se ao INSS) para pessoa com doença grave.'],
           ['CPC — art. 1.048, I', 'Prioridade de tramitação em processos judiciais. Perante instituição financeira privada não há prioridade legal automática: a doença é circunstância a ser ponderada.'],
           ['CDC — art. 54-C, IV', 'Veda assediar ou pressionar consumidor doente a contratar crédito.']],
    conferir: 'Peça documento médico se a prioridade for requerida em juízo ou perante o INSS. Em face de banco, trate como circunstância de atenção, não como prioridade legal.' },
  { id: 'socio', rot: 'Vulnerabilidade socioeconômica', classe: 'vulnerabilidade',
    of: 'pessoa em situação de vulnerabilidade socioeconômica, assistida pela Defensoria Pública (art. 134 da Constituição Federal e art. 4º, I, do CDC)',
    inss: 'pessoa em situação de vulnerabilidade socioeconômica, assistida pela Defensoria Pública (art. 134 da Constituição Federal)',
    fund: [['CF — art. 134; LC 80/1994 — art. 4º, XI', 'Atuação da Defensoria em favor de necessitados e de grupos sociais vulneráveis.'],
           ['CDC — arts. 4º, I, e 39, IV', 'Reconhecimento da vulnerabilidade do consumidor e vedação de prevalecer-se de sua condição social.']],
    conferir: 'Registre renda, composição familiar e dependência do valor discutido para a subsistência.' },
  { id: 'analf', rot: 'Pessoa não alfabetizada ou com dificuldade de compreensão', classe: 'vulnerabilidade',
    of: 'pessoa não alfabetizada ou com dificuldade de compreensão, o que torna relevante a prova de que recebeu informação prévia, clara e adequada e de que consentiu validamente (arts. 6º, III, 46, 54-C, IV, e 54-D, I, do CDC e art. 595 do Código Civil)',
    inss: 'pessoa não alfabetizada ou com dificuldade de compreensão, o que recomenda comunicação clara e acessível',
    fund: [['CDC — arts. 6º, III, 46 e 54-D, I', 'Dever de informar e esclarecer adequadamente, considerada a idade e a condição do consumidor; o contrato não obriga se não houve conhecimento prévio do conteúdo.'],
           ['CC — art. 595', 'Assinatura a rogo com duas testemunhas quando a parte não sabe ler ou escrever (formalidade que a jurisprudência tem exigido em contratos bancários).']],
    conferir: 'Confira se o contrato foi assinado a rogo com duas testemunhas ou por instrumento público, e se houve leitura e explicação. Peça no ofício a via integral com as assinaturas.' },
  { id: 'digital', rot: 'Baixa inclusão digital', classe: 'atencao',
    of: 'pessoa com baixa familiaridade com meios digitais, o que torna relevante a prova da autoria e da autenticidade de eventual contratação eletrônica (STJ, Tema 1.061)',
    inss: 'pessoa com baixa familiaridade com meios digitais, o que recomenda atendimento por canal acessível',
    fund: [['STJ — Tema 1.061 (REsp 1.846.649/MA)', 'Impugnada a autenticidade da assinatura em contrato bancário, cabe à instituição financeira prová-la.'],
           ['CDC — arts. 6º, III, e 14', 'Informação adequada e responsabilidade por falha na segurança do serviço.']],
    conferir: 'Peça a trilha da contratação digital: selfie ou biometria, geolocalização, IP, dispositivo, data e hora, e o comprovante do crédito na conta.' },
  { id: 'super', rot: 'Pessoa superendividada', classe: 'vulnerabilidade',
    of: 'consumidor(a) em situação de superendividamento, a quem a lei assegura a prevenção, o tratamento e a preservação do mínimo existencial (arts. 6º, XI e XII, e 54-A a 54-G do CDC)',
    inss: 'pessoa em situação de superendividamento, com comprometimento da renda de natureza alimentar',
    fund: [['CDC — arts. 6º, XI e XII, 54-A a 54-G e 104-A a 104-C (Lei 14.181/2021)', 'Crédito responsável, preservação do mínimo existencial e processo de repactuação de dívidas.'],
           ['Decreto 11.150/2022 (com o Decreto 11.567/2023)', 'Regulamenta o mínimo existencial. Em 2026 o STF (ADPFs 1.005, 1.006 e 1.097) manteve o parâmetro, determinou revisão periódica do valor e a inclusão das parcelas de consignado no cálculo.']],
    conferir: 'Levante todas as dívidas, credores e a renda líquida. Dívidas com garantia real, financiamento imobiliário e crédito rural ficam fora da repactuação (CDC, art. 104-A, § 1º).' },
  { id: 'renda', rot: 'Comprometimento significativo da renda', classe: 'atencao',
    of: 'pessoa com parcela significativa da renda comprometida com dívidas, sendo os valores em discussão necessários à sua subsistência (art. 6º, XII, do CDC)',
    inss: 'pessoa com parcela significativa do benefício comprometida com descontos, verba de natureza alimentar',
    fund: [['CDC — art. 6º, XII', 'Preservação do mínimo existencial na concessão de crédito e na repactuação de dívidas.'],
           ['Lei 10.820/2003 — art. 6º, §§ 5º, 5º-A e 6º', 'Limites da margem consignável em benefício: 45% (35% empréstimos, 5% cartão de crédito consignado e 5% cartão consignado de benefício); 35% para o BPC. A instituição que retém acima do limite perde as garantias da lei.']],
    conferir: 'Some os descontos em folha ou benefício e compare com os limites da margem. Descontos autorizados em conta-corrente não seguem esse limite por analogia (STJ, Tema 1.085), mas o mínimo existencial deve ser preservado.' },
  { id: 'risco', rot: 'Situação de risco social', classe: 'vulnerabilidade',
    of: 'pessoa em situação de risco social, circunstância que recomenda atenção e celeridade',
    inss: 'pessoa em situação de risco social, circunstância que recomenda atenção e celeridade',
    fund: [['LC 80/1994 — art. 4º, XI', 'Defesa de grupos sociais vulneráveis que mereçam proteção especial do Estado.']],
    conferir: 'Avalie encaminhamento à rede socioassistencial (CRAS, CREAS) e comunique o(a) defensor(a) sobre a situação.' }
];
var VULN_CLASSES = { prioridade: 'Prioridade legal', vulnerabilidade: 'Condição de vulnerabilidade', atencao: 'Circunstância de atenção' };
function vulnPorId(id) { for (var i = 0; i < VULN.length; i++) if (VULN[i].id === id) return VULN[i]; return null; }
/* Parágrafo de prioridade/vulnerabilidade para os documentos. destino: 'banco' | 'inss'. */
function vulnParagrafo(ids, outra, destino) {
  var itens = [], temPrior = false;
  (ids || []).forEach(function (id) {
    if (id === 'idoso' && ids.indexOf('idoso80') !== -1) return; /* a prioridade especial absorve a geral */
    var v = vulnPorId(id); if (!v) return;
    if (v.classe === 'prioridade') temPrior = true;
    itens.push(destino === 'inss' ? v.inss : v.of);
  });
  if (ids && ids.indexOf('idoso80') !== -1 && destino !== 'inss') {
    itens = itens.map(function (t) { return t.indexOf('mais de 80 anos') !== -1 ? 'pessoa idosa com mais de 80 anos, com prioridade especial de atendimento e de tramitação, inclusive perante instituições financeiras (arts. 3º, § 1º, I, e 71, §§ 3º e 5º, da Lei nº 10.741/2003)' : t; });
  }
  if (outra && outra.trim()) itens.push(outra.trim().replace(/\.+$/, ''));
  if (!itens.length) return '';
  var txt = 'Registra-se que o(a) assistido(a) é ' + (itens.length === 1 ? itens[0] : itens.slice(0, -1).join('; ') + '; e ' + itens[itens.length - 1]) + '. ';
  txt += temPrior ? 'Solicita-se, por isso, tratamento prioritário a este expediente.' : 'Solicita-se que tais circunstâncias sejam consideradas na análise e na resposta.';
  return txt;
}

/* ── SINAIS DE URGÊNCIA (pergunta comum a todas as triagens) ─────────────── */
var ALERTAS = [
  { id: 'mandado', icon: '⚖️', t: 'Mandado, citação ou intimação judicial', d: 'Oficial de justiça esteve no local ou chegou carta do fórum',
    o: 'Há prazo processual em curso. Anote a data em que o documento foi recebido e leve o caso ao(à) defensor(a) hoje. Contestação em ação comum: 15 dias úteis (CPC, art. 335).' },
  { id: 'veiculo', icon: '🚗', t: 'Veículo apreendido ou busca e apreensão em andamento', d: 'O carro ou a moto foi levado, ou há ação de busca e apreensão',
    o: 'DL 911/69, art. 3º: em 5 dias contados da execução da liminar (apreensão) a propriedade se consolida em favor do credor; nesse prazo é possível pagar a integralidade da dívida. A resposta é em 15 dias da execução da liminar. O prazo de 5 dias é de direito material e corre em dias corridos (STJ, REsp 1.770.863/PR; Temas 722 e 1.279).' },
  { id: 'cartorio_veiculo', icon: '📮', t: 'Notificação de cartório sobre o veículo (prazo de 20 dias)', d: 'Cartório de títulos e documentos notificou para pagar ou entregar o bem',
    o: 'Procedimento extrajudicial do DL 911/69, art. 8º-B (Lei 14.711/2023): 20 dias para pagar ou apresentar documentos de que a cobrança é indevida, total ou parcialmente. Anote a data do recebimento e encaminhe ao(à) defensor(a) imediatamente.' },
  { id: 'cartorio_imovel', icon: '🏠', t: 'Intimação do Registro de Imóveis ou leilão marcado', d: 'Prazo de 15 dias para purgar a mora, consolidação ou data de leilão',
    o: 'Lei 9.514/97, art. 26, § 1º: 15 dias da intimação para purgar a mora. Em financiamento habitacional ainda é possível pagar as parcelas vencidas até a averbação da consolidação (art. 26-A, § 2º) e há direito de preferência até o segundo leilão (art. 27, § 2º-B).' },
  { id: 'pix', icon: '💸', t: 'PIX ou transferência por golpe nos últimos 80 dias', d: 'Dinheiro saiu da conta por fraude ou golpe recente',
    o: 'Acione o MED agora, pelo botão de contestação no aplicativo do banco do assistido (ou pela central). O pedido deve ser feito em até 80 dias da transação; quanto antes, maior a chance de bloqueio dos valores. Registre também boletim de ocorrência.' },
  { id: 'subsistencia', icon: '🍞', t: 'Descontos deixando a pessoa sem dinheiro para o básico', d: 'Benefício ou salário quase todo consumido por parcelas',
    o: 'Há risco à subsistência. Verifique os limites da margem consignável e leve ao(à) defensor(a) para avaliar tutela de urgência de suspensão ou limitação dos descontos.' },
  { id: 'negativacao', icon: '🔴', t: 'Negativação indevida impedindo algo urgente', d: 'Nome sujo por dívida não reconhecida, travando emprego, aluguel ou crédito essencial',
    o: 'Reúna a consulta do cadastro de inadimplentes e leve ao(à) defensor(a) para avaliar tutela de urgência de exclusão do apontamento.' }
];

/* ── MODELOS DE SOLICITAÇÃO POR MODALIDADE (ofício à instituição) ────────── */
var OF_MODALIDADES = [
  { id: 'consig_nao_reconhecido', rot: 'Desconto em benefício ou folha não reconhecido (consignado)',
    tema: 'Averiguação de descontos em benefício previdenciário',
    relato: 'O(a) assistido(a) procurou esta unidade relatando a existência de descontos em seu benefício previdenciário que afirma desconhecer e não ter contratado. Segundo o relato, não solicitou nem firmou contrato de empréstimo ou de cartão consignado junto a essa instituição, tampouco recebeu valores em sua conta ou cartões físicos ou digitais.',
    itens: ['cópia integral dos contratos, propostas e termos de adesão, inclusive refinanciamentos e portabilidades, com as assinaturas ou os registros de aceite', 'provas da contratação: gravação de voz, biometria ou selfie, geolocalização, endereço IP, dispositivo, data e hora', 'comprovante de liberação do crédito, com a conta de destino, a data e o valor', 'identificação do correspondente bancário que intermediou a operação', 'histórico dos descontos realizados, saldo devedor e número de parcelas pagas e a vencer', 'taxa de juros, Custo Efetivo Total (CET) e planilha de evolução da dívida', 'informação sobre emissão, envio, desbloqueio e uso de cartão, se houver'] },
  { id: 'consig_revisao', rot: 'Consignado reconhecido: conferência de juros, CET e valores',
    tema: 'Conferência das condições de contrato de empréstimo consignado',
    relato: 'O(a) assistido(a) reconhece a contratação de empréstimo consignado junto a essa instituição, mas relata dúvida quanto à regularidade da taxa de juros, do Custo Efetivo Total e dos valores descontados, o que torna necessária a conferência dos documentos do contrato.',
    itens: ['cópia integral do contrato e de eventuais aditivos, refinanciamentos e portabilidades', 'taxa de juros mensal e anual, Custo Efetivo Total (CET) e data da contratação', 'planilha de evolução da dívida, com discriminação mensal de capital, juros, tarifas e seguros', 'comprovante de liberação do crédito, com a conta de destino, a data e o valor', 'apólice ou termo de adesão a seguro prestamista e a outros serviços vinculados, com prova da contratação', 'histórico dos descontos realizados, saldo devedor e valor para liquidação antecipada'] },
  { id: 'cartao_rmc', rot: 'Cartão consignado (RMC ou RCC)',
    tema: 'Averiguação de cartão consignado (RMC/RCC) vinculado a benefício',
    relato: 'O(a) assistido(a) relata descontos em seu benefício a título de cartão consignado (reserva de margem), sem ter clareza de que contratou cartão em vez de empréstimo, e sem conseguir identificar o saldo devedor e a previsão de término dos descontos.',
    itens: ['cópia integral do termo de adesão ao cartão e do termo de consentimento esclarecido, com as assinaturas ou os registros de aceite', 'provas da contratação: gravação, biometria ou selfie, geolocalização, endereço IP e dispositivo', 'comprovante de eventual saque ou crédito, com a conta de destino, a data e o valor', 'todas as faturas emitidas desde a contratação', 'histórico dos descontos, taxa de juros aplicada e saldo devedor atualizado', 'comprovante de envio, recebimento e desbloqueio do cartão', 'valor para quitação e previsão de término dos descontos'] },
  { id: 'refin_port', rot: 'Refinanciamento ou portabilidade não autorizados',
    tema: 'Averiguação de refinanciamento e de portabilidade de crédito',
    relato: 'O(a) assistido(a) relata que contrato de crédito em seu nome foi refinanciado ou transferido a outra instituição sem a sua solicitação ou sem a compreensão das novas condições, com alteração do valor, do prazo ou da taxa de juros.',
    itens: ['cópia do contrato original e do contrato de refinanciamento ou de portabilidade', 'solicitação ou autorização do(a) consumidor(a) para a operação, com a prova do aceite', 'saldo devedor do contrato original na data da operação e valor do novo contrato', 'comprovante de liberação de eventual diferença (troco), com a conta de destino', 'taxa de juros e CET do contrato original e do novo contrato', 'identificação do correspondente bancário que intermediou a operação'] },
  { id: 'veiculo', rot: 'Financiamento de veículo',
    tema: 'Conferência de contrato de financiamento de veículo',
    relato: 'O(a) assistido(a) firmou contrato de financiamento de veículo com garantia de alienação fiduciária junto a essa instituição e busca conferir a regularidade dos encargos e a situação atual da dívida, para avaliar as medidas cabíveis.',
    itens: ['cópia integral da cédula de crédito ou do contrato, com o valor do bem, a entrada e o valor financiado', 'taxa de juros mensal e anual, Custo Efetivo Total (CET) e demonstrativo de sua composição', 'discriminação de tarifas (cadastro, avaliação do bem, registro) e de serviços de terceiros, com prova da prestação de cada serviço', 'apólices de seguro e contratos acessórios financiados, com prova da contratação e da opção de escolha da seguradora', 'planilha de evolução da dívida, parcelas pagas e em aberto e encargos de mora aplicados', 'saldo devedor atualizado e valor para liquidação antecipada, com a redução proporcional dos juros', 'cópia e comprovante de envio das notificações de constituição em mora'] },
  { id: 'nao_reconhecido', rot: 'Contrato, conta ou empréstimo não reconhecido (fraude)',
    tema: 'Averiguação de operação não reconhecida',
    relato: 'O(a) assistido(a) relata a existência de conta ou de operação de crédito em seu nome junto a essa instituição que afirma não ter contratado, o que indica possível fraude praticada por terceiros.',
    itens: ['cópia integral do contrato ou da proposta de abertura, com as assinaturas ou os registros de aceite', 'documentos pessoais apresentados e provas da identificação: biometria ou selfie, geolocalização, endereço IP, dispositivo, data e hora', 'comprovante de liberação do crédito, com a conta de destino', 'extrato de movimentação da conta ou do contrato desde a abertura', 'identificação do correspondente ou do canal que intermediou a operação', 'informação sobre negativação ou cessão do crédito a terceiros', 'protocolo e resultado de contestações já registradas'] },
  { id: 'fraude_pix', rot: 'Fraude via PIX, transferência ou invasão de conta',
    tema: 'Averiguação de transações contestadas por fraude',
    relato: 'O(a) assistido(a) relata ter sido vítima de fraude, com a realização de transações em sua conta que não reconhece ou às quais foi induzido(a) por terceiros, e busca a apuração dos fatos e a recuperação dos valores.',
    itens: ['extrato da conta no período, com a identificação das transações contestadas (data, hora, valor e destinatário)', 'registros de acesso: dispositivo, endereço IP, geolocalização e alterações cadastrais ou de limites no período', 'protocolo, data e resultado do acionamento do Mecanismo Especial de Devolução (MED)', 'informação sobre bloqueio cautelar e valores recuperados', 'perfil habitual de movimentação e limites vigentes na data dos fatos', 'cópia de contratos de crédito firmados no mesmo período, com as provas da contratação', 'resposta às contestações registradas no SAC e na Ouvidoria'] },
  { id: 'cartao_credito', rot: 'Cartão de crédito (cobranças, juros, não solicitado)',
    tema: 'Conferência de lançamentos e encargos de cartão de crédito',
    relato: 'O(a) assistido(a) relata cobranças em cartão de crédito emitido por essa instituição que não reconhece ou cujos encargos não compreende, e busca a conferência dos lançamentos e do saldo devedor.',
    itens: ['cópia do contrato ou do termo de adesão ao cartão e prova da solicitação', 'faturas dos últimos doze meses', 'demonstrativo do saldo devedor, com juros, encargos e tarifas aplicados mês a mês', 'comprovantes das compras e dos saques contestados', 'apólices de seguro e serviços cobrados na fatura, com prova da contratação', 'protocolo e resultado das contestações registradas'] },
  { id: 'negativacao', rot: 'Negativação, cobrança ou dívida de origem desconhecida',
    tema: 'Averiguação de dívida e de inscrição em cadastro de inadimplentes',
    relato: 'O(a) assistido(a) relata cobrança ou inscrição em cadastro de inadimplentes por dívida atribuída a essa instituição cuja origem desconhece ou contesta, e busca os documentos que a comprovem.',
    itens: ['cópia do contrato que deu origem à dívida, com as provas da contratação', 'demonstrativo do débito, com a data do vencimento original, os valores e os encargos', 'informação sobre cessão do crédito, com o instrumento e a notificação da cessão', 'comprovante da comunicação prévia da inscrição em cadastro de inadimplentes', 'histórico de pagamentos e de acordos relacionados à dívida', 'data de inclusão e situação atual do apontamento'] },
  { id: 'credito_pessoal', rot: 'Empréstimo pessoal, cheque especial ou renegociação',
    tema: 'Conferência das condições de operação de crédito',
    relato: 'O(a) assistido(a) mantém operação de crédito junto a essa instituição e busca conferir a taxa de juros, o Custo Efetivo Total, os encargos cobrados e a situação atual da dívida, para avaliar as medidas cabíveis.',
    itens: ['cópia integral do contrato e de eventuais renegociações ou aditivos', 'taxa de juros mensal e anual e Custo Efetivo Total (CET)', 'planilha de evolução da dívida, com discriminação mensal de capital, juros, tarifas, seguros e encargos de mora', 'autorização de débito em conta das parcelas, se houver', 'saldo devedor atualizado e valor para liquidação antecipada', 'apólices de seguro e serviços vinculados ao contrato, com prova da contratação'] },
  { id: 'conta_tarifas', rot: 'Conta, tarifas, seguros e serviços não contratados',
    tema: 'Conferência de tarifas, seguros e serviços cobrados',
    relato: 'O(a) assistido(a) relata débitos em sua conta ou em seu contrato a título de tarifas, seguros ou serviços que não reconhece ter contratado, e busca a identificação da origem das cobranças.',
    itens: ['cópia do contrato de abertura de conta e do termo de adesão ao pacote de serviços', 'extrato dos últimos doze meses, com a identificação de cada tarifa e débito automático', 'apólices de seguro, títulos de capitalização e demais produtos cobrados, com prova da contratação', 'autorização de débito automático correspondente a cada cobrança', 'informação sobre a oferta do pacote de serviços essenciais gratuitos', 'protocolo e resultado das contestações registradas'] },
  { id: 'superendividamento', rot: 'Superendividamento: posição consolidada das dívidas',
    tema: 'Posição consolidada de dívidas para tratamento de superendividamento',
    relato: 'O(a) assistido(a) encontra-se em situação de superendividamento e busca reunir as informações de todas as suas dívidas para a elaboração de proposta de plano de pagamento, nos termos dos arts. 104-A e seguintes do Código de Defesa do Consumidor.',
    itens: ['relação de todos os contratos ativos em nome do(a) assistido(a), com a data e a modalidade', 'saldo devedor atualizado de cada contrato e valor para liquidação antecipada', 'taxa de juros, CET, valor e número de parcelas pagas e a vencer de cada contrato', 'cópia dos contratos e das propostas, com a avaliação de capacidade de pagamento realizada na concessão', 'encargos de mora aplicados e situação de inadimplência', 'condições de renegociação disponíveis'] },
  { id: 'consorcio', rot: 'Consórcio',
    tema: 'Conferência de cota de consórcio',
    relato: 'O(a) assistido(a) é ou foi participante de grupo de consórcio administrado por essa empresa e busca a conferência dos valores pagos e das condições de restituição ou de contemplação.',
    itens: ['cópia do contrato de adesão e do regulamento do grupo', 'extrato da cota, com as parcelas pagas e a discriminação de fundo comum, taxa de administração, fundo de reserva e seguro', 'percentual amortizado e valor atualizado do crédito', 'situação da cota (ativa, excluída, contemplada) e data de eventual exclusão', 'data prevista para o encerramento do grupo e datas das assembleias', 'demonstrativo do valor a restituir, com os descontos aplicados e o respectivo fundamento'] },
  { id: 'imobiliario', rot: 'Financiamento imobiliário',
    tema: 'Conferência de contrato de financiamento imobiliário',
    relato: 'O(a) assistido(a) firmou contrato de financiamento imobiliário com garantia de alienação fiduciária junto a essa instituição e busca conferir a situação da dívida e dos procedimentos de cobrança.',
    itens: ['cópia integral do contrato e de eventuais aditivos', 'planilha de evolução da dívida, com o sistema de amortização, os juros, os seguros e as taxas', 'demonstrativo das parcelas em aberto e dos encargos de mora', 'cópia das intimações para purgação da mora e das comunicações de leilão', 'informação sobre consolidação da propriedade e datas dos leilões', 'valor para purgação da mora e para liquidação antecipada'] },
  { id: 'generico', rot: 'Outro (texto livre)',
    tema: 'Solicitação de informações e documentos',
    relato: '', itens: ['cópia integral dos contratos firmados em nome do(a) assistido(a)', 'demonstrativo atualizado das operações e dos valores cobrados'] }
];
function ofModalidade(id) { for (var i = 0; i < OF_MODALIDADES.length; i++) if (OF_MODALIDADES[i].id === id) return OF_MODALIDADES[i]; return OF_MODALIDADES[OF_MODALIDADES.length - 1]; }

/* Itens padrão do ofício ao INSS */
var OI_ITENS_PADRAO = [
  'extrato de empréstimos consignados (HISCON): relatório de todos os empréstimos e cartões ativos e suspensos vinculados ao benefício, com as datas de início, os valores das parcelas, as instituições credoras e o saldo devedor',
  'histórico de créditos (HISCRE) dos últimos 24 (vinte e quatro) meses, com os valores creditados e a instituição e a agência de pagamento',
  'cópias dos contratos averbados ou, não estando sob a guarda dessa Autarquia, os dados de averbação (número do contrato, instituição financeira e data da contratação)',
  'relação de descontos de mensalidades associativas ou de outras consignações, com a entidade beneficiária e o termo de autorização',
  'o bloqueio do benefício para a contratação de novos empréstimos consignados, a fim de evitar o agravamento da vulnerabilidade do(a) assistido(a)'
];

/* Documentos que podem acompanhar a minuta de e-mail */
var EM_ANEXOS = ['Ofício(s) assinado(s)', 'Autorização expressa assinada pelo(a) assistido(a)', 'Documento de identificação do(a) assistido(a)', 'Extrato do benefício ou do Meu INSS', 'Relatório do Registrato', 'Boletim de ocorrência', 'Comprovantes e extratos bancários'];
