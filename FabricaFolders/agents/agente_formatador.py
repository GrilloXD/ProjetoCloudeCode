from pathlib import Path

import anthropic
from skills.skill_injecao_html import gerar_fragmentos_html, montar_html_final

_LOGO_PATH = Path(__file__).parent.parent / "templates" / "assets" / "logo_dpe_b64.txt"


class AgenteFormatador:
    """Agente responsável pela geração do HTML final do folder."""

    def __init__(self, client: anthropic.Anthropic):
        self.client = client
        self._logo_b64 = _LOGO_PATH.read_text(encoding="utf-8").strip()

    def executar(self, conteudo: dict) -> str:
        print("[Formatador] Convertendo conteúdo em HTML...")
        fragmentos = gerar_fragmentos_html(conteudo, self.client)
        # Inclui título no fragmentos para substituição no template
        fragmentos["titulo"] = conteudo.get("titulo", "Folder Informativo")
        html = montar_html_final(fragmentos, self._logo_b64)
        print(f"[Formatador] HTML montado — {len(html.encode()) // 1024} KB.")
        return html
