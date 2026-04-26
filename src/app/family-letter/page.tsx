import FamilyLetterClient from './FamilyLetterClient';
import { loadPersonhoodMapFixed } from '@/models/personhoodMap';

export const dynamic = 'force-dynamic';

export default function FamilyLetterPage() {
  const map = loadPersonhoodMapFixed();
  const name = map?.patient_name ?? 'your loved one';
  return <FamilyLetterClient name={name} />;
}
