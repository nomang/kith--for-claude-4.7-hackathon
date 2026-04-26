import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import LetterClient from './LetterClient';

function loadRiskFlags(): string[] {
  const path = join(process.cwd(), 'data', 'kith_notebook', 'concerns.md');
  if (!existsSync(path)) return [];
  const content = readFileSync(path, 'utf-8');
  // Lines containing RISK_ESCALATION or 'risk' keyword
  return content
    .split('\n')
    .filter(l => l.toLowerCase().includes('risk') || l.includes('⚠'))
    .map(l => l.replace(/^[-*#\s]+/, '').trim())
    .filter(Boolean);
}

function loadPersonName(): string {
  const path = join(process.cwd(), 'data', 'personhood.json');
  if (!existsSync(path)) return 'your loved one';
  try {
    const d = JSON.parse(readFileSync(path, 'utf-8'));
    return d.person?.preferred_name ?? 'your loved one';
  } catch { return 'your loved one'; }
}

export default function LetterPage() {
  const riskFlags = loadRiskFlags();
  const name = loadPersonName();
  return <LetterClient riskFlags={riskFlags} name={name} />;
}
