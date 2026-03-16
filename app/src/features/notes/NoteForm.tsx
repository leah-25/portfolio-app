import { useState, useEffect } from 'react';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Textarea from '../../components/ui/Textarea';
import Select from '../../components/ui/Select';
import Button from '../../components/ui/Button';
import { useNotesStore, type ManualNote } from '../../store/notesStore';

interface NoteFormProps {
  open: boolean;
  onClose: () => void;
  note?: ManualNote | null;        // null/undefined = add mode
  defaultType?: 'weekly' | 'quarterly';
  prefill?: Partial<typeof BLANK>; // AI-generated pre-fill data
}

const BLANK = {
  type: 'weekly' as 'weekly' | 'quarterly',
  period: '',
  title: '',
  body: '',
  tags: '',
};

function noteToForm(n: ManualNote) {
  return {
    type: n.type,
    period: n.period,
    title: n.title,
    body: n.body,
    tags: n.tags.join(', '),
  };
}

export default function NoteForm({ open, onClose, note, defaultType = 'weekly', prefill }: NoteFormProps) {
  const { addNote, updateNote } = useNotesStore();
  const isEdit = note != null;

  const [form, setForm] = useState({ ...BLANK, type: defaultType });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      setForm(note ? noteToForm(note) : { ...BLANK, type: defaultType, ...prefill });
      setErrors({});
    }
  }, [open, note, defaultType]);

  function set<K extends keyof typeof BLANK>(key: K, value: (typeof BLANK)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => { const next = { ...prev }; delete next[key]; return next; });
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!form.title.trim()) e.title = 'Required';
    if (!form.period.trim()) e.period = 'Required';
    if (!form.body.trim()) e.body = 'Required';
    return e;
  }

  function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    const tags = form.tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    if (isEdit) {
      updateNote(note.id, {
        type: form.type,
        period: form.period.trim(),
        title: form.title.trim(),
        body: form.body.trim(),
        tags,
      });
    } else {
      addNote({
        type: form.type,
        period: form.period.trim(),
        title: form.title.trim(),
        body: form.body.trim(),
        tags,
      });
    }
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Edit Note' : 'New Note'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Type"
            value={form.type}
            onChange={(e) => set('type', e.target.value as 'weekly' | 'quarterly')}
            options={[
              { value: 'weekly',    label: 'Weekly' },
              { value: 'quarterly', label: 'Quarterly' },
            ]}
          />
          <Input
            label="Period"
            placeholder="Week 12 · 2026 or Q1 2026"
            value={form.period}
            onChange={(e) => set('period', e.target.value)}
            error={errors.period}
          />
        </div>

        <Input
          label="Title"
          placeholder="Brief summary of this note"
          value={form.title}
          onChange={(e) => set('title', e.target.value)}
          error={errors.title}
        />

        <Textarea
          label="Body"
          placeholder="Your research notes, observations, and conclusions…"
          value={form.body}
          onChange={(e) => set('body', e.target.value)}
          error={errors.body}
          rows={5}
        />

        <Input
          label="Tags (comma-separated)"
          placeholder="NVDA, semiconductors, AI"
          value={form.tags}
          onChange={(e) => set('tags', e.target.value)}
        />

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" size="sm" type="button" onClick={onClose}>Cancel</Button>
          <Button variant="primary" size="sm" type="submit">
            {isEdit ? 'Save changes' : 'Add note'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
