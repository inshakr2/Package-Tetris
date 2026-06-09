import type { OptimizationInput, OptimizationOutput } from "./engine-contract";
import { validatePackedSpace } from "./packed-result-validation";
import { calculateUsableSize, PRESET_SPACES } from "./presets";
import type { BlockDefinition, SpaceDefinition } from "./types";

export interface FieldPackingScenario {
  name: string;
  input: OptimizationInput;
}

export interface FieldPackingScenarioAudit {
  scenarioCount: number;
  totalPackedBlockCount: number;
  totalUsedSpaceCount: number;
  failedScenarioNames: string[];
}

export interface FieldPackingScenarioPerformanceResult {
  name: string;
  elapsedMs: number;
  packedBlockCount: number;
  usedSpaceCount: number;
  unloadedBlockCount: number;
  isSafe: boolean;
  isWithinBudget: boolean;
}

export interface FieldPackingScenarioPerformanceAudit extends FieldPackingScenarioAudit {
  totalElapsedMs: number;
  slowScenarioNames: string[];
  scenarioResults: FieldPackingScenarioPerformanceResult[];
}

interface FieldPackingPerformanceAuditOptions {
  nowMs?: () => number;
  scenarioBudgetMs?: number;
}

type PackingEngineRunner = (input: OptimizationInput) => OptimizationOutput;

const TIMESTAMP = "2026-06-09T00:00:00.000Z";
const DEFAULT_SCENARIO_BUDGET_MS = 5000;

export function createFieldPackingScenarios(): FieldPackingScenario[] {
  return [
    createScenario({
      name: "파레트 기본 대량 혼합 박스",
      runId: "field-pallet-mixed",
      spaceId: "preset-pallet-1150",
      blocks: [
        createBlock("pallet-normal-500", "일반 박스 500", { widthMm: 500, depthMm: 500, heightMm: 450 }, 8),
        createBlock("pallet-flat-1000", "받침 판형 박스", { widthMm: 1000, depthMm: 1000, heightMm: 180 }, 2),
        createBlock("pallet-fragile-400", "깨짐주의 소형 박스", { widthMm: 400, depthMm: 400, heightMm: 320 }, 6, true)
      ]
    }),
    createScenario({
      name: "20ft GP 장척 박스 혼합",
      runId: "field-container-long-mixed",
      spaceId: "preset-container-20ft-gp",
      blocks: [
        createBlock("container-long-1200", "장척 박스 1200", { widthMm: 1200, depthMm: 800, heightMm: 600 }, 18),
        createBlock("container-normal-900", "중형 박스 900", { widthMm: 900, depthMm: 700, heightMm: 500 }, 14),
        createBlock("container-fragile-600", "깨짐주의 보조 박스", { widthMm: 600, depthMm: 400, heightMm: 450 }, 12, true)
      ]
    }),
    createScenario({
      name: "2.5톤반 낮은 짐칸 혼합",
      runId: "field-truck-low-deck",
      spaceId: "preset-truck-2_5-ton-class",
      blocks: [
        createBlock("truck-low-1000", "낮은 긴 박스", { widthMm: 1000, depthMm: 600, heightMm: 350 }, 8),
        createBlock("truck-low-700", "낮은 일반 박스", { widthMm: 700, depthMm: 450, heightMm: 320 }, 12),
        createBlock("truck-low-fragile-500", "낮은 깨짐주의 박스", { widthMm: 500, depthMm: 400, heightMm: 300 }, 10, true)
      ]
    })
  ];
}

export function runFieldPackingScenarioAudit(
  scenarios: FieldPackingScenario[],
  runPackingEngine: PackingEngineRunner
): FieldPackingScenarioAudit {
  const audit = runFieldPackingScenarioPerformanceAudit(scenarios, runPackingEngine);

  return {
    scenarioCount: audit.scenarioCount,
    totalPackedBlockCount: audit.totalPackedBlockCount,
    totalUsedSpaceCount: audit.totalUsedSpaceCount,
    failedScenarioNames: audit.failedScenarioNames
  };
}

export function runFieldPackingScenarioPerformanceAudit(
  scenarios: FieldPackingScenario[],
  runPackingEngine: PackingEngineRunner,
  options: FieldPackingPerformanceAuditOptions = {}
): FieldPackingScenarioPerformanceAudit {
  const nowMs = options.nowMs ?? Date.now;
  const scenarioBudgetMs = options.scenarioBudgetMs ?? DEFAULT_SCENARIO_BUDGET_MS;
  const scenarioResults = scenarios.map((scenario) =>
    runFieldPackingScenarioPerformance(scenario, runPackingEngine, nowMs, scenarioBudgetMs)
  );

  const failedScenarioNames = scenarioResults
    .filter((result) => !result.isSafe || result.unloadedBlockCount > 0)
    .map((result) => result.name);
  const slowScenarioNames = scenarioResults
    .filter((result) => !result.isWithinBudget)
    .map((result) => result.name);

  const totalPackedBlockCount = scenarioResults.reduce((sum, result) => sum + result.packedBlockCount, 0);
  const totalUsedSpaceCount = scenarioResults.reduce((sum, result) => sum + result.usedSpaceCount, 0);
  const totalElapsedMs = scenarioResults.reduce((sum, result) => sum + result.elapsedMs, 0);

  return {
    scenarioCount: scenarios.length,
    totalPackedBlockCount,
    totalUsedSpaceCount,
    totalElapsedMs,
    failedScenarioNames,
    slowScenarioNames,
    scenarioResults
  };
}

function runFieldPackingScenarioPerformance(
  scenario: FieldPackingScenario,
  runPackingEngine: PackingEngineRunner,
  nowMs: () => number,
  scenarioBudgetMs: number
): FieldPackingScenarioPerformanceResult {
  const startedAt = nowMs();
  const output = runPackingEngine(scenario.input);
  const finishedAt = nowMs();
  const elapsedMs = Math.max(0, Math.round(finishedAt - startedAt));
  const usableSize = calculateUsableSize(scenario.input.space);
  const policy = {
    fragileStackOnFragileAllowed: scenario.input.policy.fragileStackOnFragileAllowed,
    nonFragileOnFragileAllowed: scenario.input.policy.nonFragileOnFragileAllowed
  };
  const isSafe = output.spaces.every((space) => validatePackedSpace(space, usableSize, policy).isValid);
  const packedBlockCount = output.spaces.reduce((sum, space) => sum + space.blocks.length, 0);

  return {
    name: scenario.name,
    elapsedMs,
    packedBlockCount,
    usedSpaceCount: output.usedSpaceCount,
    unloadedBlockCount: output.unloadedBlockCount,
    isSafe,
    isWithinBudget: elapsedMs <= scenarioBudgetMs
  };
}

function createScenario({
  name,
  runId,
  spaceId,
  blocks
}: {
  name: string;
  runId: string;
  spaceId: string;
  blocks: BlockDefinition[];
}): FieldPackingScenario {
  return {
    name,
    input: {
      runId,
      space: findPresetSpace(spaceId),
      blocks,
      policy: {
        fragileStackOnFragileAllowed: true,
        nonFragileOnFragileAllowed: false,
        rotation: "orthogonal-90deg"
      }
    }
  };
}

function findPresetSpace(spaceId: string): SpaceDefinition {
  const space = PRESET_SPACES.find((candidate) => candidate.spaceId === spaceId);

  if (!space) {
    throw new Error(`field packing scenario preset not found: ${spaceId}`);
  }

  return space;
}

function createBlock(
  blockId: string,
  name: string,
  dimensions: BlockDefinition["dimensions"],
  quantity: number,
  fragile = false
): BlockDefinition {
  return {
    blockId,
    blockTemplateId: `template-${blockId}`,
    draftBlockItemId: `item-${blockId}`,
    entityVersion: 1,
    name,
    dimensions,
    quantity,
    fragile,
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP
  };
}
