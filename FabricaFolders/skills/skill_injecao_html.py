"""
Skill de Injeção HTML.
Converte o JSON de conteúdo em fragmentos HTML e monta o HTML final do folder.
"""

import json
import sys
from pathlib import Path

import anthropic

sys.path.insert(0, str(Path(__file__).parent.parent))
from config.regras_globais import CLASSES_BOX, IDENTIDADE_VISUAL, CONTATOS_DPE

_TEMPLATE_PATH = Path(__file__).parent.parent / "templates" / "template_base.html"

_SYSTEM_FORMATADOR = f"""Você é um desenvolvedor front-end especializado em HTML para impressão.
Converte JSON de conteúdo em fragmentos HTML usando as classes CSS do sistema de design DPESP.

CLASSES DISPONÍVEIS:
  .sec-title  — título de seção (verde, maiúsculo, negrito)
  .box .box-gl  — box verde claro (informativo)
  .box .box-gm  — box verde médio (complementar)
  .box .box-amb — box âmbar (atenção)
  .box .box-red — box vermelho (alerta crítico)
  .box .box-gy  — box cinza (lista neutra)
  .box-dk       — box verde escuro (CTA — use com mt-auto para flutuar ao fundo)
  .bt           — texto negrito verde (#006622)
  .bta          — texto negrito âmbar
  .btr          — texto negrito vermelho
  .btw          — texto branco
  .body         — corpo 13.5px
  .sm           — texto 12.5px
  .xs           — texto 11.5px
  .badge        — círculo numerado verde
  .divider      — linha divisória verde
  .flex .gap-2  — layout horizontal com gap
  .space-y-2    — espaçamento vertical entre itens
  .mt-auto      — empurra elemento para o fundo do painel (flexbox)
  .mb-1, .mb-2, etc.

REGRAS:
- Nunca use justify em listas ou itens curtos — apenas em parágrafos longos.
- Sem emojis.
- O CTA do painel 6 deve usar class="mt-auto box-dk text-center" e conter referência à DPE.
- Gere HTML limpo, sem comentários, sem tags <html>/<head>/<body>.
- Para cada painel: retorne somente o HTML interno que vai dentro de <div class="panel">.
- Para a capa (painel 3): retorne somente o conteúdo interno de .cover-body e .cover-footer (sem as divs externas).

CONTATOS DPE (para CTAs):
  Endereço: {CONTATOS_DPE["endereco"]}
  Telefone: {CONTATOS_DPE["telefone"]} / {CONTATOS_DPE["telefone_gratuito"]}
  E-mail: {CONTATOS_DPE["email"]}

FORMATO DE SAÍDA:
Retorne SOMENTE JSON válido com as chaves painel_1, painel_2, painel_3, painel_4, painel_5, painel_6.
Cada valor é uma string HTML. Sem markdown, sem comentários.
"""


def gerar_fragmentos_html(conteudo: dict, client: anthropic.Anthropic) -> dict:
    user_msg = (
        "Converta este JSON de conteúdo em fragmentos HTML para cada painel.\n"
        "JSON:\n" + json.dumps(conteudo, ensure_ascii=False, indent=2)
    )

    with client.messages.stream(
        model="claude-opus-4-7",
        max_tokens=8192,
        thinking={"type": "adaptive"},
        system=[
            {
                "type": "text",
                "text": _SYSTEM_FORMATADOR,
                "cache_control": {"type": "ephemeral"},
            }
        ],
        messages=[{"role": "user", "content": user_msg}],
    ) as stream:
        msg = stream.get_final_message()

    raw = ""
    for block in msg.content:
        if block.type == "text":
            raw = block.text
            break

    raw = raw.strip()
    if raw.startswith("```"):
        raw = raw.split("\n", 1)[1]
        raw = raw.rsplit("```", 1)[0].strip()

    return json.loads(raw)


def montar_html_final(fragmentos: dict) -> str:
    template = _TEMPLATE_PATH.read_text(encoding="utf-8")

    titulo = fragmentos.get("titulo", "Folder Informativo")
    html = template.replace("{{TITULO}}", titulo)

    for i in range(1, 7):
        chave = f"painel_{i}"
        placeholder = f"{{{{PAINEL_{i}_CONTENT}}}}"
        fragmento = fragmentos.get(chave, "")
        html = html.replace(placeholder, fragmento)

    return html
