"""
Orquestrador da Fábrica de Folders DPESP.
Pipeline: Redator → Formatador → Revisor → Arquivo HTML.

Uso:
    python orquestrador.py "Nome do Tema"
"""

import re
import sys
import os
from datetime import datetime
from pathlib import Path

import anthropic
from dotenv import load_dotenv

_BASE_DIR = Path(__file__).parent
sys.path.insert(0, str(_BASE_DIR))

from agents.agente_redator import AgenteRedator
from agents.agente_formatador import AgenteFormatador
from agents.agente_revisor import AgenteRevisor


def _slugify(texto: str) -> str:
    texto = texto.lower().strip()
    texto = re.sub(r"[àáâãä]", "a", texto)
    texto = re.sub(r"[èéêë]", "e", texto)
    texto = re.sub(r"[ìíîï]", "i", texto)
    texto = re.sub(r"[òóôõö]", "o", texto)
    texto = re.sub(r"[ùúûü]", "u", texto)
    texto = re.sub(r"[ç]", "c", texto)
    texto = re.sub(r"[^a-z0-9]+", "_", texto)
    return texto.strip("_")


class OrquestradorFabrica:
    def __init__(self):
        load_dotenv(_BASE_DIR / ".env")
        api_key = os.environ.get("ANTHROPIC_API_KEY")
        if not api_key:
            raise EnvironmentError(
                "ANTHROPIC_API_KEY não encontrada. "
                "Crie FabricaFolders/.env com ANTHROPIC_API_KEY=sk-..."
            )
        client = anthropic.Anthropic(api_key=api_key)
        self.redator = AgenteRedator(client)
        self.formatador = AgenteFormatador(client)
        self.revisor = AgenteRevisor()

    def criar_folder(self, tema: str, arquivo_saida: str | None = None) -> str:
        print(f"\n{'='*60}")
        print(f"  FÁBRICA DE FOLDERS DPESP — {tema.upper()}")
        print(f"{'='*60}\n")

        conteudo = self.redator.executar(tema)
        html = self.formatador.executar(conteudo)
        relatorio = self.revisor.executar(html)

        if not relatorio["aprovado"]:
            raise RuntimeError(
                f"Folder reprovado na auditoria de compliance.\n"
                f"Erros: {relatorio['erros']}"
            )

        if arquivo_saida:
            caminho = Path(arquivo_saida)
        else:
            slug = _slugify(tema)
            ts = datetime.now().strftime("%Y%m%d_%H%M%S")
            caminho = _BASE_DIR / "output" / f"folder_{slug}_{ts}.html"

        caminho.parent.mkdir(parents=True, exist_ok=True)
        caminho.write_text(html, encoding="utf-8")

        print(f"\n[OK] Folder salvo em: {caminho}")
        return str(caminho)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Uso: python orquestrador.py \"Nome do Tema\"")
        sys.exit(1)
    tema = sys.argv[1]
    orquestrador = OrquestradorFabrica()
    orquestrador.criar_folder(tema)
