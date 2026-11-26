# CLIPAÍ — Frontend Web (`clipai-web`)

Interface web do **CLIPAÍ**, plataforma brasileira de armazenamento, organização em coleções, análise de retenção e compartilhamento rápido de clipes de jogadas (*gaming highlights*).

Construído com **Next.js 16 (App Router)**, **React 19**, **TypeScript Strict** e **Tailwind CSS**, este repositório consome a API assíncrona [`clipai-api`](https://github.com/Davi-PF/clipai-api) e realiza processamento e upload de mídia **100% client-side** direto para o **Cloudflare R2**.

---

## Principais Funcionalidades

- **Workspace Bento com Geometria Customizada (`/dashboard`):**
  - **Sidebar Líquida Colapsável + Mobile Floating Dock:** Fusão contínua (`#061C2C`) do item ativo ao fundo do workspace no desktop e dock flutuante recortado em SVG com menu radial animado no mobile.
  - **Hero Player em Formato `"L"`:** Contorno SVG contínuo (`1.5px`, `#4F6478`) recalculado em tempo real via `ResizeObserver`, abraçando o card de **Filtros Rápidos 3x3** e o botão de colapso da sidebar.
  - **Descoberta, Destaques e Mais Vistos:** Navegação fluida entre **Início**, **Novos Clipes**, **Destaques** (ponderado por favoritos e curtidas com selo `★ DESTAQUE`), **Mais Vistos**, **Favoritos** e **Coleções**, incluindo filtro temporal (`7 dias`, `30 dias`, `Todo período`) e pílulas rápidas no mobile.
  - **Coleções em Leque Interativo:** Cards empilhados com rotação *bring-to-front*, criação/edição com cor de destaque e confirmação segura de exclusão.
- **Editor de Vídeo no Navegador e Upload Direto ao R2:**
  - Recorte (*trim*), presets de resolução/qualidade, remoção de áudio (*mute*) via **`@ffmpeg/ffmpeg` (WebAssembly)** e captura automática/manual de thumbnail em **WebP** via `<canvas>`.
  - Envio binário direto para o **Cloudflare R2** via Presigned `PUT` URL (`XMLHttpRequest`) com barra de progresso real, pausa ao abrir diálogo de confirmação e limpeza de uploads cancelados.
- **Player Dedicado e Compartilhamento (`/c/[slug]`):**
  - Página compartilhável com controles customizados, atalhos táticos (`Space`/`K`, `F`, `M`, `J`/`L`, avanço frame a frame com `,`/`.`) e coleta de telemetria de retenção.
- **Estúdio do Criador (`/studio`):**
  - Painel analítico com KPIs consolidados, gráficos de sessões/tempo assistido por dia (**Recharts**), resumo por jogo, curva de retenção (`0%`–`100%`) e gestão rápida dos clipes enviados.
- **Autenticação Segura, Perfil (`/u/[username]`) e Ajustes (`/settings`):**
  - `access_token` mantido **exclusivamente em memória** + renovação silenciosa *single-flight* via cookie `HttpOnly`.
  - Login/vínculo com **Discord OAuth2**, ativação de **2FA TOTP** com QR Code e códigos de backup, e personalização de perfil/avatar.

---

## Design System — Dark Mode Frio & Tipografia Híbrida

Toda a interface segue estritamente os tokens definidos em [`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md):

- **Paleta Base:** `--bg-deep` (`#061C2C`), `--bg-surface` (`#193347`), `--bg-elevated` (`#334B60`), `--border-muted` (`#4F6478`), `--text-muted` (`#6C7F91`), `--text-secondary` (`#91A1B2`), `--text-primary` (`#B7C7D6`).
- **Cores Semânticas:** Sucesso/CTA (`#2EB886` / `#1D6F56`), Destaque/Favorito (`#E8B04B`) e Perigo/REC/Curtir (`#F06A76` / `#D93848` / `#8C2332`).
- **Tipografia Híbrida:**
  - **Bebas Neue (`font-display`):** Logo `CLIPAÍ`, cabeçalhos de seções Bento, títulos principais de clipes e CTAs primários (sempre em `uppercase` com `letter-spacing: 0.06em`).
  - **JetBrains Mono (`font-mono`):** Corpo de texto, metadados técnicos (`1080p`, `60 FPS`, duração), badges, filtros, inputs e contadores.

---

## Stack Tecnológica

| Camada | Tecnologias |
| :--- | :--- |
| **Framework & UI** | Next.js 16 (App Router, bundler Webpack), React 19, TypeScript 5 (`strict: true`) |
| **Estilização & Ícones** | Tailwind CSS 3 + CSS Variables, Lucide React |
| **Mídia & Visualização** | `@ffmpeg/ffmpeg`, `@ffmpeg/util`, HTML5 `<video>`/`<canvas>`, Recharts, `qrcode.react` |
| **Testes & Qualidade** | Vitest 3 (`@vitest/coverage-v8`), React Testing Library, ESLint 9, Prettier 3 |
| **CI/CD & Deploy** | GitHub Actions, SonarCloud Quality Gate, Vercel |

---

## Estrutura do Projeto

```text
clipai-web/
├── docs/                       # PRD, Design System, Arquitetura Frontend, Contrato API e Git Workflow
├── src/
│   ├── app/                    # Rotas Next.js App Router (/, /login, /register, /dashboard, /studio, /settings, /c/[slug], /u/[username])
│   ├── components/
│   │   ├── auth/               # Formulários de login/cadastro, recuperação, Discord OAuth2 e desafio 2FA
│   │   ├── collections/        # Modais de criação, adição de clipe e exclusão de coleções
│   │   ├── dashboard/          # BentoWorkspace, LiquidSidebar, MobileFloatingDock, HeroPlayerBento, QuickFiltersCard, ClipQueueList, CollectionsFanWidget
│   │   ├── landing/            # Landing Page pública e mockup interativo
│   │   ├── player/             # ClipPlayer customizado, ClipDetailView e modais de edição/exclusão
│   │   ├── profile/            # Visualização de perfil público (/u/[username])
│   │   ├── settings/           # Abas de Perfil, Conexões (Discord) e Segurança (2FA TOTP)
│   │   ├── studio/             # Estúdio do Criador (KPIs, gráficos Recharts e tabela de clipes)
│   │   ├── ui/                 # Primitivos reutilizáveis (BrandLogo, Button, Input, Toast, UserAvatar...)
│   │   └── upload/             # UploadClipModal, editor FFmpeg, timeline de corte e seletor de privacidade/tags
│   ├── contexts/               # AuthProvider, SidebarProvider e ToastProvider
│   ├── hooks/                  # useAuth, useLShapePath, useClipUpload, useClipSocial, useClipTelemetry...
│   ├── lib/                    # api-client (single-flight refresh), ffmpeg-processor, r2-upload, video-utils, validators
│   ├── services/               # Clientes REST tipados (auth, clips, collections, analytics, user, health)
│   └── types/                  # Contratos TypeScript sincronizados com docs/API_CONTRACT.md
└── tests/
    ├── unit/                   # Testes unitários de utilitários, processador de mídia e services
    └── components/             # Testes de integração de interface com React Testing Library
```

---

## Como Executar Localmente

### 1. Pré-requisitos
- **Node.js 22 LTS** (ou 20+) e `npm`
- Backend [`clipai-api`](https://github.com/Davi-PF/clipai-api) em execução (padrão em `http://localhost:8000`)

### 2. Instalação e variáveis de ambiente
```powershell
# Instalar dependências exatas do lockfile
npm ci

# Criar arquivo de ambiente local
Copy-Item .env.example .env.local
```

Variáveis públicas em `.env.local` (nunca adicione chaves privadas com `NEXT_PUBLIC_`):
```dotenv
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Iniciar o servidor de desenvolvimento
```powershell
npm run dev
```
*(Os scripts `dev` e `build` já executam o Next.js com `--webpack` para compatibilidade com os Web Workers dinâmicos do `@ffmpeg/ffmpeg`.)*

Acesse `http://localhost:3000`.

---

## Scripts Disponíveis

| Script | Comando | Descrição |
| :--- | :--- | :--- |
| `npm run dev` | `next dev --webpack` | Servidor local de desenvolvimento com hot-reload |
| `npm run build` | `next build --webpack` | Build otimizado de produção |
| `npm run start` | `next start` | Inicia o servidor de produção após o build |
| `npm run lint` | `eslint src tests` | Verifica regras estritas de TypeScript, React Hooks e acessibilidade |
| `npm run format` | `prettier --write ...` | Formata todos os arquivos em `src/` e `tests/` |
| `npm run format:check` | `prettier --check ...` | Valida formatação Prettier (executado no CI) |
| `npm run typecheck` | `tsc --noEmit` | Checagem estática completa do TypeScript (`strict: true`) |
| `npm test` | `vitest run` | Executa todos os testes unitários e de componentes |
| `npm run test:coverage` | `vitest run --coverage` | Executa a suíte com relatório de cobertura V8 (`>= 80%`) |

---

## Qualidade de Código e CI/CD

Todo Pull Request passa obrigatoriamente pelo workflow `.github/workflows/ci.yml` e pelo **Quality Gate do SonarCloud** (zero uso de `any`, complexidade cognitiva `< 15`, duplicação `< 3%` e cobertura `>= 80%`):

```powershell
npm run lint
npm run format:check
npm run typecheck
npm run test:coverage
```

---

## Documentação Técnica (`/docs`)

- [`docs/PRD.md`](docs/PRD.md) — Jornadas do usuário, regras de validação no cliente e escopo do produto.
- [`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md) — Paleta Dark Mode Frio, tipografia híbrida e especificações geométricas Bento.
- [`docs/FRONTEND_ARCHITECTURE.md`](docs/FRONTEND_ARCHITECTURE.md) — Arquitetura de cliente HTTP, pipeline R2 e player de vídeo.
- [`docs/API_CONTRACT.md`](docs/API_CONTRACT.md) — Contrato REST espelhado do `clipai-api`.
- [`docs/GIT_WORKFLOW.md`](docs/GIT_WORKFLOW.md) — Fluxo de branches, sincronização cross-repo e commits atômicos.
