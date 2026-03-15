import { forwardRef } from 'react';
import type { SelectHTMLAttributes } from 'react';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, className = '', id, ...rest }, ref) => {
    const selectId = id ?? label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={selectId} className="text-xs font-medium text-text-secondary">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={[
            'h-8 w-full rounded-md border bg-surface-overlay px-3 text-sm text-text-primary transition-colors appearance-none cursor-pointer',
            error
              ? 'border-loss/50 focus:border-loss'
              : 'border-surface-border focus:border-accent focus:ring-1 focus:ring-accent/30',
            'outline-none',
            className,
          ].join(' ')}
          {...rest}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && <p className="text-xs text-loss-text">{error}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';
export default Select;
