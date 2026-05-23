# Evolução: condição por opção de múltipla escolha

Hoje a engine de condições (`src/lib/formConditions.ts`) já suporta o operador `contains` em arrays, mas o editor no `FormsPanel.tsx` não expõe isso de forma clara quando a pergunta de origem é `multi_select`. Esta mudança é só de UX no editor — o runtime (`PublicForm.tsx`) e o schema do banco não precisam mudar.

## O que muda no editor (`FormsPanel.tsx`)

No bloco "Mostrar somente se…":

1. **Origem `multi_select`**
   - Operadores disponíveis: `contém` (`contains`) e `não contém` (novo: `not_contains`).
   - Campo de valor: **dropdown com as opções daquela pergunta** (uma opção por vez — v1 simples).
   - Default ao selecionar uma origem multi_select: operador `contains` + primeira opção.

2. **Origem `select`**
   - Mantém `é igual a` / `é diferente de` com dropdown das opções (já existe).

3. **Origem `short_text` / `long_text`**
   - Mantém `é igual a` / `é diferente de` com input de texto.

4. **Migração suave**: se o usuário trocar a pergunta de origem, resetar `operator` e `value` para valores válidos do novo tipo, para não deixar condição quebrada.

## Engine de condições (`src/lib/formConditions.ts`)

- Adicionar `"not_contains"` ao tipo `ConditionOperator` e ao `parseCondition`.
- Em `evaluateCondition`, `not_contains` = inverso de `contains` (case-insensitive, funciona para array e string).

## Formulário público (`PublicForm.tsx`)

Nenhuma mudança. A avaliação já é reativa ao `values` e usa o helper.

## Exemplo coberto

- Pergunta A (multi_select): "O que você deseja alterar?" — opções: endereço, capital, atividade.
- Pergunta B (texto): "Qual o novo endereço?" — condição: A `contém` `endereço`.
- No formulário público: B só aparece quando o usuário marca "endereço" em A. Desmarcou → some, valor não é enviado, `required` não bloqueia.

## Fora de escopo (posso fazer depois se pedir)

- Múltiplas opções na mesma condição com lógica E/OU (ex.: aparece se marcar "endereço" **ou** "capital"). Hoje precisaria criar uma condição por opção, mas v1 ainda é 1 condição por campo.
- Combinar condições de campos diferentes.

## Testes manuais

1. Criar form com multi_select A (3 opções) + texto B condicionado a A `contém` "endereço". Publicar.
2. No `/f/:slug`: sem marcar nada → B oculto. Marcar "endereço" → B aparece. Desmarcar → B some.
3. Marcar "capital" sozinho → B continua oculto.
4. B obrigatório + oculto → envio funciona sem preencher B.
5. Resposta salva em `form_responses.data` não contém a chave de B quando ele estava oculto.
6. Trocar origem de B de multi_select para select → operador/valor resetam para combinação válida (sem condição inválida persistida).
7. Condições antigas com `contains` continuam funcionando (compatibilidade).

Confirma que sigo com essa abordagem (1 opção por condição, com operador `não contém` incluso)?
