'use client';

import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';

interface DQModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason?: string) => Promise<void>;
  loading: boolean;
  error: string;
  playerName: string;
  matchIdentifier: string;
}

export function DQModal({
  isOpen,
  onClose,
  onConfirm,
  loading,
  error,
  playerName,
  matchIdentifier,
}: DQModalProps) {
  const [reason, setReason] = useState('');
  const [confirmText, setConfirmText] = useState('');

  const handleConfirm = async () => {
    await onConfirm(reason || undefined);
  };

  const handleClose = () => {
    setReason('');
    setConfirmText('');
    onClose();
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-zinc-900 border border-zinc-800 rounded-xl p-6 w-full max-w-md z-50 shadow-2xl">
          <Dialog.Title className="text-lg font-semibold text-zinc-100 mb-2">
            Disqualify Player
          </Dialog.Title>

          <Dialog.Description className="text-sm text-zinc-400 mb-4">
            Are you sure you want to disqualify <span className="text-zinc-200 font-medium">{playerName}</span> from match #{matchIdentifier}?
          </Dialog.Description>

          <div className="bg-red-900/20 border border-red-800/50 rounded-lg p-3 mb-4">
            <p className="text-sm text-red-400">
              This action cannot be undone. The player will lose by default and the result will be synced to Start.gg.
            </p>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-zinc-300 mb-1">
              Reason (optional)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Reason for disqualification..."
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-red-600 resize-none"
              rows={3}
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-zinc-300 mb-1">
              Type <span className="text-red-400">DISQUALIFY</span> to confirm
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="DISQUALIFY"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-red-600"
            />
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-900/30 border border-red-800/50 rounded-lg">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button
              onClick={handleClose}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={confirmText !== 'DISQUALIFY' || loading}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Disqualifying...
                </>
              ) : (
                'Disqualify'
              )}
            </button>
          </div>

          <Dialog.Close asChild>
            <button
              className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-200 transition-colors"
              aria-label="Close"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
