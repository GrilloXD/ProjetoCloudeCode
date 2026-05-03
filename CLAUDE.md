# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Status

This is a new, empty project. No source files, build system, or dependencies have been set up yet.

## Repository Notes

- The only configuration present is `.claude/settings.local.json`, which grants permissions for GitHub CLI (`gh`) commands and directory listing via PowerShell.
- Platform: Windows 11, PowerShell primary shell.

## Guidelines

### REGRA OBRIGATÓRIA: Auto-commit após modificações
Toda vez que você (Claude) modificar o código, finalizar uma implementação ou resolver um bug, você deve executar automaticamente o `git add .`, criar um `git commit` com uma mensagem descritiva do que foi feito, e dar um `git push` para o repositório remoto antes de encerrar a resposta.
