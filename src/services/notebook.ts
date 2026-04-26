import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const NOTEBOOK_DIR = join(process.cwd(), 'data', 'kith_notebook');

const NOTEBOOK_FILES = [
  'today.md',
  'recurring_themes.md',
  'joy_log.md',
  'concerns.md',
  'gentle_boundaries.md',
] as const;

export type NotebookFile = (typeof NOTEBOOK_FILES)[number];

export function readNotebook(): Record<NotebookFile, string> {
  const result = {} as Record<NotebookFile, string>;
  for (const file of NOTEBOOK_FILES) {
    const path = join(NOTEBOOK_DIR, file);
    result[file] = existsSync(path) ? readFileSync(path, 'utf-8') : '';
  }
  return result;
}

export function readNotebookAsText(): string {
  const notebook = readNotebook();
  return NOTEBOOK_FILES.map(f => `### ${f}\n${notebook[f] || '(empty)'}`).join('\n\n');
}

export function appendToNotebook(file: NotebookFile, content: string): void {
  const path = join(NOTEBOOK_DIR, file);
  const existing = existsSync(path) ? readFileSync(path, 'utf-8') : '';
  const timestamp = new Date().toISOString().split('T')[0];
  writeFileSync(path, `${existing}\n\n---\n*${timestamp}*\n${content}`.trimStart());
}

export function writeNotebookFile(file: NotebookFile, content: string): void {
  const path = join(NOTEBOOK_DIR, file);
  writeFileSync(path, content, 'utf-8');
}
