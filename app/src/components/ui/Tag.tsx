// ── Tag — content label / filter chip ────────────────────────────────────────
// Use for: holding symbols, topics, sectors, filter pills
// Not for: status indicators (use Badge for that)

type TagSize = 'xs' | 'sm';

interface TagProps {
  children: React.ReactNode;
  size?: TagSize;
  /** Makes the tag act as a toggle button */
  active?: boolean;
  onClick?: () => void;
  /** Show remove (×) button */
  onRemove?: () => void;
  className?: string;
}

const SIZE_CLASSES: Record<TagSize, string> = {
  xs: 'px-1.5 py-0.5 text-2xs gap-1',
  sm: 'px-2   py-1   text-xs  gap-1.5',
};

export default function Tag({
  children,
  size = 'sm',
  active = false,
  onClick,
  onRemove,
  className = '',
}: TagProps) {
  const interactive = !!onClick || !!onRemove;

  return (
    <span
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
      className={[
        'inline-flex items-center rounded-md font-medium border transition-colors',
        SIZE_CLASSES[size],
        active
          ? 'bg-accent-subtle text-accent border-accent-border/40'
          : 'bg-surface-overlay text-text-secondary border-surface-border',
        interactive && !active
          ? 'cursor-pointer hover:bg-surface-raised hover:text-text-primary hover:border-surface-muted'
          : '',
        interactive && active
          ? 'cursor-pointer hover:bg-accent-muted/50'
          : '',
        className,
      ].join(' ')}
    >
      {children}
      {onRemove && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="ml-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-sm text-current opacity-60 hover:opacity-100 transition-opacity"
          aria-label="Remove"
        >
          ×
        </button>
      )}
    </span>
  );
}
