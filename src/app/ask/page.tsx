import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import AskClient from './AskClient';

function getPatientName(): string {
  const p = join(process.cwd(), 'data', 'personhood_map.json');
  if (!existsSync(p)) return 'your loved one';
  try { return JSON.parse(readFileSync(p, 'utf-8')).patient_name ?? 'your loved one'; }
  catch { return 'your loved one'; }
}

export default function AskPage() {
  return <AskClient name={getPatientName()} />;
}
