type BadgeVariant = 'default' | 'gain' | 'loss' | 'warn' | 'accent' | 'muted';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  default: 'bg-surface-overlay text-text-secondary border border-surface-border',
  gain:    'bg-gain-subtle text-gain-text border border-gain/20',
  loss:    'bg-loss-subtle text-loss-text border border-loss/20',
  warn:    'bg-warn-subtle text-warn-text border border-warn/20',
  accent:  'bg-accent-subtle text-accent border border-accent/20',
  muted:   'bg-surface-overlay text-text-muted',
};

export default function Badge({ variant = 'default', children, className = '' }: BadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center rounded-full px-2 py-0.5 text-2xs font-medium',
        VARIANT_CLASSES[variant],
        className,
      ].join(' ')}
    >
      {children}
    </span>
  );
}
