import { ChangeEvent, useEffect, useRef, useState } from "react";
import { Download, Eye, FileUp, RotateCcw, Trash2, X } from "lucide-react";
import {
  calculateBlockVolumeM3,
  isValidBlockMeasurementInput
} from "@/lib/workspace/block-measurements";
import {
  DRAFT_BLOCK_IMPORT_SAMPLE_ROWS,
  DRAFT_BLOCK_XLSX_COLUMNS,
  createDraftBlockImportSampleWorkbook,
  readDraftBlockXlsxFile,
  type DraftBlockImportCandidate,
  type DraftBlockImportPreview
} from "@/lib/workspace/draft-block-xlsx-import";
import {
  DRAFT_LOAD_PRIORITY_OPTIONS,
  getDraftLoadPriorityLabel,
  normalizeDraftLoadPriorityOptionValue,
  type DraftLoadPriorityOptionValue
} from "@/lib/workspace/draft-load-priority-options";
import type { DeleteConfirmationKind } from "@/lib/workspace/delete-confirmation-copy";
import { formatDimensions } from "@/lib/workspace/dimension-format";
import { getWorkspaceSectionTitle } from "@/lib/workspace/layout-sections";
import type { BlockDefinition, BlockTemplate } from "@/lib/workspace/types";
import { NumberFieldInput } from "./number-field-input";

const DRAFT_BLOCK_IMPORT_FORMAT_COLUMNS = [
  { name: "박스명", requirement: "필수", description: "2번 박스 등록에 저장된 박스명과 정확히 같아야 합니다." },
  { name: "작업수량", requirement: "필수", description: "이번 작업에 실을 수량입니다. 1 이상의 정수만 입력합니다." },
  { name: "적재위치타입", requirement: "필수", description: "1=기본, 2=아래우선 중 하나를 숫자로 입력합니다." }
] as const;

export interface DraftMergeNotice {
  draftBlockItemId: string;
  quantityAdded: number;
  totalQuantity: number;
}

export function CurrentWorkBlocksPanel({
  blocks,
  templates,
  mergeNotice,
  canResetCurrentWork,
  resetDisabled,
  resetDisabledReason,
  importDisabled,
  importDisabledReason,
  onQuantityChange,
  onLoadPriorityChange,
  onDeleteRequest,
  onRequestResetCurrentWork,
  onImportDraftBlocks
}: {
  blocks: BlockDefinition[];
  templates: BlockTemplate[];
  mergeNotice: DraftMergeNotice | null;
  canResetCurrentWork: boolean;
  resetDisabled: boolean;
  resetDisabledReason: string | null;
  importDisabled: boolean;
  importDisabledReason: string | null;
  onQuantityChange: (draftBlockItemId: string, quantity: number) => void;
  onLoadPriorityChange: (draftBlockItemId: string, loadPriority: DraftLoadPriorityOptionValue) => void;
  onDeleteRequest: (
    kind: DeleteConfirmationKind,
    entityId: string,
    name: string,
    trigger?: HTMLElement | null
  ) => void;
  onRequestResetCurrentWork: () => void;
  onImportDraftBlocks: (rows: DraftBlockImportCandidate[]) => void;
}) {
  const draftImportInputRef = useRef<HTMLInputElement>(null);
  const [draftImportDialogOpen, setDraftImportDialogOpen] = useState(false);
  const [draftImportFormatDialogOpen, setDraftImportFormatDialogOpen] = useState(false);
  const [draftImportPreview, setDraftImportPreview] = useState<DraftBlockImportPreview | null>(null);
  const [draftImportFileName, setDraftImportFileName] = useState("");
  const [draftImportLoading, setDraftImportLoading] = useState(false);
  const [draftImportNotice, setDraftImportNotice] = useState<string | null>(null);

  const closeDraftBlockImportDialog = () => {
    setDraftImportDialogOpen(false);
    setDraftImportPreview(null);
    setDraftImportFileName("");
  };

  const handleDraftImportFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    setDraftImportLoading(true);
    setDraftImportNotice(null);
    setDraftImportFileName(file.name);

    try {
      const preview = await readDraftBlockXlsxFile(file, {
        existingTemplates: templates.map((template) => ({
          blockTemplateId: template.blockTemplateId,
          name: template.name,
          dimensions: template.dimensions,
          weightKg: template.weightKg,
          fragile: template.fragile,
          group1: template.group1,
          group2: template.group2
        }))
      });
      setDraftImportPreview(preview);
    } catch (error) {
      setDraftImportPreview({
        rows: [],
        errors: [{ message: toErrorMessage(error) }],
        canImport: false
      });
    } finally {
      setDraftImportLoading(false);
      setDraftImportDialogOpen(true);
    }
  };

  const applyDraftBlockImport = () => {
    const preview = draftImportPreview;

    if (!preview || !preview.canImport || importDisabled) {
      return;
    }

    onImportDraftBlocks(preview.rows);
    setDraftImportNotice(`${preview.rows.length}개 박스를 현재 작업에 추가했습니다.`);
    closeDraftBlockImportDialog();
  };

  const openDraftImportFilePicker = () => {
    setDraftImportFormatDialogOpen(false);
    window.setTimeout(() => {
      draftImportInputRef.current?.click();
    }, 0);
  };

  const downloadDraftBlockImportSample = () => {
    const sample = createDraftBlockImportSampleWorkbook();
    const blob = new Blob([sample.bytes], { type: sample.mimeType });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = sample.fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    setDraftImportNotice("현재 작업 샘플 파일을 다운로드했습니다. 박스명, 작업수량, 적재위치타입을 바꿔 등록하세요.");
  };

  return (
    <section className="current-block-panel">
      <div className="current-work-head">
        <div className="section-head">
          <span className="section-index" aria-hidden="true">
            3
          </span>
          <div>
            <h2 id="current-work-title">{getWorkspaceSectionTitle("review")}</h2>
            <p className="panel-subtitle">이번에 실을 박스입니다. 수량 변경은 현재 작업에만 적용됩니다.</p>
          </div>
        </div>
        <div className="current-work-actions">
          <button
            className="secondary-button current-work-format-action"
            aria-haspopup="dialog"
            aria-controls="draft-block-import-format-dialog"
            onClick={() => setDraftImportFormatDialogOpen(true)}
          >
            <Eye size={16} />
            엑셀 포맷 보기
          </button>
          <button
            className="secondary-button current-work-import-action"
            onClick={() => draftImportInputRef.current?.click()}
            disabled={draftImportLoading || importDisabled}
            title={importDisabledReason ?? undefined}
            aria-describedby={importDisabled ? "current-work-import-disabled-reason" : undefined}
          >
            <FileUp size={16} />
            {draftImportLoading ? "파일 확인 중" : "엑셀로 등록하기"}
          </button>
          {importDisabled ? (
            <span id="current-work-import-disabled-reason" className="sr-only">
              최신본을 불러온 뒤 현재 작업 엑셀을 등록할 수 있습니다.
            </span>
          ) : null}
          <input
            ref={draftImportInputRef}
            className="file-input"
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={handleDraftImportFileChange}
          />
          <button
            className="secondary-button current-work-reset-action"
            onClick={onRequestResetCurrentWork}
            disabled={resetDisabled}
            title={resetDisabledReason ?? undefined}
            aria-describedby={canResetCurrentWork ? undefined : "current-work-reset-disabled-reason"}
          >
            <RotateCcw size={16} />
            새 작업 시작
          </button>
          {!canResetCurrentWork ? (
            <span id="current-work-reset-disabled-reason" className="sr-only">
              비울 현재 작업이 없습니다.
            </span>
          ) : null}
        </div>
      </div>
      {draftImportNotice ? (
        <p className="fine-print" role="status">
          {draftImportNotice}
        </p>
      ) : null}
      <div className="block-list">
        {blocks.length === 0 ? (
          <p className="fine-print">박스를 추가하거나 새 박스를 저장 후 이번 작업에 추가하세요.</p>
        ) : (
          blocks.map((block) => (
            <article key={block.draftBlockItemId} className="block-card">
              <div className="block-summary-row">
                <div>
                  <strong>{block.name}</strong>
                  <p className="meta">{formatDimensions(block.dimensions)}</p>
                </div>
                <span className="badge" data-tone={block.fragile ? "amber" : undefined}>
                  {block.fragile ? "깨짐주의" : "일반"}
                </span>
              </div>
              {mergeNotice?.draftBlockItemId === block.draftBlockItemId ? (
                <p className="draft-merge-notice" role="status">
                  기존 카드에 {mergeNotice.quantityAdded}개 합산됨 · 총 {mergeNotice.totalQuantity}개
                </p>
              ) : null}
              <div className="block-detail-grid">
                <label>
                  이번 작업 수량(개)
                  <NumberFieldInput
                    aria-label="이번 작업 수량 개"
                    min={1}
                    value={block.quantity}
                    onValidValueChange={(quantity) => onQuantityChange(block.draftBlockItemId, quantity)}
                  />
                </label>
                <div className="draft-priority-control" role="group" aria-label={`${block.name} 배치 우선 설정`}>
                  <span>배치 우선</span>
                  <div className="draft-priority-options">
                    {DRAFT_LOAD_PRIORITY_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        className="secondary-button"
                        aria-pressed={normalizeDraftLoadPriorityOptionValue(block.loadPriority) === option.value}
                        onClick={() => onLoadPriorityChange(block.draftBlockItemId, option.value)}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="summary-tile compact draft-block-volume-tile">
                  <span>총 부피</span>
                  <strong>{formatBlockVolumeM3(block)}</strong>
                </div>
                <button
                  className="danger-button draft-block-remove-action"
                  onClick={(event) =>
                    onDeleteRequest("draft-block", block.draftBlockItemId, block.name, event.currentTarget)
                  }
                >
                  <Trash2 size={16} />
                  이번 작업에서 제거
                </button>
              </div>
            </article>
          ))
        )}
      </div>
      <DraftBlockImportDialog
        open={draftImportDialogOpen}
        fileName={draftImportFileName}
        preview={draftImportPreview}
        confirmDisabled={importDisabled}
        onClose={closeDraftBlockImportDialog}
        onConfirm={applyDraftBlockImport}
      />
      <DraftBlockImportFormatDialog
        open={draftImportFormatDialogOpen}
        onClose={() => setDraftImportFormatDialogOpen(false)}
        onDownloadSample={downloadDraftBlockImportSample}
        onPickFile={openDraftImportFilePicker}
      />
    </section>
  );
}

function DraftBlockImportDialog({
  open,
  fileName,
  preview,
  confirmDisabled,
  onClose,
  onConfirm
}: {
  open: boolean;
  fileName: string;
  preview: DraftBlockImportPreview | null;
  confirmDisabled: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const previewRows = preview?.rows ?? [];
  const previewErrors = preview?.errors ?? [];

  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog) {
      return;
    }

    if (open && !dialog.open) {
      dialog.showModal();
      window.setTimeout(() => {
        dialog.querySelector<HTMLButtonElement>("[data-draft-block-import-close='true']")?.focus();
      }, 0);
      return;
    }

    if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      id="draft-block-import-dialog"
      ref={dialogRef}
      className="block-template-import-dialog"
      aria-modal="true"
      aria-labelledby="draft-block-import-dialog-title"
      onClose={onClose}
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
      <div className="block-template-import-dialog-sheet">
        <div className="space-form-dialog-head">
          <div>
            <h2 id="draft-block-import-dialog-title">현재 작업 엑셀 미리보기</h2>
            <p className="fine-print">{fileName || "선택한 파일"} 내용을 이번 작업에 추가하기 전에 확인합니다.</p>
          </div>
          <button
            className="icon-button"
            data-draft-block-import-close="true"
            onClick={onClose}
            aria-label="현재 작업 엑셀 미리보기 닫기"
          >
            <X size={18} />
          </button>
        </div>
        <div className="block-template-import-dialog-body">
          <div className="block-template-import-summary">
            <div>
              <strong>추가할 박스 {previewRows.length}개</strong>
              <span className="fine-print">기존 저장 박스와 같은 이름이면 같은 박스로 연결됩니다.</span>
            </div>
            <div>
              <strong>오류 행 {previewErrors.length}개</strong>
              <span className="fine-print">오류가 없을 때만 현재 작업에 추가할 수 있습니다.</span>
            </div>
          </div>
          {previewErrors.length > 0 ? (
            <div className="block-template-import-error-list" role="alert">
              {previewErrors.map((error, index) => (
                <p key={`${error.rowNumber ?? "workbook"}-${error.field ?? "file"}-${index}`}>
                  {error.rowNumber ? `${error.rowNumber}행 · ` : ""}
                  {error.field ? `${error.field}: ` : ""}
                  {error.message}
                </p>
              ))}
            </div>
          ) : null}
          <div className="block-template-import-list" aria-label="현재 작업에 추가할 박스 미리보기">
            {previewRows.length === 0 ? (
              <p className="fine-print">현재 작업에 추가할 수 있는 박스가 없습니다.</p>
            ) : (
              previewRows.map((row) => (
                <article className="library-card" key={`${row.rowNumber}-${row.name}`}>
                  <div className="card-heading">
                    <strong>{row.name}</strong>
                    {row.fragile ? (
                      <span className="badge" data-tone="amber">
                        깨짐주의
                      </span>
                    ) : (
                      <span className="badge">일반</span>
                    )}
                  </div>
                  <p className="meta">{createDraftImportCandidateMeta(row)}</p>
                  {row.mergeSummary ? (
                    <p className="meta">{createDraftImportMergeSummaryCopy(row)}</p>
                  ) : null}
                  {row.warnings && row.warnings.length > 0 ? (
                    <div className="block-template-import-error-list" aria-label="기존 설정 유지 경고">
                      {row.warnings.map((warning) => (
                        <p key={warning}>{warning}</p>
                      ))}
                    </div>
                  ) : null}
                </article>
              ))
            )}
          </div>
          <div className="block-template-import-actions">
            <button className="secondary-button" onClick={onClose}>
              닫기
            </button>
            <button
              className="primary-button"
              onClick={onConfirm}
              disabled={!preview || !preview.canImport || confirmDisabled}
            >
              현재 작업에 추가
            </button>
          </div>
        </div>
      </div>
    </dialog>
  );
}

function DraftBlockImportFormatDialog({
  open,
  onClose,
  onDownloadSample,
  onPickFile
}: {
  open: boolean;
  onClose: () => void;
  onDownloadSample: () => void;
  onPickFile: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog) {
      return;
    }

    if (open && !dialog.open) {
      dialog.showModal();
      window.setTimeout(() => {
        dialog.querySelector<HTMLButtonElement>("[data-draft-block-format-close='true']")?.focus();
      }, 0);
      return;
    }

    if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      id="draft-block-import-format-dialog"
      ref={dialogRef}
      className="block-template-import-dialog block-template-import-format-dialog"
      aria-modal="true"
      aria-labelledby="draft-block-import-format-dialog-title"
      onClose={onClose}
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
      <div className="block-template-import-dialog-sheet">
        <div className="space-form-dialog-head">
          <div>
            <h2 id="draft-block-import-format-dialog-title">현재 작업 엑셀 등록 포맷</h2>
            <p className="fine-print">첫 행은 아래 열 이름과 동일해야 하며 .xlsx 파일만 지원합니다.</p>
          </div>
          <button
            className="icon-button"
            data-draft-block-format-close="true"
            onClick={onClose}
            aria-label="현재 작업 엑셀 등록 포맷 닫기"
          >
            <X size={18} />
          </button>
        </div>
        <div className="block-template-import-dialog-body">
          <div className="block-template-format-callout">
            <strong>이번 작업 물량 자동화 기준</strong>
            <span>
              저장된 박스명을 기준으로 작업수량과 적재위치타입만 가져옵니다. 자동으로 엑셀을 만들 때는
              열 순서를 바꾸지 말고 {DRAFT_BLOCK_XLSX_COLUMNS.join(" / ")} 순서로 내보내세요.
              적재위치타입은 1=기본, 2=아래우선 숫자만 사용할 수 있습니다.
            </span>
          </div>
          <div className="block-template-format-table-wrap" aria-label="현재 작업 엑셀 열 설명">
            <table className="block-template-format-table">
              <thead>
                <tr>
                  <th>열 이름</th>
                  <th>구분</th>
                  <th>입력 방법</th>
                </tr>
              </thead>
              <tbody>
                {DRAFT_BLOCK_IMPORT_FORMAT_COLUMNS.map((column) => (
                  <tr key={column.name}>
                    <th scope="row">{column.name}</th>
                    <td>{column.requirement}</td>
                    <td>{column.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="block-template-format-table-wrap" aria-label="현재 작업 엑셀 샘플 행">
            <table className="block-template-format-table">
              <thead>
                <tr>
                  {DRAFT_BLOCK_XLSX_COLUMNS.map((column) => (
                    <th key={column}>{column}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {DRAFT_BLOCK_IMPORT_SAMPLE_ROWS.map((row) => (
                  <tr key={row.join("-")}>
                    {row.map((cell, index) => (
                      <td key={`${row[0]}-${DRAFT_BLOCK_XLSX_COLUMNS[index]}`}>{cell || "-"}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="block-template-import-actions">
            <button className="secondary-button" onClick={onClose}>
              닫기
            </button>
            <button
              className="secondary-button"
              onClick={onDownloadSample}
              aria-label="현재 작업 샘플 파일 다운로드"
            >
              <Download size={16} />
              현재 작업 샘플 다운로드
            </button>
            <button className="primary-button" onClick={onPickFile}>
              이 포맷으로 파일 선택
            </button>
          </div>
        </div>
      </div>
    </dialog>
  );
}

function createDraftImportCandidateMeta(row: DraftBlockImportCandidate) {
  return [
    `${row.rowNumber}행`,
    `${row.quantity}개`,
    getDraftLoadPriorityLabel(normalizeDraftLoadPriorityOptionValue(row.loadPriority)),
    formatDimensions(row.dimensions),
    formatOptionalWeightDisplay(row.weightKg),
    row.group1 ? `상위 ${row.group1}` : "상위그룹 없음",
    row.group2 ? `하위 ${row.group2}` : "하위그룹 없음"
  ].join(" · ");
}

function createDraftImportMergeSummaryCopy(row: DraftBlockImportCandidate) {
  const summary = row.mergeSummary;

  if (!summary) {
    return "";
  }

  return [
    `합산된 행 ${summary.mergedRowNumbers.join(", ")}`,
    `기존 ${summary.baseQuantity}개 + 추가 ${summary.addedQuantity}개 = 합산 후 ${summary.mergedQuantity}개`
  ].join(" · ");
}

function formatOptionalWeightDisplay(weightKg: number | null | undefined) {
  if (typeof weightKg !== "number" || !Number.isFinite(weightKg)) {
    return "무게 미입력";
  }

  return `${weightKg}kg`;
}

function formatBlockVolumeM3(block: BlockDefinition) {
  if (!isValidBlockMeasurementInput(block)) {
    return "입력 확인 필요";
  }

  return formatM3(calculateBlockVolumeM3(block));
}

function formatM3(value: number) {
  if (!Number.isFinite(value)) {
    return "0.000m³";
  }

  return `${value.toFixed(3)}m³`;
}

function toErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }
  return "알 수 없는 오류가 발생했습니다.";
}
