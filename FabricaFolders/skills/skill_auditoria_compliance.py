"""
Auditoria de compliance para folders gerados pela Fábrica.
Checagens puramente em Python — sem chamadas à API.
"""

import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))
from config.regras_globais import REGRAS_AUDITORIA, REGRAS_CONTEUDO

_EMOJI_RE = re.compile(
    "["
    "\U0001F000-\U0001F9FF"
    "\U00002600-\U000027FF"
    "\U0001FA00-\U0001FFFF"
    "]+",
    re.UNICODE,
)


def auditar(html: str) -> dict:
    erros: list[str] = []
    avisos: list[str] = []

    # 1. Cor obrigatória
    if REGRAS_AUDITORIA["cor_obrigatoria"].lower() not in html.lower():
        erros.append(f"Cor obrigatória {REGRAS_AUDITORIA['cor_obrigatoria']} não encontrada no HTML.")

    # 2. Fonte obrigatória
    if REGRAS_AUDITORIA["fonte_obrigatoria"].lower() not in html.lower():
        erros.append(f"Fonte obrigatória '{REGRAS_AUDITORIA['fonte_obrigatoria']}' não encontrada no HTML.")

    # 3. CTA deve conter referência à DPE
    html_lower = html.lower()
    cta_ok = any(termo.lower() in html_lower for termo in REGRAS_AUDITORIA["cta_deve_conter"])
    if not cta_ok:
        erros.append(
            f"CTA não contém nenhum dos termos obrigatórios: {REGRAS_AUDITORIA['cta_deve_conter']}"
        )

    # 4. Quantidade de painéis: exige 6 divs de painel (panel, panel-cover, panel bg-white, etc.)
    paineis = len(re.findall(r'class="panel[\s"\-b]', html))
    if paineis < 6:
        erros.append(f"Esperados 6 painéis, encontrados {paineis}.")
    elif paineis > 6:
        avisos.append(f"Encontrados {paineis} painéis (esperado 6).")

    # 5. Nenhum placeholder não substituído
    placeholders = re.findall(r"\{\{[A-Z_0-9]+\}\}", html)
    if placeholders:
        erros.append(f"Placeholders não substituídos: {list(set(placeholders))}")

    # 6. Ausência de emojis
    if _EMOJI_RE.search(html):
        erros.append("HTML contém emojis — proibido pelas regras de conteúdo.")

    # 7. Tamanho máximo
    tamanho_kb = len(html.encode("utf-8")) / 1024
    if tamanho_kb > REGRAS_AUDITORIA["tamanho_maximo_html_kb"]:
        erros.append(
            f"HTML muito grande: {tamanho_kb:.1f} KB "
            f"(máximo {REGRAS_AUDITORIA['tamanho_maximo_html_kb']} KB)."
        )
    elif tamanho_kb > REGRAS_AUDITORIA["tamanho_maximo_html_kb"] * 0.8:
        avisos.append(f"HTML próximo do limite: {tamanho_kb:.1f} KB.")

    return {
        "aprovado": len(erros) == 0,
        "erros": erros,
        "avisos": avisos,
        "tamanho_kb": round(tamanho_kb, 1),
    }
