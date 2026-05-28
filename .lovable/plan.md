## Resumo
Três melhorias no Ambitask: (1) confirmar rótulo dinâmico do campo Documento, (2) persistir o estado da tela de Clientes entre recargas/abas, (3) adicionar ação "Reiniciar processo" para processos já iniciados.

## 1. Rótulo dinâmico do Documento (Clientes)
**Status:** já implementado em `src/components/clients/ClientForm.tsx` (função `docInput`):
- PJ → label "CNPJ" + máscara CNPJ + lookup
- PF → label "CPF" + máscara CPF + validação
- Estrangeiro → label "Documento / identificação"

Ação: nenhuma alteração necessária. Apenas validar visualmente nos modos criar e editar (mesmo componente em ambos).

## 2. Persistência do estado da tela de Clientes
Arquivo: `src/components/clients/ClientsPanel.tsx`.

Hoje o `search` e `hiddenSources` são estados em memória; `hiddenSources` já persiste no localStorage por workspace, mas `search` se perde ao trocar de aba/recarregar.

Mudanças:
- Inicializar `search` a partir de `localStorage` com chave `clientsSearch_${workspaceId}` (fallback `""`).
- `useEffect` sincronizando `search` no localStorage a cada mudança (com debounce simples via setTimeout 200ms ou direto — leitura/escrita é barata).
- Ao trocar de workspace, recarregar o termo salvo daquele workspace (mesmo padrão do `hiddenSources`).
- Manter o comportamento atual: usuário pode limpar o campo manualmente para nova busca; o reload de `clients` continua sendo disparado por `workspaceId`/`workspaces`.

Observação: não há "ordenação" configurável nem outros filtros além do filtro de ambientes (que já persiste). Então o escopo real é apenas o termo de busca + o que já está persistido.

## 3. Botão "Reiniciar processo" (Processos)
Arquivo: `src/components/processes/ProcessesPanel.tsx`.

Local da ação:
- Adicionar no `ProcessDetail` (drawer/modal de detalhe do processo do tipo `tasks`), em uma área discreta junto às demais ações do cabeçalho/rodapé do detalhe — segue o padrão Notion-like atual.
- Não exibir para `template_type === "table"` (não há etapas a resetar).
- Só exibir quando o processo já foi iniciado, ou seja, `process.status !== "nao_iniciado"` (cobre `em_andamento`, `concluido`, `cancelado`, etc.) e existir ao menos 1 step com `started_at`, `completed_at` ou `dismissed_at` ou status ≠ `pendente`.

Comportamento ao clicar:
- Abrir `AlertDialog` (shadcn) de confirmação: "Tem certeza que deseja reiniciar este processo? As etapas voltarão ao estado inicial."
- Ao confirmar:
  - `UPDATE process_steps SET status='pendente', started_at=NULL, completed_at=NULL, dismissed_at=NULL WHERE process_id = :id` (mantém títulos, posições, notas e due_date — não exclui anexos nem dados do processo).
  - `UPDATE processes SET status='nao_iniciado' WHERE id = :id` (mantém `name`, `client_name`, `template_id`, `notes`, `due_date`, anexos e vínculos).
  - `logActivity(userId, "process", id, "restarted", \`Processo reiniciado: "${name}"\`)`.
  - Toast de sucesso "Processo reiniciado" e `load()` para refletir na UI (cards/lista/kanban e o próprio detalhe aberto).
- Não duplica registros; não toca em `table_data`, anexos ou dados do cliente vinculado.

UI:
- Botão discreto `variant="ghost"` com ícone `RotateCcw` (lucide) + label "Reiniciar processo", alinhado às ações do detalhe.
- Em `ProcessCard` (cards na listagem), **não** adicionar para manter a interface limpa — a ação fica acessível ao abrir o processo.

## Fora de escopo
- Nenhuma migração de banco (usa colunas existentes).
- Sem mudanças em validação de CPF/CNPJ.
- Sem mudança em template_type `table`.
