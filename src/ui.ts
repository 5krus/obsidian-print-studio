// The plugin uses Obsidian components; the standalone demo supplies a DOM adapter.
export interface SettingRow {
  element: HTMLElement;
  control: HTMLElement;
  name: HTMLElement;
  description: HTMLElement;
}

export interface ButtonOptions {
  icon?: string;
  primary?: boolean;
  tooltip?: string;
}

export interface StudioUI {
  setting(parent: HTMLElement, name: string, description?: string): SettingRow;
  text(parent: HTMLElement, value: string, multiline?: boolean): HTMLInputElement | HTMLTextAreaElement;
  dropdown(parent: HTMLElement, value: string, options: Record<string, string>): HTMLSelectElement;
  toggle(parent: HTMLElement, value: boolean, change: (value: boolean) => void): HTMLElement;
  color(parent: HTMLElement, value: string, change: (value: string) => void): HTMLInputElement;
  button(parent: HTMLElement, label: string, action: () => void, options?: ButtonOptions): HTMLButtonElement;
  icon(parent: HTMLElement, name: string): void;
  confirmRemoval(name: string): Promise<boolean>;
}
