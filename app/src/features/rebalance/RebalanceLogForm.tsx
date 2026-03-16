import { useState, useEffect } from 'react';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Textarea from '../../components/ui/Textarea';
import Button from '../../components/ui/Button';
import { useRebalanceStore, type RebalanceEntry } from '../../store/rebalanceStore';

interface RebalanceLogFormProps {
  open: boolean;
  onClose: () => void;
  entry?: RebalanceEntry | null;
}

const TODAY = new Date().toISOString().slice(0, 10);

const BLANK = { date: TODAY, action: '', rationale: '' };

function entryToForm(e: RebalanceEntry) {
  return { date: e.date, action: e.action, rationale: e.rationale };
}

export default function RebalanceLogForm({ open, onClose, entry }: RebalanceLogFormProps) {
  const { addEntry, updateEntry } = useRebalanceStore();
  const isEdit = entry != null;

  const [form, setForm]     = useState(BLANK);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      setForm(entry ? entryToForm(entry) : { ...BLANK, date: new Date().toISOString().slice(0, 10) });
      setErrors({});
    }
  }, [open, entry]);

  function set<K extends keyof typeof BLANK>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => { const next = { ...prev }; delete next[key]; return next; });
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!form.date)            e.date      = 'Required';
    if (!form.action.trim())   e.action    = 'Required';
    if (!form.rationale.trim()) e.rationale = 'Required';
    return e;
  }

  function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    if (isEdit) {
      updateEntry(entry.id, { date: form.date, action: form.action.trim(), rationale: form.rationale.trim() });
    } else {
      addEntry({ date: form.date, action: form.action.trim(), rationale: form.rationale.trim() });
    }
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Edit Decision' : 'Log Rebalance Decision'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Date"
          type="date"
          value={form.date}
          onChange={(e) => set('date', e.target.value)}
          error={errors.date}
        />

        <Input
          label="Action"
          placeholder="Sold NVDA (+3% → 0%), bought AMZN (-2% → 0%)"
          value={form.action}
          onChange={(e) => set('action', e.target.value)}
          error={errors.action}
        />

        <Textarea
          label="Rationale"
          placeholder="Why did you make this decision?"
          value={form.rationale}
          onChange={(e) => set('rationale', e.target.value)}
          error={errors.rationale}
          rows={3}
        />

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" size="sm" type="button" onClick={onClose}>Cancel</Button>
          <Button variant="primary" size="sm" type="submit">
            {isEdit ? 'Save changes' : 'Log decision'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
