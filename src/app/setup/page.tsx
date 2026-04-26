import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import SetupClient from './SetupClient';

export default function SetupPage() {
  const dataPath = join(process.cwd(), 'data', 'personhood.json');
  const existing = existsSync(dataPath)
    ? JSON.parse(readFileSync(dataPath, 'utf-8'))
    : null;

  return <SetupClient existing={existing} />;
}
