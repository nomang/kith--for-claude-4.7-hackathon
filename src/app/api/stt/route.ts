import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const audio = form.get('audio') as File | null;

  if (!audio) {
    return NextResponse.json({ error: 'no audio' }, { status: 400 });
  }

  try {
    const transcript = await openai.audio.transcriptions.create({
      file: audio,
      model: 'whisper-1',
      language: 'en',
    });
    return NextResponse.json({ text: transcript.text });
  } catch (err) {
    console.error('[/api/stt]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
