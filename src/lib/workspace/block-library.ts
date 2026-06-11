import {
  BlockDefinition,
  BlockTemplate,
  Dimensions,
  DraftBlockItem,
  TetrisWorkspace
} from "./types";
import {
  deriveBlockGroupsFromTemplates,
  ensureBlockGroupsForNames,
  upsertBlockGroup
} from "./block-groups";
import { normalizeLoadPriority } from "./load-priority";

interface CreateBlockTemplateOptions {
  blockTemplateId: string;
  name: string;
  dimensions: Dimensions;
  fragile: boolean;
  weightKg?: number | null;
  group1?: string;
  group2?: string;
  quantity?: number;
  addToDraft: boolean;
  now: string;
}

interface AddBlockTemplateToDraftOptions {
  draftBlockItemId: string;
  blockTemplateId: string;
  quantity: number;
  now: string;
}

interface UpdateDraftBlockItemQuantityOptions {
  draftBlockItemId: string;
  quantity: number;
  now: string;
}

interface UpdateDraftBlockItemLoadPriorityOptions {
  draftBlockItemId: string;
  loadPriority: number | null;
  now: string;
}

interface RemoveDraftBlockItemOptions {
  draftBlockItemId: string;
  now: string;
}

interface RestoreDraftBlockItemOptions {
  item: DraftBlockItem;
  index: number;
  now: string;
}

interface UpdateBlockTemplateOptions {
  blockTemplateId: string;
  name: string;
  dimensions: Dimensions;
  fragile: boolean;
  weightKg?: number | null;
  group1?: string;
  group2?: string;
  now: string;
}

interface CreateBlockGroupOptions {
  name: string;
  parentGroupId: string | null;
  now: string;
}

interface RemoveBlockGroupOptions {
  blockGroupId: string;
  now: string;
}

interface RemoveBlockTemplateOptions {
  blockTemplateId: string;
  now: string;
}

export function createBlockTemplate(
  workspace: TetrisWorkspace,
  options: CreateBlockTemplateOptions
): TetrisWorkspace {
  const template: BlockTemplate = {
    blockTemplateId: options.blockTemplateId,
    entityVersion: 1,
    name: options.name,
    dimensions: options.dimensions,
    fragile: options.fragile,
    weightKg: normalizeOptionalWeightKg(options.weightKg),
    group1: normalizeOptionalTemplateText(options.group1),
    group2: normalizeOptionalTemplateText(options.group2),
    createdAt: options.now,
    updatedAt: options.now
  };

  const nextWorkspace = {
    ...touchDraft(workspace, options.now),
    blockGroups: ensureBlockGroupsForNames(
      workspace.blockGroups ?? [],
      template.group1,
      template.group2,
      options.now
    ),
    blockTemplates: [...workspace.blockTemplates, template]
  };

  if (!options.addToDraft) {
    return nextWorkspace;
  }

  return addBlockTemplateToDraft(nextWorkspace, {
    draftBlockItemId: `item-${options.blockTemplateId}`,
    blockTemplateId: options.blockTemplateId,
    quantity: options.quantity ?? 1,
    now: options.now
  });
}

export function updateBlockTemplate(
  workspace: TetrisWorkspace,
  options: UpdateBlockTemplateOptions
): TetrisWorkspace {
  const nextBlockTemplates = workspace.blockTemplates.map((template) =>
    template.blockTemplateId === options.blockTemplateId
      ? {
          ...template,
          entityVersion: template.entityVersion + 1,
          name: options.name,
          dimensions: options.dimensions,
          fragile: options.fragile,
          weightKg: "weightKg" in options ? normalizeOptionalWeightKg(options.weightKg) : template.weightKg ?? null,
          group1: "group1" in options ? normalizeOptionalTemplateText(options.group1) : template.group1,
          group2: "group2" in options ? normalizeOptionalTemplateText(options.group2) : template.group2,
          updatedAt: options.now
        }
      : template
  );

  return {
    ...touchDraft(workspace, options.now),
    blockGroups: deriveBlockGroupsFromTemplates(nextBlockTemplates, workspace.blockGroups ?? [], options.now),
    blockTemplates: nextBlockTemplates
  };
}

export function createBlockGroup(
  workspace: TetrisWorkspace,
  options: CreateBlockGroupOptions
): TetrisWorkspace {
  return {
    ...touchDraft(workspace, options.now),
    blockGroups: upsertBlockGroup(workspace.blockGroups ?? [], {
      name: options.name,
      parentGroupId: options.parentGroupId,
      now: options.now
    })
  };
}

export function removeBlockGroup(
  workspace: TetrisWorkspace,
  options: RemoveBlockGroupOptions
): TetrisWorkspace {
  const targetGroup = workspace.blockGroups.find((group) => group.blockGroupId === options.blockGroupId);

  if (!targetGroup) {
    return workspace;
  }

  if (targetGroup.parentGroupId === null) {
    const childGroupIds = new Set(
      workspace.blockGroups
        .filter((group) => group.parentGroupId === targetGroup.blockGroupId)
        .map((group) => group.blockGroupId)
    );

    return {
      ...touchDraft(workspace, options.now),
      blockGroups: workspace.blockGroups.filter(
        (group) => group.blockGroupId !== targetGroup.blockGroupId && !childGroupIds.has(group.blockGroupId)
      ),
      blockTemplates: workspace.blockTemplates.map((template) =>
        template.group1 === targetGroup.name
          ? {
              ...template,
              entityVersion: template.entityVersion + 1,
              group1: undefined,
              group2: undefined,
              updatedAt: options.now
            }
          : template
      )
    };
  }

  const parentGroup = workspace.blockGroups.find((group) => group.blockGroupId === targetGroup.parentGroupId);

  return {
    ...touchDraft(workspace, options.now),
    blockGroups: workspace.blockGroups.filter((group) => group.blockGroupId !== targetGroup.blockGroupId),
    blockTemplates: workspace.blockTemplates.map((template) =>
      template.group1 === parentGroup?.name && template.group2 === targetGroup.name
        ? {
            ...template,
            entityVersion: template.entityVersion + 1,
            group2: undefined,
            updatedAt: options.now
          }
        : template
    )
  };
}

export function removeBlockTemplate(
  workspace: TetrisWorkspace,
  options: RemoveBlockTemplateOptions
): TetrisWorkspace {
  return {
    ...touchDraft(workspace, options.now),
    blockTemplates: workspace.blockTemplates.filter(
      (template) => template.blockTemplateId !== options.blockTemplateId
    ),
    draft: {
      ...workspace.draft,
      blockItems: workspace.draft.blockItems.filter(
        (item) => item.blockTemplateId !== options.blockTemplateId
      ),
      updatedAt: options.now
    }
  };
}

export function addBlockTemplateToDraft(
  workspace: TetrisWorkspace,
  options: AddBlockTemplateToDraftOptions
): TetrisWorkspace {
  const item: DraftBlockItem = {
    draftBlockItemId: options.draftBlockItemId,
    blockTemplateId: options.blockTemplateId,
    quantity: Math.max(1, options.quantity),
    createdAt: options.now,
    updatedAt: options.now
  };

  return {
    ...touchDraft(workspace, options.now),
    draft: {
      ...workspace.draft,
      blockItems: [...workspace.draft.blockItems, item],
      currentStep: "blocks",
      updatedAt: options.now
    }
  };
}

export function updateDraftBlockItemQuantity(
  workspace: TetrisWorkspace,
  options: UpdateDraftBlockItemQuantityOptions
): TetrisWorkspace {
  return {
    ...touchDraft(workspace, options.now),
    draft: {
      ...workspace.draft,
      blockItems: workspace.draft.blockItems.map((item) =>
        item.draftBlockItemId === options.draftBlockItemId
          ? {
              ...item,
              quantity: Math.max(1, options.quantity),
              updatedAt: options.now
            }
          : item
      ),
      updatedAt: options.now
    }
  };
}

export function updateDraftBlockItemLoadPriority(
  workspace: TetrisWorkspace,
  options: UpdateDraftBlockItemLoadPriorityOptions
): TetrisWorkspace {
  return {
    ...touchDraft(workspace, options.now),
    draft: {
      ...workspace.draft,
      blockItems: workspace.draft.blockItems.map((item) =>
        item.draftBlockItemId === options.draftBlockItemId
          ? {
              ...item,
              loadPriority: normalizeLoadPriority(options.loadPriority),
              updatedAt: options.now
            }
          : item
      ),
      updatedAt: options.now
    }
  };
}

export function removeDraftBlockItem(
  workspace: TetrisWorkspace,
  options: RemoveDraftBlockItemOptions
): TetrisWorkspace {
  return {
    ...touchDraft(workspace, options.now),
    draft: {
      ...workspace.draft,
      blockItems: workspace.draft.blockItems.filter(
        (item) => item.draftBlockItemId !== options.draftBlockItemId
      ),
      updatedAt: options.now
    }
  };
}

export function restoreDraftBlockItem(
  workspace: TetrisWorkspace,
  options: RestoreDraftBlockItemOptions
): TetrisWorkspace {
  const hasDuplicateDraftItem = workspace.draft.blockItems.some(
    (item) => item.draftBlockItemId === options.item.draftBlockItemId
  );

  if (hasDuplicateDraftItem) {
    return workspace;
  }

  const hasLinkedTemplate = workspace.blockTemplates.some(
    (template) => template.blockTemplateId === options.item.blockTemplateId
  );

  if (!hasLinkedTemplate) {
    return workspace;
  }

  const nextIndex = Math.min(Math.max(0, options.index), workspace.draft.blockItems.length);
  const nextBlockItems = [...workspace.draft.blockItems];
  nextBlockItems.splice(nextIndex, 0, options.item);

  return {
    ...workspace,
    revision: workspace.revision + 1,
    updatedAt: options.now,
    draft: {
      ...workspace.draft,
      blockItems: nextBlockItems,
      currentStep: "blocks",
      updatedAt: options.now
    }
  };
}

export function searchBlockTemplates(templates: BlockTemplate[], searchTerm: string) {
  const normalizedSearchTerm = searchTerm.trim().toLocaleLowerCase("ko-KR");

  if (!normalizedSearchTerm) {
    return templates;
  }

  return templates.filter((template) => {
    const searchableText = [
      template.name,
      template.dimensions.widthMm,
      template.dimensions.depthMm,
      template.dimensions.heightMm,
      template.fragile ? "깨짐주의" : "일반",
      formatSearchableWeight(template.weightKg),
      template.group1,
      template.group2
    ]
      .join(" ")
      .toLocaleLowerCase("ko-KR");

    return searchableText.includes(normalizedSearchTerm);
  });
}

export function resolveDraftBlocks(workspace: TetrisWorkspace): BlockDefinition[] {
  return workspace.draft.blockItems.flatMap((item) => {
    const template = workspace.blockTemplates.find(
      (candidate) => candidate.blockTemplateId === item.blockTemplateId
    );

    if (!template) {
      return [];
    }

    return [
      {
        blockId: `${item.draftBlockItemId}-${template.blockTemplateId}`,
        blockTemplateId: template.blockTemplateId,
        draftBlockItemId: item.draftBlockItemId,
        entityVersion: template.entityVersion,
        name: template.name,
        dimensions: template.dimensions,
        quantity: item.quantity,
        fragile: template.fragile,
        weightKg: template.weightKg,
        group1: template.group1,
        group2: template.group2,
        loadPriority: item.loadPriority,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt
      }
    ];
  });
}

function touchDraft(workspace: TetrisWorkspace, now: string): TetrisWorkspace {
  return {
    ...workspace,
    revision: workspace.revision + 1,
    updatedAt: now,
    draft: {
      ...workspace.draft,
      updatedAt: now
    }
  };
}

function normalizeOptionalWeightKg(weightKg: number | null | undefined) {
  if (typeof weightKg !== "number" || !Number.isFinite(weightKg) || weightKg <= 0) {
    return null;
  }

  return weightKg;
}

function normalizeOptionalTemplateText(value: string | undefined) {
  const normalizedValue = value?.trim();
  return normalizedValue ? normalizedValue : undefined;
}

function formatSearchableWeight(weightKg: number | null | undefined) {
  if (typeof weightKg !== "number" || !Number.isFinite(weightKg)) {
    return "무게 미입력";
  }

  return `${weightKg} ${weightKg}kg ${weightKg} kg`;
}
