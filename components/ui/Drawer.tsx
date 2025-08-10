'use client';

import { useEffect, useRef } from 'react';

type DrawerProps = {
  open: boolean;
  onClose: () => void;
  width?: number; // px
  children: React.ReactNode;
};

export default function Drawer({ open, onClose, width = 320, children }: DrawerProps) {
  const prevOverflow = useRef<string | null>(null);

  useEffect(() => {
    if (!open) return;

    // Compute scrollbar width to avoid layout shift
    const sbw = window.innerWidth - document.documentElement.clientWidth;

    // Lock page scroll AND compensate padding-right
    prevOverflow.current = document.documentElement.style.overflow;
    document.documentElement.style.setProperty('--drawer-sbw', `${sbw}px`);
    document.documentElement.style.overflow = 'hidden';
    document.documentElement.style.paddingRight = `var(--drawer-sbw)`;

    return () => {
      document.documentElement.style.overflow = prevOverflow.current || '';
      document.documentElement.style.paddingRight = '';
      document.documentElement.style.removeProperty('--drawer-sbw');
    };
  }, [open]);

  // Close on ESC
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-200
                    ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        aria-hidden="true"
      />

      {/* Panel */}
      <aside
        role="dialog"
        aria-modal="true"
        className="fixed top-0 bottom-0 right-0 bg-base-200 shadow-xl transition-transform duration-300"
        style={{
          width,
          transform: open ? 'translateX(0)' : `translateX(${width}px)`,
        }}
      >
        <div className="h-full overflow-y-auto p-4">
          {/* Close button */}
          <button className="btn btn-sm btn-ghost mb-4" onClick={onClose} aria-label="Close menu">
            ✕
          </button>
          {children}
        </div>
      </aside>
    </>
  );
}
