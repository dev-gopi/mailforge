export function validateRequired(
  value: string,
  fieldName: string,
): { valid: true } | { valid: false; message: string } {
  return value.trim()
    ? { valid: true }
    : { valid: false, message: `${fieldName} is required` };
}
