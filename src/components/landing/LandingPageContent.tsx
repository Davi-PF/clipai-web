'use client';

import Link from 'next/link';
import {
  Activity,
  ArrowRight,
  BarChart3,
  CloudUpload,
  Film,
  FolderKanban,
  Lock,
  Share2,
  ShieldCheck,
} from 'lucide-react';
import { LandingHeroMockup } from '@/components/landing/LandingHeroMockup';
import { LandingNavbar } from '@/components/landing/LandingNavbar';
import { Button } from '@/components/ui/Button';
import { DiscordIcon } from '@/components/ui/DiscordBadge';
import { useAuth } from '@/hooks/useAuth';

interface FeatureItem {
  title: string;
  description: string;
  badge: string;
  Icon: typeof CloudUpload;
}

const FEATURES: readonly FeatureItem[] = [
  {
    title: 'UPLOAD DIRETO SEM GARGALO',
    description:
      'Envie seus arquivos MP4 ou WebM de até 100 MB direto do navegador para a nuvem com barra de progresso real e geração automática de capa em WebP.',
    badge: 'ATÉ 100 MB • 120S',
    Icon: CloudUpload,
  },
  {
    title: 'PRIVACIDADE NO SEU CONTROLE',
    description:
      'Escolha entre Público, Só Amigos ou Não-listado e compartilhe links curtos e limpos (/c/slug) com preview pronto para a call do Discord.',
    badge: 'LINKS /C/[SLUG]',
    Icon: Lock,
  },
  {
    title: 'ESTÚDIO DE RETENÇÃO',
    description:
      'Descubra em qual segundo a galera para de assistir sua jogada com curva de retenção trecho a trecho (0% a 100%) e insights automáticos.',
    badge: 'CURVA 0% → 100%',
    Icon: BarChart3,
  },
  {
    title: 'DISCORD + 2FA INTEGRADOS',
    description:
      'Entre em um clique com sua conta do Discord, puxe seu avatar automaticamente, exiba selo verificado e proteja sua conta com Authenticator TOTP.',
    badge: 'OAUTH2 + TOTP',
    Icon: ShieldCheck,
  },
] as const;

interface StepItem {
  number: string;
  title: string;
  description: string;
  Icon: typeof CloudUpload;
}

const HOW_IT_WORKS_STEPS: readonly StepItem[] = [
  {
    number: '01',
    title: 'ENVIE O CLIPE',
    description:
      'Arraste sua jogada em MP4 ou WebM. Extraímos resolução, duração e thumbnail automaticamente antes de publicar.',
    Icon: CloudUpload,
  },
  {
    number: '02',
    title: 'ORGANIZE EM COLEÇÕES',
    description:
      'Agrupe clutches, aces e momentos épicos por jogo, tags táticas e playlists em leque para encontrar tudo em segundos.',
    Icon: FolderKanban,
  },
  {
    number: '03',
    title: 'MANDE NA CALL E ACOMPANHE AS ANÁLISES',
    description:
      'Copie o link curto para o Discord e abra o Estúdio do Criador para ver visualizações diárias, conclusão e curva de retenção.',
    Icon: Share2,
  },
] as const;

export function LandingPageContent() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="flex min-h-screen flex-col bg-bg-deep text-text-primary">
      <LandingNavbar />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="border-b border-border-muted px-4 py-14 md:px-8 lg:py-20">
          <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.08fr)]">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-control border border-border-muted bg-bg-surface px-3 py-1.5 font-mono text-mono-badge font-semibold uppercase text-success">
                <span className="h-2 w-2 animate-pulse rounded-full bg-success" aria-hidden="true" />
                <span>FEITO PARA A CALL • ARMAZENAMENTO EM NUVEM</span>
              </div>

              <h1 className="font-display text-[3rem] uppercase leading-[0.98] tracking-[0.06em] text-text-primary sm:text-[3.75rem]">
                SUAS MELHORES JOGADAS. <span className="text-success">SALVAS EM SEGUNDOS.</span>
              </h1>

              <p className="max-w-xl font-mono text-mono-body leading-relaxed text-text-secondary">
                Upload direto para a nuvem de até 100 MB, links limpos prontos para o Discord,
                coleções organizadas para a sua squad e um Estúdio de Criador com curva de retenção
                real para cada clipe.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <Link href={isAuthenticated ? '/dashboard' : '/register'}>
                  <Button
                    type="button"
                    variant="primary"
                    size="lg"
                    rightIcon={<ArrowRight className="h-4 w-4" />}
                  >
                    {isAuthenticated ? 'ABRIR DASHBOARD' : 'COMEÇAR GRÁTIS'}
                  </Button>
                </Link>

                <Link href="/login">
                  <Button
                    type="button"
                    variant="secondary"
                    size="lg"
                    typography="display"
                    leftIcon={<DiscordIcon className="h-4 w-4 text-success" />}
                    className="border-border-muted bg-bg-surface text-text-primary hover:border-success"
                  >
                    ENTRAR COM DISCORD
                  </Button>
                </Link>
              </div>

              <div className="flex flex-wrap items-center gap-4 border-t border-border-muted pt-5 font-mono text-mono-badge text-text-muted">
                <span>✓ MP4 e WebM até 100 MB</span>
                <span>✓ Sem marca d&apos;água</span>
                <span>✓ 2FA Authenticator integrado</span>
              </div>
            </div>

            {/* Showcase visual interativo do produto */}
            <LandingHeroMockup />
          </div>
        </section>

        {/* Seção de Recursos (Bento Grid 2x2) */}
        <section id="recursos" className="border-b border-border-muted px-4 py-16 md:px-8">
          <div className="mx-auto max-w-7xl space-y-10">
            <div className="max-w-2xl space-y-2">
              <span className="font-mono text-mono-badge font-semibold uppercase text-success">
                RECURSOS DO CLIPAÍ
              </span>
              <h2 className="font-display text-display-hero uppercase tracking-[0.06em] text-text-primary">
                CONSTRUÍDO COMO UM ESTÚDIO TÁTICO DE REPLAY
              </h2>
              <p className="font-mono text-mono-body text-text-secondary">
                Tudo o que você precisa para guardar, organizar e analisar seus highlights sem
                perder qualidade nem tempo.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              {FEATURES.map(({ title, description, badge, Icon }) => (
                <article
                  key={title}
                  className="flex flex-col justify-between gap-4 rounded-bento border-[1.5px] border-border-muted bg-bg-surface p-6 transition-colors hover:border-success"
                >
                  <div className="flex items-start justify-between gap-4">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-card border border-border-muted bg-bg-deep">
                      <Icon className="h-5 w-5 text-success" aria-hidden="true" />
                    </span>
                    <span className="rounded-control border border-border-muted bg-bg-deep px-2.5 py-1 font-mono text-mono-badge uppercase text-warning">
                      {badge}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <h3 className="font-display text-display-lg uppercase tracking-[0.06em] text-text-primary">
                      {title}
                    </h3>
                    <p className="font-mono text-mono-body text-text-secondary">{description}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Seção Estúdio do Criador */}
        <section id="estudio" className="border-b border-border-muted px-4 py-16 md:px-8">
          <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-8 rounded-bento border-[1.5px] border-border-muted bg-bg-surface p-6 md:p-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
            <div className="space-y-4">
              <span className="inline-flex items-center gap-1.5 rounded-control border border-success bg-bg-deep px-2.5 py-1 font-mono text-mono-badge font-semibold uppercase text-success">
                <Activity className="h-3.5 w-3.5" aria-hidden="true" />
                ESTÚDIO DO CRIADOR
              </span>
              <h2 className="font-display text-display-hero uppercase tracking-[0.06em] text-text-primary">
                SAIBA O SEGUNDO EXATO EM QUE SUA JOGADA PRENDE A GALERA
              </h2>
              <p className="font-mono text-mono-body text-text-secondary">
                No Estúdio do CLIPAÍ, cada visualização registra telemetria real de progresso sem
                pesar no player. Compare visualizações por período, taxa de conclusão e o ponto de
                maior queda em cada clipe.
              </p>
              <div className="pt-2">
                <Link href={isAuthenticated ? '/studio' : '/register'}>
                  <Button
                    type="button"
                    variant="primary"
                    rightIcon={<ArrowRight className="h-4 w-4" />}
                  >
                    {isAuthenticated ? 'ABRIR MEU ESTÚDIO' : 'CONHECER O ESTÚDIO'}
                  </Button>
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              <div className="rounded-card border border-border-muted bg-bg-deep p-4">
                <span className="font-mono text-mono-badge uppercase text-text-muted">
                  RETENÇÃO MÉDIA
                </span>
                <p className="mt-2 font-display text-display-hero text-success">78.4%</p>
                <p className="mt-1 font-mono text-mono-badge text-text-secondary">
                  Curva detalhada 0% → 100%
                </p>
              </div>
              <div className="rounded-card border border-border-muted bg-bg-deep p-4">
                <span className="font-mono text-mono-badge uppercase text-text-muted">
                  TAXA DE CONCLUSÃO
                </span>
                <p className="mt-2 font-display text-display-hero text-text-primary">64.2%</p>
                <p className="mt-1 font-mono text-mono-badge text-text-secondary">
                  Assistiram até o fim
                </p>
              </div>
              <div className="col-span-2 rounded-card border border-border-muted bg-bg-deep p-4">
                <div className="flex items-center justify-between font-mono text-mono-badge">
                  <span className="text-text-secondary">INSIGHT AUTOMÁTICO DE QUEDA</span>
                  <span className="font-semibold text-warning">Maior queda nos 40%</span>
                </div>
                <div className="mt-3 grid grid-cols-10 gap-1.5">
                  {[100, 96, 92, 88, 70, 68, 66, 65, 64, 62].map((heightPct, idx) => (
                    <div
                      key={idx}
                      className="flex h-14 items-end rounded-[4px] bg-bg-surface p-0.5"
                    >
                      <div
                        style={{ height: `${heightPct}%` }}
                        className={`w-full rounded-[3px] ${
                          idx === 4 ? 'bg-warning' : 'bg-success'
                        }`}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Seção Como Funciona (3 etapas numeradas 01, 02, 03) */}
        <section id="como-funciona" className="border-b border-border-muted px-4 py-16 md:px-8">
          <div className="mx-auto max-w-7xl space-y-10">
            <div className="max-w-2xl space-y-2">
              <span className="font-mono text-mono-badge font-semibold uppercase text-success">
                COMO FUNCIONA
              </span>
              <h2 className="font-display text-display-hero uppercase tracking-[0.06em] text-text-primary">
                DO REPLAY AO LINK NA CALL EM 3 PASSOS
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
              {HOW_IT_WORKS_STEPS.map(({ number, title, description, Icon }) => (
                <article
                  key={number}
                  className="flex flex-col justify-between gap-5 rounded-bento border-[1.5px] border-border-muted bg-bg-surface p-6"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-display text-display-hero tracking-[0.06em] text-success">
                      {number}
                    </span>
                    <span className="flex h-10 w-10 items-center justify-center rounded-card border border-border-muted bg-bg-deep">
                      <Icon className="h-5 w-5 text-text-primary" aria-hidden="true" />
                    </span>
                  </div>

                  <div className="space-y-2">
                    <h3 className="font-display text-display-md uppercase tracking-[0.06em] text-text-primary">
                      {title}
                    </h3>
                    <p className="font-mono text-mono-meta text-text-secondary">{description}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Final */}
        <section className="px-4 py-16 md:px-8">
          <div className="mx-auto flex max-w-5xl flex-col items-center gap-5 rounded-bento border-[1.5px] border-success bg-bg-surface px-6 py-12 text-center md:px-12">
            <span className="rounded-control bg-warning px-2.5 py-0.5 font-mono text-mono-badge font-bold uppercase text-bg-deep">
              ACESSO GRATUITO NA BETA
            </span>
            <h2 className="font-display text-display-hero uppercase tracking-[0.06em] text-text-primary sm:text-[2.75rem]">
              PRONTO PARA GUARDAR SUAS MELHORES JOGADAS?
            </h2>
            <p className="max-w-xl font-mono text-mono-body text-text-secondary">
              Crie sua conta em menos de 1 minuto ou conecte seu Discord para começar a subir seus
              clipes agora mesmo.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
              <Link href={isAuthenticated ? '/dashboard' : '/register'}>
                <Button type="button" variant="primary" size="lg">
                  {isAuthenticated ? 'IR PARA MEUS CLIPES' : 'CRIAR MINHA CONTA GRÁTIS'}
                </Button>
              </Link>
              <Link href="/login">
                <Button type="button" variant="secondary" size="lg">
                  Já tenho conta
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer minimalista */}
      <footer className="border-t border-border-muted bg-bg-surface px-4 py-8 md:px-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-control border border-border-muted bg-bg-deep">
              <Film className="h-4 w-4 text-success" aria-hidden="true" />
            </span>
            <span className="font-display text-display-md uppercase tracking-[0.06em] text-text-primary">
              CLIPAÍ
            </span>
            <span className="rounded-control bg-warning px-2 py-0.5 font-mono text-mono-badge font-bold uppercase text-bg-deep">
              BETA
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-5 font-mono text-mono-badge text-text-secondary">
            <Link href="/login" className="transition-colors hover:text-success">
              Entrar
            </Link>
            <Link href="/register" className="transition-colors hover:text-success">
              Criar conta
            </Link>
            <Link href="/dashboard" className="transition-colors hover:text-success">
              Dashboard
            </Link>
            <Link href="/studio" className="transition-colors hover:text-success">
              Estúdio
            </Link>
          </div>

          <p className="font-mono text-mono-badge text-text-muted">
            CLIPAÍ Beta • Feito para a comunidade gamer brasileira
          </p>
        </div>
      </footer>
    </div>
  );
}
