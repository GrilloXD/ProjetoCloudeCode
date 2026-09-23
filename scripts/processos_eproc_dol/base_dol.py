"""Base comum dos PAs da 9ª DPE lidos do DOL (somente leitura).

dados/auditoria.json: leitura completa de 22/09/2026 20:02 (lista de ativos, PAs correlatos, fichas, movimentações,
providências, prazos e audiências, intimações a cumprir e totais dos arquivados).
dados/processos.json: leitura de 18:22; dela vêm apenas as datas das certidões de migração (os números citados nas
certidões foram conferidos na segunda leitura e são idênticos), o título do andamento de maior sequência e os dados
dos PAs arquivados marcados como eproc.
dados/pa_principal.txt e dados/controle.txt: releitura da lista de ativos (id:ano do PA nas linhas rotuladas "Número do
PA principal", que as leituras anteriores não captavam, e o campo "Número do controle" de cada linha).
"""
import json
import re
from datetime import datetime
from pathlib import Path

DADOS = Path(__file__).parent / "dados"
SEM_TITULO = "(andamento sem título no DOL)"
RELEITURA = "22/09/2026, por volta das 20h30"


def dt(s):
    return datetime.strptime(s, "%d/%m/%Y")


def limpar_numero(txt):
    rotulo, _, valor = txt.partition(":")
    return f"{rotulo.strip()}: {re.sub(r'Número$', '', valor.strip()).strip()}"


def grupo(acao):
    """Tipo do processo: o texto da ação do DOL antes do primeiro ' - ', com as exceções abaixo."""
    especiais = {"Partilha de bens": "Partilha",
                 "Alvará judicial para levantamento de valores (pessoa falecida)": "Alvará judicial",
                 "CUSTÓDIA - PRISÃO CIVIL": "Custódia (prisão civil)"}
    if acao in especiais:
        return especiais[acao]
    if not acao:
        return "Ação não informada no DOL"
    nome = acao.split(" - ")[0].strip()
    return {"Casamento": "Casamento / divórcio", "Outras": "Outras (questionário genérico)"}.get(nome, nome)


def carregar():
    novo = json.loads((DADOS / "auditoria.json").read_text(encoding="utf-8"))
    antigo = json.loads((DADOS / "processos.json").read_text(encoding="utf-8"))
    est_d, acao_d, tit_d = novo["estruturas"], novo["acoes"], novo["titulos"]

    datas_migr, titulo_topo = {}, {}
    for p in antigo["pas"]:
        for data, numero in p.get("g", []):
            datas_migr[(p["c"], numero)] = data
            datas_migr.setdefault(("*", numero), data)
        if p.get("t"):
            titulo_topo[p["i"]] = p["t"]

    def movimentos(mv):
        if mv == 1:
            return {"sem_mov": True, "n": 0, "primeira": "", "ult3": []}
        if not mv:
            return {"sem_mov": True, "n": 0, "primeira": "", "ult3": [], "sem_dado": True}
        n, primeira, *resto = mv
        ult3 = [(resto[k], tit_d[resto[k + 1]] or SEM_TITULO) for k in range(0, len(resto), 2)]
        return {"sem_mov": False, "n": n, "primeira": primeira, "ult3": ult3}

    def migracoes(cnj, nums):
        return [{"data": datas_migr.get((cnj, n)) or datas_migr.get(("*", n), ""), "numero": n} for n in nums or []]

    pa_principal = dict(x.split(":") for x in (DADOS / "pa_principal.txt").read_text(encoding="utf-8").split(","))
    controle = dict(l.split(" ", 1) for l in (DADOS / "controle.txt").read_text(encoding="utf-8").splitlines() if l)

    pas = []
    for (i, pa, cnj, s, e, a, nomes, flags, nv, rd, on, fi, f, mv, mg) in novo["pas"]:
        m = movimentos(mv)
        if not pa and i in pa_principal:
            pa = f"{i}/{pa_principal[i]}"
        pas.append({"id": i, "pa": pa, "cnj": cnj, "sis": {"E": "eproc", "S": "e-SAJ"}.get(s, ""),
                    "est": [x for x in est_d[e].split("|") if x], "acao": acao_d[a], "tipo": grupo(acao_d[a]),
                    "nomes": nomes, "partes_ficha": [tuple(x) for x in f or []], "nomes_ficha": not nomes and bool(f),
                    "sem_acesso": "x" in flags, "urgente": "u" in flags, "sem_prov_judicial": "p" in flags,
                    "novo": nv or "", "redist": rd or None, "outros_numeros": [limpar_numero(x) for x in on or []],
                    "filhos": fi or [], "pai": "", "data_insercao": "", "controle": controle.get(i, ""),
                    "possui_arquivamento": False,
                    "origem": "Lista de ativos", **m, "ult_data": m["ult3"][0][0] if m["ult3"] else "",
                    "ult": titulo_topo.get(i, ""), "migr": migracoes(cnj, mg), "data_arq": ""})
    for (i, pa, cnj, s, e, a, pai, di, f, flags, ct, dfn, mv, mg) in novo["corr"]:
        m = movimentos(mv)
        partes = [tuple(x) for x in f or []]
        pas.append({"id": i, "pa": pa, "cnj": cnj, "sis": {"E": "eproc", "S": "e-SAJ"}.get(s, ""),
                    "est": [x for x in est_d[e].split("|") if x], "acao": acao_d[a], "tipo": grupo(acao_d[a]),
                    "nomes": [n for n, _, dpe in partes if dpe], "partes_ficha": partes, "nomes_ficha": True,
                    "sem_acesso": False, "urgente": False, "sem_prov_judicial": False, "novo": "", "redist": None,
                    "outros_numeros": [f"Número do controle: {ct}"] if ct else [], "filhos": [], "pai": pai,
                    "data_insercao": di, "controle": ct or "", "possui_arquivamento": "a" in flags,
                    "defensoria_ficha": dfn or "536", "origem": f"Correlato do PA {pai}", **m,
                    "ult_data": m["ult3"][0][0] if m["ult3"] else "", "ult": "", "migr": migracoes(cnj, mg),
                    "data_arq": ""})

    pa_por_id = {p["id"]: p for p in pas}
    for p in pas:
        if p["pai"] and p["pai"] in pa_por_id:
            pai = pa_por_id[p["pai"]]
            p["origem"] = f"Correlato do PA {pai['pa'] or pai['id']} ({pai['cnj'] or 'sem número'})"

    arquivados = []
    for x in antigo.get("arquivados", []):
        arquivados.append({"id": x["i"], "pa": x.get("p") or "", "cnj": x.get("c") or "", "sis": "eproc",
                           "est": [e for e in antigo["estruturas"][x["e"]].split("|") if e],
                           "acao": antigo["acoes"][x["a"]], "nomes": x.get("n", []), "data_arq": x.get("d", ""),
                           "migr": [{"data": d, "numero": n} for d, n in x.get("g", [])], "partes_ficha": [],
                           "nomes_ficha": False})
    meta = {"extraido_em": novo["extraido_em"], "usuario": novo.get("usuario", ""), "totais": novo["totais"],
            "prov": novo["prov"], "agenda": novo["agenda"], "intim": novo["intim"], "arq": novo["arq"],
            "extraido_primeira": antigo["extraido_em"]}
    return meta, pas, arquivados


def foro_vara(p):
    est = [e for e in p["est"] if e != "Primeira Instância"]
    if est and est[0] == "Segunda Instância":
        return "Segunda Instância"
    if len(est) < 2:
        return "Não informado no DOL"
    comarca, foro = est[0], est[1]
    local = foro if comarca.lower() in foro.lower() else f"{comarca} / {foro}"
    if len(est) == 2:
        return f"{local} (vara não informada no DOL)"
    return " / ".join([local] + est[2:])


def representados(p):
    """Quem o DOL marca como representado pela Defensoria (coluna Nome da lista ou visto na aba de partes)."""
    if p["nomes"]:
        return "; ".join(dict.fromkeys(p["nomes"]))
    if p["partes_ficha"]:
        return "Nenhuma parte marcada como representada. Partes: " + "; ".join(
            f"{n} ({rel})" for n, rel, _ in p["partes_ficha"])
    return "Partes não localizadas na ficha do PA"

