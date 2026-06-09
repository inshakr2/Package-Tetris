import {
  BlockDefinition,
  BlockTemplate,
  Dimensions,
  DraftBlockItem,
  TetrisWorkspace
} from "./types";

interface CreateBlockTemplateOptions {
  blockTemplateId: string;
  name: string;
  dimensions: Dimensions;
  fragile: boolean;
  quantity: number;
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
    createdAt: options.now,
    updatedAt: options.now
  };

  const nextWorkspace = {
    ...touchDraft(workspace, options.now),
    blockTemplates: [...workspace.blockTemplates, template]
  };

  if (!options.addToDraft) {
    return nextWorkspace;
  }

  return addBlockTemplateToDraft(nextWorkspace, {
    draftBlockItemId: `item-${options.blockTemplateId}`,
    blockTemplateId: options.blockTemplateId,
    quantity: options.quantity,
    now: options.now
  });
}

export function updateBlockTemplate(
  workspace: TetrisWorkspace,
  options: UpdateBlockTemplateOptions
): TetrisWorkspace {
  return {
    ...touchDraft(workspace, options.now),
    blockTemplates: workspace.blockTemplates.map((template) =>
      template.blockTemplateId === options.blockTemplateId
        ? {
            ...template,
            entityVersion: template.entityVersion + 1,
            name: options.name,
            dimensions: options.dimensions,
            fragile: options.fragile,
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
      template.fragile ? "깨짐주의" : "일반"
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
