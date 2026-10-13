export function assertEmailContains(html: string, text: string): void {
  if (!html.includes(text)) {
    throw new Error(`Expected email output to contain: ${text}`);
  }
}
