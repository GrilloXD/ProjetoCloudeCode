/* ═══════════════════════════════════════════════════════════════════════
   v13 — CÁLCULOS QUE NÃO DEPENDEM DO BACEN
   Consórcio (com simulação mês a mês), taxa real do contrato, simulação de
   empréstimo (Price e SAC), quitação antecipada, margem consignável, devolução
   de descontos indevidos e mínimo existencial. Funções de cálculo puras (cx*)
   separadas da tela, para poderem ser conferidas isoladamente.
   ═══════════════════════════════════════════════════════════════════════ */

Object.assign(calcTitles, {
  consorcio: ['Consórcio — Parcelas, Custo, Restituição e Simulação', 'Lei 11.795/2008 · não há juros nem taxa média do BACEN: o custo está nas taxas do plano'],
  taxareal: ['Taxa Real do Contrato', 'Descobre a taxa a partir do valor recebido, da parcela e do número de parcelas'],
  simula: ['Simulação de Empréstimo ou Financiamento', 'Tabela Price ou SAC, com a evolução do saldo devedor'],
  quitacao: ['Quitação Antecipada', 'Redução proporcional dos juros (CDC, art. 52, § 2º · Resolução CMN 5.004/2022)'],
  margem: ['Margem Consignável', 'Limites de desconto em folha ou no benefício'],
  indebito: ['Devolução de Descontos Indevidos', 'Valor simples e em dobro (CDC, art. 42, parágrafo único)'],
  minimo: ['Mínimo Existencial', 'Superendividamento (Lei 14.181/2021 · Decreto 11.150/2022)']
});

/* ── utilidades ── */
function cxNum(id) { return parseMoeda(v13Val(id)); }
function cxInt(id) { var n = parseInt(v13Val(id), 10); return isNaN(n) ? 0 : n; }
function cxPct(x, d) { return (x == null || !isFinite(x)) ? '—' : x.toFixed(d == null ? 2 : d).replace('.', ',') + '%'; }
function cxCel(l, v, cls) { return '<div><span>' + l + '</span><strong' + (cls ? ' class="' + cls + '"' : '') + '>' + v + '</strong></div>'; }
function cxBloco(titulo, celulas) { return '<div class="calc-block-title" style="margin-top:12px;">' + titulo + '</div><div class="calc-block-grid">' + celulas + '</div>'; }
function cxAviso(cls, html) { return '<div class="v13-info ' + cls + '" style="margin-top:10px;">' + html + '</div>'; }
function cxAnual(im) { return (Math.pow(1 + im, 12) - 1); }
function cxMensal(ia) { return (Math.pow(1 + ia, 1 / 12) - 1); }
function limparCalcV13(id) {
  var sec = $id('cs-' + id); if (!sec) return;
  sec.querySelectorAll('input,textarea').forEach(function (e) { if (e.type === 'number' || e.type === 'month' || e.tagName === 'TEXTAREA' || !e.defaultValue) e.value = ''; else e.value = e.defaultValue; });
  sec.querySelectorAll('[id$="-res"],#cs-sim').forEach(function (e) { e.innerHTML = ''; });
}

/* ── fórmulas ── */
/* Parcela da Tabela Price (i em fração ao mês). */
function cxPmt(pv, i, n) { return i === 0 ? pv / n : pv * i / (1 - Math.pow(1 + i, -n)); }
/* Valor presente de n parcelas iguais. */
function cxPv(p, i, n) { return i === 0 ? p * n : p * (1 - Math.pow(1 + i, -n)) / i; }
/* Taxa mensal implícita (valor recebido, parcela, prazo) por bissecção; null se não houver juros positivos. */
function cxTaxaImplicita(pv, p, n) {
  if (!(pv > 0 && p > 0 && n > 0) || p * n <= pv) return null;
  var lo = 1e-9, hi = 1;
  while (cxPv(p, hi, n) > pv && hi < 1000) hi *= 2;
  for (var k = 0; k < 200; k++) { var mid = (lo + hi) / 2; if (cxPv(p, mid, n) > pv) lo = mid; else hi = mid; }
  return (lo + hi) / 2;
}
/* Tabela de amortização (Price ou SAC). */
/* O saldo de cada mês é calculado por fórmula fechada (valor presente das parcelas restantes, no Price,
   ou fração do principal, no SAC), sem acumular erro de arredondamento em prazos longos. */
function cxTabela(pv, i, n, sistema) {
  var linhas = [], pPrice = cxPmt(pv, i, n), totJ = 0, totP = 0, sac = sistema === 'sac';
  var saldoEm = function (k) { return k <= 0 ? 0 : (sac ? pv * k / n : cxPv(pPrice, i, k)); };
  for (var t = 1; t <= n; t++) {
    var saldoAnt = saldoEm(n - t + 1), saldo = saldoEm(n - t);
    var juros = saldoAnt * i, amort = saldoAnt - saldo, parcela = juros + amort;
    totJ += juros; totP += parcela;
    linhas.push({ t: t, parcela: parcela, juros: juros, amort: amort, saldo: saldo });
  }
  return { linhas: linhas, juros: totJ, total: totP };
}
/* Consórcio: fluxo mês a mês. Parcela = (bem do mês × (1 + adm + fundo de reserva) / prazo) + seguro.
   O fundo comum amortiza 1/prazo do bem por parcela; o bem é reajustado a cada 12 meses. */
function cxConsorcioFluxo(o) {
  var meses = [], pago = 0, admTot = 0, fcTot = 0;
  for (var t = 1; t <= o.prazo; t++) {
    var bem = o.credito * Math.pow(1 + (o.reaj || 0) / 100, Math.floor((t - 1) / 12));
    var fc = bem / o.prazo, adm = bem * (o.adm || 0) / 100 / o.prazo, fr = bem * (o.fr || 0) / 100 / o.prazo;
    var parcela = fc + adm + fr + (o.seg || 0);
    pago += parcela; admTot += adm; fcTot += fc;
    var amort = t / o.prazo, restBruta = amort * bem, multa = restBruta * (o.multa || 0) / 100;
    meses.push({ t: t, bem: bem, parcela: parcela, fc: fc, adm: adm, fr: fr, pago: pago, admPaga: admTot, fcPago: fcTot, amort: amort, restituicao: restBruta - multa });
  }
  return meses;
}
/* Taxa mensal equivalente do consórcio contemplado no mês k: taxa que zera o valor presente
   de (−parcelas) e (+crédito recebido no mês k). Procura a raiz entre −5% e 20% a.m. */
function cxConsorcioTaxaEquivalente(meses, k) {
  if (!(k >= 1 && k <= meses.length)) return null;
  var credito = meses[k - 1].bem;
  var vpl = function (i) { var s = credito / Math.pow(1 + i, k); meses.forEach(function (m) { s -= m.parcela / Math.pow(1 + i, m.t); }); return s; };
  var passo = 0.0005, a = -0.05, fa = vpl(a), raizes = [];
  for (var b = a + passo; b <= 0.2 + 1e-12; b += passo) {
    var fb = vpl(b);
    if ((fa <= 0 && fb > 0) || (fa >= 0 && fb < 0)) {
      var lo = b - passo, hi = b, flo = fa;
      for (var j = 0; j < 80; j++) { var mid = (lo + hi) / 2, fm = vpl(mid); if ((flo <= 0 && fm <= 0) || (flo >= 0 && fm >= 0)) { lo = mid; flo = fm; } else hi = mid; }
      raizes.push((lo + hi) / 2);
    }
    fa = fb;
  }
  if (!raizes.length) return null;
  raizes.sort(function (x, y) { return Math.abs(x) - Math.abs(y); });
  return raizes[0];
}
/* Quitação ou antecipação das últimas m parcelas: valor presente pela taxa de juros pactuada. */
function cxQuitacao(p, i, restantes, antecipar) {
  var m = antecipar > 0 && antecipar < restantes ? antecipar : restantes, vp = 0;
  for (var t = restantes - m + 1; t <= restantes; t++) vp += p / Math.pow(1 + i, t);
  return { parcelas: m, nominal: p * m, valorPresente: vp, desconto: p * m - vp, total: m === restantes };
}
/* Descontos mensais entre dois meses (inclusive), separados pelo marco de 30/03/2021 (STJ, EAREsp 676.608/RS). */
function cxIndebito(valorMensal, ini, fim, avulsos) {
  var antes = 0, depois = 0, nAntes = 0, nDepois = 0, meses = 0;
  var conta = function (ano, mes, v) { if (ano < 2021 || (ano === 2021 && mes <= 3)) { antes += v; nAntes++; } else { depois += v; nDepois++; } };
  if (valorMensal > 0 && ini && fim) {
    var a = ini.split('-').map(Number), b = fim.split('-').map(Number), y = a[0], m = a[1];
    while (y < b[0] || (y === b[0] && m <= b[1])) { conta(y, m, valorMensal); meses++; m++; if (m > 12) { m = 1; y++; } if (meses > 600) break; }
  }
  (avulsos || []).forEach(function (x) { conta(x.ano, x.mes, x.valor); });
  return { antes: antes, depois: depois, nAntes: nAntes, nDepois: nDepois, meses: meses, simples: antes + depois, dobroPosMarco: antes + 2 * depois, dobroTotal: 2 * (antes + depois) };
}

/* ── CONSÓRCIO ── */
function cxConsorcioDados() {
  return { credito: cxNum('cs-credito'), prazo: cxInt('cs-prazo'), adm: cxNum('cs-adm'), fr: cxNum('cs-fr'), seg: cxNum('cs-seg'), pagas: cxInt('cs-pagas'),
    atual: cxNum('cs-bem-atual'), multa: cxNum('cs-multa'), reaj: cxNum('cs-reaj'), contemp: cxInt('cs-contemp'), fin: cxNum('cs-fin') };
}
function calcConsorcio() {
  var o = cxConsorcioDados(), out = $id('cs-res'); if (!out) return;
  if (!(o.credito > 0 && o.prazo > 0)) { out.innerHTML = cxAviso('err', 'Informe o valor do crédito (carta) e o prazo do grupo em meses.'); return; }
  if (o.pagas > o.prazo) { out.innerHTML = cxAviso('err', 'As parcelas pagas não podem passar do prazo do grupo.'); return; }
  var fc = o.credito / o.prazo, ta = o.credito * o.adm / 100 / o.prazo, frm = o.credito * o.fr / 100 / o.prazo, parcela = fc + ta + frm + o.seg;
  var custoTotal = o.credito * (o.adm + o.fr) / 100 + o.seg * o.prazo, pctAmort = o.pagas / o.prazo * 100, refBem = o.atual > 0 ? o.atual : o.credito;
  var restBruta = refBem * pctAmort / 100, desc = o.multa > 0 ? restBruta * o.multa / 100 : 0, rest = restBruta - desc;
  var html = cxBloco('Composição da parcela (sem reajuste)', cxCel('Fundo comum', brl(fc)) + cxCel('Taxa de administração', brl(ta)) + cxCel('Fundo de reserva', brl(frm)) + cxCel('Seguro', brl(o.seg)) + cxCel('Parcela estimada', brl(parcela)))
    + cxBloco('Custo e situação da cota', cxCel('Custo das taxas no plano', brl(custoTotal) + ' (' + cxPct(custoTotal / o.credito * 100, 1) + ' do crédito)')
      + cxCel('Total pago até agora', brl(parcela * o.pagas)) + cxCel('Percentual amortizado', cxPct(pctAmort)) + cxCel('Taxa de administração já paga', brl(ta * o.pagas)));
  if (o.pagas > 0) html += cxBloco('Restituição estimada ao excluído (art. 30)', cxCel('Percentual amortizado × valor do bem', brl(restBruta))
    + (desc ? cxCel('Cláusula penal informada (' + cxPct(o.multa) + ')', '− ' + brl(desc), 'val-danger') : '') + cxCel('Estimativa a restituir', brl(rest), 'val-ok'));
  html += cxAviso('warn', 'Estimativa para triagem. Pela Lei 11.795/2008 (art. 30), o excluído recebe o que pagou ao fundo comum, calculado pelo percentual amortizado sobre o valor do bem na data da assembleia de contemplação, com os rendimentos da aplicação dos recursos. A taxa de administração não é devolvida. A cláusula penal só se aplica se prevista e se houver prova de prejuízo ao grupo. O cálculo considera que cada parcela amortiza a mesma fração do bem; confira os percentuais no extrato da cota.');
  out.innerHTML = html;
}
function simularConsorcio() {
  var o = cxConsorcioDados(), out = $id('cs-sim'); if (!out) return;
  if (!(o.credito > 0 && o.prazo > 0)) { out.innerHTML = cxAviso('err', 'Para simular, informe ao menos o valor do crédito e o prazo do grupo.'); return; }
  if (o.contemp > o.prazo) { out.innerHTML = cxAviso('err', 'O mês da contemplação não pode passar do prazo do grupo.'); return; }
  var meses = cxConsorcioFluxo(o), ult = meses[meses.length - 1];
  var marcos = [];
  meses.forEach(function (m) { if (m.t % 12 === 0 || m.t === 1 || m.t === o.prazo || m.t === o.contemp || m.t === o.pagas) marcos.push(m); });
  var linhas = marcos.map(function (m) {
    var tag = m.t === o.contemp ? ' <em class="v13-sim-tag">contemplação</em>' : (m.t === o.pagas ? ' <em class="v13-sim-tag">hoje</em>' : '');
    return '<tr' + (m.t === o.contemp ? ' class="v13-sim-dest"' : '') + '><td>' + m.t + tag + '</td><td>' + brl(m.bem) + '</td><td>' + brl(m.parcela) + '</td><td>' + brl(m.pago) + '</td><td>' + cxPct(m.amort * 100, 1) + '</td><td>' + brl(m.restituicao) + '</td></tr>';
  }).join('');
  var html = '<div class="calc-block-title" style="margin-top:16px;">Simulação mês a mês' + (o.reaj > 0 ? ' (bem reajustado ' + cxPct(o.reaj) + ' ao ano)' : ' (sem reajuste do bem)') + '</div>'
    + '<div class="v13-tabela-wrap"><table class="v13-tabela"><thead><tr><th>Mês</th><th>Valor do bem</th><th>Parcela</th><th>Total pago</th><th>Amortizado</th><th>Restituição se sair</th></tr></thead><tbody>' + linhas + '</tbody></table></div>';
  html += cxBloco('Resultado do plano', cxCel('Total pago no plano', brl(ult.pago)) + cxCel('Pago ao fundo comum (bem)', brl(ult.fcPago))
    + cxCel('Taxa de administração paga', brl(ult.admPaga)) + cxCel('Taxas e seguro pagos (custo)', brl(ult.pago - ult.fcPago), 'val-danger') + cxCel('Valor do bem no fim', brl(ult.bem)));
  if (o.contemp > 0) {
    var te = cxConsorcioTaxaEquivalente(meses, o.contemp), credK = meses[o.contemp - 1].bem;
    var cel = cxCel('Crédito recebido no mês ' + o.contemp, brl(credK));
    if (te != null) {
      cel += cxCel('Taxa equivalente do consórcio', cxPct(te * 100) + ' a.m. (' + cxPct(cxAnual(te) * 100, 1) + ' a.a.)', te > 0 ? '' : 'val-ok');
      if (o.fin > 0) cel += cxCel('Financiamento informado', cxPct(o.fin) + ' a.m. (' + cxPct(cxAnual(o.fin / 100) * 100, 1) + ' a.a.)', (te * 100) < o.fin ? 'val-danger' : 'val-ok');
    } else cel += cxCel('Taxa equivalente', 'não há taxa única para este fluxo');
    html += cxBloco('Contemplação no mês ' + o.contemp, cel);
    var txt = te == null ? 'Com contemplação no mês ' + o.contemp + ', o fluxo de pagamentos não tem uma taxa equivalente única para comparar com um financiamento.'
      : (te <= 0 ? 'Com contemplação no mês ' + o.contemp + ', o consórcio funcionou como uma poupança com perda: a taxa equivalente é negativa (o crédito recebido vale menos que o valor presente do que foi pago).'
        : 'Com contemplação no mês ' + o.contemp + ', o consórcio equivale a um financiamento de ' + cxPct(te * 100) + ' ao mês' + (o.fin > 0 ? (te * 100 < o.fin ? ', menor que a taxa de financiamento informada.' : ', maior que a taxa de financiamento informada.') : '.'));
    html += cxAviso('ok', txt + ' A taxa equivalente é a taxa que iguala o valor presente das parcelas ao crédito recebido; serve para comparar o custo com um empréstimo.');
  }
  html += cxAviso('warn', 'Simulação para orientação: considera que a parcela acompanha o valor do bem, reajustado uma vez por ano, e que o crédito recebido é o valor do bem no mês da contemplação. Lances, mudança de percentuais e rendimentos da aplicação não estão incluídos.');
  out.innerHTML = html;
}

/* ── TAXA REAL DO CONTRATO ── */
function calcTaxaReal() {
  var pv = cxNum('tr-valor'), p = cxNum('tr-parcela'), n = cxInt('tr-prazo'), inf = cxNum('tr-informada'), out = $id('tr-res'); if (!out) return;
  if (!(pv > 0 && p > 0 && n > 0)) { out.innerHTML = cxAviso('err', 'Informe o valor recebido, o valor da parcela e o número de parcelas.'); return; }
  var i = cxTaxaImplicita(pv, p, n);
  if (i == null) { out.innerHTML = cxAviso('ok', 'A soma das parcelas (' + brl(p * n) + ') não passa do valor recebido: não há juros positivos nesse fluxo.'); return; }
  var html = cxBloco('Taxa encontrada', cxCel('Taxa mensal', cxPct(i * 100, 2) + ' a.m.') + cxCel('Taxa anual equivalente', cxPct(cxAnual(i) * 100, 2) + ' a.a.')
    + cxCel('Total a pagar', brl(p * n)) + cxCel('Juros e encargos', brl(p * n - pv), 'val-danger'));
  if (inf > 0) {
    var pInf = cxPmt(pv, inf / 100, n), dif = p - pInf;
    html += cxBloco('Comparação com a taxa do contrato', cxCel('Parcela com ' + cxPct(inf) + ' a.m.', brl(pInf)) + cxCel('Parcela cobrada', brl(p))
      + cxCel('Diferença por parcela', brl(dif), dif > 0.005 ? 'val-danger' : 'val-ok') + cxCel('Diferença no contrato', brl(dif * n), dif > 0.005 ? 'val-danger' : 'val-ok'));
  }
  html += cxAviso('ok', 'Como o cálculo parte do valor que efetivamente caiu na conta e inclui na parcela tudo o que é cobrado (juros, IOF, tarifas e seguros financiados), a taxa encontrada corresponde ao <strong>custo efetivo</strong> do contrato. Para comparar com a média do BACEN, leve-a ao campo CET da verificação de abusividade.'
    + '<div style="margin-top:8px;"><button type="button" class="calc-btn-sec" onclick="cxLevarTaxa(' + (i * 100).toFixed(4) + ')">Usar como CET na verificação de abusividade</button></div>');
  out.innerHTML = html;
}
function cxLevarTaxa(taxa) {
  var item = document.querySelector('.calc-menu-item[data-calc="abusividade"]');
  if (item) switchCalc(item, 'abusividade');
  var c = $id('ab-contratada'); if (c) { c.value = taxa.toFixed(2).replace('.', ','); try { c.dispatchEvent(new Event('input', { bubbles: true })); } catch (e) {} }
  var v = $id('ab-valor'); if (v && !v.value && cxNum('tr-valor') > 0) formatarValorCampo(v, cxNum('tr-valor'));
  var pz = $id('ab-prazo'); if (pz && !pz.value && cxInt('tr-prazo') > 0) pz.value = cxInt('tr-prazo');
  if (c) { try { c.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (e) {} }
  v13Toast('Taxa levada ao campo CET. Preencha a modalidade, a data e a taxa de juros do contrato.');
}

/* ── SIMULAÇÃO ── */
function calcSimulacao() {
  var pv = cxNum('si-valor'), n = cxInt('si-prazo'), tx = cxNum('si-taxa'), unid = v13Val('si-unid'), sis = v13Val('si-sistema') || 'price', out = $id('si-res'); if (!out) return;
  if (!(pv > 0 && n > 0)) { out.innerHTML = cxAviso('err', 'Informe o valor financiado e o número de parcelas.'); return; }
  if (n > 600) { out.innerHTML = cxAviso('err', 'O número de parcelas deve ser de até 600.'); return; }
  var i = unid === 'aa' ? cxMensal(tx / 100) : tx / 100;
  var tb = cxTabela(pv, i, n, sis), L = tb.linhas;
  var html = cxBloco('Resultado (' + (sis === 'sac' ? 'SAC' : 'Tabela Price') + ' · ' + cxPct(i * 100, 4) + ' a.m. · ' + cxPct(cxAnual(i) * 100, 2) + ' a.a.)',
    (sis === 'sac' ? cxCel('Primeira parcela', brl(L[0].parcela)) + cxCel('Última parcela', brl(L[n - 1].parcela)) : cxCel('Parcela', brl(L[0].parcela)))
    + cxCel('Total pago', brl(tb.total)) + cxCel('Total de juros', brl(tb.juros), 'val-danger') + cxCel('Juros sobre o valor financiado', cxPct(tb.juros / pv * 100, 1)));
  var linha = function (r) { return '<tr><td>' + r.t + '</td><td>' + brl(r.parcela) + '</td><td>' + brl(r.juros) + '</td><td>' + brl(r.amort) + '</td><td>' + brl(r.saldo) + '</td></tr>'; };
  var cab = '<thead><tr><th>Parcela</th><th>Valor</th><th>Juros</th><th>Amortização</th><th>Saldo devedor</th></tr></thead>';
  var curta = n <= 15 ? L.map(linha).join('') : L.slice(0, 12).map(linha).join('') + '<tr><td colspan="5" style="text-align:center;color:var(--lux-cinza-2);">…</td></tr>' + L.slice(n - 3).map(linha).join('');
  html += '<div class="calc-block-title" style="margin-top:14px;">Evolução do saldo</div><div class="v13-tabela-wrap"><table class="v13-tabela">' + cab + '<tbody>' + curta + '</tbody></table></div>';
  if (n > 15) html += '<details class="v13-sim-det"><summary>Ver todas as ' + n + ' parcelas</summary><div class="v13-tabela-wrap"><table class="v13-tabela">' + cab + '<tbody>' + L.map(linha).join('') + '</tbody></table></div></details>';
  if (unid === 'aa') html += cxAviso('ok', 'A taxa anual de ' + cxPct(tx) + ' foi convertida na taxa mensal equivalente por juros compostos: ' + cxPct(i * 100, 4) + ' a.m.');
  out.innerHTML = html;
}

/* ── QUITAÇÃO ANTECIPADA ── */
function calcQuitacao() {
  var p = cxNum('qa-parcela'), tx = cxNum('qa-taxa'), r = cxInt('qa-restantes'), m = cxInt('qa-antecipar'), out = $id('qa-res'); if (!out) return;
  if (!(p > 0 && r > 0)) { out.innerHTML = cxAviso('err', 'Informe o valor da parcela, a taxa de juros e quantas parcelas faltam.'); return; }
  if (!(tx > 0)) { out.innerHTML = cxAviso('err', 'Informe a taxa de juros mensal do contrato (sem ela não há juros a descontar).'); return; }
  if (m > r) { out.innerHTML = cxAviso('err', 'Não é possível antecipar mais parcelas do que as que faltam.'); return; }
  var q = cxQuitacao(p, tx / 100, r, m);
  out.innerHTML = cxBloco(q.total ? 'Quitação total' : 'Antecipação das ' + q.parcelas + ' últimas parcelas',
      cxCel('Parcelas antecipadas', q.parcelas) + cxCel('Soma sem desconto', brl(q.nominal)) + cxCel('Valor a pagar hoje', brl(q.valorPresente), 'val-ok') + cxCel('Juros que deixam de ser pagos', brl(q.desconto), 'val-ok'))
    + (q.total ? '' : cxAviso('ok', 'Depois da antecipação, continuam ' + (r - q.parcelas) + ' parcelas de ' + brl(p) + '; o prazo diminui e o valor da parcela se mantém.'))
    + cxAviso('warn', 'Estimativa: o valor oficial é o informado pela instituição. Para contratos de pessoa física com taxa prefixada, o valor presente é calculado pela taxa de juros pactuada (Resolução CMN 5.004/2022). Em contratos firmados entre 12/2007 e 05/2014 com mais de 12 meses a vencer, a regra da época podia usar a Selic mais o spread (Resolução CMN 3.516/2007, redação original). Seguros mensais cobrados à parte não entram no desconto.');
}

/* ── MARGEM CONSIGNÁVEL ── */
function calcMargem() {
  var base = cxNum('mg-base'), out = $id('mg-res'); if (!out) return;
  if (!(base > 0)) { out.innerHTML = cxAviso('err', 'Informe a base de cálculo (valor do benefício ou remuneração disponível).'); return; }
  var linhas = [['Empréstimos', cxNum('mg-p-emp'), cxNum('mg-emp')], ['Cartão de crédito consignado (RMC)', cxNum('mg-p-rmc'), cxNum('mg-rmc')], ['Cartão consignado de benefício (RCC)', cxNum('mg-p-rcc'), cxNum('mg-rcc')]];
  var excedeu = [], totLim = 0, totUso = 0;
  var tr = linhas.map(function (l) {
    var lim = base * l[1] / 100, livre = lim - l[2]; totLim += lim; totUso += l[2];
    if (livre < -0.005) excedeu.push(l[0] + ' (' + brl(-livre) + ' acima do limite)');
    return '<tr><td>' + l[0] + '</td><td>' + cxPct(l[1]) + '</td><td>' + brl(lim) + '</td><td>' + brl(l[2]) + '</td><td class="' + (livre < -0.005 ? 'val-danger' : 'val-ok') + '">' + (livre < -0.005 ? '− ' + brl(-livre) : brl(livre)) + '</td></tr>';
  }).join('');
  var pctTot = totUso / base * 100, pLim = totLim / base * 100;
  out.innerHTML = '<div class="v13-tabela-wrap" style="margin-top:12px;"><table class="v13-tabela"><thead><tr><th>Modalidade</th><th>Limite</th><th>Valor do limite</th><th>Descontado</th><th>Margem livre</th></tr></thead><tbody>' + tr
    + '<tr style="font-weight:700;"><td>Total</td><td>' + cxPct(pLim) + '</td><td>' + brl(totLim) + '</td><td>' + brl(totUso) + ' (' + cxPct(pctTot, 1) + ')</td><td class="' + (totUso > totLim + 0.005 ? 'val-danger' : 'val-ok') + '">' + brl(totLim - totUso) + '</td></tr></tbody></table></div>'
    + (excedeu.length ? cxAviso('err', '<strong>Margem ultrapassada:</strong> ' + excedeu.join('; ') + '. Desconto acima da margem pode ser questionado (Lei 10.820/2003, art. 6º, § 5º, para benefícios do INSS); peça o extrato de consignações (HISCON) para identificar o contrato que excedeu.')
      : cxAviso('ok', 'Os descontos informados estão dentro dos limites aplicados.'))
    + cxAviso('warn', 'Percentuais pré-preenchidos com a regra dos benefícios do INSS (Lei 10.820/2003, art. 6º, § 5º, com a redação da Lei 14.431/2022). Para servidor público ou empregado, confira a norma do ente ou do empregador e ajuste os percentuais. Novas operações de cartão consignado em benefício do INSS estão suspensas por decisão cautelar do TCU (comunicado do INSS de setembro de 2026).');
}

/* ── DEVOLUÇÃO DE DESCONTOS INDEVIDOS ── */
function cxLerAvulsos(txt) {
  var lst = [], erros = [];
  String(txt || '').split(/\n+/).forEach(function (l) {
    l = l.trim(); if (!l) return;
    var m = l.match(/^([\d.]*\d(?:,\d{1,2})?)\s+(\d{1,2})\s*\/\s*(\d{4})$/);
    if (!m) { erros.push(l); return; }
    var mes = parseInt(m[2], 10), ano = parseInt(m[3], 10);
    if (mes < 1 || mes > 12) { erros.push(l); return; }
    lst.push({ valor: parseMoeda(m[1]), mes: mes, ano: ano });
  });
  return { lista: lst, erros: erros };
}
function calcIndebito() {
  var v = cxNum('id-valor'), ini = v13Val('id-ini'), fim = v13Val('id-fim'), dev = cxNum('id-devolvido'), out = $id('id-res'); if (!out) return;
  var av = cxLerAvulsos(v13Val('id-avulsos'));
  if (av.erros.length) { out.innerHTML = cxAviso('err', 'Linha(s) de descontos avulsos fora do formato "150,00 05/2022": ' + av.erros.map(v13Esc).join('; ') + '.'); return; }
  if (!(v > 0 && ini && fim) && !av.lista.length) { out.innerHTML = cxAviso('err', 'Informe o valor mensal e o primeiro e o último mês do desconto, ou os descontos avulsos.'); return; }
  if (ini && fim && ini > fim) { out.innerHTML = cxAviso('err', 'O primeiro desconto não pode ser depois do último.'); return; }
  var r = cxIndebito(v, ini, fim, av.lista);
  var liq = function (x) { return Math.max(0, x - dev); };
  out.innerHTML = cxBloco('Descontos considerados', cxCel('Meses do desconto mensal', r.meses) + cxCel('Até 03/2021', brl(r.antes) + ' (' + r.nAntes + ')') + cxCel('A partir de 04/2021', brl(r.depois) + ' (' + r.nDepois + ')') + cxCel('Total descontado', brl(r.simples)))
    + cxBloco('Devolução estimada' + (dev > 0 ? ' (já abatidos ' + brl(dev) + ' devolvidos)' : ''),
      cxCel('Simples', brl(liq(r.simples))) + cxCel('Dobro só após 30/03/2021', brl(liq(r.dobroPosMarco)), 'val-ok') + cxCel('Tudo em dobro (se provada má-fé)', brl(liq(r.dobroTotal))))
    + cxAviso('warn', 'Valores nominais, sem correção monetária e sem juros de mora, que devem ser calculados na fase própria. Pelo STJ (EAREsp 676.608/RS), a devolução em dobro do art. 42, parágrafo único, do CDC não exige má-fé, bastando conduta contrária à boa-fé objetiva, mas vale para cobranças feitas depois da publicação do acórdão (30/03/2021); os descontos de 03/2021 foram contados como anteriores. Antes desse marco, a devolução em dobro depende de prova de má-fé. Confira a tese e a modulação no inteiro teor antes de citar.');
}

/* ── MÍNIMO EXISTENCIAL ── */
function calcMinimo() {
  var renda = cxNum('me-renda'), comp = cxNum('me-computaveis'), exc = cxNum('me-excluidas'), min = cxNum('me-minimo') || 600, out = $id('me-res'); if (!out) return;
  if (!(renda > 0)) { out.innerHTML = cxAviso('err', 'Informe a renda mensal total.'); return; }
  var sobra = renda - comp, falta = min - sobra, sobraReal = renda - comp - exc;
  out.innerHTML = cxBloco('Resultado', cxCel('Renda mensal', brl(renda)) + cxCel('Parcelas computáveis', brl(comp) + ' (' + cxPct(comp / renda * 100, 1) + ')')
      + cxCel('Sobra para o mínimo existencial', brl(sobra), sobra < min ? 'val-danger' : 'val-ok') + cxCel('Mínimo existencial', brl(min)))
    + (exc > 0 ? cxBloco('Com as dívidas não computadas pelo decreto', cxCel('Parcelas não computadas', brl(exc)) + cxCel('Sobra efetiva da renda', brl(sobraReal), sobraReal < min ? 'val-danger' : '') + cxCel('Comprometimento total', cxPct((comp + exc) / renda * 100, 1))) : '')
    + (sobra < min ? cxAviso('err', '<strong>O mínimo existencial está comprometido</strong>: depois das parcelas computáveis sobram ' + brl(sobra) + ', ' + brl(falta) + ' abaixo de ' + brl(min) + '. Há indício de superendividamento para fins da Lei 14.181/2021 (CDC, arts. 54-A e seguintes): avaliar o pedido de repactuação (CDC, art. 104-A).')
      : cxAviso('ok', 'Depois das parcelas computáveis, sobram ' + brl(sobra) + ', acima do mínimo existencial de ' + brl(min) + '.' + (exc > 0 && sobraReal < min ? ' Mesmo assim, somando as dívidas não computadas, a sobra efetiva fica abaixo desse valor: vale registrar no atendimento.' : '')))
    + cxAviso('warn', 'Mínimo existencial de R$ 600,00 (Decreto 11.150/2022, art. 3º, com a redação do Decreto 11.567/2023), aferido mês a mês, comparando a renda com as parcelas vencidas e a vencer no mês. O art. 4º do decreto não computa, entre outras, as parcelas de crédito consignado, de financiamento imobiliário, de crédito com garantia real, fiança ou aval e de crédito rural. O valor é objeto de questionamento no STF; confira se houve atualização.');
}
