import { RotateCcw, X } from "lucide-react";

export function DraftUndoToast({
  blockName,
  undoDisabled,
  undoDisabledReason,
  onUndo,
  onClose
}: {
  blockName: string;
  undoDisabled: boolean;
  undoDisabledReason: string | null;
  onUndo: () => void;
  onClose: () => void;
}) {
  return (
    <div className="draft-undo-toast" data-tone={undoDisabled ? "amber" : "green"}>
      <div className="draft-undo-toast-copy" role="status" aria-live="polite">
        <strong>이번 작업에서 제거했습니다.</strong>
        <span>{undoDisabledReason ?? blockName}</span>
      </div>
      <div className="draft-undo-toast-actions">
        <button className="secondary-button" onClick={onUndo} disabled={undoDisabled}>
          <RotateCcw size={16} />
          되돌리기
        </button>
        <button className="icon-button panel-close-button" onClick={onClose} aria-label="되돌리기 안내 닫기">
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
