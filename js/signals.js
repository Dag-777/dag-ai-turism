// DagAI Intelligence — Quantum Signal Collector v5.0
// 40+ real browser signals including canvas/audio/webgl fingerprints,
// hardware, network, Telegram deep-link context, and behavioral data.

import { getVisitorId } from './fingerprint.js?v=20260519';
import { getGeo }       from './geo.js?v=20260519';

const startTime = Date.now();
let maxScroll = 0;
const clickedSections = new Set();
const clickedElements = [];
let mouseMovements = 0;
let idleSeconds = 0;
let lastActivity = Date.now();

window.addEventListener('scroll', () => {
  lastActivity = Date.now();
  const h = document.documentElement;
  const pct = Math.round(((h.scrollTop + window.innerHeight) / (h.scrollHeight || 1)) * 100);
  if (pct > maxScroll) maxScroll = Math.min(pct, 100);
}, { passive: true });

window.addEventListener('click', (e) => {
  lastActivity = Date.now();
  const sec = e.target?.closest?.('section, header')?.id;
  if (sec) clickedSections.add(sec);
  const label = e.target?.closest?.('[data-track]')?.dataset?.track
    || e.target?.textContent?.trim()?.slice(0, 30);
  if (label && clickedElements.length < 20) clickedElements.push(label);
}, true);

window.addEventListener('mousemove', () => {
  lastActivity = Date.now();
  mouseMovements++;
}, { passive: true });

setInterval(() => {
  if (Date.now() - lastActivity > 5000) idleSeconds += 5;
}, 5000);

// ── UA Parser ─────────────────────────────────────────────────────────────
function parseUA(ua) {
  const out = { device: 'desktop', os: 'unknown', browser: 'unknown', browserVersion: '' };
  if (/iPad|Tablet/i.test(ua))               out.device = 'tablet';
  else if (/Mobi|Android|iPhone/i.test(ua))  out.device = 'mobile';

  if (/Windows NT/i.test(ua))                out.os = 'Windows';
  else if (/Mac OS X/i.test(ua))             out.os = 'macOS';
  else if (/Android/i.test(ua))              out.os = 'Android';
  else if (/iPhone|iPad|iOS/i.test(ua))      out.os = 'iOS';
  else if (/Linux/i.test(ua))                out.os = 'Linux';

  const em = ua.match(/Edg\/(\d+)/i);
  const cm = ua.match(/Chrome\/(\d+)/i);
  const fm = ua.match(/Firefox\/(\d+)/i);
  const sm = ua.match(/Version\/(\d+).*Safari/i);
  if (em)                   { out.browser = 'Edge';    out.browserVersion = em[1]; }
  else if (/OPR\//i.test(ua)) { out.browser = 'Opera'; }
  else if (cm)              { out.browser = 'Chrome';  out.browserVersion = cm[1]; }
  else if (fm)              { out.browser = 'Firefox'; out.browserVersion = fm[1]; }
  else if (sm)              { out.browser = 'Safari';  out.browserVersion = sm[1]; }

  return out;
}

// ── Canvas Fingerprint ────────────────────────────────────────────────────
function canvasFingerprint() {
  try {
    const c = document.createElement('canvas');
    c.width = 240; c.height = 60;
    const ctx = c.getContext('2d');
    ctx.textBaseline = 'top';
    ctx.fillStyle = 'rgba(0,212,255,0.04)';
    ctx.fillRect(0, 0, 240, 60);
    ctx.font = '18px "Arial"';
    ctx.fillStyle = '#00d4ff';
    ctx.fillText('DagAI Intelligence 💎🏔️', 2, 4);
    ctx.font = '12px "Times New Roman"';
    ctx.fillStyle = 'rgba(255,181,71,0.8)';
    ctx.fillText('Quantum · Palantir · v5', 4, 28);
    ctx.strokeStyle = '#00ff9f';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.arc(200, 30, 18, 0, Math.PI * 2);
    ctx.stroke();
    const data = c.toDataURL('image/png');
    let h = 0;
    for (let i = 0; i < data.length; i++) { h = ((h << 5) - h) + data.charCodeAt(i); h |= 0; }
    return (h >>> 0).toString(16).padStart(8, '0');
  } catch { return ''; }
}

// ── WebGL Info ────────────────────────────────────────────────────────────
function webGLInfo() {
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl') || c.getContext('experimental-webgl');
    if (!gl) return { renderer: '', vendor: '', version: '', maxTexture: '' };
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    return {
      renderer:   ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
      vendor:     ext ? gl.getParameter(ext.UNMASKED_VENDOR_WEBGL)   : gl.getParameter(gl.VENDOR),
      version:    (gl.getParameter(gl.VERSION) || '').split(' ')[0],
      maxTexture: gl.getParameter(gl.MAX_TEXTURE_SIZE) || '',
    };
  } catch { return { renderer: '', vendor: '', version: '', maxTexture: '' }; }
}

// ── Audio Fingerprint ─────────────────────────────────────────────────────
async function audioFingerprint() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return '';
    const ctx = new AudioCtx({ sampleRate: 44100 });
    const osc = ctx.createOscillator();
    const analyser = ctx.createAnalyser();
    const gain = ctx.createGain();
    const dest = ctx.createMediaStreamDestination();
    osc.type = 'triangle';
    osc.frequency.value = 10000;
    gain.gain.value = 0;
    osc.connect(analyser);
    analyser.connect(gain);
    gain.connect(dest);
    osc.start(0);
    await new Promise(r => setTimeout(r, 20));
    const buf = new Float32Array(analyser.frequencyBinCount);
    analyser.getFloatFrequencyData(buf);
    osc.stop();
    await ctx.close();
    let sum = 0;
    for (let i = 0; i < 50; i++) sum += Math.abs(buf[i] || 0);
    return sum.toFixed(6);
  } catch { return ''; }
}

// ── Battery ───────────────────────────────────────────────────────────────
async function getBattery() {
  try {
    const b = await navigator.getBattery?.();
    if (!b) return { level: '', charging: '' };
    return { level: Math.round(b.level * 100), charging: b.charging };
  } catch { return { level: '', charging: '' }; }
}

// ── Font Detection ────────────────────────────────────────────────────────
function detectFonts() {
  const testList = [
    'Arial','Helvetica','Times New Roman','Courier New','Verdana','Georgia',
    'Comic Sans MS','Trebuchet MS','Impact','Tahoma','Palatino','Garamond',
    'Bookman','Monaco','Consolas','Segoe UI','Roboto','Ubuntu','Cantarell',
    'SF Pro','Gill Sans','Futura','Baskerville','Optima','Myriad Pro',
  ];
  try {
    const c = document.createElement('canvas');
    const ctx = c.getContext('2d');
    const base = 'monospace';
    const str = 'abcdefghijklmnopqrstuvwxyz0123456789!@#';
    ctx.font = `72px ${base}`;
    const baseW = ctx.measureText(str).width;
    return testList.filter(f => {
      ctx.font = `72px '${f}',${base}`;
      return ctx.measureText(str).width !== baseW;
    }).length;
  } catch { return 0; }
}

// ── Media Devices ─────────────────────────────────────────────────────────
async function getMediaDevices() {
  try {
    const devices = await navigator.mediaDevices?.enumerateDevices();
    if (!devices) return { cameras: 0, microphones: 0, speakers: 0 };
    return {
      cameras:     devices.filter(d => d.kind === 'videoinput').length,
      microphones: devices.filter(d => d.kind === 'audioinput').length,
      speakers:    devices.filter(d => d.kind === 'audiooutput').length,
    };
  } catch { return { cameras: 0, microphones: 0, speakers: 0 }; }
}

// ── Telegram Deep-Link Context ────────────────────────────────────────────
function getTelegramContext() {
  try {
    const p = new URLSearchParams(location.search);
    return {
      tg_id:    p.get('tg_id')  || '',
      tg_ref:   p.get('tg_ref') || '',
      tg_ctx:   p.get('ctx') || p.get('tg_ctx') || p.get('start') || '',
      from_bot: p.has('tg_ref') || p.has('tg_id') || p.has('ctx'),
    };
  } catch { return { tg_id: '', tg_ref: '', tg_ctx: '', from_bot: false }; }
}

// ── CSS Media Queries ─────────────────────────────────────────────────────
function getMediaQueries() {
  const mq = (q) => { try { return matchMedia(q).matches; } catch { return false; } };
  return {
    darkMode:       mq('(prefers-color-scheme: dark)'),
    reducedMotion:  mq('(prefers-reduced-motion: reduce)'),
    hdr:            mq('(dynamic-range: high)'),
    hoverSupport:   mq('(hover: hover)'),
    finePointer:    mq('(pointer: fine)'),
    portrait:       mq('(orientation: portrait)'),
    p3color:        mq('(color-gamut: p3)'),
  };
}

// ── Storage Probe ─────────────────────────────────────────────────────────
function storageInfo() {
  let ls = false, ss = false, idb = false;
  try { localStorage.setItem('_t', '1'); localStorage.removeItem('_t'); ls = true; } catch {}
  try { sessionStorage.setItem('_t', '1'); sessionStorage.removeItem('_t'); ss = true; } catch {}
  try { idb = !!indexedDB; } catch {}
  return { localStorage: ls, sessionStorage: ss, indexedDB: idb };
}

// ── Signal Labels (for UI display) ────────────────────────────────────────
export const SIGNAL_LABELS = {
  // — IDENTITY —
  visitorId:       'fingerprint ID',
  canvasHash:      'canvas FP',
  audioFp:         'audio FP',
  // — GEO —
  country:         'страна',
  city:            'город',
  region:          'регион',
  timezone:        'часовой пояс',
  isp:             'провайдер',
  ip:              'IP адрес',
  // — DEVICE —
  device:          'устройство',
  os:              'операционная система',
  browser:         'браузер',
  browserVersion:  'версия браузера',
  screen:          'разрешение экрана',
  dpr:             'pixel ratio',
  orientation:     'ориентация',
  // — HARDWARE —
  cpuCores:        'ядра CPU',
  deviceMemory:    'RAM (GB)',
  maxTouchPoints:  'тач-точки',
  // — NETWORK —
  connection:      'тип соединения',
  downlink:        'скорость (Mbps)',
  rtt:             'пинг (ms)',
  saveData:        'режим экономии',
  // — BROWSER ENV —
  language:        'язык',
  languages:       'все языки',
  doNotTrack:      'do not track',
  cookiesEnabled:  'куки',
  historyLength:   'глубина истории',
  // — BATTERY —
  batteryLevel:    'заряд батареи',
  batteryCharging: 'зарядка',
  // — GRAPHICS —
  webGLRenderer:   'GPU рендерер',
  webGLVendor:     'GPU вендор',
  // — MEDIA DEVICES —
  cameras:         'камеры',
  microphones:     'микрофоны',
  // — ENVIRONMENT —
  colorScheme:     'тема системы',
  hdr:             'HDR дисплей',
  p3color:         'P3 цветовой охват',
  fontsCount:      'доступных шрифтов',
  // — BEHAVIOR —
  referrer:        'источник трафика',
  timeOnPage:      'время на сайте (с)',
  idleTime:        'время простоя (с)',
  scrollDepth:     'глубина скролла (%)',
  mouseActivity:   'активность мыши',
  clicks:          'разделы клики',
  localHour:       'час визита',
  dayOfWeek:       'день недели',
  // — TELEGRAM —
  tg_from:         'из Telegram бота',
  tg_ctx:          'контекст бота',
};

// ── Signal Categories (for grouped display) ───────────────────────────────
export const SIGNAL_CATEGORIES = {
  'IDENTITY':   ['visitorId', 'canvasHash', 'audioFp'],
  'GEO':        ['country', 'city', 'region', 'timezone', 'isp', 'ip'],
  'DEVICE':     ['device', 'os', 'browser', 'browserVersion', 'screen', 'dpr', 'orientation'],
  'HARDWARE':   ['cpuCores', 'deviceMemory', 'maxTouchPoints'],
  'NETWORK':    ['connection', 'downlink', 'rtt', 'saveData'],
  'BROWSER':    ['language', 'languages', 'doNotTrack', 'cookiesEnabled', 'historyLength'],
  'BATTERY':    ['batteryLevel', 'batteryCharging'],
  'GRAPHICS':   ['webGLRenderer', 'webGLVendor'],
  'MEDIA':      ['cameras', 'microphones'],
  'DISPLAY':    ['colorScheme', 'hdr', 'p3color', 'fontsCount'],
  'BEHAVIOR':   ['referrer', 'timeOnPage', 'idleTime', 'scrollDepth', 'mouseActivity', 'clicks', 'localHour', 'dayOfWeek'],
  'TELEGRAM':   ['tg_from', 'tg_ctx'],
};

// ── Main Collector ────────────────────────────────────────────────────────
export async function collectSignals() {
  const [visitorId, geo, battery, media, audiofp] = await Promise.all([
    getVisitorId(),
    getGeo(),
    getBattery(),
    getMediaDevices(),
    audioFingerprint(),
  ]);

  const canvasHash = canvasFingerprint();
  const fontsCount = detectFonts();
  const webgl      = webGLInfo();
  const mq         = getMediaQueries();
  const tg         = getTelegramContext();
  const stor       = storageInfo();
  const ua         = parseUA(navigator.userAgent);
  const nav        = navigator;
  const conn       = nav.connection || nav.mozConnection || nav.webkitConnection;

  const timeOnPage = Math.round((Date.now() - startTime) / 1000);
  const localHour  = new Date().getHours();
  const days       = ['Вс','Пн','Вт','Ср','Чт','Пт','Сб'];
  const referrer   = document.referrer
    ? (() => { try { return new URL(document.referrer).hostname; } catch { return document.referrer; } })()
    : '';

  const signals = {
    // Identity
    visitorId:       visitorId ? visitorId.slice(0, 12) : '',
    canvasHash:      canvasHash,
    audioFp:         audiofp ? audiofp.slice(0, 10) : '',
    // Geo
    country:         geo.country  || '',
    city:            geo.city     || '',
    region:          geo.region   || '',
    timezone:        geo.timezone || '',
    isp:             geo.isp      || '',
    ip:              geo.ip ? geo.ip.replace(/\.\d+$/, '.***') : '',
    // Device
    device:          ua.device,
    os:              ua.os,
    browser:         ua.browser,
    browserVersion:  ua.browserVersion,
    screen:          `${window.screen.width}×${window.screen.height}`,
    dpr:             (window.devicePixelRatio || 1).toFixed(1),
    orientation:     mq.portrait ? 'portrait' : 'landscape',
    // Hardware
    cpuCores:        nav.hardwareConcurrency || '',
    deviceMemory:    nav.deviceMemory || '',
    maxTouchPoints:  nav.maxTouchPoints || 0,
    // Network
    connection:      conn?.effectiveType || '',
    downlink:        conn?.downlink != null ? conn.downlink : '',
    rtt:             conn?.rtt     != null ? conn.rtt     : '',
    saveData:        conn?.saveData ? 'yes' : 'no',
    // Browser
    language:        nav.language || '',
    languages:       (nav.languages || []).slice(0, 4).join(', '),
    doNotTrack:      nav.doNotTrack === '1' ? 'on' : nav.doNotTrack === '0' ? 'off' : 'unset',
    cookiesEnabled:  nav.cookieEnabled ? 'yes' : 'no',
    historyLength:   history.length,
    // Battery
    batteryLevel:    battery.level   != null ? battery.level + '%'         : '',
    batteryCharging: battery.charging != null ? (battery.charging ? 'yes' : 'no') : '',
    // Graphics
    webGLRenderer:   (webgl.renderer || '').slice(0, 45),
    webGLVendor:     (webgl.vendor   || '').slice(0, 30),
    // Media
    cameras:         media.cameras     || 0,
    microphones:     media.microphones || 0,
    // Environment
    colorScheme:     mq.darkMode ? 'dark' : 'light',
    hdr:             mq.hdr    ? 'yes' : 'no',
    p3color:         mq.p3color ? 'yes' : 'no',
    fontsCount,
    // Behavior
    referrer:        referrer || 'direct',
    timeOnPage,
    idleTime:        idleSeconds,
    scrollDepth:     maxScroll,
    mouseActivity:   Math.min(mouseMovements, 9999),
    clicks:          [...clickedSections].join(', ') || '',
    localHour,
    dayOfWeek:       days[new Date().getDay()],
    // Telegram
    tg_from:         tg.from_bot ? `да · @DagAi_tourism_bot${tg.tg_id ? ' · id:' + tg.tg_id : ''}` : 'нет',
    tg_ctx:          tg.tg_ctx || '',
  };

  signals._meta = {
    geo,
    webgl,
    mq,
    tg,
    stor,
    plugins:        Array.from(nav.plugins || []).map(p => p.name).slice(0, 10),
    visitedSections: [...clickedSections],
    clickedElements,
    userAgent:      nav.userAgent,
    href:           location.href,
    visitorIdFull:  visitorId || '',
  };

  return signals;
}
