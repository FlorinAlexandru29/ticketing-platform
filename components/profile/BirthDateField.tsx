'use client';

import { useState } from 'react';
import { updateProfileField } from './api';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck, faPencil } from '@fortawesome/free-solid-svg-icons';

type Props = {
  initialBirth: string | null;
  canEditBirth: boolean;
  onUpdated?: () => void;
};

export default function BirthDateField({ initialBirth, canEditBirth, onUpdated }: Props) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(initialBirth ?? '');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSave() {
    setErr(null);
    if (val !== '' && !/^\d{4}-\d{2}-\d{2}$/.test(val)) {
      setErr('Use YYYY-MM-DD.');
      return;
    }
    setSaving(true);
    try {
      const result = await updateProfileField({ birthdate: val === '' ? null : val });
      setVal(result.user.birthdate ?? '');
      setEditing(false);
      onUpdated?.();
    } catch (e: any) {
      setErr(e?.message ?? 'Failed to update birth date.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="w-3/4 justify-center items-start flex flex-col">
        <div className="w-1/2">
          <span className="opacity-80 min-w-[4.5rem] self-start pl-1">Birth Date</span>
          <label className="flex justify-between items-center w-full p-2 h-[var(--ctrl-h)] text-[var(--font-sz)]">
            <input
              type="date"
              className="focus:outline-none"
              placeholder="YYYY-MM-DD"
              value={val}
              onChange={(e) => setVal(e.target.value)}
              disabled={!canEditBirth || !editing}
              max={new Date().toISOString().slice(0, 10)}
              autoComplete="bday"
              aria-invalid={!!err}
            />
            <div className="tooltip join-item" data-tip={canEditBirth ? (editing ? 'Save' : 'Edit') : 'Read-only'}>
              <button
                type="button"
                onClick={() => (editing ? onSave() : setEditing(true))}
                disabled={!canEditBirth || saving}
                className="btn btn-success btn-circle btn-sm"
                aria-label={editing ? 'Save birth date' : 'Edit birth date'}
              >
                <FontAwesomeIcon icon={editing ? faCheck : faPencil} />
              </button>
            </div>
          </label>
        </div>
      </div>
      {err && <div className="px-4 -mt-2 text-error text-sm w-3/4">{err}</div>}
    </>
  );
}
