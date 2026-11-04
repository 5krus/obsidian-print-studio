import type {ElementFactory} from './ui';

interface DataviewLike {settings?: {inlineQueryPrefix?: string; inlineJsQueryPrefix?: string}}

function pendingInline(root: HTMLElement, prefixes: string[]): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>('code')].filter(code =>
    !code.closest('pre') && prefixes.some(prefix => (code.textContent ?? '').startsWith(prefix)));
}

const scalar = (value: unknown): string =>
  typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' ? String(value) : '';

/**
 * Dataview replaces inline `=expr` code asynchronously, after MarkdownRenderer
 * resolves. Wait (bounded) for it to finish before the note is serialized, then
 * fill any remaining plain `=this.field` from frontmatter so simple fields print.
 */
export async function settleDataviewInline(root: HTMLElement, dataview: DataviewLike | undefined,
  frontmatter: Record<string, unknown>, createElement: ElementFactory, timeoutMs = 3000): Promise<void> {
  const prefix = dataview?.settings?.inlineQueryPrefix || '=';
  const prefixes = [prefix, dataview?.settings?.inlineJsQueryPrefix || '$='];
  if (dataview && pendingInline(root, prefixes).length) {
    const start = Date.now();
    await new Promise<void>(resolve => {
      const check = () => {
        if (!pendingInline(root, prefixes).length || Date.now() - start > timeoutMs) resolve();
        else window.setTimeout(check, 50);
      };
      check();
    });
  }
  for (const code of pendingInline(root, [prefix])) {
    const match = (code.textContent ?? '').slice(prefix.length).trim().match(/^this\.([\w.-]+)$/);
    if (!match) continue;
    let value: unknown = frontmatter;
    for (const key of match[1].split('.')) value = (value as Record<string, unknown> | undefined)?.[key];
    const text = Array.isArray(value) ? value.map(scalar).filter(Boolean).join(', ') : scalar(value);
    if (!text) continue;
    const span = createElement('span', 'dataview dataview-inline');
    span.textContent = text;
    code.replaceWith(span);
  }
}
