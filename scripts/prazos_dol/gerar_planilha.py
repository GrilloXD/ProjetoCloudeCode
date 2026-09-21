"""Gera a planilha de controle de prazos das providências do DOL.

Uso: python gerar_planilha.py [caminho_saida.xlsx]
Lê dados/providencias.json e dados/feriados.json; acrescenta a execução em dados/historico.json.
"""
import json
import sys
from datetime import date, datetime, timedelta
from pathlib import Path

from openpyxl import Workbook
from openpyxl.chart import BarChart, PieChart, Reference
from openpyxl.chart.label import DataLabelList
from openpyxl.chart.series import DataPoint
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter

BASE = Path(__file__).parent
DADOS = BASE / "dados"
SAIDA_PADRAO = Path.home() / "Downloads" / "Controle de Prazos DOL" / "Controle de Prazos DOL.xlsx"

VERDE = "009632"
VERDE_CLARO = "E8F5EC"
ORDEM = ["VENCIDO", "CRÍTICO", "ATENÇÃO", "EM DIA", "SEM PRAZO"]
CORES = {
    "VENCIDO": ("C00000", "FFFFFF"),
    "CRÍTICO": ("ED7D31", "FFFFFF"),
    "ATENÇÃO": ("FFC000", "000000"),
    "EM DIA": ("70AD47", "FFFFFF"),
    "SEM PRAZO": ("A6A6A6", "FFFFFF"),
}
FINO = Side(style="thin", color="D9D9D9")
BORDA = Border(left=FINO, right=FINO, top=FINO, bottom=FINO)


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


def nome_curto(assistidos):
    primeiro = assistidos.split(" x ")[0].split(",")[0].split("(")[0].replace(" e outros", "").strip()
    partes = primeiro.split()
    if len(partes) < 2:
        return primeiro.title()
    return f"{partes[0]} {partes[-1]}".title()


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
        linhas.append(dict(p=p, intim=intim, venc=venc, prov=prov, st=st, rest=rest, comp=comp, obs_calc=obs_calc))
    linhas.sort(key=lambda l: (ORDEM.index(l["st"]), l["venc"] or date.max, l["prov"] or date.max))
    return linhas


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


def aba_resumo(wb, dados, linhas, hoje):
    ws = wb.active
    ws.title = "Resumo"
    faixa_titulo(ws, "Controle de Prazos DOL  |  9ª Defensoria Ribeirão Preto",
                 f"Responsável: {dados.get('responsavel', '')}   |   Atualizado em "
                 f"{datetime.now().strftime('%d/%m/%Y às %H:%M')}   |   Somente leitura do DOL", 10)
    for col, w in zip("ABCDEFGHIJ", [13, 13, 11, 14, 22, 27, 45, 38, 2, 2]):
        ws.column_dimensions[col].width = w

    contagem = {k: sum(1 for l in linhas if l["st"] == k) for k in ORDEM}
    processos = len({l["p"]["processo"] for l in linhas})
    futuros = [l for l in linhas if l["venc"] and l["venc"] >= hoje]
    prox = min(futuros, key=lambda l: l["venc"]) if futuros else None
    cards = [
        ("Providências", len(linhas), "404040", "F2F2F2"),
        ("Processos", processos, "404040", "F2F2F2"),
        ("Vencidos", contagem["VENCIDO"], "FFFFFF", CORES["VENCIDO"][0]),
        ("Críticos (até 5 d.u.)", contagem["CRÍTICO"], "FFFFFF", CORES["CRÍTICO"][0]),
        ("Atenção (6 a 10 d.u.)", contagem["ATENÇÃO"], "000000", CORES["ATENÇÃO"][0]),
        ("Próximo vencimento real", f"{br(prox['venc'])}\n{nome_curto(prox['p']['assistidos'])}" if prox else "-",
         "FFFFFF", VERDE),
    ]
    com_prov = [l for l in linhas if l["prov"] and l["prov"] >= hoje]
    pp = min(com_prov, key=lambda l: l["prov"]) if com_prov else None
    cards.append(("Próximo prazo de providência",
                  f"{br(pp['prov'])}\n{nome_curto(pp['p']['assistidos'])}" if pp else "-", "000000", "FFE699"))
    for c, (rot, val, fg, bg) in enumerate(cards, 1):
        celula(ws, 4, c, rot, bold=True, cor=fg, fundo=bg, h="center", size=9)
        celula(ws, 5, c, val, bold=True, cor=fg, fundo=bg, h="center", size=18 if c < 6 else 12)
    ws.row_dimensions[4].height = 28
    ws.row_dimensions[5].height = 44

    celula(ws, 7, 1, "Próximos prazos (ordenados pela urgência do prazo real)", bold=True, cor=VERDE, size=13, borda=False)
    ws.merge_cells("A7:H7")
    cab = ["Status", "Vence (real)", "Dias úteis", "Prazo da providência", "Assistido", "Processo",
           "O que fazer", "Alerta"]
    for i, h in enumerate(cab, 1):
        celula(ws, 8, i, h, bold=True, cor="FFFFFF", fundo=VERDE, h="center")
    ws.row_dimensions[8].height = 30

    r = 9
    for l in linhas:
        p = l["p"]
        bg, fg = CORES[l["st"]]
        fundo = VERDE_CLARO if r % 2 else None
        celula(ws, r, 1, l["st"], bold=True, cor=fg, fundo=bg, h="center")
        celula(ws, r, 2, br(l["venc"]) or "-", bold=True, fundo=fundo, h="center")
        celula(ws, r, 3, l["rest"] if l["rest"] is not None else "-", fundo=fundo, h="center")
        prov_txt = p.get("prazo_providencia") or "sem data"
        x = celula(ws, r, 4, prov_txt, fundo=fundo, h="center")
        if "depois" in l["comp"] or prov_txt == "sem data" and l["venc"]:
            x.font = Font(bold=True, color="C00000")
        dup = "  (duplicada)" if p.get("duplicada", "").upper().startswith("SIM") else ""
        celula(ws, r, 5, nome_curto(p["assistidos"]) + dup, bold=True, fundo=fundo)
        celula(ws, r, 6, p.get("processo", ""), fundo=fundo, size=10)
        acao = p.get("acao") or (p.get("pedido", "")[:110] + ("..." if len(p.get("pedido", "")) > 110 else ""))
        celula(ws, r, 7, acao, fundo=fundo, size=10)
        alerta = p.get("alerta_curto") or (p.get("alertas", "")[:90] + ("..." if len(p.get("alertas", "")) > 90 else ""))
        celula(ws, r, 8, alerta, cor="C00000" if alerta else None, fundo=fundo, size=10)
        ws.row_dimensions[r].height = 42
        r += 1
    fim_tabela = r - 1
    ws.freeze_panes = "A9"

    wd = wb.create_sheet("_graficos")
    wd.append(["Status", "Quantidade"])
    for k in ORDEM:
        wd.append([k.title(), contagem[k]])
    wd.append([])
    wd.append(["Processo", "Até o prazo da providência", "Até o vencimento real"])
    vistos, ini_bar = set(), wd.max_row + 1
    for l in sorted([l for l in linhas if l["venc"]], key=lambda l: l["venc"]):
        chave = (l["p"]["processo"], l["venc"])
        if chave in vistos:
            continue
        vistos.add(chave)
        ate_prov = uteis_entre(hoje, l["prov"]) if l["prov"] else None
        wd.append([nome_curto(l["p"]["assistidos"]), ate_prov, l["rest"]])
    fim_bar = wd.max_row
    wd.sheet_state = "hidden"

    pizza = PieChart()
    pizza.title = "Providências por status"
    pizza.add_data(Reference(wd, min_col=2, min_row=1, max_row=6), titles_from_data=True)
    pizza.set_categories(Reference(wd, min_col=1, min_row=2, max_row=6))
    for i, k in enumerate(ORDEM):
        pt = DataPoint(idx=i)
        pt.graphicalProperties.solidFill = CORES[k][0]
        pizza.series[0].dPt.append(pt)
    pizza.dataLabels = DataLabelList()
    pizza.dataLabels.showVal = True
    pizza.height, pizza.width = 10, 9.5
    ws.add_chart(pizza, f"A{fim_tabela + 3}")

    if fim_bar >= ini_bar:
        barra = BarChart()
        barra.type = "bar"
        barra.title = "Dias úteis restantes: prazo da providência x prazo real"
        barra.add_data(Reference(wd, min_col=2, max_col=3, min_row=ini_bar - 1, max_row=fim_bar),
                       titles_from_data=True)
        barra.set_categories(Reference(wd, min_col=1, min_row=ini_bar, max_row=fim_bar))
        barra.legend.position = "b"
        barra.y_axis.title = "dias úteis a partir de hoje"
        barra.y_axis.majorGridlines = None
        barra.x_axis.scaling.orientation = "maxMin"
        barra.y_axis.delete = False
        barra.x_axis.delete = False
        barra.series[0].graphicalProperties.solidFill = "FFC000"
        barra.series[1].graphicalProperties.solidFill = VERDE
        barra.gapWidth = 60
        barra.dataLabels = DataLabelList()
        barra.dataLabels.showVal = True
        barra.height, barra.width = 10, 18
        ws.add_chart(barra, f"E{fim_tabela + 3}")
    return contagem


def aba_detalhes(wb, dados, linhas):
    ws = wb.create_sheet("Detalhes")
    cab = [("Status", 12), ("Dias úteis", 9), ("Vence (real)", 12), ("Prazo providência", 12),
           ("Comparação", 22), ("Assistido(s)", 30), ("Processo (CNJ)", 25), ("PA", 13),
           ("O que foi pedido", 60), ("Alertas", 45), ("Informações processuais", 55),
           ("Intimação da DPE", 15), ("Prazo judicial", 16), ("Cálculo", 32), ("Vara", 22),
           ("Tipo", 14), ("Inserida por / em", 24), ("Duplicada?", 20)]
    faixa_titulo(ws, "Detalhamento das providências",
                 "Colunas L a R ficam recolhidas: clique no botão + acima das colunas para expandir", len(cab))
    for i, (h, w) in enumerate(cab, 1):
        celula(ws, 4, i, h, bold=True, cor="FFFFFF", fundo=VERDE, h="center")
        ws.column_dimensions[get_column_letter(i)].width = w
    ws.row_dimensions[4].height = 32
    ws.column_dimensions.group("L", "R", hidden=True, outline_level=1)

    for r, l in enumerate(linhas, 5):
        p = l["p"]
        intim_txt = br(l["intim"]) + (" (tácita projetada)" if l["intim"] and not p.get("data_intimacao") else "")
        vals = [l["st"], l["rest"], br(l["venc"]), p.get("prazo_providencia") or "sem data", l["comp"],
                p.get("assistidos", ""), p.get("processo", ""), p.get("pa", ""), p.get("pedido", ""),
                p.get("alertas", ""), p.get("info_processual", ""), intim_txt, p.get("prazo_judicial_txt", ""),
                l["obs_calc"], p.get("vara", ""), p.get("tipo", ""),
                f"{p.get('inserido_por', '')} em {p.get('data_insercao', '')}", p.get("duplicada", "")]
        fundo = VERDE_CLARO if r % 2 else None
        for i, v in enumerate(vals, 1):
            x = celula(ws, r, i, v, fundo=fundo, size=10, h="center" if i <= 4 or i in (8, 12) else "left")
            x.alignment = Alignment(horizontal=x.alignment.horizontal, vertical="top", wrap_text=True)
        bg, fg = CORES[l["st"]]
        celula(ws, r, 1, l["st"], bold=True, cor=fg, fundo=bg, h="center")
        if "depois" in l["comp"] or "sem data" in l["comp"]:
            ws.cell(row=r, column=5).font = Font(bold=True, color="C00000", size=10)
        if p.get("alertas"):
            ws.cell(row=r, column=10).font = Font(bold=True, color="C00000", size=10)
    ws.freeze_panes = "G5"
    ws.auto_filter.ref = f"A4:{get_column_letter(len(cab))}{4 + len(linhas)}"


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
    ]
    for i, t in enumerate(regras, 4):
        celula(ws, i, 1, f"{i - 3}. {t}", borda=False)
        ws.row_dimensions[i].height = 22


def main():
    saida = Path(sys.argv[1]) if len(sys.argv) > 1 else SAIDA_PADRAO
    saida.parent.mkdir(parents=True, exist_ok=True)
    hoje = date.today()
    dados = json.loads((DADOS / "providencias.json").read_text(encoding="utf-8"))
    linhas = montar_linhas(dados["providencias"], hoje)

    wb = Workbook()
    contagem = aba_resumo(wb, dados, linhas, hoje)
    aba_detalhes(wb, dados, linhas)
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
    for l in linhas:
        print(f"{l['st']:9} | {br(l['venc']) or '-':10} | prov {l['p'].get('prazo_providencia') or 'sem data':10} | "
              f"{nome_curto(l['p']['assistidos'])}")


if __name__ == "__main__":
    main()
