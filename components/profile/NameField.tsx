'use client';

import { useState } from 'react';
import { updateProfileField } from './api';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck, faPencil } from '@fortawesome/free-solid-svg-icons';

type Props = {
  initialName: string;
  canEdit: boolean;
  onUpdated?: () => void;
};

export default function EditableName({ initialName, canEdit, onUpdated }: Props) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(initialName);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSave() {
    setErr(null);
    const next = (val || '').trim();
    if (!next) {
      setErr('Name cannot be empty.');
      return;
    }
    setSaving(true);
    try {
      const result = await updateProfileField({ name: next });
      setVal(result.user.name ?? '');
      setEditing(false);
      onUpdated?.();
    } catch (e: any) {
      setErr(e?.message ?? 'Failed to update name.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="justify-center items-center pl-3 sm:pl-4 flex flex-col">
      <span className="opacity-80 min-w-[4.5rem] self-start pl-1">Name</span>
      <label className="flex justify-between items-center w-full p-2 h-[var(--ctrl-h)] text-[var(--font-sz)]">
        <input
          type="text"
          className="w-full focus:outline-none"
          placeholder="Your name"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          disabled={!canEdit || !editing}
          autoComplete="name"
          aria-invalid={!!err}
        />
        <div
          className="tooltip join-item"
          data-tip={canEdit ? (editing ? 'Save' : 'Edit') : 'Editable only for email/password accounts'}
        >
          <button
            type="button"
            onClick={() => (editing ? onSave() : setEditing(true))}
            disabled={!canEdit || saving}
            className="btn btn-success btn-circle btn-sm"
            aria-label={editing ? 'Save name' : 'Edit name'}
          >
            <FontAwesomeIcon icon={editing ? faCheck : faPencil} />
          </button>
        </div>
      </label>
      {err && <div className="px-4 -mt-2 text-error text-sm w-3/4">{err}</div>}
    </div>
  );
}
