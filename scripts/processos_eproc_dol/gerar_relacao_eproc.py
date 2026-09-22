"""Gera a relação dos processos da 9ª DPE Ribeirão Preto que tramitam no eproc do TJSP.

Uso: python gerar_relacao_eproc.py [caminho_saida.xlsx]
Lê dados/processos.json, extraído do DOL em modo somente leitura: lista de processos ativos da 9ª Defensoria
(com a marcação de sistema que o DOL mostra em cada linha) e as certidões de migração encontradas nas
movimentações do e-SAJ de cada número. A planilha traz a relação eproc, o resumo com gráficos, a conferência
de todos os PAs e a metodologia.
"""
import json
import sys
from collections import Counter
from datetime import datetime
from pathlib import Path

from openpyxl import Workbook
from openpyxl.chart import BarChart, Reference
from openpyxl.chart.label import DataLabelList
from openpyxl.chart.series import DataPoint
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter

BASE = Path(__file__).parent
DADOS = BASE / "dados"
SAIDA_PADRAO = Path.home() / "Downloads" / "3. Processos eproc 9ª DPE" / "Processos eproc 9ª DPE.xlsx"

VERDE = "009632"
FINO = Side(style="thin", color="D9D9D9")
BORDA = Border(left=FINO, right=FINO, top=FINO, bottom=FINO)

INICIADO = "Iniciado no eproc"
MIGRADO_OK = "Migrado do e-SAJ (DOL já indica eproc)"
MIGRADO_ESAJ = "Migrado do e-SAJ (DOL ainda indica e-SAJ)"
INCIDENTE = "Incidente migrado com número próprio"
EPROC_SEM_REG = "eproc no DOL, sem certidão de migração"
CATEGORIAS = [INICIADO, MIGRADO_OK, MIGRADO_ESAJ, INCIDENTE, EPROC_SEM_REG]
CORES = {INICIADO: "1F4E79", MIGRADO_OK: "375623", MIGRADO_ESAJ: "C55A11", INCIDENTE: "7030A0", EPROC_SEM_REG: "7F6000"}
FUNDOS = {INICIADO: "DDEBF7", MIGRADO_OK: "E2EFDA", MIGRADO_ESAJ: "FCE4D6", INCIDENTE: "E4DFEC", EPROC_SEM_REG: "FFF2CC"}
ESAJ = "e-SAJ, sem certidão de migração"
ESAJ_INCIDENTE = "e-SAJ; incidente vinculado foi para o eproc"
ESAJ_SEM_MOV = "e-SAJ no DOL, sem movimentações para conferir"
FORA_TJSP = "Fora do TJSP"
SEM_CNJ = "Sem número de processo no DOL"


def dt(s):
    return datetime.strptime(s, "%d/%m/%Y")


def carregar():
    dados = json.loads((DADOS / "processos.json").read_text(encoding="utf-8"))
    estruturas, acoes = dados["estruturas"], dados["acoes"]

    def expandir(x):
        return {"id": x["i"], "pa": x.get("p") or "", "cnj": x.get("c") or "",
                "sis": {"E": "eproc", "S": "e-SAJ"}.get(x.get("s"), ""),
                "est": [e for e in estruturas[x["e"]].split("|") if e], "acao": acoes[x["a"]],
                "ult_data": x.get("u", ""), "ult": x.get("t", ""), "sem_mov": bool(x.get("m")),
                "sem_acesso": bool(x.get("x")), "migr": [{"data": d, "numero": n} for d, n in x.get("g", [])],
                "extra": x.get("o", ""), "nomes": x.get("n", []), "nomes_ficha": bool(x.get("nf")),
                "correlatos": x.get("cr", ""), "data_arq": x.get("d", "")}

    return dados, [expandir(x) for x in dados["pas"]], [expandir(x) for x in dados["arquivados"]]


def migr_principal(p):
    return [m for m in p["migr"] if not m["numero"] or m["numero"] == p["cnj"]]


def migr_incidentes(p):
    return [m for m in p["migr"] if m["numero"] and m["numero"] != p["cnj"]]


def ultima(datas):
    return max(datas, key=dt) if datas else ""


def itens_eproc(p):
    """Números que estão no eproc a partir de um PA: o próprio número e os incidentes migrados com número próprio."""
    itens = []
    if not p["cnj"]:
        return itens
    principal = migr_principal(p)
    if p["sis"] == "eproc":
        cat = MIGRADO_OK if principal else INICIADO if p["sem_mov"] else EPROC_SEM_REG
        itens.append((p["cnj"], cat, ultima([m["data"] for m in principal])))
    elif principal:
        itens.append((p["cnj"], MIGRADO_ESAJ, ultima([m["data"] for m in principal])))
    for m in migr_incidentes(p):
        itens.append((m["numero"], INCIDENTE, m["data"]))
    return itens


def resultado(p):
    if not p["cnj"]:
        return SEM_CNJ
    proprio = [cat for num, cat, _ in itens_eproc(p) if num == p["cnj"]]
    if proprio:
        return proprio[0]
    if migr_incidentes(p):
        return ESAJ_INCIDENTE
    if ".8.26." not in p["cnj"]:
        return FORA_TJSP
    return ESAJ_SEM_MOV if p["sem_mov"] else ESAJ


def relacao(pas):
    grupos = {}
    for p in pas:
        for numero, cat, data in itens_eproc(p):
            g = grupos.setdefault(numero, {"numero": numero, "itens": []})
            g["itens"].append({"pa": p, "cat": cat, "data": data})
    for g in grupos.values():
        proprios = [i for i in g["itens"] if i["cat"] != INCIDENTE]
        g["cat"] = proprios[0]["cat"] if proprios else INCIDENTE
        g["data"] = ultima([i["data"] for i in g["itens"] if i["data"]])
    return grupos


def mapa_foros(pas):
    mapa = {}
    for p in pas:
        if p["cnj"] and len(p["est"]) >= 3 and p["est"][2].startswith("Foro"):
            mapa.setdefault(p["cnj"][-4:], p["est"][2])
    return mapa


def foro_vara(p, foros, numero=None):
    est = [e for e in p["est"] if e != "Primeira Instância"]
    if est and est[0] == "Segunda Instância":
        return "Segunda Instância"
    if len(est) >= 3:
        return " / ".join(est[1:])
    foro = est[1] if len(est) == 2 else foros.get((numero or p["cnj"])[-4:], "")
    return f"{foro} (vara não informada no DOL)" if foro else "Não informado no DOL"


def nomes(p):
    return "; ".join(dict.fromkeys(p["nomes"]))


def celula(ws, r, c, v, bold=False, cor=None, fundo=None, h="left", size=10, wrap=True, borda=True, v_al="top"):
    x = ws.cell(row=r, column=c, value=v)
    x.font = Font(bold=bold, color=cor, size=size, name="Calibri")
    if fundo:
        x.fill = PatternFill("solid", fgColor=fundo)
    x.alignment = Alignment(horizontal=h, vertical=v_al, wrap_text=wrap)
    if borda:
        x.border = BORDA
    return x


def faixa(ws, titulo, subtitulo, ultima_col):
    ws.merge_cells(start_row=1, start_column=1, end_row=1, end_column=ultima_col)
    celula(ws, 1, 1, titulo, bold=True, cor="FFFFFF", fundo=VERDE, size=15, borda=False, v_al="center")
    ws.row_dimensions[1].height = 32
    ws.merge_cells(start_row=2, start_column=1, end_row=2, end_column=ultima_col)
    celula(ws, 2, 1, subtitulo, cor="595959", size=10, borda=False, wrap=False)
    ws.sheet_view.showGridLines = False


def cabecalho(ws, linha, colunas):
    for i, (h, w) in enumerate(colunas, 1):
        celula(ws, linha, i, h, bold=True, cor="FFFFFF", fundo=VERDE, h="center", v_al="center")
        ws.column_dimensions[get_column_letter(i)].width = w
    ws.row_dimensions[linha].height = 44


def colorir(serie, cores):
    serie.graphicalProperties.line.noFill = True
    for idx, cor in enumerate(cores):
        ponto = DataPoint(idx=idx)
        ponto.graphicalProperties.solidFill = cor
        ponto.graphicalProperties.line.noFill = True
        serie.dPt.append(ponto)


def rotulos_barras(serie):
    serie.dLbls = DataLabelList()
    serie.dLbls.showVal = True
    for k in ("showSerName", "showCatName", "showLegendKey", "showPercent"):
        setattr(serie.dLbls, k, False)


def observacoes(g):
    obs = []
    for i in g["itens"]:
        p = i["pa"]
        if i["cat"] == INCIDENTE and g["cat"] == INCIDENTE:
            if migr_principal(p):
                situacao = "; o número cadastrado no PA também foi para o eproc e tem linha própria"
            elif p["ult"]:
                situacao = f"; o número cadastrado no PA continua no e-SAJ, com último andamento '{p['ult']}' em {p['ult_data']}"
            else:
                situacao = "; o número cadastrado no PA continua no e-SAJ"
            obs.append(f"A certidão de migração deste número está nas movimentações do PA {p['pa'] or p['id']}, "
                       f"cadastrado com o número {p['cnj']}{situacao}")
        elif i["cat"] == INCIDENTE:
            obs.append(f"Também é citado como incidente migrado nas movimentações do PA {p['pa'] or p['id']} "
                       f"(número {p['cnj']})")
            continue
        if i["cat"] == MIGRADO_ESAJ:
            obs.append("No DOL o número ainda aparece como e-SAJ, sem o botão Pasta Digital Eproc")
        datas = sorted({m["data"] for m in migr_principal(p)}, key=dt) if i["cat"] != INCIDENTE else []
        if len(datas) > 1:
            obs.append(f"O e-SAJ registra mais de uma certidão de migração ({', '.join(datas)})")
        if p["extra"]:
            obs.append(p["extra"])
        if p["nomes_ficha"]:
            obs.append("Nomes lidos na aba de partes do PA, porque a lista do DOL não os mostra")
    if g["cat"] == INICIADO:
        obs.append("Sem nenhuma movimentação do e-SAJ no DOL: o processo já nasceu no eproc")
    return ". ".join(dict.fromkeys(obs))


def aba_relacao(wb, grupos, foros):
    ws = wb.create_sheet("Processos eproc")
    cols = [("Nº", 5), ("Número do processo no eproc", 27), ("Nº do PA no DOL", 14),
            ("Número cadastrado no PA (se diferente)", 25), ("Origem no eproc", 26), ("Remessa ao eproc", 12),
            ("Sistema indicado no DOL", 12), ("Foro / Vara (DOL)", 34), ("Ação (DOL)", 24),
            ("Partes / assistidos (DOL)", 36), ("Pasta Digital Eproc no DOL", 22), ("Observações", 62)]
    faixa(ws, "Processos no eproc  |  9ª Defensoria da Unidade Ribeirão Preto",
          f"{len(grupos)} números de processo   |   Um número por linha   |   Use os filtros do cabeçalho", len(cols))
    cabecalho(ws, 4, cols)
    ordem = {c: i for i, c in enumerate(CATEGORIAS)}
    lista = sorted(grupos.values(), key=lambda g: (ordem[g["cat"]], g["numero"]))
    for n, g in enumerate(lista, 1):
        r = 4 + n
        proprios = [i for i in g["itens"] if i["cat"] != INCIDENTE] or g["itens"]
        p = proprios[0]["pa"]
        pas = list(dict.fromkeys(i["pa"]["pa"] or i["pa"]["id"] for i in proprios))
        cadastrados = [i["pa"]["cnj"] for i in proprios if i["pa"]["cnj"] != g["numero"]]
        if g["cat"] == INCIDENTE:
            sistema, pasta = "Sem PA próprio", "Sem PA próprio no DOL"
        elif p["sis"] == "eproc":
            sistema = "eproc"
            pasta = "Aviso de acesso indisponível" if p["sem_acesso"] else "Botão disponível"
        else:
            sistema, pasta = "e-SAJ", "Sem botão (DOL trata como e-SAJ)"
        vals = [n, g["numero"], "\n".join(pas), "\n".join(dict.fromkeys(cadastrados)) or "-", g["cat"], g["data"] or "-",
                sistema, foro_vara(p, foros, g["numero"]), p["acao"],
                "\n".join(dict.fromkeys(nomes(i["pa"]) for i in proprios if nomes(i["pa"]))) or "-",
                pasta, observacoes(g)]
        fundo = "F7F7F7" if n % 2 == 0 else None
        for c, v in enumerate(vals, 1):
            celula(ws, r, c, v, fundo=fundo, bold=c == 2, h="center" if c in (1, 3, 6, 7) else "left")
        celula(ws, r, 5, g["cat"], bold=True, cor=CORES[g["cat"]], fundo=FUNDOS[g["cat"]])
        if pasta.startswith("Aviso"):
            ws.cell(row=r, column=11).font = Font(color="C00000", size=10, name="Calibri")
        texto = max(len(vals[11]) / 58, len(vals[9]) / 34, len(vals[7]) / 32)
        ws.row_dimensions[r].height = min(max(30, 14 * (int(texto) + 1)), 180)
    ws.freeze_panes = "C5"
    ws.auto_filter.ref = f"A4:{get_column_letter(len(cols))}{4 + len(lista)}"
    return lista


def aba_resumo(wb, dados, grupos, pas):
    ws = wb.active
    ws.title = "Resumo"
    faixa(ws, "Processos no eproc  |  9ª Defensoria Ribeirão Preto",
          f"Extraído do DOL em {dados['extraido_em']}   |   Somente leitura: nada foi alterado no DOL   |   "
          f"Consulta feita com o usuário {dados.get('usuario', '')}", 10)
    for col, w in zip("ABCDEFGHIJ", [40, 12, 10, 14, 14, 14, 14, 14, 14, 14]):
        ws.column_dimensions[col].width = w

    cont = Counter(g["cat"] for g in grupos.values())
    migrados = cont[MIGRADO_OK] + cont[MIGRADO_ESAJ] + cont[INCIDENTE]
    cnjs = {p["cnj"] for p in pas if p["cnj"]}
    no_eproc = {p["cnj"] for p in pas if resultado(p) in CATEGORIAS}
    cards = [("Processos no eproc", len(grupos), "FFFFFF", VERDE, 1),
             ("Iniciados no eproc", cont[INICIADO], "FFFFFF", CORES[INICIADO], 2),
             ("Migrados do e-SAJ", migrados, "FFFFFF", "375623", 4),
             ("Migrados que o DOL\nainda mostra como e-SAJ", cont[MIGRADO_ESAJ], "FFFFFF", CORES[MIGRADO_ESAJ], 6),
             ("Incidentes com número\npróprio no eproc", cont[INCIDENTE], "FFFFFF", CORES[INCIDENTE], 8)]
    for rot, val, fg, bg, c in cards:
        if c > 1:
            ws.merge_cells(start_row=4, start_column=c, end_row=4, end_column=c + 1)
            ws.merge_cells(start_row=5, start_column=c, end_row=5, end_column=c + 1)
        celula(ws, 4, c, rot, bold=True, cor=fg, fundo=bg, h="center", size=9, v_al="center")
        celula(ws, 5, c, val, bold=True, cor=fg, fundo=bg, h="center", size=20, v_al="center")
    ws.row_dimensions[4].height = 30
    ws.row_dimensions[5].height = 40
    celula(ws, 6, 1, f"Dos {len(cnjs)} números de processo cadastrados nos {len(pas)} PAs ativos da 9ª, {len(no_eproc)} "
           f"({len(no_eproc) / len(cnjs):.0%}) já estão no eproc. Somam-se {cont[INCIDENTE]} incidentes que foram para o "
           "eproc com número próprio.", cor="404040", size=10, borda=False, wrap=False)

    celula(ws, 8, 1, "Quantidade de processos no eproc, por origem", bold=True, cor=VERDE, size=12, borda=False,
           wrap=False)
    for i, h in enumerate(["Origem", "Processos", "%"], 1):
        celula(ws, 9, i, h, bold=True, cor="FFFFFF", fundo=VERDE, h="center", v_al="center")
    cats = [c for c in CATEGORIAS if cont[c] or c != EPROC_SEM_REG]
    r = 10
    for cat in cats:
        celula(ws, r, 1, cat, bold=True, cor=CORES[cat], fundo=FUNDOS[cat])
        celula(ws, r, 2, cont[cat], h="center", bold=True)
        celula(ws, r, 3, cont[cat] / len(grupos), h="center").number_format = "0%"
        r += 1
    celula(ws, r, 1, "Total", bold=True, fundo="F2F2F2")
    celula(ws, r, 2, len(grupos), bold=True, fundo="F2F2F2", h="center")
    celula(ws, r, 3, 1, bold=True, fundo="F2F2F2", h="center").number_format = "0%"
    fim_cat = r

    graf = BarChart()
    graf.type = "bar"
    graf.style = 10
    graf.title = "Processos da 9ª no eproc, por origem"
    graf.add_data(Reference(ws, min_col=2, min_row=9, max_row=fim_cat - 1), titles_from_data=True)
    graf.set_categories(Reference(ws, min_col=1, min_row=10, max_row=fim_cat - 1))
    graf.legend = None
    graf.x_axis.scaling.orientation = "maxMin"
    graf.x_axis.delete = False
    graf.y_axis.delete = True
    graf.y_axis.majorGridlines = None
    graf.gapWidth = 50
    colorir(graf.series[0], [CORES[c] for c in cats])
    rotulos_barras(graf.series[0])
    graf.height, graf.width = 7.5, 17
    ws.add_chart(graf, "E8")

    r = fim_cat + 4
    celula(ws, r, 1, "Acervo ativo da 9ª por sistema (números cadastrados nos PAs)", bold=True, cor=VERDE, size=12,
           borda=False, wrap=False)
    r += 1
    ini_sis = r
    for i, h in enumerate(["Sistema", "Processos", "%"], 1):
        celula(ws, r, i, h, bold=True, cor="FFFFFF", fundo=VERDE, h="center", v_al="center")
    por_cnj = {}
    for p in pas:
        if p["cnj"]:
            por_cnj.setdefault(p["cnj"], resultado(p))
    sistemas = Counter("eproc" if c in CATEGORIAS else FORA_TJSP if c == FORA_TJSP else "e-SAJ"
                       for c in por_cnj.values())
    linhas = [("eproc", sistemas["eproc"]), ("e-SAJ", sistemas["e-SAJ"]), (FORA_TJSP, sistemas[FORA_TJSP])]
    for rot, v in linhas:
        r += 1
        celula(ws, r, 1, rot, bold=True)
        celula(ws, r, 2, v, h="center", bold=True)
        celula(ws, r, 3, v / len(por_cnj), h="center").number_format = "0%"
    r += 1
    celula(ws, r, 1, "Total de números", bold=True, fundo="F2F2F2")
    celula(ws, r, 2, len(por_cnj), bold=True, fundo="F2F2F2", h="center")
    celula(ws, r, 3, 1, bold=True, fundo="F2F2F2", h="center").number_format = "0%"
    sem_cnj = sum(1 for p in pas if not p["cnj"])
    if sem_cnj:
        celula(ws, r + 1, 1, f"Além deles, {sem_cnj} PA ativo sem número de processo no DOL.", cor="808080", size=9,
               borda=False, wrap=False)

    graf2 = BarChart()
    graf2.type = "col"
    graf2.style = 10
    graf2.title = "Acervo ativo da 9ª por sistema"
    graf2.add_data(Reference(ws, min_col=2, min_row=ini_sis, max_row=ini_sis + len(linhas)), titles_from_data=True)
    graf2.set_categories(Reference(ws, min_col=1, min_row=ini_sis + 1, max_row=ini_sis + len(linhas)))
    graf2.legend = None
    graf2.y_axis.delete = True
    graf2.y_axis.majorGridlines = None
    graf2.x_axis.delete = False
    graf2.gapWidth = 80
    colorir(graf2.series[0], [VERDE, "7F7F7F", "BFBFBF"])
    rotulos_barras(graf2.series[0])
    graf2.height, graf2.width = 7.5, 17
    ws.add_chart(graf2, f"E{fim_cat + 9}")

    r = max(r + 3, fim_cat + 26)
    celula(ws, r, 1, "Remessas do e-SAJ ao eproc por mês", bold=True, cor=VERDE, size=12, borda=False, wrap=False)
    r += 1
    for i, h in enumerate(["Mês", "Processos"], 1):
        celula(ws, r, i, h, bold=True, cor="FFFFFF", fundo=VERDE, h="center", v_al="center")
    meses = Counter(g["data"][3:] for g in grupos.values() if g["data"])
    for mes in sorted(meses, key=lambda m: (m[3:], m[:2])):
        r += 1
        celula(ws, r, 1, mes, h="center")
        celula(ws, r, 2, meses[mes], h="center", bold=True)
    ws.freeze_panes = "A4"
    return cont, sistemas


def primeira_remessa(pas):
    return min((dt(m["data"]) for p in pas for m in p["migr"]), default=None)


def andamento_antigo(p, limite):
    return bool(limite and resultado(p) == ESAJ and p["ult_data"] and dt(p["ult_data"]) < limite)


def aba_conferencia(wb, pas, foros):
    ws = wb.create_sheet("Conferência (todos)")
    limite = primeira_remessa(pas)
    cols = [("Número cadastrado no PA", 26), ("Nº do PA", 14), ("Sistema indicado no DOL", 12),
            ("Resultado da conferência", 38), ("Número no eproc (se diferente)", 25), ("Remessa ao eproc", 12),
            ("Último andamento no e-SAJ (data)", 13), ("Foro / Vara (DOL)", 40), ("Ação (DOL)", 36),
            ("Observação", 40)]
    faixa(ws, "Conferência de todos os PAs ativos da 9ª",
          f"{len(pas)} PAs   |   Cada linha é um PA do DOL   |   Filtre a coluna D para ver cada grupo", len(cols))
    cabecalho(ws, 4, cols)
    ordem = {c: i for i, c in enumerate(CATEGORIAS + [ESAJ_INCIDENTE, ESAJ, ESAJ_SEM_MOV, FORA_TJSP, SEM_CNJ])}
    lista = sorted(pas, key=lambda p: (ordem[resultado(p)], p["cnj"] or "~", p["id"]))
    for n, p in enumerate(lista, 1):
        r = 4 + n
        res = resultado(p)
        itens = itens_eproc(p)
        outros = [num for num, cat, _ in itens if num != p["cnj"]]
        remessa = ultima([d for _, _, d in itens if d])
        obs = [p["extra"]] if p["extra"] else []
        antigo = andamento_antigo(p, limite)
        if antigo:
            obs.append(f"Último andamento no e-SAJ anterior à primeira remessa ao eproc encontrada "
                       f"({limite:%d/%m/%Y}): vale conferir no tribunal")
        vals = [p["cnj"] or "(sem número)", p["pa"] or p["id"],
                {"eproc": "eproc", "e-SAJ": "e-SAJ"}.get(p["sis"], "sem indicação"), res, "\n".join(outros) or "-",
                remessa or "-", "-" if p["sem_mov"] else p["ult_data"] or "-", foro_vara(p, foros), p["acao"],
                ". ".join(obs)]
        fundo = "F7F7F7" if n % 2 == 0 else None
        for c, v in enumerate(vals, 1):
            celula(ws, r, c, v, fundo=fundo, h="center" if c in (2, 3, 6, 7) else "left", wrap=c in (5, 8, 9, 10))
        if res in FUNDOS:
            celula(ws, r, 4, res, bold=True, cor=CORES[res], fundo=FUNDOS[res])
        elif res == ESAJ_INCIDENTE:
            celula(ws, r, 4, res, bold=True, cor=CORES[INCIDENTE], fundo=fundo)
        if antigo:
            ws.cell(row=r, column=10).font = Font(color="C00000", size=10, name="Calibri")
    ws.freeze_panes = "B5"
    ws.auto_filter.ref = f"A4:{get_column_letter(len(cols))}{4 + len(lista)}"


def aba_arquivados(wb, arquivados, foros):
    ws = wb.create_sheet("Arquivados no DOL (eproc)")
    cols = [("Número do processo", 26), ("Nº do PA", 14), ("PA arquivado em", 13), ("Remessa ao eproc", 13),
            ("Foro / Vara (DOL)", 40), ("Ação (DOL)", 26), ("Partes / assistidos (DOL)", 40)]
    faixa(ws, "PAs já arquivados na 9ª que o DOL indica como eproc",
          "Apenas para informação: não entram na relação principal", len(cols))
    cabecalho(ws, 4, cols)
    for n, p in enumerate(arquivados, 1):
        vals = [p["cnj"], p["pa"] or p["id"], p["data_arq"], ultima([m["data"] for m in p["migr"]]) or "-",
                foro_vara(p, foros), p["acao"], nomes(p)]
        for c, v in enumerate(vals, 1):
            celula(ws, 4 + n, c, v, h="center" if c in (2, 3, 4) else "left")
    if not arquivados:
        celula(ws, 5, 1, "Nenhum.", cor="808080", borda=False)


def aba_metodo(wb, dados, pas):
    n_pas = len(pas)
    limite = primeira_remessa(pas)
    antigos = sum(1 for p in pas if andamento_antigo(p, limite))
    ws = wb.create_sheet("Como foi feito")
    faixa(ws, "Como a relação foi montada", "Consulta feita somente em modo leitura no DOL", 1)
    ws.column_dimensions["A"].width = 135
    t = dados.get("totais", {})
    linhas = [
        f"Fonte: DOL, Acompanhamento de Processo da 9ª Defensoria da UNIDADE RIBEIRÃO PRETO, consulta de "
        f"{dados['extraido_em']}. Foram lidas por inteiro as listas de processos ativos ({t.get('ATIVO', 0)}), novos "
        f"({t.get('NOVO', 0)}), redistribuídos ({t.get('REDISTRIBUIDO', 0)}) e arquivados ({t.get('ARQUIVADO', 0)}). "
        f"Os novos e os redistribuídos também constam da lista de ativos, então a base é de {n_pas} PAs.",
        "Sistema indicado no DOL: em cada linha da lista, o DOL mostra o botão 'Pasta Digital Eproc' para os números que "
        "reconhece como eproc e os botões da pasta e da capa do e-SAJ para os demais. Essa marcação foi lida linha a linha.",
        "Processos que saíram do e-SAJ: para cada número foram lidas as movimentações do e-SAJ que o DOL guarda. A "
        "certidão 'Remetidos os autos em razão de migração para outro sistema' informa que o processo passa a tramitar "
        "no eproc do TJSP e traz o número. Todas as certidões encontradas mencionam o eproc.",
        "Incidentes: a tela de movimentações do DOL junta os andamentos do processo principal com os dos incidentes "
        "(cumprimento de sentença, por exemplo). Quando a certidão de migração traz número diferente do cadastrado no PA, "
        "quem foi para o eproc foi o incidente, com esse número próprio. Ele entra na relação com o número do eproc e a "
        "indicação do PA de origem.",
        f"{INICIADO}: o DOL indica eproc e não há nenhuma movimentação do e-SAJ para o número.",
        f"{MIGRADO_OK}: há a certidão de migração do próprio número e o DOL já mostra o botão da Pasta Digital Eproc.",
        f"{MIGRADO_ESAJ}: há a certidão de migração do próprio número, mas o DOL continua tratando o número como "
        "e-SAJ. São os casos que ficariam de fora de um pedido feito só pela marcação do DOL.",
        f"{INCIDENTE}: incidente de um processo acompanhado pela 9ª que foi para o eproc com número diferente do "
        "cadastrado no PA.",
        "Menções ao eproc sem certidão de migração (por exemplo, carta precatória para tribunal que só recebe petição "
        "pelo eproc) foram conferidas uma a uma e não indicam mudança de sistema.",
        "Pasta Digital Eproc no DOL: em todos os números que o DOL reconhece como eproc, a lista mostra ao usuário da "
        "consulta o aviso 'O seu acesso à pasta digital deste processo não está disponível', com a orientação de pedir ao "
        "suporte da CTI a análise da vinculação aos Foros. O aviso depende do perfil de quem consulta.",
        "Foro / Vara: copiados do cadastro do PA no DOL. Quando o DOL não traz a vara, aparece o foro correspondente ao "
        "código do número. Ação e partes também são os do DOL; nomes sem CPF.",
        "Limites: o DOL não guarda movimentações do eproc, então a data da remessa é a da certidão no e-SAJ. PAs "
        "arquivados na 9ª não tiveram as movimentações conferidas; os que o DOL já marca como eproc estão em aba própria. "
        "Processos de outros tribunais (fora do TJSP) não têm movimentações no DOL e não entram na relação.",
        f"Pontos para conferir: {antigos} processos classificados como e-SAJ têm o último andamento no DOL anterior à "
        f"primeira remessa ao eproc encontrada ({limite:%d/%m/%Y}). Neles, a falta da certidão de migração não basta "
        "para afirmar que continuam no e-SAJ; estão marcados em vermelho na coluna Observação da aba "
        "'Conferência (todos)'.",
        "Nenhum dado foi incluído, alterado ou excluído no DOL: foram feitas apenas consultas de leitura.",
    ]
    for i, texto in enumerate(linhas, 4):
        celula(ws, i, 1, f"{i - 3}. {texto}", borda=False, size=11)
        ws.row_dimensions[i].height = 16 * (len(texto) // 120 + 1) + 6


def main():
    saida = Path(sys.argv[1]) if len(sys.argv) > 1 else SAIDA_PADRAO
    saida.parent.mkdir(parents=True, exist_ok=True)
    dados, pas, arquivados = carregar()
    foros = mapa_foros(pas)
    grupos = relacao(pas)

    wb = Workbook()
    cont, sistemas = aba_resumo(wb, dados, grupos, pas)
    aba_relacao(wb, grupos, foros)
    aba_conferencia(wb, pas, foros)
    aba_arquivados(wb, arquivados, foros)
    aba_metodo(wb, dados, pas)

    try:
        wb.save(saida)
        print(f"OK: {saida}")
    except PermissionError:
        alt = saida.with_name(f"{saida.stem} ({datetime.now().strftime('%Y-%m-%d %Hh%M')}){saida.suffix}")
        wb.save(alt)
        print(f"Planilha principal aberta no Excel; salvo em: {alt}")
    print(f"Números no eproc: {len(grupos)} | {dict(cont)}")
    print(f"Acervo por sistema: {dict(sistemas)}")
    print(f"Resultado por PA: {dict(Counter(resultado(p) for p in pas))}")


if __name__ == "__main__":
    main()
