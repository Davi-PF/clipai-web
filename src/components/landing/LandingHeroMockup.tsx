'use client';

import { useState } from 'react';
import { Activity, Eye, Gamepad2, Heart, Play, Star } from 'lucide-react';
import { DiscordBadge } from '@/components/ui/DiscordBadge';

interface ShowcaseClip {
  id: string;
  tabLabel: string;
  game: string;
  title: string;
  authorName: string;
  discordHandle: string;
  resolution: string;
  duration: string;
  views: string;
  likes: string;
  retentionAvg: string;
  dropLabel: string;
  curvePath: string;
  areaPath: string;
}

const SHOWCASE_CLIPS: readonly ShowcaseClip[] = [
  {
    id: 'cs2',
    tabLabel: 'CS2 • Clutch 1v4',
    game: 'COUNTER-STRIKE 2',
    title: 'CLUTCH 1V4 DE AWP NA MIRAGE (OT)',
    authorName: 'FalleN',
    discordHandle: 'fallen_br',
    resolution: '1080P • 60FPS',
    duration: '00:34',
    views: '1.8k views',
    likes: '312',
    retentionAvg: '82%',
    dropLabel: 'Maior queda nos 70%',
    curvePath: 'M 0 12 L 36 16 L 72 20 L 108 24 L 144 30 L 180 34 L 216 46 L 252 50 L 288 54',
    areaPath:
      'M 0 12 L 36 16 L 72 20 L 108 24 L 144 30 L 180 34 L 216 46 L 252 50 L 288 54 L 288 80 L 0 80 Z',
  },
  {
    id: 'val',
    tabLabel: 'Valorant • Ace',
    game: 'VALORANT',
    title: 'ACE DE VANDAL NO BOMBSITE A — ASCENT',
    authorName: 'aspas_br',
    discordHandle: 'aspas_gg',
    resolution: '1440P • 60FPS',
    duration: '00:26',
    views: '2.4k views',
    likes: '485',
    retentionAvg: '88%',
    dropLabel: 'Maior queda nos 80%',
    curvePath: 'M 0 10 L 36 12 L 72 15 L 108 18 L 144 20 L 180 24 L 216 28 L 252 38 L 288 42',
    areaPath:
      'M 0 10 L 36 12 L 72 15 L 108 18 L 144 20 L 180 24 L 216 28 L 252 38 L 288 42 L 288 80 L 0 80 Z',
  },
] as const;

const MINI_FILTERS = ['CS2', 'Valorant', '#clutch', '#awp', '#ace', 'Em Alta'] as const;

export function LandingHeroMockup() {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const clip = SHOWCASE_CLIPS[selectedIndex] ?? SHOWCASE_CLIPS[0]!;

  return (
    <div
      data-testid="landing-hero-mockup"
      className="relative rounded-bento border-[1.5px] border-border-muted bg-bg-surface p-4 shadow-2xl sm:p-5"
    >
      {/* Seletor interativo de demonstração */}
      <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-control bg-danger px-2 py-0.5 font-mono text-mono-badge font-bold uppercase text-text-primary">
            <span
              aria-hidden="true"
              className="h-2 w-2 animate-pulse rounded-full bg-text-primary"
            />
            <span>REC</span>
          </span>
          <span className="inline-flex items-center gap-1 rounded-control bg-warning px-2 py-0.5 font-mono text-mono-badge font-bold uppercase text-bg-deep">
            <Star className="h-3 w-3 fill-current" aria-hidden="true" />
            JOGADA DA SEMANA
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {SHOWCASE_CLIPS.map((item, idx) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={idx === selectedIndex}
              onClick={() => setSelectedIndex(idx)}
              className={`rounded-control border px-2.5 py-1 font-mono text-mono-badge transition-colors ${
                idx === selectedIndex
                  ? 'border-success bg-bg-deep text-success'
                  : 'border-border-muted bg-bg-elevated text-text-secondary hover:text-text-primary'
              }`}
            >
              {item.tabLabel}
            </button>
          ))}
        </div>
      </div>

      {/* Superfície Bento Player simulado */}
      <div className="relative overflow-hidden rounded-card border-[1.5px] border-border-muted bg-bg-deep">
        <div className="relative flex min-h-[210px] flex-col justify-between gap-2 p-3 sm:aspect-video sm:min-h-0 sm:p-4">
          {/* Grade tática sutil no fundo do player */}
          <svg
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 h-full w-full opacity-25"
          >
            <defs>
              <pattern id="clipaiMockGrid" width="28" height="28" patternUnits="userSpaceOnUse">
                <path d="M 28 0 L 0 0 0 28" fill="none" stroke="#4F6478" strokeWidth="0.7" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#clipaiMockGrid)" />
          </svg>

          {/* Metadados técnicos no topo */}
          <div className="relative z-10 flex flex-wrap items-center justify-between gap-2">
            <span className="inline-flex max-w-full min-w-0 items-center gap-1.5 rounded-control border border-border-muted bg-bg-surface/90 px-2.5 py-0.5 font-mono text-mono-badge uppercase text-success">
              <Gamepad2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate">{clip.game}</span>
            </span>
            <span className="shrink-0 rounded-control border border-border-muted bg-bg-surface/90 px-2 py-0.5 font-mono text-mono-badge text-text-primary">
              {clip.resolution}
            </span>
          </div>

          {/* Botão play central decorativo */}
          <div className="relative z-10 flex flex-col items-center justify-center gap-1.5 py-1 sm:gap-2 sm:py-2">
            <span className="flex h-11 w-11 items-center justify-center rounded-full border-[1.5px] border-success bg-bg-surface/90 text-success shadow-lg sm:h-14 sm:w-14">
              <Play
                className="ml-0.5 h-5 w-5 fill-current sm:ml-1 sm:h-6 sm:w-6"
                aria-hidden="true"
              />
            </span>
            <span className="max-w-full truncate rounded-control bg-bg-surface/90 px-2.5 py-0.5 font-mono text-mono-badge text-text-secondary">
              clipai.com.br/c/xK9mP2qR • {clip.duration}
            </span>
          </div>

          {/* Barra de progresso do player */}
          <div className="relative z-10 space-y-1.5">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-bg-surface">
              <div className="h-full w-2/3 rounded-full bg-success" />
            </div>
            <div className="flex items-center justify-between font-mono text-mono-badge text-text-muted">
              <span>00:22 / {clip.duration}</span>
              <span className="flex items-center gap-2.5">
                <span className="inline-flex items-center gap-1 text-text-secondary">
                  <Eye className="h-3 w-3" aria-hidden="true" />
                  {clip.views}
                </span>
                <span className="inline-flex items-center gap-1 text-danger-text">
                  <Heart className="h-3 w-3 fill-current" aria-hidden="true" />
                  {clip.likes}
                </span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Base em L: Título + Discord Badge à esquerda | Mini-curva de Retenção & Filtros à direita */}
      <div className="mt-4 grid grid-cols-1 gap-3.5 sm:grid-cols-[minmax(0,1fr)_210px]">
        <div className="flex flex-col justify-between gap-3 rounded-card border border-border-muted bg-bg-deep p-3.5">
          <div className="space-y-1.5">
            <p className="font-display text-display-md uppercase tracking-[0.06em] text-text-primary">
              {clip.title}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-mono-badge text-text-secondary">
                por <strong className="text-text-primary">{clip.authorName}</strong>
              </span>
              <DiscordBadge discordUsername={clip.discordHandle} />
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {MINI_FILTERS.map((tag, idx) => (
              <span
                key={tag}
                className={`rounded-control border px-2 py-0.5 font-mono text-mono-badge ${
                  idx === 0
                    ? 'border-success bg-bg-surface text-success'
                    : 'border-border-muted bg-bg-elevated/60 text-text-secondary'
                }`}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Mini-card da Curva de Retenção do Estúdio */}
        <div className="flex flex-col justify-between rounded-card border border-border-muted bg-bg-deep p-3.5">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1 font-mono text-mono-badge uppercase text-text-secondary">
              <Activity className="h-3.5 w-3.5 text-success" aria-hidden="true" />
              Retenção
            </span>
            <span className="font-display text-display-md text-success">{clip.retentionAvg}</span>
          </div>

          <svg
            viewBox="0 0 288 80"
            className="my-2 h-14 w-full overflow-visible"
            role="img"
            aria-label="Prévia da curva de retenção do clipe"
          >
            <defs>
              <linearGradient id="landingRetentionGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2EB886" stopOpacity={0.45} />
                <stop offset="95%" stopColor="#2EB886" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <path d={clip.areaPath} fill="url(#landingRetentionGrad)" />
            <path d={clip.curvePath} fill="none" stroke="#2EB886" strokeWidth="2.5" />
          </svg>

          <span className="inline-flex items-center justify-center rounded-control border border-warning bg-bg-surface px-2 py-0.5 font-mono text-[10px] font-semibold text-warning">
            {clip.dropLabel}
          </span>
        </div>
      </div>
    </div>
  );
}
