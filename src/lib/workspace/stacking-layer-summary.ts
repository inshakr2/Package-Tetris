import { PackedSpace } from "./types";

interface StackingLayerSummaryOptions {
  maxTypes?: number;
}

interface StackingInstructionTextOptions {
  calculatedAtLabel?: string;
  maxWarnings?: number;
  unloadedBlockCount?: number;
  warnings?: string[];
}

export interface StackingLayerSummary {
  layerIndex: number;
  zMm: number;
  heightLabel: string;
  blockCount: number;
  loadSummary: string;
}

export interface StackingInstructionStep {
  stepIndex: number;
  title: string;
  instruction: string;
  detail: string;
}

interface LayerGroup {
  zMm: number;
  blocks: PackedSpace["blocks"];
  firstIndex: number;
}

interface BlockTypeCount {
  blockTemplateId: string;
  name: string;
  quantity: number;
  firstIndex: number;
}

export function createStackingLayerSummaries(
  packedSpace: PackedSpace,
  options: StackingLayerSummaryOptions = {}
): StackingLayerSummary[] {
  if (packedSpace.blocks.length === 0) {
    return [];
  }

  const maxTypes = options.maxTypes ?? 2;
  const layerGroups = new Map<number, LayerGroup>();

  packedSpace.blocks.forEach((block, index) => {
    const existing = layerGroups.get(block.zMm);

    if (existing) {
      existing.blocks.push(block);
      return;
    }

    layerGroups.set(block.zMm, {
      zMm: block.zMm,
      blocks: [block],
      firstIndex: index
    });
  });

  return [...layerGroups.values()]
    .sort((left, right) => {
      if (left.zMm !== right.zMm) {
        return left.zMm - right.zMm;
      }

      return left.firstIndex - right.firstIndex;
    })
    .map((layer, index) => ({
      layerIndex: index + 1,
      zMm: layer.zMm,
      heightLabel: createHeightLabel(layer.zMm),
      blockCount: layer.blocks.length,
      loadSummary: createLayerLoadSummary(layer.blocks, maxTypes)
    }));
}

export function createStackingInstructionSteps(
  packedSpace: PackedSpace,
  options: StackingLayerSummaryOptions = {}
): StackingInstructionStep[] {
  return createStackingLayerSummaries(packedSpace, options).map((layer) => ({
    stepIndex: layer.layerIndex,
    title: `${layer.layerIndex}층`,
    instruction: createLayerInstruction(layer),
    detail: `${layer.heightLabel} · 총 ${layer.blockCount}개`
  }));
}

export function createStackingInstructionText(
  spaceLabel: string,
  steps: StackingInstructionStep[],
  options: StackingInstructionTextOptions = {}
): string {
  if (steps.length === 0) {
    return "";
  }

  const normalizedSpaceLabel = normalizeInstructionLine(spaceLabel) || "선택한 공간";
  const calculatedAtLabel = normalizeInstructionLine(options.calculatedAtLabel ?? "");
  const calculatedAtLines = calculatedAtLabel ? [`계산 시각: ${calculatedAtLabel}`] : [];
  const noticeLines = createStackingInstructionNoticeLines(options);
  const instructionLines = steps.map(
    (step) =>
      `${normalizeInstructionLine(step.title)}: ${normalizeInstructionLine(step.instruction)} (${normalizeInstructionLine(
        step.detail
      )})`
  );

  return [`${normalizedSpaceLabel} 쌓는 순서`, ...calculatedAtLines, ...noticeLines, ...instructionLines].join("\n");
}

export function createStackingInstructionSpaceLabel(
  spaceName: string | undefined,
  selectedPackedSpaceIndex: number
): string {
  const normalizedSpaceName = normalizeInstructionLine(spaceName ?? "");
  const spaceIndexLabel = selectedPackedSpaceIndex >= 0 ? `Space ${selectedPackedSpaceIndex + 1}` : "";

  if (normalizedSpaceName && spaceIndexLabel) {
    return `${normalizedSpaceName} · ${spaceIndexLabel}`;
  }

  return normalizedSpaceName || spaceIndexLabel || "선택한 공간";
}

export function formatStackingInstructionCalculatedAt(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return typeof value === "string" ? normalizeInstructionLine(value) : "";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function createHeightLabel(zMm: number): string {
  if (zMm === 0) {
    return "바닥층";
  }

  return `${zMm}mm 높이`;
}

function createLayerInstruction(layer: StackingLayerSummary): string {
  const objectParticle = getObjectParticle(layer.loadSummary);

  if (layer.zMm === 0) {
    return `${layer.loadSummary}${objectParticle} 바닥에 먼저 놓습니다.`;
  }

  return `${layer.loadSummary}${objectParticle} ${layer.heightLabel}에 올립니다.`;
}

function getObjectParticle(text: string): "을" | "를" {
  const lastChar = text.trim().at(-1);

  if (!lastChar) {
    return "를";
  }

  const charCode = lastChar.charCodeAt(0);
  const hangulStart = "가".charCodeAt(0);
  const hangulEnd = "힣".charCodeAt(0);

  if (charCode < hangulStart || charCode > hangulEnd) {
    return "를";
  }

  return (charCode - hangulStart) % 28 === 0 ? "를" : "을";
}

function normalizeInstructionLine(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function createStackingInstructionNoticeLines(options: StackingInstructionTextOptions): string[] {
  const noticeLines: string[] = [];
  const unloadedBlockCount = options.unloadedBlockCount ?? 0;

  if (unloadedBlockCount > 0) {
    noticeLines.push(
      `확인 필요: 미적재 박스 ${unloadedBlockCount}개가 있습니다. 결과 화면의 미적재 안내를 확인하세요.`
    );
  }

  const maxWarnings = options.maxWarnings ?? 2;
  const uniqueWarnings = createUniqueWarningMessages(options.warnings ?? []);
  const visibleWarnings = uniqueWarnings.slice(0, maxWarnings);
  const hiddenWarningCount = uniqueWarnings.length - visibleWarnings.length;

  visibleWarnings.forEach((warning) => {
    noticeLines.push(`확인 필요: ${warning}`);
  });

  if (hiddenWarningCount > 0) {
    noticeLines.push(`확인 필요: 외 ${hiddenWarningCount}건의 경고가 더 있습니다. 결과 화면을 확인하세요.`);
  }

  return noticeLines;
}

function createUniqueWarningMessages(warnings: string[]): string[] {
  const uniqueWarnings: string[] = [];
  const seenWarnings = new Set<string>();

  warnings.forEach((warning) => {
    const normalizedWarning = normalizeInstructionLine(warning);

    if (!normalizedWarning || seenWarnings.has(normalizedWarning)) {
      return;
    }

    uniqueWarnings.push(normalizedWarning);
    seenWarnings.add(normalizedWarning);
  });

  return uniqueWarnings;
}

function createLayerLoadSummary(blocks: PackedSpace["blocks"], maxTypes: number): string {
  const typeCounts = new Map<string, BlockTypeCount>();

  blocks.forEach((block, index) => {
    const groupKey = `${block.blockTemplateId}:${block.name}`;
    const existing = typeCounts.get(groupKey);

    if (existing) {
      existing.quantity += 1;
      return;
    }

    typeCounts.set(groupKey, {
      blockTemplateId: block.blockTemplateId,
      name: block.name,
      quantity: 1,
      firstIndex: index
    });
  });

  const sortedTypes = [...typeCounts.values()].sort((left, right) => {
    if (right.quantity !== left.quantity) {
      return right.quantity - left.quantity;
    }

    return left.firstIndex - right.firstIndex;
  });
  const visibleTypes = sortedTypes.slice(0, maxTypes).map((type) => `${type.name} ${type.quantity}개`);
  const hiddenTypeCount = sortedTypes.length - visibleTypes.length;

  if (hiddenTypeCount > 0) {
    visibleTypes.push(`외 ${hiddenTypeCount}종`);
  }

  return visibleTypes.join(" · ");
}
