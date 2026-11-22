## Resumo das Alterações
<!-- Descreva de forma objetiva o que foi implementado, corrigido ou atualizado neste PR. -->

## Tipo de Mudança
- [ ] `feat` (nova funcionalidade / tela / componente)
- [ ] `fix` (correção de bug ou ajuste de layout)
- [ ] `refactor` (refatoração sem mudança de comportamento)
- [ ] `docs` (atualização de documentação)
- [ ] `chore` / `ci` (dependências, build, CI/CD)
- [ ] `test` (adição ou ajuste de testes)

## Sincronização Cross-Repo (`clipai-api`)
<!-- Caso esta alteração dependa ou integre com o backend, informe a branch ou PR correspondente no clipai-api. -->
- Branch / PR no `clipai-api`: N/A

## Preview Visual / Screenshots
<!-- Obrigatório quando houver alterações de interface (Desktop Bento, Mobile ou telas de Auth). -->

## Checklist Obrigatório
- [ ] Commits organizados de forma atômica seguindo Conventional Commits (`docs/GIT_WORKFLOW.md`).
- [ ] `npm run lint`, `npx tsc --noEmit` e `npm test` passando sem erros ou avisos.
- [ ] Tokens de cores, tipografia híbrida (**Bebas Neue** + **JetBrains Mono**) e geometria do `docs/DESIGN_SYSTEM.md` respeitados.
- [ ] `docs/API_CONTRACT.md` e `src/types/api.ts` sincronizados com o `clipai-api` (se aplicável).
- [ ] Nenhum segredo, token privado ou arquivo `.env` / `.env.local` incluído no diff.
