'use client';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary';
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="confirm-dialog" id="confirm-dialog">
      <div className="confirm-dialog-content">
        <h3 className="confirm-dialog-title">{title}</h3>
        <p className="confirm-dialog-text">{message}</p>
        <div className="confirm-dialog-actions">
          <button
            className="btn btn-ghost btn-sm"
            onClick={onCancel}
            id="confirm-cancel"
          >
            {cancelLabel}
          </button>
          <button
            className={`btn btn-sm ${
              variant === 'danger' ? 'btn-danger' : 'btn-primary'
            }`}
            onClick={onConfirm}
            id="confirm-submit"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
