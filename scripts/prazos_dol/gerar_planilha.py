"""Gera a planilha de controle de prazos das providências do DOL.

Uso: python gerar_planilha.py [caminho_saida.xlsx]
Lê dados/providencias.json e dados/feriados.json; preserva as anotações do usuário
(lidas da planilha existente e guardadas em dados/anotacoes.json); acrescenta a execução em dados/historico.json.
"""
import json
import sys
from datetime import date, datetime, timedelta
from pathlib import Path

from openpyxl import Workbook, load_workbook
from openpyxl.chart import BarChart, Reference
from openpyxl.chart.label import DataLabelList
from openpyxl.formatting.rule import DataBarRule, FormulaRule
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.datavalidation import DataValidation

BASE = Path(__file__).parent
DADOS = BASE / "dados"
SAIDA_PADRAO = Path.home() / "Downloads" / "Controle de Prazos DOL" / "Controle de Prazos DOL.xlsx"

VERDE = "009632"
ORDEM = ["VENCIDO", "CRÍTICO", "ATENÇÃO", "EM DIA", "SEM PRAZO"]
CORES = {
    "VENCIDO": ("C00000", "FFFFFF"),
    "CRÍTICO": ("ED7D31", "FFFFFF"),
    "ATENÇÃO": ("FFC000", "000000"),
    "EM DIA": ("70AD47", "FFFFFF"),
    "SEM PRAZO": ("A6A6A6", "FFFFFF"),
}
PALETA_GRUPOS = ["DDEBF7", "FCE4D6", "E4DFEC", "FFF2CC", "DEEAF1", "F8CBAD"]
ANDAMENTOS = {
    "A fazer": "F2F2F2",
    "Em andamento": "DDEBF7",
    "Aguardando assistido": "FFF2CC",
    "Minuta pronta": "E4DFEC",
    "Enviada à defensora": "FCE4D6",
    "Protocolado / concluído": "C6EFCE",
}
COR_EDITAVEL = "FFFDE7"
FINO = Side(style="thin", color="D9D9D9")
BORDA = Border(left=FINO, right=FINO, top=FINO, bottom=FINO)
CAB_RESUMO = ["Status", "Vence (real)", "Dias úteis", "Prazo da providência", "Assistido", "Vínculo",
              "Processo", "O que fazer", "Alerta", "Meu andamento", "Minhas anotações", "ID"]
COL_ANDAMENTO, COL_ANOTACAO, COL_ID = 10, 11, 12
LINHA_CAB = 8


def br(d):
    return d.strftime("%d/%m/%Y") if d else ""


def parse(s):
    return datetime.strptime(s, "%d/%m/%Y").date() if s else None


def carregar_feriados():
    cfg = json.loads((DADOS / "feriados.json").read_text(encoding="utf-8"))
    dias = {parse(d) for d in cfg["feriados"]}
    for ano in range(2025, 2029):
        d, fim = date(ano, 12, 20), date(ano + 1, 1, 20)
        while d <= fim:
            dias.add(d)
            d += timedelta(days=1)
    return dias


FERIADOS = carregar_feriados()


def util(d):
    return d.weekday() < 5 and d not in FERIADOS


def proximo_util(d):
    d += timedelta(days=1)
    while not util(d):
        d += timedelta(days=1)
    return d


def somar_uteis(inicio, n):
    d = inicio
    while not util(d):
        d += timedelta(days=1)
    for _ in range(n - 1):
        d = proximo_util(d)
    return d


def uteis_entre(a, b):
    if b < a:
        return -uteis_entre(b, a)
    n, d = 0, a
    while d < b:
        d += timedelta(days=1)
        if util(d):
            n += 1
    return n


def calcular(p):
    if not p.get("prazo_judicial_dias"):
        return None, None, "Sem prazo processual em curso"
    intim = parse(p.get("data_intimacao"))
    obs = []
    if not intim and p.get("data_remessa_portal"):
        intim = parse(p["data_remessa_portal"]) + timedelta(days=10)
        obs.append(f"Intimação tácita projetada (remessa {p['data_remessa_portal']} + 10 dias corridos)")
    if not intim:
        return None, None, "Sem data de intimação identificada"
    dobro = p.get("prazo_em_dobro", True)
    dias = p["prazo_judicial_dias"] * (2 if dobro else 1)
    obs.append(f"{p['prazo_judicial_dias']} dias{' em dobro' if dobro else ''} = {dias} dias úteis")
    return intim, somar_uteis(proximo_util(intim), dias), "; ".join(obs)


def status(venc, hoje):
    if not venc:
        return "SEM PRAZO", None
    r = uteis_entre(hoje, venc)
    if venc < hoje:
        return "VENCIDO", r
    if r <= 5:
        return "CRÍTICO", r
    if r <= 10:
        return "ATENÇÃO", r
    return "EM DIA", r


def primeiro_assistido(assistidos):
    return assistidos.split(" x ")[0].split(",")[0].split("(")[0].replace(" e outros", "").strip()


def nome_curto(assistidos):
    partes = primeiro_assistido(assistidos).split()
    if len(partes) < 2:
        return " ".join(partes).title()
    return f"{partes[0]} {partes[-1]}".title()


def id_providencia(p):
    return f"{p.get('processo', '')}|{p.get('inserido_por', '').split(' (')[0]}|{p.get('data_insercao', '')}"


def montar_linhas(provs, hoje):
    linhas = []
    for p in provs:
        intim, venc, obs_calc = calcular(p)
        st, rest = status(venc, hoje)
        prov = parse(p.get("prazo_providencia"))
        if venc and prov:
            comp = "OK: providência antes do prazo real" if prov <= venc else "ATENÇÃO: providência depois do prazo real"
        elif venc:
            comp = "Providência sem data"
        else:
            comp = ""
        linhas.append(dict(p=p, id=id_providencia(p), intim=intim, venc=venc, prov=prov, st=st, rest=rest,
                           comp=comp, obs_calc=obs_calc))
    linhas.sort(key=lambda l: (ORDEM.index(l["st"]), l["venc"] or date.max, l["prov"] or date.max))
    return linhas


def marcar_vinculos(linhas):
    """Agrupa providências do mesmo processo (iguais ou complementares) e do mesmo assistido."""
    por_proc, por_assist = {}, {}
    for l in linhas:
        por_proc.setdefault(l["p"]["processo"], []).append(l)
        por_assist.setdefault(primeiro_assistido(l["p"]["assistidos"]).upper(), set()).add(l["p"]["processo"])
    g = 0
    for grupo in por_proc.values():
        for l in grupo:
            l["vinc"], l["cor_vinc"] = "", None
        if len(grupo) > 1:
            iguais = any(x["p"].get("duplicada", "").upper().startswith("SIM") for x in grupo)
            rot = (f"IGUAIS: {len(grupo)} providências com a mesma tarefa" if iguais
                   else f"MESMO PROCESSO: {len(grupo)} providências complementares")
            cor = PALETA_GRUPOS[g % len(PALETA_GRUPOS)]
            g += 1
            for l in grupo:
                l["vinc"], l["cor_vinc"] = rot, cor
    for l in linhas:
        n = len(por_assist[primeiro_assistido(l["p"]["assistidos"]).upper()])
        if n > 1:
            extra = f"MESMO ASSISTIDO em {n} processos"
            l["vinc"] = f"{l['vinc']} | {extra}" if l["vinc"] else extra
            l["cor_vinc"] = l["cor_vinc"] or "E2EFDA"
    posicao = {id(l): i for i, l in enumerate(linhas)}
    rank = {}
    for l in linhas:
        rank.setdefault(l["p"]["processo"], posicao[id(l)])
    linhas.sort(key=lambda l: (rank[l["p"]["processo"]], posicao[id(l)]))
    grupos = [gr for gr in por_proc.values() if len(gr) > 1]
    return len(grupos), sum(len(gr) for gr in grupos)


def carregar_anotacoes(pasta):
    """Base em dados/anotacoes.json; o que estiver nas planilhas da pasta (mais recente por último) prevalece."""
    caminho = DADOS / "anotacoes.json"
    notas = json.loads(caminho.read_text(encoding="utf-8")) if caminho.exists() else {}
    arquivos = sorted((f for f in pasta.glob("*.xlsx") if not f.name.startswith("~$")),
                      key=lambda f: f.stat().st_mtime)
    for arq in arquivos:
        try:
            ws = load_workbook(arq, read_only=True, data_only=True)["Resumo"]
        except Exception:
            continue
        cab = [c.value for c in next(ws.iter_rows(min_row=LINHA_CAB, max_row=LINHA_CAB))]
        if "ID" not in cab or "Minhas anotações" not in cab:
            continue
        i_id, i_and, i_ano = cab.index("ID"), cab.index("Meu andamento"), cab.index("Minhas anotações")
        for row in ws.iter_rows(min_row=LINHA_CAB + 1, values_only=True):
            if len(row) <= i_id or not row[i_id]:
                continue
            andamento = (row[i_and] or "").strip() if isinstance(row[i_and], str) else ""
            andamento = "" if andamento == "A fazer" else andamento
            anotacao = (row[i_ano] or "").strip() if isinstance(row[i_ano], str) else ""
            antigo = notas.get(row[i_id], {})
            if andamento != antigo.get("andamento", "") or anotacao != antigo.get("anotacao", ""):
                notas[row[i_id]] = {**antigo, "andamento": andamento, "anotacao": anotacao,
                                    "editado_em": datetime.fromtimestamp(arq.stat().st_mtime).strftime("%d/%m/%Y %H:%M")}
    return notas


def salvar_anotacoes(notas, linhas):
    for l in linhas:
        if l["id"] in notas:
            notas[l["id"]].update(assistido=nome_curto(l["p"]["assistidos"]), processo=l["p"]["processo"],
                                  acao=l["p"].get("acao", ""))
    (DADOS / "anotacoes.json").write_text(json.dumps(notas, ensure_ascii=False, indent=2), encoding="utf-8")


def celula(ws, r, c, v, bold=False, cor=None, fundo=None, h="left", size=11, wrap=True, borda=True):
    x = ws.cell(row=r, column=c, value=v)
    x.font = Font(bold=bold, color=cor, size=size, name="Calibri")
    if fundo:
        x.fill = PatternFill("solid", fgColor=fundo)
    x.alignment = Alignment(horizontal=h, vertical="center", wrap_text=wrap)
    if borda:
        x.border = BORDA
    return x


def faixa_titulo(ws, texto, subtitulo, ultima_col):
    ws.merge_cells(start_row=1, start_column=1, end_row=1, end_column=ultima_col)
    celula(ws, 1, 1, texto, bold=True, cor="FFFFFF", fundo=VERDE, size=16, borda=False)
    ws.row_dimensions[1].height = 34
    ws.merge_cells(start_row=2, start_column=1, end_row=2, end_column=ultima_col)
    celula(ws, 2, 1, subtitulo, cor="595959", size=10, borda=False)
    ws.sheet_view.showGridLines = False


def aba_resumo(wb, dados, linhas, hoje, notas):
    ws = wb.active
    ws.title = "Resumo"
    n_grupos, n_vinc = marcar_vinculos(linhas)
    faixa_titulo(ws, "Controle de Prazos DOL  |  9ª Defensoria Ribeirão Preto",
                 f"Responsável: {dados.get('responsavel', '')}   |   Atualizado em "
                 f"{datetime.now().strftime('%d/%m/%Y às %H:%M')}   |   Somente leitura do DOL   |   "
                 f"Colunas amarelas (Meu andamento e Minhas anotações) são suas: edite e salve", 11)
    for col, w in zip("ABCDEFGHIJKL", [13, 13, 10, 14, 18, 30, 26, 44, 34, 20, 46, 4]):
        ws.column_dimensions[col].width = w
    ws.column_dimensions["L"].hidden = True

    contagem = {k: sum(1 for l in linhas if l["st"] == k) for k in ORDEM}
    processos = len({l["p"]["processo"] for l in linhas})
    futuros = [l for l in linhas if l["venc"] and l["venc"] >= hoje]
    prox = min(futuros, key=lambda l: l["venc"]) if futuros else None
    com_prov = [l for l in linhas if l["prov"] and l["prov"] >= hoje]
    pp = min(com_prov, key=lambda l: l["prov"]) if com_prov else None
    feitas = sum(1 for l in linhas if notas.get(l["id"], {}).get("andamento") == "Protocolado / concluído")
    cards = [
        ("Providências", len(linhas), "404040", "F2F2F2"),
        ("Processos", processos, "404040", "F2F2F2"),
        ("Vencidos", contagem["VENCIDO"], "FFFFFF", CORES["VENCIDO"][0]),
        ("Críticos\n(até 5 d.u.)", contagem["CRÍTICO"], "FFFFFF", CORES["CRÍTICO"][0]),
        ("Atenção\n(6 a 10 d.u.)", contagem["ATENÇÃO"], "000000", CORES["ATENÇÃO"][0]),
        ("Vinculadas / duplicadas", f"{n_vinc} em {n_grupos} processos" if n_grupos else "nenhuma",
         "000000", PALETA_GRUPOS[0]),
        ("Próximo vencimento real",
         f"{br(prox['venc'])}\n{nome_curto(prox['p']['assistidos'])}" if prox else "-", "FFFFFF", VERDE),
        ("Próximo prazo de providência",
         f"{br(pp['prov'])}\n{nome_curto(pp['p']['assistidos'])}" if pp else "-", "000000", "FFE699"),
        ("Marcadas por mim como concluídas", f"{feitas} de {len(linhas)}", "000000", "C6EFCE"),
    ]
    colunas_cards = [1, 2, 3, 4, 5, 6, 7, 8, 10]
    for c, (rot, val, fg, bg) in zip(colunas_cards, cards):
        celula(ws, 4, c, rot, bold=True, cor=fg, fundo=bg, h="center", size=9)
        celula(ws, 5, c, val, bold=True, cor=fg, fundo=bg, h="center", size=18 if c < 6 else 11)
    ws.merge_cells(start_row=4, start_column=10, end_row=4, end_column=11)
    ws.merge_cells(start_row=5, start_column=10, end_row=5, end_column=11)
    ws.row_dimensions[4].height = 30
    ws.row_dimensions[5].height = 40

    celula(ws, 7, 1, "Próximos prazos  (providências do mesmo processo aparecem juntas, com a mesma cor em Vínculo)",
           bold=True, cor=VERDE, size=12, borda=False)
    ws.merge_cells("A7:K7")
    for i, h in enumerate(CAB_RESUMO, 1):
        fundo_cab = "BF9000" if i in (COL_ANDAMENTO, COL_ANOTACAO) else VERDE
        celula(ws, LINHA_CAB, i, h, bold=True, cor="FFFFFF", fundo=fundo_cab, h="center")
    ws.row_dimensions[LINHA_CAB].height = 30

    r = LINHA_CAB + 1
    for l in linhas:
        p = l["p"]
        bg, fg = CORES[l["st"]]
        fundo = "F7F7F7" if r % 2 else None
        celula(ws, r, 1, l["st"], bold=True, cor=fg, fundo=bg, h="center")
        celula(ws, r, 2, br(l["venc"]) or "-", bold=True, fundo=fundo, h="center")
        celula(ws, r, 3, l["rest"] if l["rest"] is not None else "-", bold=True, fundo=fundo, h="center")
        prov_txt = p.get("prazo_providencia") or "sem data"
        x = celula(ws, r, 4, prov_txt, fundo=fundo, h="center")
        if "depois" in l["comp"] or prov_txt == "sem data" and l["venc"]:
            x.font = Font(bold=True, color="C00000")
        celula(ws, r, 5, nome_curto(p["assistidos"]), bold=True, fundo=l["cor_vinc"] or fundo)
        celula(ws, r, 6, l["vinc"] or "-", bold=bool(l["vinc"]), fundo=l["cor_vinc"] or fundo, size=9,
               h="left" if l["vinc"] else "center")
        celula(ws, r, 7, p.get("processo", ""), fundo=fundo, size=10)
        acao = p.get("acao") or (p.get("pedido", "")[:110] + ("..." if len(p.get("pedido", "")) > 110 else ""))
        celula(ws, r, 8, acao, fundo=fundo, size=10)
        alerta = p.get("alerta_curto") or (p.get("alertas", "")[:90] + ("..." if len(p.get("alertas", "")) > 90 else ""))
        celula(ws, r, 9, alerta or "-", cor="C00000" if alerta else "A6A6A6", bold=bool(alerta), fundo=fundo,
               size=10, h="left" if alerta else "center")
        nota = notas.get(l["id"], {})
        celula(ws, r, COL_ANDAMENTO, nota.get("andamento") or "A fazer", bold=True, fundo=COR_EDITAVEL,
               h="center", size=10)
        celula(ws, r, COL_ANOTACAO, nota.get("anotacao", ""), fundo=COR_EDITAVEL, size=10)
        celula(ws, r, COL_ID, l["id"], size=8, cor="FFFFFF")
        ws.row_dimensions[r].height = 44
        r += 1
    fim_tabela = r - 1

    if linhas:
        faixa = f"{get_column_letter(COL_ANDAMENTO)}{LINHA_CAB + 1}:{get_column_letter(COL_ANDAMENTO)}{fim_tabela}"
        dv = DataValidation(type="list", formula1='"' + ",".join(ANDAMENTOS) + '"', allow_blank=True,
                            showErrorMessage=False)
        dv.add(faixa)
        ws.add_data_validation(dv)
        col = get_column_letter(COL_ANDAMENTO)
        for texto, cor in ANDAMENTOS.items():
            ws.conditional_formatting.add(faixa, FormulaRule(
                formula=[f'{col}{LINHA_CAB + 1}="{texto}"'], fill=PatternFill("solid", fgColor=cor)))
        ws.conditional_formatting.add(f"C{LINHA_CAB + 1}:C{fim_tabela}", DataBarRule(
            start_type="num", start_value=0, end_type="max", color="70AD47", showValue=True))
    ws.freeze_panes = f"A{LINHA_CAB + 1}"

    grafico(wb, ws, linhas, hoje, fim_tabela + 2)
    return contagem


def grafico(wb, ws, linhas, hoje, linha):
    por_proc = {}
    for l in linhas:
        if l["venc"]:
            por_proc.setdefault(l["p"]["processo"], []).append(l)
    itens = []
    for grupo in por_proc.values():
        provs = [uteis_entre(hoje, g["prov"]) for g in grupo if g["prov"]]
        nome = nome_curto(grupo[0]["p"]["assistidos"])
        if len(grupo) > 1:
            nome += f" ({len(grupo)} providências)"
        if not provs:
            nome += " (providência sem data)"
        itens.append((nome, min(provs) if provs else None, min(g["rest"] for g in grupo)))
    itens.sort(key=lambda i: i[2])

    wd = wb.create_sheet("_graficos")
    wd.append(["Processo", "Até o prazo da providência", "Até o vencimento real"])
    for it in itens:
        wd.append(list(it))
    wd.sheet_state = "hidden"

    celula(ws, linha, 1, "Quantos dias úteis faltam em cada processo", bold=True, cor=VERDE, size=12, borda=False)
    celula(ws, linha + 1, 1, "Amarelo: até o prazo interno da providência.   Verde: até o vencimento real no "
           "processo.   Quanto menor a barra, mais urgente.", cor="595959", size=10, borda=False, wrap=False)
    if not itens:
        return
    barra = BarChart()
    barra.type = "bar"
    barra.add_data(Reference(wd, min_col=2, max_col=3, min_row=1, max_row=len(itens) + 1), titles_from_data=True)
    barra.set_categories(Reference(wd, min_col=1, min_row=2, max_row=len(itens) + 1))
    barra.legend.position = "t"
    barra.x_axis.scaling.orientation = "maxMin"
    barra.x_axis.delete = False
    barra.x_axis.majorTickMark = "none"
    barra.y_axis.scaling.min = 0
    barra.y_axis.majorGridlines = None
    barra.y_axis.delete = True
    barra.gapWidth = 60
    barra.overlap = 0
    for serie, cor in zip(barra.series, ["FFC000", VERDE]):
        serie.graphicalProperties.solidFill = cor
        serie.graphicalProperties.line.noFill = True
        serie.dLbls = DataLabelList()
        serie.dLbls.showVal = True
        serie.dLbls.showSerName = False
        serie.dLbls.showCatName = False
        serie.dLbls.showLegendKey = False
        serie.dLbls.showPercent = False
        serie.dLbls.position = "outEnd"
    barra.height = 3.5 + 1.4 * len(itens)
    barra.width = 24
    ws.add_chart(barra, f"A{linha + 2}")


def aba_detalhes(wb, linhas, notas):
    ws = wb.create_sheet("Detalhes")
    cab = [("Status", 12), ("Dias úteis", 9), ("Vence (real)", 12), ("Prazo providência", 12),
           ("Comparação", 22), ("Assistido(s)", 30), ("Vínculo", 26), ("Processo (CNJ)", 25), ("PA", 13),
           ("O que foi pedido", 60), ("Alertas", 45), ("Minhas anotações", 40), ("Informações processuais", 55),
           ("Intimação da DPE", 15), ("Prazo judicial", 16), ("Cálculo", 32), ("Vara", 22),
           ("Tipo", 14), ("Inserida por / em", 24)]
    faixa_titulo(ws, "Detalhamento das providências",
                 "Colunas N a S ficam recolhidas: clique no + acima das colunas para expandir.  "
                 "As anotações aqui são cópia: edite na aba Resumo", len(cab))
    for i, (h, w) in enumerate(cab, 1):
        celula(ws, 4, i, h, bold=True, cor="FFFFFF", fundo=VERDE, h="center")
        ws.column_dimensions[get_column_letter(i)].width = w
    ws.row_dimensions[4].height = 32
    ws.column_dimensions.group("N", "S", hidden=True, outline_level=1)

    for r, l in enumerate(linhas, 5):
        p = l["p"]
        intim_txt = br(l["intim"]) + (" (tácita projetada)" if l["intim"] and not p.get("data_intimacao") else "")
        nota = notas.get(l["id"], {})
        nota_txt = " | ".join(x for x in (nota.get("andamento", ""), nota.get("anotacao", "")) if x)
        vals = [l["st"], l["rest"], br(l["venc"]), p.get("prazo_providencia") or "sem data", l["comp"],
                p.get("assistidos", ""), l["vinc"], p.get("processo", ""), p.get("pa", ""), p.get("pedido", ""),
                p.get("alertas", ""), nota_txt, p.get("info_processual", ""), intim_txt,
                p.get("prazo_judicial_txt", ""), l["obs_calc"], p.get("vara", ""), p.get("tipo", ""),
                f"{p.get('inserido_por', '')} em {p.get('data_insercao', '')}"]
        fundo = "F7F7F7" if r % 2 else None
        for i, v in enumerate(vals, 1):
            x = celula(ws, r, i, v, fundo=fundo, size=10, h="center" if i <= 4 or i in (9, 14) else "left")
            x.alignment = Alignment(horizontal=x.alignment.horizontal, vertical="top", wrap_text=True)
        bg, fg = CORES[l["st"]]
        celula(ws, r, 1, l["st"], bold=True, cor=fg, fundo=bg, h="center")
        if l["cor_vinc"]:
            for c in (6, 7):
                ws.cell(row=r, column=c).fill = PatternFill("solid", fgColor=l["cor_vinc"])
        if "depois" in l["comp"] or "sem data" in l["comp"]:
            ws.cell(row=r, column=5).font = Font(bold=True, color="C00000", size=10)
        if p.get("alertas"):
            ws.cell(row=r, column=11).font = Font(bold=True, color="C00000", size=10)
    ws.freeze_panes = "G5"
    ws.auto_filter.ref = f"A4:{get_column_letter(len(cab))}{4 + len(linhas)}"


def aba_anotacoes_encerradas(wb, linhas, notas):
    atuais = {l["id"] for l in linhas}
    antigas = [(k, v) for k, v in notas.items() if k not in atuais and (v.get("anotacao") or v.get("andamento"))]
    ws = wb.create_sheet("Anotações encerradas")
    faixa_titulo(ws, "Anotações de providências que saíram da lista do DOL",
                 "Guardadas automaticamente para consulta", 5)
    cab = [("Assistido", 20), ("Processo", 26), ("O que era", 50), ("Meu andamento", 22), ("Minhas anotações", 60)]
    for i, (h, w) in enumerate(cab, 1):
        celula(ws, 4, i, h, bold=True, cor="FFFFFF", fundo=VERDE, h="center")
        ws.column_dimensions[get_column_letter(i)].width = w
    for r, (_, v) in enumerate(antigas, 5):
        for i, k in enumerate(["assistido", "processo", "acao", "andamento", "anotacao"], 1):
            celula(ws, r, i, v.get(k, ""), size=10)
    if not antigas:
        celula(ws, 5, 1, "Nenhuma por enquanto.", cor="808080", borda=False)


def aba_historico(wb, dados, contagem, total):
    hist_path = DADOS / "historico.json"
    hist = json.loads(hist_path.read_text(encoding="utf-8")) if hist_path.exists() else []
    hist.append({"execucao": datetime.now().strftime("%d/%m/%Y %H:%M"), "total": total, **contagem,
                 "mudancas": dados.get("mudancas_desde_ultima", "")})
    hist_path.write_text(json.dumps(hist, ensure_ascii=False, indent=2), encoding="utf-8")

    ws = wb.create_sheet("Histórico")
    cab = [("Execução", 17), ("Total", 8), ("Vencido", 9), ("Crítico", 9), ("Atenção", 9), ("Em dia", 9),
           ("Sem prazo", 10), ("Mudanças desde a última execução", 95)]
    faixa_titulo(ws, "Histórico das execuções", "Mais recente primeiro", len(cab))
    for i, (h, w) in enumerate(cab, 1):
        celula(ws, 4, i, h, bold=True, cor="FFFFFF", fundo=VERDE, h="center")
        ws.column_dimensions[get_column_letter(i)].width = w
    for r, h in enumerate(reversed(hist), 5):
        for i, k in enumerate(["execucao", "total", *ORDEM, "mudancas"], 1):
            celula(ws, r, i, h.get(k, ""), size=10, h="left" if i == 8 else "center")
    ws.freeze_panes = "A5"


def aba_regras(wb):
    ws = wb.create_sheet("Regras de cálculo")
    faixa_titulo(ws, "Regras usadas no cálculo", "A planilha é de conferência: confirme sempre nos autos", 1)
    ws.column_dimensions["A"].width = 130
    regras = [
        "Intimação pessoal da Defensoria pelo portal eletrônico: vale na data em que a intimação é aberta no DOL.",
        "Sem abertura, a intimação é tácita 10 dias corridos após a remessa ao portal (Lei 11.419/2006, art. 5º, §3º).",
        "O prazo começa no primeiro dia útil seguinte à intimação.",
        "Prazo em dobro para a Defensoria (CPC, art. 186) e contagem em dias úteis (CPC, art. 219).",
        "Recesso forense de 20/12 a 20/01 com prazos suspensos (CPC, art. 220).",
        "Feriados e suspensões considerados: scripts/prazos_dol/dados/feriados.json. Conferir comunicados do TJSP.",
        "Despacho sem prazo fixado: usa-se o número cadastrado no DOL e o cenário do prazo legal de 5 dias "
        "(CPC, art. 218, §3º) aparece em Alertas.",
        "Duas intimações do mesmo ato: conta-se da primeira, por segurança.",
        "Status: VENCIDO (já passou), CRÍTICO (até 5 dias úteis), ATENÇÃO (6 a 10), EM DIA (mais de 10), "
        "SEM PRAZO (sem prazo processual).",
        "Vínculo: IGUAIS = mesma tarefa lançada mais de uma vez; MESMO PROCESSO = providências diferentes no mesmo "
        "processo; MESMO ASSISTIDO = a pessoa tem providências em mais de um processo.",
        "Anotações: as colunas amarelas da aba Resumo são suas. Salve o arquivo (Ctrl+S) depois de editar; a rotina "
        "lê as anotações antes de gerar a nova versão e guarda cópia em dados/anotacoes.json.",
    ]
    for i, t in enumerate(regras, 4):
        celula(ws, i, 1, f"{i - 3}. {t}", borda=False)
        ws.row_dimensions[i].height = 30


def main():
    saida = Path(sys.argv[1]) if len(sys.argv) > 1 else SAIDA_PADRAO
    saida.parent.mkdir(parents=True, exist_ok=True)
    hoje = date.today()
    dados = json.loads((DADOS / "providencias.json").read_text(encoding="utf-8"))
    linhas = montar_linhas(dados["providencias"], hoje)
    notas = carregar_anotacoes(saida.parent)
    salvar_anotacoes(notas, linhas)

    wb = Workbook()
    contagem = aba_resumo(wb, dados, linhas, hoje, notas)
    aba_detalhes(wb, linhas, notas)
    aba_anotacoes_encerradas(wb, linhas, notas)
    aba_historico(wb, dados, contagem, len(linhas))
    aba_regras(wb)
    wb.move_sheet("_graficos", offset=10)

    try:
        wb.save(saida)
        print(f"OK: {saida}")
    except PermissionError:
        alt = saida.with_name(f"{saida.stem} ({datetime.now().strftime('%Y-%m-%d %Hh%M')}){saida.suffix}")
        wb.save(alt)
        print(f"Planilha principal aberta no Excel; salvo em: {alt}")
    print(f"Anotações preservadas: {sum(1 for v in notas.values() if v.get('anotacao') or v.get('andamento'))}")
    for l in linhas:
        print(f"{l['st']:9} | {br(l['venc']) or '-':10} | prov {l['p'].get('prazo_providencia') or 'sem data':10} | "
              f"{nome_curto(l['p']['assistidos']):15} | {l['vinc']}")


if __name__ == "__main__":
    main()
