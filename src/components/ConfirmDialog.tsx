'use client';

import { motion, AnimatePresence } from 'framer-motion';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[9999] flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onCancel}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

          {/* Dialog */}
          <motion.div
            className="glass-card relative mx-4 w-full max-w-sm rounded-2xl p-6 shadow-2xl"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 400 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-2 text-lg font-bold text-white">{title}</h3>
            <p className="mb-6 text-sm text-white/50">{message}</p>
            <div className="flex justify-end gap-3">
              <button
                className="rounded-xl px-4 py-2 text-sm font-semibold text-white/50 transition-all active:scale-95"
                onClick={onCancel}
              >
                Cancel
              </button>
              <button
                className="rounded-xl bg-red-500/20 px-4 py-2 text-sm font-semibold text-red-400 transition-all active:scale-95"
                onClick={onConfirm}
              >
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
