export function createPreviewUrl(templateId: string): string {
  return `/preview/${encodeURIComponent(templateId)}`;
}
