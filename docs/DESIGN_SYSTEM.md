# Design System & UI Specification — CLIPAÍ (`clipai-web`)

Este documento é a **Fonte Única de Verdade Visual** do **CLIPAÍ**. Nenhum componente, página ou estado visual pode ser criado utilizando cores, fontes, sombras ou geometrias fora das especificações abaixo.

---

## 1. Paleta de Cores e Tokens CSS (Dark Mode Frio)

O CLIPAÍ opera exclusivamente em **Dark Mode Frio**, construído sobre tons profundos de azul-petróleo e aço para maximizar o contraste com os vídeos das jogadas e reduzir a fadiga ocular.

### 1.1. Superfícies, Bordas e Tipografia (Paleta Base)

| Token CSS | Nome Oficial | Hexadecimal | Uso Estrito na Interface |
| :--- | :--- | :---: | :--- |
| `--bg-deep` | **Oxford by Night** | `#061C2C` | Fundo principal do workspace Bento, fundo do item ativo da Sidebar Líquida (efeito de fusão) e backdrops profundos. |
| `--bg-surface` | **Nato Blue** | `#193347` | Corpo da Sidebar Líquida, cards primários do Bento, painéis de listagem e modais. |
| `--bg-elevated` | **Blue Fedora** | `#334B60` | Cards elevados, botões secundários, células do grid 3x3 de Filtros Rápidos, inputs e estados de hover em superfícies. |
| `--border-muted` | **Prairie Denim** | `#4F6478` | Bordas sutis de `1px` a `1.5px` (incluindo o contorno SVG contínuo do Hero Player em formato "L" e divisores). |
| `--text-muted` | **Blue Prince** | `#6C7F91` | Metadados técnicos secundários, timestamps, contadores inativos, placeholders de inputs e ícones desabilitados. |
| `--text-secondary` | **Foghorn** | `#91A1B2` | Subtítulos, descrições de clipes/coleções, labels de formulário e itens não-ativos da sidebar. |
| `--text-primary` | **Powder Soft Blue** | `#B7C7D6` | Títulos principais, texto em destaque ativo, valores principais de metadados e ícones ativos. |

### 1.2. Cores Semânticas e de Estado

| Família | Token CSS | Hexadecimal | Aplicação Semântica Obrigatória |
| :--- | :--- | :---: | :--- |
| **Vermelho (Danger / REC / Like)** | `--color-danger-text` | `#F06A76` | Textos de erro de validação, ícones de alerta/falha e feedbacks de formulário inválido. |
| **Vermelho (Danger / REC / Like)** | `--color-danger-primary` | `#D93848` | Indicador `REC`, coração de **Curtir** ativo, barra lateral de status crítico/ao vivo e botões de ação destrutiva (excluir clipe/coleção). |
| **Vermelho (Danger / REC / Like)** | `--color-danger-surface` | `#8C2332` | Fundo de banners/toasts de erro, borda de alerta crítico e estado `:hover` de botões destrutivos. |
| **Amarelo (Warning / Star / Beta)** | `--color-warning-primary` | `#E8B04B` | Ícone de **Favoritar** (estrela ativa), badge `BETA`, selo `"JOGADA DA SEMANA"`, barra lateral de destaque e avisos de atenção (ex.: e-mail não verificado). |
| **Verde (Success / Online / CTA)** | `--color-success-primary` | `#2EB886` | Indicador lateral do item ativo na Sidebar Líquida, CTAs principais (`ENVIAR CLIPE`, confirmar), barra de progresso de upload concluído, status online e toast de `"Link copiado!"`. |
| **Verde (Success / Online / CTA)** | `--color-success-surface` | `#1D6F56` | Estado `:hover` de CTAs verdes, fundo de toasts de sucesso e badges de status `READY`. |

---

## 2. Declaração Oficial de Variáveis CSS e Configuração Tailwind

### 2.1. Variáveis Globais (`src/app/globals.css`)

```css
:root {
  /* Paleta Base — Dark Mode Frio */
  --bg-deep: #061C2C;
  --bg-surface: #193347;
  --bg-elevated: #334B60;
  --border-muted: #4F6478;
  --text-muted: #6C7F91;
  --text-secondary: #91A1B2;
  --text-primary: #B7C7D6;

  /* Cores Semânticas */
  --color-danger-text: #F06A76;
  --color-danger-primary: #D93848;
  --color-danger-surface: #8C2332;

  --color-warning-primary: #E8B04B;

  --color-success-primary: #2EB886;
  --color-success-surface: #1D6F56;

  /* Geometria Bento */
  --radius-bento: 18px;
  --radius-card: 12px;
  --radius-control: 8px;
  --border-width-bento: 1.5px;
}
```

### 2.2. Mapeamento no Tailwind CSS (`tailwind.config.ts` / `@theme`)

```ts
import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          deep: 'var(--bg-deep)',         // #061C2C
          surface: 'var(--bg-surface)',   // #193347
          elevated: 'var(--bg-elevated)', // #334B60
        },
        border: {
          muted: 'var(--border-muted)',   // #4F6478
        },
        text: {
          muted: 'var(--text-muted)',         // #6C7F91
          secondary: 'var(--text-secondary)', // #91A1B2
          primary: 'var(--text-primary)',     // #B7C7D6
        },
        danger: {
          text: 'var(--color-danger-text)',       // #F06A76
          DEFAULT: 'var(--color-danger-primary)', // #D93848
          surface: 'var(--color-danger-surface)', // #8C2332
        },
        warning: {
          DEFAULT: 'var(--color-warning-primary)', // #E8B04B
        },
        success: {
          DEFAULT: 'var(--color-success-primary)', // #2EB886
          surface: 'var(--color-success-surface)', // #1D6F56
        },
      },
      fontFamily: {
        display: ['var(--font-bebas-neue)', 'sans-serif'],
        mono: ['var(--font-jetbrains-mono)', 'monospace'],
      },
      borderRadius: {
        bento: 'var(--radius-bento)',
        card: 'var(--radius-card)',
        control: 'var(--radius-control)',
      },
    },
  },
  plugins: [],
};

export default config;
```

---

## 3. Tipografia — Regras do Modo Híbrido

O sistema tipográfico combina a força gráfica do **Bebas Neue** com a precisão técnica do **JetBrains Mono** carregados via `next/font/google`.

### 3.1. Regras de Aplicação do Modo Híbrido

1. **Quando usar `Bebas Neue` (`font-display`):**
   - Logotipo oficial **`CLIPAÍ`** (com acento agudo no Í).
   - Títulos de cabeçalho dos blocos Bento (`NA FILA / RECENTES`, `COLEÇÕES`, `FILTROS RÁPIDOS`).
   - Título principal do clipe em exibição no Hero Player e na página `/c/[slug]`.
   - **Botões CTA Principais** (ex.: `ENVIAR CLIPE`, `CRIAR CONTA`, `CONFIRMAR UPLOAD`, `SALVAR COLEÇÃO`).
   - **Regra obrigatória:** Sempre em `uppercase`, com `letter-spacing: 0.06em` (`tracking-[0.06em]`) e `line-height: 1.05`.
2. **Quando usar `JetBrains Mono` (`font-mono`):**
   - Todo o corpo de texto da interface (base `13px` / `0.8125rem`).
   - Botões secundários, botões de filtro do grid 3x3, pills de tags (`#clutch`, `#awp`) e itens de navegação da sidebar.
   - Metadados técnicos extraídos do vídeo (`1080p`, `60 FPS`, `H.264`, `34.5s`, `46.0 MB`, `11180 kbps`).
   - Campos de entrada (`<input>`, `<textarea>`, `<select>`), mensagens de validação, toasts e contadores de views/curtidas/favoritos.

### 3.2. Escala Tipográfica Padronizada

| Token / Classe | Fonte | Tamanho (`rem` / `px`) | Line Height | Letter Spacing | Aplicação |
| :--- | :--- | :---: | :---: | :---: | :--- |
| `display-hero` | Bebas Neue | `2.25rem` (`36px`) | `1.0` | `0.06em` | Título do clipe na página `/c/[slug]` e cabeçalhos de autenticação |
| `display-lg` | Bebas Neue | `1.625rem` (`26px`) | `1.05` | `0.06em` | Logo `CLIPAÍ` e título do clipe no Hero Player |
| `display-md` | Bebas Neue | `1.25rem` (`20px`) | `1.1` | `0.06em` | Títulos de seções Bento (`NA FILA / RECENTES`, `COLEÇÕES`) |
| `display-cta` | Bebas Neue | `1.0625rem` (`17px`) | `1.0` | `0.06em` | Texto de botões CTA primários (`ENVIAR CLIPE`) |
| `mono-body` | JetBrains Mono | `0.8125rem` (`13px`) | `1.5` | `0em` | Texto base, inputs, descrições, itens de menu e listas |
| `mono-meta` | JetBrains Mono | `0.75rem` (`12px`) | `1.4` | `0.01em` | Subtítulos de cards da fila, autor, contadores e filtros 3x3 |
| `mono-badge` | JetBrains Mono | `0.6875rem` (`11px`) | `1.2` | `0.04em` | Badges técnicos (`1080P`, `60FPS`, `BETA`, duração `00:34`) |

---

## 4. Especificações Geométricas dos 4 Componentes Signature do Dashboard Bento

```
+-------------------+-------------------------------------------------------+---------------------------+
| SIDEBAR LÍQUIDA   | HERO PLAYER EM FORMATO "L" (Contorno SVG #4F6478)     | NA FILA / RECENTES        |
| (#193347)         |                                                       | (Coluna limpa, gap: 10px) |
|                   |                                                       | +-----------------------+ |
| +---------------+ |                                                       | | | Card Clipe 01       | |
| | | Item Ativo  | |  (o) <- Notch semicircular esq. (Botão Sidebar)       | +-----------------------+ |
| | | (#061C2C)   | |                                                       | | | Card Clipe 02       | |
| +---------------+ |                                 +-------------------+ | +-----------------------+ |
|                   |                                 | FILTROS RÁPIDOS   | |                           |
|   Item Inativo    |                                 | (Grid 3x3 encaixe)| | COLEÇÕES                  |
|   Item Inativo    |                                 | no recorte do "L" | | (Cards em leque interativo|
|                   +---------------------------------+-------------------+ |  com bring-to-front)      |
+-------------------+-------------------------------------------------------+---------------------------+
```

### 4.1. Componente 1 — Sidebar Líquida Colapsável (`<LiquidSidebar />`)

- **Geometria e Posicionamento:**
  - Encostada diretamente na lateral esquerda da viewport, sem margem externa, conectando-se à borda esquerda do workspace Bento (`--bg-deep: #061C2C`).
  - **Largura Expandida:** `240px` (`transition: width 280ms cubic-bezier(0.22, 1, 0.36, 1)`).
  - **Largura Colapsada:** `76px`.
  - **Cor de Fundo da Sidebar:** `--bg-surface` (`#193347`).
- **Efeito Líquido do Item Ativo (Quando Expandida):**
  - O item de navegação ativo estende-se até a borda direita (`margin-right: 0`, `border-radius: 14px 0 0 14px`) e assume `background-color: var(--bg-deep)` (`#061C2C`), **fundindo-se continuamente ao fundo do workspace Bento**.
  - **Curvas Côncavas (Gooey / Liquid Corners):** Dois pseudo-elementos (`::before` no topo direito, `::after` na base direita do item ativo) com `width: 16px; height: 16px` desenham raios invertidos (`radial-gradient(circle at 0 0, transparent 16px, #061C2C 16.5px)`) que suavizam a transição entre o `#193347` da sidebar e o `#061C2C` do item ativo.
  - **Indicador Lateral Verde:** Na borda interna esquerda do item ativo, uma pílula vertical de `3.5px` de largura por `22px` de altura em `--color-success-primary` (`#2EB886`) com `border-radius: 999px`.
- **Modo Colapsado:**
  - Os rótulos de texto desaparecem com transição de opacidade (`150ms`) e as curvas líquidas direitas são recolhidas.
  - Cada item de menu torna-se um botão circular centralizado de `42px × 42px` (`border-radius: 9999px`). O item ativo exibe fundo `#061C2C`, anel sutil de `1.5px solid #2EB886` e ícone em `#B7C7D6`.

### 4.2. Componente 2 — Hero Player em Formato "L" (`<LShapedHeroPlayer />`) e Filtros Rápidos 3x3

- **Conceito Geométrico:**
  - O container do Hero Player não é um retângulo simples: ele possui um **recorte côncavo no canto inferior direito** (formato de "L" deitado/invertido) onde se encaixa o card independente de **Filtros Rápidos (Grid 3x3)**, além de um **recorte semicircular (notch) na borda esquerda** que acomoda o botão circular de recolher/expandir a Sidebar Líquida.
- **Contorno SVG Contínuo e Dinâmico (`ResizeObserver`):**
  - Em vez de usar `border` CSS convencional (que não contorna recortes côncavos), o componente renderiza um `<svg>` absoluto sobreposto (`pointer-events: none; inset: 0`) com um único `<path>` fechado (`fill: none; stroke: #4F6478; stroke-width: 1.5px`).
  - Um hook dedicado (`useLShapePath`) observa via `ResizeObserver`:
    1. As dimensões totais do container do Hero Player (`W`, `H`);
    2. As dimensões do card de **Filtros Rápidos 3x3** (`cutoutW`, `cutoutH`) somadas ao `gap` de encaixe (`14px`);
    3. A posição vertical (`notchY`) e o raio (`notchR = 20px`) do recorte semicircular esquerdo do botão de toggle da sidebar.
  - O gerador de path constrói comandos SVG (`M`, `L`, `A`) aplicando raio de curvatura `R = 18px` tanto nos cantos convexos externos quanto na curva côncava interna do "L", aplicando o mesmo `clip-path: path(...)` ao wrapper de mídia do player.
- **Card de Filtros Rápidos (Grid 3x3) Encaixado no Recorte:**
  - Posicionado exatamente no quadrante inferior direito recortado do Hero Player (`display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px`).
  - Cada uma das 9 células usa `--bg-surface` (`#193347`) em repouso, `--bg-elevated` (`#334B60`) em hover e borda `1px solid #4F6478`.
  - Quando um filtro está ativo, a célula recebe borda `#2EB886`, texto `#B7C7D6` e ponto indicador `#2EB886`.

### 4.3. Componente 3 — Lista `NA FILA / RECENTES` (`<QueueClipList />`)

- **Layout Estrito sem Sobreposição:**
  - Lista vertical em coluna única (`display: flex; flex-direction: column; gap: 10px`). **Proibido** sobrepor cards ou usar carrosséis horizontais neste bloco.
- **Anatomia do Card de Clipe na Fila:**
  - Altura fixa compacta (`76px`), fundo `--bg-surface` (`#193347`), borda `1px solid #4F6478` (`--border-muted`), `border-radius: 12px` e `overflow: hidden`.
  - **Barra Lateral Esquerda Semântica (`4px` de largura, `100%` da altura):**
    - `#2EB886` (`--color-success-primary`): Clipe em reprodução atual no Hero Player ou recém-enviado (`ready`).
    - `#E8B04B` (`--color-warning-primary`): Clipe favoritado pelo usuário ou destaque ("Jogada da Semana").
    - `#D93848` (`--color-danger-primary`): Clipe marcado como `REC` / alta taxa de curtidas recentes.
    - `#4F6478` (`--border-muted`): Item padrão na fila.
  - **Thumbnail 16:9 (`104px × 58px`):** Canto arredondado (`6px`), com badge inferior direito em JetBrains Mono (`11px`, fundo `rgba(6, 28, 44, 0.85)`) exibindo a duração formatada (`00:34`).
  - **Bloco de Texto:** Título truncado em 1 linha (`text-primary`, `13px`, peso 600), jogo + autor + views na segunda linha (`text-muted`, `12px`).

### 4.4. Componente 4 — Widget `COLEÇÕES` em Leque Interativo (`<CollectionFanWidget />`)

- **Disposição Visual em Leque (*Fan Stack*):**
  - Exibe até 4 cards de coleções sobrepostos em perspectiva tática dentro do container Bento inferior direito.
  - Cada card no índice `i` (onde `0` é o card frontal ativo e `1..3` são os cards traseiros) recebe transformações calculadas:
    - `i = 0` (Frente): `transform: translate3d(0px, 0px, 0) rotate(0deg) scale(1)`; `z-index: 30`; fundo `--bg-elevated` (`#334B60`), borda `1.5px solid #4F6478`.
    - `i = 1`: `transform: translate3d(14px, -10px, 0) rotate(3.5deg) scale(0.96)`; `z-index: 20`; fundo `--bg-surface` (`#193347`).
    - `i = 2`: `transform: translate3d(26px, -18px, 0) rotate(7deg) scale(0.92)`; `z-index: 10`; fundo `--bg-surface` (`#193347`).
    - `i = 3`: `transform: translate3d(36px, -24px, 0) rotate(10.5deg) scale(0.88)`; `z-index: 5`; opacidade `0.75`.
- **Interação e Animação *Bring-to-Front*:**
  - Ao passar o mouse (`:hover`) sobre a aba visível de um card traseiro (`i > 0`), ele se eleva sutilmente (`translateY(-6px)`).
  - Ao clicar em qualquer card traseiro, o estado da pilha é reordenado promovendo a coleção clicada para `i = 0` com transição fluida (`transition: transform 360ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity 240ms ease`).
  - O card frontal (`i = 0`) exibe o título da coleção em Bebas Neue (`20px`), badge de quantidade de clipes (`12 CLIPES`), ícone de privacidade e botão rápido **`CARREGAR NA FILA`**.

---

## 5. Estados de Interface e Feedback Visual

### 5.1. Skeleton Loading
- Proibido usar spinners genéricos brancos que quebrem a atmosfera fria do dashboard.
- Todos os skeletons utilizam gradiente pulsante entre `--bg-surface` (`#193347`) e `--bg-elevated` (`#334B60`), respeitando a geometria exata do componente (incluindo o recorte em "L" do Hero Player e as linhas de `76px` da fila).

### 5.2. Empty States (Estados Vazios)
- Quando uma busca, filtro 3x3 ou coleção não retornar clipes:
  - Container com borda tracejada `1.5px dashed #4F6478` sobre fundo `#061C2C`.
  - Ícone Lucide (`Film` ou `FolderSearch`) em `#6C7F91`.
  - Título em **Bebas Neue** (`#B7C7D6`): ex. `"NENHUM CLIPE ENCONTRADO NESTE FILTRO"`.
  - Subtítulo em **JetBrains Mono** (`13px`, `#91A1B2`) e botão de ação imediata (`LIMPAR FILTROS` ou `ENVIAR PRIMEIRO CLIPE`).

### 5.3. Sistema de Toasts
- Posicionados no canto inferior direito (`z-index: 50`), tipografia em **JetBrains Mono** (`13px`):
  - **Sucesso / Link Copiado:** Fundo `#1D6F56`, borda `1.5px solid #2EB886`, ícone `CheckCircle2` em `#2EB886`, texto `#B7C7D6`.
  - **Aviso / Atenção:** Fundo `#193347`, borda `1.5px solid #E8B04B`, ícone `AlertTriangle` em `#E8B04B`, texto `#B7C7D6`.
  - **Erro / Falha:** Fundo `#8C2332`, borda `1.5px solid #D93848`, ícone `XCircle` em `#F06A76`, texto `#B7C7D6`.

### 5.4. Estados do Fluxo de Upload (Cloudflare R2)
1. **`idle`:** Dropzone com borda tracejada `#4F6478`, hover em `#334B60`.
2. **`inspecting`:** Extraindo metadados do `<video>` e gerando thumbnail WebP no `<canvas>` (indicador em `#E8B04B`).
3. **`uploading`:** Barra de progresso horizontal (`height: 8px`, trilho `#061C2C`, preenchimento `#2EB886`) atualizada em tempo real via `xhr.upload.onprogress`, exibindo porcentagem (`68%`) e bytes (`32.8 MB / 48.2 MB`) em JetBrains Mono.
4. **`confirming`:** Verificando integridade no Cloudflare R2 (`POST /confirm-upload`).
5. **`error`:** Borda `#D93848`, mensagem detalhada em `#F06A76` (ex.: falha de rede no PUT ou `UPLOAD_VERIFICATION_FAILED`) e botão **`TENTAR NOVAMENTE`**.

---

## 6. Regras de Responsividade (Desktop Bento -> Tablet -> Mobile)

| Breakpoint | Faixa de Largura | Comportamento Estrutural do Layout |
| :--- | :---: | :--- |
| **Desktop Bento (XL / 2XL)** | `>= 1280px` | **Layout Bento Completo:** Sidebar Líquida (expandida `240px` ou colapsada `76px`) + Coluna Central com **Hero Player em formato "L"** e card **Filtros Rápidos (3x3)** encaixado no recorte inferior direito + Coluna Direita (`360px`) dividida entre **NA FILA / RECENTES** e **COLEÇÕES** em leque. |
| **Tablet / Laptop Compacto (MD / LG)** | `768px – 1279px` | **Bento Compacto 2 Colunas:** Sidebar Líquida inicia colapsada (`76px`) por padrão. O Hero Player mantém o contorno SVG `#4F6478`, mas caso a largura do player seja `< 640px`, o recorte côncavo inferior direito se desfaz para um retângulo `16:9` com o grid de Filtros Rápidos posicionado imediatamente abaixo em linha horizontal, mantendo `NA FILA` e `COLEÇÕES` na segunda coluna ou em grid inferior `2x1`. |
| **Mobile (SM / XS)** | `< 768px` | **Layout Empilhado (Single-Column):** A Sidebar Líquida lateral é convertida em uma **Bottom Navigation Bar** fixa (`height: 64px`, fundo `#193347`, indicador ativo `#2EB886`). O Hero Player assume formato retangular `16:9` full-width no topo, seguido pelos Filtros Rápidos (scroll horizontal ou grid 3x3 compacto), lista **NA FILA / RECENTES** (`gap: 10px`) e widget **COLEÇÕES** adaptado para toque (*tap-to-front*). |
