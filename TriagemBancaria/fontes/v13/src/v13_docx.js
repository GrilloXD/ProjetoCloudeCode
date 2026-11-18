/* ═══════════════════════════════════════════════════════════════════════
   v13 — GERAÇÃO DE DOCUMENTOS (.docx)
   Timbre: cabeçalho com o logotipo oficial e rodapé da unidade, do modelo
   institucional da DPESP embutido (B64_BASE_V13).
   Corpo: formato dos modelos de ofício e de autorização da unidade (v12):
   "Ofício nº" e data na mesma linha, endereçamento, "Assunto:" com o rótulo em
   negrito, vocativo e fecho com recuo de 1 cm, parágrafos numerados com o número
   na margem e tabulação de 1 cm, linha em branco entre os parágrafos, itens a), b)
   em negrito e assinatura centralizada. Margens laterais de 3 cm.
   A fonte segue o "padrão de redação" escolhido na aba Documentos e é reduzida
   aos poucos, se preciso, para o documento caber em UMA página.
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
   A estrutura é sempre a mesma; muda a fonte. Cada padrão tem a sua sequência de
   ajuste: se o texto não couber em uma página, reduz o corpo e os espaços e, nos
   padrões sem serifa, passa para Times New Roman. */
var DX_PADROES = {
  mr2002: { rotulo: 'Times New Roman 12 (como nos modelos antigos da unidade)',
    seq: [['Times New Roman', 12], ['Times New Roman', 11.5], ['Times New Roman', 11], ['Times New Roman', 10.5], ['Times New Roman', 10], ['Times New Roman', 9.5]] },
  mr2018: { rotulo: 'Calibri 12 (Manual de Redação da Presidência, 3ª edição, 2018)',
    seq: [['Calibri', 12], ['Calibri', 11.5], ['Calibri', 11], ['Calibri', 10.5], ['Times New Roman', 10.5], ['Times New Roman', 10], ['Times New Roman', 9.5]] },
  inst: { rotulo: 'Helvetica 10,5 (modelo de ofício institucional da DPESP)',
    seq: [['Helvetica', 10.5], ['Cambria', 10.5], ['Times New Roman', 10.5], ['Times New Roman', 10], ['Times New Roman', 9.5]] }
};
var DX_ESCALA = [1, 0.9, 0.8, 0.7, 0.6, 0.5, 0.45];
var DX_BRANCO = [1, 1, 0.9, 0.8, 0.7, 0.6, 0.55];
/* Altura da linha simples de cada fonte, em múltiplos do corpo (métricas das fontes). */
var DX_ALTURA_FONTE = { 'Arial': 1.15, 'Cambria': 1.172, 'Times New Roman': 1.15, 'Calibri': 1.2207 };
/* Largura média de caractere (em múltiplos do corpo), usada quando a fonte não está instalada no computador. */
var DX_LARGURA_MEDIA = { 'Arial': 0.5, 'Cambria': 0.48, 'Times New Roman': 0.445, 'Calibri': 0.455 };
function dxNiveis(padrao) {
  var p = DX_PADROES[padrao] || DX_PADROES[UNIDADE_PADRAO.padrao];
  return p.seq.map(function (f, i) {
    var medir = f[0] === 'Helvetica' ? 'Arial' : f[0];
    var linha = (DX_ALTURA_FONTE[medir] || 1.15) * f[1];
    /* "depois" = linha em branco entre parágrafos (twips), reduzida nos níveis de ajuste */
    return { id: i, fonte: f[0], medir: medir, pt: f[1], entre: 1, depois: Math.round(linha * 20 * DX_BRANCO[i]), k: DX_ESCALA[i],
      rotulo: f[0] + ' ' + String(f[1]).replace('.', ',') };
  });
}
/* Geometria da página: A4, margens laterais de 3 cm (como nos modelos antigos), superior e inferior de 2 cm.
   A altura útil desconta o timbre, que avança além da margem superior (calibrada no Word). */
var DX_MARGENS = { top: 1134, right: 1701, bottom: 1134, left: 1701, header: 425, footer: 425 };
var DX_LARGURA_TW = 11906 - DX_MARGENS.left - DX_MARGENS.right;
var DX_PAGINA = { larguraUtil: DX_LARGURA_TW / 20, alturaUtil: 722 };
var DX_TAB = 567;      /* tabulação do número do parágrafo: 1 cm */
var DX_RECUO = 567;    /* recuo do vocativo e do fecho: 1 cm */

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
/* Número de linhas que um parágrafo ocupa (quebra por palavras, como o Word).
   Tabulação à esquerda: o texto salta para a posição da tabulação (pt). */
function dxContarLinhas(runs, fonte, pt, largura, recuoPrimeira, tabPt) {
  return dxLinhasOcupacao(runs, fonte, pt, largura, recuoPrimeira, tabPt).length;
}
/* Ocupação (0 a 1) de cada linha do parágrafo; serve para evitar linhas com espaços largos demais. */
function dxLinhasOcupacao(runs, fonte, pt, largura, recuoPrimeira, tabPt) {
  var palavras = [];
  runs.forEach(function (r) {
    if (r.tab) { palavras.push({ tab: true }); return; }
    String(r.t || '').split(/(\s+)/).forEach(function (p) {
      if (p === '') return;
      palavras.push({ t: p, b: !!r.b, pt: r.pt, esp: /^\s+$/.test(p) });
    });
  });
  var ocup = [], x = recuoPrimeira || 0, fimTexto = x, disp = largura;
  for (var i = 0; i < palavras.length; i++) {
    var p = palavras[i];
    if (p.tab) { var tp = tabPt || 35.45; x = x < tp ? tp : x + 35.45 - (x % 35.45); continue; }
    var w = dxLarguraTexto(p.esp ? ' ' : p.t, fonte, p.pt || pt, p.b);
    if (p.esp) { x += w; continue; }
    if (x + w > disp + 0.01 && x > 0) { ocup.push(fimTexto / disp); x = w; } else { x += w; }
    fimTexto = x;
  }
  ocup.push(fimTexto / disp);
  return ocup;
}
/* Entre redações equivalentes, escolhe a que não deixa linha com espaços largos (ex.: e-mail longo no fim da linha). */
function dxEscolherRedacao(alternativas, q, nv) {
  var tabPt = q.tabs && q.tabs[0][0] === 'left' ? q.tabs[0][1] / 20 : null, melhor = null;
  for (var i = 0; i < alternativas.length; i++) {
    var oc = dxLinhasOcupacao(alternativas[i], nv.medir, nv.pt, DX_PAGINA.larguraUtil, (q.recuo || 0) / 20, tabPt);
    var nota = oc.length > 1 ? Math.min.apply(null, oc.slice(0, -1)) : 1;
    if (i === 0 && nota >= 0.88) return alternativas[0];
    if (!melhor || nota > melhor.nota + 0.001) melhor = { nota: nota, runs: alternativas[i] };
  }
  return melhor.runs;
}

function dxEsc(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function dxRunXml(r, nv) {
  var f = nv.fonte, sz = Math.round((r.pt || nv.pt) * 2);
  var rPr = '<w:rPr><w:rFonts w:ascii="' + f + '" w:hAnsi="' + f + '" w:cs="' + f + '"/>'
    + (r.b ? '<w:b/><w:bCs/>' : '<w:b w:val="0"/>') + (r.i ? '<w:i/>' : '') + (r.cond ? '<w:spacing w:val="' + r.cond + '"/>' : '') + (r.link ? '<w:u w:val="single"/>' : '')
    + '<w:color w:val="' + (r.link ? '0563C1' : '000000') + '"/><w:sz w:val="' + sz + '"/><w:szCs w:val="' + sz + '"/><w:lang w:val="pt-BR"/></w:rPr>';
  if (r.tab) return '<w:r>' + rPr + '<w:tab/></w:r>';
  return '<w:r>' + rPr + '<w:t xml:space="preserve">' + dxEsc(r.t) + '</w:t></w:r>';
}
/* Parágrafo lógico -> XML. p = { estilo, runs, antes, depois, jc, recuo, linha, tabs:[[tipo, pos]], manter } (espaços em twips). */
function dxParXml(p, nv) {
  var linha = Math.round(240 * (p.linha || nv.entre));
  var pPr = '<w:pPr><w:pStyle w:val="' + (p.estilo || 'OficioCorpo') + '"/>'
    + (p.manter ? '<w:keepNext/>' : '')
    + (p.tabs ? '<w:tabs>' + p.tabs.map(function (t) { return '<w:tab w:val="' + t[0] + '" w:pos="' + t[1] + '"/>'; }).join('') + '</w:tabs>' : '')
    + '<w:spacing w:before="' + (p.antes || 0) + '" w:after="' + (p.depois == null ? nv.depois : p.depois) + '" w:line="' + linha + '" w:lineRule="auto"/>'
    + '<w:ind w:left="0" w:right="0" w:firstLine="' + (p.recuo || 0) + '"/>'
    + '<w:jc w:val="' + (p.jc || 'left') + '"/></w:pPr>';
  return '<w:p>' + pPr + (p.runs || []).map(function (r) { return dxRunXml(r, nv); }).join('') + '</w:p>';
}
/* Assinatura(s) centralizada(s): nome em negrito e cargo abaixo. Com dois signatários
   (defensor e estagiário), ficam lado a lado em tabela sem bordas. */
function dxAssinaturasXml(blocos, nv) {
  var total = DX_LARGURA_TW, w = Math.floor(total / blocos.length);
  var cel = blocos.map(function (b) {
    return '<w:tc><w:tcPr><w:tcW w:w="' + w + '" w:type="dxa"/></w:tcPr>'
      + b.map(function (l, i) { return dxParXml({ estilo: 'OficioAssinatura', runs: [{ t: l, b: i === 0 }], depois: 0, jc: 'center' }, nv); }).join('')
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
        b.forEach(function (l, i) { n += dxContarLinhas([{ t: l, b: i === 0 }], nv.medir, nv.pt, larg, 0); });
        maior = Math.max(maior, n);
      });
      alt += maior * altFonte;
      return;
    }
    var tabDir = p.tabs && p.tabs[0][0] === 'right';
    var tabPt = p.tabs && p.tabs[0][0] === 'left' ? p.tabs[0][1] / 20 : null;
    var n = tabDir ? 1 : dxContarLinhas(p.runs || [], nv.medir, nv.pt, DX_PAGINA.larguraUtil, (p.recuo || 0) / 20, tabPt);
    alt += n * altFonte * (p.linha || nv.entre) + ((p.antes || 0) + (p.depois == null ? nv.depois : p.depois)) / 20;
  });
  return alt;
}
/* Ajusta os espaços estruturais (entre os blocos e o espaço da assinatura) a cada nível.
   antesL/depoisL = espaço em "linhas em branco" do nível; antesBase/depoisBase = twips fixos escalados. */
function dxAplicarNivel(pars, nv) {
  return pars.map(function (p) {
    var q = {}; Object.keys(p).forEach(function (c) { q[c] = p[c]; });
    if (q.alternativas) q.runs = dxEscolherRedacao(q.alternativas, q, nv);
    if (q.runs && q.runs.some(function (r) { return r.ptMax; })) q.runs = q.runs.map(function (r) { return r.ptMax ? Object.assign({}, r, { pt: Math.min(nv.pt, r.ptMax) }) : r; });
    if (q.antesL != null) q.antes = Math.round(q.antesL * nv.depois);
    if (q.depoisL != null) q.depois = Math.max(q.depoisMin || 0, Math.round(q.depoisL * nv.depois));
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
  var xml = aj.pars.map(function (p) {
    return p.assinaturas ? dxAssinaturasXml(p.assinaturas, aj.nivel) : dxParXml(p, aj.nivel);
  }).join('');
  /* O Word exige um parágrafo depois de uma tabela no fim do documento; ele fica com 1 pt para não abrir uma segunda página. */
  var ult = aj.pars[aj.pars.length - 1];
  if (ult && ult.assinaturas) xml += '<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="20" w:lineRule="exact"/><w:rPr><w:sz w:val="2"/><w:szCs w:val="2"/></w:rPr></w:pPr></w:p>';
  return xml;
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
  if (n === 100) return 'cem';
  if (n > 100 && n < 200) return 'cento e ' + dxNumExtenso(n - 100);
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
/* Itens "a) ...; b) ..." com as letras em negrito. */
function dxRunsItens(itens) {
  var runs = [];
  itens.forEach(function (it, i) { runs.push({ t: it.letra, b: true }); runs.push({ t: ' ' + it.texto + (i < itens.length - 1 ? '; ' : '.') }); });
  return runs;
}
/* Endereço postal em duas linhas: 1ª logradouro, número e bairro; 2ª CEP e cidade/UF. */
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
  return [resto.join(' - '), [cidade, cep ? 'CEP ' + cep : ''].filter(Boolean).join(' - ')].filter(Boolean);
}
function dxCidade(u) { return String(u.cidade || '').replace(/\s*\/\s*[A-Z]{2}$/, ''); }

/* Partes comuns dos ofícios. */
function dxCabecalhoOficio(P, u, d, dt, ender, assunto, vocativo) {
  var sigla = String(u.sigla || '').trim().replace(/^\/+|\/+$/g, '');
  P.push({ estilo: 'OficioNumero', runs: [{ t: 'Ofício nº ' + (d.numero || '_____') + '/' + dt.ano + (sigla ? '/' + sigla : ''), b: true }, { tab: true }, { t: dxCidade(u) + ', ' + dt.texto + '.' }],
    tabs: [['right', DX_LARGURA_TW]], antesBase: 120, depoisL: 2 });
  ender.forEach(function (l, i) { P.push({ estilo: 'OficioDestinatario', runs: [{ t: l }], depois: i === ender.length - 1 ? null : 0 }); });
  P.push({ estilo: 'OficioAssunto', runs: [{ t: 'Assunto:', b: true }, { t: ' ' + assunto }], jc: 'both' });
  P.push({ estilo: 'OficioCorpo', runs: [{ t: vocativo }], recuo: DX_RECUO, jc: 'both' });
}
/* Parágrafos numerados: número na margem, tabulação de 1 cm e texto justificado; linha em branco depois. */
function dxNumerar(textos, opc) {
  opc = opc || {};
  return textos.map(function (p, i) {
    var pre = [{ t: (i + 1) + '.', b: !!opc.numNegrito }, { tab: true }];
    var q = { runs: pre.concat(p.runs || p.alternativas[0]), jc: 'both', tabs: [['left', DX_TAB]], linha: opc.linha };
    if (p.alternativas) q.alternativas = p.alternativas.map(function (rs) { return pre.concat(rs); });
    return q;
  });
}
function dxFechoEAssinaturas(P, blocos) {
  P.push({ estilo: 'OficioFecho', runs: [{ t: 'Atenciosamente,' }], recuo: DX_RECUO, depoisL: 3, depoisMin: 560, manter: true });
  P.push({ assinaturas: blocos });
}
function dxNomeSignatario(n) { return n ? String(n).trim() : '[NOME DO(A) SIGNATÁRIO(A)]'; }
function dxJustificativa(T, d) {
  if (!(d.justificativa && d.justificativa.trim())) return;
  var j = d.justificativa.trim().replace(/\.+$/, '');
  T.push({ runs: [{ t: 'O prazo indicado considera as circunstâncias do caso: ' + j.charAt(0).toLowerCase() + j.slice(1) + '.' }] });
}

/* ── OFÍCIO À INSTITUIÇÃO FINANCEIRA ─────────────────────────────────────
   d = { numero, dataIso, instituicao, endereco, assistido, cpf, dol, contrato,
         tema, relato, itens[], prazo{dias,tipo}, justificativa, vulnerabilidade,
         autorizacao(bool), signatario, cargo, estagiario, estagiarioCargo, unidade } */
function dxOficioBanco(d) {
  var u = d.unidade || unidadeCarregar(), dt = dxDataExtenso(d.dataIso), P = [];
  var ender = ['Ao(À) Senhor(a)', 'Representante Legal de ' + (d.instituicao || '[INSTITUIÇÃO]')].concat(dxEnderecoLinhas(d.endereco));
  var tema = (d.tema && d.tema.trim()) ? d.tema.trim().replace(/\.+$/, '') + '. ' : '';
  dxCabecalhoOficio(P, u, d, dt, ender, 'Solicitação de informações e documentos. ' + tema + (d.assistido || '[NOME]') + ', CPF nº ' + (d.cpf || '[CPF]') + '.', 'Senhor(a) Representante,');

  var T = [];
  var p1 = 'A Defensoria Pública do Estado de São Paulo, no exercício das funções institucionais previstas no art. 134 da Constituição Federal e no art. 4º, incisos II e VIII, da Lei Complementar nº 80/1994, atua em favor de ';
  var p1b = ', inscrito(a) no CPF sob o nº ' + (d.cpf || '[CPF]') + ' (art. 128, XI, da Lei Complementar nº 80/1994 e art. 162, VI, da Lei Complementar Estadual nº 988/2006)'
    + (d.autorizacao ? ', que firmou a autorização expressa anexa (art. 1º, § 3º, V, da Lei Complementar nº 105/2001)' : '')
    + ', e dirige-se a Vossa Senhoria para solicitar as informações e os documentos abaixo, com fundamento no direito à informação e de acesso aos próprios dados e contratos (arts. 6º, III, 43, 54-D, III, e 54-G, II, do Código de Defesa do Consumidor e art. 18 da Lei nº 13.709/2018).';
  T.push({ runs: [{ t: p1 }, { t: d.assistido || '[NOME]', b: true }, { t: p1b }] });
  if (d.relato && d.relato.trim()) T.push({ runs: [{ t: d.relato.trim() }] });
  if (d.vulnerabilidade && d.vulnerabilidade.trim()) T.push({ runs: [{ t: d.vulnerabilidade.trim() }] });

  var pz = dxPrazoTexto(d.prazo);
  var itens = dxItens(d.itens || []);
  var runs = [{ t: 'Diante do exposto, solicita-se o envio' + (pz ? ', no prazo de ' + pz + ' contados do recebimento deste ofício' : '') + ', das seguintes informações e documentos' + (d.contrato ? ', em especial quanto ao contrato nº ' + d.contrato : '') + ': ' }];
  runs = runs.concat(itens.length ? dxRunsItens(itens) : [{ t: '[descrever os documentos solicitados].' }]);
  T.push({ runs: runs });
  dxJustificativa(T, d);
  var refDol = d.dol ? ', com referência ao DOL nº ' + d.dol : '', fimB = '. Na eventual impossibilidade de atendimento, total ou parcial, solicita-se que a negativa seja formalizada por escrito, com a respectiva fundamentação.';
  var em = { t: u.email, link: true };
  T.push({ alternativas: [
    [{ t: 'A resposta poderá ser enviada ao endereço eletrônico institucional desta unidade, ' }, em, { t: refDol + fimB }],
    [{ t: 'A resposta poderá ser enviada para ' }, em, { t: ', endereço eletrônico institucional desta unidade' + refDol + fimB }],
    [{ t: 'A resposta poderá ser enviada ao e-mail institucional desta unidade, ' }, em, { t: refDol + fimB }],
    [{ t: 'Solicita-se que a resposta seja enviada ao endereço eletrônico institucional desta unidade, ' }, em, { t: refDol + fimB }],
    [{ t: 'A resposta poderá ser enviada ao e-mail ' }, em, { t: ', canal institucional desta unidade' + refDol + fimB }]] });
  P = P.concat(dxNumerar(T));
  var blocos = [[dxNomeSignatario(d.signatario), d.cargo || '[Cargo]']];
  if (d.estagiario) blocos.push([dxNomeSignatario(d.estagiario), d.estagiarioCargo || 'Estagiário(a) de Direito']);
  dxFechoEAssinaturas(P, blocos);
  return P;
}

/* ── OFÍCIO AO INSS ──────────────────────────────────────────────────────── */
function dxOficioINSS(d) {
  var u = d.unidade || unidadeCarregar(), dt = dxDataExtenso(d.dataIso), P = [], pz = dxPrazoTexto(d.prazo);
  var ender = ['Ao(À) Senhor(a) Gerente Executivo(a) do Instituto Nacional do Seguro Social - INSS'].concat(dxEnderecoLinhas(d.endereco));
  dxCabecalhoOficio(P, u, d, dt, ender, 'Solicitação de extratos (HISCON e HISCRE), de cópias de contratos e de bloqueio preventivo de empréstimos consignados.', 'Senhor(a) Gerente Executivo(a),');
  var ref = [];
  if (d.dol) ref.push('atendimento DOL nº ' + d.dol);
  if (d.beneficio) ref.push('benefício nº ' + d.beneficio);
  var T = [];
  T.push({ runs: [{ t: 'A Defensoria Pública do Estado de São Paulo, no exercício de suas atribuições constitucionais e legais de prestação de assistência jurídica integral e gratuita aos necessitados (art. 134 da Constituição Federal e Lei Complementar Estadual nº 988/2006) e com fundamento no art. 128, X, da Lei Complementar nº 80/1994, dirige-se a Vossa Senhoria para solicitar o que segue em favor de ' }, { t: d.assistido || '[NOME]', b: true }, { t: ', inscrito(a) no CPF sob o nº ' }, { t: d.cpf || '[CPF]', b: true }, { t: (ref.length ? ' (' + ref.join(', ') + ')' : '') + '.' }] });
  T.push({ runs: [{ t: (d.relato && d.relato.trim()) || 'O(A) assistido(a) compareceu a esta unidade relatando situação relativa a descontos vinculados ao seu benefício previdenciário, o que torna necessária a verificação dos lançamentos para análise de regularidade e resguardo de sua subsistência.' }] });
  if (d.vulnerabilidade && d.vulnerabilidade.trim()) T.push({ runs: [{ t: d.vulnerabilidade.trim() }] });
  var itens = dxItens(d.itens || []);
  var runs = [{ t: 'Assim, solicita-se a Vossa Senhoria' + (pz ? ', no prazo de ' + pz : '') + (d.contrato ? ', em especial quanto ao contrato nº ' + d.contrato : '') + ': ' }];
  T.push({ runs: runs.concat(dxRunsItens(itens)) });
  dxJustificativa(T, d);
  var refDol = d.dol ? ', com referência ao DOL nº ' + d.dol : '', fimI = ', ou disponibilizados para retirada presencial pelo portador deste expediente.';
  var em = { t: u.email, link: true };
  T.push({ alternativas: [
    [{ t: 'As informações e os documentos deverão ser encaminhados, preferencialmente, para o endereço eletrônico institucional desta unidade, ' }, em, { t: refDol + fimI }],
    [{ t: 'As informações e os documentos deverão ser encaminhados, preferencialmente, para ' }, em, { t: ', endereço eletrônico institucional desta unidade' + refDol + fimI }],
    [{ t: 'As informações e os documentos deverão ser encaminhados, preferencialmente, para o e-mail institucional desta unidade, ' }, em, { t: refDol + fimI }],
    [{ t: 'Preferencialmente, as informações e os documentos deverão ser encaminhados para o endereço eletrônico institucional desta unidade, ' }, em, { t: refDol + fimI }],
    [{ t: 'As informações e os documentos deverão ser encaminhados, preferencialmente, ao e-mail ' }, em, { t: ', canal institucional desta unidade' + refDol + fimI }]] });
  T.push({ runs: [{ t: 'Solicita-se, por fim, a habitual colaboração dessa Autarquia no atendimento do presente pedido.' }] });
  P = P.concat(dxNumerar(T));
  dxFechoEAssinaturas(P, [[dxNomeSignatario(d.signatario), d.cargo || '[Cargo]']]);
  return P;
}

/* ── TERMO DE AUTORIZAÇÃO EXPRESSA ─────────────────────────────────────────
   Formato do modelo da unidade: título em negrito, parágrafos numerados (número em
   negrito na margem, tabulação de 1 cm), entrelinha 1,15, linha em branco entre os
   parágrafos, local e data à esquerda e assinatura centralizada (nome e CPF). */
function dxAutorizacao(d) {
  var u = d.unidade || unidadeCarregar(), dt = dxDataExtenso(d.dataIso), P = [];
  var nome = (d.nome || '[NOME COMPLETO]').toLocaleUpperCase('pt-BR'), cidade = dxCidade(u);
  /* Título em uma linha, como no modelo: corpo até 11 pt */
  P.push({ estilo: 'OficioCorpo', runs: [{ t: 'TERMO DE AUTORIZAÇÃO EXPRESSA E AFASTAMENTO DE SIGILO BANCÁRIO', b: true, ptMax: 11, cond: -6 }], jc: 'center', antesBase: 120, depoisL: 1.15 });
  var ref = [];
  if (d.dol) ref.push('Atendimento DOL nº ' + d.dol);
  if (d.instituicao) ref.push('Instituição: ' + d.instituicao);
  if (d.contrato) ref.push('Contrato nº ' + d.contrato);
  if (ref.length) P.push({ estilo: 'OficioAssunto', runs: [{ t: 'Referência:', b: true }, { t: ' ' + ref.join('; ') + '.' }], jc: 'both', linha: 1.15, depoisL: 1.15 });
  var T = [];
  T.push({ runs: [{ t: 'Eu, ' }, { t: nome, b: true }, { t: ', inscrito(a) no CPF sob o nº ' }, { t: d.cpf || '[CPF]', b: true }, { t: ', pelo presente instrumento, AUTORIZO EXPRESSAMENTE toda e qualquer instituição financeira, de pagamento, cooperativa de crédito ou entidade equiparada pertencente ao Sistema Financeiro Nacional a fornecer à DEFENSORIA PÚBLICA DO ESTADO DE SÃO PAULO - ' + u.cab1.toLocaleUpperCase('pt-BR') + ' todas as informações, extratos e cópias de documentos referentes a operações de crédito, especialmente empréstimos (pessoais e/ou consignados), financiamentos e cartões, firmados em meu nome.' }] });
  T.push({ runs: [{ t: 'Declaro que a presente autorização abrange o acesso a contratos, faturas, históricos e quaisquer movimentações financeiras relacionadas ao caso em apuração, implicando a renúncia expressa ao sigilo bancário para esta finalidade específica, nos exatos termos autorizadores do artigo 1º, § 3º, inciso V, da Lei Complementar nº 105/2001.' }] });
  T.push({ runs: [{ t: 'Ademais, consinto de forma livre, informada e inequívoca com o tratamento e o compartilhamento dos meus dados pessoais e financeiros, em conformidade com o artigo 7º, incisos I e VI, da Lei nº 13.709/2018 (Lei Geral de Proteção de Dados - LGPD), exclusivamente para fins de instrução de procedimento administrativo e/ou judicial promovido pela Defensoria Pública.' }] });
  T.push({ runs: [{ t: 'Reconheço que a Defensoria Pública do Estado de São Paulo encontra-se devidamente autorizada a representar-me junto a ' }, { t: 'qualquer instituição do sistema financeiro', b: true }, { t: ' para a prática de todos os atos necessários à obtenção dessas informações, amparada pelas prerrogativas da Lei Complementar Federal nº 80/1994 e da Lei Complementar Estadual nº 988/2006.' }] });
  T.push({ runs: [{ t: 'Por ser a expressão da verdade e por manifestar a minha livre e espontânea vontade, firmo o presente termo para que produza seus regulares efeitos legais.' }] });
  var num = dxNumerar(T, { numNegrito: true, linha: 1.15 });
  num.forEach(function (p) { p.depoisL = 1.15; });
  P = P.concat(num);
  P.push({ estilo: 'OficioData', runs: [{ t: cidade + '/SP, ' + dt.texto + '.' }], antesL: 1, depoisL: 5, depoisMin: 900, manter: true });
  P.push({ estilo: 'OficioAssinatura', runs: [{ t: nome, b: true }], jc: 'center', depois: 0, manter: true });
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
  var larg = DX_LARGURA_TW;
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
