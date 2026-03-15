interface PageContainerProps {
  children: React.ReactNode;
  /** If true, removes horizontal padding — for full-bleed tables */
  flush?: boolean;
  /** Adds a max-width and centers content — good for narrow forms/settings */
  narrow?: boolean;
}

/**
 * Wraps the scrollable content area below PageHeader.
 * Provides consistent padding, max-width, and vertical rhythm.
 */
export default function PageContainer({
  children,
  flush = false,
  narrow = false,
}: PageContainerProps) {
  return (
    <div
      className={[
        'py-6',
        flush ? '' : 'px-6 md:px-8',
        narrow ? 'max-w-2xl' : 'max-w-screen-xl',
      ].join(' ')}
    >
      {children}
    </div>
  );
}

/** Consistent vertical gap between sections within a page */
export function PageSection({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={['space-y-4', className].join(' ')}>{children}</div>;
}

/** Row of cards / stat boxes — responsive grid */
export function PageGrid({
  children,
  cols = 3,
  className = '',
}: {
  children: React.ReactNode;
  cols?: 2 | 3 | 4;
  className?: string;
}) {
  const colClass = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  }[cols];

  return (
    <div className={['grid gap-4', colClass, className].join(' ')}>
      {children}
    </div>
  );
}
