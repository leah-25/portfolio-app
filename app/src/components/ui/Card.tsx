import type { HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Adds slightly more padding — good for KPI cards */
  padded?: boolean;
  /** Subtle hover lift animation */
  hoverable?: boolean;
}

export default function Card({
  padded = true,
  hoverable = false,
  children,
  className = '',
  ...rest
}: CardProps) {
  return (
    <div
      className={[
        'rounded-card bg-surface-raised border border-surface-border shadow-card',
        padded ? 'p-5' : '',
        hoverable ? 'transition-shadow hover:shadow-card-hover cursor-pointer' : '',
        className,
      ].join(' ')}
      {...rest}
    >
      {children}
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

interface CardHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function CardHeader({ title, subtitle, actions }: CardHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4 mb-4">
      <div>
        <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
        {subtitle && <p className="text-xs text-text-muted mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
    </div>
  );
}
