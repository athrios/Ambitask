# Descrição por pergunta + Logo no formulário

Duas melhorias incrementais no módulo Formulários, sem quebrar dados existentes.

## 1. Migração de banco

`form_fields`:
- `description text not null default ''`

`forms`:
- `logo_path text null` (path no bucket de storage)
- `logo_alignment text not null default 'center'` (valores: `left|center|right`)

Trigger de validação em `forms` para garantir `logo_alignment in ('left','center','right')`.

Atualizar views públicas:
- `form_fields_public`: expor `description`.
- `forms_public`: expor `logo_path` e `logo_alignment`.

Storage:
- Reusar bucket `form-uploads` (já existe, privado). Criar bucket público novo `form-logos` para servir logos via URL pública (mais simples que signed URLs no fluxo público anônimo).
- Policies em `storage.objects` para `form-logos`:
  - SELECT público (`bucket_id='form-logos'`).
  - INSERT/UPDATE/DELETE somente autenticados, restrito a `auth.uid()::text = (storage.foldername(name))[1]` (estrutura: `{user_id}/{form_id}/{uuid}.ext`).
- Limite de 5 MB e tipos `image/png`, `image/jpeg`, `image/webp` validados no client antes do upload. SVG bloqueado.

## 2. UI — `src/components/forms/FormsPanel.tsx`

**Editor de cada campo (`fields.map`):**
- Adicionar `<Textarea>` "Descrição / Instruções (opcional)" abaixo do título da pergunta. Persistência no `onBlur` via `updateField(id, { description })`.
- Incluir `description` no `select(...)` do load e na interface `Field`.

**Editor do formulário — nova seção "Identidade visual":**
- Botão "Enviar logo" (input file accept `image/png,image/jpeg,image/webp`, max 5 MB).
- Pré-visualização atual (max-h-20).
- Botão "Remover logo".
- `<Select>` Alinhamento: Esquerda / Centro / Direita (default Centro).
- Upload via `supabase.storage.from('form-logos').upload({user_id}/{form_id}/{uuid}.{ext}, file, { upsert:false, contentType })`. Salvar `logo_path` e gerar URL via `getPublicUrl`.
- Ao trocar/remover, deletar o arquivo antigo do bucket.

**Listagem (card do formulário):**
- Se `logo_path`, mostrar miniatura `h-8 w-8 object-contain` à esquerda do título; caso contrário, layout atual sem placeholder.

## 3. UI — `src/pages/PublicForm.tsx`

- Estender interface `Form` com `logo_path`, `logo_alignment`; `Field` com `description`.
- No header, antes do `<h1>`, se `logo_path`, renderizar `<img>` com `getPublicUrl(logo_path)`, classes `max-h-20 max-w-[240px] object-contain` e wrapper com `justify-{start|center|end}` conforme alinhamento.
- Para cada campo, abaixo do `<label>` exibir, se `f.description`, `<p className="text-xs text-muted-foreground mt-0.5 whitespace-pre-wrap">{f.description}</p>`. Nada renderizado quando vazio.

## 4. Validação

- Client: `description` opcional, max 500 chars (adicionar `fieldDescriptionSchema` em `src/lib/validation.ts`).
- Logo: validar mime e size antes do upload; toast de erro se inválido.

## 5. Compatibilidade

- Defaults garantem que formulários e campos antigos seguem funcionando: `description=''`, sem logo, alinhamento centro.
- RLS de `forms`/`form_fields` inalteradas; views públicas apenas ganham colunas adicionais não sensíveis.

## Ordem de execução

1. Rodar migração (schema + views + bucket + policies de storage).
2. Atualizar `FormsPanel.tsx` (editor de campo, seção logo, miniatura no card).
3. Atualizar `PublicForm.tsx` (logo no topo + descrição abaixo de cada label).
4. Adicionar schema de validação para descrição.
