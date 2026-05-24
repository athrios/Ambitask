## Novo tipo de campo: Endereço (com busca por CEP)

Adicionar um novo tipo de campo no construtor de formulários chamado **Endereço**, que pede o CEP, busca automaticamente os dados via API pública dos Correios (ViaCEP) e pede ao respondente apenas **número** e **complemento**.

### Comportamento do respondente (PublicForm)
1. Campo CEP com máscara `00000-000`.
2. Ao completar 8 dígitos, busca em `https://viacep.com.br/ws/{cep}/json/`.
3. Preenche e exibe (em modo leitura) **Logradouro, Bairro, Cidade, UF**.
4. Pede ao usuário: **Número** (obrigatório se o campo for obrigatório) e **Complemento** (opcional).
5. Tratamento de erro: CEP inválido / não encontrado mostra mensagem inline e permite tentar novamente. Sem internet → toast.
6. Caso raro (CEP genérico sem logradouro), permite edição manual de logradouro/bairro.

### Estrutura do dado salvo
`form_responses.data["Endereço"]` recebe objeto:
```json
{ "cep": "01310-100", "logradouro": "Av. Paulista", "numero": "1000",
  "complemento": "Sala 5", "bairro": "Bela Vista",
  "cidade": "São Paulo", "uf": "SP" }
```

### Mudanças técnicas

1. **Banco** (`supabase--migration`): atualizar `validate_form_field_type` para aceitar `'address'` no enum de tipos permitidos.
2. **`src/components/forms/fields/AddressField.tsx`** (novo): componente reutilizável com lookup ViaCEP, cache local por CEP, loading state, e callbacks `onChange`.
3. **`src/pages/PublicForm.tsx`**: adicionar `"address"` ao tipo `FieldType`, importar e renderizar `AddressField`. Validação de obrigatório checa `cep` + `numero` preenchidos.
4. **`src/components/forms/FormsPanel.tsx`**: incluir `"address"` na lista de tipos selecionáveis ao criar/editar campos (label "Endereço (CEP)"). O construtor não precisa de configuração extra.
5. **`src/components/requests/RequestsPanel.tsx`**: na exibição de respostas, formatar valor `address` como string legível: `"Av. Paulista, 1000 – Sala 5, Bela Vista, São Paulo/SP – 01310-100"`. Conversão para tarefa/processo usa a mesma string.
6. **`src/lib/validation.ts`**: novo schema `addressAnswerSchema` (CEP no formato `00000-000`, número ≤ 20 chars, complemento ≤ 120 chars, demais campos ≤ 200).

### Fora do escopo
- Validação de existência real do endereço além do que o ViaCEP retorna.
- Geocoding / mapa.
- Reordenação ou edição de endereços já submetidos.
