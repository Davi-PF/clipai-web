# Git Workflow, Branching & Atomic Commits — CLIPAÍ (`clipai-web`)

Este documento define o fluxo oficial de controle de versão, nomenclatura de branches, política de commits atômicos e regras de Pull Request no repositório **`clipai-web`**.

---

## 1. Modelo de Branching (GitHub Flow)

O `clipai-web` adota o **GitHub Flow**:

- **`main`:** Branch principal, protegida e **sempre estável e deployável na Vercel**.
- **Proibição de Push Direto na `main`:** É estritamente proibido desenvolver ou realizar commits diretamente na `main`. Toda alteração (feature, correção, refatoração ou documentação) deve nascer em uma branch dedicada a partir da `main` atualizada e retornar via **Pull Request (PR)**.

```bash
# Sempre sincronize antes de iniciar uma nova tarefa
git checkout main
git pull --ff-only origin main
git checkout -b feat/nome-da-feature
```

---

## 2. Padrão de Nomenclatura de Branches

Todas as branches devem seguir estritamente o formato em **inglês (`en-US`)** e **`kebab-case`**:

| Prefixo | Finalidade | Exemplos |
| :--- | :--- | :--- |
| `feat/<short-name>` | Novas telas, componentes Bento, hooks ou integrações | `feat/liquid-sidebar`, `feat/clip-r2-upload` |
| `fix/<short-name>` | Correções de bugs funcionais, regressões ou ajustes de layout | `fix/l-shape-svg-resize`, `fix/toast-prng-id` |
| `refactor/<short-name>` | Refatoração interna sem alteração de comportamento externo | `refactor/api-client-headers` |
| `docs/<short-name>` | Criação ou atualização de documentação (`/docs`, `AGENTS.md`) | `docs/git-workflow`, `docs/sync-api-contract` |
| `chore/<short-name>` | Dependências, scripts, configs de build, CI ou templates | `chore/upgrade-vitest`, `chore/ci-cache` |
| `test/<short-name>` | Adição ou ampliação exclusiva de cobertura de testes | `test/upload-hook-coverage` |
| `hotfix/<short-name>` | Correções críticas urgentes em produção | `hotfix/refresh-cookie-loop` |

---

## 3. Sincronização Cross-Repo (`clipai-web` <-> `clipai-api`)

O frontend (`clipai-web`) consome diretamente a API REST do repositório **`clipai-api`**:

1. **Mesmo Nome de Branch em Features Integradas:** Sempre que uma entrega exigir alterações coordenadas no backend e no frontend (ex.: novo fluxo de upload ou coleções), utilize **exatamente o mesmo nome de branch** nos dois repositórios (ex.: `feat/clip-upload` em `clipai-api` e `feat/clip-upload` em `clipai-web`).
2. **Sincronização de Contratos Antes do Merge:** Antes de abrir ou aprovar o PR na `main`, garanta que:
   - `docs/API_CONTRACT.md` no `clipai-web` espelha fielmente `docs/API_CONTRACT.md` do `clipai-api`.
   - As interfaces TypeScript em `src/types/api.ts` correspondem exatamente aos schemas JSON (`snake_case`) da API.
3. **Ordem de Merge:** Quando houver dependência de endpoint novo, o PR correspondente no `clipai-api` deve ser revisado/mergeado antes (ou referenciado explicitamente no PR do `clipai-web`).

---

## 4. Política de Commits Atômicos & Conventional Commits

### 4.1. Formato Obrigatório da Mensagem
Todas as mensagens de commit devem estar em **inglês (`en-US`)**, no modo imperativo e minúsculo, respeitando o limite máximo de **72 caracteres** na linha de assunto:

```text
<type>(<scope>): <imperative lowercase description>
```

- **Tipos aceitos:** `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `ci`.
- **Escopos válidos para o frontend:**
  - `ui` — Primitivos reutilizáveis (`Button`, `Input`, `Toast`, `Badge`, `Skeleton`)
  - `auth` — Contexto, serviços, guards e telas de autenticação
  - `player` — Hero Player em formato "L", geometria SVG e atalhos de reprodução
  - `upload` — Extração `<video>`/`<canvas>`, `r2-uploader`, modal e progresso
  - `dashboard` — Layout Bento, Sidebar Líquida, Filtros Rápidos 3x3 e Fila
  - `collections` — Widget em leque e páginas de coleções
  - `api` — `api-client.ts`, interceptores e contratos em `src/types/api.ts`
  - `styles` — Tokens CSS, Tailwind e tipografia
  - `ci` — Workflows do GitHub Actions e `sonar-project.properties`
  - `deps` — `package.json`, lockfile e dependências
  - `docs` — Documentação em `/docs`, `AGENTS.md` e templates

### 4.2. O que Define um Commit Atômico
1. **Uma única responsabilidade lógica:** Não misture ajustes visuais genéricos com alterações de cliente HTTP ou refatorações não relacionadas no mesmo commit.
2. **Estado sempre íntegro e compilável:** Cada commit individual deve deixar o repositório livre de erros de build/tipagem (`npm run lint`, `npx tsc --noEmit` e `npm test` passando).
3. **Stage seletivo:** Prefira `git add <caminhos-específicos>` em vez de `git add .` para evitar incluir arquivos não relacionados ou configurações locais acidentalmente.

### 4.3. Exemplo Real de Quebra de Sprint em Commits Atômicos
Ao implementar uma feature (ex.: Upload direto para o R2 na Sprint 3), separe em commits coesos na seguinte ordem:
1. `feat(api): add presigned upload request and response types` (`src/types/api.ts`)
2. `feat(upload): add client-side media inspector and webp thumbnail capture` (`src/lib/media-inspector.ts`)
3. `feat(upload): implement xmlhttprequest r2 uploader with progress and abort` (`src/lib/r2-uploader.ts`, `src/hooks/useClipUpload.ts`)
4. `feat(ui): add upload clip modal and real-time progress bar` (`src/components/upload/*`)
5. `test(upload): add unit and component tests for r2 upload pipeline` (`tests/unit/*`, `tests/components/*`)

---

## 5. Pull Requests, CI e Estratégia de Merge

1. **Abertura de PR:** Todo trabalho entra na `main` exclusivamente via Pull Request preenchido com o template `.github/pull_request_template.md`.
2. **Critérios Obrigatórios para Merge:**
   - Workflow do GitHub Actions (`.github/workflows/ci.yml`) 100% verde (`npm run lint`, `npm run format:check`, `npx tsc --noEmit`, `npm run test:coverage`).
   - **Quality Gate do SonarCloud** aprovado (0 Bugs, 0 Vulnerabilities, 0 Security Hotspots não revisados, cobertura `>= 80%`, duplicação `< 3%`).
   - Preview Deployment da **Vercel** validado sem erros de build ou runtime.
3. **Estratégia de Merge (`Rebase and merge` ou `Merge commit`):**
   - Utilize **`Rebase and merge`** (preferencial) ou **`Merge commit`** para preservar o histórico limpo e rastreável dos commits atômicos.
   - **Proibido usar `Squash and merge`**, pois destrói a granularidade dos commits atômicos construídos na branch.
4. **Limpeza Pós-Merge:** Delete imediatamente a branch remota (e local) após o merge na `main`.
