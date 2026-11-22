# AGENTS.md — Regras Permanentes para Agentes de Código (`clipai-web`)

Este documento define as diretrizes inegociáveis para qualquer Agente de IA ou desenvolvedor que atue no repositório **`clipai-web`** (Frontend do **CLIPAÍ**).

---

## 1. Fonte Única de Verdade (`/docs`) — Leitura Obrigatória

Antes de criar, alterar ou refatorar qualquer página, componente, hook, serviço ou teste, você **DEVE** consultar os documentos em `/docs`:

1. [`docs/PRD.md`](docs/PRD.md): Visão do produto sob a ótica de UX, jornadas principais do MVP (assistir, enviar clipe, organizar coleções, compartilhar link `/c/[slug]`), validações no cliente e divisão estrita entre MVP (v1.0) e Pós-MVP (v1.1 / v2.0).
2. [`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md): Paleta base Dark Mode Frio, cores semânticas, variáveis CSS (`:root`), configuração Tailwind, regras tipográficas do Modo Híbrido (**Bebas Neue** + **JetBrains Mono**), especificações geométricas dos 4 componentes signature do Dashboard Bento e responsividade.
3. [`docs/FRONTEND_ARCHITECTURE.md`](docs/FRONTEND_ARCHITECTURE.md): Árvore de pastas do Next.js App Router, cliente HTTP (`credentials: 'include'` + refresh *single-flight*), pipeline de upload client-side (`<video>` + `<canvas>` WebP + `XMLHttpRequest` PUT para o Cloudflare R2), player de vídeo e CI/CD.
4. [`docs/API_CONTRACT.md`](docs/API_CONTRACT.md): Contrato REST espelhado do repositório `clipai-api` (`/api/v1/...`), códigos de erro e interfaces TypeScript base (`User`, `Clip`, `Collection`, `PresignedUploadResponse`, `ApiError`).
5. [`docs/GIT_WORKFLOW.md`](docs/GIT_WORKFLOW.md): Fluxo oficial de branches (GitHub Flow), nomenclatura, sincronização cross-repo com `clipai-api`, commits atômicos e regras de Pull Request.

---

## 2. Fidelidade Absoluta ao Design System (`docs/DESIGN_SYSTEM.md`)

1. **Proibição de Cores Fora dos Tokens:**
   - **NUNCA** invente códigos hexadecimais, classes padrão do Tailwind (`bg-slate-900`, `text-gray-400`, `bg-emerald-500`, `bg-red-500`, etc.) ou gradientes arbitrários fora dos tokens oficiais definidos em `docs/DESIGN_SYSTEM.md`:
     - Paleta Base: `--bg-deep` (`#061C2C`), `--bg-surface` (`#193347`), `--bg-elevated` (`#334B60`), `--border-muted` (`#4F6478`), `--text-muted` (`#6C7F91`), `--text-secondary` (`#91A1B2`), `--text-primary` (`#B7C7D6`).
     - Semânticas: Vermelhos (`#F06A76`, `#D93848`, `#8C2332`), Amarelo (`#E8B04B`), Verdes (`#2EB886`, `#1D6F56`).
2. **Tipografia em Modo Híbrido Obrigatório:**
   - **Bebas Neue (`font-display`):** Exclusiva para o logo `CLIPAÍ`, títulos de seções/cards Bento, título principal do clipe e botões CTA principais (sempre em `uppercase` com `letter-spacing: 0.06em`).
   - **JetBrains Mono (`font-mono`):** Obrigatória para corpo de texto (base `13px`), metadados técnicos (`1080p`, `60 FPS`, duração, tamanho), badges, inputs, contadores e botões secundários/filtros.
3. **Integridade Geométrica dos 4 Componentes Signature do Bento:**
   - **Sidebar Líquida Colapsável:** Quando expandida, o item ativo deve assumir `#061C2C` fundindo-se ao workspace Bento com curvas côncavas na borda direita e indicador lateral `#2EB886`; quando colapsada, ícones circulares centralizados.
   - **Hero Player em formato "L":** Contorno SVG contínuo (`1.5px`, `#4F6478`) recalculado via `ResizeObserver`, contornando o recorte côncavo inferior direito onde se encaixa o card de **Filtros Rápidos (3x3)** e o recorte semicircular esquerdo do botão da sidebar.
   - **NA FILA / RECENTES:** Coluna vertical limpa sem sobreposição (`gap: 10px`), com barra lateral esquerda colorida por status/categoria.
   - **COLEÇÕES:** Cards dispostos em leque interativo com animação *bring-to-front* ao clicar em um card traseiro.

---

## 3. Regras Arquiteturais e de Segurança no Cliente

1. **Mídia NUNCA Trafega pelo Next.js ou FastAPI:**
   - É estritamente proibido enviar arquivos de vídeo ou thumbnail para Route Handlers/Server Actions do Next.js ou diretamente para o servidor FastAPI.
   - Todo upload deve seguir o pipeline client-side: validação local -> extração de metadados em `<video>` + geração automática de thumbnail WebP em `<canvas>` -> `POST /api/v1/clips/upload-url` -> `PUT` direto para o **Cloudflare R2** via `XMLHttpRequest` (com barra de progresso real) -> `POST /api/v1/clips/{clip_id}/confirm-upload`.
2. **Segurança de Sessão e Autenticação:**
   - O `access_token` JWT deve ser mantido **exclusivamente em memória** (nunca em `localStorage` ou `sessionStorage`).
   - Todas as chamadas de autenticação (`/auth/login`, `/auth/refresh`, `/auth/logout`) devem trafegar com `credentials: 'include'` para permitir o uso do cookie `HttpOnly` (`clipai_refresh_token`), com renovação *single-flight* ao interceptar `401 TOKEN_EXPIRED`.
3. **Escopo Travado do MVP:**
   - Não implemente telas ou fluxos do Pós-MVP (setup de 2FA QR Code, Discord OAuth2, compressão de vídeo client-side, comentários com timestamp), mas **preserve** nas interfaces TypeScript os campos reservados (`is_2fa_enabled`, `requires_2fa`, `temp_2fa_token`, `privacy: 'friends'`).
4. **Zero Segredos no Frontend:**
   - Jamais exponha chaves privadas do Cloudflare R2, segredos JWT ou tokens internos em variáveis `NEXT_PUBLIC_*` ou no código-fonte.

---

## 4. Convenções de Idioma e Padronização

- **Em Inglês (`en-US`):**
  - Todo o código-fonte: nomes de arquivos, componentes React (`LiquidSidebar`, `LShapedHeroPlayer`), hooks (`useLShapePath`, `useClipUpload`), tipos/interfaces TypeScript, variáveis, funções e testes.
  - Mensagens de commit Git (padrão *Conventional Commits*: `feat:`, `fix:`, `test:`, `docs:`, `refactor:`, `chore:`).
- **Em Português do Brasil (`pt-BR`):**
  - **100% da interface voltada ao usuário final:** títulos, rótulos de botões, placeholders, mensagens de erro de validação, textos de empty state, toasts (`"Link copiado para a área de transferência!"`) e atributos de acessibilidade (`aria-label`, `alt`, `title`).

---

## 5. Qualidade de Código, TypeScript Strict e SonarCloud Quality Gate

Todo código produzido deve passar sem erros ou avisos pelo **TypeScript (`strict: true`)**, **ESLint**, **Prettier** e pelo **Quality Gate do SonarCloud**:

1. **Zero `any` no TypeScript:**
   - É terminantemente proibido o uso de `any`, `as any`, `@ts-ignore` ou `@ts-expect-error` sem justificativa técnica documentada. Utilize os tipos estritos de `src/types/api.ts`, *type guards* ou `unknown` com estreitamento de tipo.
2. **Métricas do SonarCloud:**
   - **Complexidade Cognitiva `< 15`:** Componentes e hooks devem ser coesos e modulares. Extraia subcomponentes e funções puras (`src/lib/`) sempre que a lógica condicional crescer.
   - **Zero Duplicação (`< 3%`):** Reutilize os componentes base de `src/components/ui/` e os serviços de `src/services/`.
   - **Acessibilidade (a11y) e HTML Semântico:** Use elementos interativos nativos (`<button>`, `<a>`, `<dialog>`) em vez de `<div onClick>` sem semântica; garanta navegação por teclado e `aria-label` em botões de ícone (Lucide React).
   - **Prevenção de Memory Leaks:** Sempre revogue Object URLs (`URL.revokeObjectURL`), desconecte `ResizeObserver` (`observer.disconnect()`) e aborte `XMLHttpRequest`/`AbortController` no cleanup de `useEffect`.

---

## 6. Obrigatoriedade de Testes Automatizados (`Vitest` + `Testing Library`)

Nenhuma funcionalidade é considerada concluída sem seus respectivos testes automatizados:

1. **Cobertura Mínima Obrigatória (`>= 80%`):**
   - **Hooks e Utilitários Críticos (`tests/unit/`):**
     - `media-inspector.ts` e `validators.ts`: validação de limites (100 MB, 120s, MIME types `.mp4`/`.webm`, captura de frame WebP no `<canvas>`).
     - `api-client.ts`: injeção de `Bearer` token, envio de `credentials: 'include'`, interceptação de `401 TOKEN_EXPIRED` com fila *single-flight* e parse de `ApiError` em PT-BR.
     - `useLShapePath.ts`: cálculo geométrico do `<path>` SVG do Hero Player em formato "L".
     - `useClipUpload.ts`: fluxo completo de upload com progresso, erro e cancelamento (com `r2-uploader` e `clips.service` mockados).
   - **Componentes Principais (`tests/components/`):**
     - Testes com React Testing Library validando colapso/expansão da Sidebar Líquida, seleção nos Filtros Rápidos 3x3, rotação *bring-to-front* do widget de Coleções em leque e feedbacks de formulário/toasts em PT-BR.
2. **Checklist de Verificação Antes de Finalizar Qualquer Tarefa:**
   ```bash
   npm run lint
   npm run format:check
   npm run typecheck
   npm run test:coverage
   ```

---

## 7. Git & Branching Protocol (Obrigatório)

Todo agente ou desenvolvedor deve seguir rigorosamente as diretrizes definidas em [`docs/GIT_WORKFLOW.md`](docs/GIT_WORKFLOW.md):

1. **Consulta Obrigatória:** Sempre consulte `docs/GIT_WORKFLOW.md` antes de criar branches, commitar ou abrir Pull Requests.
2. **Proibição de Commits Diretos na `main`:** Nunca edite ou faça commits diretamente na branch `main`. Antes de modificar qualquer arquivo, verifique a branch atual (`git branch --show-current`) e crie/troque para uma branch adequada (`feat/...`, `fix/...`, `docs/...`, `chore/...`, `refactor/...`, `test/...`).
3. **Portão de Qualidade Pré-Commit:** Sempre execute e garanta sucesso em `npm run lint`, `npx tsc --noEmit` e `npm test` antes de registrar qualquer commit.
4. **Commits Atômicos & Conventional Commits:** Organize todas as entregas em commits atômicos (uma responsabilidade lógica por commit, com stage seletivo) seguindo o padrão `<type>(<scope>): <imperative lowercase description>` em inglês.
