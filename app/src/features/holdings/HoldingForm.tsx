import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Button from '../../components/ui/Button';
import { useHoldingsStore } from '../../store/holdingsStore';
import type { HoldingRecord, NewHoldingInput } from '../../store/holdingsStore';

interface HoldingFormProps {
  /** null = add mode; HoldingRecord = edit mode */
  holding: HoldingRecord | null;
  open: boolean;
  onClose: () => void;
}

type FormErrors = Partial<Record<string, string>>;

const TODAY = new Date().toISOString().slice(0, 10);

function validate(f: typeof BLANK): FormErrors {
  const e: FormErrors = {};
  if (!f.symbol.trim())                         e.symbol    = 'Required';
  if (!f.name.trim())                           e.name      = 'Required';
  const qty = parseFloat(f.quantity);
  if (isNaN(qty) || qty <= 0)                   e.quantity  = 'Must be > 0';
  const cb = parseFloat(f.costBasis);
  if (isNaN(cb) || cb <= 0)                     e.costBasis = 'Must be > 0';
  if (f.targetWeight !== '') {
    const tw = parseFloat(f.targetWeight);
    if (isNaN(tw) || tw < 0 || tw > 100)        e.targetWeight = '0–100';
  }
  return e;
}

const BLANK = {
  symbol: '', name: '', type: 'stock' as HoldingRecord['type'],
  sector: '', quantity: '', costBasis: '', purchaseDate: TODAY,
  targetWeight: '', conviction: '' as '' | '1' | '2' | '3' | '4' | '5',
  riskLevel: 'medium' as HoldingRecord['riskLevel'],
  thesisBody: '', thesisDrift: false,
};

function holdingToForm(h: HoldingRecord): typeof BLANK {
  return {
    symbol:       h.symbol,
    name:         h.name,
    type:         h.type,
    sector:       h.sector,
    quantity:     String(h.quantity),
    costBasis:    String(h.costBasis),
    purchaseDate: h.lots[0]?.date ?? TODAY,
    targetWeight: h.targetWeight != null ? String(h.targetWeight) : '',
    conviction:   h.conviction != null ? String(h.conviction) as '1'|'2'|'3'|'4'|'5' : '',
    riskLevel:    h.riskLevel,
    thesisBody:   h.thesisBody,
    thesisDrift:  h.thesisDrift,
  };
}

export default function HoldingForm({ holding, open, onClose }: HoldingFormProps) {
  const { addHolding, updateHolding } = useHoldingsStore();
  const isEdit = holding !== null;

  const [form,   setForm]   = useState(BLANK);
  const [errors, setErrors] = useState<FormErrors>({});

  // Sync form when opening
  useEffect(() => {
    if (open) {
      /* eslint-disable react-hooks/set-state-in-effect */
      setForm(isEdit ? holdingToForm(holding) : BLANK);
      setErrors({});
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [open, holding, isEdit]);

  // Escape to close
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [open, onClose]);

  function set<K extends keyof typeof BLANK>(key: K, value: (typeof BLANK)[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
    setErrors(prev => { const next = { ...prev }; delete next[key]; return next; });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate(form);
    if (Object.keys(errs).length) { setErrors(errs); return; }

    const qty  = parseFloat(form.quantity);
    const cb   = parseFloat(form.costBasis);
    const tw   = form.targetWeight !== '' ? parseFloat(form.targetWeight) : null;
    const conv = form.conviction   !== '' ? parseInt(form.conviction) as 1|2|3|4|5 : null;

    if (isEdit) {
      const newCurrentValue = qty * cb;
      const newTotalCost    = qty * cb;
      const newPnl          = newCurrentValue - newTotalCost;
      const newPnlPct       = newTotalCost > 0 ? (newPnl / newTotalCost) * 100 : 0;
      updateHolding(holding.id, {
        symbol:       form.symbol.toUpperCase().trim(),
        name:         form.name.trim(),
        type:         form.type,
        sector:       form.sector.trim(),
        quantity:     qty,
        costBasis:    cb,
        currentValue: newCurrentValue,
        pnl:          newPnl,
        pnlPct:       newPnlPct,
        targetWeight: tw,
        conviction:   conv,
        riskLevel:    form.riskLevel,
        thesisBody:   form.thesisBody.trim(),
        thesisDrift:  form.thesisDrift,
        lastReviewed: new Date().toISOString(),
      });
    } else {
      const input: NewHoldingInput = {
        symbol: form.symbol, name: form.name, type: form.type,
        sector: form.sector, quantity: qty, costBasis: cb,
        purchaseDate: form.purchaseDate, targetWeight: tw,
        conviction: conv, riskLevel: form.riskLevel, thesisBody: form.thesisBody,
      };
      addHolding(input);
    }
    onClose();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-surface-overlay border border-surface-border rounded-xl shadow-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-border flex-shrink-0">
          <h2 className="text-sm font-semibold text-text-primary">
            {isEdit ? `Edit ${holding.symbol}` : 'Add Holding'}
          </h2>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-md text-text-muted hover:bg-surface-raised hover:text-text-primary transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

          {/* Identity */}
          <section className="space-y-3">
            <p className="text-2xs font-semibold uppercase tracking-widest text-text-muted">Position</p>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Symbol"
                placeholder="NVDA"
                value={form.symbol}
                onChange={e => set('symbol', e.target.value.toUpperCase())}
                error={errors.symbol}
                disabled={isEdit}
                className={isEdit ? 'opacity-60 cursor-not-allowed' : ''}
              />
              <Select
                label="Type"
                value={form.type}
                onChange={e => set('type', e.target.value as HoldingRecord['type'])}
                options={[
                  { value: 'stock',  label: 'Stock'  },
                  { value: 'crypto', label: 'Crypto' },
                  { value: 'etf',    label: 'ETF'    },
                ]}
              />
            </div>
            <Input
              label="Name"
              placeholder="NVIDIA Corporation"
              value={form.name}
              onChange={e => set('name', e.target.value)}
              error={errors.name}
            />
            <Input
              label="Sector"
              placeholder="Semiconductors"
              value={form.sector}
              onChange={e => set('sector', e.target.value)}
            />
          </section>

          {/* Purchase */}
          <section className="space-y-3">
            <p className="text-2xs font-semibold uppercase tracking-widest text-text-muted">
              {isEdit ? 'Position Size' : 'Purchase'}
            </p>
            <div className="grid grid-cols-3 gap-3">
              <Input
                label="Quantity"
                type="number"
                min="0"
                step="any"
                placeholder="45"
                value={form.quantity}
                onChange={e => set('quantity', e.target.value)}
                error={errors.quantity}
              />
              <Input
                label="Cost / unit ($)"
                type="number"
                min="0"
                step="any"
                placeholder="220.00"
                value={form.costBasis}
                onChange={e => set('costBasis', e.target.value)}
                error={errors.costBasis}
              />
              <Input
                label="Purchase date"
                type="date"
                value={form.purchaseDate}
                onChange={e => set('purchaseDate', e.target.value)}
                disabled={isEdit}
                className={isEdit ? 'opacity-60 cursor-not-allowed' : ''}
              />
            </div>
            {isEdit && (
              <p className="text-xs text-text-muted mt-1">
                Editing quantity or cost basis does not update lot history. For accurate lot tracking, use "Add lot" instead.
              </p>
            )}
          </section>

          {/* Targets & risk */}
          <section className="space-y-3">
            <p className="text-2xs font-semibold uppercase tracking-widest text-text-muted">Targets & Risk</p>
            <div className="grid grid-cols-3 gap-3">
              <Input
                label="Target weight (%)"
                type="number"
                min="0"
                max="100"
                step="0.1"
                placeholder="25"
                value={form.targetWeight}
                onChange={e => set('targetWeight', e.target.value)}
                error={errors.targetWeight}
              />
              <Select
                label="Conviction"
                value={form.conviction}
                onChange={e => set('conviction', e.target.value as typeof form.conviction)}
                options={[
                  { value: '',  label: 'Unrated' },
                  { value: '1', label: '1 — Very Low' },
                  { value: '2', label: '2 — Low'      },
                  { value: '3', label: '3 — Medium'   },
                  { value: '4', label: '4 — High'     },
                  { value: '5', label: '5 — Very High' },
                ]}
              />
              <Select
                label="Risk level"
                value={form.riskLevel}
                onChange={e => set('riskLevel', e.target.value as HoldingRecord['riskLevel'])}
                options={[
                  { value: 'low',    label: 'Low'    },
                  { value: 'medium', label: 'Medium' },
                  { value: 'high',   label: 'High'   },
                ]}
              />
            </div>
          </section>

          {/* Thesis drift flag (edit only) */}
          {isEdit && (
            <section className="space-y-3">
              <p className="text-2xs font-semibold uppercase tracking-widest text-text-muted">Thesis</p>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.thesisDrift}
                  onChange={e => set('thesisDrift', e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-surface-border accent-accent"
                />
                <span className="text-xs text-text-secondary">Mark thesis as drifted (needs review)</span>
              </label>
            </section>
          )}
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-surface-border flex-shrink-0">
          <Button variant="ghost" size="sm" type="button" onClick={onClose}>Cancel</Button>
          <Button variant="primary" size="sm" type="submit" onClick={handleSubmit}>
            {isEdit ? 'Save changes' : 'Add holding'}
          </Button>
        </div>
      </div>
    </div>
  );
}
