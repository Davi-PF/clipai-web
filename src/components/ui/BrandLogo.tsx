export type BrandLogoVariant = 'icon' | 'horizontal' | 'stacked';
export type BrandLogoSize = 'xs' | 'sm' | 'md' | 'lg';

export interface BrandLogoProps {
  variant?: BrandLogoVariant;
  size?: BrandLogoSize;
  showBeta?: boolean;
  betaClassName?: string;
  iconClassName?: string;
  className?: string;
}

const HORIZONTAL_ICON_SIZES: Record<BrandLogoSize, string> = {
  xs: 'h-6 w-6',
  sm: 'h-8 w-8',
  md: 'h-9 w-9',
  lg: 'h-11 w-11',
};

const STACKED_ICON_SIZES: Record<BrandLogoSize, string> = {
  xs: 'h-10 w-10',
  sm: 'h-14 w-14',
  md: 'h-20 w-20',
  lg: 'h-24 w-24',
};

const WORDMARK_SIZES: Record<BrandLogoSize, string> = {
  xs: 'text-[1.125rem]',
  sm: 'text-display-md',
  md: 'text-display-lg',
  lg: 'text-display-hero',
};

const STACKED_WORDMARK_SIZES: Record<BrandLogoSize, string> = {
  xs: 'text-display-md',
  sm: 'text-display-lg',
  md: 'text-display-hero',
  lg: 'text-[2.75rem]',
};

function BrandEmblemSvg({
  className,
  decorative,
}: Readonly<{
  className: string;
  decorative: boolean;
}>) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role={decorative ? undefined : 'img'}
      aria-label={decorative ? undefined : 'Logo CLIPAÍ'}
      aria-hidden={decorative ? 'true' : undefined}
      data-testid="brand-logo-svg"
      className={`shrink-0 ${className}`}
    >
      {/* Moldura de recorte de câmera (azul-ardósia / --border-muted) */}
      <path
        d="M 32 14 L 91 14 L 91 44 L 84 44 L 84 21 L 44 21 Z"
        fill="var(--border-muted, #4F6478)"
        data-testid="brand-logo-frame-top"
      />
      <path
        d="M 84 63 L 91 63 L 91 92 L 42 92 L 52 85 L 84 85 Z"
        fill="var(--border-muted, #4F6478)"
        data-testid="brand-logo-frame-bottom"
      />

      {/* Ponto vermelho REC no canto superior direito */}
      <circle
        cx="71.5"
        cy="31.5"
        r="6.2"
        fill="var(--color-danger-primary, #D93848)"
        data-testid="brand-logo-rec-dot"
      />

      {/* Fita clara externa do símbolo Play */}
      <path
        d="M 12 9 L 88 52 L 75 52 L 19 20.5 L 19 77 L 24 73.5 L 24 81.5 L 12 89 Z"
        fill="var(--text-primary, #B7C7D6)"
        data-testid="brand-logo-play-light-outer"
      />

      {/* Fita verde entrelaçada (#2EB886) do símbolo Play */}
      <path
        d="M 27.5 30.5 L 66 52.2 L 53.5 52.2 L 34.5 41.5 L 34.5 81.5 L 75.5 52 L 88 52 L 27.5 95 Z"
        fill="var(--color-success-primary, #2EB886)"
        data-testid="brand-logo-play-green"
      />

      {/* Fita clara interna concluindo o entrelaçamento */}
      <path
        d="M 38.5 63 L 54.5 51.6 L 66 52.2 L 38.5 71.5 Z"
        fill="var(--text-primary, #B7C7D6)"
        data-testid="brand-logo-play-light-inner"
      />
    </svg>
  );
}

export function BrandLogo({
  variant = 'horizontal',
  size = 'md',
  showBeta = false,
  betaClassName = '',
  iconClassName = '',
  className = '',
}: Readonly<BrandLogoProps>) {
  if (variant === 'icon') {
    return (
      <span
        data-testid="brand-logo"
        data-variant="icon"
        className={`inline-flex shrink-0 items-center justify-center ${className}`}
      >
        <BrandEmblemSvg
          decorative={false}
          className={`${HORIZONTAL_ICON_SIZES[size]} ${iconClassName}`}
        />
      </span>
    );
  }

  if (variant === 'stacked') {
    return (
      <span
        data-testid="brand-logo"
        data-variant="stacked"
        className={`inline-flex flex-col items-center gap-2.5 ${className}`}
      >
        <BrandEmblemSvg decorative className={`${STACKED_ICON_SIZES[size]} ${iconClassName}`} />
        <span className="inline-flex items-center gap-2">
          <span
            className={`font-display uppercase leading-none tracking-[0.06em] ${STACKED_WORDMARK_SIZES[size]}`}
          >
            <span className="text-text-primary">CLIP</span>
            <span className="text-success">AÍ</span>
          </span>
          {showBeta && (
            <span
              className={`rounded-control bg-warning px-1.5 py-0.5 font-mono text-mono-badge font-bold uppercase text-bg-deep ${betaClassName}`}
            >
              BETA
            </span>
          )}
        </span>
      </span>
    );
  }

  return (
    <span
      data-testid="brand-logo"
      data-variant="horizontal"
      className={`inline-flex shrink-0 items-center gap-2 ${className}`}
    >
      <BrandEmblemSvg decorative className={`${HORIZONTAL_ICON_SIZES[size]} ${iconClassName}`} />
      <span
        className={`font-display uppercase leading-none tracking-[0.06em] ${WORDMARK_SIZES[size]}`}
      >
        <span className="text-text-primary">CLIP</span>
        <span className="text-success">AÍ</span>
      </span>
      {showBeta && (
        <span
          className={`rounded-control bg-warning px-1.5 py-0.5 font-mono text-mono-badge font-bold uppercase text-bg-deep ${betaClassName}`}
        >
          BETA
        </span>
      )}
    </span>
  );
}
