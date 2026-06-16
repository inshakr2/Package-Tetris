import type { BlockGroup } from "./types";

export function createTopBlockGroups(blockGroups: BlockGroup[]) {
  return blockGroups
    .filter((group) => group.parentGroupId === null)
    .sort(compareBlockGroupNames);
}

export function createChildBlockGroups(blockGroups: BlockGroup[], parentGroupName: string) {
  const parentGroup = createTopBlockGroups(blockGroups).find((group) => group.name === parentGroupName);

  if (!parentGroup) {
    return [];
  }

  return blockGroups
    .filter((group) => group.parentGroupId === parentGroup.blockGroupId)
    .sort(compareBlockGroupNames);
}

export function compareBlockGroupNames(left: BlockGroup, right: BlockGroup) {
  return left.name.localeCompare(right.name, "ko-KR");
}
