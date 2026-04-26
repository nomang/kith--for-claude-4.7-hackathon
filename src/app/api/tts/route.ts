import { NextRequest } from 'next/server';
import https from 'https';
import { readFileSync } from 'fs';
import { join } from 'path';

const MODEL = 'gemini-3.1-flash-tts-preview';
const VOICE = 'Aoede';

// Read key directly from .env file — bypasses stale shell env vars
function getGeminiKey(): string | undefined {
  try {
    const env = readFileSync(join(process.cwd(), '.env'), 'utf-8');
    for (const line of env.split('\n')) {
      if (line.startsWith('GEMINI_API_KEY=')) {
        const val = line.slice('GEMINI_API_KEY='.length).trim();
        return val || undefined;
      }
    }
  } catch { /* no .env file in prod — fall back to process.env */ }
  return process.env.GEMINI_API_KEY?.trim() || undefined;
}

export async function POST(req: NextRequest) {
  const { text } = (await req.json()) as { text: string };

  const apiKey = getGeminiKey();
  if (!apiKey) {
    return new Response('GEMINI_API_KEY not set', { status: 503 });
  }

  const body = JSON.stringify({
    contents: [{ parts: [{ text }] }],
    generationConfig: {
      responseModalities: ['AUDIO'],
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICE } } },
    },
  });

  try {
    const raw = await httpsPost(
      'generativelanguage.googleapis.com',
      `/v1alpha/models/${MODEL}:generateContent?key=${apiKey}`,
      body,
    );
    const data = JSON.parse(raw);

    if (data.error) {
      console.error('[/api/tts]', data.error.message);
      return new Response(data.error.message, { status: 503 });
    }

    const inlineData = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData;
    if (!inlineData?.data) {
      return new Response('No audio in response', { status: 502 });
    }

    const pcm = Buffer.from(inlineData.data, 'base64');
    const wav = pcmToWav(pcm, 24000, 1, 16);
    return new Response(wav.buffer as ArrayBuffer, { headers: { 'Content-Type': 'audio/wav' } });
  } catch (err) {
    console.error('[/api/tts]', err);
    return new Response(String(err), { status: 502 });
  }
}

function httpsPost(host: string, path: string, body: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = https.request(
      { host, path, method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } },
      (res) => { const c: Buffer[] = []; res.on('data', d => c.push(d)); res.on('end', () => resolve(Buffer.concat(c).toString())); },
    );
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function pcmToWav(pcm: Buffer, sampleRate: number, channels: number, bitDepth: number): Buffer {
  const byteRate = (sampleRate * channels * bitDepth) / 8;
  const blockAlign = (channels * bitDepth) / 8;
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + pcm.length, 4); h.write('WAVE', 8);
  h.write('fmt ', 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20);
  h.writeUInt16LE(channels, 22); h.writeUInt32LE(sampleRate, 24);
  h.writeUInt32LE(byteRate, 28); h.writeUInt16LE(blockAlign, 32);
  h.writeUInt16LE(bitDepth, 34); h.write('data', 36); h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]);
}
