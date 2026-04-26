import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { kvSet, kvGet, kvAppend } from './storage';

const NOTEBOOK_DIR = join(process.cwd(), 'data', 'kith_notebook');

const NOTEBOOK_FILES = [
  'today.md',
  'recurring_themes.md',
  'joy_log.md',
  'concerns.md',
  'gentle_boundaries.md',
] as const;

export type NotebookFile = (typeof NOTEBOOK_FILES)[number];

function fsPath(file: NotebookFile) {
  return join(NOTEBOOK_DIR, file);
}

function kvKey(file: NotebookFile) {
  return `notebook:${file}`;
}

export async function readNotebook(): Promise<Record<NotebookFile, string>> {
  const entries = await Promise.all(
    NOTEBOOK_FILES.map(async (file) => [file, await kvGet(kvKey(file), fsPath(file))] as const)
  );
  return Object.fromEntries(entries) as Record<NotebookFile, string>;
}

export async function readNotebookAsText(): Promise<string> {
  const notebook = await readNotebook();
  return NOTEBOOK_FILES.map(f => `### ${f}\n${notebook[f] || '(empty)'}`).join('\n\n');
}

export async function appendToNotebook(file: NotebookFile, content: string): Promise<void> {
  await kvAppend(kvKey(file), fsPath(file), content);
}

export async function writeNotebookFile(file: NotebookFile, content: string): Promise<void> {
  await kvSet(
    process.env.KV_REST_API_URL || process.env.KV_URL ? kvKey(file) : fsPath(file),
    content
  );
}

/** Synchronous read for local dev / build-time use only (not KV-aware) */
export function readNotebookSync(): Record<NotebookFile, string> {
  const result = {} as Record<NotebookFile, string>;
  for (const file of NOTEBOOK_FILES) {
    const p = fsPath(file);
    result[file] = existsSync(p) ? readFileSync(p, 'utf-8') : '';
  }
  return result;
}
