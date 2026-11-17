/* ═══════════════════════════════════════════════════════════════════════
   v13 — MÓDULO PRINCIPAL
   Dados do atendimento compartilhados entre as abas, prioridades e
   vulnerabilidades, prazo de resposta, documentos (.docx no modelo
   institucional), minuta de e-mail, cadastro de instituições, ajustes da
   triagem e da calculadora (tetos históricos, consórcio).
   Privacidade: os dados do(a) assistido(a) ficam só na memória desta aba.
   ═══════════════════════════════════════════════════════════════════════ */
function $id(id) { return document.getElementById(id); }
function v13Esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function v13Val(id) { var e = $id(id); return e ? String(e.value || '').trim() : ''; }
function v13Toast(msg, ms) {
  var t = $id('copyToast'); if (!t) return;
  t.textContent = msg; t.classList.add('show');
  clearTimeout(t._v13); t._v13 = setTimeout(function () { t.classList.remove('show'); }, ms || 3200);
}
function v13LsGet(k, def) { try { var v = localStorage.getItem(k); return v == null ? def : JSON.parse(v); } catch (e) { return def; } }
function v13LsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }

/* ════════ 1. CADASTRO DE INSTITUIÇÕES ════════════════════════════════ */
var INST_OVR_KEY = 'dpesp-inst-cadastro-v13';
var INST = { lista: [], porNorm: {}, porIspb: {}, nomes: [] };
function instFmtEnd(s) {
  if (!s) return '';
  if (typeof s === 'string') return s;
  var cid = [s.b, (s.m || '') + (s.uf ? '/' + s.uf : '')].filter(function (x) { return x && x !== '/'; }).join(', ');
  return [s.l, cid, s.cep ? 'CEP ' + s.cep : ''].filter(Boolean).join(' — ');
}
function instCarregar() {
  INST = { lista: [], porNorm: {}, porIspb: {}, nomes: [] };
  var C = (typeof INST_CADASTRO !== 'undefined') ? INST_CADASTRO : { db: [], cur: [], ext: [] };
  function add(r) { var k = _normTxt(r.nome); if (!k || INST.porNorm[k]) return; INST.porNorm[k] = r; INST.lista.push(r); }
  var oficiais = C.db.map(function (e) {
    return { nome: e.n, ispb: e.i, cod: e.k || '', cnpj: e.c || '', razao: e.r || '', sedeObj: e.s || null, sede: instFmtEnd(e.s),
      fonte: e.f === 'rf' ? 'Receita Federal (cadastro do CNPJ)' : (e.f === 'bcb' ? 'Banco Central (cadastro de sedes)' : ''), situacao: e.x || '' };
  });
  oficiais.forEach(function (r) { INST.porIspb[r.ispb] = r; });
  C.cur.forEach(function (c) {
    var base = c.link ? INST.porIspb[c.link] : null, r = { nome: c.n, curado: true, agRP: c.a || '', v12: c.v12 || '', obs: c.o || '', conferir: !!c.q, docNome: c.d || '' };
    if (base) ['ispb', 'cod', 'cnpj', 'razao', 'sedeObj', 'sede', 'fonte', 'situacao'].forEach(function (k) { r[k] = base[k]; });
    add(r);
  });
  oficiais.sort(function (a, b) { return a.nome.localeCompare(b.nome, 'pt'); }).forEach(add);
  (C.ext || []).forEach(function (x) { add({ nome: x.n, semEndereco: true }); });
  var ovr = v13LsGet(INST_OVR_KEY, {});
  Object.keys(ovr).forEach(function (k) { if (!INST.porNorm[k] && ovr[k] && ovr[k].nome) add({ nome: ovr[k].nome, usuario: true }); });
  INST.nomes = INST.lista.map(function (r) { return r.nome; });
  if (typeof COMBO_DADOS !== 'undefined') {
    ['of-banco', 'au-banco', 'caso-instituicao', 'cen-banco'].forEach(function (id) { COMBO_DADOS[id] = INST.nomes; });
    Object.keys(COMBO_DADOS).forEach(function (id) { if (id.indexOf('em-inst-') === 0) COMBO_DADOS[id] = INST.nomes; });
  }
  window.BANCOS_E_INSTITUICOES = INST.nomes;
}
function instNomeDoc(nome) { var r = instBuscar(nome); return (r && r.docNome) ? r.docNome : nome; }
function instOverrides() { return v13LsGet(INST_OVR_KEY, {}); }
function instBuscar(nome) {
  var k = _normTxt(String(nome || '').trim()); if (!k) return null;
  var r = INST.porNorm[k];
  if (!r) {
    for (var i = 0; i < INST.lista.length && !r; i++) { var nk = _normTxt(INST.lista[i].nome); if (nk.indexOf(k) === 0 && k.length >= 6) r = INST.lista[i]; }
  }
  var o = instOverrides()[r ? _normTxt(r.nome) : k];
  if (!r && !o) return null;
  var out = {}; Object.keys(r || { nome: nome }).forEach(function (c) { out[c] = (r || { nome: nome })[c]; });
  if (o) { out.ovr = o; if (o.razao) out.razao = o.razao; if (o.cnpj) out.cnpj = o.cnpj; if (o.obs) out.obsUser = o.obs; }
  return out;
}
/* Opções de endereço para ofício, em ordem de preferência */
function instEnderecos(r) {
  var op = [];
  if (!r) return op;
  if (r.ovr && r.ovr.end) op.push({ id: 'user', rot: 'Endereço editado no cadastro (este navegador)' + (r.ovr.conferido ? ' — conferido' : ''), end: instFmtEnd(r.ovr.end) });
  if (r.agRP) op.push({ id: 'agencia', rot: 'Agência em Ribeirão Preto (cadastro da unidade — conferir)', end: r.agRP });
  if (r.sede) op.push({ id: 'sede', rot: 'Sede — ' + (r.fonte || 'cadastro oficial') + (r.cnpj ? ' · CNPJ ' + r.cnpj : ''), end: r.sede });
  if (r.v12) op.push({ id: 'v12', rot: 'Matriz (cadastro da v12 — conferir)', end: r.v12.replace(/\s*\(matriz\)\s*$/, '') });
  if (r.ovr && r.ovr.alt) op.push({ id: 'alt', rot: 'Endereço alternativo salvo', end: r.ovr.alt });
  return op;
}
function instEmails(nome) {
  var saved = (typeof _emInstEmailsLoad === 'function') ? _emInstEmailsLoad() : {};
  var k = _normTxt(nome || '');
  if (saved[k]) return saved[k];
  var r = instBuscar(nome);
  if (r && r.ovr && r.ovr.emails) return r.ovr.emails;
  var pad = (typeof emEmailsPadrao === 'function') ? emEmailsPadrao(nome) : null;
  return pad ? pad.join(', ') : '';
}

/* ════════ 2. DADOS DO ATENDIMENTO (compartilhados entre as abas) ═════ */
var CASO = { assistido: '', cpf: '', dol: '', instituicao: '', contrato: '', beneficio: '', data: '', vuln: [], vulnOutra: '', prazoJust: '' };
var CASO_CAMPOS = {
  assistido: ['caso-assistido', 'tri-assistido', 'of-assistido', 'oi-assistido', 'au-nome', 'em-assistido', 'ab-assistido'],
  cpf: ['caso-cpf', 'of-cpf', 'oi-cpf', 'au-cpf', 'ab-cpf'],
  dol: ['caso-dol', 'tri-dol', 'cen-dol', 'of-numero', 'oi-numero', 'em-dol', 'ab-proc-num'],
  instituicao: ['caso-instituicao', 'cen-banco', 'of-banco', 'au-banco'],
  contrato: ['caso-contrato', 'tri-contrato', 'cen-contrato', 'of-contrato', 'oi-contrato', 'au-contrato'],
  beneficio: ['caso-beneficio', 'oi-beneficio'],
  data: ['caso-data', 'of-data', 'oi-data']
};
function casoSet(k, v, origem) {
  CASO[k] = v;
  (CASO_CAMPOS[k] || []).forEach(function (id) {
    if (id === origem) return;
    var el = $id(id); if (el && el.value !== v) el.value = v;
  });
  if (k === 'instituicao' && origem !== 'of-banco') ofAtualizarEndereco(true);
  if (k === 'assistido' || k === 'cpf') { var a = $id('au-nome'), c = $id('au-cpf'); if (a) a.dataset.auto = '1'; if (c) c.dataset.auto = '1'; }
  casoResumo();
}
function casoCampoDe(id) { for (var k in CASO_CAMPOS) if (CASO_CAMPOS[k].indexOf(id) !== -1) return k; return null; }
function casoBind() {
  Object.keys(CASO_CAMPOS).forEach(function (k) {
    CASO_CAMPOS[k].forEach(function (id) {
      var el = $id(id); if (!el || el.dataset.v13bind) return;
      el.dataset.v13bind = '1';
      var h = function () { casoSet(k, el.value.trim() === el.value ? el.value : el.value, id); };
      el.addEventListener('input', h); el.addEventListener('change', h);
    });
  });
}
function casoResumo() {
  var box = $id('caso-resumo'); if (!box) return;
  var pz = prazoAtual(), itens = [
    ['Assistido(a)', CASO.assistido, true], ['CPF', CASO.cpf, true], ['DOL', CASO.dol, false], ['Instituição', CASO.instituicao, false],
    ['Contrato', CASO.contrato, false], ['Prazo solicitado', pz ? dxPrazoTexto(pz) : 'sem prazo específico', false],
    ['Prioridades', CASO.vuln.length ? CASO.vuln.map(function (i) { var v = vulnPorId(i); return v ? v.rot : i; }).join('; ') : 'nenhuma marcada', false]];
  box.innerHTML = itens.map(function (x) { var falta = !x[1] && x[2]; return '<div class="' + (falta ? 'falta' : '') + '"><span>' + x[0] + '</span>' + (x[1] ? v13Esc(x[1]) : (falta ? 'falta preencher' : 'não informado')) + '</div>'; }).join('');
}
/* Copia os dados digitados na triagem para os demais campos */
function casoDaTriagem() {
  ['tri-assistido', 'tri-dol', 'tri-contrato', 'cen-dol', 'cen-contrato', 'cen-banco'].forEach(function (id) {
    var el = $id(id), k = casoCampoDe(id); if (el && k && el.value.trim()) casoSet(k, el.value.trim(), id);
  });
}

/* ════════ 3. PRIORIDADES, VULNERABILIDADES E PRAZO ═══════════════════ */
/* Escolha em lista clicável (mesmo comportamento da lista de instituições): cada item escolhido vira uma etiqueta removível. */
var VULN_CURTO = { prioridade: 'Prioridade legal', vulnerabilidade: 'Vulnerabilidade', atencao: 'Atenção' };
/* Termos de busca extras (só para achar o item na lista; não entram nos documentos). */
var VULN_BUSCA = { idoso: 'idoso idosa terceira idade aposentado', idoso80: 'idoso idosa oitenta 80', pcd: 'deficiente deficiencia pcd cadeirante autista',
  doenca: 'doente doenca grave tratamento cancer', socio: 'baixa renda pobreza cadunico bolsa familia bpc', analf: 'analfabeto analfabeta leitura escrever compreensao',
  digital: 'celular aplicativo internet app', super: 'superendividamento superendividado dividas', renda: 'descontos salario beneficio margem renda',
  risco: 'risco social violencia rua abrigo' };
function vulnRender() {
  var box = $id('caso-vuln'); if (!box) return;
  box.innerHTML = CASO.vuln.map(function (id) {
    var v = vulnPorId(id); if (!v) return '';
    return '<span class="v13-chip" title="' + v13Esc(VULN_CLASSES[v.classe]) + '"><span>' + v13Esc(v.rot) + '</span><i>' + VULN_CURTO[v.classe] + '</i>'
      + '<button type="button" aria-label="Remover: ' + v13Esc(v.rot) + '" onclick="vulnRemover(\'' + v.id + '\')">&times;</button></span>';
  }).join('');
}
function vulnFiltrar() {
  var input = $id('caso-vuln-busca'), box = $id('combo-caso-vuln-busca-list'); if (!input || !box) return;
  var q = _normTxt(input.value.trim());
  var lista = VULN.filter(function (v) { return CASO.vuln.indexOf(v.id) === -1 && (!q || _normTxt(v.rot + ' ' + VULN_CLASSES[v.classe] + ' ' + (VULN_BUSCA[v.id] || '')).indexOf(q) !== -1); });
  _comboIdx['caso-vuln-busca'] = -1;
  box.innerHTML = lista.length ? lista.map(function (v) {
    return '<div class="combo-item" role="option" data-val="' + v.id + '" onmousedown="event.preventDefault(); comboSelecionar(\'caso-vuln-busca\', this)"><span class="v13-ci-classe">' + VULN_CURTO[v.classe] + '</span>' + v13Esc(v.rot) + '</div>';
  }).join('') : '<div class="combo-empty">' + (CASO.vuln.length === VULN.length ? 'Todas as condições da lista já foram escolhidas.' : 'Nenhuma condição da lista com esse termo. Use o campo "Outra condição relevante".') + '</div>';
  box.style.display = 'block';
}
function vulnTeclado(e) {
  var input = $id('caso-vuln-busca');
  if (e.key === 'Backspace' && input && !input.value && CASO.vuln.length) { vulnRemover(CASO.vuln[CASO.vuln.length - 1]); return; }
  if ((e.key === 'ArrowDown' || e.key === 'Enter') && $id('combo-caso-vuln-busca-list').style.display !== 'block') vulnFiltrar();
  comboTeclado(e, 'caso-vuln-busca');
}
function vulnAdicionar(id) { if (vulnPorId(id) && CASO.vuln.indexOf(id) === -1) { CASO.vuln.push(id); vulnAtualizar(); } }
function vulnRemover(id) { CASO.vuln = CASO.vuln.filter(function (x) { return x !== id; }); vulnAtualizar(); if ($id('combo-caso-vuln-busca-list') && $id('combo-caso-vuln-busca-list').style.display === 'block') vulnFiltrar(); }
function vulnAtualizar() {
  var sel = CASO.vuln;
  CASO.vuln = VULN.map(function (v) { return v.id; }).filter(function (id) { return sel.indexOf(id) !== -1; });
  CASO.vulnOutra = v13Val('caso-vuln-outra');
  if (typeof S !== 'undefined') S.perfil = CASO.vuln.slice();
  vulnRender(); vulnPrevia(); prazoChange();
}
function vulnToggle() { CASO.vulnOutra = v13Val('caso-vuln-outra'); vulnPrevia(); casoResumo(); }
function casoSetVuln(ids) { CASO.vuln = (ids || []).filter(function (id) { return !!vulnPorId(id); }); vulnAtualizar(); }
function vulnPrevia() {
  var box = $id('caso-vuln-previa'); if (!box) return;
  var b = vulnParagrafo(CASO.vuln, CASO.vulnOutra, 'banco'), i = vulnParagrafo(CASO.vuln, CASO.vulnOutra, 'inss');
  var conf = CASO.vuln.map(function (id) { var v = vulnPorId(id); return v ? '<li><span class="v13-tag ' + v.classe + '">' + VULN_CLASSES[v.classe] + '</span><b>' + v13Esc(v.rot) + ':</b> ' + v13Esc(v.conferir) + '</li>' : ''; }).join('');
  box.innerHTML = b ? '<b>Texto que entra no ofício à instituição:</b> ' + v13Esc(b) + '<br><br><b>No ofício ao INSS:</b> ' + v13Esc(i)
    + (conf ? '<br><br><b>O que conferir no atendimento:</b><ul style="margin:6px 0 0 16px;">' + conf + '</ul>' : '')
    : 'Nenhuma condição escolhida: os documentos saem sem o parágrafo de prioridade. Escolha na lista as condições que se aplicam ao caso.';
}
function prazoAtual() {
  var sel = v13Val('caso-prazo') || '10';
  if (sel === 'sem') return null;
  var dias = sel === 'outro' ? parseInt(v13Val('caso-prazo-n'), 10) : parseInt(sel, 10);
  if (!(dias > 0)) return null;
  return { dias: dias, tipo: v13Val('caso-prazo-tipo') || 'uteis' };
}
function prazoChange() {
  var w = $id('caso-prazo-wrap-n'); if (w) w.style.display = v13Val('caso-prazo') === 'outro' ? '' : 'none';
  CASO.prazoJust = v13Val('caso-prazo-just');
  var pz = prazoAtual(), info = $id('caso-prazo-info');
  if (info) {
    var urg = CASO.vuln.length && pz && pz.dias > 10;
    info.className = 'v13-info ' + (urg ? 'warn' : 'ok');
    info.innerHTML = (pz ? 'O ofício pedirá resposta em <b>' + dxPrazoTexto(pz) + '</b> contados do recebimento. ' : 'O ofício não indicará prazo específico. ')
      + 'O prazo é um pedido da Defensoria, não um prazo legal único para todas as instituições: escolha conforme a urgência, a natureza do pedido e a situação do(a) assistido(a).'
      + (urg ? ' <b>Há prioridade ou vulnerabilidade marcada: avalie um prazo menor e registre a justificativa.</b>' : '');
  }
  casoResumo();
}

/* ════════ 4. OFÍCIO À INSTITUIÇÃO: modelo, itens e endereço ══════════ */
var OF_ITENS = [], OI_ITENS = [];
function ofModalidadeInit() {
  var sel = $id('of-modalidade'); if (!sel || sel.options.length) return;
  sel.innerHTML = OF_MODALIDADES.map(function (m) { return '<option value="' + m.id + '">' + v13Esc(m.rot) + '</option>'; }).join('');
  ofAplicarModalidade(true);
}
function ofAplicarModalidade(forcar) {
  var m = ofModalidade(v13Val('of-modalidade')), tema = $id('of-tema'), rel = $id('of-relato');
  if (tema && (forcar || !tema.dataset.edit)) { tema.value = m.tema; tema.dataset.edit = ''; }
  if (rel && (forcar || !rel.dataset.edit)) { rel.value = m.relato; rel.dataset.edit = ''; }
  OF_ITENS = m.itens.map(function (t) { return { t: t, on: true }; });
  itensRender('of');
}
function itensRender(pref) {
  var lista = pref === 'of' ? OF_ITENS : OI_ITENS, box = $id(pref + '-itens'); if (!box) return;
  box.innerHTML = lista.map(function (it, i) {
    return '<label><input type="checkbox" ' + (it.on ? 'checked' : '') + ' onchange="itensMarcar(\'' + pref + '\',' + i + ',this.checked)"><span>' + v13Esc(it.t) + '</span>'
      + (it.custom ? '<button type="button" class="x" title="Remover" onclick="itensRemover(\'' + pref + '\',' + i + ')">✕</button>' : '') + '</label>';
  }).join('');
}
function itensMarcar(pref, i, on) { (pref === 'of' ? OF_ITENS : OI_ITENS)[i].on = on; }
function itensRemover(pref, i) { (pref === 'of' ? OF_ITENS : OI_ITENS).splice(i, 1); itensRender(pref); }
function itensAdicionar(pref) {
  var inp = $id(pref + '-item-novo'); if (!inp || !inp.value.trim()) return;
  (pref === 'of' ? OF_ITENS : OI_ITENS).push({ t: inp.value.trim().replace(/[.;]+$/, ''), on: true, custom: true });
  inp.value = ''; itensRender(pref);
}
function itensMarcados(pref) { return (pref === 'of' ? OF_ITENS : OI_ITENS).filter(function (x) { return x.on; }).map(function (x) { return x.t; }); }

/* Substitui o aoMudarBanco da v12: endereço pelo cadastro + espelho para a autorização */
function aoMudarBanco() {
  var nome = v13Val('of-banco');
  if (CASO.instituicao !== nome) casoSet('instituicao', nome, 'of-banco');
  ofAtualizarEndereco(true);
}
function ofAtualizarEndereco(auto) {
  var nome = v13Val('of-banco'), r = instBuscar(nome), sel = $id('of-end-origem'), end = $id('of-endereco'), info = $id('of-end-info');
  if (!sel || !end) return;
  var op = instEnderecos(r);
  sel.innerHTML = op.map(function (o) { return '<option value="' + o.id + '">' + v13Esc(o.rot) + '</option>'; }).join('') + '<option value="manual">Digitar outro endereço</option>';
  if (auto && (!end.value.trim() || end.dataset.auto === '1')) {
    if (op.length) { sel.value = op[0].id; end.value = op[0].end; end.dataset.auto = '1'; }
    else { sel.value = 'manual'; if (end.dataset.auto === '1') end.value = ''; }
  }
  ofInfoEndereco(r, op);
}
function ofOrigemChange() {
  var nome = v13Val('of-banco'), r = instBuscar(nome), op = instEnderecos(r), id = v13Val('of-end-origem'), end = $id('of-endereco');
  var o = op.filter(function (x) { return x.id === id; })[0];
  if (o) { end.value = o.end; end.dataset.auto = '1'; } else { end.dataset.auto = ''; end.focus(); }
  ofInfoEndereco(r, op);
}
function ofInfoEndereco(r, op) {
  var info = $id('of-end-info'); if (!info) return;
  var nome = v13Val('of-banco');
  if (!nome) { info.className = 'v13-info ok'; info.innerHTML = 'Escolha a instituição: o endereço é preenchido pelo cadastro (Receita Federal ou cadastro da unidade). Todos os campos são editáveis.'; return; }
  if (!r) { info.className = 'v13-info warn'; info.innerHTML = '⚠ Instituição fora do cadastro. Digite o endereço e, se quiser reaproveitar, salve-o no <b>Cadastro de instituições</b> (mais abaixo).'; return; }
  var partes = [];
  if (r.razao && _normTxt(r.razao) !== _normTxt(r.nome)) partes.push('Razão social no CNPJ: <b>' + v13Esc(r.razao) + '</b>');
  if (r.cnpj) partes.push('CNPJ ' + r.cnpj + (r.cod ? ' · código ' + r.cod : ''));
  if (r.situacao) partes.push('<b>' + v13Esc(r.situacao) + '</b>');
  var aviso = r.semEndereco || !op.length ? '⚠ Sem endereço confirmado no cadastro: preencha e confira antes do envio.' : '';
  if (r.conferir || r.obs) aviso = '⚠ ' + v13Esc(r.obs || 'Dado a conferir antes do envio.');
  if (r.obsUser) partes.push('Observação: ' + v13Esc(r.obsUser));
  info.className = 'v13-info ' + (aviso ? 'warn' : 'ok');
  info.innerHTML = (aviso ? aviso + '<br>' : '✓ ') + partes.join(' · ') + (op.length > 1 ? '<br>Há ' + op.length + ' endereços para esta instituição: escolha acima o mais adequado (confirme com a Triagem se o envio é à sede ou a outro canal).' : '');
}
function ofSalvarEnderecoAlternativo() {
  var nome = v13Val('of-banco'), end = v13Val('of-endereco');
  if (!nome || !end) { v13Toast('Preencha a instituição e o endereço antes de salvar.'); return; }
  var ovr = instOverrides(), k = _normTxt(nome);
  ovr[k] = Object.assign({}, ovr[k] || {}, { nome: nome, alt: end });
  v13LsSet(INST_OVR_KEY, ovr); instCarregar(); ofAtualizarEndereco(false);
  v13Toast('✓ Endereço salvo como alternativo de ' + nome + ' (neste navegador).');
}

/* ════════ 5. DOCUMENTOS: montagem, revisão e geração ═════════════════ */
function cargoTexto(v) { return v === 'fem' ? 'Defensora Pública do Estado' : (v === 'analista' ? 'Analista de Defensoria' : 'Defensor Público do Estado'); }
function estagTexto() { var f = v13Val('of-est-pronome') === 'fem'; return (f ? 'Estagiária' : 'Estagiário') + ' de ' + (v13Val('of-estag-tipo') || 'Graduação') + ' em Direito'; }
function dadosDoc(tipo) {
  var u = unidadeCarregar(), pz = prazoAtual();
  if (tipo === 'banco') return {
    unidade: u, numero: v13Val('of-numero'), dataIso: v13Val('of-data'), instituicao: instNomeDoc(v13Val('of-banco')), endereco: v13Val('of-endereco'),
    assistido: v13Val('of-assistido'), cpf: v13Val('of-cpf'), dol: v13Val('of-numero'), contrato: v13Val('of-contrato'),
    tema: v13Val('of-tema'), relato: v13Val('of-relato'), itens: itensMarcados('of'), prazo: pz, justificativa: v13Val('caso-prazo-just'),
    vulnerabilidade: vulnParagrafo(CASO.vuln, v13Val('caso-vuln-outra'), 'banco'), autorizacao: !!($id('of-autorizacao') || {}).checked,
    signatario: v13Val('of-defensor'), cargo: cargoTexto(v13Val('of-def-pronome')), estagiario: v13Val('of-estagiario'), estagiarioCargo: estagTexto() };
  if (tipo === 'inss') {
    var endSel = v13Val('oi-endereco'), endereco = endSel === 'outro' ? v13Val('oi-endereco-outro') : (ENDERECOS_INSS[endSel] || ENDERECOS_INSS.centro);
    return { unidade: u, numero: v13Val('oi-numero'), dataIso: v13Val('oi-data'), endereco: endereco, assistido: v13Val('oi-assistido'), cpf: v13Val('oi-cpf'),
      dol: v13Val('oi-numero'), beneficio: v13Val('oi-beneficio'), contrato: v13Val('oi-contrato'), relato: v13Val('oi-relato'), itens: itensMarcados('oi'), prazo: pz,
      justificativa: v13Val('caso-prazo-just'), vulnerabilidade: vulnParagrafo(CASO.vuln, v13Val('caso-vuln-outra'), 'inss'),
      signatario: v13Val('oi-signatario'), cargo: cargoTexto(v13Val('oi-cargo')) };
  }
  var ref = ($id('au-ref') || {}).checked;
  return { unidade: u, nome: v13Val('au-nome'), cpf: v13Val('au-cpf'), dataIso: v13Val('caso-data') || v13Val('of-data'),
    dol: ref ? CASO.dol : '', instituicao: ref ? instNomeDoc(v13Val('au-banco')) : '', contrato: ref ? v13Val('au-contrato') : '' };
}
function parsDoc(tipo, d) { return tipo === 'banco' ? dxOficioBanco(d) : (tipo === 'inss' ? dxOficioINSS(d) : dxAutorizacao(d)); }
function validarDoc(tipo, d) {
  var warn = tipo === 'banco' ? 'of-warn' : (tipo === 'inss' ? 'oi-warn' : 'au-warn'), faltam = [], avisos = [];
  limparAvisoDoc(warn);
  var nome = tipo === 'aut' ? d.nome : d.assistido;
  if (!nome) faltam.push('nome do(a) assistido(a)');
  if (!d.cpf) faltam.push('CPF'); else if (d.cpf.replace(/\D/g, '').length !== 11) faltam.push('CPF válido (11 dígitos)');
  if (tipo === 'banco' && !d.instituicao) faltam.push('instituição');
  if (tipo === 'banco' && !d.endereco) avisos.push('endereço da instituição em branco');
  if (tipo === 'inss' && !d.endereco) faltam.push('endereço da agência do INSS');
  if (tipo !== 'aut' && !(d.itens && d.itens.length)) faltam.push('ao menos um item solicitado');
  if (tipo !== 'aut' && !d.signatario) avisos.push('signatário(a) em branco (o espaço sairá para preenchimento)');
  if (tipo !== 'aut' && !d.numero) avisos.push('sem nº do DOL: o número do ofício sairá em branco');
  if (faltam.length) { avisoDoc(warn, 'Falta preencher: <strong>' + faltam.join(' · ') + '</strong>. Os dados do atendimento ficam no quadro "1. Dados do atendimento".'); return null; }
  return avisos;
}
function docPrevisualizar(tipo) {
  var d = dadosDoc(tipo), av = validarDoc(tipo, d); if (av === null) return;
  var pars = parsDoc(tipo, d), aj = dxAjustar(pars, { padrao: d.unidade.padrao });
  var modal = $id('v13-prev-modal'); modal.dataset.tipo = tipo;
  var sel = $id('v13-prev-padrao');
  if (sel) { if (!sel.options.length) sel.innerHTML = docOpcoesPadrao(); sel.value = aj.padrao; }
  $id('v13-prev-fit').innerHTML = (aj.cabe ? 'Cabe em <b>uma página</b> com <b>' + aj.nivel.rotulo + '</b>.' : '<b>O conteúdo passa de uma página</b> mesmo com a fonte mínima. Desmarque itens ou encurte o relato.')
    + (aj.nivel.id > 0 && aj.cabe ? ' A fonte foi reduzida para manter o documento em uma página.' : '')
    + (av.length ? '<br><span style="color:#74521a;">Atenção: ' + av.join('; ') + '.</span>' : '');
  $id('v13-prev-page').innerHTML = docHtmlPagina(aj, d.unidade);
  modal.classList.add('show'); docEscalar();
}
function docOpcoesPadrao() {
  return Object.keys(DX_PADROES).map(function (k) { return '<option value="' + k + '">' + v13Esc(DX_PADROES[k].rotulo) + '</option>'; }).join('');
}
function docTrocarPadrao(v) {
  if (!DX_PADROES[v]) return;
  var u = unidadeCarregar(); u.padrao = v; v13LsSet(UNIDADE_KEY, u);
  if ($id('un-padrao')) $id('un-padrao').value = v;
  unidadePrevia();
  var modal = $id('v13-prev-modal');
  if (modal && modal.classList.contains('show') && modal.dataset.tipo) docPrevisualizar(modal.dataset.tipo);
  v13Toast('Padrão dos documentos: ' + DX_PADROES[v].rotulo + '. Fica salvo neste navegador.');
}
/* Pré-visualização em escala real (A4 a 96 dpi): timbre, margens do Manual (3 cm, 1,5 cm, 2 cm) e rodapé da unidade. */
function docHtmlPagina(aj, u) {
  var nv = aj.nivel, fam = nv.fonte === 'Helvetica' ? 'Arial,Helvetica,sans-serif' : (nv.fonte === 'Calibri' ? 'Calibri,Carlito,sans-serif' : "'" + nv.fonte + "',serif");
  var lh = (DX_ALTURA_FONTE[nv.medir] || 1.15);
  var corpo = aj.pars.map(function (p) {
    if (p.assinaturas) return '<div class="v13-a4-ass" style="line-height:' + lh + ';">' + p.assinaturas.map(function (b) { return '<div>' + b.map(function (l) { return v13Esc(l); }).join('<br>') + '</div>'; }).join('') + '</div>';
    var st = 'text-align:' + (p.jc === 'both' ? 'justify' : (p.jc || 'left')) + ';margin:' + ((p.antes || 0) / 20) + 'pt 0 ' + ((p.depois == null ? nv.depois : p.depois) / 20) + 'pt;'
      + (p.recuo ? 'text-indent:' + (p.recuo / 20) + 'pt;' : '') + 'line-height:' + (p.linha || nv.entre) * lh + ';';
    return '<p style="' + st + '">' + (p.runs || []).map(function (r) { return r.b ? '<b>' + v13Esc(r.t) + '</b>' : v13Esc(r.t); }).join('') + '</p>';
  }).join('');
  var rod = unidadeRodape(u), logo = ($id('v13-logo-pos') || {}).src || '';
  return '<div class="v13-a4" style="font-family:' + fam + ';font-size:' + nv.pt + 'pt;">'
    + '<div class="v13-a4-cab"><img src="' + logo + '" alt="Defensoria Pública do Estado de São Paulo"><div>' + v13Esc(u.cab1) + '<br>' + v13Esc(u.cab2) + '</div></div>'
    + '<div class="v13-a4-corpo">' + corpo + '</div><div class="v13-a4-rod"><div>' + v13Esc(rod[0]) + '<br>' + v13Esc(rod[1]) + '</div></div></div>';
}
function docEscalar() {
  var wrap = $id('v13-prev-page'), pg = wrap ? wrap.querySelector('.v13-a4') : null; if (!pg) return;
  var disp = Math.min(wrap.clientWidth || 794, 794), esc = disp / 794;
  pg.style.transform = 'scale(' + esc + ')'; wrap.style.height = (1123 * esc) + 'px';
}
window.addEventListener('resize', function () { if ($id('v13-prev-modal') && $id('v13-prev-modal').classList.contains('show')) docEscalar(); });
function docFecharPrevia() { $id('v13-prev-modal').classList.remove('show'); }
function docImprimirPrevia() {
  document.body.classList.add('v13-imprimindo-doc');
  var pg = document.querySelector('#v13-prev-page .v13-a4'), tr = pg ? pg.style.transform : '';
  if (pg) pg.style.transform = 'none';
  setTimeout(function () { window.print(); if (pg) pg.style.transform = tr; document.body.classList.remove('v13-imprimindo-doc'); }, 60);
}
async function docGerar(tipo) {
  var d = dadosDoc(tipo), av = validarDoc(tipo, d); if (av === null) return;
  if (tipo === 'banco' && !(($id('of-chk-dados') || {}).checked && ($id('of-chk-assinatura') || {}).checked)) { avisoDoc('of-warn', 'Marque os dois itens de conferência antes de baixar.'); return; }
  if (tipo === 'inss' && !(($id('oi-chk-dados') || {}).checked && ($id('oi-chk-assinatura') || {}).checked)) { avisoDoc('oi-warn', 'Marque os dois itens de conferência antes de baixar.'); return; }
  try {
    var g = await dxGerarBlob(parsDoc(tipo, d), { unidade: d.unidade });
    var nome = tipo === 'banco' ? dxNomeArquivo('Oficio', d.numero, d.assistido) : (tipo === 'inss' ? dxNomeArquivo('Oficio_INSS', d.numero, d.assistido) : dxNomeArquivo('Autorizacao', '', d.nome));
    dxBaixar(g.blob, nome);
    DOCS_GERADOS[tipo === 'banco' ? 'banco:' + _normTxt(d.instituicao) : tipo] = { tipo: tipo, inst: d.instituicao || '', numero: d.numero || '' };
    v13Toast((g.ajuste.cabe ? '✓ ' : '⚠ ') + nome + ' baixado · ' + g.ajuste.nivel.rotulo + (g.ajuste.cabe ? ' · 1 página' : ' · pode passar de 1 página: revise o conteúdo'), 4500);
    docFecharPrevia();
  } catch (e) { alert('Erro ao gerar o documento: ' + e.message); console.error(e); }
}
var DOCS_GERADOS = {};
async function baixarModeloEmBranco(tipo) {
  var u = unidadeCarregar();
  var d = tipo === 'banco'
    ? { unidade: u, numero: '', instituicao: '[INSTITUIÇÃO]', endereco: '[ENDEREÇO] — [CIDADE/UF] — CEP [00000-000]', assistido: '[NOME COMPLETO]', cpf: '[CPF]', dol: '[DOL]', contrato: '[Nº DO CONTRATO]', tema: '[Síntese do pedido]', relato: '[Relato objetivo da situação]', itens: ['[documento ou informação solicitada]', '[documento ou informação solicitada]'], prazo: { dias: 10, tipo: 'uteis' }, signatario: '', cargo: '[CARGO]', estagiario: '' }
    : (tipo === 'inss' ? { unidade: u, numero: '', endereco: '[ENDEREÇO DA AGÊNCIA DO INSS]', assistido: '[NOME COMPLETO]', cpf: '[CPF]', dol: '[DOL]', relato: '', itens: OI_ITENS_PADRAO, prazo: { dias: 10, tipo: 'uteis' }, signatario: '', cargo: '[CARGO]' }
      : { unidade: u, nome: '[NOME COMPLETO]', cpf: '[CPF]' });
  try { var g = await dxGerarBlob(parsDoc(tipo, d), { unidade: u }); dxBaixar(g.blob, 'Modelo_' + (tipo === 'banco' ? 'Oficio' : (tipo === 'inss' ? 'Oficio_INSS' : 'Autorizacao')) + '_em_branco.docx'); }
  catch (e) { alert('Erro: ' + e.message); }
}
/* Compatibilidade: nomes das funções da v12 passam a usar o novo gerador */
function gerarOficioPreenchido() { return docGerar('banco'); }
function gerarOficioINSS() { return docGerar('inss'); }
function gerarAutorizacaoPreenchida() { return docGerar('aut'); }
function oiItensInit() { OI_ITENS = OI_ITENS_PADRAO.map(function (t) { return { t: t, on: true }; }); itensRender('oi'); }
function oiEnderecoChange() { var w = $id('oi-endereco-outro-wrap'); if (w) w.style.display = v13Val('oi-endereco') === 'outro' ? '' : 'none'; }

/* ════════ 6. MINUTA DE E-MAIL PARA A TRIAGEM ═════════════════════════ */
var EM_INSS_KEY = 'dpesp-email-inss-v13', EM_ASSIN_KEY = 'dpesp-email-assinatura-v13';
function emInit() {
  try { var t = localStorage.getItem(EM_TRIAGEM_KEY); if (t && $id('em-triagem')) $id('em-triagem').value = t; } catch (e) {}
  var i = v13LsGet(EM_INSS_KEY, ''); if ($id('em-inss')) $id('em-inss').value = i || '';
  var a = v13LsGet(EM_ASSIN_KEY, ''); if ($id('em-assinatura')) $id('em-assinatura').value = a || '';
  var anx = $id('em-anexos');
  if (anx && !anx.children.length) anx.innerHTML = EM_ANEXOS.map(function (x, k) { return '<label><input type="checkbox" value="' + v13Esc(x) + '"' + (k < 2 ? ' checked' : '') + '> ' + v13Esc(x) + '</label>'; }).join('')
    + '<label><input type="checkbox" value="Ofício ao INSS assinado" id="em-anexo-inss"> Ofício ao INSS assinado</label>';
  if ($id('em-instituicoes') && !document.querySelector('#em-instituicoes .em-row')) emAdicionarInstituicao();
}
function emSalvarConfig() { v13LsSet(EM_INSS_KEY, v13Val('em-inss')); v13LsSet(EM_ASSIN_KEY, v13Val('em-assinatura')); salvarEmailTriagem(); }
function emPreencherEmailsSalvos(inp) {
  var row = inp.closest('.em-row'); if (!row) return;
  var mails = row.querySelector('.em-mails');
  if (mails && !mails.value.trim()) { var e = instEmails(inp.value); if (e) mails.value = e; }
}
function emUsarInstituicaoDoCaso() {
  var nome = CASO.instituicao || v13Val('of-banco'); if (!nome) { v13Toast('Preencha a instituição nos dados do atendimento.'); return; }
  var ja = false; document.querySelectorAll('#em-instituicoes .em-inst').forEach(function (i) { if (_normTxt(i.value) === _normTxt(nome)) ja = true; });
  if (ja) { v13Toast('Essa instituição já está na lista.'); return; }
  var vazio = null; document.querySelectorAll('#em-instituicoes .em-inst').forEach(function (i) { if (!vazio && !i.value.trim()) vazio = i; });
  if (vazio) { vazio.value = nome; emPreencherEmailsSalvos(vazio); } else emAdicionarInstituicao(nome);
}
function emAssunto() {
  var nome = CASO.assistido || v13Val('em-assistido') || '[NOME DO(A) ASSISTIDO(A)]';
  return 'Ofícios para encaminhamento — ' + nome + (CASO.dol ? ' — DOL nº ' + CASO.dol : '') + (CASO.contrato ? ' — Contrato nº ' + CASO.contrato : '');
}
function emGerarMinuta() {
  limparAvisoDoc('em-warn'); emSalvarConfig();
  var tri = v13Val('em-triagem');
  if (!tri || tri.indexOf('@') === -1) { avisoDoc('em-warn', 'Informe um <strong>e-mail oficial da Triagem</strong> válido (destinatário). Ele fica salvo neste navegador.'); if ($id('em-triagem')) $id('em-triagem').focus(); return; }
  var incluirInss = ($id('em-incluir-inss') || {}).checked, inss = v13Val('em-inss');
  if (incluirInss && inss && inss.indexOf('@') === -1) { avisoDoc('em-warn', 'O e-mail do INSS parece inválido. Corrija ou desmarque a inclusão do INSS.'); return; }
  var blocos = [], n = 0;
  document.querySelectorAll('#em-instituicoes .em-row').forEach(function (r) {
    var inst = ((r.querySelector('.em-inst') || {}).value || '').trim(); if (!inst) return;
    var mails = _emListaEmails((r.querySelector('.em-mails') || {}).value), doc = DOCS_GERADOS['banco:' + _normTxt(inst)];
    blocos.push((++n) + '. ' + inst + '\n   E-mail(s): ' + (mails.length ? mails.join('; ') : '[preencher e-mail]')
      + (doc && doc.numero ? '\n   Ofício nº ' + doc.numero : '') + (CASO.contrato && _normTxt(inst) === _normTxt(CASO.instituicao) ? '\n   Contrato nº ' + CASO.contrato : ''));
  });
  if (incluirInss) blocos.push((++n) + '. Instituto Nacional do Seguro Social — INSS (Gerência Executiva)\n   E-mail: ' + (inss || '[configurar o e-mail institucional do INSS]'));
  if (!blocos.length) { avisoDoc('em-warn', 'Adicione ao menos uma instituição destinatária ou marque a inclusão do INSS.'); return; }
  var nome = CASO.assistido || v13Val('em-assistido') || '[NOME DO(A) ASSISTIDO(A)]', pz = prazoAtual(), u = unidadeCarregar();
  var anexos = []; document.querySelectorAll('#em-anexos input:checked').forEach(function (c) { anexos.push(c.value); });
  var prior = CASO.vuln.filter(function (id) { var v = vulnPorId(id); return v && v.classe === 'prioridade'; }).map(function (id) { return vulnPorId(id).rot; });
  var L = [];
  L.push('Prezados(as),');
  L.push('Encaminho, para conferência e envio pelos oficiais responsáveis, ' + (n > 1 ? 'os ofícios expedidos' : 'o ofício expedido') + ' em favor de ' + nome + (CASO.dol ? ', atendimento DOL nº ' + CASO.dol : '') + '.');
  if (prior.length) L.push('PRIORIDADE: ' + prior.join('; ') + '. Solicita-se tratamento prioritário no encaminhamento.');
  L.push('Instituições destinatárias:\n' + blocos.join('\n'));
  L.push('Prazo solicitado para resposta: ' + (pz ? dxPrazoTexto(pz) + ' contados do recebimento' : 'sem prazo específico') + (CASO.prazoJust ? ' (' + CASO.prazoJust.replace(/\.+$/, '') + ')' : '') + '.');
  if (anexos.length) L.push('Documentos anexos:\n' + anexos.map(function (a) { return '- ' + a; }).join('\n'));
  L.push('As respostas deverão ser encaminhadas ao e-mail institucional da unidade (' + u.email + ')' + (CASO.dol ? ', com referência ao DOL nº ' + CASO.dol : '') + '.');
  L.push('Permaneço à disposição para quaisquer esclarecimentos.');
  L.push('Atenciosamente,' + (v13Val('em-assinatura') ? '\n' + v13Val('em-assinatura') : ''));
  $id('em-saida').value = L.join('\n\n');
  if ($id('em-assunto')) $id('em-assunto').value = emAssunto();
  var dest = $id('em-destinatarios'); if (dest) dest.textContent = 'Para: ' + tri + (v13Val('em-cc') ? ' · Cc: ' + v13Val('em-cc') : '');
}
function emCopiarCampo(id, btn) { var el = $id(id); if (!el) return; var t = el.value != null ? el.value : el.textContent; if (!t.trim()) emGerarMinuta(); copiarTextoFeedback(el.value != null ? el.value : el.textContent, btn); }
function emLimparMinuta() {
  ['em-saida', 'em-assunto'].forEach(function (id) { if ($id(id)) $id(id).value = ''; });
  var cont = $id('em-instituicoes'); if (cont) cont.innerHTML = '';
  emAdicionarInstituicao();
}

/* ════════ 7. EDITOR DO CADASTRO DE INSTITUIÇÕES ══════════════════════ */
var INST_EDIT = null;
function instFiltrar() {
  var q = _normTxt(v13Val('inst-busca')), box = $id('inst-lista'); if (!box) return;
  if (q.length < 2) { box.innerHTML = '<div style="cursor:default;color:var(--mi);">Digite ao menos 2 letras do nome, da razão social ou do CNPJ.</div>'; return; }
  var ovr = instOverrides(), res = INST.lista.filter(function (r) { return (_normTxt(r.nome) + ' ' + _normTxt(r.razao || '') + ' ' + (r.cnpj || '').replace(/\D/g, '')).indexOf(q.replace(/[.\-\/]/g, '')) !== -1 || _normTxt(r.nome).indexOf(q) !== -1; }).slice(0, 40);
  box.innerHTML = res.length ? res.map(function (r, i) {
    var o = ovr[_normTxt(r.nome)], tem = r.sede || r.agRP || r.v12 || (o && (o.end || o.alt));
    return '<div onclick="instEditar(' + INST.lista.indexOf(r) + ')"><strong>' + v13Esc(r.nome) + '</strong>'
      + (o ? '<span class="v13-badge user">editado</span>' : '') + (r.conferir || !tem ? '<span class="v13-badge warn">' + (tem ? 'conferir' : 'sem endereço') + '</span>' : '<span class="v13-badge ok">com endereço</span>')
      + '<br><small>' + v13Esc(r.cnpj ? 'CNPJ ' + r.cnpj + ' · ' : '') + v13Esc(r.agRP || r.sede || r.v12 || '') + '</small></div>';
  }).join('') : '<div style="cursor:default;">Nenhuma instituição encontrada. Use "Nova instituição".</div>';
}
function instEditar(idx) {
  var r = idx === -1 ? { nome: '' } : INST.lista[idx]; INST_EDIT = r;
  var o = instOverrides()[_normTxt(r.nome)] || {}, s = (o.end && typeof o.end === 'object') ? o.end : (r.sedeObj || {});
  $id('inst-form').style.display = '';
  var set = function (id, v) { if ($id(id)) $id(id).value = v || ''; };
  set('inst-f-nome', r.nome); set('inst-f-razao', o.razao || r.razao); set('inst-f-cnpj', o.cnpj || r.cnpj);
  set('inst-f-l', s.l || (r.agRP && !r.sedeObj ? r.agRP : '')); set('inst-f-b', s.b); set('inst-f-m', s.m); set('inst-f-uf', s.uf); set('inst-f-cep', s.cep);
  set('inst-f-alt', o.alt || r.agRP || ''); set('inst-f-emails', instEmails(r.nome)); set('inst-f-obs', o.obs || '');
  if ($id('inst-f-conf')) $id('inst-f-conf').checked = !!o.conferido;
  $id('inst-f-nome').readOnly = idx !== -1;
  $id('inst-f-fonte').innerHTML = idx === -1 ? 'Nova instituição: os dados ficam salvos neste navegador.' : ('Fonte do endereço da sede: ' + v13Esc(r.fonte || (r.v12 ? 'cadastro da v12 (conferir)' : 'não há')) + (r.agRP ? ' · Agência em Ribeirão Preto do cadastro da unidade: ' + v13Esc(r.agRP) : '') + (r.obs ? '<br>⚠ ' + v13Esc(r.obs) : '') + (r.situacao ? '<br>' + v13Esc(r.situacao) : ''));
  $id('inst-form').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
function instSalvar() {
  var nome = v13Val('inst-f-nome'); if (!nome) { v13Toast('Informe o nome da instituição.'); return; }
  var cep = v13Val('inst-f-cep').replace(/\D/g, ''); if (cep && cep.length !== 8) { v13Toast('CEP deve ter 8 dígitos.'); return; }
  var ovr = instOverrides(), k = _normTxt(nome);
  var end = { l: v13Val('inst-f-l'), b: v13Val('inst-f-b'), m: v13Val('inst-f-m'), uf: v13Val('inst-f-uf').toUpperCase(), cep: cep ? cep.slice(0, 5) + '-' + cep.slice(5) : '' };
  ovr[k] = { nome: nome, razao: v13Val('inst-f-razao'), cnpj: v13Val('inst-f-cnpj'), end: end.l ? end : null, alt: v13Val('inst-f-alt'), emails: v13Val('inst-f-emails'), obs: v13Val('inst-f-obs'), conferido: !!($id('inst-f-conf') || {}).checked, em: new Date().toISOString().slice(0, 10) };
  v13LsSet(INST_OVR_KEY, ovr);
  if (ovr[k].emails) { try { var s = _emInstEmailsLoad(); s[k] = ovr[k].emails; localStorage.setItem(EM_INST_EMAILS_KEY, JSON.stringify(s)); } catch (e) {} }
  instCarregar(); instFiltrar(); ofAtualizarEndereco(false);
  v13Toast('✓ Cadastro de ' + nome + ' salvo neste navegador. Use "Exportar" para compartilhar com a equipe.');
}
function instRemoverEdicao() {
  var nome = v13Val('inst-f-nome'), ovr = instOverrides(), k = _normTxt(nome);
  if (!ovr[k]) { v13Toast('Não há edição salva para esta instituição.'); return; }
  if (!confirm('Remover os dados editados de ' + nome + ' e voltar ao cadastro oficial?')) return;
  delete ovr[k]; v13LsSet(INST_OVR_KEY, ovr); instCarregar(); instFiltrar(); $id('inst-form').style.display = 'none';
}
function instExportar() {
  var blob = new Blob([JSON.stringify({ tipo: 'dpesp-cadastro-instituicoes', versao: V13_VERSAO, exportado: new Date().toISOString(), dados: instOverrides(), emails: _emInstEmailsLoad() }, null, 1)], { type: 'application/json' });
  dxBaixar(blob, 'cadastro_instituicoes_DPESP_' + new Date().toISOString().slice(0, 10) + '.json');
}
function instImportar(inp) {
  var f = inp.files && inp.files[0]; if (!f) return;
  var rd = new FileReader();
  rd.onload = function () {
    try {
      var j = JSON.parse(rd.result); if (j.tipo !== 'dpesp-cadastro-instituicoes') throw new Error('arquivo não é um cadastro exportado pelo sistema');
      var ovr = instOverrides(); Object.keys(j.dados || {}).forEach(function (k) { ovr[k] = j.dados[k]; }); v13LsSet(INST_OVR_KEY, ovr);
      var s = _emInstEmailsLoad(); Object.keys(j.emails || {}).forEach(function (k) { s[k] = j.emails[k]; }); localStorage.setItem(EM_INST_EMAILS_KEY, JSON.stringify(s));
      instCarregar(); instFiltrar(); v13Toast('✓ Cadastro importado: ' + Object.keys(j.dados || {}).length + ' instituição(ões).');
    } catch (e) { alert('Não foi possível importar: ' + e.message); }
    inp.value = '';
  };
  rd.readAsText(f);
}

/* ════════ 8. CONFIGURAÇÕES DA UNIDADE (cabeçalho e rodapé) ═══════════ */
var UN_CAMPOS = ['cab1', 'cab2', 'cidade', 'sigla', 'endereco', 'telefone', 'email', 'site', 'padrao'];
function unidadeFormInit() {
  var u = unidadeCarregar(), sp = $id('un-padrao');
  if (sp && !sp.options.length) sp.innerHTML = docOpcoesPadrao();
  UN_CAMPOS.forEach(function (k) { if ($id('un-' + k)) $id('un-' + k).value = u[k]; });
  unidadePrevia();
}
function unidadePrevia() {
  var u = {}; UN_CAMPOS.forEach(function (k) { u[k] = v13Val('un-' + k); }); var r = unidadeRodape(u), p = DX_PADROES[u.padrao];
  var dt = dxDataExtenso(''), sig = String(u.sigla || '').trim();
  if ($id('un-previa')) $id('un-previa').innerHTML = '<b>Cabeçalho:</b> ' + v13Esc(u.cab1) + ' / ' + v13Esc(u.cab2) + '<br><b>Rodapé:</b> ' + v13Esc(r[0]) + '<br>' + v13Esc(r[1])
    + '<br><b>Identificação:</b> OFÍCIO Nº 123456/' + dt.ano + (sig ? '/' + v13Esc(sig) : '') + ' · <b>Data:</b> ' + v13Esc(u.cidade) + ', ' + dt.texto + '.'
    + (p ? '<br><b>Padrão de redação:</b> ' + v13Esc(p.rotulo) + '. Estrutura do padrão ofício do Manual de Redação da Presidência da República; se o texto não couber em uma página, a fonte é reduzida aos poucos.' : '');
}
function unidadeSalvar() { var u = {}; UN_CAMPOS.forEach(function (k) { u[k] = v13Val('un-' + k); }); if (!u.email || u.email.indexOf('@') === -1) { v13Toast('Informe um e-mail válido para as respostas.'); return; } v13LsSet(UNIDADE_KEY, u); unidadePrevia(); v13Toast('✓ Dados da unidade salvos neste navegador.'); }
function unidadeRestaurar() { try { localStorage.removeItem(UNIDADE_KEY); } catch (e) {} unidadeFormInit(); v13Toast('Dados da unidade restaurados ao padrão (Ribeirão Preto).'); }

/* ════════ 9. TRIAGEM: urgência, perfil e cenário ═════════════════════ */
function v13AlertasSel() { return (typeof S !== 'undefined' && S.alertas) ? S.alertas.map(function (id) { return ALERTAS.filter(function (a) { return a.id === id; })[0]; }).filter(Boolean) : []; }
function v13BannerAlertas() {
  var al = v13AlertasSel(); if (!al.length) return '';
  return '<div class="v13-urg" role="alert"><div class="v13-urg-tit">Urgência: encaminhe ao(à) defensor(a) agora, sem esperar o fim da triagem</div><ul>'
    + al.map(function (a) { return '<li><strong>' + v13Esc(a.t) + ':</strong> ' + v13Esc(a.o) + '</li>'; }).join('')
    + '</ul><div class="v13-urg-acoes"><button type="button" onclick="v13CopiarAvisoDefensor(this)">Copiar aviso para o(a) defensor(a)</button>'
    + '<span style="font-size:11.5px;color:#7f1d1d;align-self:center;">Depois de avisar, você pode continuar a triagem normalmente.</span></div></div>';
}
function v13TriCaso(qId) { var b = $id('tri-caso'); if (b) b.style.display = qId === 'q_problema' ? '' : 'none'; }
function v13CopiarAvisoDefensor(btn) {
  casoDaTriagem();
  var al = v13AlertasSel(), cat = (typeof S !== 'undefined' && S.answers && S.answers[0]) ? S.answers[0].aText : '';
  var t = 'URGENTE — TRIAGEM BANCÁRIA\nAssistido(a): ' + (CASO.assistido || '[nome]') + (CASO.dol ? ' · DOL nº ' + CASO.dol : '') + (CASO.instituicao ? '\nInstituição: ' + CASO.instituicao : '') + (cat ? '\nCategoria: ' + cat : '')
    + '\nSinais de urgência identificados:\n' + al.map(function (a) { return '• ' + a.t + ' — ' + a.o; }).join('\n')
    + '\nData do recebimento do documento: [preencher]\nAtendente: [nome]';
  copiarTextoFeedback(t, btn && btn.id ? btn.id : null);
  v13Toast('✓ Aviso copiado: cole no canal da equipe e avise o(a) defensor(a) agora.', 4000);
}
function v13Analise(tId, t) {
  if (t.analise && t.analise.length) return t.analise;
  var p = tId.replace(/^END_/, '');
  if (/^inss_/.test(p)) return ['Data de cada contrato e teto vigente na época', 'Se houve crédito na conta e se foi usado pelo(a) assistido(a)', 'Como ocorreu a contratação (agência, correspondente, telefone, aplicativo)'];
  if (/^(pix|motoboy|whatsapp|boleto|conta_|invasao|emp_fraude)/.test(p)) return ['Se o(a) assistido(a) forneceu senha, código ou cartão (pode haver discussão de culpa concorrente)', 'Se as operações destoavam do perfil habitual de movimentação', 'Tempo decorrido desde os fatos e providências já tomadas (MED, B.O., contestação)'];
  if (/^car_/.test(p)) return ['Se o cartão foi solicitado, recebido e desbloqueado', 'Quais lançamentos são contestados e se houve contestação prévia'];
  if (/^(vei|imo)_/.test(p)) return ['Situação da mora e risco de perda do bem', 'Capacidade de pagamento e uso do bem (moradia, trabalho)'];
  if (/^div_/.test(p)) return ['Data do vencimento original e da inscrição', 'Inscrições anteriores em cadastros (Súmula 385)'];
  if (/^(sup|mul)_/.test(p)) return ['Renda, despesas essenciais e todas as dívidas', 'Dívidas excluídas da repactuação (CDC, art. 104-A, § 1º)'];
  return ['Documentos disponíveis e datas relevantes', 'Objetivo do(a) assistido(a) com o atendimento'];
}
function v13OfDoTerminal(tId, t) {
  if (t && t.of) return t.of;
  var p = tId.replace(/^END_/, '');
  if (/^inss_(refin|portab)/.test(p)) return 'refin_port';
  if (/^inss_(cobr|regular)/.test(p)) return 'consig_revisao';
  if (/^inss_fraude_cartao/.test(p)) return 'cartao_rmc';
  if (/^inss_/.test(p)) return 'consig_nao_reconhecido';
  if (/^(pix|motoboy|whatsapp|boleto|invasao)/.test(p)) return 'fraude_pix';
  if (/^(conta_|emp_fraude)/.test(p)) return 'nao_reconhecido';
  if (/^emp_/.test(p)) return 'consig_revisao';
  if (/^car_fraude/.test(p)) return 'nao_reconhecido';
  if (/^car_/.test(p)) return 'cartao_credito';
  if (/^vei_/.test(p)) return 'veiculo';
  if (/^imo_/.test(p)) return 'imobiliario';
  if (/^div_/.test(p)) return 'negativacao';
  if (/^(sup|mul)_/.test(p)) return 'superendividamento';
  return 'generico';
}
function v13CalcDoTerminal(tId, t) {
  if (t && t.calc) return t.calc;
  var p = tId.replace(/^END_/, '');
  if (/^inss_fraude_cartao/.test(p)) return 'rmc';
  if (/^inss_(cobr|regular|refin|portab)|^emp_(juros|regular|sem)/.test(p)) return 'consig_inss';
  if (/^car_(contestado|sem_contestacao|verificar|regular)/.test(p)) return 'cartao_rotativo';
  if (/^vei_/.test(p)) return 'veiculo_aquis';
  if (/^imo_/.test(p)) return 'imob_mercado';
  return '';
}
function v13CenarioTopo(t, tId) {
  var perfil = (typeof S !== 'undefined' && S.perfil) ? S.perfil : [];
  if (!perfil.length) return '';
  var grupos = { prioridade: [], vulnerabilidade: [], atencao: [] };
  perfil.forEach(function (id) { var v = vulnPorId(id); if (v) grupos[v.classe].push(v); });
  var h = '<div class="v13-bloco"><h4>Prioridades e vulnerabilidades do caso</h4>';
  Object.keys(grupos).forEach(function (c) {
    if (!grupos[c].length) return;
    h += '<p style="font-size:12px;font-weight:700;color:var(--dp-verde);margin:8px 0 4px;"><span class="v13-tag ' + c + '">' + VULN_CLASSES[c] + '</span></p><ul>';
    grupos[c].forEach(function (v) { h += '<li><strong>' + v13Esc(v.rot) + '.</strong> ' + v.fund.map(function (f) { return v13Esc(f[0]) + ': ' + v13Esc(f[1]); }).join(' ') + ' <em>Conferir:</em> ' + v13Esc(v.conferir) + '</li>'; });
    h += '</ul>';
  });
  return h + '<div class="v13-nota">Esses fundamentos entram automaticamente no parágrafo de prioridade dos ofícios, sem substituir os fundamentos do caso. Prioridade legal só é afirmada quando prevista em lei para o destinatário.</div></div>';
}
function v13CenarioAnalise(t, tId) {
  var of = ofModalidade(v13OfDoTerminal(tId, t)), calc = v13CalcDoTerminal(tId, t);
  var h = '<div class="v13-bloco"><h4>Depende de análise individual</h4><ul>' + v13Analise(tId, t).map(function (x) { return '<li>' + v13Esc(x) + '</li>'; }).join('') + '</ul>'
    + '<div class="v13-nota">O sistema aponta <strong>possíveis irregularidades e o que conferir</strong>; não presume abusividade nem substitui a análise do(a) defensor(a). Leia as seções como: <b>fundamentos legais aplicáveis</b> (normas), <b>teses jurídicas possíveis</b> (argumentos a avaliar), <b>análise individual</b> (pontos do caso concreto) e <b>confirmação documental</b> (o que precisa de prova).</div></div>';
  h += '<div class="v13-acoes-cen"><button class="btn-p" onclick="irParaDocumentosPrefill()">📄 Preparar ofício: ' + v13Esc(of.rot) + '</button>'
    + (calc ? '<button class="btn-s" onclick="v13AbrirCalc(\'' + calc + '\')">🧮 Abrir a calculadora nesta modalidade</button>' : '')
    + (/^END_inss_/.test(tId) || t.oi ? '<button class="btn-s" onclick="v13AbrirOficioINSS()">🏛 Ofício ao INSS</button>' : '') + '</div>';
  return h;
}
function irParaDocumentosPrefill() {
  casoDaTriagem();
  var t = (typeof S !== 'undefined' && S.terminalId) ? T[S.terminalId] : null;
  switchTab('docs');
  if (t) { var sel = $id('of-modalidade'); if (sel) { sel.value = v13OfDoTerminal(S.terminalId, t); ofAplicarModalidade(true); } }
  if (S && S.perfil && S.perfil.length) casoSetVuln(S.perfil);
  var acc = $id('of-acc'); if (acc) acc.open = true;
  ofAtualizarEndereco(true);
  var alvo = (!CASO.assistido || !CASO.cpf) ? $id('caso-card') : $id('of-acc');
  setTimeout(function () { if (alvo) alvo.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 250);
  v13Toast(t ? '✓ Ofício preparado com o modelo do cenário. Confira os dados do atendimento, o endereço e os itens.' : 'Aba Documentos aberta.', 4200);
}
function v13AbrirOficioINSS() { casoDaTriagem(); switchTab('docs'); var acc = $id('oi-acc'); if (acc) { acc.open = true; setTimeout(function () { acc.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 250); } }
function v13AbrirCalc(mod) {
  switchTab('calc');
  if (mod === 'consorcio') { var it = document.querySelector('.calc-menu-item[data-calc="consorcio"]'); if (it) switchCalc(it, 'consorcio'); return; }
  var it2 = document.querySelector('.calc-menu-item[data-calc="abusividade"]'); if (it2) switchCalc(it2, 'abusividade');
  var sel = $id('ab-tipo'); if (sel && LIMITES_LEGAIS[mod]) { sel.value = mod; atualizarLimiteLegal(); }
  if (CASO.assistido && $id('ab-assistido') && !$id('ab-assistido').value) $id('ab-assistido').value = CASO.assistido;
}
function v13LinhasCaso() {
  casoDaTriagem();
  var s = '';
  if (CASO.assistido) s += 'Assistido(a): ' + CASO.assistido + '\n';
  if (CASO.dol) s += 'DOL nº: ' + CASO.dol + '\n';
  if (CASO.instituicao) s += 'Instituição: ' + CASO.instituicao + '\n';
  if (CASO.contrato) s += 'Contrato nº: ' + CASO.contrato + '\n';
  return s;
}
function v13LinhasAlertasPerfil() {
  var s = '', al = v13AlertasSel();
  if (al.length) s += '\n--- SINAIS DE URGÊNCIA ---\n' + al.map(function (a) { return '• ' + a.t + ' — ' + a.o; }).join('\n') + '\n';
  var pf = (typeof S !== 'undefined' && S.perfil) ? S.perfil : [];
  if (pf.length) s += '\n--- PRIORIDADES E VULNERABILIDADES ---\n' + pf.map(function (id) { var v = vulnPorId(id); return v ? '• ' + v.rot + ' (' + VULN_CLASSES[v.classe] + ')' : ''; }).join('\n') + '\n';
  return s;
}
function copiarRelatoAtendimento() {
  if (!S.terminalId) return;
  casoDaTriagem();
  var t = T[S.terminalId], now = new Date().toLocaleString('pt-BR');
  var txt = 'RELATO DE ATENDIMENTO — TRIAGEM BANCÁRIA\nDEFENSORIA PÚBLICA DO ESTADO DE SÃO PAULO — ' + unidadeCarregar().cab1.toUpperCase() + '\n' + '═'.repeat(55) + '\n';
  txt += 'Assistido(a): ' + (CASO.assistido || '[PREENCHER NOME COMPLETO]') + '\nCPF: ' + (CASO.cpf || '[PREENCHER]') + '\nDOL nº: ' + (CASO.dol || '[PREENCHER]') + '\n';
  if (CASO.instituicao) txt += 'Instituição financeira: ' + CASO.instituicao + '\n';
  if (CASO.contrato) txt += 'Contrato nº: ' + CASO.contrato + '\n';
  txt += 'Data do atendimento: ' + now + '\n\n1. RELATO RESUMIDO (respostas da triagem)\n';
  S.answers.forEach(function (a) { txt += '   • ' + a.qText + '\n     → ' + a.aText + '\n'; });
  txt += v13LinhasAlertasPerfil();
  txt += '\n2. CLASSIFICAÇÃO PRELIMINAR\n   ' + t.titulo + ' — Risco ' + t.severity.toUpperCase() + (t.urgente ? ' (URGENTE — possível prazo em curso)' : '') + '\n   Síntese: ' + t.descricao + '\n';
  if (S.hasNoDocs) txt += '\n   [!] Assistido(a) sem documentação: necessária a solicitação de documentos por ofício.\n';
  txt += '\n3. PROVIDÊNCIAS SUGERIDAS PELO ROTEIRO\n'; t.fluxo.forEach(function (f) { txt += '   ' + f.n + '. ' + f.t + ' — ' + f.d + '\n'; });
  if (t.provas && t.provas.length) { txt += '\n4. CONFIRMAÇÃO DOCUMENTAL (documentos a reunir)\n'; t.provas.forEach(function (p) { txt += '   ☐ ' + p + '\n'; }); }
  txt += '\n5. DEPENDE DE ANÁLISE INDIVIDUAL\n'; v13Analise(S.terminalId, t).forEach(function (a) { txt += '   • ' + a + '\n'; });
  txt += '\n6. OBSERVAÇÕES\n   [PREENCHER: detalhes do relato, datas, valores, contatos do assistido]\n\nEncaminha-se ao(à) defensor(a) para análise e deliberação.\nAtendente: [PREENCHER NOME]\n' + '═'.repeat(55) + '\nTexto-base gerado pelo Guia de Triagem Jurídica Bancária ' + V13_VERSAO + ' — revisar antes de registrar.';
  copiarTextoFeedback(txt, 'relatoBtn');
  v13Toast('✓ Relato copiado — complete os campos [PREENCHER] e entregue ao(à) defensor(a)');
}

/* ════════ 10. CALCULADORA: tetos históricos, extras e consórcio ══════ */
(function () {
  var L = LIMITES_LEGAIS;
  L.consig_inss.limite = 1.85; L.consig_inss.tetoHist = 'emp'; L.consig_inss.rotuloTeto = 'Teto INSS na data da contratação';
  L.rmc.limite = 2.46; L.rmc.tetoHist = 'cartao'; L.rmc.nome = 'Cartão de Crédito Consignado — RMC'; L.rmc.rotuloTeto = 'Teto do cartão consignado na data da contratação';
  L.rcc.limite = 2.46; L.rcc.tetoHist = 'cartao'; L.rcc.nome = 'Cartão Consignado de Benefício — RCC'; L.rcc.rotuloTeto = 'Teto do cartão consignado na data da contratação';
  L.consig_pub.temCap = false; L.consig_pub.limite = null; L.consig_pub.rotuloTeto = null;
  L.cheque_esp.rotuloTeto = 'Teto do cheque especial (Res. CMN 4.765/2019)'; L.cheque_esp.tetoDesde = '2020-01-06';
  L.pessoal_garantia = { nome: 'Crédito Pessoal com Garantia Real', sgs: '29973', unidade: 'aa', temCap: false, limite: null, categoria: 'pessoal' };
  L.pessoal_sem_garantia = { nome: 'Crédito Pessoal sem Garantia Real', sgs: '29974', unidade: 'aa', temCap: false, limite: null, categoria: 'pessoal' };
  L.cartao_total = { nome: 'Cartão de Crédito — Total', sgs: '22024', unidade: 'aa', temCap: false, limite: null, categoria: 'cartao' };
  L.microcredito = { nome: 'Microcrédito para Consumo', sgs: '20779', unidade: 'aa', temCap: false, limite: null, categoria: 'pessoal' };
  window.TETO_CONFIRMADO_DESDE = '2008-06';
})();
function v13DiaContrato() { var d = parseInt(v13Val('ab-data-dia'), 10); return d > 0 ? d : null; }
function v13InfoTetoData(tipo, mesAno) {
  var info = LIMITES_LEGAIS[tipo], dia = v13DiaContrato(), out = { temCap: info.temCap, limite: info.limite, rotulo: info.rotuloTeto, nota: '' };
  if (!mesAno) return out;
  if (info.tetoHist) {
    var f = tetosInssNoPeriodo(mesAno, dia), mm = mesAno.split('-')[1] + '/' + mesAno.split('-')[0];
    if (!f.length) { out.nota = 'Sem teto registrado no sistema para ' + mm + ' (antes de 19/05/2008): use o campo de teto manual com a norma da época.'; return out; }
    var vals = f.map(function (x) { return x[info.tetoHist]; }), max = Math.max.apply(null, vals);
    out.limite = max; out.temCap = true;
    if (f.length === 1) out.rotulo = 'Teto em ' + (dia ? String(dia).padStart(2, '0') + '/' : '') + mm + ' (' + f[0].norma + ')';
    else { out.rotulo = 'Teto em ' + mm + ' (mudou no mês; usado o maior)'; out.nota = 'O teto mudou em ' + mm + ': ' + f.map(function (x) { return x[info.tetoHist].toFixed(2).replace('.', ',') + '% a partir de ' + dataBR(x.ini) + ' (' + x.norma + ')'; }).join('; ') + '. Informe o dia da assinatura para usar o teto exato.'; }
    if (f.some(function (x) { return !x.oficial; })) out.nota += (out.nota ? ' ' : '') + 'Tetos de 2021 em diante conferidos em tabela pública de vigências (conferir no DOU em caso de dúvida).';
    return out;
  }
  if (info.tetoDesde) {
    var ref = mesAno + '-' + String(dia || 28).padStart(2, '0');
    if (ref < info.tetoDesde) { out.temCap = false; out.nota = 'Contrato anterior a ' + dataBR(info.tetoDesde) + ': ainda não havia o teto de 8% a.m. do cheque especial. A análise usa apenas a média do BACEN.'; }
  }
  return out;
}
var _v13CalcOrig = calcAbusividade;
calcAbusividade = function () {
  var tipo = v13Val('ab-tipo'), mesAno = v13Val('ab-data-contrato'), base = LIMITES_LEGAIS[tipo];
  var td = v13InfoTetoData(tipo, mesAno);
  LIMITES_LEGAIS[tipo] = Object.assign({}, base, { temCap: td.temCap, limite: td.limite, rotuloTeto: td.rotulo });
  try { _v13CalcOrig(); } finally { LIMITES_LEGAIS[tipo] = base; }
  try { v13ExtrasCalculo(tipo, td); } catch (e) { console.warn('v13 extras', e); }
};
function v13ExtrasCalculo(tipo, td) {
  var c = ultimoCalculo; if (!c) return;
  var calcEl = $id('ab-calculo'), extra = '', mot = [];
  if (td.nota) mot.push('<em>' + v13Esc(td.nota) + '</em>');
  var pagas = parseInt(v13Val('ab-pagas'), 10) || 0, enc = parseMoeda(v13Val('ab-encargos'));
  if (c.grupo === 'price' && c.valor > 0 && c.prazo > 0) {
    var i = c.contratada / 100, parc = c.calcContr ? c.calcContr.parcela : 0;
    if (pagas > 0 && pagas < c.prazo && parc > 0) {
      var rest = c.prazo - pagas, saldo = parc * (1 - Math.pow(1 + i, -rest)) / i, semDesc = parc * rest;
      extra += '<div class="calc-block-title" style="margin-top:8px;">💵 Quitação antecipada (estimativa)</div><div class="calc-block-grid">'
        + '<div><span>Parcelas restantes</span><strong>' + rest + '</strong></div><div><span>Saldo estimado (CET do contrato)</span><strong>' + brl(saldo) + '</strong></div>'
        + '<div><span>Juros que deixam de ser pagos</span><strong class="val-ok">' + brl(semDesc - saldo) + '</strong></div></div>'
        + '<div style="font-size:10.5px;color:var(--mi);margin-top:4px;">CDC, art. 52, § 2º: na liquidação antecipada, os juros e demais acréscimos são reduzidos proporcionalmente. Peça à instituição o valor oficial para quitação.</div>';
    }
    if (enc > 0 && enc < c.valor) {
      var fator = parc / c.valor, custo = enc * fator * c.prazo;
      extra += '<div class="calc-block-title" style="margin-top:8px;">🧾 Tarifas, seguros e serviços financiados</div><div class="calc-block-grid">'
        + '<div><span>Valor financiado de encargos</span><strong>' + brl(enc) + '</strong></div><div><span>Peso no valor financiado</span><strong>' + (enc / c.valor * 100).toFixed(1).replace('.', ',') + '%</strong></div>'
        + '<div><span>Custo desses encargos com juros</span><strong class="val-danger">' + brl(custo) + '</strong></div></div>'
        + '<div style="font-size:10.5px;color:var(--mi);margin-top:4px;">Conferir prova da prestação dos serviços (STJ, Tema 958) e liberdade de escolha do seguro (Tema 972).</div>';
      mot.push('Há <strong>' + brl(enc) + '</strong> em tarifas, seguros ou serviços financiados (' + (enc / c.valor * 100).toFixed(1).replace('.', ',') + '% do valor), que custam cerca de ' + brl(custo) + ' com os juros do contrato. Verificar a regularidade de cada item (STJ, Temas 958 e 972).');
    }
  }
  if ((tipo === 'cartao_rotativo' || tipo === 'cartao_parcelado' || tipo === 'cartao_total') && c.mesAno) {
    var p = c.mesAno.split('/'), ym = p[1] + '-' + p[0];
    if (ym >= '2024-01') mot.push('Para dívidas do rotativo e do parcelamento da fatura constituídas a partir de <strong>03/01/2024</strong>, os juros e encargos somados não podem ultrapassar o valor original da dívida (Lei 14.690/2023 e Resolução CMN 5.112/2023)' + (c.calcContr && c.valor > 0 && c.calcContr.jurosAcumulados > c.valor ? '. <strong>Na projeção, os juros acumulados (' + brl(c.calcContr.jurosAcumulados) + ') superam o valor original (' + brl(c.valor) + ').</strong>' : '.'));
  }
  if (tipo === 'rmc' || tipo === 'rcc') mot.push('Novas operações de cartão consignado em benefício do INSS estão suspensas por medida cautelar do TCU (comunicado do INSS de setembro de 2026). Contratos anteriores seguem válidos e sujeitos ao teto da época.');
  if (extra && calcEl) { calcEl.innerHTML += extra; calcEl.style.display = 'block'; }
  if (mot.length) {
    c.motivos = c.motivos.concat(mot);
    var det = $id('ab-verdict-detail'); if (det) det.innerHTML = c.motivos.join('<br><br>');
  }
}
var _v13LimparOrig = limparAbusividade;
limparAbusividade = function () { ['ab-pagas', 'ab-encargos', 'ab-data-dia'].forEach(function (id) { if ($id(id)) $id(id).value = ''; }); _v13LimparOrig(); };
function v13DiaOptions() { var s = $id('ab-data-dia'); if (!s || s.options.length > 1) return; for (var d = 1; d <= 31; d++) { var o = document.createElement('option'); o.value = String(d); o.textContent = String(d); s.appendChild(o); } }

/* Consórcio — composição das parcelas e estimativa de restituição (Lei 11.795/2008) */
function calcConsorcio() {
  var cred = parseMoeda(v13Val('cs-credito')), prazo = parseInt(v13Val('cs-prazo'), 10) || 0, adm = parseMoeda(v13Val('cs-adm')), fr = parseMoeda(v13Val('cs-fr'));
  var seg = parseMoeda(v13Val('cs-seg')), pagas = parseInt(v13Val('cs-pagas'), 10) || 0, atual = parseMoeda(v13Val('cs-bem-atual')), multa = parseMoeda(v13Val('cs-multa'));
  var out = $id('cs-res'); if (!out) return;
  if (!(cred > 0 && prazo > 0)) { out.innerHTML = '<div class="v13-info err">Informe o valor do crédito (carta) e o prazo do grupo em meses.</div>'; return; }
  if (pagas > prazo) { out.innerHTML = '<div class="v13-info err">As parcelas pagas não podem passar do prazo do grupo.</div>'; return; }
  var fc = cred / prazo, ta = cred * adm / 100 / prazo, frm = cred * fr / 100 / prazo, parcela = fc + ta + frm + seg;
  var custoTotal = cred * (adm + fr) / 100 + seg * prazo, pctAmort = pagas / prazo * 100, refBem = atual > 0 ? atual : cred;
  var restBruta = refBem * pctAmort / 100, desc = multa > 0 ? restBruta * multa / 100 : 0, rest = restBruta - desc;
  var pagoTotal = parcela * pagas, admPaga = (ta) * pagas;
  var cel = function (l, v, cls) { return '<div><span>' + l + '</span><strong' + (cls ? ' class="' + cls + '"' : '') + '>' + v + '</strong></div>'; };
  out.innerHTML = '<div class="calc-block-title" style="margin-top:12px;">Composição da parcela</div><div class="v13-cons-res">'
    + cel('Fundo comum', brl(fc)) + cel('Taxa de administração', brl(ta)) + cel('Fundo de reserva', brl(frm)) + cel('Seguro', brl(seg)) + cel('Parcela estimada', brl(parcela)) + '</div>'
    + '<div class="calc-block-title" style="margin-top:12px;">Custo e situação da cota</div><div class="v13-cons-res">'
    + cel('Custo das taxas no plano', brl(custoTotal) + ' (' + (custoTotal / cred * 100).toFixed(1).replace('.', ',') + '% do crédito)')
    + cel('Total pago até agora', brl(pagoTotal)) + cel('Percentual amortizado', pctAmort.toFixed(2).replace('.', ',') + '%') + cel('Taxa de administração já paga', brl(admPaga)) + '</div>'
    + (pagas > 0 ? '<div class="calc-block-title" style="margin-top:12px;">Restituição estimada ao excluído (art. 30)</div><div class="v13-cons-res">'
      + cel('Percentual amortizado × valor do bem', brl(restBruta)) + (desc ? cel('Cláusula penal informada (' + multa.toFixed(2).replace('.', ',') + '%)', '− ' + brl(desc), 'val-danger') : '') + cel('Estimativa a restituir', brl(rest), 'val-ok') + '</div>' : '')
    + '<div class="v13-info warn" style="margin-top:10px;">Estimativa para triagem. Pela Lei 11.795/2008 (art. 30), o excluído recebe o valor pago ao fundo comum calculado pelo percentual amortizado do valor do bem na data da assembleia de contemplação, com os rendimentos da aplicação; a taxa de administração, em regra, não é devolvida, e o saldo do fundo de reserva pode ser rateado no encerramento. A cláusula penal depende de previsão no contrato e a jurisprudência costuma exigir prova de prejuízo ao grupo (CDC, art. 53, § 2º). Confira os percentuais no contrato e no extrato da cota.</div>';
}
function limparConsorcio() { ['cs-credito', 'cs-prazo', 'cs-adm', 'cs-fr', 'cs-seg', 'cs-pagas', 'cs-bem-atual', 'cs-multa'].forEach(function (id) { if ($id(id)) $id(id).value = ''; }); if ($id('cs-res')) $id('cs-res').innerHTML = ''; }

/* ════════ 11. AJUDA: tabela de tetos ════════════════════════════════ */
function v13RenderTetos() {
  var box = $id('ajuda-tetos'); if (!box) return;
  var linhas = TETOS_INSS.map(function (t, i) {
    var fim = i + 1 < TETOS_INSS.length ? (function () { var d = new Date(TETOS_INSS[i + 1].ini + 'T12:00:00'); d.setDate(d.getDate() - 1); return d.toISOString().slice(0, 10); })() : null;
    return '<tr><td>' + dataBR(t.ini) + (fim ? ' a ' + dataBR(fim) : ' em diante') + '</td><td>' + t.emp.toFixed(2).replace('.', ',') + '%</td><td>' + t.cartao.toFixed(2).replace('.', ',') + '%</td><td>' + v13Esc(t.norma) + (t.oficial ? ' ✓' : '') + '</td></tr>';
  }).join('');
  box.innerHTML = '<div class="v13-tabela-wrap"><table class="v13-tabela"><thead><tr><th>Vigência</th><th>Empréstimo</th><th>Cartão (RMC/RCC)</th><th>Norma</th></tr></thead><tbody>' + linhas + '</tbody></table></div>'
    + '<p style="font-size:11px;color:var(--mi);margin-top:6px;">✓ = conferido no texto consolidado da IN INSS/PRES 28/2008 (gov.br). Demais linhas conforme tabela pública de vigências, consultada em ' + TETOS_INSS_CONFERIDO_EM + '; em caso de dúvida, conferir a Resolução no Diário Oficial. De 12/2021 a 03/2023 vigoraram 2,14% e 3,06%. A calculadora aplica automaticamente o teto do mês (e do dia, se informado).</p>';
}

/* ════════ 12. INICIALIZAÇÃO ═════════════════════════════════════════ */
var _v13ComboSelOrig = comboSelecionar;
comboSelecionar = function (inputId, el) {
  if (inputId === 'caso-vuln-busca') { var inp = $id(inputId); vulnAdicionar(el.getAttribute('data-val')); inp.value = ''; vulnFiltrar(); inp.focus(); return; }
  _v13ComboSelOrig(inputId, el);
  var k = casoCampoDe(inputId); if (k) casoSet(k, $id(inputId).value, inputId);
  if (inputId === 'caso-instituicao' || inputId === 'cen-banco') ofAtualizarEndereco(true);
};
function v13Init() {
  try {
    instCarregar(); casoBind(); vulnRender(); vulnPrevia(); prazoChange(); ofModalidadeInit(); oiItensInit(); emInit(); unidadeFormInit(); v13DiaOptions(); v13RenderTetos();
    var hoje = new Date(), iso = hoje.getFullYear() + '-' + String(hoje.getMonth() + 1).padStart(2, '0') + '-' + String(hoje.getDate()).padStart(2, '0');
    ['caso-data', 'of-data', 'oi-data'].forEach(function (id) { if ($id(id) && !$id(id).value) $id(id).value = iso; });
    CASO.data = iso; ofAtualizarEndereco(true); casoResumo();
    ['of-tema', 'of-relato'].forEach(function (id) { var e = $id(id); if (e) e.addEventListener('input', function () { e.dataset.edit = '1'; }); });
    var vo = $id('caso-vuln-outra'); if (vo) vo.addEventListener('input', vulnToggle);
  } catch (e) { console.error('v13Init', e); }
}
window.addEventListener('load', v13Init);
