## Objetivo
No Cronograma, itens importados de uma tarefa ficam **vinculados de verdade**: o título não pode ser editado ali (só em Tarefas) e o status sincroniza nos dois sentidos.

## Mudanças

### 1. Banco — sincronização bidirecional de status (migration)
Criar trigger em `public.tasks` (AFTER UPDATE) que, quando `status` ou `done` mudarem, atualiza todos os `schedule_items` com `task_id = NEW.id`:
- Mapeia `task.status` → `schedule.status` (`pendente`, `fazendo`, `aguardando`, `feita`, `cancelado` são compatíveis).
- Também propaga mudança de `title` para manter a coluna espelhada (fallback caso o UI leia do campo local).

O caminho Cronograma → Tarefa já existe no front (`updateItem` já faz update em `tasks` quando `task_id` está setado); estendê-lo para enviar **todos** os status (hoje só envia `done` + `status`, mas ignora alguns casos — revisar para mandar sempre o status novo, mapeando `pulado` apenas no schedule sem tocar na tarefa).

### 2. `src/components/SchedulePanel.tsx`
- **Título não editável** quando `task_id != null`:
  - Substituir o `<Input>` de título por um texto/`<div>` somente-leitura (com a mesma tipografia) quando o item está vinculado.
  - Manter o ícone de "desvincular" (Link2) — só após desvincular o título volta a ser editável.
- **Espelhar o título da tarefa**: ao renderizar a lista, fazer join/lookup pelo `task_id` em uma lista de tarefas já carregada (`importableTasks` precisa virar uma lista completa, não só "importáveis"; renomear para `linkedTasksMap` ou buscar separadamente todas as tarefas do workspace usadas como referência) e exibir `task.title` quando existir, caindo para `item.title` se a tarefa foi excluída.
- **Realtime opcional** (recomendado): assinar mudanças em `tasks` do workspace via `supabase.channel(...).on('postgres_changes', ...)` para refletir status/título no Cronograma sem precisar recarregar a página.

### 3. `src/components/TasksPanel.tsx`
- Nenhuma mudança funcional obrigatória — o trigger do banco cuida da sincronização. Opcionalmente, ao mudar status localmente, atualizar também o cache do Cronograma se ele estiver montado (não necessário se usarmos realtime).

## Detalhes técnicos
- Migration nova com:
  ```sql
  CREATE OR REPLACE FUNCTION public.sync_task_to_schedule() RETURNS trigger ...
  -- UPDATE schedule_items SET status = NEW.status, title = NEW.title
  -- WHERE task_id = NEW.id;
  CREATE TRIGGER trg_sync_task_to_schedule
    AFTER UPDATE OF status, done, title ON public.tasks
    FOR EACH ROW EXECUTE FUNCTION public.sync_task_to_schedule();
  ```
- Habilitar realtime em `tasks` (`ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;`) se ainda não estiver.
- No `ScheduleRow`, condicional: `task_id ? <ReadOnlyTitle/> : <EditableInput/>`.

## Fora de escopo
- Não mexer em Processos, Formulários, Solicitações.
- Não alterar lógica de criação de itens não-vinculados (continuam editáveis).