import { ArrowRight } from 'lucide-react';
import { formatRelative } from '../../lib/formatters';
import Tag from './Tag';

type NoteType = 'weekly' | 'quarterly' | 'ai';

interface NoteCardProps {
  type: NoteType;
  period: string;          // e.g. "Week 12 · 2025" or "Q1 2025" or "Mar 15, 2026"
  title: string;
  excerpt?: string;        // 2–3 sentence preview of body
  tags?: string[];         // holding symbols or topic labels
  updatedAt: string;       // ISO datetime
  onClick?: () => void;
}

const TYPE_CONFIG: Record<NoteType, { label: string; barColor: string; labelColor: string }> = {
  weekly:    { label: 'Weekly',    barColor: 'bg-accent',       labelColor: 'text-accent' },
  quarterly: { label: 'Quarterly', barColor: 'bg-warn-DEFAULT', labelColor: 'text-warn-text' },
  ai:        { label: 'AI',        barColor: 'bg-[#a855f7]',    labelColor: 'text-[#a855f7]' },
};

export default function NoteCard({
  type,
  period,
  title,
  excerpt,
  tags = [],
  updatedAt,
  onClick,
}: NoteCardProps) {
  const { label, barColor, labelColor } = TYPE_CONFIG[type];

  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
      className={[
        'group relative flex gap-0 overflow-hidden rounded-card border border-surface-border bg-surface-raised',
        'transition-all duration-150',
        onClick
          ? 'cursor-pointer hover:border-surface-muted hover:shadow-card-md'
          : '',
      ].join(' ')}
    >
      {/* Left accent bar */}
      <div className={['w-1 flex-shrink-0 rounded-l-card', barColor].join(' ')} />

      {/* Content */}
      <div className="flex-1 min-w-0 p-4">
        {/* Meta row */}
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-2">
            <span className={['text-2xs font-semibold uppercase tracking-widest', labelColor].join(' ')}>
              {label}
            </span>
            <span className="text-surface-muted select-none">·</span>
            <span className="text-xs text-text-muted">{period}</span>
          </div>
          <span className="text-2xs text-text-muted flex-shrink-0">
            {formatRelative(updatedAt)}
          </span>
        </div>

        {/* Title */}
        <h3 className="text-sm font-semibold text-text-primary leading-snug truncate mb-1">
          {title}
        </h3>

        {/* Excerpt */}
        {excerpt && (
          <p className="text-xs text-text-muted leading-relaxed truncate-2 mb-3">
            {excerpt}
          </p>
        )}

        {/* Footer: tags + arrow */}
        <div className="flex items-center justify-between gap-2 mt-auto">
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {tags.slice(0, 4).map((tag) => (
                <Tag key={tag} size="xs">{tag}</Tag>
              ))}
              {tags.length > 4 && (
                <span className="text-2xs text-text-muted self-center">
                  +{tags.length - 4}
                </span>
              )}
            </div>
          )}
          {!tags.length && <span />}
          {onClick && (
            <ArrowRight
              size={14}
              className="flex-shrink-0 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity"
            />
          )}
        </div>
      </div>
    </div>
  );
}
