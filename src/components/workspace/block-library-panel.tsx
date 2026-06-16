import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { Download, Eye, FileUp, PackagePlus, Trash2, X } from "lucide-react";
import { searchBlockTemplates } from "@/lib/workspace/block-library";
import {
  BLOCK_TEMPLATE_IMPORT_SAMPLE_ROWS,
  BLOCK_TEMPLATE_XLSX_COLUMNS,
  createBlockTemplateImportSampleWorkbook,
  readBlockTemplateXlsxFile,
  type BlockTemplateImportCandidate,
  type BlockTemplateImportPreview
} from "@/lib/workspace/block-template-xlsx-import";
import { createChildBlockGroups, createTopBlockGroups } from "@/lib/workspace/block-group-options";
import type { DeleteConfirmationKind } from "@/lib/workspace/delete-confirmation-copy";
import { formatDimensions } from "@/lib/workspace/dimension-format";
import type { BlockGroup, BlockTemplate } from "@/lib/workspace/types";

const BLOCK_LIBRARY_PAGE_SIZE = 12;

const BLOCK_TEMPLATE_IMPORT_FORMAT_COLUMNS = [
  { name: "상위그룹", requirement: "선택", description: "예: 금영, 엔터그레인. 비워도 되지만 자동화 파일에서는 같은 표기를 유지하세요." },
  { name: "하위그룹", requirement: "선택", description: "예: 스피커, 앰프. 상위그룹이 있을 때 함께 묶어 검색할 수 있습니다." },
  { name: "박스명", requirement: "필수", description: "저장된 박스명과 중복되지 않아야 합니다." },
  { name: "가로mm", requirement: "필수", description: "1 이상의 정수만 입력합니다." },
  { name: "세로mm", requirement: "필수", description: "1 이상의 정수만 입력합니다." },
  { name: "높이mm", requirement: "필수", description: "1 이상의 정수만 입력합니다." },
  { name: "무게kg", requirement: "선택", description: "소수 입력이 가능하며 비워둘 수 있습니다." },
  { name: "깨짐주의", requirement: "선택", description: "예/아니오, Y/N, true/false 형식을 사용할 수 있습니다." }
] as const;

export function BlockLibraryPanel({
  templates,
  blockGroups,
  onAddToDraft,
  onEdit,
  onImportTemplates,
  onDeleteRequest
}: {
  templates: BlockTemplate[];
  blockGroups: BlockGroup[];
  onAddToDraft: (template: BlockTemplate, quantity?: number) => void;
  onEdit: (template: BlockTemplate) => void;
  onImportTemplates: (rows: BlockTemplateImportCandidate[]) => void;
  onDeleteRequest: (
    kind: DeleteConfirmationKind,
    entityId: string,
    name: string,
    trigger?: HTMLElement | null
  ) => void;
}) {
  const [blockLibraryDialogOpen, setBlockLibraryDialogOpen] = useState(false);
  const blockImportInputRef = useRef<HTMLInputElement>(null);
  const [blockImportDialogOpen, setBlockImportDialogOpen] = useState(false);
  const [blockImportFormatDialogOpen, setBlockImportFormatDialogOpen] = useState(false);
  const [blockImportPreview, setBlockImportPreview] = useState<BlockTemplateImportPreview | null>(null);
  const [blockImportFileName, setBlockImportFileName] = useState("");
  const [blockImportLoading, setBlockImportLoading] = useState(false);
  const [blockImportNotice, setBlockImportNotice] = useState<string | null>(null);

  const handleEdit = (template: BlockTemplate) => {
    setBlockLibraryDialogOpen(false);
    onEdit(template);
  };

  const handleDeleteRequest = (
    kind: DeleteConfirmationKind,
    entityId: string,
    name: string,
    trigger?: HTMLElement | null
  ) => {
    setBlockLibraryDialogOpen(false);
    onDeleteRequest(kind, entityId, name, trigger);
  };

  const closeBlockImportDialog = () => {
    setBlockImportDialogOpen(false);
    setBlockImportPreview(null);
    setBlockImportFileName("");
  };

  const handleBlockImportFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    setBlockImportLoading(true);
    setBlockImportNotice(null);
    setBlockImportFileName(file.name);

    try {
      const preview = await readBlockTemplateXlsxFile(file, {
        existingTemplateNames: templates.map((template) => template.name)
      });
      setBlockImportPreview(preview);
    } catch (error) {
      setBlockImportPreview({
        rows: [],
        errors: [{ message: toErrorMessage(error) }],
        canImport: false
      });
    } finally {
      setBlockImportLoading(false);
      setBlockImportDialogOpen(true);
    }
  };

  const applyBlockTemplateImport = () => {
    const preview = blockImportPreview;

    if (!preview || !preview.canImport) {
      return;
    }

    onImportTemplates(preview.rows);
    setBlockImportNotice(`${preview.rows.length}개 박스를 저장했습니다.`);
    closeBlockImportDialog();
  };

  const openBlockImportFilePicker = () => {
    setBlockImportFormatDialogOpen(false);
    window.setTimeout(() => {
      blockImportInputRef.current?.click();
    }, 0);
  };

  const downloadBlockImportSample = () => {
    const sample = createBlockTemplateImportSampleWorkbook();
    const blob = new Blob([sample.bytes], { type: sample.mimeType });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = sample.fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    setBlockImportNotice("샘플 파일을 다운로드했습니다. 값을 바꾼 뒤 엑셀로 박스 일괄등록을 진행하세요.");
  };

  return (
    <section className="rail-section block-template-library">
      <h3>저장된 박스</h3>
      <p className="panel-subtitle">저장한 박스를 팝업에서 검색하고 이번 작업에 추가합니다.</p>
      <div className="block-library-summary-card">
        <div>
          <strong>{templates.length === 0 ? "저장된 박스 0개" : `저장된 박스 ${templates.length}개`}</strong>
          <span className="fine-print">상위/하위 그룹과 검색으로 필요한 박스를 찾습니다.</span>
        </div>
        <div className="block-library-summary-actions">
          <button
            className="primary-button"
            aria-haspopup="dialog"
            aria-controls="block-library-dialog"
            onClick={() => setBlockLibraryDialogOpen(true)}
            disabled={templates.length === 0}
          >
            <PackagePlus size={16} />
            저장된 박스 찾아 추가
          </button>
          <button
            className="secondary-button"
            aria-haspopup="dialog"
            aria-controls="block-template-import-format-dialog"
            onClick={() => setBlockImportFormatDialogOpen(true)}
          >
            <Eye size={16} />
            엑셀 포맷 보기
          </button>
          <button
            className="secondary-button"
            onClick={() => blockImportInputRef.current?.click()}
            disabled={blockImportLoading}
          >
            <FileUp size={16} />
            {blockImportLoading ? "파일 확인 중" : "엑셀로 박스 일괄등록"}
          </button>
          <input
            ref={blockImportInputRef}
            className="file-input"
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={handleBlockImportFileChange}
          />
        </div>
      </div>
      {blockImportNotice ? <p className="fine-print" role="status">{blockImportNotice}</p> : null}
      {templates.length === 0 ? (
        <p className="fine-print">저장된 박스가 없습니다. 왼쪽 입력 영역에서 첫 박스를 저장하세요.</p>
      ) : null}
      <BlockLibraryDialog
        open={blockLibraryDialogOpen}
        templates={templates}
        blockGroups={blockGroups}
        onClose={() => setBlockLibraryDialogOpen(false)}
        onAddToDraft={onAddToDraft}
        onEdit={handleEdit}
        onDeleteRequest={handleDeleteRequest}
      />
      <BlockTemplateImportDialog
        open={blockImportDialogOpen}
        fileName={blockImportFileName}
        preview={blockImportPreview}
        onClose={closeBlockImportDialog}
        onConfirm={applyBlockTemplateImport}
      />
      <BlockTemplateImportFormatDialog
        open={blockImportFormatDialogOpen}
        onClose={() => setBlockImportFormatDialogOpen(false)}
        onDownloadSample={downloadBlockImportSample}
        onPickFile={openBlockImportFilePicker}
      />
    </section>
  );
}

function BlockLibraryDialog({
  open,
  templates,
  blockGroups,
  onClose,
  onAddToDraft,
  onEdit,
  onDeleteRequest
}: {
  open: boolean;
  templates: BlockTemplate[];
  blockGroups: BlockGroup[];
  onClose: () => void;
  onAddToDraft: (template: BlockTemplate, quantity?: number) => void;
  onEdit: (template: BlockTemplate) => void;
  onDeleteRequest: (
    kind: DeleteConfirmationKind,
    entityId: string,
    name: string,
    trigger?: HTMLElement | null
  ) => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [blockLibrarySearchTerm, setBlockLibrarySearchTerm] = useState("");
  const [blockLibraryGroup1Filter, setBlockLibraryGroup1Filter] = useState("");
  const [blockLibraryGroup2Filter, setBlockLibraryGroup2Filter] = useState("");
  const [blockLibraryPage, setBlockLibraryPage] = useState(1);
  const blockLibraryGroup1Options = useMemo(() => createTopBlockGroups(blockGroups), [blockGroups]);
  const blockLibraryGroup2Options = useMemo(
    () => createChildBlockGroups(blockGroups, blockLibraryGroup1Filter),
    [blockGroups, blockLibraryGroup1Filter]
  );
  const searchedTemplates = searchBlockTemplates(templates, blockLibrarySearchTerm);
  const visibleTemplates = searchedTemplates.filter((template) => {
    const matchesGroup1 = !blockLibraryGroup1Filter || template.group1 === blockLibraryGroup1Filter;
    const matchesGroup2 = !blockLibraryGroup2Filter || template.group2 === blockLibraryGroup2Filter;
    return matchesGroup1 && matchesGroup2;
  });
  const blockLibraryPageCount = Math.max(1, Math.ceil(visibleTemplates.length / BLOCK_LIBRARY_PAGE_SIZE));
  const currentBlockLibraryPage = Math.min(blockLibraryPage, blockLibraryPageCount);
  const blockLibraryPageStart = (currentBlockLibraryPage - 1) * BLOCK_LIBRARY_PAGE_SIZE;
  const pagedTemplates = visibleTemplates.slice(
    blockLibraryPageStart,
    blockLibraryPageStart + BLOCK_LIBRARY_PAGE_SIZE
  );

  useEffect(() => {
    setBlockLibraryPage(1);
  }, [blockLibraryGroup1Filter, blockLibraryGroup2Filter, blockLibrarySearchTerm]);

  useEffect(() => {
    if (blockLibraryPage > blockLibraryPageCount) {
      setBlockLibraryPage(blockLibraryPageCount);
    }
  }, [blockLibraryPage, blockLibraryPageCount]);

  useEffect(() => {
    if (
      blockLibraryGroup2Filter &&
      !blockLibraryGroup2Options.some((group) => group.name === blockLibraryGroup2Filter)
    ) {
      setBlockLibraryGroup2Filter("");
    }
  }, [blockLibraryGroup2Filter, blockLibraryGroup2Options]);

  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog) {
      return;
    }

    if (open && !dialog.open) {
      dialog.showModal();
      window.setTimeout(() => {
        dialog.querySelector<HTMLInputElement>("[data-block-library-search='true']")?.focus();
      }, 0);
      return;
    }

    if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      id="block-library-dialog"
      ref={dialogRef}
      className="block-library-dialog"
      aria-modal="true"
      aria-labelledby="block-library-dialog-title"
      onClose={onClose}
    >
      <div className="block-library-dialog-sheet">
        <div className="space-form-dialog-head">
          <div>
            <h2 id="block-library-dialog-title">저장된 박스 찾기</h2>
            <p className="fine-print">검색하거나 그룹을 좁힌 뒤 이번 작업에 추가합니다.</p>
          </div>
          <button className="icon-button" data-block-library-close="true" onClick={onClose} aria-label="저장된 박스 찾기 닫기">
            <X size={18} />
          </button>
        </div>
        <div className="block-library-dialog-body">
          <div className="block-library-dialog-tools">
            <label className="block-library-search">
              저장된 박스 찾기
              <input
                data-block-library-search="true"
                aria-label="저장된 박스 검색"
                placeholder="박스명, 치수, 무게, 그룹 검색"
                value={blockLibrarySearchTerm}
                onChange={(event) => setBlockLibrarySearchTerm(event.target.value)}
              />
            </label>
            <div className="block-library-filters" aria-label="저장된 박스 그룹 필터">
              <label>
                상위그룹
                <select
                  aria-label="상위그룹 필터"
                  value={blockLibraryGroup1Filter}
                  onChange={(event) => {
                    setBlockLibraryGroup1Filter(event.target.value);
                    setBlockLibraryGroup2Filter("");
                  }}
                >
                  <option value="">전체 상위그룹</option>
                  {blockLibraryGroup1Options.map((group) => (
                    <option key={group.blockGroupId} value={group.name}>
                      {group.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                하위그룹
                <select
                  aria-label="하위그룹 필터"
                  value={blockLibraryGroup2Filter}
                  onChange={(event) => setBlockLibraryGroup2Filter(event.target.value)}
                  disabled={!blockLibraryGroup1Filter}
                >
                  <option value="">전체 하위그룹</option>
                  {blockLibraryGroup2Options.map((group) => (
                    <option key={group.blockGroupId} value={group.name}>
                      {group.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
          <p className="fine-print">
            검색 결과 {visibleTemplates.length}개 / 전체 {templates.length}개 · {currentBlockLibraryPage}/
            {blockLibraryPageCount} 페이지
          </p>
          <div className="block-library-dialog-list">
            {visibleTemplates.length === 0 ? (
              <p className="fine-print">검색 결과가 없습니다. 다른 이름이나 치수로 찾아보세요.</p>
            ) : (
              pagedTemplates.map((template) => (
                <article key={template.blockTemplateId} className="library-card">
                  <div className="card-heading">
                    <strong>{template.name}</strong>
                    {template.fragile ? (
                      <span className="badge" data-tone="amber">
                        깨짐주의
                      </span>
                    ) : (
                      <span className="badge">일반</span>
                    )}
                  </div>
                  <p className="meta">{createBlockTemplateCardMeta(template).join(" · ")}</p>
                  <div className="form-actions">
                    <button className="primary-button" onClick={() => onAddToDraft(template, 1)}>
                      이번 작업에 추가
                    </button>
                    <button className="secondary-button" onClick={() => onEdit(template)}>
                      수정
                    </button>
                    <button
                      className="danger-button"
                      aria-label={`저장된 박스 ${template.name} 삭제`}
                      onClick={(event) =>
                        onDeleteRequest("block-template", template.blockTemplateId, template.name, event.currentTarget)
                      }
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
          <div className="block-library-pagination" aria-label="저장된 박스 페이지 이동">
            <button
              className="secondary-button"
              onClick={() => setBlockLibraryPage((page) => Math.max(1, page - 1))}
              disabled={currentBlockLibraryPage <= 1}
            >
              이전 페이지
            </button>
            <span>
              {currentBlockLibraryPage} / {blockLibraryPageCount}
            </span>
            <button
              className="secondary-button"
              onClick={() => setBlockLibraryPage((page) => Math.min(blockLibraryPageCount, page + 1))}
              disabled={currentBlockLibraryPage >= blockLibraryPageCount}
            >
              다음 페이지
            </button>
          </div>
        </div>
      </div>
    </dialog>
  );
}

function BlockTemplateImportDialog({
  open,
  fileName,
  preview,
  onClose,
  onConfirm
}: {
  open: boolean;
  fileName: string;
  preview: BlockTemplateImportPreview | null;
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
        dialog.querySelector<HTMLButtonElement>("[data-block-template-import-close='true']")?.focus();
      }, 0);
      return;
    }

    if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      id="block-template-import-dialog"
      ref={dialogRef}
      className="block-template-import-dialog"
      aria-modal="true"
      aria-labelledby="block-template-import-dialog-title"
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
            <h2 id="block-template-import-dialog-title">엑셀 박스 일괄등록 미리보기</h2>
            <p className="fine-print">{fileName || "선택한 파일"} 내용을 저장 전에 확인합니다.</p>
          </div>
          <button
            className="icon-button"
            data-block-template-import-close="true"
            onClick={onClose}
            aria-label="엑셀 박스 일괄등록 미리보기 닫기"
          >
            <X size={18} />
          </button>
        </div>
        <div className="block-template-import-dialog-body">
          <div className="block-template-import-summary">
            <div>
              <strong>가져올 박스 {previewRows.length}개</strong>
              <span className="fine-print">오류가 없을 때만 저장할 수 있습니다.</span>
            </div>
            <div>
              <strong>오류 행 {previewErrors.length}개</strong>
              <span className="fine-print">행 번호와 사유를 확인한 뒤 엑셀을 수정하세요.</span>
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
          <div className="block-template-import-list" aria-label="가져올 박스 미리보기">
            {previewRows.length === 0 ? (
              <p className="fine-print">가져올 수 있는 박스가 없습니다.</p>
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
                  <p className="meta">{createImportCandidateMeta(row)}</p>
                </article>
              ))
            )}
          </div>
          <div className="block-template-import-actions">
            <button className="secondary-button" onClick={onClose}>
              닫기
            </button>
            <button className="primary-button" onClick={onConfirm} disabled={!preview || !preview.canImport}>
              일괄등록 적용
            </button>
          </div>
        </div>
      </div>
    </dialog>
  );
}

function BlockTemplateImportFormatDialog({
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
        dialog.querySelector<HTMLButtonElement>("[data-block-template-format-close='true']")?.focus();
      }, 0);
      return;
    }

    if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      id="block-template-import-format-dialog"
      ref={dialogRef}
      className="block-template-import-dialog block-template-import-format-dialog"
      aria-modal="true"
      aria-labelledby="block-template-import-format-dialog-title"
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
            <h2 id="block-template-import-format-dialog-title">엑셀 박스 일괄등록 포맷</h2>
            <p className="fine-print">첫 행은 아래 열 이름과 동일해야 하며 .xlsx 파일만 지원합니다.</p>
          </div>
          <button
            className="icon-button"
            data-block-template-format-close="true"
            onClick={onClose}
            aria-label="엑셀 박스 일괄등록 포맷 닫기"
          >
            <X size={18} />
          </button>
        </div>
        <div className="block-template-import-dialog-body">
          <div className="block-template-format-callout">
            <strong>업무 자동화 기준</strong>
            <span>
              자동으로 엑셀을 만들 때는 열 순서를 바꾸지 말고 {BLOCK_TEMPLATE_XLSX_COLUMNS.join(" / ")} 순서로
              내보내면 바로 등록할 수 있습니다.
            </span>
          </div>
          <div className="block-template-format-table-wrap" aria-label="엑셀 열 설명">
            <table className="block-template-format-table">
              <thead>
                <tr>
                  <th>열 이름</th>
                  <th>구분</th>
                  <th>입력 방법</th>
                </tr>
              </thead>
              <tbody>
                {BLOCK_TEMPLATE_IMPORT_FORMAT_COLUMNS.map((column) => (
                  <tr key={column.name}>
                    <th scope="row">{column.name}</th>
                    <td>{column.requirement}</td>
                    <td>{column.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="block-template-format-table-wrap" aria-label="엑셀 샘플 행">
            <table className="block-template-format-table">
              <thead>
                <tr>
                  {BLOCK_TEMPLATE_XLSX_COLUMNS.map((column) => (
                    <th key={column}>{column}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {BLOCK_TEMPLATE_IMPORT_SAMPLE_ROWS.map((row) => (
                  <tr key={row.join("-")}>
                    {row.map((cell, index) => (
                      <td key={`${row[2]}-${BLOCK_TEMPLATE_XLSX_COLUMNS[index]}`}>{cell || "-"}</td>
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
              aria-label="박스 일괄등록 샘플 파일 다운로드"
            >
              <Download size={16} />
              샘플 파일 다운로드
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

function createBlockTemplateCardMeta(template: BlockTemplate) {
  return [
    formatDimensions(template.dimensions),
    formatOptionalWeightDisplay(template.weightKg),
    template.group1 ? `상위 ${template.group1}` : "상위그룹 없음",
    template.group2 ? `하위 ${template.group2}` : "하위그룹 없음",
    `v${template.entityVersion}`
  ];
}

function createImportCandidateMeta(row: BlockTemplateImportCandidate) {
  return [
    `${row.rowNumber}행`,
    formatDimensions(row.dimensions),
    formatOptionalWeightDisplay(row.weightKg),
    row.group1 ? `상위 ${row.group1}` : "상위그룹 없음",
    row.group2 ? `하위 ${row.group2}` : "하위그룹 없음"
  ].join(" · ");
}

function formatOptionalWeightDisplay(weightKg: number | null | undefined) {
  if (typeof weightKg !== "number" || !Number.isFinite(weightKg)) {
    return "무게 미입력";
  }

  return `${weightKg}kg`;
}

function toErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "파일을 읽는 중 오류가 발생했습니다.";
}
