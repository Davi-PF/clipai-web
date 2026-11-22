import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';
export type ButtonTypography = 'hybrid' | 'display' | 'mono';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  typography?: ButtonTypography;
  isLoading?: boolean;
  loadingText?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'border border-success bg-success text-bg-deep hover:border-success-surface hover:bg-success-surface hover:text-text-primary focus-visible:ring-2 focus-visible:ring-success',
  secondary:
    'border border-border-muted bg-bg-elevated text-text-primary hover:border-text-secondary hover:bg-bg-surface focus-visible:ring-2 focus-visible:ring-border-muted',
  danger:
    'border border-danger bg-danger text-text-primary hover:border-danger-surface hover:bg-danger-surface focus-visible:ring-2 focus-visible:ring-danger',
  ghost:
    'border border-transparent bg-transparent text-text-secondary hover:bg-bg-elevated hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-muted',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'min-h-9 px-3.5 py-2 text-mono-meta',
  md: 'min-h-11 px-5 py-2.5',
  lg: 'min-h-12 px-6 py-3',
};

function resolveTypographyClass(variant: ButtonVariant, typography: ButtonTypography): string {
  if (typography === 'display') {
    return 'font-display text-display-cta uppercase tracking-[0.06em]';
  }
  if (typography === 'mono') {
    return 'font-mono text-mono-body font-medium';
  }
  if (variant === 'primary' || variant === 'danger') {
    return 'font-display text-display-cta uppercase tracking-[0.06em]';
  }
  return 'font-mono text-mono-body font-medium';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    typography = 'hybrid',
    isLoading = false,
    loadingText,
    leftIcon,
    rightIcon,
    fullWidth = false,
    disabled,
    className = '',
    type = 'button',
    children,
    ...rest
  },
  ref,
) {
  const isDisabled = Boolean(disabled || isLoading);
  const typographyClass = resolveTypographyClass(variant, typography);
  const widthClass = fullWidth ? 'w-full' : '';

  return (
    <button
      ref={ref}
      type={type}
      disabled={isDisabled}
      aria-busy={isLoading}
      className={`inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-control transition-colors duration-150 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-55 ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${typographyClass} ${widthClass} ${className}`.trim()}
      {...rest}
    >
      {isLoading ? (
        <>
          <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden="true" />
          <span>{loadingText ?? children}</span>
        </>
      ) : (
        <>
          {leftIcon && (
            <span className="inline-flex shrink-0 items-center" aria-hidden="true">
              {leftIcon}
            </span>
          )}
          <span>{children}</span>
          {rightIcon && (
            <span className="inline-flex shrink-0 items-center" aria-hidden="true">
              {rightIcon}
            </span>
          )}
        </>
      )}
    </button>
  );
});
