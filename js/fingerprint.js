// FingerprintJS v5 (open-source) loader. Returns the visitorId or null on failure.
// Module is dynamically imported so a CDN outage cannot break the rest of the app.

const FP_URL = 'https://openfpcdn.io/fingerprintjs/v5/esm.min.js';

let cached = null;
let inflight = null;

export async function getVisitorId() {
  if (cached) return cached;
  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const mod = await import(/* @vite-ignore */ FP_URL);
      const FingerprintJS = mod.default || mod;
      const fp = await FingerprintJS.load();
      const result = await fp.get();
      cached = result?.visitorId || null;
      return cached;
    } catch (e) {
      console.warn('[fingerprint] failed:', e);
      return null;
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}
