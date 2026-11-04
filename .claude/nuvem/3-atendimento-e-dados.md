# Preferências do usuário (sessões na nuvem), parte 3 de 3

## Atendimento

- Perguntas íntimas são permitidas quando úteis à tese, mas com redação acolhedora e neutra, sem tom de interrogatório nem julgamento (ex.: "Vocês estavam juntos na época em que você engravidou?"). Cortar só o dispensável. Muitas vezes quem aplica é estagiária, então entregar pronto para uso.
- Mensagens para as pessoas atendidas: o primeiro parágrafo traz saudação, apresentação, número do processo e o motivo do contato em fala simples, em uma ou duas frases. Os detalhes vêm depois (o que aconteceu, o que será pedido, perguntas numeradas, prazo para resposta e fechamento). Linguagem leiga, sem presumir o gênero de quem escreve ("Agradeço desde já").
- Relato de atendimento: texto corrido em dois ou três parágrafos breves, terceira pessoa ("o usuário"), sem tópicos e sem reproduzir a conversa. Abertura: "Em razão da providência pendente[, bem como em razão do agendamento realizado para o dia X, às Yh,] o usuário NOME COMPLETO (DOL - NÚMERO) foi contatado no dia DD/MM/AAAA, por meio do Live Chat, a fim de ...". Sem o nº DOL, escrever "(DOL - não informado)" e avisar.
- Anotação de andamento na providência: "DD/MM/AA - <Nome> (Residente Jurídico): resumo". A data vem antes do nome, com dois dígitos no ano, e o resumo é curto (o que foi feito, o que a pessoa informou, próximo passo). Se o nome não estiver na conversa, perguntar.
- Providência nova: "Nome da Pessoa (DOL - nº) - Processo nº 0000000-00.0000.8.26.0000: o que deve ser feito" e, embaixo, em linha separada, "Prazo: DD/MM/AAAA". Tarefa simples e didática, mas em registro formal ("comunicar ao Juízo", "requerer").

## Planilhas e dados da 9ª DPE

- Agendamentos: priorizar quem é de fato da 9ª. Se o único vínculo for processo arquivado e o motivo apontar outra banca, a pessoa tiver processo ativo em outra Defensoria ou o motivo for ação nova, não incluir e registrar a exclusão em "mudancas". Arquivado recente sem outra banca fica, com alerta.
- O relato do DOL "Sem permissão para visualizar o relato ou inexistente." não se recupera. Classificar como "Sem relato no DOL", sem deduzir motivo, e conferir sempre a data do relatório recebido.
- Scripts ou arquivos com nomes de pessoas ou dados de atendimento ficam fora do git.

## Pesquisa e cálculos

- Jurisprudência do TJSP: pesquisar só no e-SAJ (o usuário não tem JusBrasil). Acórdãos de família correm em segredo e a maioria não aparece no cjsg. No cjsg, a data final é obrigatória e a janela é de no máximo 1 ano.
- Taxa legal (art. 406, § 1º, do CC): API do BCB, série SGS 29543 (`https://api.bcb.gov.br/dados/serie/bcdata.sgs.29543/dados/ultimos/10?formato=json`). Os fatores da Tabela Prática do TJSP "Lei 14.905/2024" reproduzem o IPCA-15 (SGS 7478), e não o IPCA cheio; o IPCA-15 também sai pela API SIDRA do IBGE (tabela 3065, variável 355).
- DrCalc: índice "TJSP (INPC/IPCA-15 - Lei 14905)" e juros "Taxa Legal/art.406 CC", sem multa e sem honorários; juros e correção por mês cheio. Havendo depósito no meio do período, fazer duas planilhas, a primeira até o depósito, com o abatimento, e a segunda atualizando o saldo.

## Projetos deste repositório

- Fábrica de Folders DPESP: cor principal #009632 (PANTONE 355 C), fonte Source Sans 3, A4 paisagem, 2 páginas com 3 painéis cada, sem emojis. Blocos obrigatórios: Quando usar, Exemplo prático e Importante Saber. O CTA principal aponta sempre para a Defensoria, nunca direto para órgão externo. Listas alinhadas à esquerda e parágrafos longos justificados.
- App Shape X (Flutter, branch `claude/fitness-app-hypertrophy-9344ac`): ao mudar um programa padrão, subir `programVersion`.
