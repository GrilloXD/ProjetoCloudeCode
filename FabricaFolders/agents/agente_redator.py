import anthropic
from skills.skill_redacao_juridica import gerar_conteudo


class AgenteRedator:
    """Agente responsável pela geração de conteúdo jurídico estruturado."""

    def __init__(self, client: anthropic.Anthropic):
        self.client = client

    def executar(self, tema: str) -> dict:
        print(f"[Redator] Gerando conteúdo para: {tema!r}")
        conteudo = gerar_conteudo(tema, self.client)
        print(f"[Redator] Conteúdo gerado — {len(conteudo)} campos.")
        return conteudo
