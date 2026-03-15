import type { HTMLAttributes } from 'react';

// ── Variants ─────────────────────────────────────────────────────────────────
type CardVariant =
  | 'default'  // surface-raised bg, border, shadow
  | 'flat'     // no shadow, just border — for nested/tight layouts
  | 'inset'    // slightly sunken appearance — for sub-panels within cards
  | 'ghost';   // no bg, no shadow — invisible container with padding

const VARIANT_CLASSES: Record<CardVariant, string> = {
  default: 'bg-surface-raised border border-surface-border shadow-card',
  flat:    'bg-surface-raised border border-surface-border',
  inset:   'bg-surface border border-surface-border',
  ghost:   '',
};

// ── Card ─────────────────────────────────────────────────────────────────────

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hoverable?: boolean;
}

const PADDING_CLASSES = {
  none: '',
  sm:   'p-3',
  md:   'p-5',
  lg:   'p-6',
};

export default function Card({
  variant = 'default',
  padding = 'md',
  hoverable = false,
  children,
  className = '',
  ...rest
}: CardProps) {
  return (
    <div
      className={[
        'rounded-card',
        VARIANT_CLASSES[variant],
        PADDING_CLASSES[padding],
        hoverable
          ? 'cursor-pointer transition-shadow duration-150 hover:shadow-card-md hover:border-surface-muted'
          : '',
        className,
      ].join(' ')}
      {...rest}
    >
      {children}
    </div>
  );
}

// ── CardHeader ────────────────────────────────────────────────────────────────

interface CardHeaderProps {
  title: string;
  subtitle?: string;
  /** Right-side slot — buttons, badges, etc. */
  actions?: React.ReactNode;
  /** If inside a Card with padding=none, add internal padding */
  padded?: boolean;
}

export function CardHeader({ title, subtitle, actions, padded = false }: CardHeaderProps) {
  return (
    <div className={[
      'flex items-start justify-between gap-4',
      padded ? 'px-5 pt-5' : '',
      subtitle ? 'mb-4' : 'mb-3',
    ].join(' ')}>
      <div className="min-w-0">
        <h3 className="text-sm font-semibold text-text-primary leading-snug">{title}</h3>
        {subtitle && (
          <p className="mt-0.5 text-xs text-text-muted leading-snug">{subtitle}</p>
        )}
      </div>
      {actions && (
        <div className="flex flex-shrink-0 items-center gap-2">{actions}</div>
      )}
    </div>
  );
}

// ── CardDivider ───────────────────────────────────────────────────────────────

export function CardDivider() {
  return <div className="my-4 h-px bg-surface-border" />;
}

// ── CardFooter ────────────────────────────────────────────────────────────────

interface CardFooterProps {
  children: React.ReactNode;
  padded?: boolean;
}

export function CardFooter({ children, padded = false }: CardFooterProps) {
  return (
    <div className={[
      'flex items-center justify-between gap-3 mt-4 pt-4 border-t border-surface-border',
      padded ? 'px-5 pb-5' : '',
    ].join(' ')}>
      {children}
    </div>
  );
}
