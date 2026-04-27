// IP geolocation. Primary: ipwho.is (lang=ru). Fallback: ipapi.co.
// Returns a normalized object; never throws.

const PRIMARY  = 'https://ipwho.is/?lang=ru';
const FALLBACK = 'https://ipapi.co/json/';

let cached = null;
let inflight = null;

const empty = { ip: '', country: '', city: '', region: '', timezone: '', isp: '' };

async function tryFetch(url) {
  try {
    const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function getGeo() {
  if (cached) return cached;
  if (inflight) return inflight;

  inflight = (async () => {
    let data = await tryFetch(PRIMARY);
    if (data && data.success !== false) {
      cached = {
        ip:       data.ip       || '',
        country:  data.country  || '',
        city:     data.city     || '',
        region:   data.region   || '',
        timezone: data.timezone?.id || data.timezone || '',
        isp:      data.connection?.isp || '',
      };
      return cached;
    }

    data = await tryFetch(FALLBACK);
    if (data && !data.error) {
      cached = {
        ip:       data.ip            || '',
        country:  data.country_name  || '',
        city:     data.city          || '',
        region:   data.region        || '',
        timezone: data.timezone      || '',
        isp:      data.org           || '',
      };
      return cached;
    }

    cached = { ...empty };
    return cached;
  })().finally(() => { inflight = null; });

  return inflight;
}
