import { Menu } from 'lucide-react';
import { useShell } from './ShellContext';

interface PageHeaderProps {
  /** Primary page title */
  title: string;
  /** Optional one-line description below the title */
  description?: string;
  /** Slot for buttons/actions — rendered on the right */
  actions?: React.ReactNode;
  /** Optional eyebrow label above the title */
  eyebrow?: string;
}

/**
 * Full-width page header rendered at the top of each feature page.
 * Includes the mobile hamburger, title, description, and actions slot.
 */
export default function PageHeader({
  title,
  description,
  actions,
  eyebrow,
}: PageHeaderProps) {
  const { openMobileNav } = useShell();

  return (
    <div className="border-b border-surface-border bg-surface-raised/40 px-6 py-5 md:px-8">
      <div className="flex items-start gap-4">
        {/* Mobile hamburger */}
        <button
          onClick={openMobileNav}
          className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md text-text-muted hover:bg-surface-overlay hover:text-text-secondary transition-colors md:hidden"
          aria-label="Open navigation"
        >
          <Menu size={18} />
        </button>

        {/* Title block */}
        <div className="flex-1 min-w-0">
          {eyebrow && (
            <p className="text-2xs font-semibold uppercase tracking-widest text-text-muted mb-1">
              {eyebrow}
            </p>
          )}
          <h1 className="text-xl font-semibold tracking-tight text-text-primary leading-tight">
            {title}
          </h1>
          {description && (
            <p className="mt-1 text-sm text-text-muted leading-snug">
              {description}
            </p>
          )}
        </div>

        {/* Actions */}
        {actions && (
          <div className="flex items-center gap-2 flex-shrink-0 pt-0.5">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
