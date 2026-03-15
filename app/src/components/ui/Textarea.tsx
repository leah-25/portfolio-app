import { forwardRef } from 'react';
import type { TextareaHTMLAttributes } from 'react';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, hint, error, className = '', id, ...rest }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={inputId} className="text-xs font-medium text-text-secondary">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          className={[
            'w-full rounded-md border bg-surface-overlay px-3 py-2 text-sm text-text-primary placeholder:text-text-muted transition-colors resize-none',
            error
              ? 'border-loss/50 focus:border-loss'
              : 'border-surface-border focus:border-accent focus:ring-1 focus:ring-accent/30',
            'outline-none',
            className,
          ].join(' ')}
          rows={4}
          {...rest}
        />
        {error && <p className="text-xs text-loss-text">{error}</p>}
        {hint && !error && <p className="text-xs text-text-muted">{hint}</p>}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
export default Textarea;
