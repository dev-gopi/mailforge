export type AttributeMap = Record<string, string | number | boolean>;

export function createAttributeMap(
  attributes: AttributeMap = {},
): AttributeMap {
  return { ...attributes };
}
