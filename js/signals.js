// Collect 14 visitor signals. Resilient — every individual source can fail
// without breaking the whole snapshot.

import { getVisitorId } from './fingerprint.js?v=20260426';
import { getGeo }       from './geo.js?v=20260426';

const startTime = Date.now();
let maxScroll = 0;
const clickedSections = new Set();

window.addEventListener('scroll', () => {
  const h = document.documentElement;
  const denom = h.scrollHeight || 1;
  const pct = Math.round(((h.scrollTop + window.innerHeight) / denom) * 100);
  if (pct > maxScroll) maxScroll = Math.min(pct, 100);
}, { passive: true });

window.addEventListener('click', (e) => {
  const sectionId = e.target?.closest?.('section, header')?.id;
  if (sectionId) clickedSections.add(sectionId);
}, true);

function parseUA(ua) {
  const out = { device: 'desktop', os: 'unknown', browser: 'unknown' };
  if (/iPad|Tablet/i.test(ua))         out.device = 'tablet';
  else if (/Mobi|Android|iPhone/i.test(ua)) out.device = 'mobile';

  if (/Windows NT/i.test(ua))           out.os = 'Windows';
  else if (/Mac OS X/i.test(ua))        out.os = 'macOS';
  else if (/Android/i.test(ua))         out.os = 'Android';
  else if (/iPhone|iPad|iOS/i.test(ua)) out.os = 'iOS';
  else if (/Linux/i.test(ua))           out.os = 'Linux';

  if (/Edg\//i.test(ua))                out.browser = 'Edge';
  else if (/OPR\/|Opera/i.test(ua))     out.browser = 'Opera';
  else if (/Chrome\//i.test(ua))        out.browser = 'Chrome';
  else if (/Firefox\//i.test(ua))       out.browser = 'Firefox';
  else if (/Safari\//i.test(ua))        out.browser = 'Safari';

  return out;
}

export const SIGNAL_LABELS = {
  visitorId:   'fingerprint',
  country:     'страна',
  city:        'город',
  timezone:    'часовой пояс',
  device:      'устройство',
  os:          'ос',
  browser:     'браузер',
  screen:      'экран',
  connection:  'сеть',
  language:    'язык',
  referrer:    'источник',
  timeOnPage:  'время на сайте',
  scrollDepth: 'глубина скролла',
  clicks:      'клики',
};

export async function collectSignals() {
  const [visitorId, geo] = await Promise.all([getVisitorId(), getGeo()]);
  const ua = parseUA(navigator.userAgent);
  const screen = `${window.screen.width}x${window.screen.height}@${window.screen.colorDepth}bit`;
  const timeOnPage = Math.round((Date.now() - startTime) / 1000);
  const localHour  = new Date().getHours();
  const referrer = document.referrer ? new URL(document.referrer).hostname : '';

  const signals = {
    visitorId:   visitorId ? visitorId.slice(0, 12) : '',
    country:     geo.country || '',
    city:        geo.city || '',
    timezone:    geo.timezone || '',
    device:      ua.device,
    os:          ua.os,
    browser:     ua.browser,
    screen,
    connection:  navigator.connection?.effectiveType || '',
    language:    navigator.language || '',
    referrer:    referrer || 'direct',
    timeOnPage,
    scrollDepth: maxScroll,
    clicks:      [...clickedSections].join(',') || '',
  };

  signals._meta = {
    region:    geo.region || '',
    isp:       geo.isp || '',
    ip:        geo.ip || '',
    localHour,
    visitedSections: [...clickedSections],
    userAgent: navigator.userAgent,
    href:      location.href,
    visitorIdFull: visitorId || '',
  };

  return signals;
}
