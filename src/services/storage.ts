/**
 * Unified storage adapter.
 * - Production (Vercel): uses @vercel/kv — values persist across invocations
 * - Local dev: uses filesystem — same paths as before
 *
 * Filesystem READS always use the filesystem (bundled demo data works on Vercel).
 * Only WRITES are routed through KV in production.
 */

import { existsSync, readFileSync, writeFileSync } from 'fs';

const IS_KV = !!(process.env.KV_REST_API_URL || process.env.KV_URL);

export async function kvSet(key: string, value: string): Promise<void> {
  if (IS_KV) {
    try {
      const { kv } = await import('@vercel/kv');
      await kv.set(key, value);
    } catch (e) {
      console.warn('[storage] KV write failed (non-fatal):', e);
    }
  } else {
    try {
      writeFileSync(key, value, 'utf-8');
    } catch (e) {
      console.warn('[storage] filesystem write failed (non-fatal):', e);
    }
  }
}

export async function kvGet(key: string, fsPath: string): Promise<string> {
  if (IS_KV) {
    try {
      const { kv } = await import('@vercel/kv');
      const val = await kv.get<string>(key);
      if (val != null) return val;
    } catch { /* fall through to filesystem */ }
  }
  // Always fall back to bundled filesystem file (works on Vercel for read-only demo data)
  if (existsSync(fsPath)) return readFileSync(fsPath, 'utf-8');
  return '';
}

export async function kvAppend(key: string, fsPath: string, content: string): Promise<void> {
  const existing = await kvGet(key, fsPath);
  const timestamp = new Date().toISOString().split('T')[0];
  const updated = `${existing}\n\n---\n*${timestamp}*\n${content}`.trimStart();
  await kvSet(IS_KV ? key : fsPath, updated);
}
