/* ═══════════════════════════════════════════════════════════════════════
   v13 — GERAÇÃO DE DOCUMENTOS (.docx) A PARTIR DO MODELO INSTITUCIONAL
   O cabeçalho (logotipo oficial), os estilos e as margens vêm do modelo-base
   embutido (B64_BASE_V13). O corpo é montado aqui, parágrafo a parágrafo, e a
   tipografia é ajustada automaticamente para o documento caber em UMA página.
   ═══════════════════════════════════════════════════════════════════════ */

/* Dados da unidade (cabeçalho, rodapé e e-mail de resposta). Editáveis na aba
   Documentos > Configurações da unidade; ficam salvos neste navegador. */
var UNIDADE_PADRAO = {
  cab1: 'Unidade de Ribeirão Preto',
  cab2: 'Atendimento Especializado',
  cidade: 'Ribeirão Preto',
  sigla: 'Triagem',
  endereco: 'Rua Alice Além Saadi, 1256 - Nova Ribeirânia - Ribeirão Preto/SP - CEP 14096-570',
  telefone: '',
  email: 'triagem.ribpreto@defensoria.sp.def.br',
  site: 'www.defensoria.sp.def.br'
};
var UNIDADE_KEY = 'dpesp-unidade-v13';
function unidadeCarregar() {
  var u = {};
  Object.keys(UNIDADE_PADRAO).forEach(function (k) { u[k] = UNIDADE_PADRAO[k]; });
  try {
    var s = JSON.parse(localStorage.getItem(UNIDADE_KEY) || '{}');
    Object.keys(s).forEach(function (k) { if (k in u && typeof s[k] === 'string') u[k] = s[k]; });
  } catch (e) {}
  return u;
}
function unidadeRodape(u) {
  var l1 = 'Defensoria Pública do Estado de São Paulo | ' + u.endereco;
  var p2 = [];
  if (u.telefone) p2.push(u.telefone);
  if (u.email) p2.push(u.email);
  if (u.site) p2.push(u.site);
  return [l1, p2.join(' | ')];
}

/* ── Níveis de ajuste tipográfico ─────────────────────────────────────────
   Nível 0 = tipografia do modelo institucional (Helvetica/Arial 10,5).
   Se o texto não couber em uma página, o sistema passa para Cambria e, depois,
   Times New Roman, reduzindo corpo e espaçamentos de forma gradual. */
var DX_NIVEIS = [
  { id: 0, fonte: 'Helvetica', medir: 'Arial',           pt: 10.5, entre: 1.15, depois: 240, rotulo: 'Arial 10,5 (padrão do modelo)' },
  { id: 1, fonte: 'Cambria',   medir: 'Cambria',         pt: 10.5, entre: 1.12, depois: 200, rotulo: 'Cambria 10,5' },
  { id: 2, fonte: 'Times New Roman', medir: 'Times New Roman', pt: 10.5, entre: 1.10, depois: 180, rotulo: 'Times New Roman 10,5' },
  { id: 3, fonte: 'Times New Roman', medir: 'Times New Roman', pt: 10,   entre: 1.06, depois: 140, rotulo: 'Times New Roman 10' },
  { id: 4, fonte: 'Times New Roman', medir: 'Times New Roman', pt: 9.5,  entre: 1.03, depois: 110, rotulo: 'Times New Roman 9,5' },
  { id: 5, fonte: 'Times New Roman', medir: 'Times New Roman', pt: 9,    entre: 1.0,  depois: 80,  rotulo: 'Times New Roman 9' }
];
/* Geometria da página do modelo (em pontos): A4, margens do sectPr e área útil.
   A altura útil desconta o cabeçalho com o logotipo (que é mais alto que a margem). */
var DX_PAGINA = { larguraUtil: 464.9, alturaUtil: 716 };
/* Altura de linha "simples" de cada fonte, em múltiplos do corpo (métricas das fontes). */
var DX_ALTURA_FONTE = { 'Arial': 1.15, 'Cambria': 1.172, 'Times New Roman': 1.15 };
/* Largura média de caractere (em múltiplos do corpo) — usada só se o navegador
   não conseguir medir o texto com a fonte real. */
var DX_LARGURA_MEDIA = { 'Arial': 0.515, 'Cambria': 0.495, 'Times New Roman': 0.455 };

var _dxCanvas = null;
function _dxCtx() {
  if (_dxCanvas === null) {
    try { _dxCanvas = document.createElement('canvas').getContext('2d'); } catch (e) { _dxCanvas = false; }
  }
  return _dxCanvas || null;
}
/* Largura (pt) de um trecho de texto na fonte/corpo indicados. */
function dxLarguraTexto(txt, fonte, pt, negrito) {
  var ctx = _dxCtx();
  if (ctx) {
    try {
      ctx.font = (negrito ? 'bold ' : '') + '100px "' + fonte + '"';
      if ('fontKerning' in ctx) ctx.fontKerning = 'none';
      return ctx.measureText(txt).width * pt / 100;
    } catch (e) {}
  }
  return txt.length * (DX_LARGURA_MEDIA[fonte] || 0.5) * pt * (negrito ? 1.06 : 1);
}
/* Número de linhas que um parágrafo ocupa (quebra por palavras, como o Word). */
function dxContarLinhas(runs, fonte, pt, largura, recuoPrimeira) {
  var palavras = [];
  runs.forEach(function (r) {
    String(r.t || '').split(/(\s+)/).forEach(function (p) {
      if (p === '') return;
      palavras.push({ t: p, b: !!r.b, esp: /^\s+$/.test(p) });
    });
  });
  var linhas = 1, x = recuoPrimeira || 0, disp = largura;
  for (var i = 0; i < palavras.length; i++) {
    var p = palavras[i];
    var w = dxLarguraTexto(p.esp ? ' ' : p.t, fonte, pt, p.b);
    if (p.esp) { x += w; continue; }
    if (x + w > disp + 0.01 && x > 0) { linhas++; x = w; } else { x += w; }
  }
  return linhas;
}

function dxEsc(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function dxRunXml(r, nv) {
  var f = nv.fonte, sz = Math.round(nv.pt * 2);
  return '<w:r><w:rPr><w:rFonts w:ascii="' + f + '" w:hAnsi="' + f + '" w:cs="' + f + '"/>'
    + (r.b ? '<w:b/>' : '<w:b w:val="0"/>') + (r.i ? '<w:i/>' : '')
    + '<w:color w:val="0D0D0D"/><w:sz w:val="' + sz + '"/><w:szCs w:val="' + sz + '"/></w:rPr>'
    + (r.br ? '<w:br/>' : '')
    + '<w:t xml:space="preserve">' + dxEsc(r.t) + '</w:t></w:r>';
}
/* Parágrafo lógico -> XML. p = { estilo, runs, antes, depois, jc, recuo, linha } (twips). */
function dxParXml(p, nv) {
  var linha = Math.round(240 * (p.linha || nv.entre));
  var pPr = '<w:pPr><w:pStyle w:val="' + (p.estilo || 'OficioCorpo') + '"/>'
    + '<w:spacing w:before="' + (p.antes || 0) + '" w:after="' + (p.depois == null ? nv.depois : p.depois) + '" w:line="' + linha + '" w:lineRule="auto"/>'
    + (p.recuo ? '<w:ind w:firstLine="' + p.recuo + '"/>' : '')
    + '<w:jc w:val="' + (p.jc || 'left') + '"/></w:pPr>';
  return '<w:p>' + pPr + (p.runs || []).map(function (r) { return dxRunXml(r, nv); }).join('') + '</w:p>';
}
/* Tabela sem bordas com duas assinaturas lado a lado (signatário e estagiário). */
function dxAssinaturasXml(blocos, nv) {
  var w = Math.floor(9298 / blocos.length);
  var cel = blocos.map(function (b) {
    return '<w:tc><w:tcPr><w:tcW w:w="' + w + '" w:type="dxa"/></w:tcPr>'
      + b.map(function (l, i) { return dxParXml({ estilo: 'OficioAssinatura', runs: [{ t: l, b: i === 0 }], depois: 0, linha: 1.1 }, nv); }).join('')
      + '</w:tc>';
  }).join('');
  return '<w:tbl><w:tblPr><w:tblW w:w="9298" w:type="dxa"/><w:tblLayout w:type="fixed"/>'
    + '<w:tblCellMar><w:left w:w="0" w:type="dxa"/><w:right w:w="0" w:type="dxa"/></w:tblCellMar></w:tblPr>'
    + '<w:tblGrid>' + blocos.map(function () { return '<w:gridCol w:w="' + w + '"/>'; }).join('') + '</w:tblGrid>'
    + '<w:tr>' + cel + '</w:tr></w:tbl>';
}

/* Altura estimada (pt) de uma lista de parágrafos lógicos em um nível. */
function dxAltura(pars, nv) {
  var alt = 0, altFonte = (DX_ALTURA_FONTE[nv.medir] || 1.15) * nv.pt;
  pars.forEach(function (p) {
    if (p.assinaturas) {
      var maior = 0;
      p.assinaturas.forEach(function (b) { maior = Math.max(maior, b.length); });
      alt += maior * altFonte * 1.1;
      return;
    }
    var larg = DX_PAGINA.larguraUtil - (p.margem || 0);
    var n = dxContarLinhas(p.runs || [], nv.medir, nv.pt, larg, (p.recuo || 0) / 20);
    alt += n * altFonte * (p.linha || nv.entre) + ((p.antes || 0) + (p.depois == null ? nv.depois : p.depois)) / 20;
  });
  return alt;
}
/* Ajusta os espaçamentos estruturais (cabeçalho do ofício, fecho) a cada nível. */
function dxAplicarNivel(pars, nv) {
  var k = [1, 0.85, 0.75, 0.6, 0.5, 0.4][nv.id];
  return pars.map(function (p) {
    var q = {}; Object.keys(p).forEach(function (c) { q[c] = p[c]; });
    if (q.antesBase != null) q.antes = Math.round(q.antesBase * k);
    if (q.depoisBase != null) q.depois = Math.round(q.depoisBase * k);
    return q;
  });
}
/* Escolhe o primeiro nível em que o conteúdo cabe em uma página.
   Retorna { nivel, pars, altura, cabe }. forcar = id do nível (opcional). */
function dxAjustar(pars, forcar) {
  var folga = 0.965, ultimo = null;
  for (var i = 0; i < DX_NIVEIS.length; i++) {
    if (forcar != null && i !== forcar) continue;
    var nv = DX_NIVEIS[i], pp = dxAplicarNivel(pars, nv), h = dxAltura(pp, nv);
    ultimo = { nivel: nv, pars: pp, altura: h, cabe: h <= DX_PAGINA.alturaUtil * folga };
    if (ultimo.cabe || forcar != null) return ultimo;
  }
  return ultimo;
}
function dxCorpoXml(aj) {
  return aj.pars.map(function (p) {
    return p.assinaturas ? dxAssinaturasXml(p.assinaturas, aj.nivel) : dxParXml(p, aj.nivel);
  }).join('');
}

/* ── Utilidades de texto ─────────────────────────────────────────────────── */
var DX_MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
function dxDataExtenso(iso) {
  var dt = null;
  if (iso) { var p = String(iso).split('-'); if (p.length === 3) dt = new Date(parseInt(p[0], 10), parseInt(p[1], 10) - 1, parseInt(p[2], 10)); }
  if (!dt || isNaN(dt.getTime())) dt = new Date();
  return { texto: (dt.getDate() === 1 ? '1º' : dt.getDate()) + ' de ' + DX_MESES[dt.getMonth()] + ' de ' + dt.getFullYear(), ano: String(dt.getFullYear()) };
}
var DX_NUM_EXT = { 1: 'um', 2: 'dois', 3: 'três', 4: 'quatro', 5: 'cinco', 6: 'seis', 7: 'sete', 8: 'oito', 9: 'nove', 10: 'dez', 11: 'onze', 12: 'doze', 13: 'treze', 14: 'quatorze', 15: 'quinze', 16: 'dezesseis', 17: 'dezessete', 18: 'dezoito', 19: 'dezenove', 20: 'vinte', 30: 'trinta', 40: 'quarenta', 50: 'cinquenta', 60: 'sessenta', 70: 'setenta', 80: 'oitenta', 90: 'noventa' };
function dxNumExtenso(n) {
  n = parseInt(n, 10);
  if (DX_NUM_EXT[n]) return DX_NUM_EXT[n];
  if (n > 20 && n < 100) return DX_NUM_EXT[Math.floor(n / 10) * 10] + ' e ' + DX_NUM_EXT[n % 10];
  return String(n);
}
/* Prazo: { dias, tipo: 'uteis'|'corridos' } -> "10 (dez) dias úteis" */
function dxPrazoTexto(pz) {
  var d = parseInt(pz && pz.dias, 10);
  if (!(d > 0)) return '';
  var un = (pz.tipo === 'corridos') ? (d === 1 ? 'dia corrido' : 'dias corridos') : (d === 1 ? 'dia útil' : 'dias úteis');
  return d + ' (' + dxNumExtenso(d) + ') ' + un;
}
function dxItens(lista) {
  var letras = 'abcdefghijklmnopqrstuvwxyz';
  return lista.filter(function (x) { return x && String(x).trim(); }).map(function (x, i) {
    var t = String(x).trim().replace(/[.;]+$/, '');
    return { letra: letras.charAt(i) + ')', texto: t };
  });
}
function dxEnderecoLinhas(end) {
  var s = String(end || '').trim();
  if (!s) return [];
  var partes = s.split(/\s+—\s+|\s+–\s+/).map(function (x) { return x.trim(); }).filter(Boolean);
  if (partes.length <= 1) return [s];
  if (partes.length === 2) return partes;
  return [partes[0], partes.slice(1).join(' - ')];
}

/* ── OFÍCIO À INSTITUIÇÃO FINANCEIRA ─────────────────────────────────────
   d = { numero, dataIso, instituicao, endereco, assistido, cpf, dol, contrato,
         tema, relato, itens[], prazo{dias,tipo}, justificativa, vulnerabilidade,
         autorizacao(bool), signatario, cargo, estagiario, estagiarioCargo, unidade } */
function dxOficioBanco(d) {
  var u = d.unidade || unidadeCarregar(), dt = dxDataExtenso(d.dataIso), P = [];
  var J = 'both', R = 567;
  P.push({ estilo: 'OficioNumero', runs: [{ t: 'Ofício nº ' + (d.numero || '_____') + '/' + dt.ano + (u.sigla ? ' - ' + u.sigla : '') }], antesBase: 200, depoisBase: 160 });
  P.push({ estilo: 'OficioData', runs: [{ t: u.cidade + ', ' + dt.texto + '.' }], jc: 'right', depoisBase: 320 });
  P.push({ estilo: 'OficioDestinatario', runs: [{ t: 'A Sua Senhoria o(a) Senhor(a)' }], depois: 0, linha: 1.1 });
  P.push({ estilo: 'OficioDestinatario', runs: [{ t: 'Representante Legal de ' + (d.instituicao || '[INSTITUIÇÃO]'), b: true }], depois: 0, linha: 1.1 });
  dxEnderecoLinhas(d.endereco).forEach(function (l) { P.push({ estilo: 'OficioDestinatario', runs: [{ t: l }], depois: 0, linha: 1.1 }); });
  var assunto = 'Solicitação de informações e documentos. ' + (d.tema ? d.tema.replace(/\.+$/, '') + '. ' : '') + (d.assistido || '[NOME]') + ', CPF nº ' + (d.cpf || '[CPF]') + '.';
  P.push({ estilo: 'OficioAssunto', runs: [{ t: 'Assunto: ', b: true }, { t: assunto }], antesBase: 260, depois: 0, jc: J });
  var ref = [];
  if (d.dol) ref.push('Atendimento DOL nº ' + d.dol);
  if (d.contrato) ref.push('Contrato nº ' + d.contrato);
  if (ref.length) P.push({ estilo: 'OficioAssunto', runs: [{ t: 'Referência: ', b: true }, { t: ref.join(' · ') + '.' }], antesBase: 60, depois: 0 });
  P.push({ estilo: 'OficioCorpo', runs: [{ t: 'Senhor(a) Representante,' }], antesBase: 300 });

  var p1 = 'A Defensoria Pública do Estado de São Paulo, no exercício das funções institucionais previstas no art. 134 da Constituição Federal e no art. 4º, incisos II e VIII, da Lei Complementar nº 80/1994, atua em favor de ';
  var p1b = ', CPF nº ' + (d.cpf || '[CPF]') + ' (art. 128, XI, da Lei Complementar nº 80/1994 e art. 162, VI, da Lei Complementar Estadual nº 988/2006)'
    + (d.autorizacao ? ', que firmou a autorização expressa anexa (art. 1º, § 3º, V, da Lei Complementar nº 105/2001)' : '')
    + ', e solicita a Vossa Senhoria as informações e os documentos abaixo, com fundamento no direito à informação e de acesso aos próprios dados e contratos (arts. 6º, III, 43, 54-D, III, e 54-G, II, do Código de Defesa do Consumidor e art. 18 da Lei nº 13.709/2018).';
  P.push({ runs: [{ t: p1 }, { t: d.assistido || '[NOME]', b: true }, { t: p1b }], jc: J, recuo: R });
  if (d.relato && d.relato.trim()) P.push({ runs: [{ t: d.relato.trim() }], jc: J, recuo: R });
  if (d.vulnerabilidade && d.vulnerabilidade.trim()) P.push({ runs: [{ t: d.vulnerabilidade.trim() }], jc: J, recuo: R });

  var pz = dxPrazoTexto(d.prazo);
  var itens = dxItens(d.itens || []);
  var runs = [{ t: 'Solicita-se o envio' + (pz ? ', no prazo de ' : '') }];
  if (pz) runs.push({ t: pz, b: true });
  runs.push({ t: (pz ? ' contados do recebimento deste ofício' : '') + ', do seguinte' + (d.contrato ? ', em especial quanto ao contrato nº ' + d.contrato : '') + ': ' });
  itens.forEach(function (it, i) {
    runs.push({ t: it.letra + ' ', b: true });
    runs.push({ t: it.texto + (i < itens.length - 1 ? '; ' : '.') });
  });
  if (!itens.length) runs.push({ t: '[descrever os documentos solicitados].' });
  P.push({ runs: runs, jc: J, recuo: R });
  if (d.justificativa && d.justificativa.trim()) {
    var j = d.justificativa.trim().replace(/\.+$/, '');
    P.push({ runs: [{ t: 'O prazo indicado considera as circunstâncias do caso: ' + j.charAt(0).toLowerCase() + j.slice(1) + '.' }], jc: J, recuo: R });
  }
  P.push({ runs: [{ t: 'A resposta poderá ser enviada ao e-mail institucional desta unidade (' + u.email + ')' + (d.dol ? ', com referência ao DOL nº ' + d.dol : '') + '. Na impossibilidade de atendimento, total ou parcial, solicita-se que a negativa seja formalizada por escrito, com a respectiva fundamentação.' }], jc: J, recuo: R });
  P.push({ estilo: 'OficioFecho', runs: [{ t: 'Atenciosamente,' }], antesBase: 200, depoisBase: 560 });
  var blocos = [[d.signatario || '[NOME DO(A) SIGNATÁRIO(A)]', d.cargo || '[CARGO]', u.cab1]];
  if (d.estagiario) blocos.push([d.estagiario, d.estagiarioCargo || 'Estagiário(a) de Direito', u.cab1]);
  P.push({ assinaturas: blocos });
  return P;
}

/* ── OFÍCIO AO INSS ──────────────────────────────────────────────────────── */
function dxOficioINSS(d) {
  var u = d.unidade || unidadeCarregar(), dt = dxDataExtenso(d.dataIso), P = [];
  var J = 'both', R = 567, pz = dxPrazoTexto(d.prazo);
  P.push({ estilo: 'OficioNumero', runs: [{ t: 'Ofício nº ' + (d.numero || '_____') + '/' + dt.ano + (u.sigla ? ' - ' + u.sigla : '') }], antesBase: 200, depoisBase: 160 });
  P.push({ estilo: 'OficioData', runs: [{ t: u.cidade + ', ' + dt.texto + '.' }], jc: 'right', depoisBase: 320 });
  P.push({ estilo: 'OficioDestinatario', runs: [{ t: 'Ao(À) Senhor(a)' }], depois: 0, linha: 1.1 });
  P.push({ estilo: 'OficioDestinatario', runs: [{ t: 'Gerente Executivo(a) do Instituto Nacional do Seguro Social - INSS', b: true }], depois: 0, linha: 1.1 });
  dxEnderecoLinhas(d.endereco).forEach(function (l) { P.push({ estilo: 'OficioDestinatario', runs: [{ t: l }], depois: 0, linha: 1.1 }); });
  P.push({ estilo: 'OficioAssunto', runs: [{ t: 'Assunto: ', b: true }, { t: 'Solicitação de extratos (HISCON e HISCRE), de cópias de contratos e de bloqueio preventivo de empréstimos consignados. ' + (d.assistido || '[NOME]') + ', CPF nº ' + (d.cpf || '[CPF]') + '.' }], antesBase: 260, depois: 0, jc: J });
  var ref = [];
  if (d.dol) ref.push('Atendimento DOL nº ' + d.dol);
  if (d.beneficio) ref.push('Benefício nº ' + d.beneficio);
  if (d.contrato) ref.push('Contrato nº ' + d.contrato);
  if (ref.length) P.push({ estilo: 'OficioAssunto', runs: [{ t: 'Referência: ', b: true }, { t: ref.join(' · ') + '.' }], antesBase: 60, depois: 0 });
  P.push({ estilo: 'OficioCorpo', runs: [{ t: 'Senhor(a) Gerente Executivo(a),' }], antesBase: 300 });
  P.push({ runs: [{ t: 'A Defensoria Pública do Estado de São Paulo, no exercício de suas atribuições constitucionais e legais de prestação de assistência jurídica integral e gratuita (art. 134 da Constituição Federal e Lei Complementar Estadual nº 988/2006) e com fundamento no art. 128, X, da Lei Complementar nº 80/1994, dirige-se a Vossa Senhoria para solicitar o que segue em favor de ' }, { t: d.assistido || '[NOME]', b: true }, { t: ', CPF nº ' + (d.cpf || '[CPF]') + '.' }], jc: J, recuo: R });
  P.push({ runs: [{ t: (d.relato && d.relato.trim()) || 'O(A) assistido(a) compareceu a esta unidade relatando situação relativa a descontos vinculados ao seu benefício previdenciário, o que torna necessária a verificação dos lançamentos para análise de regularidade e resguardo de sua subsistência.' }], jc: J, recuo: R });
  if (d.vulnerabilidade && d.vulnerabilidade.trim()) P.push({ runs: [{ t: d.vulnerabilidade.trim() }], jc: J, recuo: R });
  var itens = dxItens(d.itens || []);
  var runs = [{ t: 'Assim, solicita-se a Vossa Senhoria' + (pz ? ', no prazo de ' : '') }];
  if (pz) runs.push({ t: pz, b: true });
  runs.push({ t: ': ' });
  itens.forEach(function (it, i) { runs.push({ t: it.letra + ' ', b: true }); runs.push({ t: it.texto + (i < itens.length - 1 ? '; ' : '.') }); });
  P.push({ runs: runs, jc: J, recuo: R });
  if (d.justificativa && d.justificativa.trim()) {
    var j = d.justificativa.trim().replace(/\.+$/, '');
    P.push({ runs: [{ t: 'O prazo indicado considera as circunstâncias do caso: ' + j.charAt(0).toLowerCase() + j.slice(1) + '.' }], jc: J, recuo: R });
  }
  P.push({ runs: [{ t: 'As informações e os documentos poderão ser encaminhados ao endereço eletrônico institucional desta unidade (' + u.email + ')' + (d.dol ? ', com referência ao DOL nº ' + d.dol : '') + ', ou disponibilizados para retirada pelo portador deste expediente. Solicita-se, por fim, a habitual colaboração dessa Autarquia.' }], jc: J, recuo: R });
  P.push({ estilo: 'OficioFecho', runs: [{ t: 'Atenciosamente,' }], antesBase: 200, depoisBase: 560 });
  P.push({ assinaturas: [[d.signatario || '[NOME DO(A) SIGNATÁRIO(A)]', d.cargo || '[CARGO]', u.cab1]] });
  return P;
}

/* ── TERMO DE AUTORIZAÇÃO EXPRESSA ───────────────────────────────────────── */
function dxAutorizacao(d) {
  var u = d.unidade || unidadeCarregar(), dt = dxDataExtenso(d.dataIso), P = [];
  var J = 'both', R = 567, nome = (d.nome || '[NOME COMPLETO]').toUpperCase();
  P.push({ estilo: 'OficioCorpo', runs: [{ t: 'TERMO DE AUTORIZAÇÃO EXPRESSA E AFASTAMENTO DE SIGILO BANCÁRIO', b: true }], jc: 'center', antesBase: 360, depoisBase: 380 });
  var ref = [];
  if (d.dol) ref.push('Atendimento DOL nº ' + d.dol);
  if (d.instituicao) ref.push('Instituição: ' + d.instituicao);
  if (d.contrato) ref.push('Contrato nº ' + d.contrato);
  if (ref.length) P.push({ estilo: 'OficioAssunto', runs: [{ t: 'Referência: ', b: true }, { t: ref.join(' · ') + '.' }], depoisBase: 240 });
  P.push({ runs: [{ t: 'Eu, ' }, { t: nome, b: true }, { t: ', inscrito(a) no CPF sob o nº ' + (d.cpf || '[CPF]') + ', pelo presente instrumento, ' }, { t: 'AUTORIZO EXPRESSAMENTE', b: true }, { t: ' toda e qualquer instituição financeira, de pagamento, cooperativa de crédito ou entidade equiparada pertencente ao Sistema Financeiro Nacional a fornecer à ' }, { t: 'DEFENSORIA PÚBLICA DO ESTADO DE SÃO PAULO - ' + u.cab1.toUpperCase(), b: true }, { t: ' todas as informações, extratos e cópias de documentos referentes a operações de crédito, especialmente empréstimos (pessoais e/ou consignados), financiamentos e cartões, firmados em meu nome.' }], jc: J, recuo: R });
  P.push({ runs: [{ t: 'Declaro que a presente autorização abrange o acesso a contratos, faturas, históricos e quaisquer movimentações financeiras relacionadas ao caso em apuração, implicando a renúncia expressa ao sigilo bancário para esta finalidade específica, nos termos do artigo 1º, § 3º, inciso V, da Lei Complementar nº 105/2001.' }], jc: J, recuo: R });
  P.push({ runs: [{ t: 'Ademais, consinto de forma livre, informada e inequívoca com o tratamento e o compartilhamento dos meus dados pessoais e financeiros, em conformidade com o artigo 7º, incisos I e VI, da Lei nº 13.709/2018 (Lei Geral de Proteção de Dados - LGPD), exclusivamente para fins de instrução de procedimento administrativo e/ou judicial promovido pela Defensoria Pública.' }], jc: J, recuo: R });
  P.push({ runs: [{ t: 'Reconheço que a Defensoria Pública do Estado de São Paulo encontra-se autorizada a representar-me junto a qualquer instituição do sistema financeiro para a prática dos atos necessários à obtenção dessas informações, nos termos da Lei Complementar Federal nº 80/1994 e da Lei Complementar Estadual nº 988/2006.' }], jc: J, recuo: R });
  P.push({ runs: [{ t: 'Por ser a expressão da verdade e por manifestar a minha livre e espontânea vontade, firmo o presente termo para que produza seus regulares efeitos legais.' }], jc: J, recuo: R });
  P.push({ estilo: 'OficioData', runs: [{ t: u.cidade + '/SP, ' + dt.texto + '.' }], jc: 'right', antesBase: 300, depoisBase: 900 });
  P.push({ estilo: 'OficioAssinatura', runs: [{ t: '_____________________________________________' }], jc: 'center', depois: 0 });
  P.push({ estilo: 'OficioAssinatura', runs: [{ t: nome, b: true }], jc: 'center', depois: 0 });
  P.push({ estilo: 'OficioAssinatura', runs: [{ t: 'CPF nº ' + (d.cpf || '[CPF]') }], jc: 'center', depois: 0 });
  return P;
}

/* ── Montagem do arquivo .docx ───────────────────────────────────────────── */
async function dxGerarBlob(pars, opcoes) {
  if (typeof JSZip === 'undefined') throw new Error('A biblioteca de geração de Word (JSZip) não carregou. Verifique a internet e recarregue a página (F5).');
  if (typeof B64_BASE_V13 === 'undefined' || !B64_BASE_V13 || B64_BASE_V13.length < 100) throw new Error('Modelo-base dos documentos não carregado.');
  opcoes = opcoes || {};
  var u = opcoes.unidade || unidadeCarregar();
  var aj = dxAjustar(pars, opcoes.nivel);
  var bin = atob(B64_BASE_V13), bytes = new Uint8Array(bin.length);
  for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  var zip = await JSZip.loadAsync(bytes);
  var doc = await zip.file('word/document.xml').async('string');
  var marca = '<w:p><w:r><w:t>{{CORPO}}</w:t></w:r></w:p>';
  if (doc.indexOf(marca) === -1) throw new Error('Marcador do corpo não encontrado no modelo-base.');
  zip.file('word/document.xml', doc.replace(marca, dxCorpoXml(aj)));
  var cab = await zip.file('word/header1.xml').async('string');
  zip.file('word/header1.xml', cab.replace('{{CAB1}}', dxEsc(u.cab1)).replace('{{CAB2}}', dxEsc(u.cab2)));
  var rod = await zip.file('word/footer1.xml').async('string'), rl = unidadeRodape(u);
  zip.file('word/footer1.xml', rod.replace('{{ROD1}}', dxEsc(rl[0])).replace('{{ROD2}}', dxEsc(rl[1])));
  var blob = await zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
  return { blob: blob, ajuste: aj };
}
function dxBaixar(blob, nome) {
  var url = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = url; a.download = nome;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
}
function dxNomeArquivo(prefixo, num, assistido) {
  var nomeAr = String(assistido || '').trim().split(/\s+/)[0] || 'DPESP';
  nomeAr = nomeAr.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]/g, '') || 'DPESP';
  return prefixo + (num ? '_' + String(num).replace(/[^0-9A-Za-z-]/g, '') : '') + '_' + nomeAr + '.docx';
}
