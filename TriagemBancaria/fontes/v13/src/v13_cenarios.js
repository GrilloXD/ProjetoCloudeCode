/* ═══════════════════════════════════════════════════════════════════════
   v13 — TRIAGEM: PERGUNTAS E CENÁRIOS NOVOS OU REVISADOS
   Campos novos dos cenários: analise (questões de análise individual),
   of (modelo de ofício sugerido na aba Documentos) e calc (modalidade da
   calculadora). Referências revisadas em 16/11/2026 (Planalto, ALESP e
   resumos oficiais do STJ); a jurisprudência é de referência: conferir o
   inteiro teor antes de citar em peça.
   ═══════════════════════════════════════════════════════════════════════ */

/* ── 1. Categorias novas ─────────────────────────────────────────────── */
(function () {
  var opts = Q.q_problema.opts, i = opts.findIndex(function (o) { return o.id === 'multiplos'; });
  opts.splice(i, 0,
    { id: 'credito',   icon: '🏦', t: 'Empréstimo pessoal, cheque especial ou renegociação', d: 'Juros altos, descontos em conta-corrente, renegociação que piorou a dívida, cobrança após quitar', next: 'q_docs' },
    { id: 'conta',     icon: '🧾', t: 'Tarifas, seguros e serviços não contratados', d: 'Pacote de tarifas, seguro, capitalização ou débito automático sem autorização', next: 'q_docs' },
    { id: 'consorcio', icon: '🤝', t: 'Consórcio', d: 'Desistência, restituição, contemplação ou promessa de "carta contemplada"', next: 'q_docs' });
  Q.q_problema.hint = 'Selecione a categoria que melhor descreve a situação. Na dúvida entre duas, escolha a que traz mais risco (por exemplo, prazo correndo ou desconto no benefício).';
  BRANCH.veiculo = 'vei_q0'; BRANCH.credito = 'cre_q1'; BRANCH.conta = 'tar_q1'; BRANCH.consorcio = 'con_q1';

  Q.q_docs.opts.splice(Q.q_docs.opts.length - 1, 0,
    { id: 'registrato', icon: '🏦', t: 'Registrato ou extrato do Meu INSS', d: 'Relatório de empréstimos do BACEN, extrato de consignações (HISCON) ou do benefício' },
    { id: 'prints',     icon: '💬', t: 'Prints, conversas ou comprovantes de PIX', d: 'Mensagens com o golpista, telas de contratação, comprovantes de transferência' });
  Q.q_docs.opts.forEach(function (o) {
    if (o.id === 'notif_cart') { o.t = 'Intimação do Registro de Imóveis'; o.d = '⚠ URGENTE — Lei 9.514/97: 15 dias para purgar a mora do financiamento do imóvel'; }
    if (o.id === 'mandado') o.d = '⚠ URGENTE — prazo processual em curso; anote a data do recebimento';
  });
  Q.q_docs.next = 'q_urgencia';

  /* Sinais de urgência e perfil do(a) assistido(a): perguntas comuns a todas as categorias */
  Q.q_urgencia = {
    id: 'q_urgencia', label: 'Passo 2 de 4 — Sinais de urgência', type: 'multi', cols: 2, next: 'q_perfil',
    text: 'Algum destes sinais de urgência está presente?',
    hint: 'Marque todos os que se aplicam. Qualquer sinal marcado gera um alerta: o caso deve ser levado ao(à) defensor(a) imediatamente, sem esperar o fim da triagem.',
    opts: ALERTAS.map(function (a) { return { id: a.id, icon: a.icon, t: a.t, d: a.d }; })
      .concat([{ id: 'nenhum', icon: '✅', t: 'Nenhum destes sinais', d: 'Seguir a triagem normalmente' }])
  };
  Q.q_perfil = {
    id: 'q_perfil', label: 'Passo 2 de 4 — Prioridades e vulnerabilidades', type: 'multi', cols: 2, next: '__BRANCH__',
    text: 'O(a) assistido(a) se enquadra em alguma destas condições?',
    hint: 'Marque todas as que se aplicam. A seleção entra na fundamentação dos ofícios. O sistema distingue prioridade prevista em lei, condição de vulnerabilidade e circunstância que merece atenção.',
    opts: VULN.map(function (v) { return { id: v.id, icon: v.classe === 'prioridade' ? '⭐' : (v.classe === 'vulnerabilidade' ? '🛡️' : '👁️'), t: v.rot, d: VULN_CLASSES[v.classe] }; })
      .concat([{ id: 'nenhum', icon: '➖', t: 'Nenhuma destas condições', d: 'Seguir sem prioridade específica' }])
  };

  /* ── INSS: modalidades e problemas novos ── */
  Q.inss_q0.hint = 'O teto de juros depende da data do contrato (normas do INSS e Resoluções do CNPS). Desde 04/04/2025: empréstimo 1,85% a.m.; cartão de crédito consignado (RMC) e cartão consignado de benefício (RCC) 2,46% a.m. A calculadora aplica o teto do mês da contratação. Novas operações de cartão consignado estão suspensas por medida cautelar do TCU (comunicado do INSS de setembro de 2026).';
  Q.inss_q0.opts.forEach(function (o) {
    if (o.id === 'emp') o.d = 'Parcela fixa descontada no benefício (teto desde 04/2025: 1,85% a.m.)';
    if (o.id === 'rmc') { o.t = 'Cartão de crédito consignado (RMC)'; o.d = 'Reserva de margem para cartão de crédito, com saques e compras (teto desde 06/2024: 2,46% a.m.)'; }
    if (o.id === 'rcc') { o.t = 'Cartão consignado de benefício (RCC)'; o.d = 'Cartão de benefício com margem própria de 5% (teto desde 06/2024: 2,46% a.m.)'; }
  });
  Q.inss_q0.opts.push({ id: 'assoc', icon: '🏷️', t: 'Mensalidade de associação ou sindicato', d: 'Desconto de entidade associativa que o(a) beneficiário(a) não autorizou', next: 'END_inss_associativo' });
  Q.inss_q2_sim.opts.push(
    { id: 'rmc_engano', icon: '🔁', t: 'Pensou que era empréstimo, mas é cartão (RMC/RCC)', d: 'Desconto que nunca termina e saldo que não diminui', next: 'END_inss_rmc_engano' },
    { id: 'margem', icon: '📏', t: 'Descontos somados passam do limite', d: 'Mais de 45% do benefício (35% no BPC) comprometido com consignações', next: 'END_inss_margem' });

  /* ── Fraudes digitais: golpes frequentes ── */
  Q.dig_q1.opts.push(
    { id: 'falsa_central', icon: '☎️', t: 'Falsa central ou falso funcionário do banco', d: 'Ligação ou mensagem em nome do banco levou a transferências ou empréstimos', next: 'dig_pix_q0' },
    { id: 'falso_emp', icon: '🎣', t: 'Golpe do falso empréstimo', d: 'Pagou "taxa", "seguro" ou "imposto" para liberar crédito que nunca veio', next: 'END_falso_emprestimo' });
})();

/* ── 2. Perguntas novas ou revisadas ─────────────────────────────────── */
Object.assign(Q, {
  dig_pix_q1: {
    id: 'dig_pix_q1', label: 'Passo 3 de 4 — PIX', type: 'single', cols: 2,
    text: 'Há quanto tempo ocorreu a transação PIX contestada?',
    hint: 'O Mecanismo Especial de Devolução (MED), previsto no Regulamento do Pix do Banco Central, pode ser pedido em até 80 dias da transação, em casos de fraude ou de falha de segurança. Não cobre simples engano de digitação. Quanto antes, maior a chance de bloqueio dos valores.',
    naoSabe: { diligencias: [
      { icon: '📱', texto: 'Verificar no aplicativo do banco o <strong>histórico de transações PIX</strong>: data, hora, valor e destinatário.' },
      { icon: '📧', texto: 'Conferir e-mails e SMS de confirmação recebidos no momento da transação.' }], next: 'dig_pix_q2' },
    opts: [
      { id: 'menos80', icon: '⏱️', t: 'Até 80 dias', d: 'Dentro do prazo para pedir o MED', next: 'dig_pix_q2' },
      { id: 'mais80', icon: '⌛', t: 'Mais de 80 dias', d: 'Prazo do MED encerrado: a recuperação depende de outras vias', next: 'END_pix_sem_med_prazo' }]
  },
  vei_q0: {
    id: 'vei_q0', label: 'Passo 3 de 4 — Veículo', type: 'single', cols: 2,
    text: 'Qual é a situação principal do financiamento do veículo?',
    hint: 'Vale para carro, moto, caminhão ou outro veículo com alienação fiduciária (o veículo fica em nome do banco até a quitação). Escolha o ponto que mais preocupa o(a) assistido(a); os demais podem ser tratados depois.',
    naoSabe: { diligencias: [
      { icon: '🏦', texto: 'Consultar o <strong>Registrato</strong> (registrato.bcb.gov.br) para identificar o contrato, o banco e a situação.', link: 'https://registrato.bcb.gov.br' },
      { icon: '🚗', texto: 'Conferir no documento do veículo (CRLV) ou no Detran se há <strong>gravame de alienação fiduciária</strong> e em favor de qual instituição.' },
      { icon: '⚖️', texto: 'Pesquisar no TJSP, pelo CPF, se há ação de busca e apreensão.', link: 'https://esaj.tjsp.jus.br/cpopg/open.do' }], next: 'vei_q1' },
    opts: [
      { id: 'atraso', icon: '🚨', t: 'Parcelas em atraso ou risco de perder o veículo', d: 'Atraso, ação de busca e apreensão ou veículo já apreendido', next: 'vei_q1' },
      { id: 'notificacao', icon: '📮', t: 'Recebeu notificação ou carta de cobrança', d: 'Aviso de mora do banco, notificação de cartório ou mandado', next: 'vei_n1' },
      { id: 'revisao', icon: '🔍', t: 'Quer conferir juros, CET, tarifas ou seguros', d: 'Parcela alta, juros acima do esperado, cobranças embutidas', next: 'vei_r1' },
      { id: 'quitacao', icon: '💵', t: 'Quitar antes, renegociar, entregar ou transferir', d: 'Liquidação antecipada, acordo, entrega do bem ou repasse a terceiro', next: 'vei_qt1' },
      { id: 'servico', icon: '🧾', t: 'Seguro ou serviço que não pediu', d: 'Seguro, garantia, assistência ou título financiados junto', next: 'END_vei_venda_casada' },
      { id: 'sinistro', icon: '🛑', t: 'Veículo roubado, furtado ou com perda total', d: 'Dúvida sobre o seguro e o saldo do financiamento', next: 'END_vei_sinistro' },
      { id: 'naoreconhece', icon: '❓', t: 'Não reconhece o financiamento', d: 'Contrato em seu nome que não firmou', next: 'END_emp_fraude' }]
  },
  vei_q2: {
    id: 'vei_q2', label: 'Passo 3 de 4 — Veículo', type: 'single', cols: 2,
    text: 'Há quantos dias o veículo foi apreendido (cumprimento da liminar)?',
    hint: 'O prazo de 5 dias para pagar a integralidade da dívida conta da EXECUÇÃO DA LIMINAR, isto é, da apreensão (DL 911/69, art. 3º, §§ 1º e 2º; STJ, Tema 1.279). É prazo de direito material, contado em dias corridos (STJ, REsp 1.770.863/PR). A resposta à ação é de 15 dias da execução da liminar (art. 3º, § 3º).',
    naoSabe: { diligencias: [
      { icon: '⚖️', texto: 'Consultar o processo no TJSP e localizar o <strong>auto de busca e apreensão</strong> (data do cumprimento).', link: 'https://esaj.tjsp.jus.br/cpopg/open.do' },
      { icon: '📄', texto: 'Pedir ao(à) assistido(a) o documento entregue pelo oficial de justiça no dia da apreensão.' }], next: 'END_vei_purga_urgente' },
    opts: [
      { id: 'menos5', icon: '⏱️', t: 'Até 5 dias da apreensão', d: 'Prazo em curso: ainda é possível pagar a integralidade da dívida', next: 'END_vei_purga_urgente' },
      { id: 'mais5', icon: '⌛', t: 'Mais de 5 dias da apreensão', d: 'Propriedade possivelmente consolidada em favor do banco', next: 'vei_q3' }]
  },
  vei_q3: {
    id: 'vei_q3', label: 'Passo 3 de 4 — Veículo', type: 'single', cols: 2,
    text: 'Há indícios de irregularidade no contrato ou na cobrança (taxa muito acima da média do BACEN, tarifas ou seguros embutidos, mora mal comprovada)?',
    hint: 'O STJ (REsp 1.622.555/MG, Segunda Seção) afastou a teoria do adimplemento substancial nos contratos do DL 911/69: ter pago a maior parte das parcelas, por si só, não impede a busca e apreensão. A análise costuma envolver a comprovação da mora, os valores cobrados e eventual abusividade de encargos. Use a calculadora para comparar a taxa com a média do BACEN.',
    naoSabe: { diligencias: [
      { icon: '📄', texto: 'Obter o contrato (cédula de crédito) com taxa de juros, CET e discriminação de tarifas, seguros e serviços financiados.' },
      { icon: '🧮', texto: 'Comparar a taxa na aba <strong>Calculadora</strong>, modalidade "Financiamento de Veículo".' }], next: 'END_vei_revisao_sem_doc' },
    opts: [
      { id: 'sim', icon: '⚠️', t: 'Sim, há indícios', d: 'Taxa muito acima da média, cobranças embutidas ou falha na notificação', next: 'END_vei_revisao' },
      { id: 'nao', icon: '✅', t: 'Não, contrato parece regular', d: 'Avaliar acordo, entrega amigável ou prestação de contas da venda', next: 'END_vei_renegociacao' }]
  },
  vei_n1: {
    id: 'vei_n1', label: 'Passo 3 de 4 — Veículo', type: 'single', cols: 2,
    text: 'Que tipo de notificação o(a) assistido(a) recebeu?',
    hint: 'Desde a Lei 14.711/2023, o banco pode cobrar pelo cartório de Títulos e Documentos ou pelo Detran, sem ação judicial, se o contrato prever essa via em cláusula destacada (DL 911/69, art. 8º-B). Nesse caso o prazo é de 20 dias.',
    opts: [
      { id: 'cartorio', icon: '🏛️', t: 'Notificação de cartório para pagar em 20 dias', d: 'Cartório de Títulos e Documentos ou Detran', next: 'vei_n2' },
      { id: 'carta', icon: '✉️', t: 'Carta ou aviso de mora do banco', d: 'Correspondência com aviso de recebimento (AR)', next: 'vei_q2b' },
      { id: 'judicial', icon: '⚖️', t: 'Mandado ou citação judicial', d: 'Ação de busca e apreensão', next: 'vei_q1' }]
  },
  vei_n2: {
    id: 'vei_n2', label: 'Passo 3 de 4 — Veículo', type: 'single', cols: 2,
    text: 'Há quantos dias a notificação do cartório foi recebida?',
    hint: 'DL 911/69, art. 8º-B: 20 dias para pagar ou apresentar documentos de que a cobrança é total ou parcialmente indevida. Se só parte for indevida, o devedor declara o valor que entende correto e o paga no mesmo prazo (§ 4º). Não paga a dívida, a propriedade é consolidada e o devedor deve entregar o bem, sob pena de multa de 5% (§ 11).',
    naoSabe: { diligencias: [{ icon: '📮', texto: 'Verificar a data do aviso de recebimento ou da notificação eletrônica (o cartório notifica preferencialmente por e-mail, § 6º).' }], next: 'END_vei_cartorio_urgente' },
    opts: [
      { id: 'menos20', icon: '⏱️', t: 'Até 20 dias', d: 'Prazo em curso', next: 'END_vei_cartorio_urgente' },
      { id: 'mais20', icon: '⌛', t: 'Mais de 20 dias', d: 'Prazo possivelmente esgotado', next: 'END_vei_cartorio_consolidado' }]
  },
  vei_r1: {
    id: 'vei_r1', label: 'Passo 3 de 4 — Veículo', type: 'single', cols: 2,
    text: 'O contrato (cédula de crédito) do financiamento está disponível?',
    hint: 'O contrato traz a taxa de juros mensal e anual, o CET, o valor financiado e a lista de tarifas, seguros e serviços incluídos. Sem ele, o primeiro passo é pedi-lo à instituição.',
    naoSabe: { diligencias: [{ icon: '📱', texto: 'Verificar no aplicativo ou no site da financeira a área de contratos; muitas disponibilizam a cédula em PDF.' }], next: 'END_vei_revisao_sem_doc' },
    opts: [
      { id: 'sim', icon: '📄', t: 'Sim, contrato disponível', d: 'Dá para conferir os números agora', next: 'vei_r2' },
      { id: 'nao', icon: '🚫', t: 'Não tem o contrato', d: 'Pedir à instituição por ofício', next: 'END_vei_revisao_sem_doc' }]
  },
  vei_r2: {
    id: 'vei_r2', label: 'Passo 3 de 4 — Veículo', type: 'single', cols: 2,
    text: 'O que chamou a atenção no contrato ou nas parcelas?',
    hint: 'Não presuma abusividade: cada ponto indica o que conferir. Juros acima da média não são ilegais por si sós; o que se verifica é a discrepância relevante em relação à média de mercado e a regularidade das demais cobranças.',
    opts: [
      { id: 'juros', icon: '📈', t: 'Juros ou CET muito acima do esperado', d: 'Comparar com a média do BACEN do mês da contratação', next: 'END_vei_revisao' },
      { id: 'tarifas', icon: '🧾', t: 'Tarifas, seguros ou serviços financiados junto', d: 'Cadastro, avaliação, registro, serviços de terceiros, seguros', next: 'END_vei_tarifas' },
      { id: 'parcela', icon: '🔢', t: 'Parcela diferente da contratada ou saldo que não diminui', d: 'Valor cobrado não bate com o contrato', next: 'END_vei_parcela' },
      { id: 'nada', icon: '🔎', t: 'Nada específico: quer só conferir', d: 'Revisão geral do contrato', next: 'END_vei_conferencia' }]
  },
  vei_qt1: {
    id: 'vei_qt1', label: 'Passo 3 de 4 — Veículo', type: 'single', cols: 2,
    text: 'O que o(a) assistido(a) pretende?',
    hint: 'Antes de qualquer acordo, peça o saldo devedor atualizado e compare com a calculadora. Acordos que alongam o prazo podem aumentar muito o total pago.',
    opts: [
      { id: 'quitar', icon: '💵', t: 'Quitar antecipadamente (total ou parcial)', d: 'Pagamento antecipado com redução dos juros', next: 'END_vei_quitacao' },
      { id: 'renegociar', icon: '🤝', t: 'Renegociar ou refinanciar', d: 'Novo prazo, novas parcelas ou novo contrato', next: 'END_vei_reneg' },
      { id: 'entregar', icon: '🔑', t: 'Entregar o veículo por não conseguir pagar', d: 'Entrega amigável e prestação de contas', next: 'END_vei_renegociacao' },
      { id: 'transferir', icon: '🔄', t: 'Passar o veículo e a dívida para outra pessoa', d: 'Repasse, "contrato de gaveta" ou transferência do financiamento', next: 'END_vei_transferencia' }]
  },
  imo_q1: {
    id: 'imo_q1', label: 'Passo 3 de 4 — Imóvel', type: 'single', cols: 2,
    text: 'O(a) assistido(a) recebeu intimação do Registro de Imóveis para purgar a mora?',
    hint: 'Na alienação fiduciária de imóvel (Lei 9.514/97, art. 26), a intimação é feita a pedido do banco pelo oficial do Registro de Imóveis, pessoalmente, por oficial de Títulos e Documentos ou pelo correio, e abre prazo de 15 dias para pagar.',
    naoSabe: { diligencias: [
      { icon: '🏛️', texto: 'Pedir a <strong>certidão atualizada da matrícula</strong> do imóvel no Cartório de Registro de Imóveis para ver se há averbação de consolidação.' },
      { icon: '📮', texto: 'Verificar correspondências e e-mails dos últimos meses (a intimação pode chegar pelo correio ou por oficial).' }], next: 'imo_q1b' },
    opts: [
      { id: 'sim', icon: '✉️', t: 'Sim, recebeu a intimação', d: 'Prazo de 15 dias para pagar', next: 'imo_q2' },
      { id: 'nao', icon: '🏠', t: 'Não recebeu', d: 'Há atraso, mas sem intimação', next: 'imo_q1b' }]
  },
  imo_q1b: {
    id: 'imo_q1b', label: 'Passo 3 de 4 — Imóvel', type: 'single', cols: 2,
    text: 'Há quanto tempo há parcelas em atraso?',
    hint: 'A intimação pode ser pedida após o prazo de carência do contrato; se o contrato não fixar carência, ela é de 15 dias (Lei 9.514/97, art. 26, §§ 2º e 2º-A). Ou seja, não há garantia de "3 meses" antes da cobrança.',
    opts: [
      { id: 'ate3', icon: '📅', t: 'Até 3 parcelas', d: 'Momento de negociar antes da intimação', next: 'END_imo_renegoc' },
      { id: 'mais3', icon: '⚠️', t: 'Mais de 3 parcelas', d: 'Intimação pode chegar a qualquer momento', next: 'END_imo_risco' }]
  },
  imo_q2: {
    id: 'imo_q2', label: 'Passo 3 de 4 — Imóvel', type: 'single', cols: 2,
    text: 'Há quantos dias a intimação foi recebida?',
    hint: 'O prazo de 15 dias conta da intimação (Lei 9.514/97, art. 26, § 1º). Depois dele, ainda é possível pagar as parcelas vencidas e as despesas até a averbação da consolidação, nos financiamentos para aquisição ou construção de imóvel residencial (art. 26-A, § 2º).',
    opts: [
      { id: 'menos15', icon: '⏱️', t: 'Até 15 dias', d: 'Prazo em curso: urgência máxima', next: 'END_imo_purga_urgente' },
      { id: 'mais15', icon: '⌛', t: 'Mais de 15 dias', d: 'Verificar consolidação e leilão', next: 'imo_q3' }]
  },
  cre_q1: {
    id: 'cre_q1', label: 'Passo 3 de 4 — Crédito', type: 'single', cols: 2,
    text: 'Qual é o problema com o empréstimo ou o crédito?',
    hint: 'Empréstimo pessoal (não consignado), crédito na conta, cheque especial e renegociações. Para consignado em benefício ou folha, use a categoria do INSS.',
    naoSabe: { diligencias: [{ icon: '🏦', texto: 'Consultar o <strong>Registrato</strong> com o assistido para listar os contratos de crédito no CPF.', link: 'https://registrato.bcb.gov.br' }], next: 'cre_q2' },
    opts: [
      { id: 'juros', icon: '📈', t: 'Juros ou parcelas muito altos', d: 'Quer saber se a taxa está fora do mercado', next: 'cre_q2' },
      { id: 'conta', icon: '🏧', t: 'Descontos na conta consomem o salário ou benefício', d: 'Parcelas debitadas direto na conta-corrente', next: 'END_cre_desconto_conta' },
      { id: 'reneg', icon: '🔄', t: 'Renegociação que aumentou a dívida', d: 'Acordo, "refinanciamento" ou troca de dívida que piorou a situação', next: 'END_cre_reneg_agravada' },
      { id: 'quitada', icon: '🧾', t: 'Cobrança de dívida já paga', d: 'Continua sendo cobrado(a) depois de quitar', next: 'END_cre_pos_quitacao' },
      { id: 'cheque', icon: '💳', t: 'Cheque especial usado sem perceber', d: 'Saldo negativo crescendo com juros', next: 'END_cre_cheque' },
      { id: 'falso', icon: '🎣', t: 'Pagou para "liberar" empréstimo que não veio', d: 'Golpe do falso empréstimo', next: 'END_falso_emprestimo' },
      { id: 'naoreconhece', icon: '❓', t: 'Empréstimo que não reconhece', d: 'Crédito em seu nome que não contratou', next: 'END_emp_fraude' }]
  },
  cre_q2: {
    id: 'cre_q2', label: 'Passo 3 de 4 — Crédito', type: 'single', cols: 2,
    text: 'O contrato do empréstimo está disponível?',
    hint: 'Com o contrato, a calculadora compara a taxa com a média do BACEN do mês. Sem ele, se o banco não apresentar o contrato, aplica-se a taxa média de mercado da mesma espécie, salvo se a cobrada for mais vantajosa (STJ, Súmula 530).',
    opts: [
      { id: 'sim', icon: '📄', t: 'Sim', d: 'Taxa, CET e prazo em mãos', next: 'END_cre_juros' },
      { id: 'nao', icon: '🚫', t: 'Não', d: 'Pedir o contrato à instituição', next: 'END_cre_sem_contrato' }]
  },
  tar_q1: {
    id: 'tar_q1', label: 'Passo 3 de 4 — Tarifas e serviços', type: 'single', cols: 2,
    text: 'Que tipo de cobrança aparece sem autorização?',
    hint: 'Confira o extrato dos últimos 12 meses e anote o nome de cada lançamento (por exemplo "CESTA", "SEG", "CAP", "DEB AUT").',
    opts: [
      { id: 'tarifas', icon: '🏦', t: 'Pacote de tarifas ou tarifa de conta', d: 'Cesta de serviços, tarifa em conta-salário ou conta de benefício', next: 'END_tar_pacote' },
      { id: 'seguro', icon: '🛡️', t: 'Seguro, capitalização ou assistência', d: 'Produto que não pediu, cobrado na conta ou no cartão', next: 'END_tar_seguro' },
      { id: 'debito', icon: '🔁', t: 'Débito automático de empresa que não autorizou', d: 'Clube, associação, plano ou serviço desconhecido', next: 'END_tar_debito' }]
  },
  con_q1: {
    id: 'con_q1', label: 'Passo 3 de 4 — Consórcio', type: 'single', cols: 2,
    text: 'Qual é a situação do consórcio?',
    hint: 'Consórcio não é financiamento: o grupo junta dinheiro e contempla os participantes por sorteio ou lance. Há taxa de administração e, em geral, fundo de reserva e seguro. Lei 11.795/2008.',
    opts: [
      { id: 'desistiu', icon: '↩️', t: 'Desistiu ou foi excluído e quer o dinheiro de volta', d: 'Parou de pagar ou pediu para sair do grupo', next: 'con_q2' },
      { id: 'contemplado', icon: '🎯', t: 'Foi contemplado e não recebe o crédito', d: 'Exigências ou demora para liberar a carta de crédito', next: 'END_con_contemplado' },
      { id: 'cobranca', icon: '🧾', t: 'Cobranças, taxas ou seguro que não entende', d: 'Parcela maior que a esperada, reajustes, seguro', next: 'END_con_cobranca' },
      { id: 'promessa', icon: '🎭', t: 'Prometeram contemplação garantida ou "carta contemplada"', d: 'Vendedor garantiu crédito rápido ou vendeu cota "já contemplada"', next: 'END_con_venda_enganosa' }]
  },
  con_q2: {
    id: 'con_q2', label: 'Passo 3 de 4 — Consórcio', type: 'single', cols: 2,
    text: 'O grupo do consórcio já foi encerrado?',
    hint: 'A cota do excluído concorre aos sorteios para receber a restituição (Lei 11.795/2008, arts. 22, § 2º, e 30). Se não for sorteada, a devolução ocorre com o encerramento do grupo. A data de encerramento consta do contrato e do extrato da cota.',
    naoSabe: { diligencias: [{ icon: '📄', texto: 'Pedir à administradora o extrato da cota e a data prevista de encerramento do grupo.' }], next: 'END_con_restituicao_aguardar' },
    opts: [
      { id: 'sim', icon: '✅', t: 'Sim, o grupo já encerrou', d: 'A restituição já deveria ter sido paga', next: 'END_con_restituicao_devida' },
      { id: 'nao', icon: '⏳', t: 'Não, o grupo continua', d: 'Restituição por sorteio ou no encerramento', next: 'END_con_restituicao_aguardar' }]
  }
});

/* ── 3. Cenários novos ou revisados ──────────────────────────────────── */
var _S479 = { tipo: 'sumula', ref: 'STJ — Súmula 479', ementa: 'As instituições financeiras respondem objetivamente pelos danos gerados por fortuito interno relativo a fraudes e delitos praticados por terceiros no âmbito de operações bancárias.' };
var _T466 = { tipo: 'tema', ref: 'STJ — Tema 466 (REsp 1.199.782/PR e REsp 1.197.929/PR)', ementa: 'As instituições bancárias respondem objetivamente pelos danos causados por fraudes ou delitos praticados por terceiros, como a abertura de conta ou a obtenção de empréstimos mediante fraude ou documentos falsos, porque tal responsabilidade decorre do risco do empreendimento (fortuito interno).' };
var _T1061 = { tipo: 'tema', ref: 'STJ — Tema 1.061 (REsp 1.846.649/MA)', ementa: 'Quando o consumidor impugna a autenticidade da assinatura em contrato bancário juntado pela instituição financeira, cabe a esta provar a autenticidade (CPC, arts. 6º, 369 e 429, II).' };
var _S297 = { tipo: 'sumula', ref: 'STJ — Súmula 297', ementa: 'O Código de Defesa do Consumidor é aplicável às instituições financeiras.' };
var _T27 = { tipo: 'tema', ref: 'STJ — REsp 1.061.530/RS (Tema 27, repetitivo)', ementa: 'É admitida a revisão das taxas de juros remuneratórios em situações excepcionais, desde que caracterizada a relação de consumo e que a abusividade, capaz de colocar o consumidor em desvantagem exagerada (CDC, art. 51, § 1º), fique cabalmente demonstrada diante das peculiaridades do caso. A taxa média de mercado divulgada pelo BACEN é referência para essa aferição.' };
var _S382 = { tipo: 'sumula', ref: 'STJ — Súmula 382', ementa: 'A estipulação de juros remuneratórios superiores a 12% ao ano, por si só, não indica abusividade.' };
var _S530 = { tipo: 'sumula', ref: 'STJ — Súmula 530', ementa: 'Nos contratos bancários, na impossibilidade de comprovar a taxa de juros efetivamente contratada, por ausência de pactuação ou pela falta de juntada do instrumento aos autos, aplica-se a taxa média de mercado divulgada pelo BACEN para operações da mesma espécie, salvo se a taxa cobrada for mais vantajosa para o devedor.' };
var _S539 = { tipo: 'sumula', ref: 'STJ — Súmulas 539 e 541', ementa: 'A capitalização de juros com periodicidade inferior à anual é permitida em contratos celebrados a partir de 31/3/2000, desde que expressamente pactuada; a previsão de taxa anual superior ao duodécuplo da mensal basta para permitir a cobrança da taxa efetiva anual contratada.' };
var _T958 = { tipo: 'tema', ref: 'STJ — Tema 958 (REsp 1.578.553/SP)', ementa: 'É abusiva a cláusula que prevê o ressarcimento de serviços prestados por terceiros sem especificar o serviço; é válida a tarifa de avaliação do bem e a de registro do contrato, ressalvadas a abusividade da cobrança por serviço não efetivamente prestado e o controle da onerosidade excessiva no caso concreto.' };
var _T972 = { tipo: 'tema', ref: 'STJ — Tema 972 (REsps 1.639.259/SP e 1.639.320/SP)', ementa: 'Nos contratos bancários em geral, o consumidor não pode ser compelido a contratar seguro com a instituição financeira ou com seguradora por ela indicada. A abusividade de encargos acessórios do contrato não descaracteriza a mora.' };
var _S566 = { tipo: 'sumula', ref: 'STJ — Súmula 566', ementa: 'Nos contratos bancários posteriores a 30/4/2008 (Resolução CMN 3.518/2007), pode ser cobrada a tarifa de cadastro no início do relacionamento entre o consumidor e a instituição financeira.' };
var _T722 = { tipo: 'tema', ref: 'STJ — Tema 722 (REsp 1.418.593/MS)', ementa: 'Nos contratos firmados na vigência da Lei 10.931/2004, compete ao devedor, no prazo de 5 dias após a execução da liminar de busca e apreensão, pagar a integralidade da dívida (valores apresentados e comprovados pelo credor na inicial), sob pena de consolidação da propriedade.' };
var _T1279 = { tipo: 'tema', ref: 'STJ — Tema 1.279 (REsp 2.126.264/MS, 2025)', ementa: 'O prazo de 5 dias para o devedor fiduciante pagar a integralidade da dívida conta da execução da medida liminar de busca e apreensão (DL 911/69, art. 3º, § 1º).' };
var _R1770 = { tipo: 'prec', ref: 'STJ — REsp 1.770.863/PR (3ª Turma, 2020)', ementa: 'O prazo de 5 dias para pagamento da integralidade da dívida pelo devedor fiduciante tem natureza de direito material e é contado em dias corridos.' };
var _T1132 = { tipo: 'tema', ref: 'STJ — Tema 1.132 (REsps 1.951.662/RS e 1.951.888/RS)', ementa: 'Para comprovar a mora nos contratos garantidos por alienação fiduciária, basta o envio de notificação extrajudicial ao endereço do devedor indicado no contrato, dispensada a prova do recebimento.' };
var _R1622 = { tipo: 'prec', ref: 'STJ — REsp 1.622.555/MG (Segunda Seção, 2017)', ementa: 'A teoria do adimplemento substancial não se aplica aos contratos de alienação fiduciária regidos pelo DL 911/69, que exige a quitação da integralidade da dívida pendente.' };
var _T1095 = { tipo: 'tema', ref: 'STJ — Tema 1.095', ementa: 'No contrato de compra e venda de imóvel com alienação fiduciária registrada, a resolução por inadimplemento do devedor constituído em mora segue a Lei 9.514/97, afastada a aplicação do CDC quanto à forma de resolução.' };
var _T1085 = { tipo: 'tema', ref: 'STJ — Tema 1.085 (REsp 1.863.973/SP)', ementa: 'São lícitos os descontos de parcelas de empréstimos comuns em conta-corrente, ainda que usada para receber salário, desde que previamente autorizados pelo mutuário e enquanto a autorização perdurar, sem aplicação por analogia do limite da Lei 10.820/2003.' };
var _EA676 = { tipo: 'prec', ref: 'STJ — EAREsp 676.608/RS (Corte Especial)', ementa: 'A restituição em dobro do indébito (CDC, art. 42, parágrafo único) independe da natureza do elemento volitivo do fornecedor e cabe quando a cobrança indevida contrariar a boa-fé objetiva. Houve modulação: em contratos que não envolvem serviço público, vale para cobranças feitas após 30/3/2021.' };
var _S532 = { tipo: 'sumula', ref: 'STJ — Súmula 532', ementa: 'Constitui prática comercial abusiva o envio de cartão de crédito sem prévia e expressa solicitação do consumidor, configurando ato ilícito indenizável e sujeito à aplicação de multa administrativa.' };
var _T312 = { tipo: 'tema', ref: 'STJ — Tema 312 (REsp 1.119.300/RS)', ementa: 'É devida a restituição dos valores vertidos por consorciado desistente, mas não de imediato: em até 30 dias contados do prazo previsto no contrato para o encerramento do plano (contratos anteriores à Lei 11.795/2008).' };
var _S538 = { tipo: 'sumula', ref: 'STJ — Súmula 538', ementa: 'As administradoras de consórcio têm liberdade para estabelecer a respectiva taxa de administração, ainda que fixada em percentual superior a dez por cento.' };

Object.assign(T, {
  /* ─── INSS ─── */
  END_inss_associativo: {
    titulo: 'Desconto de Mensalidade Associativa ou Sindical não Autorizado', severity: 'alto', urgente: false, of: 'consig_nao_reconhecido', oi: true,
    descricao: 'O benefício sofre desconto em favor de associação, sindicato ou entidade de aposentados que o(a) beneficiário(a) afirma não ter autorizado. A lei só permite esse desconto quando autorizado pelo filiado (Lei 8.213/91, art. 115, V). Em 2025 e 2026 o INSS abriu procedimento de contestação e ressarcimento administrativo, com acordo homologado pelo STF; os comunicados oficiais indicaram prazo final de contestação em 20/06/2026, de modo que é preciso verificar no Meu INSS ou na Central 135 se ainda há canal aberto para o caso.',
    teses: [{ nome: 'Desconto sem autorização', fund: 'Lei 8.213/91, art. 115, V; CDC arts. 6º, III, e 42', key: 'boa-fe-obj', desc: 'Sem autorização válida do filiado, o desconto é indevido e os valores devem ser restituídos; a entidade deve apresentar a ficha de filiação e a autorização assinada.' }],
    baseLegal: [{ lei: 'Lei 8.213/1991 — art. 115, V', desc: 'Desconto de mensalidade associativa apenas quando autorizado pelo filiado' }, { lei: 'CDC — art. 42, parágrafo único', desc: 'Repetição do indébito' }, { lei: 'LC 80/1994 — art. 128, X', desc: 'Requisição de documentos a autoridades públicas (INSS)' }],
    jurisprudencia: [],
    fluxo: [
      { n: 1, t: 'Conferir o extrato do benefício', d: 'No Meu INSS (Extrato de pagamento), identificar a entidade, o código do desconto, o valor e o mês de início.', tipo: 'normal' },
      { n: 2, t: 'Verificar o canal de contestação', d: 'Consultar no Meu INSS ou na Central 135 se o desconto ainda pode ser contestado administrativamente e se há valor de ressarcimento disponível para adesão.', tipo: 'highlight' },
      { n: 3, t: 'Ofício ao INSS', d: 'Na aba Documentos, gerar o ofício ao INSS pedindo a relação dos descontos associativos, a entidade beneficiária e o termo de autorização, além da exclusão do desconto.', tipo: 'highlight' },
      { n: 4, t: 'Encaminhamento', d: 'Sem solução administrativa, levar ao(à) defensor(a) para avaliar a restituição e a responsabilidade da entidade.', tipo: 'normal' }],
    provas: ['Extrato de pagamento do benefício com o desconto', 'Via ofício: termo de filiação e autorização assinados', 'Protocolo de contestação no Meu INSS ou na Central 135', 'Documento de identificação do(a) beneficiário(a)'],
    analise: ['Se a pessoa chegou a assinar algo com a entidade e em que contexto', 'Período e soma dos descontos', 'Se já houve ressarcimento parcial pelo INSS'],
    dica: 'Muitos beneficiários não percebem o desconto porque o valor é pequeno. Some todos os meses: o total costuma ser relevante. Peça sempre o extrato completo do período.'
  },
  END_inss_rmc_engano: {
    titulo: 'Cartão Consignado (RMC/RCC) Contratado como se Fosse Empréstimo', severity: 'alto', urgente: false, of: 'cartao_rmc', calc: 'rmc',
    descricao: 'O(a) beneficiário(a) acreditava contratar empréstimo consignado com parcelas fixas, mas a operação foi registrada como cartão de crédito consignado (RMC) ou cartão consignado de benefício (RCC). O valor sacado vira saldo do cartão, o desconto mensal cobre só o mínimo da fatura e a dívida pode não diminuir. É preciso verificar se houve informação clara sobre a modalidade, os juros e a forma de amortização, e se a pessoa recebeu e usou o cartão.',
    teses: [
      { nome: 'Falha no dever de informação', fund: 'CDC arts. 6º, III, 31, 46 e 52', key: 'boa-fe-obj', desc: 'Se o consumidor não foi informado de forma clara de que contratava cartão, com saldo rotativo e sem prazo para terminar, o contrato não o obriga nos termos em que foi redigido.' },
      { nome: 'Prática abusiva', fund: 'CDC art. 39, IV; art. 54-C, IV', key: 'abuso-direito', desc: 'Prevalecer-se da idade, do conhecimento ou da condição do consumidor para vender produto diverso do pretendido.' }],
    baseLegal: [{ lei: 'Lei 10.820/2003 — art. 6º, § 5º', desc: 'Margens próprias de 5% para cartão de crédito consignado e 5% para cartão consignado de benefício' }, { lei: 'CDC — arts. 6º, III, 46 e 52', desc: 'Informação prévia e adequada sobre o crédito' }, { lei: 'CDC — art. 54-D, I', desc: 'Dever de esclarecer, considerada a idade do consumidor, a natureza e a modalidade do crédito' }],
    jurisprudencia: [_T1061],
    fluxo: [
      { n: 1, t: 'Extrato HISCON', d: 'Confirmar no Meu INSS se o desconto aparece como RMC ou RCC e desde quando.', tipo: 'normal' },
      { n: 2, t: 'Ofício à instituição', d: 'Pedir o termo de adesão ao cartão, o termo de consentimento, as faturas desde o início, o comprovante do saque e o saldo devedor.', tipo: 'highlight' },
      { n: 3, t: 'Calculadora', d: 'Comparar a taxa do cartão com o teto vigente no mês da contratação (modalidade Cartão RMC ou RCC).', tipo: 'normal' },
      { n: 4, t: 'Encaminhamento', d: 'Com os documentos, o(a) defensor(a) avalia a adequação do contrato, a restituição e eventual conversão para empréstimo com parcelas fixas.', tipo: 'normal' }],
    provas: ['Extrato de empréstimos consignados (HISCON)', 'Via ofício: termo de adesão e termo de consentimento esclarecido', 'Via ofício: faturas desde a contratação', 'Comprovante do valor creditado na conta', 'Informação se o cartão físico foi recebido e usado'],
    analise: ['Se houve uso do cartão para compras (enfraquece a alegação de engano)', 'Quanto já foi descontado em relação ao valor recebido', 'Grau de escolaridade e compreensão do(a) beneficiário(a)'],
    dica: 'Pergunte de forma simples: "a pessoa recebeu um cartão? já usou para compras?" e "o desconto tem data para acabar?". As respostas orientam todo o caso.'
  },
  END_inss_margem: {
    titulo: 'Descontos Acima do Limite da Margem Consignável', severity: 'alto', urgente: false, of: 'consig_revisao', oi: true,
    descricao: 'A soma das consignações no benefício parece ultrapassar o limite legal. Para aposentadorias e pensões do RGPS o total é de 45% do benefício (35% para empréstimos, financiamentos e arrendamentos, 5% para cartão de crédito consignado e 5% para cartão consignado de benefício). No BPC o total é de 35% (30% e 5%). A instituição que retém valor acima do limite perde as garantias da lei (Lei 10.820/2003, art. 6º, § 6º). Contratos antigos podem ter sido feitos sob limites diferentes; confira a data de cada averbação.',
    teses: [{ nome: 'Violação da margem consignável', fund: 'Lei 10.820/2003, art. 6º, §§ 5º, 5º-A e 6º', key: 'min-existencial', desc: 'O limite protege a renda de natureza alimentar; o excesso deve ser corrigido e pode fundamentar a revisão das operações averbadas por último.' }],
    baseLegal: [{ lei: 'Lei 10.820/2003 — art. 6º, §§ 5º, 5º-A e 6º', desc: 'Limites da margem e perda das garantias pela retenção excessiva' }, { lei: 'CDC — art. 6º, XII', desc: 'Preservação do mínimo existencial na concessão de crédito' }],
    jurisprudencia: [],
    fluxo: [
      { n: 1, t: 'Somar as consignações', d: 'Com o HISCON e o extrato do benefício, somar todas as parcelas e calcular o percentual sobre o valor do benefício.', tipo: 'highlight' },
      { n: 2, t: 'Identificar a operação que estourou a margem', d: 'Ordenar os contratos pela data de averbação; em regra, o excesso decorre das últimas operações.', tipo: 'normal' },
      { n: 3, t: 'Ofícios', d: 'Pedir ao INSS o HISCON completo e às instituições os contratos das operações mais recentes.', tipo: 'highlight' },
      { n: 4, t: 'Encaminhamento', d: 'Levar ao(à) defensor(a) com o cálculo; avaliar também o tratamento do superendividamento.', tipo: 'normal' }],
    provas: ['HISCON com todas as consignações e datas', 'Extrato de pagamento do benefício', 'Via ofício: contratos das últimas averbações'],
    analise: ['Data de cada contrato (os limites mudaram ao longo do tempo)', 'Se há descontos em conta-corrente além das consignações (não entram na margem; ver Tema 1.085)', 'Renda total do núcleo familiar'],
    dica: 'Monte uma tabela simples: contrato, banco, parcela, data. Isso facilita o trabalho do(a) defensor(a) e evita pedidos genéricos.'
  },

  /* ─── PIX ─── */
  END_pix_med_orientacao: {
    titulo: 'Fraude via PIX — MED ainda não Pedido: Providências Imediatas', severity: 'critico', urgente: true, of: 'fraude_pix',
    descricao: 'O(a) assistido(a) foi vítima de fraude via PIX há menos de 80 dias e ainda não pediu o Mecanismo Especial de Devolução (MED). O MED, previsto no Regulamento do Pix do Banco Central, permite bloquear e devolver valores ainda disponíveis nas contas que receberam a transferência. Desde fevereiro de 2026 (MED 2.0) o rastreamento alcança transferências sucessivas entre contas. O pedido deve ser feito pelo canal de contestação no aplicativo do banco do pagador ou pela central. A responsabilidade do banco por falha de segurança é discutida à parte.',
    teses: [
      { nome: 'Fortuito interno', fund: 'STJ Súmula 479; CDC art. 14', key: 'fortuito-int', desc: 'Fraudes ligadas a falhas nos mecanismos de segurança do banco integram o risco da atividade.' },
      { nome: 'Falha na detecção de operação atípica', fund: 'CDC art. 14, § 1º', key: 'risco-empreend', desc: 'Transações incompatíveis com o perfil do cliente devem ser barradas ou confirmadas; a ausência de bloqueio pode caracterizar defeito do serviço.' }],
    baseLegal: [{ lei: 'Regulamento do Pix (Resolução BCB 1/2020 e alterações)', desc: 'Mecanismo Especial de Devolução (MED) e bloqueio cautelar' }, { lei: 'CDC — art. 14', desc: 'Responsabilidade do fornecedor por defeito na prestação do serviço' }, { lei: 'CP — art. 171', desc: 'Estelionato (registro de boletim de ocorrência)' }],
    jurisprudencia: [_S479, { tipo: 'prec', ref: 'STJ — REsp 1.995.458/SP (3ª Turma, 2022)', ementa: 'O banco responde quando permite transações que destoam do perfil de consumo do correntista, caracterizando falha na prestação do serviço.' }],
    fluxo: [
      { n: 1, t: 'Pedir o MED agora', d: 'No aplicativo do banco: área Pix > contestar ou "reportar fraude" na transação. Sem a opção, ligar na central e pedir expressamente o acionamento do MED. Anotar o protocolo.', tipo: 'urgent' },
      { n: 2, t: 'Boletim de ocorrência', d: 'Registrar B.O. (Delegacia Eletrônica de SP) por estelionato, com prints e comprovantes.', tipo: 'urgent' },
      { n: 3, t: 'Ofício ao banco', d: 'Se o MED for negado ou não houver resposta, pedir o extrato, os registros de acesso, o protocolo do MED e a justificativa.', tipo: 'highlight' },
      { n: 4, t: 'Encaminhamento', d: 'Avaliar com o(a) defensor(a) a responsabilidade do banco, considerando o perfil das transações e a conduta da vítima.', tipo: 'normal' }],
    provas: ['Comprovantes das transferências (data, hora, valor, chave e destinatário)', 'Protocolo do pedido de MED', 'Boletim de ocorrência', 'Prints das conversas com o golpista', 'Extrato da conta mostrando o padrão habitual de movimentação'],
    analise: ['Se a própria vítima fez o PIX enganada ou se houve invasão da conta', 'Se as transações destoavam do perfil habitual (valores, horários, sequência)', 'Se a vítima forneceu senhas ou códigos (pode haver discussão de culpa concorrente)'],
    dica: 'O tempo é decisivo: o MED só devolve o que ainda está nas contas de destino. Faça o pedido com o(a) assistido(a) ainda no atendimento, pelo aplicativo dele(a).'
  },
  END_pix_med_acionado: {
    titulo: 'MED Pedido — Acompanhamento e Alternativas', severity: 'moderado', urgente: false, of: 'fraude_pix',
    descricao: 'O MED já foi pedido. A devolução depende de haver saldo nas contas que receberam os valores; pode ser total, parcial ou negada. Com resposta negativa ou parcial, a responsabilidade do banco pela falha de segurança pode ser avaliada à parte, conforme as circunstâncias do caso.',
    teses: [{ nome: 'Fortuito interno', fund: 'STJ Súmula 479', key: 'fortuito-int', desc: 'A insuficiência de saldo nas contas de destino não afasta, por si só, a análise da responsabilidade do banco pela falha de segurança.' }],
    baseLegal: [{ lei: 'Regulamento do Pix (Resolução BCB 1/2020 e alterações)', desc: 'Procedimento do MED' }, { lei: 'CDC — art. 14', desc: 'Defeito na prestação do serviço' }, { lei: 'Resolução CMN 4.860/2020', desc: 'Ouvidoria das instituições financeiras' }],
    jurisprudencia: [_S479],
    fluxo: [
      { n: 1, t: 'Acompanhar o protocolo', d: 'Verificar no aplicativo a situação do pedido e guardar a resposta por escrito.', tipo: 'normal' },
      { n: 2, t: 'Ouvidoria e BACEN', d: 'Sem resposta adequada, registrar reclamação na Ouvidoria do banco e no Banco Central (canal de reclamações do BCB).', tipo: 'normal' },
      { n: 3, t: 'Ofício e encaminhamento', d: 'Pedir por ofício a resposta fundamentada do MED e os registros da transação; levar ao(à) defensor(a).', tipo: 'highlight' }],
    provas: ['Protocolo e resposta do MED', 'Comprovantes das transferências', 'Boletim de ocorrência', 'Protocolos de SAC e Ouvidoria'],
    analise: ['Valor recuperado e valor ainda em aberto', 'Perfil das transações e conduta da vítima'],
    dica: 'Peça sempre a resposta do MED por escrito. A negativa sem justificativa é elemento importante para a análise do caso.'
  },
  END_pix_sem_med_prazo: {
    titulo: 'Fraude via PIX — Prazo do MED Encerrado', severity: 'alto', urgente: false, of: 'fraude_pix',
    descricao: 'Passaram-se mais de 80 dias da transação, prazo para o pedido do MED. A recuperação passa a depender da análise da responsabilidade do banco (falha de segurança, transações fora do perfil, contas de destino abertas sem verificação adequada) e da via judicial, se cabível.',
    teses: [{ nome: 'Fortuito interno', fund: 'STJ Súmula 479; CDC art. 14', key: 'fortuito-int', desc: 'Independe do MED: é preciso demonstrar a falha do serviço no caso concreto.' }],
    baseLegal: [{ lei: 'CDC — art. 14', desc: 'Responsabilidade por defeito do serviço' }, { lei: 'Lei 9.099/1995', desc: 'Juizado Especial Cível: sem advogado até 20 salários-mínimos; com advogado até 40' }],
    jurisprudencia: [_S479, { tipo: 'prec', ref: 'STJ — REsp 1.995.458/SP (3ª Turma, 2022)', ementa: 'O banco responde quando permite transações que destoam do perfil de consumo do correntista.' }],
    fluxo: [
      { n: 1, t: 'Reunir as provas', d: 'Comprovantes, B.O., conversas e extrato com o padrão habitual de movimentação.', tipo: 'normal' },
      { n: 2, t: 'Ofício ao banco', d: 'Pedir registros de acesso, dispositivo, perfil de limites e eventual análise interna da fraude.', tipo: 'highlight' },
      { n: 3, t: 'Encaminhamento', d: 'Levar ao(à) defensor(a) para avaliar a viabilidade da ação e o juízo competente.', tipo: 'normal' }],
    provas: ['Comprovantes das transferências', 'Boletim de ocorrência', 'Prints das conversas', 'Extrato de 6 a 12 meses anteriores (perfil habitual)'],
    analise: ['Se a vítima entregou senha ou código', 'Se houve alerta do banco ignorado', 'Valor da causa e juízo adequado'],
    dica: 'O extrato dos meses anteriores à fraude é a prova de que as operações eram atípicas. Peça-o sempre.'
  },
  END_falso_emprestimo: {
    titulo: 'Golpe do Falso Empréstimo — Pagamento Antecipado de "Taxas"', severity: 'alto', urgente: true, of: 'fraude_pix',
    descricao: 'O(a) assistido(a) pagou "taxa de liberação", "seguro", "imposto" ou "caução" para receber um empréstimo que nunca foi liberado. Instituições autorizadas não cobram pagamento antecipado para liberar crédito. Trata-se de estelionato. Se o pagamento foi por PIX há menos de 80 dias, pedir o MED imediatamente. A responsabilidade de bancos depende do caso: pode ser discutida, por exemplo, quanto à conta que recebeu os valores, se aberta ou mantida sem verificação adequada.',
    teses: [{ nome: 'Responsabilidade pela conta de destino', fund: 'CDC art. 14; Resolução CMN 4.753/2019', key: 'risco-empreend', desc: 'Contas usadas por golpistas e abertas sem verificação de identidade adequada podem gerar responsabilidade da instituição que as mantém, conforme as provas.' }],
    baseLegal: [{ lei: 'CP — art. 171', desc: 'Estelionato' }, { lei: 'Regulamento do Pix', desc: 'MED, se o pagamento foi por PIX' }, { lei: 'Resolução CMN 4.753/2019', desc: 'Requisitos de identificação para abertura de contas' }],
    jurisprudencia: [_S479],
    fluxo: [
      { n: 1, t: 'MED e B.O.', d: 'Se o pagamento foi por PIX há menos de 80 dias, pedir o MED no aplicativo; registrar B.O. em qualquer caso.', tipo: 'urgent' },
      { n: 2, t: 'Identificar o destinatário', d: 'Anotar nome, banco e chave de quem recebeu os valores (consta do comprovante).', tipo: 'normal' },
      { n: 3, t: 'Ofício', d: 'Pedir ao banco do assistido o protocolo do MED e os dados da transação; avaliar com o(a) defensor(a) ofício ao banco de destino.', tipo: 'highlight' }],
    provas: ['Comprovantes de pagamento', 'Anúncio, site ou perfil usado no golpe', 'Conversas com o golpista', 'Boletim de ocorrência'],
    analise: ['Se o golpista usou nome de instituição real (pode haver dever de alerta da instituição)', 'Meio de pagamento usado (PIX, boleto, depósito)'],
    dica: 'Oriente o(a) assistido(a) a desconfiar de qualquer pedido de pagamento antecipado e a consultar se a empresa é autorizada no site do Banco Central.'
  },

  /* ─── CRÉDITO PESSOAL ─── */
  END_cre_juros: {
    titulo: 'Empréstimo Pessoal — Conferência dos Juros com a Média do BACEN', severity: 'moderado', urgente: false, of: 'credito_pessoal', calc: 'pessoal',
    descricao: 'O(a) assistido(a) tem o contrato e quer saber se a taxa é abusiva. Juros altos não são ilegais por si sós (Súmula 382 do STJ). A revisão é excepcional e exige demonstrar discrepância relevante em relação à taxa média de mercado da mesma modalidade no mês da contratação, além de conferir CET, tarifas, seguros e encargos de mora.',
    teses: [{ nome: 'Revisão de juros remuneratórios', fund: 'CDC art. 51, IV e § 1º; STJ Tema 27', key: 'quebra-base', desc: 'Admitida quando a abusividade fica demonstrada no caso concreto, usando a média do BACEN como referência.' }],
    baseLegal: [{ lei: 'CDC — art. 51, IV e § 1º', desc: 'Nulidade de cláusula que coloca o consumidor em desvantagem exagerada' }, { lei: 'Resolução CMN 4.881/2020', desc: 'Cálculo e informação do Custo Efetivo Total (CET)' }],
    jurisprudencia: [_T27, _S382, _S539],
    fluxo: [
      { n: 1, t: 'Calculadora', d: 'Abrir a calculadora em "Crédito Pessoal Não Consignado", informar mês, taxa, CET, valor e prazo.', tipo: 'highlight' },
      { n: 2, t: 'Ofício', d: 'Se faltar algum dado (CET, planilha, seguros), pedir à instituição.', tipo: 'normal' },
      { n: 3, t: 'Encaminhamento', d: 'Com o relatório da calculadora, levar ao(à) defensor(a).', tipo: 'normal' }],
    provas: ['Contrato com taxa mensal, anual e CET', 'Extrato com os débitos das parcelas', 'Relatório da calculadora'],
    analise: ['Se havia garantia (taxas menores) ou não', 'Perfil de risco e circunstâncias da contratação'],
    dica: 'Use a comparação com a média do próprio banco (campo "Banco do contrato" da calculadora): é o argumento mais específico.'
  },
  END_cre_sem_contrato: {
    titulo: 'Empréstimo sem Contrato Disponível — Taxa Média como Referência', severity: 'info', urgente: false, of: 'credito_pessoal', calc: 'pessoal',
    descricao: 'Sem o contrato não é possível conferir a taxa pactuada. O primeiro passo é pedir o instrumento à instituição. Se ele não for apresentado, a jurisprudência aplica a taxa média de mercado da mesma espécie divulgada pelo BACEN, salvo se a cobrada for mais vantajosa ao devedor (Súmula 530 do STJ).',
    teses: [{ nome: 'Taxa média na falta do contrato', fund: 'STJ Súmula 530', key: 'boa-fe-obj', desc: 'O ônus de apresentar o contrato é da instituição; na sua falta, aplica-se a média de mercado.' }],
    baseLegal: [{ lei: 'CDC — arts. 6º, III, 43 e 54-G, II', desc: 'Direito à informação e à cópia do contrato' }],
    jurisprudencia: [_S530],
    fluxo: [{ n: 1, t: 'Ofício requisitando o contrato', d: 'Gerar na aba Documentos com o modelo de crédito pessoal.', tipo: 'highlight' }, { n: 2, t: 'Registrato', d: 'Consultar com o assistido para confirmar contrato, valor e data.', tipo: 'normal' }],
    provas: ['Registrato', 'Extratos com os débitos', 'Via ofício: contrato, CET e planilha'],
    analise: ['Valor recebido e valor já pago'],
    dica: 'Com a data aproximada e o valor, a calculadora já mostra a média do BACEN do mês, útil para estimar o impacto.'
  },
  END_cre_desconto_conta: {
    titulo: 'Descontos de Empréstimos na Conta-Corrente Consumindo a Renda', severity: 'alto', urgente: false, of: 'superendividamento',
    descricao: 'Parcelas de empréstimos comuns são debitadas diretamente na conta em que o(a) assistido(a) recebe salário ou benefício, deixando-o(a) sem recursos. O STJ entende lícitos esses débitos quando autorizados, sem aplicar por analogia o limite da Lei 10.820/2003 (Tema 1.085). A autorização pode ser revogada, e o comprometimento da renda deve ser tratado à luz da Lei do Superendividamento, que protege o mínimo existencial.',
    teses: [{ nome: 'Preservação do mínimo existencial', fund: 'CDC arts. 6º, XI e XII, e 104-A', key: 'min-existencial', desc: 'Repactuação global das dívidas com plano de pagamento que preserve o mínimo existencial.' }],
    baseLegal: [{ lei: 'CDC — arts. 54-A a 54-G e 104-A a 104-C', desc: 'Prevenção e tratamento do superendividamento' }, { lei: 'Resolução CMN 4.790/2020', desc: 'Autorização e cancelamento de débitos em conta' }],
    jurisprudencia: [_T1085],
    fluxo: [
      { n: 1, t: 'Mapear débitos e renda', d: 'Listar os débitos do extrato, os credores e a renda líquida.', tipo: 'highlight' },
      { n: 2, t: 'Revogação da autorização', d: 'Avaliar com o(a) defensor(a) o pedido de cancelamento da autorização de débito, ciente de que a dívida continua devida.', tipo: 'normal' },
      { n: 3, t: 'Superendividamento', d: 'Se o comprometimento for elevado, seguir para o tratamento do superendividamento.', tipo: 'normal' }],
    provas: ['Extratos dos últimos 3 a 6 meses', 'Comprovante de renda', 'Registrato'],
    analise: ['Se há contratos posteriores à percepção da dificuldade', 'Despesas essenciais do núcleo familiar'],
    dica: 'Cancelar o débito sem plano pode gerar negativação. Oriente o(a) assistido(a) a não tomar a decisão sozinho(a).'
  },
  END_cre_reneg_agravada: {
    titulo: 'Renegociação que Agravou o Endividamento', severity: 'moderado', urgente: false, of: 'superendividamento', calc: 'renegociacao',
    descricao: 'O(a) assistido(a) fez acordo ou "refinanciamento" e a dívida aumentou: prazo maior, novos juros sobre juros vencidos, inclusão de seguros ou tarifas. É preciso comparar o saldo anterior, o valor do novo contrato, a taxa e o total a pagar, e verificar se houve informação clara e avaliação responsável da capacidade de pagamento.',
    teses: [{ nome: 'Crédito responsável', fund: 'CDC arts. 54-C e 54-D', key: 'boa-fe-obj', desc: 'O descumprimento dos deveres de informação e de avaliação responsável pode levar à redução dos juros e à dilação do prazo (art. 54-D, parágrafo único).' }],
    baseLegal: [{ lei: 'CDC — arts. 52, 54-C, 54-D e 104-A', desc: 'Informação, crédito responsável e repactuação' }],
    jurisprudencia: [_T27],
    fluxo: [{ n: 1, t: 'Comparar antes e depois', d: 'Saldo devedor anterior, novo valor, taxa, CET, prazo e total a pagar.', tipo: 'highlight' }, { n: 2, t: 'Ofício', d: 'Pedir o contrato original, o de renegociação e a evolução da dívida.', tipo: 'normal' }, { n: 3, t: 'Encaminhamento', d: 'Avaliar revisão ou repactuação global.', tipo: 'normal' }],
    provas: ['Contrato original e de renegociação', 'Extratos', 'Propostas de acordo recebidas'],
    analise: ['Se houve "troco" liberado na renegociação', 'Comprometimento da renda após o acordo'],
    dica: 'Use a calculadora em "Renegociação de Crédito Pessoal" para comparar a taxa do acordo com a média do mês.'
  },
  END_cre_pos_quitacao: {
    titulo: 'Cobrança de Dívida já Quitada', severity: 'moderado', urgente: false, of: 'negativacao',
    descricao: 'O(a) assistido(a) continua sendo cobrado(a) por dívida que afirma ter quitado. Cobrar o que já foi pago é indevido e, havendo pagamento do valor cobrado, cabe a repetição em dobro quando a cobrança contrariar a boa-fé objetiva (CDC, art. 42, parágrafo único, conforme o EAREsp 676.608/RS). Se houver negativação, o credor deve excluí-la em 5 dias úteis após o pagamento (Súmula 548).',
    teses: [{ nome: 'Repetição do indébito', fund: 'CDC art. 42, parágrafo único', key: 'boa-fe-obj', desc: 'Quem paga o que não deve tem direito à restituição, em dobro quando presentes os requisitos.' }],
    baseLegal: [{ lei: 'CDC — art. 42, parágrafo único', desc: 'Repetição do indébito' }, { lei: 'CC — art. 320', desc: 'Quitação e seus requisitos' }],
    jurisprudencia: [_EA676, { tipo: 'sumula', ref: 'STJ — Súmula 548', ementa: 'Incumbe ao credor a exclusão do registro da dívida em nome do devedor no cadastro de inadimplentes no prazo de cinco dias úteis, a partir do integral e efetivo pagamento do débito.' }],
    fluxo: [{ n: 1, t: 'Reunir a quitação', d: 'Comprovantes de pagamento, termo de quitação ou acordo.', tipo: 'highlight' }, { n: 2, t: 'Ofício', d: 'Pedir o demonstrativo do débito e a informação sobre cessão a terceiros.', tipo: 'normal' }],
    provas: ['Comprovantes de pagamento', 'Termo de quitação', 'Cobranças recebidas após a quitação'],
    analise: ['Se a dívida foi cedida a outra empresa antes do pagamento', 'Se houve pagamento em duplicidade'],
    dica: 'Peça sempre a declaração de quitação por escrito ao final de qualquer acordo.'
  },
  END_cre_cheque: {
    titulo: 'Cheque Especial — Uso Prolongado e Juros', severity: 'moderado', urgente: false, of: 'credito_pessoal', calc: 'cheque_esp',
    descricao: 'O saldo negativo do cheque especial cresce com juros elevados. Desde 06/01/2020 os juros do cheque especial são limitados a 8% ao mês (Resolução CMN 4.765/2019). A instituição deve informar o uso e oferecer alternativa mais barata. Conferir a taxa cobrada, as tarifas e se o limite foi concedido ou aumentado sem pedido.',
    teses: [{ nome: 'Teto regulatório', fund: 'Resolução CMN 4.765/2019', key: 'abuso-direito', desc: 'Taxa acima de 8% a.m. após 06/01/2020 contraria norma do CMN.' }],
    baseLegal: [{ lei: 'Resolução CMN 4.765/2019', desc: 'Limite de 8% a.m. para os juros do cheque especial (vigência 06/01/2020)' }, { lei: 'CDC — art. 39, III', desc: 'Serviço não solicitado (limite concedido ou aumentado sem pedido)' }],
    jurisprudencia: [],
    fluxo: [{ n: 1, t: 'Calculadora', d: 'Modalidade "Cheque Especial": compara a taxa com o teto e com a média do BACEN.', tipo: 'highlight' }, { n: 2, t: 'Renegociar', d: 'Avaliar a troca da dívida por empréstimo com taxa menor.', tipo: 'normal' }],
    provas: ['Extratos com os juros cobrados', 'Contrato de abertura de conta e de limite'],
    analise: ['Desde quando o saldo está negativo', 'Se o limite foi aumentado sem pedido'],
    dica: 'Os juros aparecem no extrato como "JUROS CHEQUE ESPECIAL" ou "ENCARGOS LIMITE". Some os últimos 12 meses.'
  },

  /* ─── TARIFAS, SEGUROS E SERVIÇOS ─── */
  END_tar_pacote: {
    titulo: 'Pacote de Tarifas ou Tarifa de Conta não Contratados', severity: 'moderado', urgente: false, of: 'conta_tarifas',
    descricao: 'A conta tem cobrança de pacote de serviços ou tarifas que o(a) assistido(a) não contratou. As instituições devem oferecer gratuitamente os serviços essenciais (Resolução CMN 3.919/2010) e a conta-salário não admite cobrança de tarifas pelos serviços básicos (Resolução CMN 3.402/2006). O pacote exige adesão. Conferir o contrato de abertura de conta.',
    teses: [{ nome: 'Serviço não solicitado', fund: 'CDC art. 39, III; art. 42, parágrafo único', key: 'abuso-direito', desc: 'Sem adesão comprovada, a cobrança é indevida e os valores devem ser restituídos.' }],
    baseLegal: [{ lei: 'Resolução CMN 3.919/2010', desc: 'Tarifas bancárias e serviços essenciais gratuitos' }, { lei: 'Resolução CMN 3.402/2006', desc: 'Conta-salário' }, { lei: 'CDC — art. 39, III', desc: 'Serviço não solicitado' }],
    jurisprudencia: [_EA676],
    fluxo: [{ n: 1, t: 'Extrato de 12 meses', d: 'Identificar e somar as tarifas.', tipo: 'normal' }, { n: 2, t: 'Contestação e ofício', d: 'Pedir o termo de adesão ao pacote e a restituição; registrar reclamação no SAC.', tipo: 'highlight' }],
    provas: ['Extratos', 'Contrato de abertura de conta', 'Via ofício: termo de adesão ao pacote'],
    analise: ['Tipo de conta (salário, benefício, corrente)', 'Uso de serviços além dos essenciais'],
    dica: 'Pedir a migração para o pacote de serviços essenciais gratuitos resolve o problema daqui para frente.'
  },
  END_tar_seguro: {
    titulo: 'Seguro, Capitalização ou Assistência não Contratados', severity: 'moderado', urgente: false, of: 'conta_tarifas',
    descricao: 'Há cobrança de seguro, título de capitalização ou assistência que o(a) assistido(a) afirma não ter contratado, ou que foi vinculada a outro produto como condição. A venda casada é vedada (CDC, art. 39, I) e o consumidor não pode ser obrigado a contratar seguro com a instituição ou seguradora por ela indicada (STJ, Tema 972).',
    teses: [{ nome: 'Venda casada', fund: 'CDC art. 39, I; STJ Tema 972', key: 'abuso-direito', desc: 'Sem contratação livre e informada, o produto deve ser cancelado e os valores restituídos.' }],
    baseLegal: [{ lei: 'CDC — art. 39, I e III', desc: 'Venda casada e produto não solicitado' }, { lei: 'CDC — art. 42, parágrafo único', desc: 'Repetição do indébito' }],
    jurisprudencia: [_T972, _EA676],
    fluxo: [{ n: 1, t: 'Identificar o produto', d: 'Nome da seguradora ou da empresa, valor e data de início.', tipo: 'normal' }, { n: 2, t: 'Ofício e cancelamento', d: 'Pedir a apólice ou o título e a prova da contratação; solicitar cancelamento e restituição.', tipo: 'highlight' }],
    provas: ['Extratos ou faturas com o lançamento', 'Via ofício: apólice ou título e prova da adesão'],
    analise: ['Se o produto foi oferecido junto com empréstimo ou abertura de conta', 'Se houve uso de algum benefício do produto'],
    dica: 'Seguros prestamistas aparecem muitas vezes embutidos no valor financiado; confira também o contrato de crédito.'
  },
  END_tar_debito: {
    titulo: 'Débito Automático não Autorizado', severity: 'moderado', urgente: false, of: 'conta_tarifas',
    descricao: 'Há débitos automáticos em favor de empresa que o(a) assistido(a) não autorizou. O débito em conta depende de autorização do titular, que pode cancelá-la (Resolução CMN 4.790/2020). O banco deve apresentar a autorização que embasou os débitos.',
    teses: [{ nome: 'Débito sem autorização', fund: 'CDC arts. 14 e 42', key: 'risco-empreend', desc: 'O banco responde pelos débitos realizados sem autorização válida do correntista.' }],
    baseLegal: [{ lei: 'Resolução CMN 4.790/2020', desc: 'Débitos em conta: autorização e cancelamento' }, { lei: 'CDC — art. 14', desc: 'Defeito do serviço' }],
    jurisprudencia: [_S479],
    fluxo: [{ n: 1, t: 'Cancelar o débito', d: 'Pedir ao banco o cancelamento imediato da autorização.', tipo: 'highlight' }, { n: 2, t: 'Ofício', d: 'Pedir a autorização apresentada pela empresa e a restituição.', tipo: 'normal' }],
    provas: ['Extratos com os débitos', 'Protocolo do cancelamento'],
    analise: ['Se a empresa tem vínculo com alguma contratação anterior'],
    dica: 'Ao cancelar, peça o número de protocolo e confira o extrato do mês seguinte.'
  },

  /* ─── CONSÓRCIO ─── */
  END_con_restituicao_devida: {
    titulo: 'Consórcio Encerrado — Restituição ao Excluído Devida', severity: 'moderado', urgente: false, of: 'consorcio', calc: 'consorcio',
    descricao: 'O(a) assistido(a) saiu do grupo e o grupo já se encerrou, mas a restituição não foi paga. O excluído não contemplado tem direito à devolução do que pagou ao fundo comum, calculada pelo percentual amortizado do valor do bem na data da assembleia, com os rendimentos da aplicação (Lei 11.795/2008, art. 30). A taxa de administração proporcional ao período de participação, em regra, não é devolvida; multas ou cláusulas penais dependem de previsão e de prova de prejuízo ao grupo.',
    teses: [{ nome: 'Restituição do fundo comum', fund: 'Lei 11.795/2008, art. 30; CDC art. 53, § 2º', key: 'boa-fe-obj', desc: 'Devolução atualizada do valor pago ao fundo comum, com desconto apenas das parcelas previstas em lei e no contrato.' }],
    baseLegal: [{ lei: 'Lei 11.795/2008 — arts. 22, § 2º, e 30', desc: 'Participação do excluído nos sorteios e restituição' }, { lei: 'CDC — art. 53, § 2º', desc: 'Desconto, na restituição, da vantagem econômica e dos prejuízos causados ao grupo' }],
    jurisprudencia: [_T312, _S538],
    fluxo: [{ n: 1, t: 'Calcular a restituição', d: 'Usar a calculadora de Consórcio com as parcelas pagas e as taxas do contrato.', tipo: 'highlight' }, { n: 2, t: 'Ofício', d: 'Pedir extrato da cota, data de encerramento e demonstrativo do valor a restituir.', tipo: 'highlight' }, { n: 3, t: 'Encaminhamento', d: 'Sem pagamento, levar ao(à) defensor(a).', tipo: 'normal' }],
    provas: ['Contrato de adesão', 'Comprovantes das parcelas pagas', 'Extrato da cota', 'Comunicação de encerramento do grupo'],
    analise: ['Data do contrato (antes ou depois da Lei 11.795/2008)', 'Se há cláusula penal e se houve prejuízo ao grupo'],
    dica: 'O extrato da cota separa fundo comum, taxa de administração, fundo de reserva e seguro: peça-o sempre, ele é a base do cálculo.'
  },
  END_con_restituicao_aguardar: {
    titulo: 'Consórcio em Andamento — Restituição por Sorteio ou no Encerramento', severity: 'baixo', urgente: false, of: 'consorcio', calc: 'consorcio',
    descricao: 'O grupo continua ativo. A cota do excluído concorre aos sorteios apenas para restituição (Lei 11.795/2008, art. 22, § 2º); se sorteada, o valor é devolvido nos termos do art. 30. Se não for sorteada, a devolução ocorre com o encerramento do grupo. Convém conferir os valores e manter o acompanhamento das assembleias.',
    teses: [{ nome: 'Restituição pelo sorteio', fund: 'Lei 11.795/2008, arts. 22, § 2º, e 30', key: 'boa-fe-obj', desc: 'A administradora deve incluir a cota excluída nos sorteios e informar o resultado.' }],
    baseLegal: [{ lei: 'Lei 11.795/2008 — arts. 22, § 2º, e 30', desc: 'Restituição ao excluído' }],
    jurisprudencia: [_T312],
    fluxo: [{ n: 1, t: 'Ofício', d: 'Pedir extrato da cota, situação, data prevista de encerramento e confirmação de que a cota concorre aos sorteios.', tipo: 'highlight' }, { n: 2, t: 'Estimar o valor', d: 'Calculadora de Consórcio para estimar a restituição.', tipo: 'normal' }],
    provas: ['Contrato', 'Comprovantes das parcelas', 'Extrato da cota'],
    analise: ['Prazo restante do grupo', 'Se há interesse em retomar a cota'],
    dica: 'Anote a data prevista de encerramento no relato: ela define quando cobrar a restituição.'
  },
  END_con_contemplado: {
    titulo: 'Consórcio Contemplado sem Liberação do Crédito', severity: 'moderado', urgente: false, of: 'consorcio',
    descricao: 'O(a) assistido(a) foi contemplado(a), mas o crédito não é liberado. A administradora pode exigir garantias proporcionais ao saldo devedor e documentos previstos no contrato, mas exigências desproporcionais ou não previstas podem ser abusivas. Conferir o regulamento do grupo e as exigências feitas por escrito.',
    teses: [{ nome: 'Exigência abusiva', fund: 'CDC arts. 39, V, e 51, IV', key: 'abuso-direito', desc: 'Exigências sem previsão contratual ou desproporcionais podem ser afastadas.' }],
    baseLegal: [{ lei: 'Lei 11.795/2008', desc: 'Contemplação e utilização do crédito' }, { lei: 'CDC — arts. 39, V, e 51, IV', desc: 'Vantagem excessiva e cláusula abusiva' }],
    jurisprudencia: [],
    fluxo: [{ n: 1, t: 'Exigências por escrito', d: 'Pedir à administradora a lista de documentos e garantias exigidos.', tipo: 'normal' }, { n: 2, t: 'Ofício', d: 'Pedir o regulamento do grupo e a justificativa da não liberação.', tipo: 'highlight' }],
    provas: ['Comunicação da contemplação', 'Exigências feitas pela administradora', 'Regulamento do grupo'],
    analise: ['Saldo devedor e garantias oferecidas', 'Renda comprovável do(a) assistido(a)'],
    dica: 'Peça as exigências por e-mail. Exigência só verbal é difícil de contestar.'
  },
  END_con_cobranca: {
    titulo: 'Consórcio — Cobranças, Reajustes ou Seguro a Conferir', severity: 'baixo', urgente: false, of: 'consorcio', calc: 'consorcio',
    descricao: 'A parcela do consórcio é reajustada conforme o valor do bem de referência e inclui fundo comum, taxa de administração e, em geral, fundo de reserva e seguro. O STJ admite taxa de administração acima de 10% (Súmula 538). É preciso conferir se os percentuais cobrados correspondem ao contrato e se o seguro foi contratado livremente.',
    teses: [{ nome: 'Cobrança conforme o contrato', fund: 'CDC arts. 6º, III, e 39, I', key: 'boa-fe-obj', desc: 'Valores fora do pactuado e seguro imposto podem ser questionados.' }],
    baseLegal: [{ lei: 'Lei 11.795/2008', desc: 'Composição das parcelas e reajustes' }, { lei: 'CDC — art. 39, I', desc: 'Venda casada' }],
    jurisprudencia: [_S538],
    fluxo: [{ n: 1, t: 'Calculadora de Consórcio', d: 'Montar a composição esperada da parcela e comparar com o boleto.', tipo: 'highlight' }, { n: 2, t: 'Ofício', d: 'Pedir o extrato da cota com a discriminação de cada parcela.', tipo: 'normal' }],
    provas: ['Contrato', 'Boletos', 'Extrato da cota'],
    analise: ['Índice de reajuste do bem de referência'],
    dica: 'Some taxa de administração, fundo de reserva e seguro: é o custo real do consórcio, comparável aos juros de um financiamento.'
  },
  END_con_venda_enganosa: {
    titulo: 'Consórcio Vendido com Promessa de Contemplação ou "Carta Contemplada"', severity: 'alto', urgente: true, of: 'consorcio',
    descricao: 'O vendedor garantiu contemplação rápida, prometeu crédito imediato ou vendeu cota "já contemplada". Em consórcio a contemplação depende de sorteio ou lance, e a promessa de contemplação garantida pode configurar publicidade enganosa ou fraude. A oferta vincula o fornecedor (CDC, art. 30) e a administradora responde pelos atos de seus representantes (art. 34). Se houve pagamento a terceiros fora da administradora, pode tratar-se de golpe: registrar boletim de ocorrência.',
    teses: [{ nome: 'Oferta enganosa', fund: 'CDC arts. 30, 34, 37 e 6º, III', key: 'aparencia', desc: 'A promessa feita pelo vendedor integra o contrato e a administradora responde por seus representantes; cabe anulação ou devolução integral, conforme as provas.' }],
    baseLegal: [{ lei: 'CDC — arts. 30, 34 e 37', desc: 'Vinculação da oferta, responsabilidade pelos representantes e publicidade enganosa' }, { lei: 'CP — art. 171', desc: 'Estelionato, se houver golpe' }],
    jurisprudencia: [],
    fluxo: [{ n: 1, t: 'Reunir provas da promessa', d: 'Conversas, áudios, anúncios, nome do vendedor.', tipo: 'urgent' }, { n: 2, t: 'Ofício à administradora', d: 'Pedir contrato, gravações da venda e identificação do representante.', tipo: 'highlight' }, { n: 3, t: 'Encaminhamento', d: 'Levar ao(à) defensor(a) com as provas.', tipo: 'normal' }],
    provas: ['Conversas e áudios com o vendedor', 'Contrato e proposta', 'Comprovantes de pagamento (a quem foi pago)'],
    analise: ['Se o pagamento foi à administradora ou a terceiro', 'Se a administradora é autorizada pelo Banco Central'],
    dica: 'Pergunte a quem foi feito o pagamento. Se foi para pessoa física ou empresa diferente da administradora, trate como possível golpe.'
  },

  /* ─── VEÍCULO ─── */
  END_vei_purga_urgente: {
    titulo: '⏱️ Prazo em Curso — 5 Dias da Apreensão para Pagar a Integralidade da Dívida', severity: 'critico', urgente: true, of: 'veiculo', calc: 'veiculo_aquis',
    descricao: 'O veículo foi apreendido em ação de busca e apreensão. Cinco dias após a execução da liminar a propriedade se consolida em favor do credor; nesse prazo o devedor pode pagar a integralidade da dívida pendente, segundo os valores apresentados pelo credor na inicial, e o bem lhe é restituído (DL 911/69, art. 3º, §§ 1º e 2º; STJ, Temas 722 e 1.279). O prazo é de direito material e corre em dias corridos. A resposta pode ser apresentada em 15 dias da execução da liminar, inclusive para discutir valores pagos a maior (§§ 3º e 4º).',
    teses: [{ nome: 'Controle dos valores e da mora', fund: 'DL 911/69, arts. 2º, § 2º, e 3º, § 4º; STJ Tema 1.132', key: 'boa-fe-obj', desc: 'A defesa pode discutir a comprovação da mora, os valores apresentados pelo credor e encargos indevidos; a abusividade de encargos acessórios, por si só, não afasta a mora (Tema 972).' }],
    baseLegal: [{ lei: 'DL 911/1969 — art. 3º, §§ 1º a 4º', desc: 'Consolidação em 5 dias da execução da liminar, pagamento da integralidade e resposta em 15 dias' }, { lei: 'DL 911/1969 — art. 3º, §§ 6º e 7º', desc: 'Multa de 50% do valor financiado se a ação for julgada improcedente e o bem já tiver sido alienado' }, { lei: 'CDC — art. 53', desc: 'Vedação da perda total das prestações pagas' }],
    jurisprudencia: [_T722, _T1279, _R1770, _R1622],
    fluxo: [
      { n: 1, t: 'Levar ao(à) defensor(a) hoje', d: 'Com a data da apreensão anotada e a cópia do mandado ou do auto de apreensão.', tipo: 'urgent' },
      { n: 2, t: 'Valor para pagamento', d: 'Conferir na petição inicial o valor da integralidade da dívida (parcelas vencidas e vincendas) e verificar se há recursos para pagar no prazo.', tipo: 'urgent' },
      { n: 3, t: 'Resposta em 15 dias', d: 'O(a) defensor(a) avalia a resposta: comprovação da mora, valores cobrados, encargos e eventual pagamento a maior.', tipo: 'highlight' },
      { n: 4, t: 'Depois da venda', d: 'Se o bem for vendido, o credor deve prestar contas e entregar eventual saldo ao devedor (DL 911/69, art. 2º).', tipo: 'normal' }],
    provas: ['Mandado e auto de busca e apreensão (data do cumprimento)', 'Cópia da petição inicial com o valor da dívida', 'Contrato de financiamento', 'Comprovantes das parcelas pagas', 'Notificação de constituição em mora'],
    analise: ['Se a notificação foi enviada ao endereço do contrato', 'Se o valor cobrado inclui encargos não pactuados', 'Capacidade real de pagar a integralidade'],
    dica: 'Não confunda: o prazo de 5 dias é para pagar a integralidade da dívida apresentada na inicial, não só as parcelas atrasadas.'
  },
  END_vei_risco: {
    titulo: 'Atraso de 3 ou Mais Parcelas — Risco de Busca e Apreensão', severity: 'alto', urgente: true, of: 'veiculo', calc: 'veiculo_aquis',
    descricao: 'Com parcelas em atraso, o credor pode comprovar a mora por carta registrada enviada ao endereço do contrato, ainda que não recebida pessoalmente (DL 911/69, art. 2º, § 2º; STJ, Tema 1.132), e pedir a busca e apreensão judicial ou, se previsto em cláusula destacada, promover a cobrança extrajudicial pelo cartório ou pelo Detran (art. 8º-B). A teoria do adimplemento substancial não impede a apreensão.',
    teses: [{ nome: 'Negociação e conferência dos valores', fund: 'CDC arts. 6º, III, e 52', key: 'boa-fe-obj', desc: 'Antes da ação, buscar acordo com base no saldo devedor correto e verificar encargos indevidos.' }],
    baseLegal: [{ lei: 'DL 911/1969 — arts. 2º, § 2º, 3º e 8º-B', desc: 'Mora, busca e apreensão judicial e procedimento extrajudicial' }],
    jurisprudencia: [_T1132, _R1622],
    fluxo: [{ n: 1, t: 'Verificar ações e notificações', d: 'Consultar o TJSP pelo CPF e perguntar sobre cartas do banco ou do cartório.', tipo: 'urgent' }, { n: 2, t: 'Saldo devedor', d: 'Pedir o saldo atualizado e a planilha de evolução.', tipo: 'highlight' }, { n: 3, t: 'Acordo', d: 'Avaliar proposta compatível com a renda, com a calculadora.', tipo: 'normal' }],
    provas: ['Contrato', 'Boletos em atraso', 'Cartas e notificações recebidas'],
    analise: ['Valor das parcelas em atraso e renda atual', 'Se o veículo é instrumento de trabalho'],
    dica: 'Se o veículo é usado para trabalhar, registre isso no relato: é informação relevante para a negociação e para a análise do(a) defensor(a).'
  },
  END_vei_renegoc_prev: {
    titulo: 'Atraso Inicial (1 a 2 Parcelas) — Ação Preventiva', severity: 'baixo', urgente: false, of: 'veiculo', calc: 'veiculo_aquis',
    descricao: 'O atraso ainda é pequeno, mas a mora decorre do simples vencimento (DL 911/69, art. 2º, § 2º). É o melhor momento para negociar, conferir o contrato e evitar a cobrança judicial ou extrajudicial.',
    teses: [{ nome: 'Boa-fé objetiva', fund: 'CC art. 422', key: 'boa-fe-obj', desc: 'Dever de cooperação das partes na renegociação.' }],
    baseLegal: [{ lei: 'DL 911/1969 — art. 2º, § 2º', desc: 'Mora pelo simples vencimento' }, { lei: 'CDC — art. 52, § 2º', desc: 'Liquidação antecipada com redução proporcional de juros' }],
    jurisprudencia: [],
    fluxo: [{ n: 1, t: 'Contato com a financeira', d: 'Pedir o valor atualizado das parcelas em atraso e propostas de acordo por escrito.', tipo: 'normal' }, { n: 2, t: 'Conferir a taxa', d: 'Calculadora em "Financiamento de Veículo".', tipo: 'normal' }],
    provas: ['Contrato', 'Boletos'],
    analise: ['Causa do atraso e previsão de normalização da renda'],
    dica: 'Acordo por telefone deve ser confirmado por escrito, com o valor e as datas.'
  },
  END_vei_revisao: {
    titulo: 'Indícios de Irregularidade no Financiamento do Veículo — Revisão', severity: 'alto', urgente: false, of: 'veiculo', calc: 'veiculo_aquis',
    descricao: 'Há indícios de taxa muito acima da média de mercado, encargos não pactuados ou cobranças embutidas. A revisão de juros é excepcional e exige demonstrar discrepância relevante em relação à média do BACEN no mês da contratação (Tema 27; Súmula 382). Tarifas e serviços de terceiros são analisados à luz do Tema 958 e seguros à luz do Tema 972. Se houver ação de busca e apreensão, a revisão não suspende automaticamente a mora.',
    teses: [{ nome: 'Revisão de encargos', fund: 'CDC art. 51, IV e § 1º; STJ Temas 27, 958 e 972', key: 'quebra-base', desc: 'Afastar encargos indevidos e adequar a taxa quando demonstrada a abusividade.' }],
    baseLegal: [{ lei: 'CDC — art. 51, IV e § 1º', desc: 'Desvantagem exagerada' }, { lei: 'Resolução CMN 4.881/2020', desc: 'Custo Efetivo Total' }, { lei: 'CDC — art. 39, I', desc: 'Venda casada (seguros e serviços)' }],
    jurisprudencia: [_T27, _S382, _T958, _T972, _S539],
    fluxo: [{ n: 1, t: 'Calculadora', d: 'Comparar a taxa com a média do BACEN e com a média do próprio banco; informar tarifas e serviços financiados.', tipo: 'highlight' }, { n: 2, t: 'Ofício', d: 'Pedir a cédula, a composição do CET, a prova dos serviços cobrados e a planilha.', tipo: 'highlight' }, { n: 3, t: 'Encaminhamento', d: 'Levar o relatório ao(à) defensor(a).', tipo: 'normal' }],
    provas: ['Cédula de crédito', 'Demonstrativo do CET', 'Comprovantes de pagamento', 'Relatório da calculadora'],
    analise: ['Se houve prestação efetiva dos serviços cobrados (avaliação, registro)', 'Situação da mora e risco de busca e apreensão'],
    dica: 'Veja no contrato o "valor financiado" e o "valor do bem menos a entrada". A diferença costuma ser a soma de tarifas e seguros financiados.'
  },
  END_vei_revisao_sem_doc: {
    titulo: 'Financiamento de Veículo — Contrato não Disponível', severity: 'info', urgente: false, of: 'veiculo', calc: 'veiculo_aquis',
    descricao: 'Sem a cédula de crédito não é possível conferir taxa, CET, tarifas e seguros. O primeiro passo é pedir o contrato e a planilha à instituição. Na falta do contrato, a jurisprudência usa a taxa média de mercado (Súmula 530).',
    teses: [], baseLegal: [{ lei: 'CDC — arts. 6º, III, e 54-G, II', desc: 'Direito à cópia do contrato' }], jurisprudencia: [_S530],
    fluxo: [{ n: 1, t: 'Ofício', d: 'Gerar o ofício com o modelo de financiamento de veículo.', tipo: 'highlight' }, { n: 2, t: 'Registrato e Detran', d: 'Confirmar contrato e gravame.', tipo: 'normal' }],
    provas: ['Registrato', 'CRLV com o gravame', 'Via ofício: cédula de crédito e planilha'],
    analise: ['Situação das parcelas'],
    dica: 'Muitas financeiras disponibilizam o contrato no aplicativo; tente antes do ofício.'
  },
  END_vei_renegociacao: {
    titulo: 'Contrato Aparentemente Regular — Acordo, Entrega Amigável ou Prestação de Contas', severity: 'moderado', urgente: false, of: 'veiculo', calc: 'veiculo_aquis',
    descricao: 'Não há indício claro de irregularidade. As alternativas são negociar com base no saldo devedor correto ou, se não houver condições de pagar, a entrega amigável do veículo. Vendido o bem, o credor deve aplicar o preço no pagamento do crédito e das despesas e entregar ao devedor o saldo, se houver, com prestação de contas (DL 911/69, art. 2º). Se a venda não cobrir a dívida, o saldo continua devido.',
    teses: [{ nome: 'Prestação de contas da venda', fund: 'DL 911/69, art. 2º', key: 'boa-fe-obj', desc: 'O devedor tem direito a saber por quanto o bem foi vendido e como o valor foi aplicado.' }],
    baseLegal: [{ lei: 'DL 911/1969 — art. 2º', desc: 'Venda do bem e entrega do saldo ao devedor' }, { lei: 'CDC — art. 53', desc: 'Vedação da perda total das prestações' }],
    jurisprudencia: [_R1622],
    fluxo: [{ n: 1, t: 'Simular cenários', d: 'Comparar o saldo devedor, o valor de mercado do veículo (tabela de referência) e o que já foi pago.', tipo: 'highlight' }, { n: 2, t: 'Acordo ou entrega', d: 'Formalizar por escrito; na entrega, pedir termo com o estado do veículo e a prestação de contas da venda.', tipo: 'normal' }],
    provas: ['Contrato', 'Comprovantes de pagamento', 'Termo de entrega do veículo'],
    analise: ['Valor de mercado do veículo em relação ao saldo devedor'],
    dica: 'Na entrega amigável, fotografe o veículo e guarde o termo assinado: isso evita discussão sobre avarias e sobre o valor da venda.'
  },
  END_vei_cartorio_urgente: {
    titulo: '⏱️ Cobrança Extrajudicial do Veículo pelo Cartório — Prazo de 20 Dias em Curso', severity: 'critico', urgente: true, of: 'veiculo', calc: 'veiculo_aquis',
    descricao: 'O banco optou pelo procedimento extrajudicial (DL 911/69, art. 8º-B, incluído pela Lei 14.711/2023). O devedor tem 20 dias para pagar a dívida ou apresentar documentos de que a cobrança é total ou parcialmente indevida. Se entender que só parte é indevida, deve declarar o valor correto e pagá-lo no prazo (§ 4º). Não paga a dívida, a propriedade é consolidada; o devedor deve entregar o bem no mesmo prazo, sob pena de multa de 5% do valor da dívida (§ 11). Paga a dívida, o contrato convalesce (§ 8º). A notificação deve conter cópia do contrato, valor total, planilha, meio de pagamento e dados do credor (§ 13). A constitucionalidade desses dispositivos é discutida no STF (ADIs 7.600, 7.601 e 7.608).',
    teses: [{ nome: 'Requisitos do procedimento extrajudicial', fund: 'DL 911/69, art. 8º-B, caput e § 13', key: 'boa-fe-obj', desc: 'Exige previsão em cláusula destacada, comprovação da mora e notificação com o conteúdo mínimo legal; sem isso, o procedimento pode ser questionado.' }],
    baseLegal: [{ lei: 'DL 911/1969 — arts. 8º-B a 8º-E', desc: 'Consolidação extrajudicial da propriedade fiduciária de bem móvel' }, { lei: 'Provimento CNJ 196/2025', desc: 'Regulamenta o procedimento nos cartórios' }],
    jurisprudencia: [_T1132],
    fluxo: [
      { n: 1, t: 'Levar ao(à) defensor(a) hoje', d: 'Com a notificação e a data de recebimento (ou de confirmação do e-mail).', tipo: 'urgent' },
      { n: 2, t: 'Conferir a notificação', d: 'Verificar se acompanha contrato, planilha, valor total e meio de pagamento, e se o contrato tem cláusula destacada autorizando a via extrajudicial.', tipo: 'urgent' },
      { n: 3, t: 'Pagar ou impugnar no prazo', d: 'Pagar, ou apresentar ao cartório documentos de que a cobrança é indevida; se parcial, pagar o valor incontroverso no prazo.', tipo: 'highlight' }],
    provas: ['Notificação do cartório com data', 'Contrato com a cláusula da via extrajudicial', 'Planilha recebida', 'Comprovantes de pagamento'],
    analise: ['Se a cláusula está em destaque no contrato', 'Valor incontroverso que o(a) assistido(a) consegue pagar'],
    dica: 'O cartório notifica de preferência por e-mail; se não houver confirmação em 3 dias úteis, envia carta com AR (§ 7º). Pergunte ao assistido se recebeu e-mail do cartório.'
  },
  END_vei_cartorio_consolidado: {
    titulo: 'Prazo do Cartório Esgotado — Consolidação e Entrega do Veículo', severity: 'alto', urgente: true, of: 'veiculo',
    descricao: 'Passaram-se os 20 dias do procedimento extrajudicial. Não paga a dívida, o cartório averba a consolidação da propriedade em favor do credor (DL 911/69, art. 8º-B, § 9º), que pode vender o bem (art. 8º-C). O devedor deve entregar ou disponibilizar o veículo, sob pena de multa de 5% (§ 11). Frustrado o procedimento, o credor pode usar a via judicial (§ 5º). Ainda cabe verificar a regularidade da notificação e exigir a prestação de contas da venda.',
    teses: [{ nome: 'Regularidade do procedimento', fund: 'DL 911/69, art. 8º-B', key: 'boa-fe-obj', desc: 'Falhas na notificação ou na planilha podem ser questionadas.' }],
    baseLegal: [{ lei: 'DL 911/1969 — arts. 8º-B e 8º-C', desc: 'Consolidação e venda extrajudicial' }],
    jurisprudencia: [],
    fluxo: [{ n: 1, t: 'Levar ao(à) defensor(a)', d: 'Com a notificação e a cronologia.', tipo: 'urgent' }, { n: 2, t: 'Entrega e prestação de contas', d: 'Se for o caso de entregar, fazê-lo com termo e pedir depois a prestação de contas da venda.', tipo: 'normal' }],
    provas: ['Notificação', 'Contrato', 'Termo de entrega, se houver'],
    analise: ['Se houve vício na notificação', 'Valor de mercado do veículo'],
    dica: 'A entrega voluntária evita a multa de 5% prevista no § 11.'
  },
  END_vei_tarifas: {
    titulo: 'Tarifas, Seguros e Serviços Financiados no Contrato do Veículo', severity: 'moderado', urgente: false, of: 'veiculo', calc: 'veiculo_aquis',
    descricao: 'O contrato inclui tarifas (cadastro, avaliação do bem, registro), serviços de terceiros ou seguros financiados junto com o veículo. A tarifa de cadastro pode ser cobrada no início do relacionamento (Súmula 566). As tarifas de avaliação e de registro são válidas se o serviço foi efetivamente prestado e não há onerosidade excessiva; serviços de terceiros sem especificação são abusivos (Tema 958). O seguro não pode ser imposto com a instituição ou seguradora por ela indicada (Tema 972). Como esses valores são financiados, sobre eles também incidem juros.',
    teses: [{ nome: 'Restituição de encargos indevidos', fund: 'STJ Temas 958 e 972; CDC art. 39, I', key: 'abuso-direito', desc: 'Afastar a cobrança indevida e os juros incidentes sobre ela.' }],
    baseLegal: [{ lei: 'CDC — art. 39, I', desc: 'Venda casada' }, { lei: 'Resolução CMN 3.919/2010', desc: 'Tarifas bancárias' }],
    jurisprudencia: [_T958, _T972, _S566],
    fluxo: [{ n: 1, t: 'Listar os encargos', d: 'Cadastro, avaliação, registro, serviços de terceiros, seguros, títulos e assistências, com os valores.', tipo: 'highlight' }, { n: 2, t: 'Calculadora', d: 'Informar o total financiado de encargos no campo próprio para ver o custo com juros.', tipo: 'normal' }, { n: 3, t: 'Ofício', d: 'Pedir a prova da prestação dos serviços e a opção de escolha da seguradora.', tipo: 'highlight' }],
    provas: ['Cédula de crédito com a discriminação dos encargos', 'Apólices e termos de adesão', 'Via ofício: laudo de avaliação e comprovante do registro'],
    analise: ['Se houve avaliação física do veículo (laudo)', 'Se o seguro tinha opção de outra seguradora'],
    dica: 'O laudo de avaliação deve descrever o veículo; consulta de débitos ou foto genérica não comprova a avaliação.'
  },
  END_vei_parcela: {
    titulo: 'Parcela Cobrada Diferente da Contratada ou Saldo que não Diminui', severity: 'moderado', urgente: false, of: 'veiculo', calc: 'veiculo_aquis',
    descricao: 'O valor cobrado não corresponde à parcela do contrato, ou o saldo não diminui como esperado. Pode haver encargos de mora acumulados, cobrança de juros sobre parcelas em atraso, tarifas ou erro de cálculo. A capitalização mensal é permitida se pactuada (Súmulas 539 e 541); comissão de permanência não pode ser cumulada com outros encargos (Súmula 472).',
    teses: [{ nome: 'Cobrança acima do pactuado', fund: 'CDC art. 42, parágrafo único', key: 'boa-fe-obj', desc: 'Valores cobrados além do contrato devem ser restituídos.' }],
    baseLegal: [{ lei: 'CDC — arts. 6º, III, e 42', desc: 'Informação e repetição do indébito' }],
    jurisprudencia: [_S539, { tipo: 'sumula', ref: 'STJ — Súmula 472', ementa: 'A cobrança de comissão de permanência, cujo valor não pode ultrapassar a soma dos encargos remuneratórios e moratórios previstos no contrato, exclui a exigibilidade dos juros remuneratórios, moratórios e da multa contratual.' }],
    fluxo: [{ n: 1, t: 'Comparar parcela', d: 'Usar a calculadora (Price) com taxa e prazo do contrato e comparar com o boleto.', tipo: 'highlight' }, { n: 2, t: 'Ofício', d: 'Pedir a planilha de evolução e os encargos de mora aplicados.', tipo: 'normal' }],
    provas: ['Contrato', 'Boletos', 'Comprovantes de pagamento'],
    analise: ['Se há parcelas pagas com atraso (encargos de mora)'],
    dica: 'Use o assistente "Não sei a taxa cobrada" da calculadora para descobrir a taxa efetiva pela parcela e pelo saldo.'
  },
  END_vei_conferencia: {
    titulo: 'Conferência Geral do Financiamento do Veículo', severity: 'baixo', urgente: false, of: 'veiculo', calc: 'veiculo_aquis',
    descricao: 'O(a) assistido(a) quer apenas conferir o contrato. Os pontos de verificação são: taxa de juros e CET em relação à média do BACEN do mês, tarifas e seguros financiados, sistema de amortização, encargos de mora e o saldo para quitação antecipada.',
    teses: [], baseLegal: [{ lei: 'Resolução CMN 4.881/2020', desc: 'Custo Efetivo Total' }, { lei: 'CDC — art. 52', desc: 'Informações obrigatórias no crédito ao consumidor' }], jurisprudencia: [_T27],
    fluxo: [{ n: 1, t: 'Calculadora', d: 'Modalidade "Financiamento de Veículo", com os dados do contrato.', tipo: 'highlight' }],
    provas: ['Cédula de crédito'], analise: ['Objetivo do(a) assistido(a): quitar, renegociar ou só conferir'],
    dica: 'Mostre ao assistido, na calculadora, quanto do total pago é juros: ajuda a decidir sobre quitação antecipada.'
  },
  END_vei_quitacao: {
    titulo: 'Quitação Antecipada do Financiamento do Veículo', severity: 'baixo', urgente: false, of: 'veiculo', calc: 'veiculo_aquis',
    descricao: 'O consumidor pode liquidar a dívida antecipadamente, total ou parcialmente, com redução proporcional dos juros e demais acréscimos (CDC, art. 52, § 2º). A instituição deve informar o saldo devedor e o valor para liquidação. Após a quitação, o gravame deve ser baixado.',
    teses: [{ nome: 'Redução proporcional de juros', fund: 'CDC art. 52, § 2º', key: 'boa-fe-obj', desc: 'Na liquidação antecipada não são devidos os juros das parcelas futuras.' }],
    baseLegal: [{ lei: 'CDC — art. 52, § 2º', desc: 'Liquidação antecipada com redução proporcional dos juros' }],
    jurisprudencia: [],
    fluxo: [{ n: 1, t: 'Pedir o valor de quitação', d: 'Por escrito, com a data de validade.', tipo: 'highlight' }, { n: 2, t: 'Conferir', d: 'A calculadora estima o saldo pelo número de parcelas já pagas.', tipo: 'normal' }, { n: 3, t: 'Baixa do gravame', d: 'Após pagar, acompanhar a baixa da alienação fiduciária.', tipo: 'normal' }],
    provas: ['Demonstrativo de quitação', 'Comprovante de pagamento', 'Termo de quitação'],
    analise: ['Se há encargos de mora pendentes'],
    dica: 'Em quitação parcial, pergunte se o valor reduz o prazo ou a parcela: o efeito no total pago é diferente.'
  },
  END_vei_reneg: {
    titulo: 'Renegociação ou Refinanciamento do Veículo', severity: 'moderado', urgente: false, of: 'veiculo', calc: 'veiculo_aquis',
    descricao: 'A renegociação pode evitar a perda do bem, mas alongar o prazo e incorporar parcelas atrasadas com novos juros pode aumentar muito o total. Antes de aceitar, compare o saldo atual, a nova taxa, o novo prazo e o total a pagar, e verifique se foram incluídos seguros ou tarifas.',
    teses: [{ nome: 'Informação e crédito responsável', fund: 'CDC arts. 52 e 54-D', key: 'boa-fe-obj', desc: 'O consumidor deve conhecer todos os custos antes de aderir.' }],
    baseLegal: [{ lei: 'CDC — arts. 52 e 54-D', desc: 'Informações obrigatórias e crédito responsável' }],
    jurisprudencia: [],
    fluxo: [{ n: 1, t: 'Proposta por escrito', d: 'Pedir a proposta com taxa, CET, prazo e valor total.', tipo: 'highlight' }, { n: 2, t: 'Comparar', d: 'Usar a calculadora para comparar com a média do BACEN.', tipo: 'normal' }],
    provas: ['Proposta de renegociação', 'Contrato original'], analise: ['Renda disponível para a nova parcela'],
    dica: 'Desconfie de propostas que "zeram" o atraso sem mostrar o novo valor total.'
  },
  END_vei_transferencia: {
    titulo: 'Repasse do Veículo Financiado a Terceiro', severity: 'moderado', urgente: false, of: 'veiculo',
    descricao: 'O veículo alienado fiduciariamente pertence ao credor até a quitação. O repasse informal ("contrato de gaveta") não transfere a dívida: o devedor original continua responsável pelas parcelas, multas e tributos, e pode sofrer a busca e apreensão. A transferência do financiamento depende da anuência da instituição.',
    teses: [{ nome: 'Necessidade de anuência do credor', fund: 'CC arts. 299 e 1.361', key: 'boa-fe-obj', desc: 'A assunção da dívida por terceiro exige o consentimento expresso do credor.' }],
    baseLegal: [{ lei: 'CC — art. 299', desc: 'Assunção de dívida com consentimento do credor' }, { lei: 'CC — art. 1.361', desc: 'Propriedade fiduciária' }],
    jurisprudencia: [],
    fluxo: [{ n: 1, t: 'Mapear a situação', d: 'Quem está com o veículo, quem paga as parcelas, multas e IPVA.', tipo: 'highlight' }, { n: 2, t: 'Formalizar ou desfazer', d: 'Pedir à instituição a transferência formal do contrato ou orientar a recuperação do veículo.', tipo: 'normal' }],
    provas: ['Contrato de financiamento', 'Documento do repasse', 'Comprovantes de pagamento e multas'],
    analise: ['Paradeiro do veículo', 'Multas e pontos lançados no CPF do assistido'],
    dica: 'Oriente a fazer a comunicação de venda ao Detran só quando houver transferência formal; antes disso, o risco continua com o assistido.'
  },
  END_vei_venda_casada: {
    titulo: 'Seguro ou Serviço não Solicitado no Financiamento do Veículo', severity: 'moderado', urgente: false, of: 'veiculo', calc: 'veiculo_aquis',
    descricao: 'Foi incluído no financiamento seguro, garantia estendida, assistência, título de capitalização ou outro produto que o(a) assistido(a) não pediu ou que lhe foi imposto como condição. A venda casada é vedada (CDC, art. 39, I) e o consumidor não pode ser compelido a contratar seguro com a instituição ou seguradora por ela indicada (Tema 972). Como o valor foi financiado, também incidem juros sobre ele.',
    teses: [{ nome: 'Venda casada', fund: 'CDC art. 39, I; STJ Tema 972', key: 'abuso-direito', desc: 'Cancelamento do produto e restituição do valor e dos juros correspondentes.' }],
    baseLegal: [{ lei: 'CDC — art. 39, I e III', desc: 'Venda casada e produto não solicitado' }, { lei: 'CDC — art. 42, parágrafo único', desc: 'Repetição do indébito' }],
    jurisprudencia: [_T972, _EA676],
    fluxo: [{ n: 1, t: 'Identificar o produto', d: 'Nome, valor e se foi financiado.', tipo: 'normal' }, { n: 2, t: 'Ofício', d: 'Pedir apólice, termo de adesão e prova de que houve opção de recusa ou de outra seguradora.', tipo: 'highlight' }],
    provas: ['Cédula de crédito', 'Apólice ou termo do produto'], analise: ['Se o produto foi usado (sinistro, assistência)'],
    dica: 'Informe o valor do produto no campo "Encargos financiados" da calculadora para ver quanto ele custou com juros.'
  },
  END_vei_sinistro: {
    titulo: 'Roubo, Furto ou Perda Total de Veículo Financiado', severity: 'alto', urgente: false, of: 'veiculo',
    descricao: 'Com roubo, furto ou perda total, a dívida do financiamento continua. Se houver seguro do veículo, a indenização em geral é paga ao credor fiduciário até o saldo devedor, e o restante ao segurado; se houver seguro prestamista, verificar a cobertura (que costuma ser para morte, invalidez ou desemprego, não para roubo). É preciso acionar a seguradora rapidamente e comunicar a instituição.',
    teses: [{ nome: 'Cobertura securitária', fund: 'CC arts. 757 e seguintes; CDC art. 47', key: 'boa-fe-obj', desc: 'As cláusulas do seguro são interpretadas de maneira mais favorável ao consumidor.' }],
    baseLegal: [{ lei: 'CC — arts. 757 e seguintes', desc: 'Contrato de seguro' }, { lei: 'CDC — art. 47', desc: 'Interpretação favorável ao consumidor' }],
    jurisprudencia: [],
    fluxo: [{ n: 1, t: 'B.O. e comunicação', d: 'Registrar B.O. e comunicar a seguradora e a instituição, com protocolo.', tipo: 'urgent' }, { n: 2, t: 'Ofício', d: 'Pedir à instituição o saldo devedor e as apólices vinculadas ao contrato.', tipo: 'highlight' }],
    provas: ['Boletim de ocorrência', 'Apólices', 'Contrato', 'Protocolos de comunicação do sinistro'],
    analise: ['Coberturas efetivamente contratadas', 'Prazo para aviso de sinistro na apólice'],
    dica: 'Continue pagando as parcelas enquanto a indenização não sai, se possível: o atraso gera encargos e risco de cobrança.'
  },

  /* ─── IMÓVEL ─── */
  END_imo_renegoc: {
    titulo: 'Atraso Inicial no Financiamento do Imóvel — Negociação Preventiva', severity: 'baixo', urgente: false, of: 'imobiliario', calc: 'imob_mercado',
    descricao: 'Há poucas parcelas em atraso e ainda não houve intimação. A intimação para purgar a mora pode ser pedida após o prazo de carência do contrato, ou após 15 dias se o contrato não fixar carência (Lei 9.514/97, art. 26, §§ 2º e 2º-A). É o momento de negociar e conferir os valores.',
    teses: [], baseLegal: [{ lei: 'Lei 9.514/1997 — art. 26', desc: 'Intimação, carência e purgação da mora' }], jurisprudencia: [],
    fluxo: [{ n: 1, t: 'Negociar com o credor', d: 'Pedir proposta por escrito antes da intimação, que acrescenta custas.', tipo: 'normal' }, { n: 2, t: 'Programas habitacionais', d: 'Em financiamentos habitacionais, verificar se há programa de renegociação ou uso do FGTS.', tipo: 'normal' }],
    provas: ['Contrato', 'Boletos em atraso'], analise: ['Prazo de carência previsto no contrato'],
    dica: 'Pergunte se o imóvel é a moradia da família: isso muda as regras aplicáveis (art. 26-A).'
  },
  END_imo_risco: {
    titulo: 'Atraso Elevado no Financiamento do Imóvel — Intimação Iminente', severity: 'alto', urgente: true, of: 'imobiliario',
    descricao: 'Com várias parcelas em atraso, a intimação para purgar a mora em 15 dias pode chegar a qualquer momento. Ela é pessoal; se o devedor se ocultar, a lei admite intimação por hora certa ou por edital, e o prazo corre do mesmo modo. Evitar a intimação piora a situação.',
    teses: [], baseLegal: [{ lei: 'Lei 9.514/1997 — art. 26, §§ 1º a 4º', desc: 'Intimação para purgar a mora em 15 dias' }], jurisprudencia: [_T1095],
    fluxo: [{ n: 1, t: 'Certidão da matrícula', d: 'Verificar se já há averbação relacionada à cobrança.', tipo: 'highlight' }, { n: 2, t: 'Orientação', d: 'Orientar a receber a intimação e procurar a Defensoria no mesmo dia.', tipo: 'urgent' }],
    provas: ['Contrato', 'Certidão da matrícula'], analise: ['Valor total em atraso e possibilidade de pagamento'],
    dica: 'Explique ao assistido que fugir da intimação não suspende o prazo.'
  },
  END_imo_purga_urgente: {
    titulo: '⏱️ Prazo em Curso — 15 Dias para Purgar a Mora do Imóvel', severity: 'critico', urgente: true, of: 'imobiliario',
    descricao: 'O(a) assistido(a) foi intimado(a) a pagar, em 15 dias, as prestações vencidas e as que vencerem até o pagamento, com juros, penalidades, encargos, tributos, condomínio e despesas (Lei 9.514/97, art. 26, § 1º). O pagamento é feito no Registro de Imóveis, que repassa ao credor. Sem pagamento, a propriedade é consolidada em nome do credor. Em financiamento para aquisição ou construção de imóvel residencial, ainda é possível pagar as parcelas vencidas e as despesas até a averbação da consolidação, o que faz o contrato convalescer (art. 26-A, § 2º).',
    teses: [{ nome: 'Purgação da mora', fund: 'Lei 9.514/97, arts. 26, § 1º, e 26-A, § 2º', key: 'boa-fe-obj', desc: 'Pagamento do valor da intimação mantém o contrato.' }],
    baseLegal: [{ lei: 'Lei 9.514/1997 — art. 26, § 1º', desc: 'Prazo de 15 dias e valores devidos' }, { lei: 'Lei 9.514/1997 — art. 26-A, §§ 1º e 2º', desc: 'Imóvel residencial: averbação em 30 dias e pagamento até a averbação' }],
    jurisprudencia: [_T1095],
    fluxo: [{ n: 1, t: 'Levar ao(à) defensor(a) hoje', d: 'Com a intimação e a data de recebimento.', tipo: 'urgent' }, { n: 2, t: 'Valor e forma de pagamento', d: 'Conferir na intimação o valor e o local de pagamento (Registro de Imóveis).', tipo: 'urgent' }, { n: 3, t: 'Erro no valor', d: 'Se o valor estiver errado, o(a) defensor(a) avalia a medida judicial cabível.', tipo: 'highlight' }],
    provas: ['Intimação com a data', 'Contrato', 'Comprovantes de pagamento'], analise: ['Se o imóvel é residencial e para moradia do devedor', 'Recursos disponíveis'],
    dica: 'Pagar só uma parcela pelo aplicativo do banco não purga a mora: o pagamento deve seguir a intimação.'
  },
  END_imo_leilao: {
    titulo: 'Imóvel com Propriedade Consolidada ou Leiloado', severity: 'critico', urgente: true, of: 'imobiliario',
    descricao: 'A propriedade foi consolidada em nome do credor, que deve promover o leilão em 60 dias (Lei 9.514/97, art. 27). As datas, horários e locais dos leilões devem ser comunicados ao devedor por correspondência aos endereços do contrato, inclusive eletrônico (§ 2º-A). Até o segundo leilão, o devedor tem direito de preferência para adquirir o imóvel pelo valor da dívida e despesas (§ 2º-B). Vendido o imóvel, o credor deve entregar ao devedor, em 5 dias, a importância que sobrar (§ 4º).',
    teses: [{ nome: 'Direito de preferência e comunicação dos leilões', fund: 'Lei 9.514/97, art. 27, §§ 2º-A, 2º-B e 4º', key: 'boa-fe-obj', desc: 'A falta de comunicação dos leilões e a não entrega do saldo podem ser questionadas.' }],
    baseLegal: [{ lei: 'Lei 9.514/1997 — art. 27', desc: 'Leilões, preferência e entrega do saldo' }], jurisprudencia: [_T1095],
    fluxo: [{ n: 1, t: 'Levar ao(à) defensor(a)', d: 'Com a matrícula atualizada e as comunicações recebidas.', tipo: 'urgent' }, { n: 2, t: 'Verificar as comunicações', d: 'Conferir se as datas dos leilões foram comunicadas nos endereços do contrato.', tipo: 'highlight' }, { n: 3, t: 'Saldo do leilão', d: 'Se vendido, pedir a prestação de contas e o eventual saldo.', tipo: 'normal' }],
    provas: ['Matrícula atualizada', 'Comunicações dos leilões', 'Edital do leilão'], analise: ['Valor de avaliação e lances', 'Se a família ainda ocupa o imóvel'],
    dica: 'Pergunte por todos os endereços e e-mails informados no contrato: a comunicação deve ter ido a eles.'
  },
  END_imo_pos_prazo: {
    titulo: 'Prazo de 15 Dias Esgotado, Leilão ainda não Realizado', severity: 'alto', urgente: true, of: 'imobiliario',
    descricao: 'O prazo da intimação passou. Em imóvel residencial financiado para aquisição ou construção, ainda é possível pagar as parcelas vencidas e as despesas até a averbação da consolidação (art. 26-A, § 2º), que ocorre 30 dias após o fim do prazo (§ 1º). Depois da averbação, resta o direito de preferência até o segundo leilão, pelo valor da dívida e despesas (art. 27, § 2º-B).',
    teses: [{ nome: 'Pagamento até a averbação', fund: 'Lei 9.514/97, art. 26-A, § 2º', key: 'boa-fe-obj', desc: 'Garante a convalescença do contrato em imóvel residencial.' }],
    baseLegal: [{ lei: 'Lei 9.514/1997 — arts. 26-A e 27, § 2º-B', desc: 'Pagamento até a averbação e direito de preferência' }], jurisprudencia: [_T1095],
    fluxo: [{ n: 1, t: 'Matrícula', d: 'Verificar se a consolidação já foi averbada.', tipo: 'urgent' }, { n: 2, t: 'Valor para pagamento', d: 'Pedir ao Registro de Imóveis ou ao credor o valor das parcelas vencidas e despesas.', tipo: 'highlight' }],
    provas: ['Matrícula atualizada', 'Intimação'], analise: ['Data exata do fim do prazo'],
    dica: 'Conte os 30 dias da averbação a partir do fim do prazo de 15 dias: esse é o limite para pagar só as parcelas vencidas.'
  },

  /* ─── DÍVIDAS ─── */
  END_div_prescrita: {
    titulo: 'Cobrança de Dívida Possivelmente Prescrita', severity: 'baixo', urgente: false, of: 'negativacao',
    descricao: 'A pretensão de cobrança de dívida líquida constante de instrumento prescreve em 5 anos (CC, art. 206, § 5º, I). A negativação não pode ultrapassar 5 anos (CDC, art. 43, § 1º; Súmula 323). Sobre a cobrança extrajudicial de dívida prescrita, inclusive em plataformas de negociação, há o Tema 1.264 do STJ, afetado e com julgamento iniciado em 2026, sem tese fixada até esta versão; há determinação de suspensão de processos sobre o tema. A Terceira Turma já entendeu que a prescrição impede a cobrança judicial e extrajudicial, mas não a simples inclusão em plataforma de negociação. Confira a situação do Tema 1.264 antes de orientar.',
    teses: [{ nome: 'Inexigibilidade do débito prescrito', fund: 'CC art. 206, § 5º, I; CDC art. 43, § 1º', key: 'abuso-direito', desc: 'Cobrança vexatória ou ameaça de consequência inexistente é abusiva.' }],
    baseLegal: [{ lei: 'CC — art. 206, § 5º, I', desc: 'Prescrição em 5 anos' }, { lei: 'CDC — arts. 42 e 43, § 1º', desc: 'Cobrança abusiva e limite temporal dos cadastros' }, { lei: 'CC — art. 191', desc: 'Renúncia à prescrição (tácita, por atos incompatíveis)' }],
    jurisprudencia: [{ tipo: 'sumula', ref: 'STJ — Súmula 323', ementa: 'A inscrição do nome do devedor pode ser mantida nos serviços de proteção ao crédito até o prazo máximo de cinco anos, independentemente da prescrição da execução.' }, { tipo: 'tema', ref: 'STJ — Tema 1.264 (pendente)', ementa: 'Definir se a dívida prescrita pode ser exigida extrajudicialmente, inclusive com inclusão em plataformas de acordo ou renegociação. Sem tese fixada até 16/11/2026: conferir a situação.' }],
    fluxo: [{ n: 1, t: 'Data do vencimento original', d: 'Identificar quando a dívida venceu (não a data de acordos posteriores).', tipo: 'highlight' }, { n: 2, t: 'Orientação', d: 'Explicar que acordos e pagamentos podem caracterizar renúncia à prescrição.', tipo: 'normal' }, { n: 3, t: 'Encaminhamento', d: 'Cobrança vexatória ou negativação acima de 5 anos: levar ao(à) defensor(a).', tipo: 'normal' }],
    provas: ['Cartas de cobrança', 'Consulta aos cadastros de inadimplentes', 'Documento com a data do vencimento original'],
    analise: ['Se houve causa de interrupção da prescrição (protesto, ação, reconhecimento da dívida)', 'Situação atual do Tema 1.264'],
    dica: 'Oriente o(a) assistido(a) a não assinar acordo de dívida antiga sem entender o efeito: pode reconhecer a dívida.'
  },
  END_div_nao_reconhece: {
    titulo: 'Negativação por Dívida não Reconhecida — Possível Fraude ou Erro', severity: 'alto', urgente: false, of: 'negativacao',
    descricao: 'O nome foi inscrito em cadastro de inadimplentes por dívida de origem desconhecida. Cabe ao credor demonstrar a contratação; se houve fraude de terceiro, a instituição responde objetivamente (Súmula 479; Tema 466). A jurisprudência do STJ reconhece dano moral presumido na inscrição indevida, salvo se já existia inscrição legítima anterior (Súmula 385). O órgão de proteção ao crédito deve notificar o devedor antes da inscrição (Súmula 359).',
    teses: [{ nome: 'Inexistência do débito', fund: 'CDC arts. 6º, VIII, 14 e 43', key: 'fortuito-int', desc: 'Sem prova da contratação válida, a dívida deve ser declarada inexistente e a inscrição cancelada.' }],
    baseLegal: [{ lei: 'CDC — art. 43', desc: 'Bancos de dados e cadastros de consumidores' }, { lei: 'CDC — art. 14', desc: 'Defeito do serviço' }],
    jurisprudencia: [_S479, _T466, { tipo: 'sumula', ref: 'STJ — Súmula 385', ementa: 'Da anotação irregular em cadastro de proteção ao crédito, não cabe indenização por dano moral, quando preexistente legítima inscrição, ressalvado o direito ao cancelamento.' }, { tipo: 'sumula', ref: 'STJ — Súmula 359', ementa: 'Cabe ao órgão mantenedor do Cadastro de Proteção ao Crédito a notificação do devedor antes de proceder à inscrição.' }],
    fluxo: [{ n: 1, t: 'Consulta aos cadastros', d: 'Emitir a consulta (Serasa, SPC, Boa Vista) com credor, valor e data.', tipo: 'highlight' }, { n: 2, t: 'Ofício', d: 'Pedir o contrato, as provas da contratação e a informação sobre cessão do crédito.', tipo: 'highlight' }, { n: 3, t: 'Encaminhamento', d: 'Levar ao(à) defensor(a); verificar se há outras inscrições.', tipo: 'normal' }],
    provas: ['Consulta aos cadastros de inadimplentes', 'Boletim de ocorrência, se houver fraude', 'Via ofício: contrato e provas da contratação'],
    analise: ['Se há inscrições legítimas anteriores (Súmula 385)', 'Se a dívida foi cedida a empresa de cobrança'],
    dica: 'Imprima a consulta completa: ela mostra a data de cada inscrição, essencial para a Súmula 385.'
  },
  END_sup_critico: {
    titulo: 'Superendividamento Crítico (Mais de 70% da Renda Comprometida)', severity: 'critico', urgente: true, of: 'superendividamento',
    descricao: 'A subsistência do núcleo familiar está ameaçada. A Lei 14.181/2021 incluiu no CDC a prevenção e o tratamento do superendividamento, com preservação do mínimo existencial e processo de repactuação de dívidas com plano de até 5 anos (arts. 104-A a 104-C). O mínimo existencial é regulamentado pelo Decreto 11.150/2022 (alterado pelo Decreto 11.567/2023); em 2026 o STF (ADPFs 1.005, 1.006 e 1.097) manteve o parâmetro, determinou sua revisão periódica e incluiu as parcelas de consignado no cálculo.',
    teses: [{ nome: 'Mínimo existencial', fund: 'CF art. 1º, III; CDC arts. 6º, XI e XII, e 54-A', key: 'min-existencial', desc: 'Parcela da renda indispensável à vida digna, que não pode ser comprometida pelo plano de pagamento.' }],
    baseLegal: [{ lei: 'CDC — arts. 104-A a 104-C', desc: 'Conciliação e plano judicial compulsório' }, { lei: 'Decreto 11.150/2022 (alterado pelo Decreto 11.567/2023)', desc: 'Regulamentação do mínimo existencial; conferir o valor vigente' }],
    jurisprudencia: [_T1085],
    fluxo: [{ n: 1, t: 'Levantamento geral', d: 'Registrato, consulta aos cadastros e extratos: todos os credores, valores e parcelas.', tipo: 'urgent' }, { n: 2, t: 'Plano de pagamento', d: 'Renda líquida menos despesas essenciais: valor disponível para o plano.', tipo: 'highlight' }, { n: 3, t: 'Conciliação', d: 'Audiência global com os credores (judicial ou administrativa, como no Procon).', tipo: 'normal' }],
    provas: ['Comprovantes de renda', 'Lista de dívidas e credores', 'Despesas essenciais (aluguel, saúde, alimentação)', 'Registrato'],
    analise: ['Dívidas excluídas da repactuação (garantia real, imobiliário, rural, contratos dolosos)', 'Se houve contratação de má-fé'],
    dica: 'Monte uma planilha simples de renda e despesas com o(a) assistido(a): ela é a base do plano e do pedido.'
  }
});

/* Severidade 'amarelo' (usada na v12) passa a 'moderado', que tem estilo definido */
Object.keys(T).forEach(function (k) { if (T[k].severity === 'amarelo') T[k].severity = 'moderado'; });
