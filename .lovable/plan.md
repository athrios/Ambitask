## Evolução do Template Tabela — Tipos de coluna

Estender o template Tabela existente para suportar 5 tipos de coluna: **Texto, Número, Real (moeda), Checkbox e Lista suspensa**. Sem migração de banco (o JSONB já comporta os novos campos) e sem quebrar templates/processos já criados.

---

### 1. Modelo de dados (sem migração)

`process_templates.table_schema` e `processes.table_data` já são JSONB livres. Estendemos o tipo `TableColumn` em `src/lib/sheetFormula.ts`:

```ts
type ColumnType = "text" | "number" | "currency" | "checkbox" | "select";
interface TableColumn {
  id: string;
  label: string;
  type: ColumnType;     // novo — substitui o atual `kind`
  options?: string[];   // só para "select"
  kind?: "text" | "number"; // mantido como legacy para retrocompat
}
```

Migração automática em runtime (sem tocar no banco):
- Ao ler um template/processo, normalizar colunas: se `type` ausente, derivar de `kind` (`number` → `number`, resto → `text`). Templates antigos continuam funcionando.

Células permanecem como **string** no JSON (chave = `col.id`):
- `text`: string livre
- `number`: string numérica (ou fórmula `=...`)
- `currency`: string numérica em **valor cru** (ex.: `"1250.5"`) — a formatação `R$ 1.250,50` é só de exibição
- `checkbox`: `"true"` | `"false"` | `""`
- `select`: uma das `options` ou `""`

Vantagem: não quebra `buildCellMap`, fórmulas e dados de tabelas Tabela já criadas.

---

### 2. Engine de fórmulas (`src/lib/sheetFormula.ts`)

Pequenos ajustes:
- `numericFromRaw` passa a aceitar `"true"/"false"` → `1/0` (futuro), mas por ora só **number** e **currency** participam de cálculo.
- No `resolve` de refs, considerar o **tipo da coluna** referenciada via novo parâmetro opcional `columnTypeByRef`:
  - `text` / `select` → 0
  - `checkbox` → 0 (descartado conforme regra)
  - `number` / `currency` → parse numérico normal
- Assinatura: `evaluateCell(raw, cells, evaluating?, selfRef?, columnTypeByRef?)`. Default mantém comportamento atual (compat com testes existentes).
- `buildCellMap` ganha um companion `buildColumnTypeMap(data)` para mapear `A`, `B`, … → tipo.

Testes novos em `src/test/sheetFormula.test.ts`:
- Soma ignora célula `text` e `select`.
- Coluna `currency` soma corretamente valores crus.
- Checkbox não entra em soma.

---

### 3. Editor de coluna (`SheetEditor.tsx`)

Cabeçalho de cada coluna passa a ter um botão de **configurar** (ícone `Settings2`) abrindo um `Popover`:

- Campo "Nome" (label).
- `Select` "Tipo" com as 5 opções.
- Se tipo = `select`: lista editável de opções (input + adicionar/remover; mínimo 1).
- Validação: label ≤ 60 chars; opções ≤ 30 chars; máx 50 opções.

Ao mudar o tipo, **manter os valores existentes** (não apagar), apenas a renderização da célula muda. Mudança para `select` sem `options` exige preencher pelo menos uma opção antes de aceitar.

Remoção do input "kind" inline atual no header — substituído pelo popover.

---

### 4. Renderização das células

Refatorar `CellInput` / `EditableCell` em `SheetEditor.tsx` em um switch por `column.type`:

| Tipo       | Edição                                                    | Exibição                          |
|------------|-----------------------------------------------------------|-----------------------------------|
| `text`     | `<input>` text                                            | string crua, alinhamento esquerdo |
| `number`   | `<input inputMode="decimal">` com filtro; fórmula `=` permitida | número formatado, alinhado à direita |
| `currency` | `<input inputMode="decimal">` aceita `1234,56` ou `1234.56`; ao blur, formata para `R$ 1.250,50`; em foco mostra valor cru editável | `R$ 1.250,50`, alinhado à direita |
| `checkbox` | `<Checkbox>` centralizado, toggle direto                  | mesmo (checked/uncheck)           |
| `select`   | `<Select>` compacto com `column.options`                  | label da opção                    |

Helpers em `src/lib/sheetFormula.ts` (ou novo `src/lib/cellFormat.ts`):
- `parseCurrencyInput(str): number | null`
- `formatCurrencyBRL(n): string` (Intl.NumberFormat `pt-BR`, `style: 'currency'`)
- `parseNumberInput(str): number | null`

Fórmulas (`=...`) continuam permitidas apenas em `number` e `currency`. Para `text/select/checkbox`, ignoramos o `=` inicial (tratado como literal).

---

### 5. Criação de processo a partir do template

Já implementado via deep-clone de `table_schema` → `table_data`. Garantir que o clone inclua `type` e `options` (é só `JSON.parse(JSON.stringify(...))`, então já vale). Adicionar test/sanity de que mexer no processo não muda o template.

---

### 6. Validação (`src/lib/validation.ts`)

Adicionar `zod` schema para coluna:

```ts
const columnSchema = z.object({
  id: z.string().min(1),
  label: z.string().trim().min(1).max(60),
  type: z.enum(["text","number","currency","checkbox","select"]),
  options: z.array(z.string().trim().min(1).max(30)).max(50).optional(),
}).refine(c => c.type !== "select" || (c.options && c.options.length > 0),
  { message: "Lista suspensa precisa de pelo menos 1 opção" });
```

Validar no salvar do template e no salvar do processo.

---

### 7. Permissões / Workspace

Sem mudança. Tudo persiste em `process_templates`/`processes` que já têm RLS por `workspace_id` + `has_workspace_permission('processos', ...)`.

---

### 8. Arquivos

**Editar**
- `src/lib/sheetFormula.ts` — novo `ColumnType`, helpers de formato, `evaluateCell` consciente de tipo, `buildColumnTypeMap`. Manter exports atuais (compat).
- `src/components/processes/SheetEditor.tsx` — popover de configuração de coluna, renderização por tipo, normalização legacy ao receber `value`.
- `src/components/processes/ProcessesPanel.tsx` — passar `columnTypeMap` ao avaliar fórmulas; nada além disso.
- `src/lib/validation.ts` — schema de coluna + opções.
- `src/test/sheetFormula.test.ts` — casos novos (currency, select/text ignorados em SOMA).

**Sem migração de banco.** O JSONB existente comporta os campos novos; templates antigos são normalizados ao carregar.

---

### 9. Critérios de aceite

1. Templates Tabela antigos abrem sem erro e suas colunas viram `text`/`number` automaticamente.
2. No editor, configurar uma coluna como cada um dos 5 tipos funciona; opções de `select` são editáveis.
3. Linha nova respeita o tipo (checkbox aparece como checkbox, currency formata em R$ ao sair do campo, etc.).
4. `=SOMA(C1:C5)` numa coluna `currency` soma corretamente; numa coluna `text` retorna 0.
5. Criar processo a partir do template preserva tipos e opções; editar processo não muda template.
6. RLS / workspace inalterados — sem regressão de isolamento.
