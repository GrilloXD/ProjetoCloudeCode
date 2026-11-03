# Shape X

App de musculação para hipertrofia com foco em shape em X. Flutter, Android e iOS, 100% offline.

## O que tem

- Programa de 5 dias (Superior A, Inferior A, Ombros e Braços, Inferior B, Superior B) já carregado e editável.
- Tela de treino com carga, reps e check por série, preenchimento por toque único, cronômetro de descanso automático (±15 s, pular, ajuste por exercício) e tela ligada durante o treino.
- Progressão dupla: o app detecta meta batida, sugere a próxima carga respeitando o incremento do equipamento e só aplica quando você toca em Aplicar.
- Detecção de estagnação (3 sessões sem superar as anteriores), alerta de volume alto, substituições equivalentes que preservam o histórico.
- Biblioteca com cerca de 75 exercícios, filtros por músculo e equipamento, mapa muscular vetorial desenhado no próprio app e instruções curtas.
- Histórico completo, recordes, gráficos de carga, reps, 1RM estimado e volume, volume semanal por músculo, frequência, peso corporal com média móvel.

## Dados e offline

Banco SQLite local (`sqflite`). Nenhuma conta, login ou servidor. O manifesto de release do Android não pede a permissão `INTERNET`. Os dados sobrevivem a fechar o app, reiniciar o celular e atualizar o app, desde que a atualização seja assinada com a mesma chave (ver abaixo).

## Estrutura

```
lib/
  data/        modelos, banco SQLite, repositório, catálogo e programa
  logic/       progressão dupla, recordes, estagnação, volume, substituições
  state/       estado do app e controlador da sessão de treino
  ui/          telas (início, treinos, treino ativo, biblioteca, progresso, ajustes)
test/          testes de lógica, persistência e fluxo pela interface
test_screens/  capturas de tela e geração do ícone
```

## Compilar

Pré-requisitos: Flutter 3.47+, JDK 17 e Android SDK.

```powershell
flutter test
flutter build apk --release
```

O APK sai em `build/app/outputs/flutter-apk/app-release.apk`. A versão de release usa a chave de debug desta máquina (`~/.android/debug.keystore`); guarde esse arquivo, porque uma atualização assinada com outra chave exige desinstalar o app e apaga os dados.

Observação: em Windows, o analisador do Dart falha em caminhos com acento. Rode os comandos por um caminho sem acento (por exemplo, uma junction).

## iPhone

O projeto iOS está pronto (`ios/`), mas a compilação exige macOS com Xcode:

```bash
flutter build ios --release
```

Para instalar no iPhone é preciso assinar com um Apple ID no Xcode. Com conta gratuita a instalação vale 7 dias e precisa ser refeita; com a conta de desenvolvedor paga dá para usar TestFlight.
