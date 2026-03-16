import { forwardRef } from 'react';
import type { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, hint, error, className = '', id, ...rest }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={inputId} className="text-xs font-medium text-text-secondary">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={[
            'h-8 w-full rounded-md border bg-surface-overlay px-3 text-sm text-text-primary placeholder:text-text-muted transition-colors',
            error
              ? 'border-loss/50 focus:border-loss focus:ring-loss/30'
              : 'border-surface-border focus:border-accent focus:ring-1 focus:ring-accent/30',
            'outline-none',
            className,
          ].join(' ')}
          {...rest}
        />
        {error && <p className="text-xs text-loss-text">{error}</p>}
        {hint && !error && <p className="text-xs text-text-muted">{hint}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
export default Input;
