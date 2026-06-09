import type { BlockTemplate, Dimensions, TetrisWorkspace } from "./types";

interface FieldDemoBlockTemplate {
  blockTemplateId: string;
  draftBlockItemId: string;
  name: string;
  dimensions: Dimensions;
  fragile: boolean;
  quantity: number;
}

const FIELD_DEMO_SPACE_ID = "preset-truck-2_5-ton-class";

const FIELD_DEMO_BLOCK_TEMPLATES: FieldDemoBlockTemplate[] = [
  {
    blockTemplateId: "field-demo-template-standard-carton",
    draftBlockItemId: "field-demo-item-standard-carton",
    name: "시연 일반 박스",
    dimensions: { widthMm: 520, depthMm: 360, heightMm: 180 },
    fragile: false,
    quantity: 24
  },
  {
    blockTemplateId: "field-demo-template-fragile-carton",
    draftBlockItemId: "field-demo-item-fragile-carton",
    name: "시연 깨짐주의 박스",
    dimensions: { widthMm: 400, depthMm: 300, heightMm: 160 },
    fragile: true,
    quantity: 8
  },
  {
    blockTemplateId: "field-demo-template-long-carton",
    draftBlockItemId: "field-demo-item-long-carton",
    name: "시연 긴 박스",
    dimensions: { widthMm: 900, depthMm: 300, heightMm: 180 },
    fragile: false,
    quantity: 4
  }
];

export const FIELD_DEMO_BLOCK_TEMPLATE_IDS = FIELD_DEMO_BLOCK_TEMPLATES.map(
  (template) => template.blockTemplateId
);

export function loadFieldDemoCurrentWork(workspace: TetrisWorkspace, now: string): TetrisWorkspace {
  const nextBlockTemplates = upsertFieldDemoBlockTemplates(workspace.blockTemplates, now);

  return {
    ...workspace,
    revision: workspace.revision + 1,
    updatedAt: now,
    blockTemplates: nextBlockTemplates,
    draft: {
      selectedSpaceId: FIELD_DEMO_SPACE_ID,
      blockItems: FIELD_DEMO_BLOCK_TEMPLATES.map((template) => ({
        draftBlockItemId: template.draftBlockItemId,
        blockTemplateId: template.blockTemplateId,
        quantity: template.quantity,
        createdAt: now,
        updatedAt: now
      })),
      currentStep: "blocks",
      updatedAt: now
    },
    recentResults: [],
    chainHistory: []
  };
}

function upsertFieldDemoBlockTemplates(templates: BlockTemplate[], now: string) {
  const demoTemplateIds = new Set(FIELD_DEMO_BLOCK_TEMPLATE_IDS);
  const seenDemoTemplateIds = new Set<string>();
  const nextTemplates = templates.map((template) => {
    const demoTemplate = FIELD_DEMO_BLOCK_TEMPLATES.find(
      (candidate) => candidate.blockTemplateId === template.blockTemplateId
    );

    if (!demoTemplate) {
      return template;
    }

    seenDemoTemplateIds.add(demoTemplate.blockTemplateId);
    return createFieldDemoBlockTemplate(demoTemplate, template, now);
  });

  const missingDemoTemplates = FIELD_DEMO_BLOCK_TEMPLATES.filter(
    (template) => demoTemplateIds.has(template.blockTemplateId) && !seenDemoTemplateIds.has(template.blockTemplateId)
  ).map((template) => createFieldDemoBlockTemplate(template, null, now));

  return [...nextTemplates, ...missingDemoTemplates];
}

function createFieldDemoBlockTemplate(
  demoTemplate: FieldDemoBlockTemplate,
  existingTemplate: BlockTemplate | null,
  now: string
): BlockTemplate {
  if (existingTemplate && isSameFieldDemoBlockTemplate(existingTemplate, demoTemplate)) {
    return existingTemplate;
  }

  return {
    blockTemplateId: demoTemplate.blockTemplateId,
    entityVersion: existingTemplate ? existingTemplate.entityVersion + 1 : 1,
    name: demoTemplate.name,
    dimensions: demoTemplate.dimensions,
    fragile: demoTemplate.fragile,
    createdAt: existingTemplate?.createdAt ?? now,
    updatedAt: now
  };
}

function isSameFieldDemoBlockTemplate(template: BlockTemplate, demoTemplate: FieldDemoBlockTemplate) {
  return (
    template.name === demoTemplate.name &&
    template.fragile === demoTemplate.fragile &&
    template.dimensions.widthMm === demoTemplate.dimensions.widthMm &&
    template.dimensions.depthMm === demoTemplate.dimensions.depthMm &&
    template.dimensions.heightMm === demoTemplate.dimensions.heightMm
  );
}
