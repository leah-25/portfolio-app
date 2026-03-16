import type { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';

// ── Table wrapper ─────────────────────────────────────────────────────────────

interface TableProps {
  children: React.ReactNode;
  /** Full-width without card wrapper */
  flush?: boolean;
}

/**
 * Usage:
 *   <Table>
 *     <Thead><Tr><Th>Symbol</Th><Th numeric>Value</Th></Tr></Thead>
 *     <Tbody><Tr><Td>NVDA</Td><Td numeric>$12,400</Td></Tr></Tbody>
 *   </Table>
 */
export function Table({ children, flush = false }: TableProps) {
  return (
    <div className={[
      'overflow-x-auto',
      flush ? '' : 'rounded-card border border-surface-border',
    ].join(' ')}>
      <table className="w-full min-w-full border-collapse text-sm">
        {children}
      </table>
    </div>
  );
}

// ── Thead ─────────────────────────────────────────────────────────────────────

export function Thead({ children, sticky = false }: { children: React.ReactNode; sticky?: boolean }) {
  return (
    <thead className={[
      'bg-surface border-b border-surface-border',
      sticky ? 'sticky top-0 z-10' : '',
    ].join(' ')}>
      {children}
    </thead>
  );
}

// ── Tbody ─────────────────────────────────────────────────────────────────────

export function Tbody({ children }: { children: React.ReactNode }) {
  return <tbody className="divide-y divide-surface-border">{children}</tbody>;
}

// ── Tr ───────────────────────────────────────────────────────────────────────

interface TrProps extends HTMLAttributes<HTMLTableRowElement> {
  clickable?: boolean;
}

export function Tr({ children, clickable, className = '', ...rest }: TrProps) {
  return (
    <tr
      className={[
        'transition-colors duration-75',
        clickable
          ? 'cursor-pointer hover:bg-surface-overlay'
          : 'hover:bg-surface-raised/50',
        className,
      ].join(' ')}
      {...rest}
    >
      {children}
    </tr>
  );
}

// ── Th ───────────────────────────────────────────────────────────────────────

type SortDirection = 'asc' | 'desc' | 'none';

interface ThProps extends ThHTMLAttributes<HTMLTableCellElement> {
  /** Right-align numeric columns */
  numeric?: boolean;
  /** Sortable column — shows sort icon */
  sortable?: boolean;
  sortDir?: SortDirection;
  onSort?: () => void;
  /** Muted / de-emphasised header */
  muted?: boolean;
  width?: string;
}

export function Th({
  children,
  numeric = false,
  sortable = false,
  sortDir = 'none',
  onSort,
  muted = false,
  width,
  className = '',
  ...rest
}: ThProps) {
  const inner = (
    <span className="flex items-center gap-1">
      <span>{children}</span>
      {sortable && (
        <span className="flex-shrink-0 text-text-muted">
          {sortDir === 'asc'  && <ChevronUp   size={12} strokeWidth={2.5} className="text-accent" />}
          {sortDir === 'desc' && <ChevronDown  size={12} strokeWidth={2.5} className="text-accent" />}
          {sortDir === 'none' && <ChevronsUpDown size={12} strokeWidth={2} className="text-text-muted opacity-50" />}
        </span>
      )}
    </span>
  );

  return (
    <th
      style={width ? { width } : undefined}
      className={[
        'px-4 py-3 text-left',
        '2xs font-semibold uppercase tracking-widest whitespace-nowrap',
        numeric ? 'text-right' : '',
        muted ? 'text-text-muted' : 'text-text-muted',
        sortable ? 'cursor-pointer select-none hover:text-text-secondary' : '',
        className,
      ].join(' ')}
      onClick={sortable ? onSort : undefined}
      {...rest}
    >
      {numeric
        ? <span className="flex items-center justify-end gap-1">{inner}</span>
        : inner}
    </th>
  );
}

// ── Td ───────────────────────────────────────────────────────────────────────

interface TdProps extends TdHTMLAttributes<HTMLTableCellElement> {
  numeric?: boolean;
  /** Muted text */
  muted?: boolean;
  /** Gain/loss coloring */
  sentiment?: 'gain' | 'loss' | 'neutral';
}

export function Td({
  children,
  numeric = false,
  muted = false,
  sentiment,
  className = '',
  ...rest
}: TdProps) {
  const sentimentClass = {
    gain:    'text-gain-text num',
    loss:    'text-loss-text num',
    neutral: 'text-text-muted num',
  };

  return (
    <td
      className={[
        'px-4 py-3 text-sm whitespace-nowrap',
        numeric ? 'text-right num' : '',
        muted ? 'text-text-muted' : 'text-text-secondary',
        sentiment ? sentimentClass[sentiment] : '',
        className,
      ].join(' ')}
      {...rest}
    >
      {children}
    </td>
  );
}

// ── TableEmpty ────────────────────────────────────────────────────────────────

export function TableEmpty({
  cols,
  message = 'No data',
}: {
  cols: number;
  message?: string;
}) {
  return (
    <tr>
      <td colSpan={cols} className="px-4 py-14 text-center text-sm text-text-muted">
        {message}
      </td>
    </tr>
  );
}
