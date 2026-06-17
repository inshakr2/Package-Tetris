import { useEffect, useRef } from "react";
import { Plus, X } from "lucide-react";
import { getSpaceDialogCopy, type SpaceDialogMode } from "@/lib/workspace/space-dialog-copy";
import { NumberFieldInput } from "./number-field-input";

export interface SpaceFormValue {
  name: string;
  widthMm: number;
  depthMm: number;
  heightMm: number;
  offsetWidthMm: number;
  offsetDepthMm: number;
  offsetHeightMm: number;
}

export const DEFAULT_SPACE_FORM: SpaceFormValue = {
  name: "커스텀 공간",
  widthMm: 1200,
  depthMm: 1000,
  heightMm: 1500,
  offsetWidthMm: 50,
  offsetDepthMm: 50,
  offsetHeightMm: 80
};

export function SpaceFormDialog({
  open,
  mode,
  value,
  error,
  saveDisabled,
  saveDisabledReason,
  onChange,
  onClose,
  onSave
}: {
  open: boolean;
  mode: SpaceDialogMode;
  value: SpaceFormValue;
  error: string | null;
  saveDisabled: boolean;
  saveDisabledReason: string | null;
  onChange: (value: SpaceFormValue) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const copy = getSpaceDialogCopy(mode);
  const titleId = "space-form-dialog-title";

  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog) {
      return;
    }

    if (open) {
      if (!dialog.open) {
        dialog.showModal();
      }

      window.setTimeout(() => {
        dialog.querySelector<HTMLInputElement>("input")?.focus();
      }, 0);
      return;
    }

    if (dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      className="space-form-dialog"
      aria-labelledby={titleId}
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
      <div className="space-form-sheet">
        <div className="space-form-dialog-head">
          <div>
            <h2 id={titleId}>{copy.title}</h2>
            <p className="fine-print">{copy.helperLabel}</p>
          </div>
          <button className="icon-button panel-close-button" onClick={onClose} aria-label="공간 입력 닫기">
            <X size={16} />
          </button>
        </div>
        <div className="space-form-dialog-body">
          <SpaceForm value={value} onChange={onChange} />
          {error || saveDisabledReason ? (
            <p className="form-error" role="alert">
              {error ?? saveDisabledReason}
            </p>
          ) : null}
        </div>
        <div className="form-actions space-form-dialog-actions">
          <button className="secondary-button" onClick={onClose}>
            취소
          </button>
          <button className="primary-button" onClick={onSave} disabled={saveDisabled}>
            <Plus size={16} />
            {copy.primaryLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}

function SpaceForm({
  value,
  onChange
}: {
  value: SpaceFormValue;
  onChange: (value: SpaceFormValue) => void;
}) {
  return (
    <div className="space-form-rows space-form">
      <div className="form-row space-form-name-row">
        <label>
          공간명
          <input value={value.name} onChange={(event) => onChange({ ...value, name: event.target.value })} />
        </label>
      </div>
      <div className="form-row form-row-three space-form-dimension-row">
        <label>
          가로(mm)
          <NumberFieldInput
            aria-label="공간 가로 mm"
            min={1}
            value={value.widthMm}
            onValidValueChange={(widthMm) => onChange({ ...value, widthMm })}
          />
        </label>
        <label>
          세로(mm)
          <NumberFieldInput
            aria-label="공간 세로 mm"
            min={1}
            value={value.depthMm}
            onValidValueChange={(depthMm) => onChange({ ...value, depthMm })}
          />
        </label>
        <label>
          높이(mm)
          <NumberFieldInput
            aria-label="공간 높이 mm"
            min={1}
            value={value.heightMm}
            onValidValueChange={(heightMm) => onChange({ ...value, heightMm })}
          />
        </label>
      </div>
      <div className="form-row form-row-three space-form-offset-row">
        <label>
          안전 여유 가로(mm)
          <NumberFieldInput
            aria-label="안전 여유 가로 mm"
            min={0}
            value={value.offsetWidthMm}
            onValidValueChange={(offsetWidthMm) => onChange({ ...value, offsetWidthMm })}
          />
        </label>
        <label>
          안전 여유 세로(mm)
          <NumberFieldInput
            aria-label="안전 여유 세로 mm"
            min={0}
            value={value.offsetDepthMm}
            onValidValueChange={(offsetDepthMm) => onChange({ ...value, offsetDepthMm })}
          />
        </label>
        <label>
          안전 여유 높이(mm)
          <NumberFieldInput
            aria-label="안전 여유 높이 mm"
            min={0}
            value={value.offsetHeightMm}
            onValidValueChange={(offsetHeightMm) => onChange({ ...value, offsetHeightMm })}
          />
        </label>
      </div>
    </div>
  );
}
