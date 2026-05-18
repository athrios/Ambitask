## O que será feito

### 1. Banco de dados (migração)
- `forms`: adicionar coluna `color text not null default 'gray'` (mesma paleta dos templates de processo).
- `form_fields`: ampliar `validate_form_field_type` para aceitar `file` além dos tipos atuais.
- Criar bucket de storage `form-uploads` (privado), com policies:
  - Dono do formulário lê os arquivos do seu próprio `owner_id/...`.
  - Qualquer pessoa pode enviar (INSERT) em respostas a formulários publicados, gravando no path `{owner_id}/{form_id}/{uuid}-{filename}`.

### 2. Builder de formulário (`FormsPanel.tsx`)
- Novo tipo "Arquivo / Anexo" na lista `FIELD_TYPES`.
- Seletor de cor no editor do formulário, igual ao usado em templates de processo (`templateColors.ts`).
- Card do formulário ganha barra/pill colorido.

### 3. Formulário público (`PublicForm.tsx`)
- Renderizar campo `file` com `<input type="file">`, upload via signed URL para `form-uploads`, salvando no JSON da resposta a chave `{ path, name, size }`.

### 4. Aba "Respostas" (`RequestsPanel.tsx` + `Index.tsx`)
- Renomear apenas o rótulo da aba/sidebar de "Solicitações" para "Respostas" (textos internos permanecem).
- Carregar `forms.color` junto com `id,title`.
- Substituir o texto puro do nome do formulário por um pill colorido (mesmo estilo de `ProcessCard` — `colorPill[templateColor]`) em todas as visualizações: tabela, kanban, cards e lista.
- No modal de detalhe, exibir o pill colorido ao lado do título.
- Renderizar valores do tipo `file` como link "Baixar arquivo" usando signed URL gerada sob demanda.

### 5. Importar o PDF como formulário
Após as mudanças, inserir via SQL um formulário "Registro" do `user_id` atual, com 30 campos na ordem do PDF:

```text
1.  NOME COMPLETO                       short_text  *
2.  CPF                                  short_text  *
3.  RG                                   short_text
4.  PIS                                  short_text
5.  DATA DE NASCIMENTO                   date        *
6.  MUNICÍPIO DE NASCIMENTO              short_text
7.  SEXO                                 select  [FEMININO, MASCULINO, OUTRO]
8.  ESTADO CIVIL                         select  [SOLTEIRO(A), CASADO(A), DIVORCIADO(A), VIÚVO(A), UNIÃO ESTÁVEL]
9.  AUTODECLARAÇÃO DE ETNIA RACIAL       select  [BRANCA, PRETA, PARDA, AMARELA, INDÍGENA, NÃO DECLARAR]
10. ESCOLARIDADE                         select  [FUNDAMENTAL INCOMPLETO, FUNDAMENTAL COMPLETO, MÉDIO INCOMPLETO, MÉDIO COMPLETO, SUPERIOR INCOMPLETO, SUPERIOR COMPLETO, PÓS-GRADUAÇÃO]
11. NOME COMPLETO DO PAI                 short_text
12. NOME COMPLETO DA MÃE                 short_text  *
13. POSSUI DEPENDENTES                   select  [SIM, NÃO]
14. ENDEREÇO                             long_text   *
15. CELULAR                              short_text  *
16. E-MAIL                               short_text  *
17. NOME DA EMPRESA CONTRATANTE          short_text  *
18. CARGO                                short_text  *
19. DATA DE ADMISSÃO                     date        *
20. SALÁRIO                              short_text  *
21. JORNADA                              select  [COMERCIAL (seg a sex), ESCALA 5x1, ESCALA 6x1, ESCALA 12x36, OUTRO]
22. HORÁRIO DE ENTRADA                   short_text
23. HORÁRIO DE SAÍDA                     short_text
24. ADESÃO AO VALE-TRANSPORTE            select  [SIM, NÃO]
25. VALOR DIÁRIO (IDA + VOLTA)           short_text
26. RG DIGITALIZADO                      file
27. COMPROVANTE DE RESIDÊNCIA            file
```

(itens marcados `*` ficam `required = true`)

## Detalhes técnicos relevantes

- O bucket `form-uploads` precisa ser **privado** para proteger documentos sensíveis (RG, comprovantes). Download na tela de Respostas usa `supabase.storage.from('form-uploads').createSignedUrl(path, 60)`.
- Upload público (sem login) requer policy de INSERT em `storage.objects` condicionada a `EXISTS (select 1 from forms where id = (storage.foldername(name))[2]::uuid and is_published = true)`.
- O pill colorido reutiliza o mapa `colorPill` já existente em `src/components/processes/templateColors.ts` — sem duplicar tokens.
- A migração mantém o trigger `validate_form_field_type` como única fonte de verdade do enum de tipos (sem CHECK constraint).

## Fora do escopo

- Não vou mexer em textos internos da aba ("Solicitante", "Nenhuma solicitação ainda", toasts) — só o rótulo da aba muda.
- Não vou criar o formulário "Registro" automaticamente até a migração ser aprovada; ele é inserido na mesma rodada de implementação.
