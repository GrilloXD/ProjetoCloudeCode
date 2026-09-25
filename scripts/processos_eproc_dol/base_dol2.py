"""Leitura definitiva do DOL (dados/auditoria2.json, extraída em 23/09/2026 às 23h42, somente leitura).

A exportação traz, para a 9ª Defensoria: a lista de PAs ativos com os correlatos, as fichas dos correlatos, os
peticionamentos ligados a recursos e cumprimentos, as movimentações do e-SAJ de cada número, a classe processual de
cada número segundo as intimações recebidas, as intimações pendentes, as providências, a agenda e os totais dos
arquivados. Aqui os dados são decodificados, cada PA recebe uma categoria pela classe do TJ e os recursos são
reunidos com o resultado e a indicação de quem recorreu, sempre com a evidência que o DOL mostra.
"""
import json
import re
import unicodedata
from collections import Counter, defaultdict
from datetime import datetime
from pathlib import Path

DADOS = Path(__file__).parent / "dados"
RX_CNJ = re.compile(r"\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}")


def dt(s):
    return datetime.strptime(s[:10], "%d/%m/%Y")


def chave(s):
    return s[6:10] + s[3:5] + s[:2] if s else ""


def sg(n):
    return ".8.26.0000" in n


def cnj_fmt(d20):
    return f"{d20[:7]}-{d20[7:9]}.{d20[9:13]}.{d20[13]}.{d20[14:16]}.{d20[16:20]}"


def cnj_valido(n):
    m = re.fullmatch(r"(\d{7})-(\d{2})\.(\d{4})\.(\d)\.(\d{2})\.(\d{4})", n.split("/")[0])
    if not m:
        return False
    seq, dv, ano, j, tr, orig = m.groups()
    return int(seq + ano + j + tr + orig + dv) % 97 == 1


def sem_acento(s):
    return "".join(c for c in unicodedata.normalize("NFD", s or "") if unicodedata.category(c) != "Mn").lower()


def protocolo(txt):
    m = re.search(r"Protocolo:\s*([A-Z0-9]+[.\-][0-9.\-]+?)\s*Tipo", txt or "")
    return re.sub(r"[^A-Z0-9]", "", m.group(1)) if m else ""


ESPECIAIS = ["Alimentos - Lei Especial Nº 5.478/68", "Alvará Judicial - Lei 6858/80", "Interdição/Curatela",
             "Suprimento de Idade e/ou Consentimento"]


def separar_classe(s):
    for e in ESPECIAIS:
        if s == e or s.startswith(e + "/"):
            return e, s[len(e) + 1:]
    m = re.search(r"(?<! )/(?! )", s)
    return (s[:m.start()], s[m.end():]) if m else (s, "")


CS_ALIM = "Cumprimento de sentença de alimentos"
CS_DEMAIS = "Cumprimento de sentença (demais)"
EXEC_ALIM = "Execução de alimentos (título extrajudicial)"
EXEC_TIT = "Execução de título extrajudicial"
AGRAVO = "Agravo de instrumento"
OUTROS_TJ = "Outros feitos no Tribunal"
ALIM = "Alimentos"
DIV = "Divórcio, separação e união estável"
GUARDA = "Guarda e convivência"
CURATELA = "Curatela, interdição e tutela"
FILIACAO = "Filiação (paternidade e maternidade)"
INVENT = "Inventário, arrolamento e alvará"
USUCAPIAO = "Usucapião"
MONITORIA = "Monitória"
FAM_OUTROS = "Família (outras matérias)"
CIVEL = "Cível (demais ações)"
FISCAL = "Execução fiscal"
PRISAO = "Prisão civil (comunicado de mandado)"
SEM_CLASSE = "Sem classe no TJ e sem ação que indique a matéria"
CURADORIA_ESP = "Curadoria especial"

MATERIAS = {
    ALIM: {"Alimentos", "Fixação", "Revisão", "Exoneração", "Oferta", "Alimentos Gravídicos", "Alimentos gravídicos"},
    DIV: {"Dissolução", "Reconhecimento / Dissolução", "União Estável ou Concubinato", "Casamento", "Partilha"},
    GUARDA: {"Guarda", "Regulamentação de Visitas", "Alienação Parental", "Perda ou Modificação de Guarda"},
    FILIACAO: {"Investigação de Paternidade", "Investigação de Paternidade Pós Morte", "Investigação de Maternidade",
               "Relações de Parentesco", "Reconhecimento de Paternidade/Maternidade Socioafetiva"},
    CURATELA: {"Nomeação", "Tutela e Curatela", "Curatela", "Capacidade"},
    USUCAPIAO: {"Usucapião de bem móvel", "Usucapião Ordinária", "Usucapião Conjugal", "Usucapião Extraordinária"},
}
RECURSAIS_1G = {"Apelação Cível", "Apelação / Remessa Necessária"}


def materia(assunto):
    for cat, assuntos in MATERIAS.items():
        if assunto in assuntos:
            return cat
    return ""


def categoria_classe(classe, assunto, foro=""):
    c = classe
    if c in ("Cumprimento de Sentença de Obrigação de Prestar Alimentos", "Execução de Alimentos"):
        return CS_ALIM
    if c.startswith("Cumprimento") or c == "Liquidação de Sentença pelo Procedimento Comum":
        return CS_ALIM if assunto == "Alimentos" else CS_DEMAIS
    if c == "Execução Extrajudicial de Alimentos":
        return EXEC_ALIM
    if c == "Execução de Título Extrajudicial":
        return EXEC_TIT
    if c == "Agravo de Instrumento":
        return AGRAVO
    if c in ("Agravo Interno Cível", "Embargos de Declaração Cível", "Conflito de competência cível",
             "Habeas Corpus Criminal"):
        return OUTROS_TJ
    if c.startswith("Alimentos - Lei Especial"):
        return ALIM
    if c in ("Divórcio Litigioso", "Divórcio Consensual", "Conversão de Separação Judicial em Divórcio",
             "Reconhecimento e Extinção de União Estável", "Ação de Partilha"):
        return DIV
    if c in ("Guarda de Família", "Regulamentação da Convivência Familiar"):
        return GUARDA
    if c in ("Interdição/Curatela", "Curatela", "Tomada de Decisão Apoiada", "Tutela Cível"):
        return CURATELA
    if c in ("Inventário", "Arrolamento Comum", "Alvará Judicial - Lei 6858/80", "Sonegados"):
        return INVENT
    if c == "Usucapião":
        return USUCAPIAO
    if c == "Monitória":
        return MONITORIA
    if c in ("Execução Fiscal", "Embargos à Execução Fiscal"):
        return FISCAL
    if c == "Comunicado de Mandado de Prisão":
        return PRISAO
    m = materia(assunto)
    if m:
        return m
    return FAM_OUTROS if "Família" in foro else CIVEL


def categoria_acao(acao):
    a = acao or ""
    if not a:
        return SEM_CLASSE
    if a.startswith("Alimentos - Cumprimento de sentença"):
        return CS_ALIM
    if a.startswith("Alimentos - Título extrajudicial"):
        return EXEC_ALIM
    if a.startswith("Alimentos"):
        return ALIM
    if a.startswith(("Casamento", "União estável", "Partilha")):
        return DIV
    if a.startswith(("Guarda", "Visitas")):
        return GUARDA
    if a.startswith(("Curatela", "Tutela")):
        return CURATELA
    if a.startswith("Paternidade"):
        return FILIACAO
    if a.startswith(("Inventário", "Alvará")):
        return INVENT
    if a == "Cumprimento de sentença":
        return CS_DEMAIS
    if a == "CUSTÓDIA - PRISÃO CIVIL":
        return PRISAO
    if a == "Agravo de Instrumento":
        return AGRAVO
    if a.startswith("Outras - Familia"):
        return FAM_OUTROS
    if a == "Curadoria Especial":
        return SEM_CLASSE
    return CIVEL


def carregar():
    E = json.loads((DADOS / "auditoria2.json").read_text(encoding="utf-8"))
    D = E["D"]
    M = {**E["M4"], **E["M"]}

    def mov(n):
        v = M.get(n)
        if v is None:
            return None
        if v.get("sem"):
            return {"sem": True}
        return {"n": v["n"], "pri": v["pri"], "u3": [(d, D[t]) for d, t in v["u3"]],
                "mg": [(d, cnj_fmt(x)) for d, x in v["mg"]],
                "ev": [{"seq": int(e[0]), "data": e[1], "titulo": D[e[2]], "texto": e[3]} for e in v["ev"]],
                "rp": [{"data": r[0], "titulo": r[1], "texto": r[2]} for r in v.get("rp", [])]}

    classes = {}
    for n, x in E["I"].items():
        lst = []
        for e in x:
            c, a = separar_classe(D[e[0]])
            lst.append({"classe": c, "assunto": a, "texto": D[e[0]], "primeira": e[1], "ultima": e[2], "qtd": e[3],
                        "foro": D[e[4]]})
        classes[n] = sorted(lst, key=lambda z: (chave(z["ultima"]), z["qtd"]), reverse=True)

    novo = {i: d for i, d, _ in E["novo"]}
    redist = {i: (d, o) for i, d, o in E["redist"]}
    semprov = set(E["semprov"])
    F = E["F"]
    P = E["P"]

    pas = []
    for r in E["ativo"]:
        i, pa, princ, cnj, ctl, s, a, e, nomes, urg, x, cor = r
        pas.append({"id": i, "pa": pa, "cnj": cnj, "controle": ctl, "sis": s, "acao": D[a],
                    "est": [z for z in D[e].split("|") if z], "nomes": nomes, "urgente": bool(urg), "sem_acesso": bool(x),
                    "origem": "lista", "pai": "", "data_insercao": "", "novo": novo.get(i, ""), "redist": redist.get(i),
                    "sem_prov": i in semprov, "cor": cor})
    for p in list(pas):
        for autos, ctl, pa, data in p["cor"]:
            i = pa.split("/")[0]
            f = F.get(i)
            pas.append({"id": i, "pa": pa, "cnj": autos, "controle": ctl, "sis": {"SAJ": "S", "EPROC": "E"}.get(f[3], "")
                        if f else "", "acao": D[f[2]] if f else "", "est": [], "nomes": [], "urgente": False,
                        "sem_acesso": False, "origem": "correlato", "pai": p["id"], "data_insercao": data, "novo": "",
                        "redist": None, "sem_prov": False, "cor": []})
    por_id = {p["id"]: p for p in pas}
    for p in pas:
        f = F.get(p["id"])
        p["partes"] = [tuple(z) for z in f[0]] if f else []
        p["tab_partes"] = bool(f[1]) if f else None
        p["ficha_arq"] = bool(f) and f[5] == "true"
        p["filhos"] = [c[2].split("/")[0] for c in p["cor"]]
        p["pet"] = P.get(p["id"], [0, []])[1]
        p["n_pet"] = P.get(p["id"], [0, []])[0]
        p["mov"] = mov(p["cnj"]) if p["cnj"] else None
        p["classes"] = classes.get(p["cnj"], [])
        if not p["nomes"] and p["partes"]:
            p["nomes_ficha"] = [n for n, _, dpe in p["partes"] if dpe]
        else:
            p["nomes_ficha"] = []
        classificar(p)
    for p in pas:
        if p["pai"] and p["categoria"] == OUTROS_TJ and not p["classe_atual"]:
            for r in por_id[p["pai"]]["pet"]:
                if r[4] == p["cnj"] and "agravo de instrumento" in r[3].lower() and r[5] == "Enviado":
                    p["categoria"] = AGRAVO
                    p["base"] = (f"Sem intimação com classe; peticionamento da Defensoria de {r[0]} ('{r[3]}') com "
                                 "este número, no PA principal")
    for p in pas:
        definir_tipo(p)

    meta ={"extraido_em": E["extraido_em"], "fontes": E["fontes"], "H": E["H"], "prov": E["prov"], "ag": E["ag"],
            "pend": E["pend"], "intTot": E["intTot"], "arq": E["arq"], "fora": E["fora"], "protos": E["protos"]}
    return meta, pas, por_id, classes, mov


def classificar(p):
    p["fase"] = ""
    if p["classes"]:
        atual = p["classes"][0]
        p["classe_atual"] = atual
        if atual["classe"] in RECURSAIS_1G and not sg(p["cnj"]):
            p["fase"] = f"Em grau de apelação no TJ (intimação de {atual['ultima']})"
            antes = [c for c in p["classes"] if c["classe"] not in RECURSAIS_1G]
            if antes:
                base = antes[0]
                p["categoria"] = categoria_classe(base["classe"], base["assunto"], base["foro"])
                p["base"] = (f"Classe anterior à apelação ({base['texto']}); a intimação mais recente, de "
                             f"{atual['ultima']}, já é da apelação")
            else:
                p["categoria"] = materia(atual["assunto"]) or (FAM_OUTROS if "Família" in atual["foro"] else CIVEL)
                p["base"] = f"Assunto da apelação ({atual['texto']}), intimação de {atual['ultima']}"
        else:
            p["categoria"] = categoria_classe(atual["classe"], atual["assunto"], atual["foro"])
            p["base"] = f"Classe no TJ: {atual['texto']} (intimação mais recente, {atual['ultima']})"
        return
    p["classe_atual"] = None
    if p["cnj"] and sg(p["cnj"]):
        prova = evidencia_agravo(p)
        if prova:
            p["categoria"] = AGRAVO
            p["base"] = f"Sem intimação com classe; {prova}"
        else:
            p["categoria"] = OUTROS_TJ
            p["base"] = ("Sem intimação com classe; número próprio no TJ, mas o DOL não informa a classe "
                         "(classificado como outro feito no Tribunal)")
        return
    p["categoria"] = categoria_acao(p["acao"])
    motivo = "PA sem número de processo" if not p["cnj"] else "número sem intimação com classe no DOL"
    p["base"] = f"Ação cadastrada no DOL ({p['acao'] or 'não informada'}); {motivo}"


def definir_tipo(p):
    """Na curadoria especial a 9ª não representa a parte: o PA conta como curadoria e a matéria fica em 'categoria'."""
    p["curadoria"] = p["acao"] == "Curadoria Especial"
    p["tipo"] = CURADORIA_ESP if p["curadoria"] else p["categoria"]


def evidencia_agravo(p):
    for r in p["pet"]:
        if r[4] == p["cnj"] and "agravo de instrumento" in r[3].lower() and r[5] == "Enviado":
            return f"peticionamento da Defensoria de {r[0]} ('{r[3]}') com este número"
    if p["acao"] == "Agravo de Instrumento":
        return "ação cadastrada no DOL como Agravo de Instrumento"
    m = p["mov"]
    if m and not m.get("sem"):
        for e in m["ev"] + m["rp"]:
            if "agravo de instrumento" in sem_acento(e["texto"]):
                return f"andamento de {e['data']} do próprio processo trata de agravo de instrumento"
    return ""


ENCERRADO = "Encerrado no TJ (arquivado ou baixado)"
ARQ_PROV = "Arquivado provisoriamente no TJ"
TRANSITO = "Trânsito em julgado (processo segue)"
MIGRADO = "Remetido ao eproc"
ANDAMENTO = "Em andamento"
SEM_MOV = "Sem andamentos no DOL"


def situacao_tj(m):
    """Situação do processo pelo andamento mais recente que o DOL guarda do e-SAJ."""
    if m is None or m.get("sem") or not m.get("u3"):
        return SEM_MOV, ""
    d, t = m["u3"][0]
    if t.startswith(("Arquivado Definitivamente", "Processo encaminhado para o Arquivo",
                     "Remetidos os Autos para o Arquivo Geral", "Trânsito em Julgado às partes - com Baixa",
                     "Certidão de Trânsito em Julgado com Baixa")):
        return ENCERRADO, d
    if t.startswith("Arquivado Provisoriamente"):
        return ARQ_PROV, d
    if t.startswith("Trânsito em Julgado às partes - Proc. em Andamento"):
        return TRANSITO, d
    if t.startswith("Remetidos os autos em razão de migração"):
        return MIGRADO, d
    return ANDAMENTO, d


# ---------------------------------------------------------------- recursos

PROVIDO, PARCIAL, NAO_PROVIDO, SEGUIMENTO, NAO_CONHECIDO, PREJUDICADO = (
    "Provido", "Provido em parte", "Não provido", "Negado seguimento", "Não conhecido", "Prejudicado")
AGUARDANDO = "Aguardando julgamento"
SEM_RESULTADO = "Resultado não consta no DOL"
FAVORAVEL, PARC_FAV, DESFAVORAVEL, PARC_DESF, SEM_MERITO, INDETERMINADO = (
    "Favorável", "Parcialmente favorável", "Desfavorável", "Parcialmente desfavorável",
    "Sem julgamento do mérito", "Não determinável pelo DOL")
DEU_CERTO = {FAVORAVEL, PARC_FAV}
DPE, OUTRA, AMBAS, NAO_ID = ("Defensoria", "Outra parte", "As duas partes", "Não identificado no DOL")

TIT_JULGAMENTO = {"Julgado virtualmente", "Julgado", "Julgado virtualmente - Acórdão Designado"}
TIT_MONO = {"Decisão Monocrática - Negação de Seguimento (Com Resolução do Mérito)": SEGUIMENTO,
            "Decisão Monocrática - Não-Provimento": NAO_PROVIDO,
            "Decisão Monocrática - Não-Conhecimento": NAO_CONHECIDO,
            "Decisão Monocrática - Recurso Prejudicado": PREJUDICADO}
TIT_2INST = {"Decisão de 2ª Instância - Recurso Provido - Juntada": PROVIDO,
             "Decisão de 2ª Instância - Recurso Parcialmente Provido - Juntada": PARCIAL,
             "Decisão de 2ª Instância - Recurso Não Provido - Juntada": NAO_PROVIDO,
             "Decisão de 2ª Instância - Recurso Não Conhecido - Juntada": NAO_CONHECIDO}
TIT_ED = {"Embargos de Declaração Não-Acolhidos": "Rejeitados", "Embargos de Declaração Acolhidos": "Acolhidos",
          "Embargos de Declaração Não-Conhecidos": "Não conhecidos"}


MISTO = "Resultado diferente para cada parte"


def resumo_texto(txt, padrao=""):
    t = sem_acento(txt)
    if re.search(r"recurso d[oa] (parte )?(autor|autora|re|reu)\b", t):
        return MISTO
    if re.search(r"provimento em parte|provimento parcial|parcial provimento|conheceram em parte.*provimento", t):
        return PARCIAL
    if re.search(r"negaram provimento|nego provimento|negar provimento|nega-se provimento|negaram-lhe provimento", t):
        return NAO_PROVIDO
    if re.search(r"deram provimento|dou provimento|dar provimento|deram-lhe provimento|deram lhe provimento", t):
        return PROVIDO
    if re.search(r"nego seguimento|negaram seguimento|negado seguimento", t):
        return SEGUIMENTO
    if re.search(r"prejudicad|perda de objeto|perda do objeto|perda do interesse|perda superveniente", t):
        return PREJUDICADO
    if re.search(r"nao conhe|nao se conhece", t):
        return NAO_CONHECIDO
    return padrao


def decisao(txt):
    """Parte dispositiva de um acórdão juntado no 1º grau ('ACORDAM ... proferir a seguinte decisão: X, de conformidade')."""
    m = re.search(r"seguinte decis[aã]o:\s*(.+?)(?:,? de conformidade|$)", txt or "", re.S)
    return m.group(1).strip(' "') if m else (txt or "").strip()


def para_assistido(resumo, recorrente, texto="", lado=""):
    t = sem_acento(texto)
    if resumo in (AGUARDANDO, SEM_RESULTADO):
        return resumo
    if re.search(r"recurso d[oa] (parte )?(autor|autora|re|reu)\b", t) and lado:
        prov = set(re.findall(r"deram provimento ao recurso d[oa] (?:parte )?(autora|autor|reu|re)\b", t))
        prov = {"autor" if x.startswith("autor") else "reu" for x in prov}
        if prov:
            return FAVORAVEL if lado in prov else DESFAVORAVEL
    if recorrente == AMBAS:
        if resumo in (NAO_PROVIDO, SEGUIMENTO, NAO_CONHECIDO):
            return "Sem alteração (os recursos das duas partes foram negados)"
        return INDETERMINADO
    if resumo == PREJUDICADO:
        return SEM_MERITO
    if recorrente == DPE:
        return {PROVIDO: FAVORAVEL, PARCIAL: PARC_FAV}.get(resumo, DESFAVORAVEL if resumo in (
            NAO_PROVIDO, SEGUIMENTO, NAO_CONHECIDO) else INDETERMINADO)
    if recorrente == OUTRA:
        return {PROVIDO: DESFAVORAVEL, PARCIAL: PARC_DESF}.get(resumo, FAVORAVEL if resumo in (
            NAO_PROVIDO, SEGUIMENTO, NAO_CONHECIDO) else INDETERMINADO)
    return INDETERMINADO


IGNORA = {"de", "da", "do", "das", "dos", "e"}


def iniciais(nome):
    return "".join(w[0] for w in re.split(r"[\s.]+", sem_acento(nome)) if w and w not in IGNORA)


def nomes_dpe(p, por_id):
    nomes = list(p["nomes"]) + list(p["nomes_ficha"])
    for f in p["filhos"]:
        q = por_id.get(f)
        if q:
            nomes += [n for n, _, dpe in q["partes"] if dpe]
    return [n for n in dict.fromkeys(nomes) if n]


def lado_dpe(p, por_id):
    """Polo (autor ou réu) das partes que as fichas marcam como representadas pela Defensoria."""
    lados = set()
    for q in [p] + [por_id[f] for f in p["filhos"] if f in por_id]:
        for _, rel, dpe in q["partes"]:
            if dpe and "Autor" in rel:
                lados.add("autor")
            elif dpe and "Réu" in rel:
                lados.add("reu")
    return lados.pop() if len(lados) == 1 else ""


def autor_no_texto(textos):
    fim = r"(?=,|;|\(|\s+contra\b|\s+em\b|\s+nos autos\b|\s+da r\.|\s+diante\b|\s+com\b|\.\s+(?=[A-ZÀ-Ú][a-zà-ú])|$)"
    for t in textos:
        m = re.search(r"(?:interpost[oa]s?|opost[oa]s?)\s+(?:por|pel[oa]s?)\s+(.{3,120}?)" + fim, t)
        if m:
            return m.group(1).strip(" ."), t
        m = re.search(r"(?:Agravantes?|Apelantes?|APELANTES?|Embargantes?)\s*:\s*(.{3,120}?)\s*"
                      r"(?=Agravad|Apelad|APELAD|Embargad|Comarca|$)", t)
        if m:
            return m.group(1).strip(" ."), t
    return "", ""


def polo_do_papel(achado):
    a = sem_acento(achado).strip()
    if re.fullmatch(r"(?:a |o |pel[oa] )?(?:parte )?(?:autora?|requerente|exequente)s?", a):
        return "autor"
    if re.fullmatch(r"(?:a |o |pel[oa] )?(?:parte )?(?:re|reu|requerid[oa]|executad[oa])s?", a):
        return "reu"
    return ""


def confere_nome(achado, nomes):
    a = sem_acento(re.sub(r"\(.*?\)", "", achado)).strip(" .")
    if not a or not nomes:
        return False
    for n in nomes:
        s = sem_acento(n)
        if len(a) > 6 and (a in s or s in a):
            return True
    grupos = re.split(r"\s+e\s+", a)
    siglas = []
    for g in grupos:
        palavras = [w for w in re.split(r"[\s.]+", g) if w and w not in IGNORA]
        if not palavras or any(len(w) > 1 for w in palavras):
            return False
        siglas.append("".join(palavras))
    return all(len(x) >= 2 and any(iniciais(n) == x for n in nomes) for x in siglas)


def orgao_relator(ev):
    for e in ev:
        if e["titulo"].startswith("Distribuição"):
            t = e["texto"]
            og = re.search(r"Órgão Julgador:\s*\d+\s*-\s*(.+?)Relator", t)
            rl = re.search(r"Relator:\s*\d+\s*-\s*(.+)$", t)
            prev = re.search(r"(?:Processo prevento|Pelo proc\.no\.)\s*:?\s*([\d.\-]+)", t)
            return (og.group(1).strip() if og else "", rl.group(1).strip() if rl else "", e["data"],
                    prev.group(1) if prev else "")
    return "", "", "", ""


def transito(ev):
    for e in sorted(ev, key=lambda z: (chave(z["data"]), z["seq"]), reverse=True):
        m = re.search(r"transitou em julgado em\s*([\d/.]+\d)", e["texto"])
        if m:
            return m.group(1).replace(".", "/")
        if "Trânsito" in e["texto"] or "trânsito" in e["texto"] or "transitou" in e["texto"]:
            return f"certificado em {e['data']}"
    return ""


def julgamento_sg(ev):
    jul = []
    for e in sorted(ev, key=lambda z: (chave(z["data"]), z["seq"])):
        if e["titulo"] in TIT_JULGAMENTO and e["texto"]:
            jul.append((e, resumo_texto(e["texto"])))
        elif e["titulo"] in TIT_MONO:
            jul.append((e, resumo_texto(e["texto"], TIT_MONO[e["titulo"]]) or TIT_MONO[e["titulo"]]))
    principais = [(e, r) for e, r in jul if "embargos" not in sem_acento(e["texto"])[:40]]
    return (principais[0] if principais else (None, "")), jul


def novo_recurso(**k):
    r = {"tipo": "", "numero": "", "grau": "", "principal": None, "principal_cnj": "", "pa_recurso": "", "onde": "",
         "assunto": "", "materia": "", "orgao": "", "relator": "", "inicio": "", "recorrente": NAO_ID, "evidencia": "",
         "resultado": "", "data_julg": "", "resumo": "", "transito": "", "assistido": "", "obs": ""}
    r.update(k)
    return r


def juntar(*textos):
    return "; ".join(t for t in textos if t)


def curto(txt, limite=360):
    txt = (txt or "").strip()
    return txt if len(txt) <= limite else txt[:140].rstrip() + " [...] " + txt[-(limite - 150):].lstrip()


def onde_numero(n, p, por_id, meta):
    if p and p["origem"] == "lista":
        return "PA na lista de ativos"
    if p:
        pai = por_id[p["pai"]]
        return f"Correlato do PA {pai['pa'] or pai['id']}"
    arq = meta["arq"]["rec"].get(n)
    if arq:
        return "Só nas intimações da 9ª; o número está no PA arquivado " + ", ".join(x[1] for x in arq)
    return "Só nas intimações recebidas pela 9ª (não está em PA ativo)"


def recursos(meta, pas, por_id, classes, mov):
    rec = []
    por_cnj = {}
    for p in pas:
        if p["cnj"]:
            por_cnj.setdefault(p["cnj"], p)
    numeros = [(p["cnj"], p) for p in pas if p["cnj"] and (sg(p["cnj"]) or "/5000" in p["cnj"])]
    ja = {n for n, _ in numeros}
    numeros += [(n, None) for n in meta["fora"] if (sg(n) or "/5000" in n) and n not in ja]
    for n, p in numeros:
        rec.append(recurso_tribunal(n, p, meta, por_id, classes, mov))
    vistos = set()
    for p in pas:
        if p["cnj"] and not sg(p["cnj"]) and "/5000" not in p["cnj"] and p["cnj"] not in vistos:
            vistos.add(p["cnj"])
            rec += recursos_1g(p["cnj"], p, meta, por_id, classes, mov)
    for n in meta["fora"]:
        if not sg(n) and "/5000" not in n and n not in vistos:
            vistos.add(n)
            rec += recursos_1g(n, None, meta, por_id, classes, mov)
    return rec


def recurso_tribunal(n, p, meta, por_id, classes, mov):
    cl = classes.get(n, [])
    pai = por_id.get(p["pai"]) if p and p["pai"] else None
    if cl:
        tipo, assunto = cl[0]["classe"], cl[0]["assunto"]
    elif p and p["categoria"] == AGRAVO:
        tipo, assunto = "Agravo de Instrumento", ""
    else:
        tipo, assunto = "Recurso no TJ (classe não informada no DOL)", ""
    r = novo_recurso(tipo=tipo, numero=n, grau="2º grau", assunto=assunto,
                     materia=materia(assunto) or ("Outro assunto" if assunto else ""), principal=pai,
                     principal_cnj=pai["cnj"] if pai else "", pa_recurso=p["pa"] if p else "",
                     onde=onde_numero(n, p, por_id, meta))
    if not p and cl:
        r["obs"] = f"Vara de origem indicada na intimação: {cl[0]['foro']}"

    if "/5000" in n:
        base_num = n.split("/")[0]
        r["principal_cnj"] = base_num
        r["grau"] = "2º grau (número incidental)"
        mm = mov(base_num)
        if mm and not mm.get("sem"):
            ligados = [e for e in mm["ev"] if (e["titulo"] in TIT_JULGAMENTO or e["titulo"] in TIT_2INST) and
                       re.search(r"embargos|agravo interno", sem_acento(e["texto"]))]
            if ligados:
                r["obs"] = juntar(r["obs"], "; ".join(f"Nos andamentos de {base_num}, em {e['data']}: "
                                                      f"\"{decisao(e['texto'])}\"" for e in ligados[:2]))
        r.update(resumo=SEM_RESULTADO, assistido=SEM_RESULTADO,
                 evidencia="Número incidental; o DOL não guarda andamentos próprios dele")
        return r

    m = p["mov"] if p else mov(n)
    textos, todos = [], []
    if m and not m.get("sem"):
        og, rl, ini, prev = orgao_relator(m["ev"])
        r.update(orgao=og, relator=rl, inicio=ini or m["pri"])
        if prev:
            r["obs"] = juntar(r["obs"], f"Distribuído por prevenção ao processo {prev}")
        (e, res), todos = julgamento_sg(m["ev"])
        if e:
            r.update(resultado=curto(e["texto"]), data_julg=e["data"], resumo=res or "Ver texto do julgamento")
            outros = [f"{x['data']}: {curto(x['texto'], 160)}" for x, _ in todos if x is not e]
            if outros:
                r["obs"] = juntar(r["obs"], "Outros julgamentos no mesmo número: " + " | ".join(outros))
        else:
            arquivado = any(x["titulo"].startswith("Processo encaminhado para o Arquivo") for x in m["ev"])
            r["resumo"] = SEM_RESULTADO if arquivado else AGUARDANDO
        r["transito"] = transito(m["ev"])
        textos = [x["texto"] for x in m["rp"]] + [x["texto"] for x, _ in todos]
    else:
        r["resumo"] = SEM_RESULTADO
        r["obs"] = juntar(r["obs"], "O DOL não tem andamentos deste número")

    if tipo in ("Conflito de competência cível", "Habeas Corpus Criminal"):
        r.update(recorrente="Não se aplica", assistido="Não se aplica (não é recurso)",
                 evidencia="Feito originário do Tribunal, não é recurso")
        if tipo == "Conflito de competência cível" and r["resultado"]:
            r["resumo"] = "Conflito julgado"
        if tipo == "Habeas Corpus Criminal":
            finais = [x for x, _ in todos if "ordem" in sem_acento(x["texto"])]
            if finais:
                r.update(resultado=curto(finais[-1]["texto"]), data_julg=finais[-1]["data"], resumo="Ordem concedida")
        return r

    quem, prova = recorrente_sg(n, p, pai, textos, por_id)
    if quem == NAO_ID and r["resumo"] == AGUARDANDO:
        for x in meta["prov"]:
            if n in x[9] and re.search(r"contraminuta|contrarrazo", sem_acento(x[2])):
                quem, prova = OUTRA, (f"Providência pendente de {x[0]} no PA {x[8]} manda 'realizar contraminuta' e "
                                      "lista este número entre os autos correlatos; o recurso ainda não foi julgado")
    r["recorrente"], r["evidencia"] = quem, prova
    r["assistido"] = para_assistido(r["resumo"], quem, r["resultado"], lado_dpe(pai, por_id) if pai else "")
    return r


def recorrente_sg(n, p, pai, textos, por_id):
    pets = (p["pet"] if p else []) + (pai["pet"] if pai else [])
    for r in pets:
        if r[4] == n and r[1] == "Petição Inicial" and r[5] == "Enviado":
            return DPE, f"Petição inicial do recurso protocolada pela Defensoria em {r[0]} ('{r[3]}')"
    proprios = [r for r in (p["pet"] if p else []) if r[5] == "Enviado" and re.search(r"contraminuta|contrarraz", r[3])]
    if proprios:
        r = proprios[-1]
        return OUTRA, f"A Defensoria apresentou '{r[3]}' em {r[0]} no PA deste recurso"
    if pai:
        no_tj = [f for f in pai["filhos"] if f in por_id and sg(por_id[f]["cnj"])]
        if no_tj == [p["id"]]:
            cm = [r for r in pai["pet"] if r[5] == "Enviado" and r[2] == "Segundo grau" and
                  re.search(r"contraminuta|contrarraz", r[3])]
            if cm:
                r = cm[-1]
                return OUTRA, (f"A Defensoria apresentou '{r[3]}' em {r[0]} no PA principal, que só tem este "
                               "número no Tribunal")
    achado, _ = autor_no_texto(textos)
    if achado and pai:
        if confere_nome(achado, nomes_dpe(pai, por_id)):
            return DPE, (f"O texto do DOL indica o recurso interposto por \"{achado}\", que confere com pessoa "
                         "representada pela Defensoria no PA")
        return NAO_ID, f"O texto do DOL indica o recorrente como \"{achado}\"; não foi possível ligar ao assistido"
    if achado:
        return NAO_ID, f"O texto do DOL indica o recorrente como \"{achado}\"; o processo não está em PA ativo"
    return NAO_ID, "Sem peticionamento da Defensoria ligado a este número e sem nome do recorrente nos andamentos"


ABRE_APELACAO = ("Apelação/Razões Juntada", "Remessa ao Tribunal de Justiça de São Paulo",
                 "Remetidos os Autos para o Tribunal de Justiça/Colégio Recursal - Processo Digital",
                 "Recebidos os Autos pela Entrada de Recursos")
MARCOS_APELACAO = set(ABRE_APELACAO) | {"Processo encaminhado para a Distribuição de Recursos",
                                        "Recebidos os Autos do Tribunal de Justiça", "Acórdão registrado",
                                        "Decisão Monocrática registrada", "Expedido Certidão de Baixa de Recurso"
                                        } | TIT_JULGAMENTO | set(TIT_2INST) | set(TIT_MONO)


def ciclos_apelacao(ev):
    evs = sorted([e for e in ev if e["titulo"] in MARCOS_APELACAO], key=lambda z: (chave(z["data"]), z["seq"]))
    ciclos, atual, fechado = [], [], False
    for e in evs:
        if fechado and e["titulo"] in ABRE_APELACAO:
            ciclos.append(atual)
            atual, fechado = [], False
        atual.append(e)
        if e["titulo"] in TIT_2INST or e["titulo"] == "Recebidos os Autos do Tribunal de Justiça":
            fechado = True
    if atual:
        ciclos.append(atual)
    return [c for c in ciclos if any(x["titulo"] in ABRE_APELACAO or x["titulo"] in TIT_2INST or
                                     x["titulo"] in TIT_JULGAMENTO or x["titulo"] in TIT_MONO for x in c)]


def recursos_1g(n, p, meta, por_id, classes, mov):
    out = []
    m = p["mov"] if p else mov(n)
    ev = m["ev"] if m and not m.get("sem") else []
    rp = m["rp"] if m and not m.get("sem") else []
    cl = classes.get(n, [])
    apel_cl = [c for c in cl if c["classe"] in RECURSAIS_1G]
    pets = [r for r in (p["pet"] if p else []) if r[5] == "Enviado"]
    protos_dpe = {re.sub(r"[^A-Z0-9]", "", r[4]): r for r in pets if r[4]}
    lado = lado_dpe(p, por_id) if p else ""
    onde = onde_numero(n, p, por_id, meta)
    nomes = nomes_dpe(p, por_id) if p else []

    ciclos = ciclos_apelacao(ev)
    pet_apel = [r for r in pets if "apelação" in r[3].lower()]
    if not ciclos and (apel_cl or pet_apel):
        ciclos = [[]]
    fins = [max(chave(e["data"]) for e in c) if c else "99999999" for c in ciclos]
    for k, c in enumerate(ciclos):
        janela = [r for r in pet_apel if next((j for j, f in enumerate(fins) if chave(r[0]) <= f), len(ciclos) - 1) == k]
        razoes = [e for e in c if e["titulo"] == "Apelação/Razões Juntada"]
        dpe_raz = [e for e in razoes if protocolo(e["texto"]) in protos_dpe]
        dpe_pet_raz = [r for r in janela if r[3].endswith("- razões")]
        dpe_contra = [r for r in janela if "contrarrazões" in r[3]]
        provas, quem = [], NAO_ID
        if dpe_raz:
            provas.append(f"razões de apelação juntadas em {dpe_raz[0]['data']} com protocolo "
                          f"{protocolo(dpe_raz[0]['texto'])}, que é de peticionamento da Defensoria")
        elif dpe_pet_raz:
            provas.append(f"peticionamento da Defensoria de {dpe_pet_raz[0][0]} ('{dpe_pet_raz[0][3]}')")
        if dpe_contra:
            provas.append(f"contrarrazões de apelação da Defensoria em {dpe_contra[0][0]}")
        if (dpe_raz or dpe_pet_raz) and dpe_contra:
            quem = AMBAS
        elif dpe_raz or dpe_pet_raz:
            quem = DPE
        elif dpe_contra:
            quem = OUTRA
        outras = [e for e in razoes if protocolo(e["texto"]) not in protos_dpe]
        if outras and quem == DPE:
            provas.append(f"há também {len(outras)} juntada(s) de razões com protocolo que não é da Defensoria")
        if quem == NAO_ID:
            achado, _ = autor_no_texto([x["texto"] for x in rp if re.search(r"apela", sem_acento(x["texto"]))])
            if achado and confere_nome(achado, nomes):
                quem = DPE
                provas.append(f"o texto do DOL indica como apelante \"{achado}\", pessoa representada pela Defensoria")
            elif achado:
                provas.append(f"o texto do DOL indica como apelante \"{achado}\"")
            elif razoes:
                provas.append("o protocolo das razões juntadas não consta nos peticionamentos da Defensoria no DOL")
        r = novo_recurso(tipo="Apelação", numero=n, grau="Apelação (sobe ao TJ com o mesmo número)", principal=p,
                         principal_cnj=n, pa_recurso=p["pa"] if p else "", onde=onde, recorrente=quem,
                         assunto=apel_cl[0]["assunto"] if apel_cl else "",
                         evidencia=juntar(*provas) or "Sem peticionamento da Defensoria ligado a esta apelação")
        r["materia"] = materia(r["assunto"]) or ("Outro assunto" if r["assunto"] else "")
        datas = [e["data"] for e in c if e["titulo"] in ABRE_APELACAO]
        r["inicio"] = datas[0] if datas else (janela[0][0] if janela else "")
        entrada = [e for e in c if e["titulo"] == "Recebidos os Autos pela Entrada de Recursos"]
        if entrada:
            r["obs"] = entrada[0]["texto"].replace("Vara de origem", "; vara de origem")
        res_ev = [e for e in c if e["titulo"] in TIT_2INST or (e["titulo"] in TIT_JULGAMENTO and e["texto"])]
        so_embargos = [e for e in res_ev if sem_acento(decisao(e["texto"])).startswith(("rejeitaram os embargos",
                       "acolheram os embargos", "nao conheceram dos embargos", "acolheram em parte os embargos"))]
        res_ev = [e for e in res_ev if e not in so_embargos]
        mono = [e for e in c if e["titulo"] in TIT_MONO]
        if so_embargos:
            r["obs"] = juntar(r["obs"], "; ".join(f"Embargos de declaração no TJ, {e['data']}: \"{decisao(e['texto'])}\""
                                                  for e in so_embargos))
        if res_ev:
            e = next((x for x in res_ev if x["titulo"] in TIT_2INST), res_ev[0])
            txt = decisao(e["texto"]) if e["titulo"] in TIT_2INST else e["texto"]
            r.update(resultado=curto(txt), data_julg=e["data"],
                     resumo=resumo_texto(txt, TIT_2INST.get(e["titulo"], "")) or "Ver texto do julgamento")
            tr = re.search(r"TR[ÂA]NSITO EM JULGADO:\s*([\d/]+\d)", e["texto"], re.I)
            if tr:
                r["transito"] = tr.group(1)
        elif mono:
            e = mono[0]
            r.update(resultado=curto(e["texto"]), data_julg=e["data"],
                     resumo=resumo_texto(e["texto"], TIT_MONO[e["titulo"]]) or TIT_MONO[e["titulo"]])
        elif any(e["titulo"] == "Recebidos os Autos do Tribunal de Justiça" for e in c):
            volta = [e["data"] for e in c if e["titulo"] == "Recebidos os Autos do Tribunal de Justiça"][-1]
            r.update(resumo=SEM_RESULTADO,
                     resultado=f"Autos devolvidos pelo TJ em {volta}; as movimentações do DOL não trazem o resultado")
        else:
            r["resumo"] = AGUARDANDO
            if apel_cl:
                r["obs"] = juntar(r["obs"], f"Última intimação na classe {apel_cl[0]['texto']}: {apel_cl[0]['ultima']}")
        r["assistido"] = para_assistido(r["resumo"], quem, r["resultado"], lado)
        out.append(r)

    eds = sorted([e for e in ev if e["titulo"] == "Embargos de Declaração Juntados"],
                 key=lambda z: (chave(z["data"]), z["seq"]))
    res_ed = sorted([e for e in ev if e["titulo"] in TIT_ED], key=lambda z: (chave(z["data"]), z["seq"]))
    ped = [r for r in pets if "embargos de declaração" in r[3]]
    usados, pares = set(), []
    for k, e in enumerate(eds):
        prox = chave(eds[k + 1]["data"]) if k + 1 < len(eds) else "99999999"
        res = [x for x in res_ed if chave(e["data"]) <= chave(x["data"]) < prox and id(x) not in usados][:1]
        usados.update(id(x) for x in res)
        pares.append((e, res))
    pares += [(None, [x]) for x in res_ed if id(x) not in usados]
    for e, res in pares:
        quem, provas = NAO_ID, []
        if e:
            pr = protocolo(e["texto"])
            if pr in protos_dpe:
                quem = DPE
                provas.append(f"protocolo {pr} é de peticionamento da Defensoria ({protos_dpe[pr][0]})")
            else:
                contra = [r for r in ped if "contrarrazões" in r[3] and 0 <= (dt(r[0]) - dt(e["data"])).days <= 60]
                if contra:
                    quem = OUTRA
                    provas.append(f"contrarrazões da Defensoria aos embargos em {contra[0][0]}")
                elif pr:
                    provas.append(f"protocolo {pr} não consta nos peticionamentos da Defensoria no DOL")
        texto = res[0]["texto"] if res else ""
        if quem == NAO_ID and texto:
            achado, _ = autor_no_texto([texto])
            papel = polo_do_papel(achado)
            if papel and lado:
                quem = DPE if papel == lado else OUTRA
                provas.append(f"a decisão registra embargos opostos pela parte \"{achado}\" e a ficha do PA indica a "
                              f"Defensoria no polo {'ativo' if lado == 'autor' else 'passivo'}")
            elif achado and confere_nome(achado, nomes):
                quem = DPE
                provas.append(f"a decisão registra embargos opostos por \"{achado}\", pessoa representada pela Defensoria")
            elif achado:
                provas.append(f"a decisão registra embargos opostos por \"{achado}\"")
        if not e:
            provas.append("a oposição dos embargos não aparece nos andamentos guardados pelo DOL")
        elif not provas:
            provas.append("a juntada dos embargos não traz protocolo que permita ligar ao peticionamento")
        resumo = TIT_ED[res[0]["titulo"]] if res else SEM_RESULTADO
        eq = {"Acolhidos": PROVIDO, "Rejeitados": NAO_PROVIDO, "Não conhecidos": NAO_CONHECIDO}.get(resumo, resumo)
        out.append(novo_recurso(tipo="Embargos de declaração", numero=n, grau="1º grau", principal=p,
                                principal_cnj=n, pa_recurso=p["pa"] if p else "", onde=onde,
                                inicio=e["data"] if e else "", recorrente=quem, evidencia=juntar(*provas),
                                resultado=curto(texto), data_julg=res[0]["data"] if res else "", resumo=resumo,
                                assistido=para_assistido(eq, quem)))

    tem_sg = bool(p) and any(f in por_id and sg(por_id[f]["cnj"]) for f in p["filhos"])
    tem_pet = any("agravo de instrumento" in r[3] for r in pets)
    ag1 = sorted([e for e in ev if e["titulo"].startswith("Agravo de Instrumento - ")], key=lambda z: chave(z["data"]))
    if ag1 and not tem_sg and not tem_pet:
        out.append(novo_recurso(
            tipo="Agravo de instrumento (número não informado no DOL)", grau="2º grau", principal=p, principal_cnj=n,
            onde=onde, inicio=ag1[0]["data"], resumo=SEM_RESULTADO, assistido=INDETERMINADO,
            evidencia="Nenhum agravo com número está ligado a este processo no DOL e não há peticionamento de agravo",
            obs="Andamentos do 1º grau: " + "; ".join(f"{e['data']}: {e['titulo']}" for e in ag1)))
    return out


def carregar_arquivados():
    """PAs arquivados no DOL em 2026 (dados/arquivados2026.json, lidos do DOL em modo leitura)."""
    arq = DADOS / "arquivados2026.json"
    if not arq.exists():
        return None, []
    E = json.loads(arq.read_text(encoding="utf-8"))
    D = E["D"]
    lista = []
    for i, pa, cnj, data, s, a, e, cor in E["R"]:
        cls = []
        for c in E["I"].get(cnj, []):
            classe, assunto = separar_classe(D[c[0]])
            cls.append({"classe": classe, "assunto": assunto, "texto": D[c[0]], "ultima": c[1], "qtd": c[2],
                        "foro": D[c[3]], "primeira": ""})
        m = E["M"].get(cnj)
        mv = None
        if m == 0:
            mv = {"sem": True}
        elif m:
            mv = {"n": m[0], "u3": [(m[1], D[m[2]])] if m[1] else [], "fim": (m[3], D[m[4]]) if m[3] else None,
                  "ev": [], "rp": [], "mg": []}
        p = {"id": i, "pa": pa, "cnj": cnj, "data_arq": data, "sis": s, "acao": D[a],
             "est": [z for z in D[e].split("|") if z], "cor": cor, "classes": cls, "mov": mv, "pet": [],
             "pai": "", "fase": ""}
        classificar(p)
        definir_tipo(p)
        p["situacao"] = situacao_tj(mv)
        lista.append(p)
    meta = {"extraido_em": E["extraido_em"], "total": E["total"], "porAno": E["porAno"],
            "porMes2026": E["porMes2026"]}
    return meta, lista


GRUPOS_ATO = [
    ("Petição inicial", r"^Petição Inicial\|Primeiro grau"),
    ("Recurso ou resposta a recurso", r"agravo|apelação|embargos de declaração|recurso|contrarraz|contraminuta|Segundo grau"),
    ("Cumprimento de sentença (pedido)", r"cumprimento de sentença|cumprimento provisório|Execução - Início"),
    ("Defesa: impugnação, embargos ou contestação", r"Impugnação|embargos|Contestação|contestação|Defesa|defesa|Reconvenção"),
    ("Manifestação, ciência ou outra petição", r".*"),
]


def grupo_ato(tipo, grau, ato):
    chave = f"{tipo}|{grau}|{ato}"
    for nome, rx in GRUPOS_ATO:
        if re.search(rx, chave):
            return nome
    return GRUPOS_ATO[-1][0]


def carregar_conferencia(pas, por_id):
    """Conferência da lista de ativos (dados/conferencia_25set.json, lida no DOL em 25/09/2026, somente leitura).

    Traz a lista completa de ativos com os correlatos, os novos, os redistribuídos, os sem providência e as
    intimações pendentes. A ação e a vara de um PA que entrou depois de 23/09 vêm do código que a exportação usa
    para as mesmas ações e varas dos PAs já conhecidos; código sem correspondência única fica sem valor.
    """
    arq = DADOS / "conferencia_25set.json"
    if not arq.exists():
        return None
    E = json.loads(arq.read_text(encoding="utf-8"))
    lista = {p["id"] for p in pas if not p["pai"]}
    acoes, varas = defaultdict(Counter), defaultdict(Counter)
    for r in E["ativo"]:
        p = por_id.get(r[0])
        if p and not p["pai"]:
            acoes[r[3]][p["acao"]] += 1
            varas[r[4]]["|".join(p["est"])] += 1

    def unico(cont):
        return next(iter(cont)) if len(cont) == 1 else ""

    novo = dict(E["sub"]["NOVO"])
    sem = set(E["sub"]["SEM"])
    ids = [r[0] for r in E["ativo"]]
    novos = []
    for i, pa, cnj, a, e, cor, nomes in E["ativo"]:
        if i in lista:
            continue
        acao = unico(acoes[a])
        p = {"id": i, "pa": pa, "cnj": cnj, "controle": "", "sis": "", "acao": acao,
             "est": [z for z in unico(varas[e]).split("|") if z], "nomes": nomes or [], "urgente": False,
             "sem_acesso": False, "origem": "lista", "pai": "", "data_insercao": "", "novo": novo.get(i, ""),
             "redist": None, "sem_prov": i in sem, "cor": [], "partes": [], "tab_partes": None, "ficha_arq": False,
             "filhos": [], "pet": [], "n_pet": 0, "mov": None, "classes": [], "nomes_ficha": [], "depois": True}
        classificar(p)
        p["base"] = (f"PA incluído na 9ª em {p['novo'] or 'data não informada'}, depois da leitura completa de 23/09: "
                     f"classe do TJ e andamentos não lidos; ação no DOL: {acao or 'não identificada'}")
        definir_tipo(p)
        novos.append(p)
    return {"extraido_em": E["extraido_em"], "tot": E["tot"], "sub": E["sub"], "ativo_ids": ids,
            "cor_ids": [c[1] for r in E["ativo"] for c in r[5]], "novos": novos,
            "sairam": [i for i in lista if i not in set(ids)], "pend": E["pend"]}


def carregar_completa():
    """Leitura complementar (dados/completa.json): situações do DOL, todas as petições e todas as intimações."""
    arq = DADOS / "completa.json"
    if not arq.exists():
        return None
    E = json.loads(arq.read_text(encoding="utf-8"))
    D = E["D"]
    pet = {}
    for pid, rows in E["P"].items():
        if rows == 0:
            pet[pid] = None
            continue
        lista = []
        for data, k, proto, st in rows:
            tipo, grau, ato = D[k].split("|", 2)
            lista.append({"data": data, "tipo": tipo, "grau": grau, "ato": ato, "protocolo": proto, "status": D[st],
                          "grupo": grupo_ato(tipo, grau, ato)})
        pet[pid] = lista
    intim = {}
    for num, (loc, pend, cls) in E["I"].items():
        itens = []
        for c in cls:
            classe, assunto = separar_classe(D[c[0]])
            itens.append({"classe": classe, "assunto": assunto, "texto": D[c[0]], "primeira": c[1], "ultima": c[2],
                          "qtd": c[3], "foro": D[c[4]]})
        intim[num] = {"loc": loc, "pendentes": pend,
                      "classes": sorted(itens, key=lambda z: (chave(z["ultima"]), z["qtd"]), reverse=True)}
    return {"extraido_em": E["extraido_em"], "tot": E["tot"], "sub": E["sub"], "ativo_ids": E["ativo_ids"].split(","),
            "cor_ids": [x for x in E["cor_ids"].split(",") if x], "novos": E.get("novos", []), "pet": pet,
            "intim": intim}
