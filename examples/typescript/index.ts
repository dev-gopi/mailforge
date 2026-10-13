export interface WelcomeData {
  name: string;
}

export function buildWelcomeMessage(data: WelcomeData): string {
  return `Welcome, ${data.name}!`;
}
