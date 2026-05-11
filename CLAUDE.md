# CLAUDE.md

Guidance for Claude Code in this repository.

## Project

**Fábrica de Folders DPESP** — pipeline multi-agente que gera folders informativos jurídicos em HTML/A4.

### Run

```powershell
cd FabricaFolders
python orquestrador.py "Nome do Tema"
# Output: FabricaFolders/output/folder_<slug>_<timestamp>.html
```

### Structure

`FabricaFolders/` — three agents: AgenteRedator → AgenteFormatador → AgenteRevisor.
Config: `config/regras_globais.py`. Template: `templates/template_base.html`.

### Prerequisites

- Python 3.11+, `FabricaFolders/.env` with `ANTHROPIC_API_KEY`
- Internet (Tailwind CDN + Google Fonts in output HTML)

## Environment

- Platform: Windows 11, PowerShell.
- `.claude/settings.local.json` grants permissions for `gh` and PowerShell directory listing.

## Guidelines

### Commits
Ao finalizar uma tarefa completa (não a cada modificação), execute `git add`, `git commit` com mensagem descritiva, e `git push`.
