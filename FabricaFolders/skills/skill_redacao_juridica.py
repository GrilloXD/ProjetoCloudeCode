"""
Skill de Redação Jurídica.
Chama Claude para gerar conteúdo estruturado em JSON para os 6 painéis do folder.
"""

import json
import sys
from pathlib import Path

import anthropic

sys.path.insert(0, str(Path(__file__).parent.parent))
from config.regras_globais import (
    CONTATOS_DPE,
    CONTATOS_CEJUSC,
    REGRAS_CONTEUDO,
    IDENTIDADE_VISUAL,
    CLASSES_BOX,
)

_SYSTEM_PROMPT = f"""Você é um redator jurídico especializado da Defensoria Pública do Estado de São Paulo (DPESP), \
Unidade Ribeirão Preto. Cria conteúdo para folders informativos impressos em formato A4 paisagem (6 painéis).

REGRAS OBRIGATÓRIAS:
- Sem emojis, sem símbolos decorativos.
- Linguagem acessível ao público leigo, mas juridicamente precisa.
- Listas curtas: alinhamento à esquerda.
- Parágrafos longos: justificado.
- O CTA principal SEMPRE direciona para a DPE — nunca diretamente para órgão externo.
- Blocos obrigatórios em qualquer folder: {REGRAS_CONTEUDO["blocos_obrigatorios"]}.

CONTATOS DPE (usar sempre no CTA):
  Endereço: {CONTATOS_DPE["endereco"]}
  Telefone: {CONTATOS_DPE["telefone"]} / {CONTATOS_DPE["telefone_gratuito"]}
  E-mail:   {CONTATOS_DPE["email"]}

CLASSES DE BOX DISPONÍVEIS (use exatamente esses nomes):
  gl  = verde claro — informativo
  gm  = verde médio — complementar
  amb = âmbar       — atenção / aviso
  red = vermelho    — alerta crítico
  gy  = cinza       — lista neutra
  dk  = verde escuro — CTA (call-to-action)

ESTRUTURA DO FOLDER:
  Página 1 (exterior):
    Painel 1 — conteúdo principal / o que é o tema
    Painel 2 — como funciona / passo a passo
    Painel 3 — CAPA: título, subtítulo, tagline (fundo verde, texto branco)
  Página 2 (interior):
    Painel 4 — "Quando usar" + exemplo prático
    Painel 5 — informações complementares / documentos / requisitos
    Painel 6 — "Importante Saber" + CTA DPE

FORMATO DE SAÍDA:
Retorne SOMENTE JSON válido, sem markdown, sem comentários. Esquema:
{{
  "titulo": "string — título do tema para a capa",
  "subtitulo": "string — subtítulo da capa",
  "tagline": "string — frase motivacional curta para a capa",
  "painel_1": {{
    "sec_title": "string",
    "blocos": [
      {{
        "tipo": "box_gl|box_gm|box_amb|box_red|box_gy|box_dk|paragrafo|lista|badge_list",
        "titulo_negrito": "string ou null",
        "linhas": ["string", ...]
      }}
    ],
    "cta": null
  }},
  "painel_2": {{ ... mesmo esquema ... }},
  "painel_4": {{ ... mesmo esquema ... }},
  "painel_5": {{ ... mesmo esquema ... }},
  "painel_6": {{
    "sec_title": "string",
    "blocos": [...],
    "cta": {{
      "titulo": "string",
      "linhas": ["string", ...]
    }}
  }}
}}
(Painel 3 é gerado automaticamente como capa — não inclua no JSON.)
"""


def gerar_conteudo(tema: str, client: anthropic.Anthropic) -> dict:
    user_msg = (
        f"Crie o conteúdo completo para um folder informativo sobre: **{tema}**.\n"
        "Siga todas as regras do system prompt. Retorne somente JSON válido."
    )

    with client.messages.stream(
        model="claude-opus-4-7",
        max_tokens=4096,
        thinking={"type": "adaptive"},
        system=[
            {
                "type": "text",
                "text": _SYSTEM_PROMPT,
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
