import { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Tag from '../../components/ui/Tag';
import NoteForm from './NoteForm';
import { useNotesStore, type ManualNote } from '../../store/notesStore';

interface NoteDetailProps {
  note: ManualNote | null;
  onClose: () => void;
}

export default function NoteDetail({ note, onClose }: NoteDetailProps) {
  const { deleteNote } = useNotesStore();
  const [editing, setEditing] = useState(false);

  if (!note) return null;

  function handleDelete() {
    if (!note) return;
    deleteNote(note.id);
    onClose();
  }

  return (
    <>
      <Modal open={!!note && !editing} onClose={onClose} title={note.period}>
        <div className="space-y-4">
          <div>
            <p className="text-sm font-semibold text-text-primary mb-1">{note.title}</p>
            <p className="text-xs text-text-muted">
              {new Date(note.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          </div>

          <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap">
            {note.body}
          </p>

          {note.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {note.tags.map((t) => <Tag key={t} size="xs">{t}</Tag>)}
            </div>
          )}

          <div className="flex items-center justify-between pt-2 border-t border-surface-border">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              className="text-loss-text hover:bg-loss-subtle"
            >
              <Trash2 size={13} />
              Delete
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
              <Pencil size={13} />
              Edit
            </Button>
          </div>
        </div>
      </Modal>

      <NoteForm
        open={editing}
        onClose={() => { setEditing(false); onClose(); }}
        note={note}
      />
    </>
  );
}
