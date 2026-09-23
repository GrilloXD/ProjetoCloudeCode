"""Gera a auditoria completa dos PAs da 9ª DPE Ribeirão Preto a partir da leitura do DOL (somente leitura).

Uso: python gerar_auditoria.py [caminho_saida.xlsx]
"""
import re
import sys
from collections import Counter
from datetime import datetime
from pathlib import Path

from openpyxl import Workbook
from openpyxl.chart import BarChart, Reference
from openpyxl.styles import Font
from openpyxl.utils import get_column_letter

from base_dol import RELEITURA, carregar, dt, foro_vara, grupo, representados
from gerar_relacao_eproc import (BORDA, CATEGORIAS, FORA_TJSP, INCIDENTE, MIGRADO_ESAJ, SEM_CNJ, VERDE, andamento_antigo,
                                 cabecalho, celula, colorir, faixa, itens_eproc, primeira_remessa, relacao, resultado,
                                 rotulos_barras, ultima)

SAIDA_PADRAO = Path.home() / "Downloads" / "3. Processos eproc 9ª DPE" / "Auditoria 9ª DPE.xlsx"
HOJE = datetime(2026, 9, 22)
CINZA = "F2F2F2"


def cnj_valido(n):
    m = re.fullmatch(r"(\d{7})-(\d{2})\.(\d{4})\.(\d)\.(\d{2})\.(\d{4})", n)
    if not m:
        return False
    seq, dv, ano, j, tr, orig = m.groups()
    return int(seq + ano + j + tr + orig + dv) % 97 == 1


def pa_txt(p):
    return p["pa"] or p["id"]


def linhas_altura(ws, r, textos_larguras, minimo=18, maximo=180):
    linhas = 1
    for texto, largura in textos_larguras:
        partes = str(texto or "").split("\n")
        linhas = max(linhas, sum(max(1, -(-len(x) // max(1, int(largura * 1.05)))) for x in partes))
    ws.row_dimensions[r].height = min(max(minimo, 13.5 * linhas + 4), maximo)


def titulo_secao(ws, r, texto, c=1):
    celula(ws, r, c, texto, bold=True, cor=VERDE, size=12, borda=False, wrap=False)


def cab_tabela(ws, r, titulos, c0=1):
    for i, h in enumerate(titulos):
        celula(ws, r, c0 + i, h, bold=True, cor="FFFFFF", fundo=VERDE, h="center", v_al="center")
    ws.row_dimensions[r].height = 30


def situacao_eproc(p):
    res = resultado(p)
    return "No eproc" if res in CATEGORIAS else res


def vinculos(meta, pas):
    por_pa = {p["pa"]: p for p in pas}
    por_cnj = {}
    for p in pas:
        if p["cnj"]:
            por_cnj.setdefault(p["cnj"], []).append(p)
    prov, agenda, intim = {}, {}, {}
    for r in meta["prov"]:
        p = por_pa.get(r[6])
        if p:
            prov.setdefault(p["id"], []).append(r)
    for r in meta["agenda"]:
        p = por_pa.get(r[3])
        if p:
            agenda.setdefault(p["id"], []).append(r)
    for r in meta["intim"]:
        for p in por_cnj.get(r[3], []):
            intim.setdefault(p["id"], []).append(r)
    return por_pa, por_cnj, prov, agenda, intim


def marcacoes(p):
    m = []
    if p["novo"]:
        m.append(f"Novo na 9ª (distribuído em {p['novo']})")
    if p["redist"]:
        m.append(f"Redistribuído à 9ª em {p['redist'][0]} (origem: {p['redist'][1]})")
    if p["urgente"]:
        m.append("Urgente")
    if p["sem_prov_judicial"]:
        m.append("Sem providência judicial adotada")
    if p["possui_arquivamento"]:
        m.append("Ficha do PA registra arquivamento")
    return m


def texto_andamentos(p):
    if p.get("sem_dado"):
        return "Sem número de processo: não há andamentos para consultar"
    if p["sem_mov"]:
        return "Nenhum andamento do e-SAJ no DOL"
    return "\n".join(f"{d}: {t}" for d, t in p["ult3"])


def texto_prov(rows):
    return "\n".join(f"{r[1]}, inserida em {r[0]}, prazo {r[2]}" + (", urgente" if r[3] == "Sim" else "")
                     for r in rows)


def texto_agenda(rows):
    return "\n".join(f"{r[0]}: {r[1]}" for r in rows)


def texto_intim(rows):
    return "\n".join(f"Disponibilizada em {r[0]}, intimação em {r[1]}, prazo {r[2]} ({r[4]})" for r in rows)


def tipos_contagem(pas):
    cont = {}
    for p in pas:
        c = cont.setdefault(p["tipo"], {"lista": 0, "corr": 0})
        c["corr" if p["pai"] else "lista"] += 1
    return sorted(cont.items(), key=lambda kv: (-(kv[1]["lista"] + kv[1]["corr"]), kv[0]))


def aba_resumo(wb, meta, pas, grupos, prov, agenda, intim):
    ws = wb.active
    ws.title = "Resumo"
    t = meta["totais"]
    faixa(ws, "Auditoria da 9ª Defensoria  |  Unidade Ribeirão Preto",
          f"Leitura do DOL de {meta['extraido_em']}   |   Somente leitura: nada foi alterado no DOL   |   "
          f"Consulta feita com o usuário {meta['usuario']}", 8)
    for col, w in zip("ABCDEFGH", [46, 13, 13, 13, 11, 34, 3, 12]):
        ws.column_dimensions[col].width = w

    total = len(pas)
    lista = [p for p in pas if not p["pai"]]
    cnjs = {p["cnj"] for p in pas if p["cnj"]}
    audiencias = sum(1 for r in meta["agenda"] if r[1].lower().startswith("audiência"))
    titulo_secao(ws, 4, "Visão geral")
    cab_tabela(ws, 5, ["Indicador", "Quantidade"])
    ws.merge_cells("C5:F5")
    celula(ws, 5, 3, "Observação", bold=True, cor="FFFFFF", fundo=VERDE, h="center", v_al="center")
    indicadores = [
        ("PAs ativos da 9ª", total, "Soma das duas linhas abaixo; é a base de todos os percentuais de tipo"),
        ("    na lista de processos ativos do DOL", len(lista),
         f"Inclui {t['NOVO']} PAs novos e {t['REDISTRIBUIDO']} redistribuídos à 9ª"),
        ("    só como correlatos dentro de outro PA", total - len(lista),
         "Aparecem na coluna 'Processos correlatos' de um PA da lista; nenhuma ficha indicou outra defensoria"),
        ("Números de processo distintos", len(cnjs),
         f"{sum(1 for p in pas if not p['cnj'])} PA sem número; "
         f"{sum(1 for v in Counter(p['cnj'] for p in pas if p['cnj']).values() if v > 1)} números estão em dois PAs"),
        ("Processos no eproc", len(grupos), "Detalhados na planilha 'Processos eproc 9ª DPE'"),
        ("Providências pendentes", len(meta["prov"]), "Aba 'Providências pendentes'"),
        ("Prazos e audiências na agenda", len(meta["agenda"]), f"{audiencias} audiências; aba 'Prazos e audiências'"),
        ("Intimações recebidas pendentes", len(meta["intim"]), "Aba 'Intimações pendentes'"),
        ("PAs arquivados da 9ª", t["ARQUIVADO"], "Não entram nos percentuais; resumo na aba 'Arquivados'"),
    ]
    r = 5
    for rot, val, obs in indicadores:
        r += 1
        destaque = not rot.startswith("    ")
        celula(ws, r, 1, rot, bold=destaque)
        celula(ws, r, 2, val, bold=destaque, h="center").number_format = "#,##0"
        ws.merge_cells(start_row=r, start_column=3, end_row=r, end_column=6)
        celula(ws, r, 3, obs, cor="595959", size=9, v_al="center")
        for c in range(4, 7):
            ws.cell(row=r, column=c).border = BORDA

    r += 3
    tipos = tipos_contagem(pas)
    titulo_secao(ws, r, f"Tipos de processo dos {total:,} PAs ativos".replace(",", "."))
    celula(ws, r + 1, 1, "Tipo = parte inicial da ação cadastrada no DOL; o detalhe de cada ação está na aba "
           "'Tipos (detalhe)'. Percentual sobre o total de PAs ativos.", cor="595959", size=9, borda=False, wrap=False)
    r += 2
    ini = r
    cab_tabela(ws, r, ["Tipo de processo", "Lista de ativos", "Correlatos", "Total de PAs", "% do total",
                       "Rótulo usado no gráfico"])
    for tipo, c in tipos:
        r += 1
        n = c["lista"] + c["corr"]
        fundo = "F7F7F7" if (r - ini) % 2 == 0 else None
        celula(ws, r, 1, tipo, bold=True, fundo=fundo)
        celula(ws, r, 2, c["lista"], h="center", fundo=fundo)
        celula(ws, r, 3, c["corr"], h="center", fundo=fundo)
        celula(ws, r, 4, n, h="center", bold=True, fundo=fundo)
        celula(ws, r, 5, n / total, h="center", bold=True, fundo=fundo).number_format = "0.0%"
        celula(ws, r, 6, f"{tipo}: {n} PA{'s' if n > 1 else ''}", cor="808080", size=9, fundo=fundo, wrap=False)
    fim = r
    r += 1
    celula(ws, r, 1, "Total", bold=True, fundo=CINZA)
    for c, v in ((2, len(lista)), (3, total - len(lista)), (4, total)):
        celula(ws, r, c, v, bold=True, fundo=CINZA, h="center").number_format = "#,##0"
    celula(ws, r, 5, 1, bold=True, fundo=CINZA, h="center").number_format = "0.0%"
    celula(ws, r, 6, "", fundo=CINZA)

    graf = BarChart()
    graf.type = "bar"
    graf.style = 10
    graf.title = f"Tipos de processo: % dos {total:,} PAs ativos da 9ª".replace(",", ".")
    graf.title.overlay = False
    graf.add_data(Reference(ws, min_col=5, min_row=ini, max_row=fim), titles_from_data=True)
    graf.set_categories(Reference(ws, min_col=6, min_row=ini + 1, max_row=fim))
    graf.legend = None
    graf.x_axis.scaling.orientation = "maxMin"
    graf.x_axis.delete = False
    graf.y_axis.delete = True
    graf.y_axis.majorGridlines = None
    graf.gapWidth = 40
    colorir(graf.series[0], [VERDE] * len(tipos))
    rotulos_barras(graf.series[0])
    graf.series[0].dLbls.numFmt = "0.0%"
    graf.height, graf.width = 13.5, 20
    ws.add_chart(graf, f"H{ini - 2}")

    r += 3
    titulo_secao(ws, r, "Sistema em que está o processo de cada PA")
    r += 1
    ini_sis = r
    cab_tabela(ws, r, ["Situação", "PAs", "% do total"])
    sit = Counter(situacao_eproc(p) for p in pas)
    ordem = ["No eproc", "e-SAJ, sem certidão de migração", "e-SAJ; incidente vinculado foi para o eproc",
             "e-SAJ no DOL, sem movimentações para conferir", FORA_TJSP, SEM_CNJ]
    for s in ordem:
        if sit[s]:
            r += 1
            celula(ws, r, 1, s, bold=s == "No eproc")
            celula(ws, r, 2, sit[s], h="center", bold=True)
            celula(ws, r, 3, sit[s] / total, h="center").number_format = "0.0%"
    r += 1
    celula(ws, r, 1, "Total", bold=True, fundo=CINZA)
    celula(ws, r, 2, total, bold=True, fundo=CINZA, h="center").number_format = "#,##0"
    celula(ws, r, 3, 1, bold=True, fundo=CINZA, h="center").number_format = "0.0%"
    inc = sum(1 for g in grupos.values() if g["cat"] == INCIDENTE)
    no_eproc = {p["cnj"] for p in pas if situacao_eproc(p) == "No eproc"}
    celula(ws, r + 1, 1, f"Os {sit['No eproc']} PAs no eproc correspondem a {len(no_eproc)} números (um número está em "
           f"dois PAs). Somados aos {inc} incidentes que foram para o eproc com número próprio, são os {len(grupos)} "
           "processos da planilha do eproc.", cor="595959", size=9, borda=False, wrap=False)

    r += 4
    titulo_secao(ws, r, "Marcações que o DOL mostra nos PAs ativos")
    r += 1
    cab_tabela(ws, r, ["Marcação", "PAs"])
    marc = [("Novo na 9ª", sum(1 for p in pas if p["novo"])),
            ("Redistribuído à 9ª", sum(1 for p in pas if p["redist"])),
            ("Urgente", sum(1 for p in pas if p["urgente"])),
            ("Sem providência judicial adotada", sum(1 for p in pas if p["sem_prov_judicial"])),
            ("Correlato cuja ficha registra arquivamento", sum(1 for p in pas if p["possui_arquivamento"])),
            ("Com providência pendente", len(prov)),
            ("Com prazo ou audiência na agenda", len(agenda)),
            ("Com intimação recebida pendente", len(intim))]
    for rot, v in marc:
        r += 1
        celula(ws, r, 1, rot)
        celula(ws, r, 2, v, h="center", bold=True)
    ws.freeze_panes = "A4"


def aba_tipos(wb, pas):
    ws = wb.create_sheet("Tipos (detalhe)")
    total = len(pas)
    cols = [("Tipo de processo", 30), ("Ação como está cadastrada no DOL", 70), ("Lista de ativos", 11),
            ("Correlatos", 11), ("Total de PAs", 11), ("% do total", 10)]
    faixa(ws, "Tipos de processo e ações cadastradas no DOL",
          f"{total} PAs ativos   |   Linha verde-clara = total do tipo; abaixo, cada ação como aparece no DOL",
          len(cols))
    cabecalho(ws, 4, cols)
    acoes = {}
    for p in pas:
        c = acoes.setdefault(p["tipo"], {}).setdefault(p["acao"] or "(ação não informada)", {"lista": 0, "corr": 0})
        c["corr" if p["pai"] else "lista"] += 1
    r = 4
    for tipo, c in tipos_contagem(pas):
        r += 1
        n = c["lista"] + c["corr"]
        for col, v in enumerate([tipo, f"{len(acoes[tipo])} ação(ões) no DOL", c["lista"], c["corr"], n, n / total], 1):
            x = celula(ws, r, col, v, bold=True, fundo="E2EFDA", h="left" if col < 3 else "center")
        x.number_format = "0.0%"
        for acao, a in sorted(acoes[tipo].items(), key=lambda kv: -(kv[1]["lista"] + kv[1]["corr"])):
            r += 1
            m = a["lista"] + a["corr"]
            for col, v in enumerate(["", acao, a["lista"], a["corr"], m, m / total], 1):
                x = celula(ws, r, col, v, h="left" if col < 3 else "center")
            x.number_format = "0.0%"
    r += 1
    for col, v in enumerate(["Total", "", sum(1 for p in pas if not p["pai"]), sum(1 for p in pas if p["pai"]),
                             total, 1], 1):
        x = celula(ws, r, col, v, bold=True, fundo=CINZA, h="left" if col < 3 else "center")
    x.number_format = "0.0%"
    ws.freeze_panes = "A5"


def aba_processos(wb, pas, grupos, por_id, prov, agenda, intim):
    ws = wb.create_sheet("Processos (todos)")
    cols = [("Nº do PA", 14), ("Número do processo", 26), ("Onde aparece no DOL", 28), ("Tipo", 20),
            ("Ação (DOL)", 34), ("Foro / Vara (DOL)", 34), ("Sistema indicado no DOL", 11),
            ("Situação quanto ao eproc", 28), ("Número no eproc, se diferente", 25), ("Remessa ao eproc", 12),
            ("Representados pela Defensoria (DOL)", 34), ("Número do controle (DOL)", 22), ("Marcações no DOL", 26),
            ("PAs correlatos", 32), ("Andamentos do e-SAJ no DOL", 11), ("Primeiro andamento", 12),
            ("Três andamentos mais recentes (data: título)", 46), ("Providências pendentes", 36),
            ("Prazos e audiências (data mostrada pelo DOL)", 32), ("Intimações recebidas pendentes", 36)]
    faixa(ws, "Todos os PAs ativos da 9ª",
          f"{len(pas)} PAs   |   Uma linha por PA   |   Use os filtros do cabeçalho", len(cols))
    cabecalho(ws, 4, cols)
    lista = sorted(pas, key=lambda p: (p["tipo"], p["cnj"] or "~", p["id"]))
    for n, p in enumerate(lista, 1):
        r = 4 + n
        itens = itens_eproc(p)
        outros = [num for num, _, _ in itens if num != p["cnj"]]
        correlatos = "\n".join(f"PA {pa_txt(por_id[f])} ({por_id[f]['cnj'] or 'sem número'})" if f in por_id
                               else f"PA {f}" for f in p["filhos"])
        vals = [pa_txt(p), p["cnj"] or "(sem número)", p["origem"], p["tipo"], p["acao"] or "(não informada)",
                foro_vara(p), p["sis"] or "sem indicação", resultado(p), "\n".join(outros) or "-",
                ultima([d for _, _, d in itens if d]) or "-", representados(p), p["controle"] or "-",
                "\n".join(marcacoes(p)) or "-", correlatos or "-", p["n"] if not p["sem_mov"] else 0,
                p["primeira"] or "-", texto_andamentos(p), texto_prov(prov.get(p["id"], [])) or "-",
                texto_agenda(agenda.get(p["id"], [])) or "-", texto_intim(intim.get(p["id"], [])) or "-"]
        fundo = "F7F7F7" if n % 2 == 0 else None
        for c, v in enumerate(vals, 1):
            celula(ws, r, c, v, fundo=fundo, bold=c == 2, h="center" if c in (1, 7, 10, 15, 16) else "left")
        if resultado(p) in CATEGORIAS:
            ws.cell(row=r, column=8).font = Font(bold=True, color=VERDE, size=10, name="Calibri")
        linhas_altura(ws, r, [(v, cols[c][1]) for c, v in enumerate(vals) if c in (2, 5, 10, 13, 16, 17, 18, 19)],
                      maximo=120)
    ws.freeze_panes = "C5"
    ws.auto_filter.ref = f"A4:{get_column_letter(len(cols))}{4 + len(lista)}"


def info_pa(p):
    if not p:
        return ["-", "-"]
    return [p["tipo"], p["origem"]]


def aba_providencias(wb, meta, por_pa):
    ws = wb.create_sheet("Providências pendentes")
    cols = [("Inserida em", 12), ("Tipo de providência", 22), ("Prazo", 12), ("Urgente", 9), ("Cumprida", 9),
            ("Número do processo", 26), ("Nº do PA", 14), ("Tipo do processo", 22), ("Onde aparece no DOL", 30),
            ("Responsável (DOL)", 32), ("Inserida por (DOL)", 34)]
    faixa(ws, "Providências pendentes da 9ª",
          f"{len(meta['prov'])} providências   |   Ordenadas pelo prazo   |   Dados como estão no DOL", len(cols))
    cabecalho(ws, 4, cols)
    rows = sorted(meta["prov"], key=lambda x: (dt(x[2]) if re.fullmatch(r"\d\d/\d\d/\d{4}", x[2]) else HOJE, x[6]))
    for n, x in enumerate(rows, 1):
        vals = [x[0], x[1], x[2] or "Sem prazo no DOL", x[3], x[4], x[5], x[6]] + info_pa(por_pa.get(x[6])) + [x[7] or "-", x[8]]
        fundo = "F7F7F7" if n % 2 == 0 else None
        for c, v in enumerate(vals, 1):
            celula(ws, 4 + n, c, v, fundo=fundo, h="center" if c in (1, 3, 4, 5, 7) else "left", bold=c == 3)
        if x[3] == "Sim":
            ws.cell(row=4 + n, column=4).font = Font(bold=True, color="C00000", size=10, name="Calibri")
        linhas_altura(ws, 4 + n, [(vals[8], 30)])
    ws.freeze_panes = "A5"
    ws.auto_filter.ref = f"A4:{get_column_letter(len(cols))}{4 + len(rows)}"


def data_agenda(s):
    m = re.match(r"(\d\d/\d\d/\d{4})(?: às (\d\d):(\d\d))?", s)
    if not m:
        return HOJE
    d = dt(m.group(1))
    return d.replace(hour=int(m.group(2) or 0), minute=int(m.group(3) or 0))


def aba_agenda(wb, meta, por_pa):
    ws = wb.create_sheet("Prazos e audiências")
    cols = [("Data mostrada pelo DOL", 20), ("Compromisso", 52), ("Número do processo", 26), ("Nº do PA", 14),
            ("Tipo do processo", 22), ("Onde aparece no DOL", 32)]
    faixa(ws, "Prazos e audiências pendentes na agenda da 9ª",
          f"{len(meta['agenda'])} compromissos   |   Nos itens 'Prazo - Providências' a data exibida nem sempre é o "
          "prazo final; o prazo de cada providência está na aba 'Providências pendentes'", len(cols))
    cabecalho(ws, 4, cols)
    rows = sorted(meta["agenda"], key=lambda x: data_agenda(x[0]))
    for n, x in enumerate(rows, 1):
        vals = [x[0], x[1], x[2], x[3]] + info_pa(por_pa.get(x[3]))
        fundo = "E2EFDA" if x[1].lower().startswith("audiência") else ("F7F7F7" if n % 2 == 0 else None)
        for c, v in enumerate(vals, 1):
            celula(ws, 4 + n, c, v, fundo=fundo, h="center" if c in (1, 4) else "left",
                   bold=x[1].lower().startswith("audiência") and c in (1, 2))
    celula(ws, 6 + len(rows), 1, "Linhas em verde: audiências.", cor="595959", size=9, borda=False, wrap=False)
    ws.freeze_panes = "A5"
    ws.auto_filter.ref = f"A4:{get_column_letter(len(cols))}{4 + len(rows)}"


def aba_intimacoes(wb, meta, por_cnj):
    ws = wb.create_sheet("Intimações pendentes")
    cols = [("Disponibilização", 13), ("Intimação", 12), ("Prazo (como no DOL)", 11), ("Número do processo", 26),
            ("Classe / assunto (DOL)", 40), ("Recebida por (DOL)", 26), ("PA(s) da 9ª com este número", 16),
            ("Tipo do processo", 22), ("Onde aparece no DOL", 32)]
    faixa(ws, "Intimações recebidas pendentes da 9ª",
          f"{len(meta['intim'])} intimações   |   Lista de intimações recebidas com situação pendente", len(cols))
    cabecalho(ws, 4, cols)
    rows = sorted(meta["intim"], key=lambda x: (dt(x[1]) if re.fullmatch(r"\d\d/\d\d/\d{4}", x[1]) else HOJE, x[3]))
    for n, x in enumerate(rows, 1):
        ps = por_cnj.get(x[3], [])
        vals = x[:6] + ["\n".join(pa_txt(p) for p in ps) or "Nenhum PA ativo",
                        "\n".join(dict.fromkeys(p["tipo"] for p in ps)) or "-",
                        "\n".join(p["origem"] for p in ps) or "-"]
        fundo = "F7F7F7" if n % 2 == 0 else None
        for c, v in enumerate(vals, 1):
            celula(ws, 4 + n, c, v, fundo=fundo, h="center" if c in (1, 2, 3, 7) else "left")
        linhas_altura(ws, 4 + n, [(vals[4], 40), (vals[8], 32)])
    ws.freeze_panes = "A5"
    ws.auto_filter.ref = f"A4:{get_column_letter(len(cols))}{4 + len(rows)}"


def aba_arquivados(wb, meta, arquivados):
    ws = wb.create_sheet("Arquivados")
    arq = meta["arq"]
    total = meta["totais"]["ARQUIVADO"]
    faixa(ws, "PAs arquivados da 9ª",
          f"{total:,} PAs na lista de arquivados do DOL   |   Apenas totais: os andamentos desses processos não foram "
          "lidos".replace(",", "."), 8)
    for col, w in zip("ABCDEFGH", [40, 12, 12, 3, 12, 12, 12, 12]):
        ws.column_dimensions[col].width = w

    titulo_secao(ws, 4, "Por ano do arquivamento (coluna 'Data do arquivamento' do DOL)")
    cab_tabela(ws, 5, ["Ano", "PAs", "%"])
    r = 5
    for ano in sorted(arq["porAno"]):
        r += 1
        celula(ws, r, 1, ano, h="center")
        celula(ws, r, 2, arq["porAno"][ano], h="center", bold=True)
        celula(ws, r, 3, arq["porAno"][ano] / total, h="center").number_format = "0.0%"
    fim_ano = r
    r += 1
    celula(ws, r, 1, "Total", bold=True, fundo=CINZA)
    celula(ws, r, 2, sum(arq["porAno"].values()), bold=True, fundo=CINZA, h="center").number_format = "#,##0"
    celula(ws, r, 3, 1, bold=True, fundo=CINZA, h="center").number_format = "0.0%"

    graf = BarChart()
    graf.type = "col"
    graf.style = 10
    graf.title = "PAs arquivados por ano do arquivamento"
    graf.add_data(Reference(ws, min_col=2, min_row=5, max_row=fim_ano), titles_from_data=True)
    graf.set_categories(Reference(ws, min_col=1, min_row=6, max_row=fim_ano))
    graf.legend = None
    graf.y_axis.delete = True
    graf.y_axis.majorGridlines = None
    graf.x_axis.delete = False
    graf.gapWidth = 60
    colorir(graf.series[0], [VERDE] * (fim_ano - 5))
    rotulos_barras(graf.series[0])
    graf.height, graf.width = 8, 18
    ws.add_chart(graf, "E4")

    r += 3
    titulo_secao(ws, r, "Por sistema (botão de pasta digital na lista de arquivados)")
    r += 1
    cab_tabela(ws, r, ["Sistema", "PAs", "%"])
    nomes = {"S": "e-SAJ", "E": "eproc", "-": "Sem botão de pasta digital na lista"}
    for k in ("S", "E", "-"):
        if arq["porSis"].get(k):
            r += 1
            celula(ws, r, 1, nomes[k])
            celula(ws, r, 2, arq["porSis"][k], h="center", bold=True)
            celula(ws, r, 3, arq["porSis"][k] / total, h="center").number_format = "0.0%"

    r += 3
    titulo_secao(ws, r, "Por tipo de processo (mesma regra de agrupamento dos ativos)")
    r += 1
    cab_tabela(ws, r, ["Tipo de processo", "PAs", "%"])
    por_tipo = Counter()
    for acao, n in arq["porAcao"].items():
        por_tipo[grupo(acao)] += n
    for tipo, n in sorted(por_tipo.items(), key=lambda kv: (-kv[1], kv[0])):
        r += 1
        celula(ws, r, 1, tipo)
        celula(ws, r, 2, n, h="center", bold=True)
        celula(ws, r, 3, n / total, h="center").number_format = "0.0%"
    r += 1
    celula(ws, r, 1, "Total", bold=True, fundo=CINZA)
    celula(ws, r, 2, sum(por_tipo.values()), bold=True, fundo=CINZA, h="center").number_format = "#,##0"
    celula(ws, r, 3, 1, bold=True, fundo=CINZA, h="center").number_format = "0.0%"

    r += 3
    titulo_secao(ws, r, "Arquivados que o DOL indica como eproc")
    r += 1
    cab_tabela(ws, r, ["Número do processo", "Nº do PA", "Arquivado em"])
    for p in arquivados:
        r += 1
        celula(ws, r, 1, p["cnj"])
        celula(ws, r, 2, pa_txt(p), h="center")
        celula(ws, r, 3, p["data_arq"], h="center")
    ws.freeze_panes = "A4"


def aba_contagens(wb, pas):
    ws = wb.create_sheet("Outras contagens")
    total = len(pas)
    faixa(ws, "Outras contagens dos PAs ativos", f"{total} PAs ativos   |   Textos exatamente como estão no DOL", 7)
    for col, w in zip("ABCDEFG", [70, 10, 10, 3, 44, 10, 10]):
        ws.column_dimensions[col].width = w

    titulo_secao(ws, 4, "Por foro e vara")
    cab_tabela(ws, 5, ["Foro / Vara (DOL)", "PAs", "%"])
    r = 5
    for fv, n in Counter(foro_vara(p) for p in pas).most_common():
        r += 1
        celula(ws, r, 1, fv)
        celula(ws, r, 2, n, h="center", bold=True)
        celula(ws, r, 3, n / total, h="center").number_format = "0.0%"
    fim_foro = r

    titulo_secao(ws, 4, "Por ano do PA (parte final do número do PA)", c=5)
    cab_tabela(ws, 5, ["Ano do PA", "PAs", "%"], c0=5)
    r = 5
    anos = Counter(p["pa"].split("/")[1] for p in pas if "/" in p["pa"])
    for ano in sorted(anos):
        r += 1
        celula(ws, r, 5, ano, h="center")
        celula(ws, r, 6, anos[ano], h="center", bold=True)
        celula(ws, r, 7, anos[ano] / total, h="center").number_format = "0.0%"

    r = max(fim_foro, r) + 3
    titulo_secao(ws, r, "Campo 'Número do controle' (texto exato do DOL)")
    r += 1
    cab_tabela(ws, r, ["Texto no campo", "PAs", "%"])
    ctl = Counter(p["controle"] or "(campo vazio)" for p in pas)
    for txt, n in sorted(ctl.items(), key=lambda kv: (kv[0] == "(campo vazio)", -kv[1], kv[0])):
        r += 1
        celula(ws, r, 1, txt, bold=txt == "(campo vazio)")
        celula(ws, r, 2, n, h="center", bold=True)
        celula(ws, r, 3, n / total, h="center").number_format = "0.0%"
    ws.freeze_panes = "A4"


def pontos_atencao(meta, pas, por_id, por_cnj, prov, agenda, intim):
    limite = primeira_remessa(pas)
    pontos = []

    def add(titulo, p, detalhe):
        pontos.append((titulo, pa_txt(p), p["cnj"] or "(sem número)", p["tipo"], p["origem"], detalhe))

    for cnj, ps in sorted(por_cnj.items()):
        if len(ps) > 1:
            for p in ps:
                outros = [q for q in ps if q is not p]
                add("Mesmo número de processo em dois PAs ativos", p, "; ".join(
                    f"Também no PA {pa_txt(q)} (onde aparece: {q['origem']}), que o DOL marca como "
                    f"{q['sis'] or 'sem sistema'}; "
                    f"este PA está marcado como {p['sis'] or 'sem sistema'}" for q in outros))
    for p in pas:
        if not p["cnj"]:
            add("PA ativo sem número de processo", p, "O DOL não mostra número de processo neste PA")
    for p in pas:
        if p["cnj"] and ".8.26." not in p["cnj"]:
            add("Processo de outro tribunal (número não é do TJSP)", p,
                (f"Número do controle: {p['controle']}; " if p["controle"] else "") + "o DOL não guarda andamentos deste processo")
    for p in pas:
        if p["possui_arquivamento"]:
            add("Correlato cuja ficha registra arquivamento", p, "A ficha do PA indica que ele possui arquivamento, mas "
                "ele segue na coluna de correlatos de um PA ativo")
    for p in pas:
        if p["sem_prov_judicial"]:
            add("Marcado no DOL como 'sem providência judicial adotada'", p, "; ".join(marcacoes(p)))
    for p in pas:
        if p["urgente"]:
            add("Marcado como urgente", p, "; ".join(marcacoes(p)))
    for p in pas:
        if p["novo"] or p["redist"]:
            add("Entrada recente na 9ª (novo ou redistribuído)", p, "; ".join(marcacoes(p)))
    for p in pas:
        if resultado(p) == MIGRADO_ESAJ:
            data = ultima([m["data"] for m in p["migr"] if m["numero"] == p["cnj"] and m["data"]])
            add("Remetido ao eproc, mas o DOL ainda indica e-SAJ", p, f"Certidão de migração no e-SAJ em {data}")
    for p in pas:
        if p["ult3"] and any(k in p["ult3"][0][1] for k in ("rquiv", "com Baixa")):
            add("Andamento mais recente no e-SAJ é de arquivamento, envio ao arquivo ou baixa", p,
                f"{p['ult3'][0][0]}: {p['ult3'][0][1]}")
    for p in pas:
        if andamento_antigo(p, limite):
            add(f"e-SAJ com andamento mais recente anterior a {limite:%d/%m/%Y} (primeira remessa ao eproc encontrada)",
                p, f"{p['ult3'][0][0]}: {p['ult3'][0][1]}" if p["ult3"] else p["ult_data"])
    for p in pas:
        futuros = [(d, t) for d, t in p["ult3"] if dt(d) > HOJE]
        if futuros:
            add("Andamento com data posterior ao dia da leitura", p, "; ".join(f"{d}: {t}" for d, t in futuros))
    for p in pas:
        if p["sem_mov"] and p["cnj"]:
            add("Nenhum andamento do e-SAJ no DOL", p, f"Situação quanto ao eproc: {resultado(p)}")
    for p in pas:
        if not p["nomes"] and p["partes_ficha"]:
            add("Nenhuma parte marcada como 'Representado por Defensoria'", p, representados(p))
    for p in pas:
        if not p["nomes"] and not p["partes_ficha"]:
            add("Ficha do PA sem partes localizadas", p, "A aba de partes da ficha não trouxe nenhuma parte")
    for p in pas:
        so_aqui = [r for r in intim.get(p["id"], []) if all(q["pai"] for q in por_cnj[r[3]])]
        if p["pai"] and (p["id"] in prov or p["id"] in agenda or so_aqui):
            itens = []
            if p["id"] in prov:
                itens.append(f"{len(prov[p['id']])} providência(s)")
            if p["id"] in agenda:
                itens.append(f"{len(agenda[p['id']])} item(ns) na agenda")
            if so_aqui:
                itens.append(f"{len(so_aqui)} intimação(ões)")
            add("Pendência em PA que só aparece como correlato", p,
                f"{', '.join(itens)}; o PA não tem linha própria na lista de ativos")
    for p in pas:
        if p["controle"].upper().replace("Í", "I") == "EQUIVOCO":
            add("Campo 'Número do controle' preenchido com 'EQUIVOCO'", p, f"Texto no DOL: {p['controle']}")
    return pontos


def aba_pontos(wb, pontos):
    ws = wb.create_sheet("Pontos de atenção")
    cols = [("Ponto de atenção", 44), ("Nº do PA", 14), ("Número do processo", 26), ("Tipo", 20),
            ("Onde aparece no DOL", 32), ("Detalhe (dados do DOL)", 70)]
    faixa(ws, "Pontos de atenção encontrados na leitura",
          "Somente fatos que constam no DOL; cada ponto é uma indicação para conferência, não uma conclusão", len(cols))
    ws.column_dimensions["A"].width = 44
    titulo_secao(ws, 4, "Resumo")
    cab_tabela(ws, 5, ["Ponto de atenção", "PAs"])
    cont = Counter(p[0] for p in pontos)
    r = 5
    for titulo in dict.fromkeys(p[0] for p in pontos):
        r += 1
        celula(ws, r, 1, titulo)
        celula(ws, r, 2, cont[titulo], h="center", bold=True)
    r += 2
    titulo_secao(ws, r, "Detalhe (filtre pela coluna A)")
    r += 1
    cab = r
    cabecalho(ws, cab, cols)
    for n, linha in enumerate(pontos, 1):
        r += 1
        fundo = "F7F7F7" if n % 2 == 0 else None
        for c, v in enumerate(linha, 1):
            celula(ws, r, c, v, fundo=fundo, h="center" if c == 2 else "left", bold=c == 3)
        linhas_altura(ws, r, [(linha[0], 44), (linha[4], 32), (linha[5], 70)], maximo=120)
    ws.auto_filter.ref = f"A{cab}:{get_column_letter(len(cols))}{r}"
    ws.freeze_panes = "A4"


def aba_metodo(wb, meta, pas, n_validos, n_numeros):
    t = meta["totais"]
    ws = wb.create_sheet("Como foi feito")
    faixa(ws, "Como a auditoria foi feita", "Consulta feita somente em modo leitura no DOL", 1)
    ws.column_dimensions["A"].width = 135
    linhas = [
        f"Fonte: DOL, Acompanhamento de Processo da 9ª Defensoria da UNIDADE RIBEIRÃO PRETO. Leitura completa em "
        f"{meta['extraido_em']} (lista de ativos, PAs correlatos, fichas, andamentos, providências, agenda, intimações "
        f"e lista de arquivados), conferida com a primeira leitura de {meta['extraido_primeira']}, e releitura "
        f"complementar da lista de ativos em {RELEITURA}, para o número dos PAs que têm correlatos e para o campo "
        "'Número do controle'.",
        f"Base: {len(pas)} PAs ativos. São os {t['ATIVO']} PAs da lista de processos ativos (os {t['NOVO']} novos e os "
        f"{t['REDISTRIBUIDO']} redistribuídos já estão entre eles) mais {t['CORRELATOS']} PAs que aparecem apenas na "
        "coluna 'Processos correlatos' de outro PA. A ficha de cada correlato foi aberta e nenhuma indicou outra "
        "defensoria.",
        "Tipo de processo: é a parte inicial do texto da ação cadastrada no DOL, antes do primeiro ' - ' (por exemplo, "
        "'Alimentos - revisional de alimentos' entra em Alimentos). 'Alimentos, guarda e visitas' é uma ação própria do "
        "DOL e ficou separada de 'Alimentos'. 'Casamento' foi exibido como 'Casamento / divórcio' porque quase todas as ações "
        "desse grupo são de divórcio (nos ativos, 114 de 115). Nenhum PA foi reclassificado por conta própria: a aba 'Tipos "
        "(detalhe)' mostra cada ação exatamente como está no DOL.",
        f"Percentuais: cada PA conta uma vez e o total é {len(pas)}. Dois números de processo estão em dois PAs cada "
        "um; eles aparecem na aba 'Pontos de atenção'.",
        "Sistema e eproc: mesma regra da planilha 'Processos eproc 9ª DPE' (marcação do DOL e certidão 'Remetidos os "
        "autos em razão de migração para outro sistema' nas movimentações do e-SAJ).",
        "Andamentos: tela de movimentações do DOL, que guarda os andamentos do e-SAJ e junta os do processo principal "
        "com os dos incidentes. A quantidade, a data do primeiro andamento e os três mais recentes (ordenados pela data "
        "mostrada) foram copiados sem alteração. O DOL não guarda andamentos do eproc nem de outros tribunais.",
        "Representados pela Defensoria: nomes da coluna Nome da lista de ativos; para quem não tem nome na lista e para "
        "os correlatos, as partes que a ficha do PA marca como 'Representado por Defensoria'. Nenhum CPF, RG, endereço "
        "ou contato foi copiado.",
        "Providências pendentes, prazos e audiências (compromissos pendentes, todos os tipos) e intimações recebidas "
        "pendentes: listas do DOL para a 9ª, copiadas como estão. Cada item foi ligado ao PA pelo número do PA (ou, nas "
        "intimações, pelo número do processo). Nos compromissos 'Prazo - Providências', a data exibida pela agenda nem "
        "sempre coincide com o prazo final da providência; por isso a data foi mantida como o DOL mostra.",
        "Arquivados: da lista de arquivados foram usados apenas a data do arquivamento, a ação e o botão de pasta digital "
        "(e-SAJ ou eproc). Os andamentos desses processos não foram lidos.",
        f"Conferências: {n_validos} de {n_numeros} números de processo citados nesta planilha têm o dígito verificador "
        "correto pela regra do CNJ. As duas leituras completas deram o mesmo resultado nas certidões de migração. Na "
        "releitura complementar, os números dos demais 935 PAs da lista e os 122 PAs sem nome na coluna Nome coincidiram "
        "exatamente com a leitura completa.",
        "Limites: a auditoria mostra o que está registrado no DOL. Informações que só existem no tribunal (andamentos do "
        "eproc, situação atual de processos de outros estados) não foram consultadas. Os pontos de atenção indicam o que "
        "vale conferir; não afirmam que haja erro.",
        "Nenhum dado foi incluído, alterado ou excluído no DOL: foram feitas apenas consultas de leitura.",
    ]
    for i, texto in enumerate(linhas, 4):
        celula(ws, i, 1, f"{i - 3}. {texto}", borda=False, size=11)
        ws.row_dimensions[i].height = 16 * (len(texto) // 120 + 1) + 6


def numeros_citados(meta, pas):
    nums = {p["cnj"] for p in pas if p["cnj"]}
    nums |= {m["numero"] for p in pas for m in p["migr"] if m["numero"]}
    nums |= {r[5] for r in meta["prov"]} | {r[2] for r in meta["agenda"]} | {r[3] for r in meta["intim"]}
    return nums


def main():
    saida = Path(sys.argv[1]) if len(sys.argv) > 1 else SAIDA_PADRAO
    saida.parent.mkdir(parents=True, exist_ok=True)
    meta, pas, arquivados = carregar()
    grupos = relacao(pas)
    por_id = {p["id"]: p for p in pas}
    por_pa, por_cnj, prov, agenda, intim = vinculos(meta, pas)
    nums = numeros_citados(meta, pas)
    validos = sum(1 for n in nums if cnj_valido(n))
    pontos = pontos_atencao(meta, pas, por_id, por_cnj, prov, agenda, intim)

    wb = Workbook()
    aba_resumo(wb, meta, pas, grupos, prov, agenda, intim)
    aba_tipos(wb, pas)
    aba_processos(wb, pas, grupos, por_id, prov, agenda, intim)
    aba_providencias(wb, meta, por_pa)
    aba_agenda(wb, meta, por_pa)
    aba_intimacoes(wb, meta, por_cnj)
    aba_pontos(wb, pontos)
    aba_arquivados(wb, meta, arquivados)
    aba_contagens(wb, pas)
    aba_metodo(wb, meta, pas, validos, len(nums))

    try:
        wb.save(saida)
        print(f"OK: {saida}")
    except PermissionError:
        alt = saida.with_name(f"{saida.stem} ({datetime.now().strftime('%Y-%m-%d %Hh%M')}){saida.suffix}")
        wb.save(alt)
        print(f"Planilha principal aberta no Excel; salvo em: {alt}")
    print(f"PAs: {len(pas)} | números válidos: {validos}/{len(nums)}")
    print("Tipos:", [(t, c["lista"] + c["corr"]) for t, c in tipos_contagem(pas)])
    print("Pontos:", dict(Counter(p[0] for p in pontos)))
    print("Vínculos: prov", sum(map(len, prov.values())), "agenda", sum(map(len, agenda.values())),
          "intim", sum(map(len, intim.values())))


if __name__ == "__main__":
    main()
