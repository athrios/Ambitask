## Problema

No modal das etapas do processo, o campo **Observação** hoje só persiste quando o usuário clica em **"Salvar observação"** (ou quando conclui/dispensa a etapa, ações que também gravam o rascunho atual). Se o modal for fechado antes disso, o texto digitado é descartado — ele vive apenas no estado local `obsDraft` em `ProcessesPanel.tsx`.

## Proposta

Trocar o botão manual por **autosave on-blur**, seguindo o mesmo padrão já usado em `src/components/shared/NoteField.tsx` (indicador discreto de "Salvando…/Salvo/Erro").

### Mudanças

1. **`src/components/processes/ProcessesPanel.tsx`**
   - Em `CurrentStepCard` e `StepCard`, substituir o `<Textarea>` + botão "Salvar observação" por `<NoteField>`:
     - `value` = `s.notes ?? ""`
     - `onLocalChange` continua atualizando `obsDraft` (para que concluir/dispensar use o valor corrente)
     - `onSave` chama a função `saveObservation` existente (que faz o update no Supabase e dispara `onChanged()`)
   - Remover o botão "Salvar observação" e o handler `onSaveObservation` das props desses dois cards.
   - Remover o `toast.success("Observação salva")` de `saveObservation` para não poluir a tela em cada blur (o `NoteField` já mostra "Salvo" inline).

2. Nenhuma mudança de schema, RLS ou backend.

### Comportamento resultante

- Usuário digita → ao sair do campo (blur), salva automaticamente e mostra "Salvo".
- Se fechar o modal antes do blur, o `Textarea` perde foco e dispara o save mesmo assim.
- Concluir/Dispensar continua usando o valor atual de `obsDraft`, então nada quebra nesse fluxo.
