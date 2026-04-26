import { NextRequest, NextResponse } from 'next/server';
import { writeFileSync } from 'fs';
import { join } from 'path';
import { PersonhoodMapSchema } from '@/models/personhood';

export async function POST(req: NextRequest) {
  const body = await req.json();

  try {
    const validated = PersonhoodMapSchema.parse(body);
    writeFileSync(
      join(process.cwd(), 'data', 'personhood.json'),
      JSON.stringify(validated, null, 2)
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[/api/setup/save]', err);
    return NextResponse.json({ error: String(err) }, { status: 400 });
  }
}
