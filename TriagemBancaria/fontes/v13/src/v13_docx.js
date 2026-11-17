/* ═══════════════════════════════════════════════════════════════════════
   v13 — GERAÇÃO DE DOCUMENTOS (.docx)
   Timbre: cabeçalho com o logotipo oficial e rodapé da unidade, do modelo
   institucional da DPESP embutido (B64_BASE_V13).
   Corpo: padrão ofício do Manual de Redação da Presidência da República
   (identificação, local e data, endereçamento, assunto, vocativo, texto com
   parágrafos numerados e recuo de 2,5 cm, fecho e identificação do signatário;
   margens de 3 cm à esquerda, 1,5 cm à direita e 2 cm em cima e embaixo).
   A fonte segue o "padrão de redação" escolhido na aba Documentos e é
   reduzida aos poucos, se preciso, para o documento caber em UMA página.
   ═══════════════════════════════════════════════════════════════════════ */

/* Dados da unidade (cabeçalho, rodapé, e-mail de resposta e padrão de redação).
   Editáveis na aba Documentos > Unidade e padrão dos documentos; ficam salvos neste navegador. */
var UNIDADE_PADRAO = {
  cab1: 'Unidade de Ribeirão Preto',
  cab2: 'Atendimento Especializado',
  cidade: 'Ribeirão Preto',
  sigla: 'Triagem',
  endereco: 'Rua Alice Além Saadi, 1256 - Nova Ribeirânia - Ribeirão Preto/SP - CEP 14096-570',
  telefone: '',
  email: 'triagem.ribpreto@defensoria.sp.def.br',
  site: 'www.defensoria.sp.def.br',
  padrao: 'mr2002'
};
var UNIDADE_KEY = 'dpesp-unidade-v13';
function unidadeCarregar() {
  var u = {};
  Object.keys(UNIDADE_PADRAO).forEach(function (k) { u[k] = UNIDADE_PADRAO[k]; });
  try {
    var s = JSON.parse(localStorage.getItem(UNIDADE_KEY) || '{}');
    Object.keys(s).forEach(function (k) { if (k in u && typeof s[k] === 'string') u[k] = s[k]; });
  } catch (e) {}
  if (!DX_PADROES[u.padrao]) u.padrao = UNIDADE_PADRAO.padrao;
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

/* ── Padrões de redação ────────────────────────────────────────────────────
   A estrutura é sempre a do padrão ofício; muda a fonte. Cada padrão tem a sua
   sequência de ajuste: se o texto não couber em uma página, reduz o corpo e os
   espaçamentos e, nos padrões sem serifa, passa para Times New Roman. */
var DX_PADROES = {
  mr2002: { rotulo: 'Manual de Redação, 2ª edição (2002): Times New Roman 12',
    seq: [['Times New Roman', 12], ['Times New Roman', 11.5], ['Times New Roman', 11], ['Times New Roman', 10.5], ['Times New Roman', 10], ['Times New Roman', 9.5]] },
  mr2018: { rotulo: 'Manual de Redação, 3ª edição (2018): Calibri 12',
    seq: [['Calibri', 12], ['Calibri', 11.5], ['Calibri', 11], ['Calibri', 10.5], ['Times New Roman', 10.5], ['Times New Roman', 10], ['Times New Roman', 9.5]] },
  inst: { rotulo: 'Fonte do modelo institucional da DPESP: Helvetica 10,5',
    seq: [['Helvetica', 10.5], ['Cambria', 10.5], ['Times New Roman', 10.5], ['Times New Roman', 10], ['Times New Roman', 9.5]] }
};
var DX_ESCALA = [1, 0.85, 0.72, 0.6, 0.5, 0.42, 0.36];
var DX_DEPOIS = [120, 100, 80, 70, 60, 50, 40];
function dxNiveis(padrao) {
  var p = DX_PADROES[padrao] || DX_PADROES[UNIDADE_PADRAO.padrao];
  return p.seq.map(function (f, i) {
    return { id: i, fonte: f[0], medir: f[0] === 'Helvetica' ? 'Arial' : f[0], pt: f[1], entre: 1, depois: DX_DEPOIS[i], k: DX_ESCALA[i],
      rotulo: f[0] + ' ' + String(f[1]).replace('.', ',') };
  });
}
/* Geometria da página (pt). Margens do Manual: esquerda 3 cm, direita 1,5 cm,
   superior e inferior 2 cm. A altura útil desconta o timbre, que avança além da margem superior. */
var DX_MARGENS = { top: 1134, right: 851, bottom: 1134, left: 1701, header: 425, footer: 425 };
var DX_PAGINA = { larguraUtil: (11906 - 1701 - 851) / 20, alturaUtil: 722 };
var DX_RECUO = 1418;
/* Altura da linha simples de cada fonte, em múltiplos do corpo (métricas das fontes). */
var DX_ALTURA_FONTE = { 'Arial': 1.15, 'Cambria': 1.172, 'Times New Roman': 1.15, 'Calibri': 1.2207 };
/* Largura média de caractere (em múltiplos do corpo), usada quando a fonte não está instalada no computador. */
var DX_LARGURA_MEDIA = { 'Arial': 0.5, 'Cambria': 0.48, 'Times New Roman': 0.445, 'Calibri': 0.455 };

var _dxCanvas = null, _dxFonteOk = {};
function _dxCtx() {
  if (_dxCanvas === null) {
    try { _dxCanvas = document.createElement('canvas').getContext('2d'); } catch (e) { _dxCanvas = false; }
  }
  return _dxCanvas || null;
}
function _dxDisponivel(fonte) {
  if (fonte in _dxFonteOk) return _dxFonteOk[fonte];
  var ctx = _dxCtx(), ok = false;
  if (ctx) {
    try {
      var amostra = 'mmmmmmmmmlli WWW 0123 ãçé', ok1, ok2;
      ctx.font = '72px monospace'; var a = ctx.measureText(amostra).width;
      ctx.font = '72px "' + fonte + '", monospace'; ok1 = ctx.measureText(amostra).width !== a;
      ctx.font = '72px serif'; var b = ctx.measureText(amostra).width;
      ctx.font = '72px "' + fonte + '", serif'; ok2 = ctx.measureText(amostra).width !== b;
      ok = ok1 || ok2;
    } catch (e) {}
  }
  _dxFonteOk[fonte] = ok;
  return ok;
}
/* Largura (pt) de um trecho de texto na fonte/corpo indicados. */
function dxLarguraTexto(txt, fonte, pt, negrito) {
  var ctx = _dxCtx();
  if (ctx && _dxDisponivel(fonte)) {
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
    + '<w:color w:val="000000"/><w:sz w:val="' + sz + '"/><w:szCs w:val="' + sz + '"/><w:lang w:val="pt-BR"/></w:rPr>'
    + '<w:t xml:space="preserve">' + dxEsc(r.t) + '</w:t></w:r>';
}
/* Parágrafo lógico -> XML. p = { estilo, runs, antes, depois, jc, recuo, linha } (espaços em twips). */
function dxParXml(p, nv) {
  var linha = Math.round(240 * (p.linha || nv.entre));
  var pPr = '<w:pPr><w:pStyle w:val="' + (p.estilo || 'OficioCorpo') + '"/>'
    + (p.manter ? '<w:keepNext/>' : '')
    + '<w:spacing w:before="' + (p.antes || 0) + '" w:after="' + (p.depois == null ? nv.depois : p.depois) + '" w:line="' + linha + '" w:lineRule="auto"/>'
    + '<w:ind w:left="0" w:right="0" w:firstLine="' + (p.recuo || 0) + '"/>'
    + '<w:jc w:val="' + (p.jc || 'left') + '"/></w:pPr>';
  return '<w:p>' + pPr + (p.runs || []).map(function (r) { return dxRunXml(r, nv); }).join('') + '</w:p>';
}
/* Identificação do(s) signatário(s): nome em maiúsculas, sem negrito e sem linha; cargo com iniciais maiúsculas;
   centralizado. Com dois signatários (defensor e estagiário), ficam lado a lado em tabela sem bordas. */
function dxAssinaturasXml(blocos, nv) {
  var total = 11906 - DX_MARGENS.left - DX_MARGENS.right, w = Math.floor(total / blocos.length);
  var cel = blocos.map(function (b) {
    return '<w:tc><w:tcPr><w:tcW w:w="' + w + '" w:type="dxa"/></w:tcPr>'
      + b.map(function (l) { return dxParXml({ estilo: 'OficioAssinatura', runs: [{ t: l }], depois: 0, jc: 'center' }, nv); }).join('')
      + '</w:tc>';
  }).join('');
  return '<w:tbl><w:tblPr><w:tblW w:w="' + total + '" w:type="dxa"/><w:tblLayout w:type="fixed"/>'
    + '<w:tblCellMar><w:left w:w="0" w:type="dxa"/><w:right w:w="0" w:type="dxa"/></w:tblCellMar></w:tblPr>'
    + '<w:tblGrid>' + blocos.map(function () { return '<w:gridCol w:w="' + w + '"/>'; }).join('') + '</w:tblGrid>'
    + '<w:tr><w:trPr><w:cantSplit/></w:trPr>' + cel + '</w:tr></w:tbl>';
}

/* Altura estimada (pt) de uma lista de parágrafos lógicos em um nível. */
function dxAltura(pars, nv) {
  var alt = 0, altFonte = (DX_ALTURA_FONTE[nv.medir] || 1.15) * nv.pt;
  pars.forEach(function (p) {
    if (p.assinaturas) {
      var maior = 0;
      p.assinaturas.forEach(function (b) {
        var n = 0, larg = DX_PAGINA.larguraUtil / p.assinaturas.length;
        b.forEach(function (l) { n += dxContarLinhas([{ t: l }], nv.medir, nv.pt, larg, 0); });
        maior = Math.max(maior, n);
      });
      alt += maior * altFonte;
      return;
    }
    var n = dxContarLinhas(p.runs || [], nv.medir, nv.pt, DX_PAGINA.larguraUtil, (p.recuo || 0) / 20);
    alt += n * altFonte * (p.linha || nv.entre) + ((p.antes || 0) + (p.depois == null ? nv.depois : p.depois)) / 20;
  });
  return alt;
}
/* Ajusta os espaçamentos estruturais (entre os blocos do ofício e o espaço da assinatura) a cada nível. */
function dxAplicarNivel(pars, nv) {
  return pars.map(function (p) {
    var q = {}; Object.keys(p).forEach(function (c) { q[c] = p[c]; });
    if (q.antesBase != null) q.antes = Math.round(q.antesBase * nv.k);
    if (q.depoisBase != null) q.depois = Math.max(q.depoisMin || 0, Math.round(q.depoisBase * nv.k));
    return q;
  });
}
/* Escolhe o primeiro nível em que o conteúdo cabe em uma página.
   Retorna { nivel, pars, altura, cabe, padrao }. opcoes = { padrao, nivel (forçar) }. */
function dxAjustar(pars, opcoes) {
  opcoes = opcoes || {};
  var padrao = opcoes.padrao || unidadeCarregar().padrao, niveis = dxNiveis(padrao), folga = 0.97, ultimo = null;
  for (var i = 0; i < niveis.length; i++) {
    if (opcoes.nivel != null && i !== opcoes.nivel) continue;
    var nv = niveis[i], pp = dxAplicarNivel(pars, nv), h = dxAltura(pp, nv);
    ultimo = { nivel: nv, pars: pp, altura: h, cabe: h <= DX_PAGINA.alturaUtil * folga, padrao: padrao };
    if (ultimo.cabe || opcoes.nivel != null) return ultimo;
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
/* Endereço postal em duas linhas (Manual): 1ª logradouro, número e bairro; 2ª CEP e cidade/UF. */
function dxEnderecoLinhas(end) {
  var s = String(end || '').trim();
  if (!s) return [];
  var partes = s.split(/\s+[—–]\s+|\s+-\s+(?=CEP\b)/i).map(function (x) { return x.trim(); }).filter(Boolean);
  var cep = '', cidade = '', resto = [];
  partes.forEach(function (p) {
    var m = p.match(/(?:CEP:?\s*)?(\d{5}-?\d{3}|\[00000-000\])/i);
    if (m && !cep) { cep = m[1]; p = (p.slice(0, m.index) + p.slice(m.index + m[0].length)).replace(/^[\s,\-]+|[\s,\-]+$/g, ''); }
    if (p) resto.push(p);
  });
  if (resto.length) {
    var ult = resto[resto.length - 1], mc = ult.match(/^(.*?),\s*([^,]+\/\s*[A-Z]{2})$/);
    if (mc) { resto[resto.length - 1] = mc[1]; cidade = mc[2]; }
    else if (resto.length > 1 && /(\/\s*[A-Z]{2}|\[CIDADE\/UF\])$/.test(ult)) { cidade = ult; resto.pop(); }
  }
  if (!cep && !cidade) return partes.length <= 1 ? [s] : [partes[0], partes.slice(1).join(' - ')];
  if (/^\d{8}$/.test(cep)) cep = cep.slice(0, 5) + '-' + cep.slice(5);
  return [resto.join(' - '), [cep, cidade].filter(Boolean).join(' ')].filter(Boolean);
}
/* Cabeçalho comum do ofício: identificação, local e data, endereçamento, assunto e vocativo. */
function dxCabecalhoOficio(P, u, d, dt, ender, assunto, vocativo) {
  var sigla = String(u.sigla || '').trim().replace(/^\/+|\/+$/g, '');
  P.push({ estilo: 'OficioNumero', runs: [{ t: 'OFÍCIO Nº ' + (d.numero || '_____') + '/' + dt.ano + (sigla ? '/' + sigla : '') }], antesBase: 120, depois: 0 });
  P.push({ estilo: 'OficioData', runs: [{ t: String(u.cidade || '').replace(/\s*\/\s*[A-Z]{2}$/, '') + ', ' + dt.texto + '.' }], jc: 'right', antesBase: 240, depois: 0 });
  ender.forEach(function (l, i) { P.push({ estilo: 'OficioDestinatario', runs: [{ t: l }], antesBase: i === 0 ? 360 : null, antes: i === 0 ? null : 0, depois: 0 }); });
  P.push({ estilo: 'OficioAssunto', runs: [{ t: 'Assunto: ' + assunto.replace(/\.+$/, '') + '.', b: true }], antesBase: 300, depois: 0 });
  P.push({ estilo: 'OficioCorpo', runs: [{ t: vocativo }], recuo: DX_RECUO, antesBase: 300 });
}
/* Numera os parágrafos do texto quando houver três ou mais (o vocativo e o fecho não se numeram). */
function dxNumerar(textos) {
  var numerar = textos.length >= 3;
  return textos.map(function (p, i) {
    var q = { runs: (numerar ? [{ t: (i + 1) + '. ' }] : []).concat(p.runs), jc: 'both', recuo: DX_RECUO };
    return q;
  });
}
function dxFechoEAssinaturas(P, blocos) {
  P.push({ estilo: 'OficioFecho', runs: [{ t: 'Atenciosamente,' }], recuo: DX_RECUO, antesBase: 120, depoisBase: 900, depoisMin: 640, manter: true });
  P.push({ assinaturas: blocos });
}
function dxNomeSignatario(n) { return n ? String(n).trim().toLocaleUpperCase('pt-BR') : '[NOME DO(A) SIGNATÁRIO(A)]'; }

/* ── OFÍCIO À INSTITUIÇÃO FINANCEIRA ─────────────────────────────────────
   d = { numero, dataIso, instituicao, endereco, assistido, cpf, dol, contrato,
         tema, relato, itens[], prazo{dias,tipo}, justificativa, vulnerabilidade,
         autorizacao(bool), signatario, cargo, estagiario, estagiarioCargo, unidade } */
function dxOficioBanco(d) {
  var u = d.unidade || unidadeCarregar(), dt = dxDataExtenso(d.dataIso), P = [];
  var ender = ['Ao(À) Senhor(a)', 'Representante Legal de ' + (d.instituicao || '[INSTITUIÇÃO]')].concat(dxEnderecoLinhas(d.endereco));
  dxCabecalhoOficio(P, u, d, dt, ender, (d.tema && d.tema.trim()) || 'Solicitação de informações e documentos', 'Prezado(a) Senhor(a),');

  var T = [];
  var p1 = 'A Defensoria Pública do Estado de São Paulo, no exercício das funções institucionais previstas no art. 134 da Constituição Federal e no art. 4º, incisos II e VIII, da Lei Complementar nº 80/1994, atua em favor de ';
  var p1b = ', CPF nº ' + (d.cpf || '[CPF]') + ' (art. 128, XI, da Lei Complementar nº 80/1994 e art. 162, VI, da Lei Complementar Estadual nº 988/2006)'
    + (d.autorizacao ? ', que firmou a autorização expressa anexa (art. 1º, § 3º, V, da Lei Complementar nº 105/2001)' : '')
    + ', e solicita a Vossa Senhoria as informações e os documentos abaixo, com fundamento no direito à informação e de acesso aos próprios dados e contratos (arts. 6º, III, 43, 54-D, III, e 54-G, II, do Código de Defesa do Consumidor e art. 18 da Lei nº 13.709/2018).';
  T.push({ runs: [{ t: p1 }, { t: d.assistido || '[NOME]', b: true }, { t: p1b }] });
  if (d.relato && d.relato.trim()) T.push({ runs: [{ t: d.relato.trim() }] });
  if (d.vulnerabilidade && d.vulnerabilidade.trim()) T.push({ runs: [{ t: d.vulnerabilidade.trim() }] });

  var pz = dxPrazoTexto(d.prazo);
  var itens = dxItens(d.itens || []);
  var runs = [{ t: 'Solicita-se o envio' + (pz ? ', no prazo de ' : '') }];
  if (pz) runs.push({ t: pz, b: true });
  runs.push({ t: (pz ? ' contados do recebimento deste ofício' : '') + ', do seguinte' + (d.contrato ? ', em especial quanto ao contrato nº ' + d.contrato : '') + ': ' });
  itens.forEach(function (it, i) { runs.push({ t: it.letra + ' ' + it.texto + (i < itens.length - 1 ? '; ' : '.') }); });
  if (!itens.length) runs.push({ t: '[descrever os documentos solicitados].' });
  T.push({ runs: runs });
  if (d.justificativa && d.justificativa.trim()) {
    var j = d.justificativa.trim().replace(/\.+$/, '');
    T.push({ runs: [{ t: 'O prazo indicado considera as circunstâncias do caso: ' + j.charAt(0).toLowerCase() + j.slice(1) + '.' }] });
  }
  T.push({ runs: [{ t: 'A resposta poderá ser enviada ao e-mail institucional desta unidade (' + u.email + ')' + (d.dol ? ', com referência ao DOL nº ' + d.dol : '') + '. Na impossibilidade de atendimento, total ou parcial, solicita-se que a negativa seja formalizada por escrito, com a respectiva fundamentação.' }] });
  P = P.concat(dxNumerar(T));
  var blocos = [[dxNomeSignatario(d.signatario), d.cargo || '[Cargo]']];
  if (d.estagiario) blocos.push([dxNomeSignatario(d.estagiario), d.estagiarioCargo || 'Estagiário(a) de Direito']);
  dxFechoEAssinaturas(P, blocos);
  return P;
}

/* ── OFÍCIO AO INSS ──────────────────────────────────────────────────────── */
function dxOficioINSS(d) {
  var u = d.unidade || unidadeCarregar(), dt = dxDataExtenso(d.dataIso), P = [], pz = dxPrazoTexto(d.prazo);
  var ender = ['Ao(À) Senhor(a)', 'Gerente Executivo(a) do Instituto Nacional do Seguro Social'].concat(dxEnderecoLinhas(d.endereco));
  dxCabecalhoOficio(P, u, d, dt, ender, 'Extratos, contratos e bloqueio de consignados', 'Senhor(a) Gerente Executivo(a),');
  var ref = [];
  if (d.dol) ref.push('atendimento DOL nº ' + d.dol);
  if (d.beneficio) ref.push('benefício nº ' + d.beneficio);
  var T = [];
  T.push({ runs: [{ t: 'A Defensoria Pública do Estado de São Paulo, no exercício de suas atribuições constitucionais e legais de prestação de assistência jurídica integral e gratuita (art. 134 da Constituição Federal e Lei Complementar Estadual nº 988/2006) e com fundamento no art. 128, X, da Lei Complementar nº 80/1994, solicita a Vossa Senhoria o que segue em favor de ' }, { t: d.assistido || '[NOME]', b: true }, { t: ', CPF nº ' + (d.cpf || '[CPF]') + (ref.length ? ' (' + ref.join(', ') + ')' : '') + '.' }] });
  T.push({ runs: [{ t: (d.relato && d.relato.trim()) || 'O(A) assistido(a) compareceu a esta unidade relatando situação relativa a descontos vinculados ao seu benefício previdenciário, o que torna necessária a verificação dos lançamentos para análise de regularidade e resguardo de sua subsistência.' }] });
  if (d.vulnerabilidade && d.vulnerabilidade.trim()) T.push({ runs: [{ t: d.vulnerabilidade.trim() }] });
  var itens = dxItens(d.itens || []);
  var runs = [{ t: 'Assim, solicita-se a Vossa Senhoria' + (pz ? ', no prazo de ' : '') }];
  if (pz) runs.push({ t: pz, b: true });
  runs.push({ t: (d.contrato ? ', em especial quanto ao contrato nº ' + d.contrato : '') + ': ' });
  itens.forEach(function (it, i) { runs.push({ t: it.letra + ' ' + it.texto + (i < itens.length - 1 ? '; ' : '.') }); });
  T.push({ runs: runs });
  if (d.justificativa && d.justificativa.trim()) {
    var j = d.justificativa.trim().replace(/\.+$/, '');
    T.push({ runs: [{ t: 'O prazo indicado considera as circunstâncias do caso: ' + j.charAt(0).toLowerCase() + j.slice(1) + '.' }] });
  }
  T.push({ runs: [{ t: 'As informações e os documentos poderão ser encaminhados ao endereço eletrônico institucional desta unidade (' + u.email + ')' + (d.dol ? ', com referência ao DOL nº ' + d.dol : '') + ', ou disponibilizados para retirada pelo portador deste expediente.' }] });
  P = P.concat(dxNumerar(T));
  dxFechoEAssinaturas(P, [[dxNomeSignatario(d.signatario), d.cargo || '[Cargo]']]);
  return P;
}

/* ── TERMO DE AUTORIZAÇÃO EXPRESSA ─────────────────────────────────────────
   Não é ofício: título centralizado, texto com recuo de 2,5 cm, local e data e
   linha para a assinatura do(a) assistido(a). */
function dxAutorizacao(d) {
  var u = d.unidade || unidadeCarregar(), dt = dxDataExtenso(d.dataIso), P = [];
  var J = 'both', R = DX_RECUO, nome = (d.nome || '[NOME COMPLETO]').toLocaleUpperCase('pt-BR');
  P.push({ estilo: 'OficioCorpo', runs: [{ t: 'TERMO DE AUTORIZAÇÃO EXPRESSA E AFASTAMENTO DE SIGILO BANCÁRIO', b: true }], jc: 'center', antesBase: 360, depoisBase: 360 });
  var ref = [];
  if (d.dol) ref.push('Atendimento DOL nº ' + d.dol);
  if (d.instituicao) ref.push('Instituição: ' + d.instituicao);
  if (d.contrato) ref.push('Contrato nº ' + d.contrato);
  if (ref.length) P.push({ estilo: 'OficioAssunto', runs: [{ t: 'Referência: ', b: true }, { t: ref.join('; ') + '.' }], depoisBase: 240 });
  P.push({ runs: [{ t: 'Eu, ' }, { t: nome, b: true }, { t: ', inscrito(a) no CPF sob o nº ' + (d.cpf || '[CPF]') + ', pelo presente instrumento, ' }, { t: 'AUTORIZO EXPRESSAMENTE', b: true }, { t: ' toda e qualquer instituição financeira, de pagamento, cooperativa de crédito ou entidade equiparada pertencente ao Sistema Financeiro Nacional a fornecer à ' }, { t: 'DEFENSORIA PÚBLICA DO ESTADO DE SÃO PAULO - ' + u.cab1.toLocaleUpperCase('pt-BR'), b: true }, { t: ' todas as informações, extratos e cópias de documentos referentes a operações de crédito, especialmente empréstimos (pessoais e/ou consignados), financiamentos e cartões, firmados em meu nome.' }], jc: J, recuo: R });
  P.push({ runs: [{ t: 'Declaro que a presente autorização abrange o acesso a contratos, faturas, históricos e quaisquer movimentações financeiras relacionadas ao caso em apuração, implicando a renúncia expressa ao sigilo bancário para esta finalidade específica, nos termos do artigo 1º, § 3º, inciso V, da Lei Complementar nº 105/2001.' }], jc: J, recuo: R });
  P.push({ runs: [{ t: 'Ademais, consinto de forma livre, informada e inequívoca com o tratamento e o compartilhamento dos meus dados pessoais e financeiros, em conformidade com o artigo 7º, incisos I e VI, da Lei nº 13.709/2018 (Lei Geral de Proteção de Dados - LGPD), exclusivamente para fins de instrução de procedimento administrativo e/ou judicial promovido pela Defensoria Pública.' }], jc: J, recuo: R });
  P.push({ runs: [{ t: 'Reconheço que a Defensoria Pública do Estado de São Paulo encontra-se autorizada a representar-me junto a qualquer instituição do sistema financeiro para a prática dos atos necessários à obtenção dessas informações, nos termos da Lei Complementar Federal nº 80/1994 e da Lei Complementar Estadual nº 988/2006.' }], jc: J, recuo: R });
  P.push({ runs: [{ t: 'Por ser a expressão da verdade e por manifestar a minha livre e espontânea vontade, firmo o presente termo para que produza seus regulares efeitos legais.' }], jc: J, recuo: R });
  P.push({ estilo: 'OficioData', runs: [{ t: String(u.cidade || '').replace(/\s*\/\s*[A-Z]{2}$/, '') + ', ' + dt.texto + '.' }], jc: 'right', antesBase: 300, depoisBase: 1100, depoisMin: 720, manter: true });
  P.push({ estilo: 'OficioAssinatura', runs: [{ t: '_____________________________________________' }], jc: 'center', depois: 0, manter: true });
  P.push({ estilo: 'OficioAssinatura', runs: [{ t: nome }], jc: 'center', depois: 0, manter: true });
  P.push({ estilo: 'OficioAssinatura', runs: [{ t: 'CPF nº ' + (d.cpf || '[CPF]') }], jc: 'center', depois: 0 });
  return P;
}

/* ── Montagem do arquivo .docx ───────────────────────────────────────────── */
async function dxGerarBlob(pars, opcoes) {
  if (typeof JSZip === 'undefined') throw new Error('A biblioteca de geração de Word (JSZip) não carregou. Verifique a internet e recarregue a página (F5).');
  if (typeof B64_BASE_V13 === 'undefined' || !B64_BASE_V13 || B64_BASE_V13.length < 100) throw new Error('Modelo-base dos documentos não carregado.');
  opcoes = opcoes || {};
  var u = opcoes.unidade || unidadeCarregar();
  var aj = dxAjustar(pars, { padrao: opcoes.padrao || u.padrao, nivel: opcoes.nivel });
  var bin = atob(B64_BASE_V13), bytes = new Uint8Array(bin.length);
  for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  var zip = await JSZip.loadAsync(bytes);
  var doc = await zip.file('word/document.xml').async('string');
  var marca = '<w:p><w:r><w:t>{{CORPO}}</w:t></w:r></w:p>';
  if (doc.indexOf(marca) === -1) throw new Error('Marcador do corpo não encontrado no modelo-base.');
  var M = DX_MARGENS;
  doc = doc.replace(marca, dxCorpoXml(aj)).replace(/<w:pgMar [^>]*\/>/, '<w:pgMar w:top="' + M.top + '" w:right="' + M.right + '" w:bottom="' + M.bottom + '" w:left="' + M.left + '" w:header="' + M.header + '" w:footer="' + M.footer + '" w:gutter="0"/>');
  zip.file('word/document.xml', doc);
  var larg = 11906 - M.left - M.right;
  var cab = await zip.file('word/header1.xml').async('string');
  cab = cab.replace('{{CAB1}}', dxEsc(u.cab1)).replace('{{CAB2}}', dxEsc(u.cab2))
    .replace('<w:tblW w:w="9298"', '<w:tblW w:w="' + larg + '"').split('w:w="3883"').join('w:w="' + (larg - 5415) + '"');
  zip.file('word/header1.xml', cab);
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
