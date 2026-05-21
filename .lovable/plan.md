## Problema
No Cronograma, ao importar uma tarefa em uma linha placeholder, a linha seguinte aparece preenchida com o mesmo título da tarefa importada.

## Causa
Em `SchedulePanel.tsx`, os placeholders são renderizados em loop com `key={`p-${i}`}`. Quando uma tarefa é importada:

1. `onPick` no `PlaceholderRow` chama `setTitle(task.title)` e em seguida `commit(...)`, que insere a tarefa no banco.
2. Após o `load()`, há um item real a mais e um placeholder a menos — todos os placeholders deslizam uma posição "para cima".
3. Como a `key` é apenas o índice (`p-0`, `p-1`, ...), o React reaproveita a mesma instância de `PlaceholderRow` para o próximo índice, mantendo o estado local `title` com o valor da tarefa recém-importada.

Resultado: o placeholder seguinte aparece visualmente com o título da tarefa importada (ainda que não esteja salvo).

## Correção (em `src/components/SchedulePanel.tsx`)

Limpar o estado local `title` do `PlaceholderRow` logo após o commit da importação, para que a instância reaproveitada volte ao estado vazio.

No handler `onPick` do `ImportButton` dentro de `PlaceholderRow`:

```tsx
onPick={(task) => {
  commit(task.title, task.id);
  setTitle("");           // limpa o estado local
  setDuration(initialDuration);
}}
```

Não precisamos mais do `setTitle(task.title)` antes do commit — `commit` já recebe o título diretamente.

Opcionalmente, também resetar quando o usuário digita e dá blur (já funciona via `load()` recriando a lista, mas o estado local persistia só no caminho de importação).

## Fora de escopo
- Não alterar lógica de cascata de horários, status, vínculo de tarefas, nem realtime.
- Não mexer em linhas já materializadas (`ScheduleRow`).