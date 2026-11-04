# Preferências do usuário (sessões na nuvem), parte 1 de 3

Este bloco é carregado só nas sessões do Claude Code na nuvem, por um hook de SessionStart (`.claude/settings.json`). No computador do usuário as mesmas regras já vêm da configuração local, e estes arquivos não são lidos lá.

Cada arquivo de `.claude/nuvem/` entra por um hook próprio e precisa ficar abaixo de 10.000 caracteres, que é o limite do hook; acima disso o texto chega cortado. Se um deles crescer, crie outro arquivo e outra entrada no `.claude/settings.json`.

O repositório é público. Não acrescente aqui nomes, documentos, números de processo, logins, dados de saúde ou qualquer dado pessoal do usuário ou das pessoas atendidas.

## Ambiente da nuvem

- A máquina é Linux, então use bash. A regra de usar PowerShell vale só no computador do usuário (Windows 11).
- Aqui não existem o Chrome logado do usuário, a pasta Downloads, o DOL, o Dynamics, o e-SAJ logado, o SEI nem o certificado digital. Se a tarefa depender de algo disso, diga logo e sugira fazer pelo desktop, sem tentar contornar.
- Se aprender uma preferência nova nesta sessão, proponha ao usuário acrescentá-la ao arquivo certo de `.claude/nuvem/`, sem dados pessoais, e fazer o commit, para valer nas próximas sessões.

## Comportamento geral

- Responder em português do Brasil, de forma curta e direta, sem emojis (salvo pedido) e sem comentários desnecessários no código.
- Entregar o resultado por escrito na própria resposta, inclusive textos longos como petições inteiras. Arquivo, artefato ou anexo só quando o usuário pedir; se achar que ajudaria, ofereça em uma linha e espere o "sim".
- Não acionar skills nem agentes (subagentes) por iniciativa própria, só quando o usuário pedir. Para tarefas gerais, usar as ferramentas nativas.
- Commits: ao terminar uma tarefa completa (não a cada modificação), `git add`, `git commit` com mensagem descritiva e `git push`. Nunca commitar `.env` nem arquivos com chaves.
- Antes de um script salvar arquivo num destino fixo, listar o destino e conferir se já existe pasta equivalente. Nunca criar pasta duplicada; se o caminho estiver errado no script, corrigir a fonte.

## Estilo de escrita

- Não usar travessões (—). No lugar, vírgulas, "ou seja", "então" ou frases separadas. Vale para as respostas e para os textos redigidos em nome do usuário.
- Texto orgânico e fácil de ler. Em texto que outra pessoa vai ler, preferir parágrafos que fluem a listas densas de tópicos.

## Nunca inventar informação

- Nada inventado, deduzido sem base ou completado por suposição. Copiar os dados como a fonte mostra; o que faltar fica "não informado" (ex.: "não informado no DOL").
- Rotular pelo que a fonte realmente diz (ex.: parte cadastrada não é automaticamente "assistido"). Agrupamentos e classificações só por regra explícita e documentada.
- Recontar números do zero antes de afirmar, com cuidado com listas que se sobrepõem, e corrigir abertamente qualquer erro encontrado.
- Nunca atribuir conteúdo a precedente sem ter lido a ementa integral.
