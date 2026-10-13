export type SlotMap = Record<string, string>;

export function resolveSlot(slots: SlotMap, name: string, fallback = ""): string {
  return slots[name] ?? fallback;
}
