# Design system do OnboardHub

Baseado no design system de referência da Notion publicado em [awesome-design-md](https://github.com/VoltAgent/awesome-design-md/tree/main/design-md/notion), adaptado para o OnboardHub. Os tokens ficam como variáveis CSS em `src/styles.css`.

## Cores

| Token | Valor | Uso |
|---|---|---|
| `--color-primary` | `#5645d4` | Ação principal (um botão primário por tela) |
| `--color-primary-pressed` | `#4534b3` | Hover/pressionado do primário |
| `--color-navy` | `#0a1530` | Painel lateral das telas de acesso |
| `--color-link` | `#0075de` | Links em texto (nunca no lugar do primário) |
| `--color-yellow` | `#f5d75e` | Destaque da marca (logo) |
| `--color-canvas` | `#ffffff` | Fundo das páginas e cards |
| `--color-surface` | `#f6f5f4` | Sidebar, campos somente leitura |
| `--color-hairline` / `-strong` | `#e5e3df` / `#c8c4be` | Bordas de cards / bordas de inputs |
| `--color-ink` | `#1a1a1a` | Títulos e texto principal |
| `--color-charcoal` / `--color-slate` / `--color-steel` | `#37352f` / `#5d5b54` / `#787671` | Texto secundário em ordem decrescente de ênfase |
| `--color-tint-*` | lavanda, menta, pêssego, céu, amarelo | Fundos de badges e cards temáticos |
| `--color-success` / `--color-error` | `#1aae39` / `#e03131` | Estados de sucesso e erro |

## Tipografia

Inter, pesos 400 (texto), 500 (botões, rótulos, menu) e 600 (títulos).

| Elemento | Tamanho | Altura de linha |
|---|---|---|
| Título de página (`h1`) | 36px (28px no celular), -0.5px | 1.2 |
| Título de seção (`h2`) | 22px | 1.3 |
| Texto | 16px | 1.55 |
| Texto secundário, botões, menu | 14px | 1.5 |
| Legendas, erros de campo, badges | 13px | 1.4 |

## Formas e espaçamento

- Raios: 6px (badges, itens do menu), 8px (botões e inputs), 12px (cards). Botões são retangulares, não pílulas.
- Espaçamento em múltiplos de 4px (`--space-xxs` 4px até `--space-section` 64px).
- Inputs e botões com 44px de altura (alvo de toque).
- Sombras leves só em elementos elevados; cards comuns usam apenas borda.

## Componentes

- `.button` (primário), `.button-secondary` (contorno), `.link-button` (ação em texto).
- `.field` com rótulo, dica e erro ligados ao input por `aria-describedby`.
- `.form-alert` para erros gerais do formulário.
- `.badge` para papéis e status.
- `.card` para blocos de conteúdo.
