import { useEffect, useId, useRef } from "react";
import { RotateCcw, X } from "lucide-react";

export function ResetCurrentWorkDialog({
  open,
  confirmDisabled,
  confirmDisabledReason,
  onClose,
  onConfirm
}: {
  open: boolean;
  confirmDisabled: boolean;
  confirmDisabledReason: string | null;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog) {
      return;
    }

    if (open && !dialog.open) {
      dialog.showModal();
      return;
    }

    if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      className="reset-work-dialog"
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
      <div className="reset-work-sheet">
        <div className="space-form-dialog-head">
          <div>
            <h2 id={titleId}>현재 작업을 새로 시작할까요?</h2>
            <p id={descriptionId} className="fine-print">
              이번 작업 박스, 계산 결과, 추가 적재 기록만 비웁니다. 저장된 공간과 박스는 그대로 둡니다.
            </p>
            {confirmDisabledReason ? (
              <p className="form-error" role="alert">
                {confirmDisabledReason}
              </p>
            ) : null}
          </div>
          <button className="icon-button panel-close-button" onClick={onClose} aria-label="새 작업 시작 닫기">
            <X size={16} />
          </button>
        </div>
        <div className="form-actions reset-work-actions">
          <button data-cancel-button="true" className="secondary-button" autoFocus onClick={onClose}>
            취소
          </button>
          <button className="danger-button" onClick={onConfirm} disabled={confirmDisabled}>
            <RotateCcw size={16} />
            현재 작업 비우기
          </button>
        </div>
      </div>
    </dialog>
  );
}
