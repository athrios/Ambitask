## Problema

O arquivo `src/components/processes/ProcessesPanel.tsx` foi salvo em algum momento com **dupla codificação UTF-8** (mojibake). Os bytes UTF-8 originais foram reinterpretados como Latin-1 e regravados, então caracteres acentuados e símbolos viraram sequências quebradas que aparecem na tela exatamente como na sua captura:

- `· 1/5 etapas · DBE` virou `Ã¢â‚¬â€ Ã‚Â· 1/5 etapas Ã‚Â· DBE`

A linha exata responsável pelo card é a 698:
```tsx
{p.client_name || "Ã¢â‚¬â€"} Ã‚Â· {done}/{steps.length} etapas{current ? ` Ã‚Â· ${current.title}` : ""}
```

Mas a corrupção está espalhada por ~30 linhas do mesmo arquivo (placeholders, toasts, labels, comentários de seção). Nenhum outro arquivo do projeto está afetado — só esse.

## Causa

Edição anterior do arquivo passou pelo pipeline com encoding errado (provavelmente uma reescrita que tratou UTF-8 como Latin-1). Não é problema de runtime, fonte, banco ou RLS — é literalmente o texto-fonte que está corrompido.

## Correção

Substituir mecanicamente as sequências mojibake pelos caracteres corretos em todo o arquivo `ProcessesPanel.tsx`. Mapeamento principal:

| Mojibake | Correto |
|---|---|
| `ÃƒÂ§` | `ç` |
| `ÃƒÂ£` | `ã` |
| `ÃƒÂµ` | `õ` |
| `ÃƒÂ­` | `í` |
| `ÃƒÂ³` | `ó` |
| `ÃƒÂ¡` | `á` |
| `ÃƒÂ©` | `é` |
| `ÃƒÂ ` | `à` / `Á` (conforme contexto) |
| `Ã‚Â·` | `·` |
| `Ã¢â‚¬â€` | `—` |
| `Ã¢â‚¬Â¦` | `…` |
| `Ã¢â€ â€™` | `→` |
| `Ã¢â€â‚¬` | `─` (usado em comentários decorativos) |

Linhas afetadas: 226, 227, 276, 277, 358, 462, 467, 657, 665, 698, 785, 811, 918, 956, 1026, 1045, 1067, 1074, 1152, 1153, 1199, 1245, 1372, 1400, 1430, 1483, 1489, 1521, 1572, 1587, 1592, 1608, 1611, 1613, 1665, 1693.

### Como aplicar

Rodar um script Python único no arquivo com o mapa de substituições acima (uma passada, ordem do mais longo para o mais curto para evitar substituição parcial), salvar de volta em UTF-8. Depois verificar com `rg` que não sobrou nenhuma sequência `Ãƒ`/`Ã‚`/`Ã¢` no arquivo.

## Escopo

- ✅ Apenas `src/components/processes/ProcessesPanel.tsx`
- ✅ Apenas correção de texto/comentários — nenhuma mudança de lógica, estilo ou estrutura
- ❌ Sem alterações no fluxo do modal, no banco, em RLS ou em outros módulos

## Verificação

1. `rg "Ã[ƒ‚¢]" src/components/processes/ProcessesPanel.tsx` deve retornar 0 resultados
2. Build TypeScript passa
3. No card de processo aparece: `Cliente · 1/5 etapas · DBE`
