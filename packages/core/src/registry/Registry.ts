export class Registry<T> {
  private readonly entries = new Map<string, T>();

  register(name: string, value: T): void {
    this.entries.set(name, value);
  }

  resolve(name: string): T | undefined {
    return this.entries.get(name);
  }
}
