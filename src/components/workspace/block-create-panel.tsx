import { useEffect, useMemo, useRef, useState } from "react";
import { PackagePlus, RotateCcw, Trash2, X } from "lucide-react";
import {
  compareBlockGroupNames,
  createChildBlockGroups,
  createTopBlockGroups
} from "@/lib/workspace/block-group-options";
import { getWorkspaceSectionTitle } from "@/lib/workspace/layout-sections";
import type { BlockGroup } from "@/lib/workspace/types";
import {
  NumberFieldInput,
  selectNumberFieldValue,
  type NumberFieldFormValue
} from "./number-field-input";

const BLOCK_GROUP_PAGE_SIZE = 10;

export interface BlockForm {
  name: string;
  widthMm: NumberFieldFormValue;
  depthMm: NumberFieldFormValue;
  heightMm: NumberFieldFormValue;
  weightKg: string;
  group1: string;
  group2: string;
  fragile: boolean;
}

export const DEFAULT_BLOCK_FORM: BlockForm = {
  name: "",
  widthMm: "",
  depthMm: "",
  heightMm: "",
  weightKg: "",
  group1: "",
  group2: "",
  fragile: false
};

export function BlockCreatePanel({
  form,
  error,
  editingTemplateId,
  blockGroups,
  onChange,
  onAddBlockGroup,
  onDeleteBlockGroup,
  onSave,
  onCancel
}: {
  form: BlockForm;
  error: string | null;
  editingTemplateId: string | null;
  blockGroups: BlockGroup[];
  onChange: (value: BlockForm) => void;
  onAddBlockGroup: (name: string, parentGroupId: string | null) => void;
  onDeleteBlockGroup: (group: BlockGroup, trigger?: HTMLElement | null) => void;
  onSave: (addToDraft: boolean) => void;
  onCancel: () => void;
}) {
  const [blockGroupRegister, setBlockGroupRegister] = useState({
    topName: "",
    parentGroupId: "",
    childName: ""
  });
  const [blockGroupDialogOpen, setBlockGroupDialogOpen] = useState(false);
  const topBlockGroups = useMemo(() => createTopBlockGroups(blockGroups), [blockGroups]);
  const childBlockGroups = useMemo(() => createChildBlockGroups(blockGroups, form.group1), [blockGroups, form.group1]);

  const saveTopGroup = () => {
    const groupName = blockGroupRegister.topName.trim();

    if (!groupName) {
      return;
    }

    onAddBlockGroup(groupName, null);
    onChange({ ...form, group1: groupName, group2: "" });
    setBlockGroupRegister((current) => ({ ...current, topName: "" }));
  };

  const saveChildGroup = () => {
    const groupName = blockGroupRegister.childName.trim();

    if (!groupName || !blockGroupRegister.parentGroupId) {
      return;
    }

    const parentGroup = blockGroups.find((group) => group.blockGroupId === blockGroupRegister.parentGroupId);
    onAddBlockGroup(groupName, blockGroupRegister.parentGroupId);

    if (parentGroup) {
      onChange({ ...form, group1: parentGroup.name, group2: groupName });
    }

    setBlockGroupRegister((current) => ({ ...current, childName: "" }));
  };

  return (
    <section>
      <div className="section-head">
        <span className="section-index" aria-hidden="true">
          2
        </span>
        <div>
          <h2 id="block-library-title">{getWorkspaceSectionTitle("blocks")}</h2>
          <p className="panel-subtitle">박스 크기와 분류 정보를 저장합니다. 수량은 이번 작업에 넣을 때 조정합니다.</p>
        </div>
      </div>
      <div className="block-template-form-rows block-template-form">
        <div className="form-row form-row-two block-template-name-row">
          <label>
            박스명
            <input
              placeholder="예: 스피커 박스"
              value={form.name}
              onChange={(event) => onChange({ ...form, name: event.target.value })}
            />
          </label>
          <label>
            무게(kg)
            <input
              aria-label="박스 무게 kg"
              inputMode="decimal"
              min="0"
              placeholder="선택 입력"
              step="0.1"
              type="number"
              value={form.weightKg}
              onClick={selectNumberFieldValue}
              onFocus={selectNumberFieldValue}
              onChange={(event) => onChange({ ...form, weightKg: event.target.value })}
            />
          </label>
        </div>
        <div className="form-row form-row-three block-template-dimension-row">
          <label>
            가로(mm)
            <NumberFieldInput
              aria-label="박스 가로 mm"
              allowEmpty
              min={1}
              value={form.widthMm}
              onEmptyValueChange={() => onChange({ ...form, widthMm: "" })}
              onValidValueChange={(widthMm) => onChange({ ...form, widthMm })}
            />
          </label>
          <label>
            세로(mm)
            <NumberFieldInput
              aria-label="박스 세로 mm"
              allowEmpty
              min={1}
              value={form.depthMm}
              onEmptyValueChange={() => onChange({ ...form, depthMm: "" })}
              onValidValueChange={(depthMm) => onChange({ ...form, depthMm })}
            />
          </label>
          <label>
            높이(mm)
            <NumberFieldInput
              aria-label="박스 높이 mm"
              allowEmpty
              min={1}
              value={form.heightMm}
              onEmptyValueChange={() => onChange({ ...form, heightMm: "" })}
              onValidValueChange={(heightMm) => onChange({ ...form, heightMm })}
            />
          </label>
        </div>
        <div className="form-row form-row-two block-template-group-row">
          <label>
            상위그룹
            <select
              aria-label="박스 상위그룹 선택"
              value={form.group1}
              onChange={(event) => onChange({ ...form, group1: event.target.value, group2: "" })}
            >
              <option value="">상위그룹 없음</option>
              {topBlockGroups.map((group) => (
                <option key={group.blockGroupId} value={group.name}>
                  {group.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            하위그룹
            <select
              aria-label="박스 하위그룹 선택"
              value={form.group2}
              onChange={(event) => onChange({ ...form, group2: event.target.value })}
              disabled={!form.group1}
            >
              <option value="">하위그룹 없음</option>
              {childBlockGroups.map((group) => (
                <option key={group.blockGroupId} value={group.name}>
                  {group.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="checkbox-line block-template-fragile-row">
          <input
            type="checkbox"
            checked={form.fragile}
            onChange={(event) => onChange({ ...form, fragile: event.target.checked })}
          />
          깨짐주의
        </label>
      </div>
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
      <details className="block-group-register">
        <summary>새 그룹 등록</summary>
        <div className="block-group-register-grid">
          <label>
            새 상위그룹명
            <input
              placeholder="예: 금영"
              value={blockGroupRegister.topName}
              onChange={(event) =>
                setBlockGroupRegister((current) => ({ ...current, topName: event.target.value }))
              }
            />
          </label>
          <button className="secondary-button" onClick={saveTopGroup} disabled={!blockGroupRegister.topName.trim()}>
            상위그룹 추가
          </button>
          <label>
            하위그룹을 넣을 상위
            <select
              value={blockGroupRegister.parentGroupId}
              onChange={(event) =>
                setBlockGroupRegister((current) => ({ ...current, parentGroupId: event.target.value }))
              }
            >
              <option value="">상위그룹 선택</option>
              {topBlockGroups.map((group) => (
                <option key={group.blockGroupId} value={group.blockGroupId}>
                  {group.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            새 하위그룹명
            <input
              placeholder="예: 스피커"
              value={blockGroupRegister.childName}
              onChange={(event) =>
                setBlockGroupRegister((current) => ({ ...current, childName: event.target.value }))
              }
            />
          </label>
          <button
            className="secondary-button"
            onClick={saveChildGroup}
            disabled={!blockGroupRegister.parentGroupId || !blockGroupRegister.childName.trim()}
          >
            하위그룹 추가
          </button>
        </div>
        <div className="block-group-register-actions">
          <span className="fine-print">등록된 그룹 {blockGroups.length}개</span>
          <button
            className="secondary-button"
            aria-haspopup="dialog"
            aria-controls="block-group-management-dialog"
            onClick={() => setBlockGroupDialogOpen(true)}
          >
            등록된 그룹 관리
          </button>
        </div>
      </details>
      <BlockGroupManagementDialog
        open={blockGroupDialogOpen}
        blockGroups={blockGroups}
        onClose={() => setBlockGroupDialogOpen(false)}
        onDeleteBlockGroup={onDeleteBlockGroup}
      />
      <div className="form-actions">
        <button className="primary-button" onClick={() => onSave(true)}>
          <PackagePlus size={16} />
          {editingTemplateId ? "박스 수정" : "저장 후 1개 추가"}
        </button>
        {!editingTemplateId ? (
          <button className="secondary-button" onClick={() => onSave(false)}>
            저장만 하기
          </button>
        ) : (
          <button className="secondary-button" onClick={onCancel}>
            <RotateCcw size={16} />
            취소
          </button>
        )}
      </div>
    </section>
  );
}

function BlockGroupManagementDialog({
  open,
  blockGroups,
  onClose,
  onDeleteBlockGroup
}: {
  open: boolean;
  blockGroups: BlockGroup[];
  onClose: () => void;
  onDeleteBlockGroup: (group: BlockGroup, trigger?: HTMLElement | null) => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [blockGroupSearchTerm, setBlockGroupSearchTerm] = useState("");
  const [blockGroupPage, setBlockGroupPage] = useState(1);
  const topBlockGroups = useMemo(() => createTopBlockGroups(blockGroups), [blockGroups]);
  const normalizedSearchTerm = blockGroupSearchTerm.trim().toLocaleLowerCase("ko-KR");
  const visibleGroups = topBlockGroups.filter((group) => {
    if (!normalizedSearchTerm) {
      return true;
    }

    const childNames = blockGroups
      .filter((childGroup) => childGroup.parentGroupId === group.blockGroupId)
      .map((childGroup) => childGroup.name)
      .join(" ");

    return `${group.name} ${childNames}`.toLocaleLowerCase("ko-KR").includes(normalizedSearchTerm);
  });
  const blockGroupPageCount = Math.max(1, Math.ceil(visibleGroups.length / BLOCK_GROUP_PAGE_SIZE));
  const currentBlockGroupPage = Math.min(blockGroupPage, blockGroupPageCount);
  const blockGroupPageStart = (currentBlockGroupPage - 1) * BLOCK_GROUP_PAGE_SIZE;
  const pagedGroups = visibleGroups.slice(blockGroupPageStart, blockGroupPageStart + BLOCK_GROUP_PAGE_SIZE);

  useEffect(() => {
    setBlockGroupPage(1);
  }, [blockGroupSearchTerm]);

  useEffect(() => {
    if (blockGroupPage > blockGroupPageCount) {
      setBlockGroupPage(blockGroupPageCount);
    }
  }, [blockGroupPage, blockGroupPageCount]);

  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog) {
      return;
    }

    if (open && !dialog.open) {
      dialog.showModal();
      window.setTimeout(() => {
        dialog.querySelector<HTMLInputElement>("[data-block-group-search='true']")?.focus();
      }, 0);
      return;
    }

    if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  const requestGroupDelete = (group: BlockGroup, trigger: HTMLElement) => {
    onClose();
    onDeleteBlockGroup(group, trigger);
  };

  return (
    <dialog
      id="block-group-management-dialog"
      ref={dialogRef}
      className="block-group-management-dialog"
      aria-modal="true"
      aria-labelledby="block-group-management-dialog-title"
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
      <div className="block-group-management-dialog-sheet">
        <div className="space-form-dialog-head">
          <div>
            <h2 id="block-group-management-dialog-title">등록된 그룹 관리</h2>
            <p className="fine-print">상위/하위 그룹을 검색하고 필요 없는 분류를 삭제합니다.</p>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="등록된 그룹 관리 닫기">
            <X size={18} />
          </button>
        </div>
        <div className="block-group-management-dialog-body">
          <label className="block-group-management-search">
            등록된 그룹 찾기
            <input
              data-block-group-search="true"
              aria-label="등록된 그룹 검색"
              placeholder="상위그룹, 하위그룹 검색"
              value={blockGroupSearchTerm}
              onChange={(event) => setBlockGroupSearchTerm(event.target.value)}
            />
          </label>
          <p className="fine-print">
            검색 결과 {visibleGroups.length}개 / 전체 {topBlockGroups.length}개 · {currentBlockGroupPage}/
            {blockGroupPageCount} 페이지
          </p>
          <div className="block-group-management-dialog-list">
            {topBlockGroups.length === 0 ? (
              <p className="fine-print">등록된 그룹이 아직 없습니다.</p>
            ) : visibleGroups.length === 0 ? (
              <p className="fine-print">검색 결과가 없습니다. 다른 그룹명으로 찾아보세요.</p>
            ) : (
              pagedGroups.map((group) => {
                const children = blockGroups
                  .filter((candidate) => candidate.parentGroupId === group.blockGroupId)
                  .sort(compareBlockGroupNames);

                return (
                  <article className="block-group-card" key={group.blockGroupId}>
                    <div className="block-group-card-head">
                      <strong>{group.name}</strong>
                      <button
                        className="danger-button icon-button"
                        aria-label={`상위 그룹 ${group.name} 삭제`}
                        onClick={(event) => requestGroupDelete(group, event.currentTarget)}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                    <div className="block-group-children">
                      {children.length === 0 ? (
                        <span className="fine-print">하위 그룹 없음</span>
                      ) : (
                        children.map((childGroup) => (
                          <span className="block-group-chip" key={childGroup.blockGroupId}>
                            {childGroup.name}
                            <button
                              className="danger-button icon-button"
                              aria-label={`하위 그룹 ${childGroup.name} 삭제`}
                              onClick={(event) => requestGroupDelete(childGroup, event.currentTarget)}
                            >
                              <Trash2 size={14} />
                            </button>
                          </span>
                        ))
                      )}
                    </div>
                  </article>
                );
              })
            )}
          </div>
          <div className="block-group-pagination" aria-label="등록된 그룹 페이지 이동">
            <button
              className="secondary-button"
              onClick={() => setBlockGroupPage((page) => Math.max(1, page - 1))}
              disabled={currentBlockGroupPage <= 1}
            >
              이전 페이지
            </button>
            <span>
              {currentBlockGroupPage} / {blockGroupPageCount}
            </span>
            <button
              className="secondary-button"
              onClick={() => setBlockGroupPage((page) => Math.min(blockGroupPageCount, page + 1))}
              disabled={currentBlockGroupPage >= blockGroupPageCount}
            >
              다음 페이지
            </button>
          </div>
        </div>
      </div>
    </dialog>
  );
}
