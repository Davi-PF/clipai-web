'use client';

import { forwardRef, useId, useState, type InputHTMLAttributes, type ReactNode } from 'react';
import { AlertCircle, Eye, EyeOff } from 'lucide-react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string | null;
  leftIcon?: ReactNode;
  enablePasswordToggle?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    id,
    label,
    hint,
    error,
    leftIcon,
    type = 'text',
    enablePasswordToggle = true,
    className = '',
    disabled,
    ...rest
  },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;
  const hintId = `${inputId}-hint`;

  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const isPasswordField = type === 'password';
  const shouldRenderToggle = isPasswordField && enablePasswordToggle;
  const resolvedType = isPasswordField && isPasswordVisible ? 'text' : type;

  const hasError = Boolean(error);
  const borderClasses = hasError
    ? 'border-danger focus-within:border-danger'
    : 'border-border-muted focus-within:border-success';

  const describedBy = [hasError ? errorId : null, hint && !hasError ? hintId : null]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="block font-mono text-mono-meta font-medium text-text-secondary"
        >
          {label}
        </label>
      )}

      <div
        className={`flex h-11 items-center gap-2.5 rounded-control border bg-bg-elevated px-3 transition-colors duration-150 ${borderClasses} ${
          disabled ? 'cursor-not-allowed opacity-60' : ''
        }`}
      >
        {leftIcon && (
          <span className="inline-flex shrink-0 items-center text-text-muted" aria-hidden="true">
            {leftIcon}
          </span>
        )}

        <input
          ref={ref}
          id={inputId}
          type={resolvedType}
          disabled={disabled}
          aria-invalid={hasError}
          aria-describedby={describedBy || undefined}
          className={`h-full w-full bg-transparent font-mono text-mono-body text-text-primary placeholder:text-text-muted focus:outline-none disabled:cursor-not-allowed ${className}`.trim()}
          {...rest}
        />

        {shouldRenderToggle && (
          <button
            type="button"
            onClick={() => setIsPasswordVisible((prev) => !prev)}
            disabled={disabled}
            aria-label={isPasswordVisible ? 'Ocultar senha' : 'Mostrar senha'}
            className="inline-flex shrink-0 items-center justify-center rounded-control p-1 text-text-secondary transition-colors hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success"
          >
            {isPasswordVisible ? (
              <EyeOff className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Eye className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        )}
      </div>

      {hasError && (
        <p
          id={errorId}
          role="alert"
          className="flex items-start gap-1.5 font-mono text-mono-meta text-danger-text"
        >
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </p>
      )}

      {!hasError && hint && (
        <p id={hintId} className="font-mono text-mono-meta text-text-muted">
          {hint}
        </p>
      )}
    </div>
  );
});
