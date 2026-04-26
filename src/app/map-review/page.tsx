import Link from 'next/link';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { loadPersonhoodMapFixed } from '@/models/personhoodMap';
import MapReviewClient from './MapReviewClient';

export const dynamic = 'force-dynamic';

export interface ShoeboxPhoto {
  id: string;
  filename: string;
  url: string;
  thumbnail_url: string;
  family_caption: string;
  decade: string;
  date_approximate?: string;
  vision_extraction: {
    scene_description: string;
    raw_text_found: string[];
    personhood_map_additions: string[];
    [key: string]: unknown;
  };
}

function loadPhotos(): ShoeboxPhoto[] {
  const path = join(process.cwd(), 'demo', 'shoebox', 'manifest.json');
  if (!existsSync(path)) return [];
  try {
    const manifest = JSON.parse(readFileSync(path, 'utf-8'));
    return (manifest.photos ?? []) as ShoeboxPhoto[];
  } catch {
    return [];
  }
}

export default function MapReviewPage() {
  const map = loadPersonhoodMapFixed();
  const photos = loadPhotos();

  if (!map) {
    return (
      <main className="cg-main">
        <h1 className="cg-title">No map yet</h1>
        <p className="cg-subtitle">
          We don't have a Personhood Map on file. Start by telling Kith about
          your loved one.
        </p>
        <Link href="/caregiver-input" className="cg-submit" style={{ textAlign: 'center', display: 'inline-block' }}>
          Add caregiver input →
        </Link>
      </main>
    );
  }

  return <MapReviewClient map={map} photos={photos} />;
}
