// Runs once at Next.js server startup — loads .env with override so the
// file always wins over stale shell env vars in local dev.
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { config } = await import('dotenv');
    config({ override: true });
  }
}
