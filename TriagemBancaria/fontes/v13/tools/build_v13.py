"""Monta a v13.0 a partir da v12 (cópia sem os modelos base64), aplicando cada alteração com conferência."""
import re, io, sys, os, json, base64
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
W = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def rd(p): return open(os.path.join(W, p), encoding='utf-8').read()
s = rd('v12_stripped.html')
LOG = []
def rep(old, new, count=1):
    global s
    n = s.count(old)
    if n != count: raise SystemExit('FALHOU (%d ocorrências, esperado %d): %r' % (n, count, old[:140]))
    s = s.replace(old, new); LOG.append(old[:60])
def rep_re(pat, new, minimo=1, flags=0):
    global s
    s2, n = re.subn(pat, new, s, flags=flags)
    if n < minimo: raise SystemExit('FALHOU regex (%d): %r' % (n, pat[:140]))
    s = s2; return n
def remove_obj(key):
    """Remove a entrada KEY:{...} (com a vírgula final) de um objeto literal JS."""
    global s
    m = re.search(r'\n[ \t]*' + re.escape(key) + r':\{', s)
    if not m: raise SystemExit('objeto não encontrado: ' + key)
    i = m.end() - 1; depth = 0; q = None; esc = False; j = i
    while j < len(s):
        c = s[j]
        if q:
            if esc: esc = False
            elif c == '\\': esc = True
            elif c == q: q = None
        else:
            if c in '\'"`': q = c
            elif c == '{': depth += 1
            elif c == '}':
                depth -= 1
                if depth == 0: break
        j += 1
    k = j + 1
    mm = re.match(r'\s*,?[ \t]*', s[k:])
    k += mm.end()
    s = s[:m.start()] + s[k:]
def b64file(p): return base64.b64encode(open(os.path.join(W, p), 'rb').read()).decode()

# ── 1. <head>: título, fontes da v12 (Libre Baskerville + DM Sans, pesos completos), CSS de acabamento ──
rep('<title>Guia Avançado de Triagem Jurídica Bancária — Defensoria Pública SP</title>',
    '<title>Triagem Jurídica Bancária v13 — Defensoria Pública do Estado de São Paulo</title>\n<meta name="description" content="Ferramenta interna de apoio à triagem jurídica bancária e financeira — DPESP, Unidade de Ribeirão Preto. Versão 13.0.">')
rep('<link href="https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap" rel="stylesheet">',
    '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n<link href="https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&display=swap" rel="stylesheet">')
rep('\n</style>\n</head>', '\n' + rd('src/v13.css') + '\n</style>\n</head>')

LOGO_NEG = 'data:image/svg+xml;base64,' + b64file('logo/dpesp-h-neg.svg')
LOGO_POS = 'data:image/svg+xml;base64,' + b64file('logo/dpesp-h-pos.svg')

# ── 2. Cabeçalho com o logotipo oficial; selo de impressão ────────────────
rep('''    <div class="hdr-seal">⚖️</div>
    <div class="hdr-text">
      <h1>Defensoria Pública do Estado de São Paulo</h1>
      <p>Guia Avançado de Triagem Jurídica Bancária — Unidade Ribeirão Preto</p>
    </div>
    <div class="hdr-badge">Uso Interno · v12.1 · Atualizado em 12/07/2026</div><!-- ===NOVO=== v12.1 -->''',
'''    <div class="hdr-logo"><img src="''' + LOGO_NEG + '''" alt="Defensoria Pública do Estado de São Paulo" width="214" height="32"></div>
    <div class="hdr-divisor" aria-hidden="true"></div>
    <div class="hdr-text">
      <h1>Triagem Jurídica Bancária</h1>
      <p>Unidade de Ribeirão Preto</p>
    </div>
    <div class="hdr-badge">Uso interno · v13.0 · 16/11/2026</div>''')
rep('''  <strong>Defensoria Pública do Estado de São Paulo — Unidade Ribeirão Preto</strong><br>''',
    '''  <img src="''' + LOGO_POS + '''" alt="Defensoria Pública do Estado de São Paulo"><strong>Unidade de Ribeirão Preto</strong><br>''')
rep('<div class="sf-versao">Triagem Bancária · v12 · 10/06/2026</div>', '<div class="sf-versao">Triagem Bancária · v13.0 · 16/11/2026</div>')

# ── 3. Gaveta de apoio: glossário e referências corrigidos ────────────────
i0 = s.index('<div class="gloss-item"><div class="gloss-q" onclick="toggleGloss(this)"><span>MED — Mecanismo Especial de Devolução</span>')
i1 = s.index('Em imóveis: Lei 9.514/97, prazo de 15 dias após notificação cartorial.</div></div>') + len('Em imóveis: Lei 9.514/97, prazo de 15 dias após notificação cartorial.</div></div>')
G = [
 ('MED — Mecanismo Especial de Devolução', 'Mecanismo do Regulamento do Pix (Banco Central) para bloquear e devolver valores transferidos em fraude ou por falha de segurança. O pedido deve ser feito em até <strong>80 dias</strong> da transação, pelo canal de contestação do aplicativo ou pela central. Não cobre simples engano de digitação. Desde fevereiro de 2026 (MED 2.0) o rastreamento alcança transferências sucessivas.'),
 ('Fortuito Interno', 'Risco inerente à atividade bancária. Fraudes e delitos praticados por terceiros em operações bancárias não afastam a responsabilidade do banco (STJ, Súmula 479 e Tema 466).'),
 ('Desvio Produtivo do Consumidor', 'Tempo útil desperdiçado pelo consumidor para resolver problema causado pelo fornecedor. O STJ já o reconheceu como dano indenizável (REsp 1.737.412/SE, tempo de espera em agências). Depende de prova no caso concreto.'),
 ('Superendividamento — Lei 14.181/2021', 'Impossibilidade manifesta de o consumidor de boa-fé pagar suas dívidas de consumo sem comprometer o <strong>mínimo existencial</strong> (CDC, art. 54-A). Permite repactuação global com plano de até 5 anos (arts. 104-A a 104-C).'),
 ('Adimplemento Substancial', 'Teoria que impede a resolução do contrato quando quase toda a obrigação foi cumprida. O STJ <strong>afastou</strong> sua aplicação aos contratos de alienação fiduciária de veículos (DL 911/69): REsp 1.622.555/MG, Segunda Seção.'),
 ('Margem consignável (benefício INSS)', 'Até <strong>45%</strong> do benefício: 35% para empréstimos, 5% para cartão de crédito consignado (RMC) e 5% para cartão consignado de benefício (RCC). No BPC, até 35% (30% + 5%). Lei 10.820/2003, art. 6º, §§ 5º e 5º-A.'),
 ('CET — Custo Efetivo Total', 'Taxa que reúne juros, tributos, tarifas, seguros e demais encargos da operação. Deve ser informada antes da contratação (Res. CMN 4.881/2020; antes, Res. CMN 3.517/2007). CET alto não é, por si só, ilegal: indica o peso dos encargos a conferir.'),
 ('Correspondente Bancário', 'Empresa contratada pela instituição para atender em seu nome (Res. CMN 4.935/2021). A instituição responde pelos atos de seus prepostos e representantes (CDC, art. 34) e por fraudes no âmbito de suas operações (Súmula 479).'),
 ('Alienação Fiduciária', 'O bem fica em nome do credor até a quitação. <strong>Veículo</strong>: 5 dias da execução da liminar para pagar a integralidade da dívida (DL 911/69, art. 3º; STJ, Tema 1.279), ou 20 dias no procedimento extrajudicial do cartório (art. 8º-B). <strong>Imóvel</strong>: 15 dias da intimação do Registro de Imóveis (Lei 9.514/97, art. 26).'),
]
gl = '\n'.join('        <div class="gloss-item"><div class="gloss-q" onclick="toggleGloss(this)"><span>%s</span><span class="gloss-chev">▾</span></div><div class="gloss-a">%s</div></div>' % g for g in G)
s = s[:i0] + gl.lstrip() + s[i1:]
i0 = s.index('<div style="margin-bottom:5px;"><strong style="color:var(--gm);">STJ — Súmula 297</strong>')
i1 = s.index('<div><strong style="color:var(--gm);">Res. BCB 93/2021</strong><br>MED — Mecanismo Especial de Devolução (PIX).</div>') + len('<div><strong style="color:var(--gm);">Res. BCB 93/2021</strong><br>MED — Mecanismo Especial de Devolução (PIX).</div>')
R = [('STJ — Súmula 297', 'CDC aplicável às instituições financeiras.'), ('STJ — Súmula 479 e Tema 466', 'Responsabilidade objetiva por fraudes de terceiros (fortuito interno).'),
     ('STJ — Tema 1.061', 'Impugnada a assinatura do contrato, cabe ao banco provar a autenticidade.'), ('STJ — Súmula 532', 'Envio de cartão sem solicitação é prática abusiva.'),
     ('STJ — Tema 972', 'Ninguém pode ser obrigado a contratar seguro com o banco ou seguradora indicada.'), ('STJ — Súmula 530', 'Sem o contrato, aplica-se a taxa média de mercado do BACEN.'),
     ('CDC — arts. 6º, III, e 14', 'Informação adequada e responsabilidade por defeito do serviço.'), ('CDC — art. 39, I e III', 'Venda casada e produto ou serviço não solicitado.'),
     ('Lei 14.181/2021', 'Superendividamento: mínimo existencial e repactuação (CDC, arts. 54-A e 104-A).'), ('DL 911/69 — art. 3º, §§ 1º e 2º', '5 dias da execução da liminar para pagar a integralidade da dívida (veículo).'),
     ('Lei 9.514/97 — art. 26, § 1º', 'Imóvel: 15 dias da intimação para purgar a mora.'), ('LC 80/94, art. 128, X e XI · LC 988/06, art. 162, VI', 'Requisição a autoridades públicas e atuação independentemente de mandato.')]
s = s[:i0] + '\n'.join('          <div style="margin-bottom:5px;"><strong style="color:var(--gm);">%s</strong><br>%s</div>' % r for r in R).lstrip() + s[i1:]
rep('Requerer contratos, extratos e gravações ao banco (LC 988/06, art. 162, VI).', 'Solicitar contratos, extratos e gravações à instituição (aba Documentos).')
rep('Convênio OAB, Faculdade parceira ou atendimento interno.', 'Defensor(a) responsável, convênio OAB, faculdade parceira ou atendimento interno.')

# ── 4. Tela inicial da triagem: dados opcionais do atendimento ────────────
rep('<div class="wcard-hdr-label">Guia Avançado · v12 — Triagem Bancária</div>', '<div class="wcard-hdr-label">Guia de Triagem · v13.0</div>')
rep('<div><strong>Ferramenta exclusivamente educacional e de apoio à triagem.</strong> Não coleta nem armazena dados pessoais. Não gera documentos formais. Destina-se à orientação jurídica interna, capacitação de estagiários e padronização de análise de casos bancários na Defensoria Pública.</div>',
    '<div><strong>Ferramenta interna de apoio à triagem.</strong> Os dados do(a) assistido(a) ficam apenas nesta aba do navegador e são apagados ao fechar a página. O resultado é preliminar: não substitui a análise do(a) defensor(a). Os documentos gerados devem ser conferidos e assinados antes do envio.</div>')
rep('<div class="intro-feat-desc">Fluxo interativo com 9 categorias, incluindo Fraudes Digitais e PIX, com opção "Não sabe" em todas as perguntas.</div>',
    '<div class="intro-feat-desc">12 categorias, perguntas de urgência e de prioridade, novo fluxo de financiamento de veículos, consórcio, crédito pessoal e tarifas.</div>')
rep('''      <div id="qArea"></div>''',
'''      <div class="v13-caso-mini" id="tri-caso">
        <div><label for="tri-assistido">Nome do(a) assistido(a) <em class="opt">— opcional</em></label><input type="text" id="tri-assistido" autocomplete="off"></div>
        <div><label for="tri-dol">Nº do DOL <em class="opt">— opcional</em></label><input type="text" id="tri-dol" inputmode="numeric"></div>
        <div><label for="tri-contrato">Nº do contrato <em class="opt">— opcional</em></label><input type="text" id="tri-contrato"></div>
        <div class="v13-sub">Preenchidos aqui, entram no relato, nos ofícios e na minuta de e-mail. Nada fica salvo após fechar a página.</div>
      </div>
      <div id="qArea"></div>''')
rep('''          <label style="font-size:11px;font-weight:700;color:var(--gd);display:block;margin-bottom:3px;">Banco/instituição identificado no relato <em class="opt">— opcional</em></label>
          <input type="text" id="cen-banco" placeholder="Ex: Banco BMG S.A." style="border:1.5px solid var(--bdr);border-radius:8px;padding:8px 11px;font-size:13px;font-family:'DM Sans',sans-serif;width:100%;">
        </div>''',
'''          <label style="font-size:11px;font-weight:700;color:var(--gd);display:block;margin-bottom:3px;">Instituição identificada no relato <em class="opt">— opcional</em></label>
          <div class="combo" id="combo-cen-banco"><input type="text" id="cen-banco" autocomplete="off" placeholder="Ex.: Banco BMG S.A." oninput="comboFiltrar('cen-banco')" onfocus="comboFiltrar('cen-banco')" onkeydown="comboTeclado(event,'cen-banco')" onblur="comboBlur('cen-banco')" style="border:1.5px solid var(--bdr);border-radius:8px;padding:8px 11px;font-size:13px;width:100%;"><div class="combo-list" id="combo-cen-banco-list"></div></div>
        </div>
        <div style="min-width:120px;"><label style="font-size:11px;font-weight:700;color:var(--gd);display:block;margin-bottom:3px;">Nº do DOL</label><input type="text" id="cen-dol" inputmode="numeric" style="border:1.5px solid var(--bdr);border-radius:8px;padding:8px 11px;font-size:13px;width:100%;"></div>
        <div style="min-width:140px;"><label style="font-size:11px;font-weight:700;color:var(--gd);display:block;margin-bottom:3px;">Nº do contrato</label><input type="text" id="cen-contrato" style="border:1.5px solid var(--bdr);border-radius:8px;padding:8px 11px;font-size:13px;width:100%;"></div>''')
rep('<button class="btn-p" onclick="irParaDocumentosPrefill()" title="Abre a aba Documentos com o banco já preenchido no ofício">📄 Ir para Documentos com dados pré-preenchidos →</button>',
    '<button class="btn-p" onclick="irParaDocumentosPrefill()" title="Abre a aba Documentos com os dados e o modelo de ofício do cenário">📄 Ir para Documentos com dados pré-preenchidos →</button>')

# ── 5. Motor da triagem: fluxo com urgência e perfil ──────────────────────
rep("  S.nodocsConfirmado = false; // ===NOVO=== v12: wizard \"sem documentação\"",
    "  S.nodocsConfirmado = false; // ===NOVO=== v12: wizard \"sem documentação\"\n  S.alertas = []; S.perfil = []; // v13: sinais de urgência e prioridades")
rep("""  if(qId === 'q_docs') {
    updateSteps(2); setProgresso(50);""", """  if(qId === 'q_docs' || qId === 'q_urgencia' || qId === 'q_perfil') {
    updateSteps(2); setProgresso(qId === 'q_docs' ? 45 : (qId === 'q_urgencia' ? 52 : 60));""")
rep("const currentStep = (qId === 'q_problema') ? 1 : (qId === 'q_docs') ? 2 : 3;",
    "const currentStep = (qId === 'q_problema') ? 1 : (qId === 'q_docs' || qId === 'q_urgencia' || qId === 'q_perfil') ? 2 : 3;")
rep("""  document.getElementById('qArea').innerHTML = html;
  updateTrail();""", """  if (typeof v13BannerAlertas === 'function') html = v13BannerAlertas() + html; // v13
  if (typeof v13TriCaso === 'function') v13TriCaso(qId);
  document.getElementById('qArea').innerHTML = html;
  updateTrail();""")
rep("""    if (qId === 'q_problema') {
      goNext(BRANCH[optId]);""", """    if (qId === 'q_problema') {
      goNext(opt.next || BRANCH[optId]); // v13: categoria -> documentos -> urgência -> perfil""")
rep("""  if (arr.includes('nenhum') && !S.nodocsConfirmado) {""", """  if (qId === 'q_docs' && arr.includes('nenhum') && !S.nodocsConfirmado) {""")
rep("""  if(arr.includes('nenhum')) { S.hasNoDocs = true; document.getElementById('nodocsBanner').style.display='flex'; }
  else { S.hasNoDocs = false; document.getElementById('nodocsBanner').style.display='none'; }""",
"""  if (qId === 'q_docs') {
    if(arr.includes('nenhum')) { S.hasNoDocs = true; document.getElementById('nodocsBanner').style.display='flex'; }
    else { S.hasNoDocs = false; document.getElementById('nodocsBanner').style.display='none'; }
  }""")
rep("""  const catOpt = S.history[0].val; // categoria
  goNext(BRANCH[catOpt]);""", """  if (qId === 'q_urgencia') S.alertas = arr.filter(a => a !== 'nenhum');
  if (qId === 'q_perfil') { S.perfil = arr.filter(a => a !== 'nenhum'); if (typeof casoSetVuln === 'function') casoSetVuln(S.perfil); }
  const catOpt = S.history[0].val; // categoria
  goNext(q.next && q.next !== '__BRANCH__' ? q.next : BRANCH[catOpt]);""")
rep("""  const last = S.history.pop();
  S.answers.pop();""", """  const last = S.history.pop();
  S.answers.pop();
  if (last.qId === 'q_urgencia') S.alertas = [];
  if (last.qId === 'q_perfil') S.perfil = [];""")
rep("""  if (t.severity === 'critico') {
    html += `<div class="urgencia-banner">""", """  if (typeof v13BannerAlertas === 'function') html += v13BannerAlertas();
  if (t.severity === 'critico' && !(S.alertas && S.alertas.length)) {
    html += `<div class="urgencia-banner">""")
rep("""  html += `<div class="descr-box"><div class="descr-text">${t.descricao}</div></div>`;""",
    """  html += `<div class="descr-box"><div class="descr-text">${t.descricao}</div></div>`;
  if (typeof v13CenarioTopo === 'function') html += v13CenarioTopo(t, tId);""")
rep('<span style="font-size:14px;">📂</span> Checklist de Provas & Documentos (${t.provas.length} itens)', '<span style="font-size:14px;">📂</span> Confirmação documental — provas e documentos (${t.provas.length} itens)')
rep('<span style="font-size:14px;">⚖️</span> Teses e Fundamentação Jurídica', '<span style="font-size:14px;">⚖️</span> Teses jurídicas possíveis')
rep('<span style="font-size:14px;">📜</span> Jurisprudência Consolidada STJ', '<span style="font-size:14px;">📜</span> Jurisprudência de referência — conferir o inteiro teor antes de citar')
rep('<span style="font-size:14px;">📚</span> Base Legal Aplicável', '<span style="font-size:14px;">📚</span> Fundamentos legais aplicáveis')
rep("""  html += `</div>`;
  document.getElementById('scenarioArea').innerHTML = html;""", """  html += `</div>`;
  if (typeof v13CenarioAnalise === 'function') html += v13CenarioAnalise(t, tId);
  document.getElementById('scenarioArea').innerHTML = html;""")
rep("""  text += `Data/Hora: ${now}\\n`;""", """  text += `Data/Hora: ${now}\\n`;
  if (typeof v13LinhasCaso === 'function') text += v13LinhasCaso();""")
rep("""  S.answers.forEach(a => { text += `• ${a.qText}\\n  → ${a.aText}\\n`; });""",
    """  S.answers.forEach(a => { text += `• ${a.qText}\\n  → ${a.aText}\\n`; });
  if (typeof v13LinhasAlertasPerfil === 'function') text += v13LinhasAlertasPerfil();""")
rep("""  text += `Gerado por: Guia de Triagem Jurídica Bancária — DPESP`;""", """  text += `Gerado por: Guia de Triagem Jurídica Bancária v13.0 — DPESP`;""")

rep("  event && event.currentTarget && event.currentTarget.classList.add('selected-opt');", "  if (typeof event !== 'undefined' && event && event.currentTarget && event.currentTarget.classList) event.currentTarget.classList.add('selected-opt'); // v13: proteção")
rep("      + '<div class=\"msub\">Diferença de juros ao longo do contrato se a taxa for revista para a ' + melhor.nome", "      + '<div class=\"msub\">Diferença de juros ao longo do contrato se a taxa for revista ' + (melhor.nome === 'teto legal' ? 'para o teto legal' : 'para a ' + melhor.nome)")
rep("        + ' a mais</strong> do que pagaria com a taxa ' + melhor.nome + '. Em ' + c.prazo", "        + ' a mais</strong> do que pagaria com ' + (melhor.nome === 'teto legal' ? 'a taxa no teto legal' : 'a taxa da ' + melhor.nome) + '. Em ' + c.prazo")
rep("' ao longo do contrato caso a taxa seja revista para a ' + c._economiaAlvo + '.');", "' ao longo do contrato caso a taxa seja revista ' + (c._economiaAlvo === 'teto legal' ? 'para o teto legal' : 'para a ' + c._economiaAlvo) + '.');")
# ── 6. Perguntas e cenários reescritos no bloco v13 (remoção das versões antigas) ──
for k in ['dig_pix_q1', 'vei_q2', 'vei_q3', 'imo_q1', 'imo_q1b', 'imo_q2']: remove_obj(k)
for k in ['END_pix_med_orientacao', 'END_pix_med_acionado', 'END_pix_sem_med_prazo', 'END_vei_purga_urgente', 'END_vei_revisao', 'END_vei_renegociacao',
          'END_vei_revisao_sem_doc', 'END_vei_renegoc_prev', 'END_vei_risco', 'END_imo_renegoc', 'END_imo_risco', 'END_imo_purga_urgente', 'END_imo_leilao',
          'END_imo_pos_prazo', 'END_div_prescrita', 'END_div_nao_reconhece', 'END_sup_critico']: remove_obj(k)
rep("const T = {\n", "const T = {\n  /* v13: os cenários de PIX/MED, veículo, imóvel, dívida prescrita, negativação não reconhecida e superendividamento crítico\n     foram reescritos no bloco \"v13 — TRIAGEM\" ao final do arquivo, junto com os cenários novos. */\n")

# ── 7. Correções jurídicas nos cenários que permanecem ────────────────────
rep_re(r"\{tipo:'tema', ref:'STJ — Tema 1061', ementa:'[^']*'\}", "{tipo:'tema', ref:'STJ — Tema 466 (REsp 1.199.782/PR e REsp 1.197.929/PR)', ementa:'As instituições bancárias respondem objetivamente pelos danos causados por fraudes ou delitos praticados por terceiros, como a abertura de conta ou a obtenção de empréstimo mediante fraude ou documentos falsos (fortuito interno).'}", 3)
rep_re(r"\{tipo:'prec', ref:'STJ — REsp 1\.197\.929/PR', ementa:'[^']*'\}", "{tipo:'tema', ref:'STJ — Tema 1.061 (REsp 1.846.649/MA)', ementa:'Impugnada pelo consumidor a autenticidade da assinatura em contrato bancário juntado pela instituição financeira, cabe a esta provar a autenticidade (CPC, arts. 6º, 369 e 429, II).'}")
rep_re(r",\s*\{tipo:'prec', ref:'STJ — REsp 1\.061\.500/RS', ementa:'[^']*'\}", "", 2)
rep_re(r"\{tipo:'prec', ref:'STJ — REsp 1\.348\.081/RS', ementa:'[^']*'\}", "{tipo:'tema', ref:'STJ — Tema 1.061 (REsp 1.846.649/MA)', ementa:'Impugnada pelo consumidor a autenticidade da assinatura em contrato bancário juntado pela instituição financeira, cabe a esta provar a autenticidade.'}")
rep_re(r"\{tipo:'prec', ref:'STJ — AgRg no AREsp 692\.523/SP', ementa:'[^']*'\}", "{tipo:'prec', ref:'STJ — REsp 1.995.458/SP (3ª Turma, 2022)', ementa:'No golpe do motoboy, o banco responde quando permite transações que destoam do perfil de consumo do correntista, o que caracteriza falha na prestação do serviço; a conduta da vítima é examinada no caso concreto.'}")
rep_re(r"\{tipo:'sumula', ref:'STJ — Súmula 294', ementa:'[^']*'\}", "{tipo:'sumula', ref:'STJ — Súmula 530', ementa:'Na impossibilidade de comprovar a taxa de juros efetivamente contratada, aplica-se a taxa média de mercado divulgada pelo BACEN para operações da mesma espécie, salvo se a taxa cobrada for mais vantajosa para o devedor.'}")
rep_re(r"\{tipo:'sumula', ref:'STJ — Súmula 388', ementa:'[^']*'\}", "{tipo:'prec', ref:'STJ — jurisprudência consolidada e Súmula 385', ementa:'A inscrição indevida em cadastro de inadimplentes gera dano moral presumido (in re ipsa); não cabe indenização se já havia inscrição legítima anterior, ressalvado o direito ao cancelamento (Súmula 385).'}", 1)
rep_re(r"\{lei:'STJ — Súmula 388', desc:'[^']*'\}", "{lei:'STJ — Súmula 385', desc:'Sem dano moral quando havia inscrição legítima anterior (ressalvado o cancelamento)'}", 1)
rep_re(r"\(dano moral presumido — STJ Súmula 388\)", "(dano moral presumido, ressalvada a Súmula 385 do STJ)")
rep_re(r",\s*\{lei:'Lei 12\.414/2011', desc:'[^']*'\}", "", 0)
rep_re(r"\{lei:'Lei 12\.414/2011', desc:'[^']*'\},?\s*", "", 0)
rep_re(r"Res\. BCB 93/2021", "Regulamento do Pix (Res. BCB 1/2020)", 0)
rep_re(r"Resolução BCB 93/2021", "Regulamento do Pix (Resolução BCB 1/2020)", 0)
rep_re(r"Res\. BCB 3\.954/2011", "Res. CMN 4.935/2021 (correspondentes)", 1)
rep_re(r"A portabilidade legal \(Res\. BCB 4\.292/13\)", "A portabilidade (Resolução CMN 4.292/2013)", 1)
rep_re(r"\{lei:'Res\. BCB 4\.292/2013'", "{lei:'Res. CMN 4.292/2013'", 1)
rep_re(r"Comparar as taxas: a Resolução BCB 4\.292/13 veda que a portabilidade seja condicionada a nova taxa superior\. Se o banco de destino praticou taxa maior que a original, há violação normativa independente do consentimento\.",
       "Compare taxa, CET, prazo e parcela antes e depois da portabilidade. Aumento de custo ou de prazo sem pedido e sem informação clara reforça a irregularidade; peça às duas instituições os documentos da operação.", 1)
rep_re(r"Res\. CMN 3\.517/2007", "Res. CMN 4.881/2020 (antes, Res. CMN 3.517/2007)", 1)
rep_re(r"Res\. BCB 3\.919/2010", "Res. CMN 3.919/2010", 1)
rep_re(r"Res\. BCB 4\.433/2015", "Res. CMN 4.860/2020", 0)
rep_re(r"Res\. BCB 4\.753/2019", "Res. CMN 4.753/2019", 0)
rep_re(r"\{lei:'CC — Art\. 104, II', desc:'[^']*'\}", "{lei:'CC — Arts. 104 e 107', desc:'Requisitos de validade do negócio jurídico; sem manifestação de vontade não há contratação válida'}", 1)
rep_re(r"\{lei:'CDC — Art\. 51, I', desc:'[^']*'\}", "{lei:'CDC — Art. 51, IV', desc:'Nulidade de cláusulas que estabelecem obrigações iníquas ou abusivas'}", 1)
rep_re(r"fund:'CC art\. 113, §1°, III'", "fund:'CDC art. 34; CC art. 422'", 1)
rep_re(r"'aparencia': '[^']*'", "'aparencia': 'Teoria da Aparência (CDC art. 34; CC art. 422): o fornecedor responde pelos atos de seus prepostos e representantes autônomos, e o consumidor que age de boa-fé com base na aparência de legitimidade criada pelo fornecedor não pode ser prejudicado.'", 1)
rep_re(r"'adimpl-substancial': '[^']*'", "'adimpl-substancial': 'Teoria do Adimplemento Substancial: impede a resolução quando quase toda a obrigação foi cumprida. O STJ afastou sua aplicação à alienação fiduciária de veículos regida pelo DL 911/69 (REsp 1.622.555/MG, Segunda Seção).'", 1)
rep_re(r"ementa:'O desvio produtivo do consumidor — tempo gasto na resolução de problemas causados pelo fornecedor — constitui dano indenizável autônomo\.'",
       "ementa:'O STJ reconheceu o desvio produtivo do consumidor (tempo útil desperdiçado por falha do fornecedor) como dano indenizável, em ação coletiva sobre o tempo de espera em agências bancárias. A aplicação depende das circunstâncias do caso.'", 1)
rep_re(r"\(LC 988/06, art\. 162, VI\)", "(LC 80/94, art. 128, X e XI; LC 988/06, art. 162, VI)", 1)
rep_re(r"\{lei:'LC 988/2006 — Art\. 162, VI', desc:'[^']*'\}", "{lei:'LC 80/1994 — art. 128, X e XI · LC 988/2006 — art. 162, VI', desc:'Requisição a autoridades públicas e atuação da Defensoria independentemente de mandato'}", 1)
rep_re(r"Prazo: 10 dias úteis para resposta\.", "Prazo: o indicado no ofício (escolhido na aba Documentos).", 0)
rep_re(r"\(prazo de 10 dias úteis para resposta\)", "(prazo indicado no ofício)", 0)
rep_re(r"Com 1 parcela vencida o banco já pode ajuizar busca e apreensão no DL 911/69\. Com 3\+, o risco é iminente\.",
       "A mora decorre do simples vencimento e é comprovada por carta registrada enviada ao endereço do contrato (DL 911/69, art. 2º, § 2º; STJ, Tema 1.132). Com uma parcela vencida o banco já pode cobrar judicial ou extrajudicialmente; com três ou mais, o risco é iminente.", 1)
rep_re(r"severity:'amarelo'", "severity:'moderado'", 1)
rep_re(r"Cartão RCC \(Rotativo Crédito Consignado\)", "Cartão consignado de benefício (RCC)", 1)
rep_re(r"\(LC 988/06, art\. 162, VI\)\. Ao final da triagem", "(LC 80/94, art. 128, X e XI; LC 988/06, art. 162, VI). Ao final da triagem", 0)
rep_re(r"diretamente ao banco</strong> o contrato integral, a planilha de amortização e as gravações \(LC 988/06, art\. 162, VI\)", "diretamente ao banco</strong> o contrato integral, a planilha de amortização e as gravações (LC 80/94, art. 128, X e XI; LC 988/06, art. 162, VI)", 0)

rep_re(r"hint:'Cada modalidade tem teto legal próprio \(Portaria MPS\): Empréstimo Consignado = 1,80% a\.m\. \| Cartão RMC = 2,89% a\.m\. \| Cartão RCC = 3,06% a\.m\. A identificação correta é essencial para apurar abusividade\.'",
       "hint:'O teto de juros depende da data do contrato (normas do INSS e Resoluções do CNPS). Desde 04/04/2025: empréstimo 1,85% a.m.; cartões RMC e RCC 2,46% a.m. (texto completo no bloco v13).'", 1)
rep_re(r"\(teto legal: 1,80% a\.m\.\)", "(teto desde 04/2025: 1,85% a.m.)", 1)
rep_re(r"\(teto: 2,89% a\.m\.\)", "(teto desde 06/2024: 2,46% a.m.)", 1)
rep_re(r"\(teto: 3,06% a\.m\.\)", "(teto desde 06/2024: 2,46% a.m.)", 1)
rep_re(r"rotuloTeto:'Teto Cheque Especial \(Res\. CMN 4\.765/2020\)'", "rotuloTeto:'Teto do cheque especial (Res. CMN 4.765/2019)'", 1)
rep_re(r"Com fundamento no art\. 162, VI da LC 988/2006, expedir ofício ao banco requisitando:", "Com fundamento no art. 128, X e XI, da LC 80/1994 e no art. 162, VI, da LC 988/2006, expedir ofício solicitando ao banco:", 1)
# ── 8. Calculadora ───────────────────────────────────────────────────────
rep("""          // Ordena por data (a API pode devolver fora de ordem cronológica)""", """          // Ordena por data (a API pode devolver fora de ordem cronológica)""", 0)
rep("""    if (positivos.length === 0) throw new Error('sem média publicada""",
    """    positivos.sort(function(a, b){ var pa = a.data.split('/'), pb = b.data.split('/'); return (pa[2] + pa[1] + pa[0]).localeCompare(pb[2] + pb[1] + pb[0]); }); // v13: a API pode devolver fora de ordem
    if (positivos.length === 0) throw new Error('sem média publicada""")
rep("""'caracteriza anatocismo ou cobrança de encargo não pactuado. Cabe repetição de indébito.'""",
    """'indica cobrança acima do pactuado (encargo não previsto ou capitalização não pactuada; a capitalização mensal só é válida se expressamente prevista, Súmulas 539 e 541 do STJ). Cabe apurar a repetição do indébito.'""")
rep("""baseLegal.push('STJ — Súmula 382 (grande discrepância em relação à média de mercado autoriza revisão)');""",
    """baseLegal.push('STJ — REsp 1.061.530/RS (Tema 27): revisão excepcional quando demonstrada a abusividade, com a taxa média do BACEN como referência (Súmula 382: juros acima de 12% a.a., por si sós, não indicam abusividade)');""")
rep("""      baseLegal.push('STJ — Súmula 382');
      baseLegal.push('CDC art. 51, IV — revisão de cláusula abusiva');""", """      baseLegal.push('STJ — REsp 1.061.530/RS (Tema 27) — taxa média do BACEN como referência');
      baseLegal.push('CDC art. 51, IV — revisão de cláusula abusiva');""")
rep("""      + 'Discrepância insuficiente, isoladamente, para sustentar abusividade pela Súmula 382 STJ'""", """      + 'Discrepância insuficiente, isoladamente, para sustentar abusividade (STJ, Tema 27)'""")
rep("""          + bacenAm.toFixed(2) + '% a.m.). A análise pela Súmula 382 STJ <em>isoladamente</em> não sustentaria abusividade — '""", """          + bacenAm.toFixed(2) + '% a.m.). A comparação com a média de mercado <em>isoladamente</em> não sustentaria abusividade — '""")
rep("""      baseLegal.push('Resolução CMN 4.765/2020 — teto de 8% a.m. para cheque especial');""", """      baseLegal.push('Resolução CMN 4.765/2019 — teto de 8% a.m. para os juros do cheque especial (desde 06/01/2020)');""")
rep("""      baseLegal.push('Lei 10.820/2003 — base legal do consignado em folha/benefício');""", """      baseLegal.push('Lei 10.820/2003 e normas do INSS/Resoluções do CNPS — teto vigente na data do contrato');""")
rep("""    baseLegal.push('STJ — Tema 972 (deve ser facultada a escolha da seguradora)');""", """    baseLegal.push('STJ — Tema 972 (o consumidor não pode ser compelido a contratar seguro com a instituição ou com seguradora por ela indicada)');""")
rep("""  L.push('Diante do exposto, requer-se a revisão das cláusulas contratuais com adequação da taxa à referência de mercado e a restituição dos valores cobrados em excesso.');""",
    """  L.push('Diante do exposto, requer-se a revisão das cláusulas contratuais, com a adequação da taxa à referência aplicável, e a restituição dos valores cobrados em excesso.');""")
rep("""    L.push('A taxa média de mercado divulgada pelo Banco Central (série SGS ' + c.info.sgs + ') para a modalidade é de ' + c.bacenAm.toFixed(2) + '% a.m., estando a taxa do contrato ' + (c.nominal / c.bacenAm).toFixed(1) + 'x acima da média de mercado, o que autoriza a revisão à luz da Súmula 382 do STJ.');""",
    """    L.push('A taxa média de mercado divulgada pelo Banco Central (série SGS ' + c.info.sgs + ') para a modalidade é de ' + c.bacenAm.toFixed(2) + '% a.m., estando a taxa do contrato ' + (c.nominal / c.bacenAm).toFixed(1) + 'x a média de mercado, referência adotada pelo STJ para aferir a abusividade (REsp 1.061.530/RS).');""")
rep("""abusividade: ['Verificação de Abusividade — BACEN em Tempo Real', '18 modalidades · Consignado · Pessoal · Cartão · Cheque · Veículo · Bens · Imóvel · Rural · Renegociação'],""",
    """abusividade: ['Verificação de Abusividade — BACEN em Tempo Real', '22 modalidades · tetos históricos do consignado INSS desde 2008 · média do sistema e do próprio banco'],
  consorcio: ['Consórcio — Parcelas, Custo e Restituição', 'Composição da parcela, custo das taxas e estimativa de restituição ao excluído (Lei 11.795/2008)'],""")
rep("""        <p>18 modalidades · taxas BACEN em tempo real ou históricas</p>
      </div>
      <div class="calc-menu-item active" onclick="switchCalc(this,'abusividade')">""", """        <p>22 modalidades · taxas BACEN · consórcio</p>
      </div>
      <div class="calc-menu-item active" data-calc="abusividade" onclick="switchCalc(this,'abusividade')">""")
rep("""        <div><div style="font-weight:700">Verificar Abusividade</div><div style="font-size:10px;color:var(--mi)">Consig · Pessoal · Cartão · Veículo · Imóvel · Cheque</div></div>
      </div>""", """        <div><div style="font-weight:700">Verificar Abusividade</div><div style="font-size:10px;color:var(--mi)">Consig · Pessoal · Cartão · Veículo · Imóvel · Cheque</div></div>
      </div>
      <div class="calc-menu-item" data-calc="consorcio" onclick="switchCalc(this,'consorcio')">
        <span class="calc-menu-icon">🤝</span>
        <div><div style="font-weight:700">Consórcio</div><div style="font-size:10px;color:var(--mi)">Parcela · custo das taxas · restituição</div></div>
      </div>""")
rep("""Verifica se há <strong style="color:var(--rd);">abusividade</strong> em 18 modalidades de crédito""", """Verifica <strong style="color:var(--rd);">indícios de abusividade</strong> em 22 modalidades de crédito""")
rep("""                  <option value="consig_inss">Empréstimo Consignado — INSS (teto 1,80% a.m.)</option>
                  <option value="consig_pub">Empréstimo Consignado — Setor Público (teto 2,05% a.m.)</option>
                  <option value="consig_priv">Empréstimo Consignado — Setor Privado / CLT (sem teto fixo)</option>
                  <option value="rmc">Cartão Consignado RMC — Reserva de Margem (teto 2,89% a.m.)</option>
                  <option value="rcc">Cartão Consignado RCC — Rotativo Consignado (teto 3,06% a.m.)</option>""",
"""                  <option value="consig_inss">Empréstimo Consignado — INSS (teto conforme a data: 1,85% a.m. desde 04/2025)</option>
                  <option value="consig_pub">Empréstimo Consignado — Setor Público (teto definido pelo ente: informar manualmente)</option>
                  <option value="consig_priv">Empréstimo Consignado — Setor Privado / CLT (sem teto fixo)</option>
                  <option value="rmc">Cartão de Crédito Consignado — RMC (teto conforme a data: 2,46% a.m. desde 06/2024)</option>
                  <option value="rcc">Cartão Consignado de Benefício — RCC (teto conforme a data: 2,46% a.m. desde 06/2024)</option>""")
rep("""                  <option value="pessoal">Crédito Pessoal Não Consignado</option>""", """                  <option value="pessoal">Crédito Pessoal Não Consignado</option>
                  <option value="pessoal_sem_garantia">Crédito Pessoal sem Garantia Real</option>
                  <option value="pessoal_garantia">Crédito Pessoal com Garantia Real (bem como garantia)</option>
                  <option value="microcredito">Microcrédito para Consumo</option>
                  <option value="cartao_total">Cartão de Crédito — Total (rotativo + parcelado)</option>""")
rep("""<option value="cheque_esp">Cheque Especial (teto 8% a.m. — Res. CMN 4.765/2020)</option>""", """<option value="cheque_esp">Cheque Especial (teto 8% a.m. desde 06/01/2020 — Res. CMN 4.765/2019)</option>""")
rep("""                <select id="ab-data-mes" onchange="sincronizarDataContrato()">""", """                <select id="ab-data-dia" title="Dia (opcional)" onchange="sincronizarDataContrato()"><option value="">Dia (opc.)</option></select>
                <select id="ab-data-mes" onchange="sincronizarDataContrato()">""")
rep("""<div style="display:grid;grid-template-columns:1.4fr 1fr;gap:8px;">
                <select id="ab-data-dia\"""", """<div style="display:grid;grid-template-columns:.9fr 1.4fr 1fr;gap:8px;">
                <select id="ab-data-dia\"""")
rep("""<span class="hint">Escolha o mês e o ano. O sistema usa o teto e a média BACEN daquele período.</span>""",
    """<span class="hint">Escolha o mês e o ano (o dia é opcional: só faz diferença quando o teto do consignado mudou dentro do mês). O sistema usa o teto e a média BACEN daquele período.</span>""")
rep("""          <!-- Taxa cobrada (opcional) + seguro prestamista -->""", """          <!-- v13: quitação antecipada e encargos financiados -->
          <div class="calc-row">
            <div class="calc-field">
              <label>Parcelas já pagas <em class="opt">— opcional</em><span class="ajuda-q" onclick="mostrarAjuda(event,this)" data-titulo="Parcelas já pagas" data-texto="Com esse número, o sistema estima o <strong>saldo para quitação antecipada</strong> pela taxa do contrato e quanto de juros deixa de ser pago (CDC, art. 52, § 2º). Vale para empréstimos em parcelas iguais.">?</span></label>
              <span class="hint">Para estimar o saldo de quitação antecipada.</span>
              <input type="number" id="ab-pagas" min="0" step="1" placeholder="Ex: 12">
            </div>
            <div class="calc-field">
              <label>Tarifas, seguros e serviços financiados (R$) <em class="opt">— opcional</em><span class="ajuda-q" onclick="mostrarAjuda(event,this)" data-titulo="Encargos financiados" data-texto="Some os valores de <strong>tarifa de cadastro, avaliação do bem, registro, serviços de terceiros, seguros e assistências</strong> incluídos no valor financiado (aparecem no quadro de valores da cédula). O sistema mostra quanto eles custam com os juros do contrato.">?</span></label>
              <span class="hint">Comum em financiamento de veículo.</span>
              <input type="text" inputmode="decimal" id="ab-encargos" placeholder="Ex: 1.850,00" oninput="mascararMoeda(this)">
            </div>
          </div>

          <!-- Taxa cobrada (opcional) + seguro prestamista -->""")
rep("""                  <label>Número do procedimento / protocolo</label>""", """                  <label>Nº do DOL / procedimento</label>""")
rep("""            <strong>📌 Limites legais:</strong> Consignado INSS <strong>1,80%</strong> a.m. · Setor Público <strong>2,05%</strong> a.m. · RMC <strong>2,89%</strong> a.m. · RCC <strong>3,06%</strong> a.m. · Cheque Especial <strong>8%</strong> a.m. (Res. CMN 4.765/2020).
            Para as demais modalidades não há teto legal fixo — a abusividade é aferida pela <strong>Súmula 382 STJ</strong> (taxa muito acima da média de mercado BACEN, com critério usual de 1,5x a 2x).""",
"""            <strong>📌 Tetos:</strong> o consignado INSS e os cartões consignados têm teto que muda com o tempo — a calculadora aplica o do mês da contratação (tabela completa na aba Ajuda). Hoje: empréstimo <strong>1,85%</strong> a.m.; RMC e RCC <strong>2,46%</strong> a.m. Cheque especial: <strong>8%</strong> a.m. desde 06/01/2020 (Res. CMN 4.765/2019). Rotativo do cartão: juros e encargos limitados ao valor original da dívida desde 03/01/2024 (Lei 14.690/2023).
            Nas demais modalidades não há teto fixo: a revisão de juros é excepcional e exige demonstrar discrepância relevante em relação à <strong>taxa média do BACEN</strong> (STJ, REsp 1.061.530/RS; Súmula 382). Os critérios de 1,5x e 2x usados aqui são referências de triagem, não regra legal.""")
CONS = '''        <!-- ══ CONSÓRCIO (v13) ════════════════════════════════════ -->
        <div class="calc-section" id="cs-consorcio">
          <p style="font-size:12.5px;color:var(--mi);margin-bottom:14px;line-height:1.65;">Consórcio não tem juros: o custo está na <strong>taxa de administração</strong>, no <strong>fundo de reserva</strong> e no <strong>seguro</strong>. Este cálculo mostra a composição da parcela, o custo total das taxas e uma <strong>estimativa da restituição</strong> ao consorciado excluído (Lei 11.795/2008, art. 30). Não depende do BACEN.</p>
          <div class="calc-row">
            <div class="calc-field"><label>Valor do crédito (carta) — R$ <span class="req">*</span></label><input type="text" inputmode="decimal" id="cs-credito" placeholder="Ex: 60.000,00" oninput="mascararMoeda(this)"></div>
            <div class="calc-field"><label>Prazo do grupo (meses) <span class="req">*</span></label><input type="number" id="cs-prazo" min="1" placeholder="Ex: 80"></div>
          </div>
          <div class="calc-row">
            <div class="calc-field"><label>Taxa de administração total (%)</label><span class="hint">Percentual sobre o crédito, para todo o plano (contrato).</span><input type="text" inputmode="decimal" id="cs-adm" placeholder="Ex: 16,00" oninput="mascararTaxa(this)"></div>
            <div class="calc-field"><label>Fundo de reserva total (%)</label><span class="hint">Se houver.</span><input type="text" inputmode="decimal" id="cs-fr" placeholder="Ex: 2,00" oninput="mascararTaxa(this)"></div>
          </div>
          <div class="calc-row">
            <div class="calc-field"><label>Seguro mensal (R$)</label><input type="text" inputmode="decimal" id="cs-seg" placeholder="Ex: 25,00" oninput="mascararMoeda(this)"></div>
            <div class="calc-field"><label>Parcelas pagas</label><input type="number" id="cs-pagas" min="0" placeholder="Ex: 14"></div>
          </div>
          <div class="calc-row">
            <div class="calc-field"><label>Valor atual do bem de referência (R$) <em class="opt">— opcional</em></label><span class="hint">A restituição usa o valor do bem na data da assembleia; sem ele, usa o crédito informado.</span><input type="text" inputmode="decimal" id="cs-bem-atual" placeholder="Ex: 64.500,00" oninput="mascararMoeda(this)"></div>
            <div class="calc-field"><label>Cláusula penal prevista (%) <em class="opt">— opcional</em></label><span class="hint">Só se prevista no contrato; costuma exigir prova de prejuízo ao grupo.</span><input type="text" inputmode="decimal" id="cs-multa" placeholder="Ex: 10,00" oninput="mascararTaxa(this)"></div>
          </div>
          <div class="calc-actions"><button class="calc-btn" onclick="calcConsorcio()">🧮 Calcular consórcio</button><button class="calc-btn-sec" onclick="limparConsorcio()">↺ Limpar</button></div>
          <div id="cs-res"></div>
        </div><!-- /cs-consorcio -->

      </div><!-- /calc-body -->'''
rep("""        </div><!-- /cs-abusividade -->

      </div><!-- /calc-body -->""", """        </div><!-- /cs-abusividade -->

""" + CONS)

# ── 9. Aba Documentos: substituída pela versão v13 ────────────────────────
i0 = s.index('<div class="app-page" id="page-docs">'); i1 = s.index('</div><!-- /page-docs -->') + len('</div><!-- /page-docs -->')
s = s[:i0] + rd('src/docs.html').strip() + s[i1:]

# ── 10. Modelos .docx da v12 (substituídos pelo modelo institucional) ──────
rep("var B64_OFICIO = '__B64_OFICIO__';", "var B64_OFICIO = ''; // v13: substituído pelo modelo institucional (B64_BASE_V13) — ver bloco v13 ao final")
rep("var B64_AUTORIZACAO = '__B64_AUTORIZACAO__';", "var B64_AUTORIZACAO = ''; // v13: idem")
rep("var B64_OFICIO_INSS = '__B64_OFICIO_INSS__';", "var B64_OFICIO_INSS = ''; // v13: idem")

# ── 11. Histórico da calculadora: guarda só as iniciais (privacidade) ─────
rep("""      assistido: (c.inst && c.inst.assistido) || '', vTitle: c.vTitle, nivel: c.nivel,""",
    """      assistido: ((c.inst && c.inst.assistido) || '').split(/\\s+/).filter(Boolean).map(function(p){ return p.charAt(0).toUpperCase() + '.'; }).join(' '), vTitle: c.vTitle, nivel: c.nivel, // v13: só iniciais""")

# ── 12. Ajuda ────────────────────────────────────────────────────────────
rep("""        <li><strong>Documentos</strong> — gera ofício requisitório e autorização expressa em Word</li>""",
    """        <li><strong>Documentos</strong> — dados do atendimento em um só lugar; ofício à instituição, ofício ao INSS e autorização no modelo institucional (uma página); minuta de e-mail para a Triagem; cadastro de instituições</li>""")
i0 = s.index('<div class="ajuda-gloss" id="ajuda-gloss-grid">') + len('<div class="ajuda-gloss" id="ajuda-gloss-grid">')
i1 = s.index('    <!-- Metodologia -->')
GL = [
 ('Taxa Nominal de Juros (% a.m.)', 'Apenas os juros do dinheiro emprestado, sem encargos. É o que se compara com o <strong>teto</strong> e com a <strong>média BACEN</strong>. No contrato: "Taxa de Juros Mensal" ou "Juros Remuneratórios".'),
 ('CET — Custo Efetivo Total (% a.m.)', 'Juros + tributos + tarifas + seguros. Informação obrigatória (Res. CMN 4.881/2020; antes, 3.517/2007). A diferença CET − nominal mostra o peso dos encargos acessórios.'),
 ('Capitalização (juros sobre juros)', 'Permitida com periodicidade mensal em contratos desde 31/3/2000, se expressamente pactuada; a taxa anual maior que 12 vezes a mensal já indica a pactuação (Súmulas 539 e 541 do STJ). Cobrança acima do pactuado é indício a conferir.'),
 ('Revisão de juros (Tema 27 e Súmula 382)', 'Juros acima de 12% a.a., por si sós, não indicam abusividade (Súmula 382). A revisão é excepcional e exige demonstrar abusividade no caso, usando a média do BACEN como referência (REsp 1.061.530/RS).'),
 ('Súmula 530 STJ', 'Sem o contrato (ou sem pactuação da taxa), aplica-se a taxa média de mercado do BACEN para a mesma operação, salvo se a cobrada for menor.'),
 ('Tetos do consignado INSS', 'Variam com a data do contrato. Desde 04/04/2025: empréstimo <strong>1,85%</strong> a.m.; cartões RMC e RCC <strong>2,46%</strong> a.m. Histórico completo desde 2008 na seção "Tetos históricos" abaixo.'),
 ('RMC e RCC', '<strong>RMC</strong>: cartão de crédito consignado (reserva de margem de 5%). <strong>RCC</strong>: cartão consignado de benefício (outra margem de 5%). Novas operações estão suspensas por cautelar do TCU (comunicado do INSS de setembro de 2026).'),
 ('Margem consignável', 'Benefício do RGPS: até 45% (35% empréstimos + 5% RMC + 5% RCC). BPC: até 35%. Retenção acima do limite faz a instituição perder as garantias da lei (Lei 10.820/2003, art. 6º, § 6º). Descontos em conta-corrente seguem outra regra (STJ, Tema 1.085).'),
 ('Registrato', 'Sistema gratuito do BACEN (registrato.bcb.gov.br, login Gov.br) que lista os contratos de crédito no CPF. Principal ferramenta para descobrir contratos não reconhecidos.'),
 ('MED — Mecanismo Especial de Devolução (PIX)', 'Pedido em até 80 dias da transação, em fraude ou falha de segurança, pelo aplicativo do banco. Desde fevereiro de 2026 (MED 2.0), rastreia transferências sucessivas. Não cobre engano de digitação.'),
 ('Tema 466 e Súmula 479 STJ', 'Os bancos respondem objetivamente por fraudes de terceiros em suas operações (fortuito interno), como conta aberta ou empréstimo obtido com documentos falsos.'),
 ('Tema 1.061 STJ', 'Quando o consumidor impugna a assinatura do contrato juntado pelo banco, cabe ao banco provar a autenticidade (perícia ou outros meios, inclusive em contratação digital: biometria, geolocalização, registros).'),
 ('Temas 958 e 972 STJ', '958: tarifas de avaliação do bem e de registro são válidas se o serviço foi prestado e sem onerosidade excessiva; serviços de terceiros sem especificação são abusivos. 972: ninguém pode ser obrigado a contratar seguro com o banco ou seguradora indicada; encargo acessório abusivo não afasta a mora.'),
 ('Busca e apreensão de veículo', 'Judicial: 5 dias da execução da liminar para pagar a integralidade da dívida (DL 911/69, art. 3º; Temas 722 e 1.279), em dias corridos; resposta em 15 dias. Extrajudicial (cartório ou Detran): 20 dias para pagar ou impugnar (art. 8º-B). Mora comprovada por carta ao endereço do contrato (Tema 1.132). Adimplemento substancial não se aplica (REsp 1.622.555/MG).'),
 ('Alienação fiduciária de imóvel', 'Intimação do Registro de Imóveis: 15 dias para purgar a mora (Lei 9.514/97, art. 26). Imóvel residencial: pagamento das parcelas vencidas até a averbação da consolidação (art. 26-A, § 2º). Preferência na compra até o segundo leilão (art. 27, § 2º-B).'),
 ('Superendividamento e mínimo existencial', 'CDC, arts. 54-A a 54-G e 104-A a 104-C. Decreto 11.150/2022 (alterado pelo 11.567/2023). Em 2026 o STF manteve o parâmetro, mandou revisá-lo periodicamente e incluir as parcelas de consignado no cálculo.'),
 ('Rotativo do cartão (Lei 14.690/2023)', 'Para dívidas desde 03/01/2024, juros e encargos do rotativo e do parcelamento da fatura não podem superar o valor original da dívida (Res. CMN 5.112/2023).'),
 ('Consórcio', 'Lei 11.795/2008. O excluído concorre aos sorteios para restituição e recebe o valor pago ao fundo comum calculado pelo percentual amortizado (art. 30). Taxa de administração é livre (Súmula 538). Contratos antigos: Tema 312.'),
 ('Prioridade legal e vulnerabilidade', 'Prioridade legal: pessoa idosa (Lei 10.741/2003, arts. 3º e 71, inclusive em instituições financeiras), pessoa com deficiência (Lei 13.146/2015, art. 9º) e, em procedimentos administrativos, doença grave (Lei 9.784/1999, art. 69-A). Vulnerabilidade agravada (idade, analfabetismo, doença) também pesa na oferta de crédito (CDC, arts. 39, IV, e 54-C, IV).'),
]
s = s[:i0] + '\n' + '\n'.join('        <div class="ajuda-gloss-item">\n          <strong>%s</strong>\n          <p>%s</p>\n        </div>' % g for g in GL) + '\n      </div>\n    </div>\n\n    <!-- v13: tetos históricos -->\n    <div class="ajuda-sec">\n      <h3>Tetos históricos do consignado INSS (empréstimo e cartões)</h3>\n      <div id="ajuda-tetos"></div>\n    </div>\n\n' + s[i1:]
rep("""          <li><strong>Contratos antes de 01/2022:</strong> o teto INSS/RMC/RCC variou. Use o <strong>campo de teto manual</strong> que aparece na calculadora, com a Resolução CNPS da época (consultar em <a href="https://www.gov.br/previdencia" target="_blank">gov.br/previdencia</a>).</li>""",
    """          <li><strong>Tetos do consignado:</strong> o sistema tem os tetos do INSS desde 19/05/2008 e aplica o do mês do contrato. Para contratos anteriores, ou de consignado de servidor público (teto definido por cada ente), use o <strong>campo de teto manual</strong>.</li>
          <li><strong>Jurisprudência:</strong> as referências são de apoio à triagem. Confira o inteiro teor e a situação dos temas (ex.: Tema 1.264, pendente) antes de citar em peça.</li>
          <li><strong>Cadastro de instituições:</strong> endereços da sede vêm do cadastro do CNPJ (Receita Federal) e as agências de Ribeirão Preto, do cadastro da unidade. Confirme o canal de envio com a Triagem.</li>""")
rep("""      <h3>Modalidades vinculadas (18) — séries SGS BACEN</h3>
      <p>Códigos SGS conferidos no portal oficial de Dados Abertos do BACEN em <strong>28/05/2026</strong>. <strong>RMC e RCC não possuem série de média de mercado no BACEN</strong> — são analisadas apenas pelo teto legal (CNPS).</p>""",
    """      <h3>Modalidades vinculadas (22) — séries SGS BACEN</h3>
      <p>Códigos SGS conferidos no portal de Dados Abertos do BACEN em <strong>16/11/2026</strong>. <strong>RMC e RCC não possuem série de média de mercado</strong> — são analisadas pelo teto da época.</p>""")
rep("""          <tr><td>Consignado INSS</td><td>25468</td><td>Price</td><td>1,80% a.m.</td></tr>
          <tr><td>Consignado Setor Público</td><td>25467</td><td>Price</td><td>2,05% a.m.</td></tr>""", """          <tr><td>Consignado INSS</td><td>25468</td><td>Price</td><td>conforme a data (1,85% desde 04/2025)</td></tr>
          <tr><td>Consignado Setor Público</td><td>25467</td><td>Price</td><td>definido pelo ente (manual)</td></tr>""")
rep("""          <tr><td>Cartão RMC</td><td>— (sem série BACEN)</td><td>Rotativo</td><td>2,89% a.m.</td></tr>
          <tr><td>Cartão RCC</td><td>— (sem série BACEN)</td><td>Rotativo</td><td>3,06% a.m.</td></tr>
          <tr><td>Pessoal Não Consignado</td><td>20742</td><td>Price</td><td>—</td></tr>""", """          <tr><td>Cartão RMC</td><td>— (sem série BACEN)</td><td>Rotativo</td><td>conforme a data (2,46% desde 06/2024)</td></tr>
          <tr><td>Cartão RCC (benefício)</td><td>— (sem série BACEN)</td><td>Rotativo</td><td>conforme a data (2,46% desde 06/2024)</td></tr>
          <tr><td>Pessoal Não Consignado</td><td>20742</td><td>Price</td><td>—</td></tr>
          <tr><td>Pessoal sem garantia real</td><td>29974</td><td>Price</td><td>—</td></tr>
          <tr><td>Pessoal com garantia real</td><td>29973</td><td>Price</td><td>—</td></tr>
          <tr><td>Microcrédito para consumo</td><td>20779</td><td>Price</td><td>—</td></tr>""")
rep("""          <tr><td>Cartão Crédito Parcelado</td><td>22023</td><td>Price</td><td>—</td></tr>
          <tr><td>Cheque Especial</td><td>20741</td><td>Rotativo</td><td>8% a.m.</td></tr>""", """          <tr><td>Cartão Crédito Parcelado</td><td>22023</td><td>Price</td><td>—</td></tr>
          <tr><td>Cartão Crédito Total</td><td>22024</td><td>Price</td><td>—</td></tr>
          <tr><td>Cheque Especial</td><td>20741</td><td>Rotativo</td><td>8% a.m. desde 06/01/2020</td></tr>""")
rep("""        <li><strong>Séries SGS BACEN:</strong> códigos conferidos no portal de Dados Abertos em <strong>28/05/2026</strong></li>""",
    """        <li><strong>Séries SGS BACEN:</strong> códigos conferidos no portal de Dados Abertos em <strong>16/11/2026</strong></li>
        <li><strong>Tetos do consignado INSS:</strong> 2008 a 2020 conferidos na IN INSS/PRES 28/2008 consolidada; 2021 em diante pela tabela pública de vigências (16/11/2026). Teto vigente: 1,85% e 2,46% a.m.</li>
        <li><strong>Normas e jurisprudência revisadas em 16/11/2026:</strong> LC 80/1994 e LC 988/2006 (prerrogativas), Lei 10.820/2003 (margem), DL 911/1969 (inclusive art. 8º-B), Lei 9.514/1997 (arts. 26 a 27), CDC (crédito responsável e superendividamento), Estatuto da Pessoa Idosa, LBI e Lei 9.784/1999.</li>
        <li><strong>Cadastro de instituições:</strong> participantes do BACEN e endereço da sede no CNPJ (Receita Federal) consultados em 16/11/2026</li>""")
rep("""        <li><strong>Tetos CNPS:</strong> confirmados como vigentes desde <strong>01/2022</strong> (para contratos anteriores, usar campo manual)</li>
        <li><strong>Teto Cheque Especial:</strong> 8% a.m. — Res. CMN 4.765/2020 (em vigor desde 03/2020)</li>""",
    """        <li><strong>Teto Cheque Especial:</strong> 8% a.m. — Res. CMN 4.765/2019 (em vigor desde 06/01/2020)</li>""")
rep("""      <p style="font-size:11.5px;color:var(--mi);font-style:italic;margin-top:8px;">Quando houver atualização de SM, Resolução CNPS, ou nova Res. CMN, as constantes no topo do bloco JavaScript precisam ser revisadas pelo administrador do sistema.</p>""",
    """      <p style="font-size:11.5px;color:var(--mi);font-style:italic;margin-top:8px;">Quando houver novo salário mínimo, nova Resolução do CNPS ou nova norma do CMN, revise: SALARIO_MINIMO_ATUAL e LIMITES_LEGAIS (bloco da calculadora) e a tabela TETOS_INSS (bloco "v13 — DADOS DE REFERÊNCIA").</p>""")

# ── 13. Tutorial e modal de limitações ───────────────────────────────────
rep("""            <li><strong>Busca e apreensão de veículo</strong> — DL 911/69: <strong>5 dias úteis da citação</strong> para purgar a mora.</li>""",
    """            <li><strong>Busca e apreensão de veículo</strong> — DL 911/69: <strong>5 dias (corridos) da apreensão</strong> para pagar a integralidade da dívida; no procedimento do cartório, <strong>20 dias</strong>.</li>""")
rep("""          👵 <strong>O contrato da Dona Maria:</strong> consignado INSS, assinado em <strong>03/2024</strong>,""", """          👵 <strong>O contrato da Dona Maria:</strong> consignado INSS, assinado em <strong>07/2024</strong>,""")
rep("""          <li>Em "quando foi assinado?", selecione <strong>Março</strong> e <strong>2024</strong></li>""", """          <li>Em "quando foi assinado?", selecione <strong>Julho</strong> e <strong>2024</strong></li>""")
rep("""        <p>O teto do consignado INSS é <strong>1,80% a.m.</strong> — como a Dona Maria está pagando 2,90%, o sistema vai apontar abusividade.""",
    """        <p>Em julho de 2024 o teto do consignado INSS era <strong>1,66% a.m.</strong> (Resolução CNPS 1.365/2024) — como a Dona Maria está pagando 2,90%, o sistema vai apontar indício forte.""")
rep("""No caso da Dona Maria (2,90% contra teto de 1,80%), dá <strong>🔴 vermelho</strong>.""", """No caso da Dona Maria (2,90% contra teto de 1,66%), dá <strong>🔴 vermelho</strong>.""")
rep("""  setDataContrato('2024-03');""", """  setDataContrato('2024-07');""")
rep("""        <p class="ws-aviso">💡 Regra prática: <strong>sem DOL, não gere o ofício</strong>. Pergunte primeiro.</p>""",
    """        <p class="ws-aviso">💡 Regra prática: <strong>confirme o DOL antes de gerar o ofício</strong>. Preencha-o uma vez em "Dados do atendimento": ele vai para todos os documentos e para a minuta de e-mail.</p>""")
rep("""            <li>No <strong>nome do banco</strong>, comece a digitar e escolha na lista — o <strong>endereço entra sozinho</strong> (agência de Ribeirão Preto ou matriz)</li>
            <li>Preencha nº do ofício, nome e CPF da assistida — esses dados <strong>passam para a Autorização automaticamente</strong></li>""",
    """            <li>Em <strong>1. Dados do atendimento</strong>, preencha nome, CPF, DOL, instituição e contrato, marque as <strong>prioridades</strong> e escolha o <strong>prazo</strong> — tudo vale para todos os documentos</li>
            <li>No ofício, confira o <strong>endereço</strong> (sede pelo CNPJ ou agência de Ribeirão Preto) e o <strong>modelo do pedido</strong>; clique em <strong>Revisar</strong> para ver a página antes de baixar</li>""")
rep("""        <li><strong>Contratos antes de 01/2022</strong> — o teto INSS/RMC/RCC variou; use o campo de teto manual com a Resolução CNPS da época.</li>""",
    """        <li><strong>Consignado INSS</strong> — o teto da época é aplicado automaticamente desde 05/2008; antes disso, ou para servidor público, use o campo de teto manual.</li>""")
rep("""      <li><strong>Contratos antes de 01/2022:</strong> o teto INSS/RMC/RCC variou ao longo dos anos. Acesse <a href="https://www.gov.br/previdencia" target="_blank">gov.br/previdencia</a> para encontrar a Resolução CNPS vigente na época e use o <strong>campo de teto manual</strong> que aparece na calculadora.</li>""",
    """      <li><strong>Tetos do consignado:</strong> o sistema aplica automaticamente o teto do INSS do mês do contrato desde 05/2008. Para contratos anteriores ou de servidor público, use o <strong>campo de teto manual</strong>.</li>""", 1)
rep_re(r"<li><strong>Contratos antes de 01/2022:</strong> o teto INSS/RMC/RCC variou ao longo dos anos\.[^<]*<a[^>]*>gov\.br/previdencia</a>[^<]*<strong>campo de teto manual</strong>[^<]*</li>",
       "<li><strong>Tetos do consignado:</strong> o sistema aplica automaticamente o teto do INSS do mês do contrato desde 05/2008. Para contratos anteriores ou de servidor público, use o <strong>campo de teto manual</strong>.</li>", 0)
rep("""        <p class="ws-final">Bom atendimento! 💚<br><small>Sistema desenvolvido para a DPE-SP — Unidade Ribeirão Preto.</small></p>""",
    """        <p class="ws-final">Bom atendimento! 💚<br><small>Sistema de apoio da DPESP — Unidade de Ribeirão Preto · v13.0.</small></p>""")

# ── 14. Rodapé do sistema, modal de revisão e scripts v13 ─────────────────
FOOT = '''<!-- v13: rodapé institucional -->
<footer class="site-footer">
  <div class="site-footer-inner">
    <img class="v13-ft-logo" src="''' + LOGO_NEG + '''" alt="Defensoria Pública do Estado de São Paulo" width="200" height="30">
    <img id="v13-logo-pos" src="''' + LOGO_POS + '''" alt="" aria-hidden="true" width="200" height="30">
    <div class="site-footer-txt"><strong>Triagem Jurídica Bancária · v13.0</strong><br>Ferramenta interna de apoio da Unidade de Ribeirão Preto. Resultado preliminar: não substitui a análise do(a) defensor(a). Os dados do(a) assistido(a) não são salvos; preferências (e-mails institucionais, cadastro de instituições, dados da unidade) ficam só neste navegador.</div>
  </div>
</footer>

<!-- v13: revisão do documento antes de baixar -->
<div class="v13-prev-modal" id="v13-prev-modal" role="dialog" aria-label="Revisão do documento" onclick="if(event.target===this)docFecharPrevia()">
  <div class="v13-prev-bar">
    <div class="fit" id="v13-prev-fit"></div>
    <select id="v13-prev-padrao" class="v13-campo" style="width:auto;max-width:100%;padding:7px 10px;font-size:12px;" title="Padrão de redação" onchange="docTrocarPadrao(this.value)"></select>
    <button class="btn-doc-dl" type="button" id="v13-prev-baixar" onclick="docGerar(document.getElementById('v13-prev-modal').dataset.tipo)">Baixar .docx</button>
    <button class="btn-doc-copy" type="button" onclick="docImprimirPrevia()">Imprimir ou salvar em PDF</button>
    <button class="btn-doc-copy" type="button" onclick="docFecharPrevia()">Fechar</button>
  </div>
  <div id="v13-prev-page"></div>
</div>

'''
rep("""<script>
/* ═══ APP v12 ═══ — ESPELHO VISUAL""", FOOT + """<script>
/* ═══ APP v12 ═══ — ESPELHO VISUAL""")
B64BASE = open(os.path.join(W, 'out/base_v13.b64')).read().strip()
INSTJ = open(os.path.join(W, 'out/inst_cadastro.json'), encoding='utf-8').read().strip()
SCRIPTS = ('<script>\n/* v13 — modelo institucional (.docx) usado na geração dos documentos: cabeçalho com o logotipo oficial, estilos e margens do\n   "Modelo de Ofício Institucional DPESP"; o corpo é montado pelo sistema. */\nvar B64_BASE_V13 = \'' + B64BASE + '\';\n'
           + '/* v13 — cadastro de instituições: participantes do BACEN + sede no CNPJ (Receita Federal, consulta de 16/11/2026) + lista curada da v12. */\nvar INST_CADASTRO = ' + INSTJ + ';\n</script>\n'
           + '<script>\n' + rd('src/v13_data.js') + '\n</script>\n<script>\n' + rd('src/v13_docx.js') + '\n</script>\n<script>\n' + rd('src/v13_cenarios.js')
           + "\n/* Tema 1.061 também nos cenários de contratação não reconhecida */\n['END_inss_fraude_total', 'END_emp_fraude', 'END_conta_emp_fraude', 'END_car_fraude_total'].forEach(function (k) { if (T[k] && T[k].jurisprudencia && !T[k].jurisprudencia.some(function (j) { return /1\\.061/.test(j.ref); })) T[k].jurisprudencia.push(_T1061); });\n</script>\n<script>\n" + rd('src/v13_app.js') + '\n</script>\n')
rep('</body>\n</html>', SCRIPTS + '</body>\n</html>')

out = os.path.join(W, 'out', 'TriagemDPESP_Financeira_v13.html')
open(out, 'w', encoding='utf-8', newline='\n').write(s)
print('OK', len(LOG), 'alterações · tamanho', round(len(s.encode('utf-8')) / 1024), 'KB')
