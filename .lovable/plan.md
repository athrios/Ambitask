## Objetivo
Aplicar **Roboto** (Google Fonts) como fonte padrão de todo o app, mantendo todo o restante do design (cores, espaçamentos, componentes) intocado.

## Mudanças

### 1. `index.html`
Adicionar o preconnect e o link do Google Fonts para Roboto (pesos 400, 500, 700) no `<head>`.

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap" rel="stylesheet">
```

### 2. `tailwind.config.ts`
Estender `theme.fontFamily.sans` para usar Roboto antes da stack padrão:

```ts
fontFamily: {
  sans: ['Roboto', 'ui-sans-serif', 'system-ui', 'sans-serif'],
}
```

Assim qualquer classe `font-sans` (padrão do Tailwind aplicada via `body`) usa Roboto automaticamente, sem precisar tocar em componente nenhum.

### 3. `src/index.css` (opcional, garantia extra)
Garantir que `body` herda a stack — já usa `@apply` do Tailwind, então nada muda; apenas valido que `font-feature-settings` continua compatível.

## Fora do escopo
- Não alterar cores, layout, componentes ou comportamento.
- Não adicionar fonte serifada ou display extra.

## Resultado
Todo o app passa a renderizar em Roboto, com fallback para a fonte do sistema enquanto o Google Fonts carrega.