import type { BadgeVariant } from '../../components/ui/Badge';

export const RISK_VARIANT: Record<string, BadgeVariant> = {
  low:    'gain',
  medium: 'warn',
  high:   'loss',
};

export const TYPE_VARIANT: Record<string, BadgeVariant> = {
  stock:  'accent',
  crypto: 'warn',
  etf:    'default',
};
