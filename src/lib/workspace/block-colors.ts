export const TEMPLATE_COLORS = [
  "#2563eb",
  "#178253",
  "#c2413b",
  "#b7791f",
  "#0f766e",
  "#7c3aed",
  "#db2777",
  "#4d7c0f",
  "#0891b2",
  "#9333ea"
];

export function getTemplateColor(blockTemplateId: string) {
  const hash = Array.from(blockTemplateId).reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return TEMPLATE_COLORS[hash % TEMPLATE_COLORS.length];
}
