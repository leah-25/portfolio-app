import { useState, useEffect } from 'react';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Textarea from '../../components/ui/Textarea';
import Button from '../../components/ui/Button';
import { useRiskStore, type RiskEntry } from '../../store/riskStore';

interface RiskFormProps {
  open: boolean;
  onClose: () => void;
  entry?: RiskEntry | null;
}

const BLANK = {
  kind:         'risk' as 'risk' | 'catalyst',
  holding:      '',
  title:        '',
  body:         '',
  status:       'open' as 'open' | 'monitoring' | 'resolved',
  expectedDate: '',
};

function entryToForm(e: RiskEntry) {
  return {
    kind:         e.kind,
    holding:      e.holding ?? '',
    title:        e.title,
    body:         e.body,
    status:       e.status,
    expectedDate: e.expectedDate ?? '',
  };
}

export default function RiskForm({ open, onClose, entry }: RiskFormProps) {
  const { addEntry, updateEntry } = useRiskStore();
  const isEdit = entry != null;

  const [form, setForm]     = useState(BLANK);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      /* eslint-disable react-hooks/set-state-in-effect */
      setForm(entry ? entryToForm(entry) : BLANK);
      setErrors({});
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [open, entry]);

  function set<K extends keyof typeof BLANK>(key: K, value: (typeof BLANK)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => { const next = { ...prev }; delete next[key]; return next; });
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!form.title.trim()) e.title = 'Required';
    if (!form.body.trim())  e.body  = 'Required';
    return e;
  }

  function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    const data = {
      kind:         form.kind,
      holding:      form.holding.trim() || null,
      title:        form.title.trim(),
      body:         form.body.trim(),
      status:       form.status,
      expectedDate: form.kind === 'catalyst' && form.expectedDate.trim()
        ? form.expectedDate.trim()
        : undefined,
    };

    if (isEdit) {
      updateEntry(entry.id, data);
    } else {
      addEntry(data);
    }
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Edit Entry' : 'Add Risk / Catalyst'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Type"
            value={form.kind}
            onChange={(e) => set('kind', e.target.value as 'risk' | 'catalyst')}
            options={[
              { value: 'risk',     label: 'Risk'     },
              { value: 'catalyst', label: 'Catalyst' },
            ]}
          />
          <Select
            label="Status"
            value={form.status}
            onChange={(e) => set('status', e.target.value as typeof form.status)}
            options={[
              { value: 'open',       label: 'Open'       },
              { value: 'monitoring', label: 'Monitoring' },
              { value: 'resolved',   label: 'Resolved'   },
            ]}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Holding (optional)"
            placeholder="NVDA"
            value={form.holding}
            onChange={(e) => set('holding', e.target.value.toUpperCase())}
          />
          {form.kind === 'catalyst' && (
            <Input
              label="Expected date"
              placeholder="Q2 2026"
              value={form.expectedDate}
              onChange={(e) => set('expectedDate', e.target.value)}
            />
          )}
        </div>

        <Input
          label="Title"
          placeholder="Short description"
          value={form.title}
          onChange={(e) => set('title', e.target.value)}
          error={errors.title}
        />

        <Textarea
          label="Details"
          placeholder="Explain the risk or catalyst in more detail…"
          value={form.body}
          onChange={(e) => set('body', e.target.value)}
          error={errors.body}
          rows={4}
        />

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" size="sm" type="button" onClick={onClose}>Cancel</Button>
          <Button variant="primary" size="sm" type="submit">
            {isEdit ? 'Save changes' : 'Add entry'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
