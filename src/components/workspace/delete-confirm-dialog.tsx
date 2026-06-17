import { useEffect, useRef } from "react";
import { Trash2, X } from "lucide-react";
import {
  getDeleteConfirmationCopy,
  type DeleteConfirmationKind
} from "@/lib/workspace/delete-confirmation-copy";

export interface PendingDelete {
  kind: DeleteConfirmationKind;
  entityId: string;
  name: string;
}

export function DeleteConfirmDialog({
  pendingDelete,
  confirmDisabled,
  confirmDisabledReason,
  onClose,
  onConfirm
}: {
  pendingDelete: PendingDelete | null;
  confirmDisabled: boolean;
  confirmDisabledReason: string | null;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = "delete-confirm-dialog-title";
  const descriptionId = "delete-confirm-dialog-description";
  const copy = pendingDelete ? getDeleteConfirmationCopy(pendingDelete.kind, pendingDelete.name) : null;

  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog) {
      return;
    }

    if (pendingDelete) {
      if (!dialog.open) {
        dialog.showModal();
      }

      window.setTimeout(() => {
        dialog.querySelector<HTMLButtonElement>("[data-cancel-button='true']")?.focus();
      }, 0);
      return;
    }

    if (dialog.open) {
      dialog.close();
    }
  }, [pendingDelete]);

  return (
    <dialog
      ref={dialogRef}
      className="delete-confirm-dialog"
      role="alertdialog"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          onClose();
        }
      }}
    >
      <div className="delete-confirm-sheet">
        <div className="space-form-dialog-head">
          <div>
            <h2 id={titleId}>{copy?.title ?? "삭제 확인"}</h2>
            <p id={descriptionId} className="fine-print">
              {copy?.description ?? "삭제 전에 한 번 더 확인해 주세요."}
            </p>
            {confirmDisabledReason ? (
              <p className="form-error" role="alert">
                {confirmDisabledReason}
              </p>
            ) : null}
          </div>
          <button className="icon-button panel-close-button" onClick={onClose} aria-label="삭제 확인 닫기">
            <X size={16} />
          </button>
        </div>
        <div className="form-actions delete-confirm-actions">
          <button
            data-cancel-button="true"
            className="secondary-button"
            autoFocus
            onClick={onClose}
          >
            취소
          </button>
          <button className="danger-button" onClick={onConfirm} disabled={confirmDisabled}>
            <Trash2 size={16} />
            {copy?.confirmLabel ?? "삭제"}
          </button>
        </div>
      </div>
    </dialog>
  );
}
