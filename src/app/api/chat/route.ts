import { NextRequest, NextResponse } from 'next/server';
import { chat } from '@/services/safeConversation';
import type { KithMessage } from '@/services/claude';

export async function POST(req: NextRequest) {
  const { utterance, history = [] } = (await req.json()) as {
    utterance: string;
    history: KithMessage[];
  };

  if (!utterance?.trim()) {
    return NextResponse.json({ error: 'empty utterance' }, { status: 400 });
  }

  try {
    const response = await chat(utterance, history);
    return NextResponse.json(response);
  } catch (err) {
    console.error('[/api/chat]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
