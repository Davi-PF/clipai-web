import { Film, Heart, Layers, Palette, ShieldCheck, Star, Terminal, Type } from 'lucide-react';
import { ApiHealthStatusCard } from '@/components/ui/ApiHealthStatusCard';
import { BASE_COLOR_TOKENS, SEMANTIC_COLOR_TOKENS } from '@/lib/design-tokens';

export default function DiagnosticHomePage() {
  return (
    <main className="min-h-screen bg-bg-deep px-4 py-8 text-text-primary md:px-8 lg:px-12">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* Header Bento — Identidade CLIPAÍ */}
        <header className="flex flex-col justify-between gap-4 rounded-bento border-[1.5px] border-border-muted bg-bg-surface p-6 md:flex-row md:items-center">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-card border border-border-muted bg-bg-deep">
              <Film className="h-6 w-6 text-success" aria-hidden="true" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="font-display text-display-hero uppercase tracking-[0.06em] text-text-primary">
                  CLIPAÍ
                </h1>
                <span className="rounded-control bg-warning px-2.5 py-0.5 font-mono text-mono-badge font-bold uppercase text-bg-deep">
                  BETA
                </span>
                <span className="rounded-control border border-success bg-success-surface px-2.5 py-0.5 font-mono text-mono-badge uppercase text-text-primary">
                  SPRINT 0 • FUNDAÇÃO
                </span>
              </div>
              <p className="mt-1 font-mono text-mono-body text-text-secondary">
                Painel de diagnóstico de Design Tokens, Tipografia Híbrida e Conectividade REST
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-control border border-border-muted bg-bg-elevated px-3 py-1.5 font-mono text-mono-meta text-text-primary">
              <ShieldCheck className="h-4 w-4 text-success" aria-hidden="true" />
              TypeScript Strict
            </span>
            <button
              type="button"
              className="rounded-control bg-success px-5 py-2.5 font-display text-display-cta uppercase tracking-[0.06em] text-bg-deep transition-colors hover:bg-success-surface hover:text-text-primary"
            >
              ENVIAR CLIPE
            </button>
          </div>
        </header>

        {/* Status de Conexão com /api/v1/health */}
        <ApiHealthStatusCard />

        {/* Paleta Base — Dark Mode Frio */}
        <section
          aria-labelledby="heading-base-palette"
          className="rounded-bento border-[1.5px] border-border-muted bg-bg-surface p-6"
        >
          <div className="mb-5 flex items-center gap-3">
            <Palette className="h-5 w-5 text-success" aria-hidden="true" />
            <h2
              id="heading-base-palette"
              className="font-display text-display-md uppercase tracking-[0.06em] text-text-primary"
            >
              PALETA BASE — DARK MODE FRIO (7 TOKENS OFICIAIS)
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {BASE_COLOR_TOKENS.map((token) => (
              <article
                key={token.cssVar}
                className="flex flex-col justify-between rounded-card border border-border-muted bg-bg-deep p-4"
              >
                <div>
                  <div
                    className="mb-3 h-14 w-full rounded-control border border-border-muted"
                    style={{ backgroundColor: `var(${token.cssVar})` }}
                    aria-label={`Amostra de cor ${token.name} (${token.hex})`}
                  />
                  <div className="flex items-center justify-between">
                    <h3 className="font-display text-display-md uppercase tracking-[0.06em] text-text-primary">
                      {token.name}
                    </h3>
                    <span className="rounded-control bg-bg-surface px-2 py-0.5 font-mono text-mono-badge text-text-primary">
                      {token.hex}
                    </span>
                  </div>
                  <code className="mt-1 block font-mono text-mono-meta text-success">
                    {token.cssVar}
                  </code>
                </div>
                <p className="mt-3 font-mono text-mono-meta text-text-secondary">{token.role}</p>
              </article>
            ))}
          </div>
        </section>

        {/* Cores Semânticas e Estados Bento */}
        <section
          aria-labelledby="heading-semantic-palette"
          className="rounded-bento border-[1.5px] border-border-muted bg-bg-surface p-6"
        >
          <div className="mb-5 flex items-center gap-3">
            <Layers className="h-5 w-5 text-warning" aria-hidden="true" />
            <h2
              id="heading-semantic-palette"
              className="font-display text-display-md uppercase tracking-[0.06em] text-text-primary"
            >
              CORES SEMÂNTICAS E INTERAÇÕES TÁTICAS
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {SEMANTIC_COLOR_TOKENS.map((token) => (
              <article
                key={token.cssVar}
                className="flex items-start gap-4 rounded-card border border-border-muted bg-bg-deep p-4"
              >
                <div
                  className="h-12 w-12 shrink-0 rounded-control border border-border-muted"
                  style={{ backgroundColor: `var(${token.cssVar})` }}
                  aria-label={`Amostra semântica ${token.name} (${token.hex})`}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-display text-display-md uppercase tracking-[0.06em] text-text-primary">
                      {token.name}
                    </h3>
                    <span className="font-mono text-mono-badge text-text-primary">{token.hex}</span>
                  </div>
                  <code className="block font-mono text-mono-badge text-text-muted">
                    {token.cssVar}
                  </code>
                  <p className="mt-1.5 font-mono text-mono-meta text-text-secondary">
                    {token.role}
                  </p>
                </div>
              </article>
            ))}
          </div>

          {/* Demonstração prática dos badges semânticos */}
          <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-border-muted pt-5">
            <span className="inline-flex items-center gap-1.5 rounded-control bg-danger px-3 py-1 font-mono text-mono-badge font-semibold uppercase text-text-primary">
              <Heart className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
              REC • CURTIR (#D93848)
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-control bg-warning px-3 py-1 font-mono text-mono-badge font-semibold uppercase text-bg-deep">
              <Star className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
              JOGADA DA SEMANA (#E8B04B)
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-control border border-success bg-success-surface px-3 py-1 font-mono text-mono-badge font-semibold uppercase text-text-primary">
              LINK COPIADO PARA A ÁREA DE TRANSFERÊNCIA! (#2EB886)
            </span>
          </div>
        </section>

        {/* Tipografia em Modo Híbrido: Bebas Neue + JetBrains Mono */}
        <section
          aria-labelledby="heading-typography"
          className="grid grid-cols-1 gap-6 lg:grid-cols-2"
        >
          <article className="rounded-bento border-[1.5px] border-border-muted bg-bg-surface p-6">
            <div className="mb-4 flex items-center gap-3">
              <Type className="h-5 w-5 text-success" aria-hidden="true" />
              <h2
                id="heading-typography"
                className="font-display text-display-md uppercase tracking-[0.06em] text-text-primary"
              >
                BEBAS NEUE — DISPLAY & CTAS PRINCIPAIS
              </h2>
            </div>
            <p className="mb-4 font-mono text-mono-meta text-text-secondary">
              Variável CSS: <code className="text-text-primary">--font-bebas-neue</code> • Uppercase
              obrigatório • Letter-spacing <code className="text-text-primary">0.06em</code>
            </p>
            <div className="space-y-3 rounded-card border border-border-muted bg-bg-deep p-4">
              <div>
                <span className="font-mono text-mono-badge text-text-muted">
                  display-hero (36px)
                </span>
                <p className="font-display text-display-hero uppercase tracking-[0.06em] text-text-primary">
                  CLUTCH 1V4 DE AWP NA MIRAGE
                </p>
              </div>
              <div>
                <span className="font-mono text-mono-badge text-text-muted">display-lg (26px)</span>
                <p className="font-display text-display-lg uppercase tracking-[0.06em] text-text-primary">
                  HERO PLAYER EM FORMATO &quot;L&quot;
                </p>
              </div>
              <div>
                <span className="font-mono text-mono-badge text-text-muted">display-md (20px)</span>
                <p className="font-display text-display-md uppercase tracking-[0.06em] text-text-primary">
                  NA FILA / RECENTES • COLEÇÕES EM LEQUE
                </p>
              </div>
            </div>
          </article>

          <article className="rounded-bento border-[1.5px] border-border-muted bg-bg-surface p-6">
            <div className="mb-4 flex items-center gap-3">
              <Terminal className="h-5 w-5 text-warning" aria-hidden="true" />
              <h2 className="font-display text-display-md uppercase tracking-[0.06em] text-text-primary">
                JETBRAINS MONO — CORPO, METADADOS & FILTROS
              </h2>
            </div>
            <p className="mb-4 font-mono text-mono-meta text-text-secondary">
              Variável CSS: <code className="text-text-primary">--font-jetbrains-mono</code> • Base{' '}
              <code className="text-text-primary">13px (0.8125rem)</code>
            </p>
            <div className="space-y-4 rounded-card border border-border-muted bg-bg-deep p-4">
              <div>
                <span className="font-mono text-mono-badge text-text-muted">
                  mono-body (13px) — Corpo de texto
                </span>
                <p className="mt-1 font-mono text-mono-body text-text-primary">
                  Upload direto para o Cloudflare R2 via Presigned PUT URL com captura automática de
                  frame em WebP no cliente.
                </p>
              </div>
              <div>
                <span className="font-mono text-mono-badge text-text-muted">
                  mono-badge (11px) — Metadados Técnicos do Clipe
                </span>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className="rounded-control border border-border-muted bg-bg-surface px-2.5 py-1 font-mono text-mono-badge text-text-primary">
                    1080P
                  </span>
                  <span className="rounded-control border border-border-muted bg-bg-surface px-2.5 py-1 font-mono text-mono-badge text-text-primary">
                    60 FPS
                  </span>
                  <span className="rounded-control border border-border-muted bg-bg-surface px-2.5 py-1 font-mono text-mono-badge text-text-primary">
                    H.264 • MP4
                  </span>
                  <span className="rounded-control border border-border-muted bg-bg-surface px-2.5 py-1 font-mono text-mono-badge text-success">
                    00:34 • 46.0 MB
                  </span>
                </div>
              </div>
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}
