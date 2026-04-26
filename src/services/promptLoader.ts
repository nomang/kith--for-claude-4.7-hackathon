import { readFileSync } from 'fs';
import { join } from 'path';

const PROMPTS_DIR = join(process.cwd(), 'prompts');

export function loadPrompt(name: string, vars: Record<string, string> = {}): string {
  const filePath = join(PROMPTS_DIR, name.endsWith('.txt') ? name : `${name}.txt`);
  let text = readFileSync(filePath, 'utf-8');

  for (const [key, value] of Object.entries(vars)) {
    text = text.replaceAll(`{{${key}}}`, value);
  }

  return text;
}
