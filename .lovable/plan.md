## Objetivo
Exibir "Cadastrado em: dd/mm/aaaa" de forma discreta no card do cliente e no rodapé do formulário de edição. Sem campo editável, sem alteração de schema.

## Contexto
- Tabela `clients` já tem `created_at timestamptz NOT NULL DEFAULT now()` — nenhuma migração necessária.
- `ClientRecord` (em `ClientForm.tsx`) já é retornado com todos os campos via `select("*")` no `ClientsPanel`, então `created_at` está disponível no objeto.

## Mudanças

### 1. `src/components/clients/ClientsPanel.tsx` — card de listagem
- Adicionar, ao final do bloco de informações de cada cliente (após `orphanCustoms` / QSA), uma linha discreta:
  - Texto: `Cadastrado em 27/05/2026`
  - Estilo: `text-[10px] text-muted-foreground` (metadado, abaixo dos Fields, ou no canto inferior direito do card).
- Formatação via `Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })` a partir de `r.created_at`.

### 2. `src/components/clients/ClientForm.tsx` — rodapé do formulário (apenas em modo edição)
- Quando `initial?.created_at` existir, exibir no rodapé do formulário (próximo aos botões de salvar/cancelar, ou logo abaixo do título):
  - `Cadastrado em 27/05/2026 às 14:35`
- Mesmo estilo discreto (`text-xs text-muted-foreground`).
- Em modo "novo cliente" (sem `initial`), não exibir nada.

### 3. Helper compartilhado
- Adicionar pequena função utilitária `formatCreatedAt(iso: string, withTime?: boolean)` — pode ficar inline em cada arquivo, ou em `src/lib/utils.ts` se preferir centralizar. Proposta: inline (1-2 linhas), mantém o escopo mínimo.

## Fora de escopo
- Nenhuma alteração no schema do banco.
- Nenhuma alteração na lógica de criação/edição de clientes.
- Nenhuma alteração em tipos do Supabase (campo já existe em `types.ts`).
