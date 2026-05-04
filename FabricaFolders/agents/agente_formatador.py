import anthropic
from skills.skill_injecao_html import gerar_fragmentos_html, montar_html_final


class AgenteFormatador:
    """Agente responsável pela geração do HTML final do folder."""

    def __init__(self, client: anthropic.Anthropic):
        self.client = client

    def executar(self, conteudo: dict) -> str:
        print("[Formatador] Convertendo conteúdo em HTML...")
        fragmentos = gerar_fragmentos_html(conteudo, self.client)
        fragmentos["titulo"] = conteudo.get("titulo", "Folder Informativo")
        html = montar_html_final(fragmentos)
        print(f"[Formatador] HTML montado — {len(html.encode()) // 1024} KB.")
        return html
