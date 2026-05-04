# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Status

Active development. Contains the **Fábrica de Folders DPESP** — a multi-agent pipeline that auto-generates printable legal information folders.

## Fábrica de Folders DPESP

Located at `FabricaFolders/`.

### How to run

```powershell
cd FabricaFolders
pip install -r requirements.txt
# Create .env with your API key:
# ANTHROPIC_API_KEY=sk-ant-...
python orquestrador.py "Nome do Tema"
```

Output is saved to `FabricaFolders/output/folder_<slug>_<timestamp>.html`.

### Architecture

Three agents in a linear pipeline:

| Agent | File | Role |
|---|---|---|
| AgenteRedator | `agents/agente_redator.py` | Calls Claude to generate structured JSON content for 6 panels |
| AgenteFormatador | `agents/agente_formatador.py` | Calls Claude to convert JSON to HTML fragments; assembles final HTML |
| AgenteRevisor | `agents/agente_revisor.py` | Pure Python compliance audit (color, font, CTA, size, emojis) |

### Key files

| File | Purpose |
|---|---|
| `config/regras_globais.py` | Single source of truth for all design/business rules |
| `templates/template_base.html` | A4 landscape HTML template with `{{PAINEL_N_CONTENT}}` placeholders |
| `templates/assets/logo_dpe_b64.txt` | DPESP logo in base64 (injected as `{{LOGO_B64}}`) |
| `skills/skill_redacao_juridica.py` | Claude API call — generates content JSON |
| `skills/skill_injecao_html.py` | Claude API call — converts JSON to HTML |
| `skills/skill_auditoria_compliance.py` | Regex-based compliance checker |

### Prerequisites

- Python 3.11+
- `FabricaFolders/.env` containing `ANTHROPIC_API_KEY`
- Internet connection (Tailwind CDN + Google Fonts in generated HTML)

## Repository Notes

- The only configuration present is `.claude/settings.local.json`, which grants permissions for GitHub CLI (`gh`) commands and directory listing via PowerShell.
- Platform: Windows 11, PowerShell primary shell.

## Guidelines

### REGRA OBRIGATÓRIA: Auto-commit após modificações
Toda vez que você (Claude) modificar o código, finalizar uma implementação ou resolver um bug, você deve executar automaticamente o `git add .`, criar um `git commit` com uma mensagem descritiva do que foi feito, e dar um `git push` para o repositório remoto antes de encerrar a resposta.
