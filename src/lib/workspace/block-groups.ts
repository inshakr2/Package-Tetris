import { BlockGroup, BlockTemplate } from "./types";

interface UpsertBlockGroupOptions {
  name: string;
  parentGroupId: string | null;
  now: string;
}

export function deriveBlockGroupsFromTemplates(
  templates: BlockTemplate[],
  groups: BlockGroup[],
  now: string
) {
  return templates.reduce(
    (nextGroups, template) => ensureBlockGroupsForNames(nextGroups, template.group1, template.group2, now),
    groups
  );
}

export function ensureBlockGroupsForNames(
  groups: BlockGroup[],
  group1: string | undefined,
  group2: string | undefined,
  now: string
) {
  const topGroupName = normalizeBlockGroupName(group1);

  if (!topGroupName) {
    return groups;
  }

  const nextGroups = upsertBlockGroup(groups, {
    name: topGroupName,
    parentGroupId: null,
    now
  });
  const topGroup = findBlockGroupByName(nextGroups, topGroupName, null);
  const childGroupName = normalizeBlockGroupName(group2);

  if (!topGroup || !childGroupName) {
    return nextGroups;
  }

  return upsertBlockGroup(nextGroups, {
    name: childGroupName,
    parentGroupId: topGroup.blockGroupId,
    now
  });
}

export function upsertBlockGroup(groups: BlockGroup[], options: UpsertBlockGroupOptions) {
  const groupName = normalizeBlockGroupName(options.name);

  if (!groupName) {
    return groups;
  }

  const existingGroup = findBlockGroupByName(groups, groupName, options.parentGroupId);

  if (existingGroup) {
    return groups;
  }

  return [
    ...groups,
    {
      blockGroupId: createBlockGroupId(groupName, options.parentGroupId),
      entityVersion: 1,
      name: groupName,
      parentGroupId: options.parentGroupId,
      createdAt: options.now,
      updatedAt: options.now
    }
  ];
}

export function normalizeBlockGroups(
  items: unknown[],
  blockTemplates: BlockTemplate[],
  now: string
) {
  const normalizedGroups = items
    .map((item) => normalizeBlockGroupRecord(item, now))
    .filter((group): group is BlockGroup => Boolean(group));

  return deriveBlockGroupsFromTemplates(blockTemplates, normalizedGroups, now);
}

export function normalizeBlockGroupName(value: string | null | undefined) {
  const normalizedValue = value?.trim();
  return normalizedValue ? normalizedValue : undefined;
}

function findBlockGroupByName(groups: BlockGroup[], name: string, parentGroupId: string | null) {
  const normalizedName = normalizeBlockGroupName(name)?.toLocaleLowerCase("ko-KR");

  return groups.find(
    (group) =>
      group.parentGroupId === parentGroupId &&
      group.name.trim().toLocaleLowerCase("ko-KR") === normalizedName
  );
}

function normalizeBlockGroupRecord(item: unknown, now: string): BlockGroup | null {
  if (!isRecord(item) || typeof item.name !== "string") {
    return null;
  }

  const name = normalizeBlockGroupName(item.name);

  if (!name) {
    return null;
  }

  const parentGroupId = typeof item.parentGroupId === "string" ? item.parentGroupId : null;

  return {
    blockGroupId:
      typeof item.blockGroupId === "string" && item.blockGroupId.length > 0
        ? item.blockGroupId
        : createBlockGroupId(name, parentGroupId),
    entityVersion: typeof item.entityVersion === "number" ? item.entityVersion : 1,
    name,
    parentGroupId,
    createdAt: typeof item.createdAt === "string" ? item.createdAt : now,
    updatedAt: typeof item.updatedAt === "string" ? item.updatedAt : now
  };
}

function createBlockGroupId(name: string, parentGroupId: string | null) {
  return `block-group-${stableHash(`${parentGroupId ?? "root"}:${name.toLocaleLowerCase("ko-KR")}`)}`;
}

function stableHash(value: string) {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(36);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
