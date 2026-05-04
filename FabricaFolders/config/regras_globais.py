"""
Regras globais de design e negócio para a Fábrica de Folders DPESP.
Fonte única de verdade para todos os agentes — não altere sem revisar o impacto em cadeia.
"""

IDENTIDADE_VISUAL = {
    "cor_principal":    "#009632",   # PANTONE 355 C
    "cor_escura":       "#007828",
    "cor_texto_verde":  "#006622",
    "cor_bg":           "#f2faf5",
    "fonte":            "Source Sans 3",
    "fonte_fallback":   "Arial, sans-serif",
    "logo_altura":      "30mm",
    "pantone":          "355 C",
}

TIPOGRAFIA = {
    "body_size":      "13.5px",
    "sm_size":        "12.5px",
    "xs_size":        "11.5px",
    "box_size":       "13px",
    "bt_size":        "13px",
    "sec_title_size": "11pt",
}

CONTATOS_DPE = {
    "nome":              "Defensoria Pública do Estado de São Paulo – Unidade Ribeirão Preto",
    "endereco":          "Rua Alice Além Saad, 1.256 – Nova Ribeirânia",
    "cep":               "14096-570",
    "telefone":          "(16) 2111-5850",
    "telefone_gratuito": "0800 773 4340",
    "email":             "triagem.ribpreto@defensoria.sp.def.br",
    "site":              "www.defensoria.sp.def.br",
}

CONTATOS_CEJUSC = {
    "nome":                "CEJUSC – Ribeirão Preto",
    "endereco_presencial": "Faculdade Barão de Mauá – R. Aureliano García de Oliveira, 218",
    "horario":             "9h–11h / 13h–16h30 (dias úteis)",
    "email":               "cejusc.ribpreto@tjsp.jus.br",
}

REGRAS_LAYOUT = {
    "formato":             "A4 landscape",
    "paginas":             2,
    "paineis_por_pagina":  3,
    "padding_painel":      "7mm 8.5mm",
    "overflow":            "hidden",
}

REGRAS_CONTEUDO = {
    # Blocos obrigatórios em qualquer folder
    "blocos_obrigatorios":            ["Quando usar", "Exemplo prático", "Importante Saber"],
    # O CTA principal sempre direciona para a DPE — nunca diretamente para o órgão externo
    "cta_principal_aponta_para":      "DPE",
    "alinhamento_listas":             "left",       # nunca justify em listas/itens curtos
    "alinhamento_paragrafos_longos":  "justify",
    "sem_emojis":                     True,
    "lista_spacing":                  "space-y-0.5",
}

REGRAS_AUDITORIA = {
    "cor_obrigatoria":       "#009632",
    "fonte_obrigatoria":     "Source Sans 3",
    # Pelo menos um desses termos deve aparecer no HTML dos CTAs
    "cta_deve_conter":       ["defensoria", "dpe", "0800 773 4340", "triagem.ribpreto"],
    "tamanho_maximo_html_kb": 600,
}

# Classes CSS do template — usadas pelo Formatador para montagem dos boxes
CLASSES_BOX = {
    "gl":  "box box-gl",   # verde claro   — informativo
    "gm":  "box box-gm",   # verde médio   — complementar
    "amb": "box box-amb",  # âmbar         — atenção
    "red": "box box-red",  # vermelho      — alerta crítico
    "gy":  "box box-gy",   # cinza         — lista/neutro
    "dk":  "box-dk",       # verde escuro  — CTA (call-to-action)
}
