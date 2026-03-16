import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  Icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  /** Make the empty state fill its container and center vertically */
  fill?: boolean;
}

/**
 * Centered empty state — used when a list or table has no data.
 *
 * Usage:
 *   <EmptyState
 *     Icon={BookOpen}
 *     title="No research notes yet"
 *     description="Start by recording your first weekly note."
 *     action={<Button variant="primary" size="sm">Add note</Button>}
 *   />
 */
export default function EmptyState({
  Icon,
  title,
  description,
  action,
  fill = false,
}: EmptyStateProps) {
  return (
    <div
      className={[
        'flex flex-col items-center justify-center text-center px-6 py-16',
        fill ? 'h-full' : '',
      ].join(' ')}
    >
      {/* Icon container */}
      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-surface-border bg-surface-overlay">
        <Icon size={24} className="text-text-muted" strokeWidth={1.5} />
      </div>

      {/* Text */}
      <h3 className="text-sm font-semibold text-text-primary mb-1.5">{title}</h3>
      {description && (
        <p className="max-w-xs text-sm text-text-muted leading-relaxed mb-5">
          {description}
        </p>
      )}

      {/* CTA */}
      {action && <div>{action}</div>}
    </div>
  );
}
