import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { loadPrompt } from '@/services/promptLoader';

const MODEL = 'claude-opus-4-7';

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const photos = form.getAll('photos') as File[];

  if (!photos.length) {
    return NextResponse.json({ error: 'no photos' }, { status: 400 });
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const systemPrompt = loadPrompt('shoebox_onboarding');

  // Build image content blocks for each photo
  const imageBlocks: Anthropic.ImageBlockParam[] = await Promise.all(
    photos.map(async (photo) => {
      const bytes = await photo.arrayBuffer();
      const base64 = Buffer.from(bytes).toString('base64');
      const mediaType = (photo.type || 'image/jpeg') as
        | 'image/jpeg'
        | 'image/png'
        | 'image/gif'
        | 'image/webp';
      return {
        type: 'image',
        source: { type: 'base64', media_type: mediaType, data: base64 },
      };
    })
  );

  try {
    const response = await (client.messages.create as Function)({
      model: MODEL,
      max_tokens: 16000,
      thinking: { type: 'adaptive' },
      output_config: { effort: 'high' },
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: [
            ...imageBlocks,
            {
              type: 'text',
              text: `I've uploaded ${photos.length} photo(s) from our family shoebox. Please analyze them and draft a Personhood Map JSON document as instructed.`,
            },
          ],
        },
      ],
    });

    const text = (response.content as Array<{ type: string; text?: string }>)
      .filter((b) => b.type === 'text')
      .map((b) => b.text ?? '')
      .join('');

    // Extract JSON from response
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) ?? text.match(/(\{[\s\S]*\})/);
    const draft = jsonMatch ? jsonMatch[1].trim() : text.trim();

    return NextResponse.json({ draft });
  } catch (err) {
    console.error('[/api/shoebox]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
