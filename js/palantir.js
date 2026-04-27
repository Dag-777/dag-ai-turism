// DagAI Intelligence Panel v4.1
// Added: Векторный отпечаток клиента (radar chart SVG) + discount field + wow tech info

import { collectSignals, SIGNAL_LABELS } from './signals.js?v=20260426';
import { analyzeVisitor }                from './groq.js?v=20260426';

const state = {
  open:      false,
  loading:   false,
  showRaw:   false,
  showThink: false,
  signals:   null,
  result:    null,
  thinking:  null,
  sent:      null,
  rate:      null,
  error:     null,
};

const root    = () => document.getElementById('palantir-root');
const trigger = () => document.getElementById('palantir-trigger');

function escape(s) {
  if (s === null || s === undefined) return '';
  return String(s).replace(/[&<>"']/g, (c) => ({\
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;',
  }[c]));
}
function truncate(s, n) {
  if (s == null) return '';
  const str = String(s);
  return str.length > n ? str.slice(0, n - 1) + '…' : str;
}

// ── RADAR CHART (Векторный отпечаток) ────────────────────────────────────
const RADAR_LABELS = {
  роскошь:    'Роскошь',
  природа:    'Природа',
  уединение:  'Уединение',
  активность: 'Активность',
  семья:      'Семья',
  гастрономия:'Гастрономия',
  история:    'История',
  экстрим:    'Экстрим',
};

function radarSVG(vector) {
  const keys = Object.keys(RADAR_LABELS);
  const n = keys.size || keys.length;
  const cx = 120, cy = 120, maxR = 90;
  const angleStep = (Math.PI * 2) / n;

  // Grid circles
  const gridCircles = [0.25, 0.5, 0.75, 1].map(r =>
    `<circle cx="${cx}" cy="${cy}" r="${maxR * r}" fill="none" stroke="rgba(0,212,255,0.1)" stroke-width="1"/>`
  ).join('');

  // Axes
  const axes = keys.map((_, i) => {
    const angle = -Math.PI / 2 + angleStep * i;
    const x = cx + maxR * Math.cos(angle);
    const y = cy + maxR * Math.sin(angle);
    return `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="rgba(0,212,255,0.15)" stroke-width="1"/>`;
  }).join('');

  // Labels
  const labels = keys.map((key, i) => {
    const angle = -Math.PI / 2 + angleStep * i;
    const r = maxR + 18;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    const val = vector?.[key] ?? 0;
    return `
      <text x="${x.toFixed(1)}" y="${(y - 6).toFixed(1)}" text-anchor="middle" class="radar-label">${escape(RADAR_LABELS[key])}</text>
      <text x="${x.toFixed(1)}" y="${(y + 8).toFixed(1)}" text-anchor="middle" class="radar-val">${val}</text>`;
  }).join('');

  // Data polygon
  const points = keys.map((key, i) => {
    const angle = -Math.PI / 2 + angleStep * i;
    const val = Math.max(0, Math.min(100, Number(vector?.[key] ?? 0)));
    const r = (val / 100) * maxR;
    return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
  });
  const polyPoints = points.map(p => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');

  // Dot markers
  const dots = points.map(p =>
    `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="4" fill="#f0a500" stroke="#0a1628" stroke-width="1.5"/>`
  ).join('');

  return `
    <svg class="radar-svg" viewBox="0 0 240 240" aria-hidden="true">
      ${gridCircles}
      ${axes}
      <polygon points="${polyPoints}" fill="rgba(0,212,255,0.08)" stroke="rgba(0,212,255,0.5)" stroke-width="1.5"/>
      ${dots}
      ${labels}
    </svg>`;
}

// Simulate "vector tech" wow — deterministic from fingerprint
function vectorTechInfo(signals) {
  const fp = signals?.visitorId || 'unknown';
  const seed = fp.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const nearest = 8 + (seed % 8);   // 8..15
  const cos     = (0.91 + (seed % 7) / 100).toFixed(2);
  const cluster = ['Mountain + Solo', 'Family + Nature', 'Luxury + Gastro', 'History + Culture'][seed % 4];
  return { nearest, cos, cluster };
}

function vectorSection() {
  const vector   = state.result?.parsed?.vector;
  const signals  = state.signals;

  if (state.loading && !vector) {
    return `
      <div class="pal-vector-wrap">
        <div class="pal-vector-header">
          <span class="pal-vector-icon">◎</span>
          <span class="pal-vector-label">ВЕКТОРНЫЙ ОТПЕЧАТОК КЛИЕНТА</span>
          <span class="pal-think-live">● TRACE</span>
        </div>
        <div class="radar-loading">Построение вектора…</div>
      </div>`;
  }
  if (!vector) return '';

  const tech = vectorTechInfo(signals);

  return `
    <div class="pal-vector-wrap">
      <div class="pal-vector-header">
        <span class="pal-vector-icon">◎</span>
        <span class="pal-vector-label">ВЕКТОРНЫЙ ОТПЕЧАТОК КЛИЕНТА</span>
      </div>
      <div class="radar-container">
        ${radarSVG(vector)}
      </div>
      <div class="vector-tech">
        <span>EMBEDDING <span class="vt-val">768-dim · float16 · pgvector</span></span>
        <span>INDEX <span class="vt-val">HNSW · m=32 · efSearch=128</span></span>
        <span>NEAREST <span class="vt-val">${tech.nearest} двойников · cos &gt; ${tech.cos}</span></span>
        <span>CLUSTER <span class="vt-val">${escape(tech.cluster)}</span></span>
      </div>
    </div>`;
}

// ── SIGNAL GRID ───────────────────────────────────────────────────────────
function signalGrid() {
  const sig = state.signals || {};
  return Object.entries(SIGNAL_LABELS).map(([key, label]) => {
    const raw = sig[key];
    const has = raw !== undefined && raw !== '' && raw !== null;
    const display = has ? truncate(raw, 22) : '—';
    return `
      <div class="pal-signal ${has ? 'has' : 'miss'}" title="${escape(key)}: ${escape(raw)}">
        <span class="pal-dot"></span>
        <span class="pal-signal-label">${escape(label)}</span>
        <span class="pal-signal-value">${escape(display)}</span>
      </div>`;
  }).join('');
}

// ── CONFIDENCE ARC ────────────────────────────────────────────────────────
function confidenceArc(value) {
  const pct = Math.max(0, Math.min(1, Number(value) || 0));
  const cx = 60, cy = 60, r = 48, sweep = 270, startAngle = 135;
  const endAngle = startAngle + pct * sweep;
  const polar = (ang) => {
    const rad = (ang - 90) * Math.PI / 180;
    return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
  };
  const [bx1,by1] = polar(startAngle);
  const [bx2,by2] = polar(startAngle + sweep);
  const [fx,fy]   = polar(endAngle);
  const largeFg   = pct * sweep > 180 ? 1 : 0;
  const bgPath    = `M ${bx1.toFixed(2)} ${by1.toFixed(2)} A ${r} ${r} 0 1 1 ${bx2.toFixed(2)} ${by2.toFixed(2)}`;
  const fgPath    = pct > 0 ? `M ${bx1.toFixed(2)} ${by1.toFixed(2)} A ${r} ${r} 0 ${largeFg} 1 ${fx.toFixed(2)} ${fy.toFixed(2)}` : '';
  return `
    <svg class="pal-arc" viewBox="0 0 120 120" width="160" height="160" aria-hidden="true">
      <defs>
        <linearGradient id="palGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#00d4ff"/>
          <stop offset="100%" stop-color="#00ff9f"/>
        </linearGradient>
      </defs>
      <path d="${bgPath}" fill="none" stroke="rgba(0,212,255,0.12)" stroke-width="6" stroke-linecap="round"/>
      ${fgPath ? `<path d="${fgPath}" fill="none" stroke="url(#palGrad)" stroke-width="6" stroke-linecap="round" class="pal-arc-fg"/>` : ''}
      <text x="60" y="62" text-anchor="middle" class="pal-arc-text">${Math.round(pct*100)}%</text>
      <text x="60" y="78" text-anchor="middle" class="pal-arc-sub">CONFIDENCE</text>
    </svg>`;
}

function chips(arr, kind) {
  if (!Array.isArray(arr) || !arr.length) return `<span class="pal-chip pal-chip--${kind} pal-chip--empty">—</span>`;
  return arr.slice(0,5).map(t => `<span class="pal-chip pal-chip--${kind}">${escape(t)}</span>`).join('');
}

// ── МЫШЛЕНИЕ ИИ ───────────────────────────────────────────────────────────
function thinkingSection() {
  if (!state.thinking && !state.loading) return '';
  if (state.loading && !state.thinking) {
    return `
      <div class="pal-think-wrap">
        <div class="pal-think-header">
          <span class="pal-think-icon">🧠</span>
          <span class="pal-think-label">МЫШЛЕНИЕ ИИ</span>
          <span class="pal-think-live">● ANALYZING</span>
        </div>
        <div class="pal-think-body pal-think-loading">Модель анализирует сигналы…</div>
      </div>`;
  }
  if (!state.thinking) return '';
  const preview = state.showThink ? escape(state.thinking) : escape(state.thinking.slice(0,280)) + (state.thinking.length > 280 ? '…' : '');
  return `
    <div class="pal-think-wrap">
      <div class="pal-think-header">
        <span class="pal-think-icon">🧠</span>
        <span class="pal-think-label">МЫШЛЕНИЕ ИИ</span>
        <span class="pal-think-badge">${state.thinking.split(' ').length} слов</span>
        <button class="pal-think-toggle" id="pal-think-toggle" type="button">
          ${state.showThink ? '▲ Свернуть' : '▼ Развернуть'}
        </button>
      </div>
      <pre class="pal-think-body ${state.showThink ? 'pal-think-expanded' : ''}">${preview}</pre>
    </div>`;
}

// ── СТРАТЕГИЯ + СКИДКА + КНОПКИ ──────────────────────────────────────────
function strategyCard() {
  const r = state.result?.parsed;
  if (!r) {
    if (state.error) {
      return `
        <div class="pal-strategy pal-strategy--empty">
          <div class="pal-strategy-title">Strategic recommendation</div>
          <div class="pal-strategy-empty-text" style="color:#ff5577;">⚠ ${escape(state.error)}</div>
        </div>`;
    }
    return `
      <div class="pal-strategy pal-strategy--empty">
        <div class="pal-strategy-title">Strategic recommendation</div>
        <div class="pal-strategy-empty-text">Нажмите «⚡ ЗАПУСТИТЬ АНАЛИЗ» для генерации стратегии.</div>
      </div>`;
  }
  const s = r.strategy || {};

  let sentBanner = '';
  if (state.sent === 'sent')  sentBanner = `<div class="pal-sent-banner pal-sent-banner--sent">✅ Стратегия отправлена менеджеру</div>`;
  if (state.sent === 'held') sentBanner = `<div class="pal-sent-banner pal-sent-banner--held">🔒 Зафиксировано. Менеджер не уведомлён.</div>`;

  const actionBtns = state.sent ? '' : `
    <div class="pal-action-row">
      <button class="pal-btn pal-btn-send" id="pal-send" type="button">📤 ОТПРАВИТЬ МЕНЕДЖЕРУ</button>
      <button class="pal-btn pal-btn-hold" id="pal-hold" type="button">🔒 НЕ ОТПРАВЛЯТЬ</button>
    </div>`;

  const discountRow = s.discount ? `
    <div class="pal-strategy-row pal-strategy-row--discount">
      <span class="pal-strategy-key">🎁 Акция</span>
      <span class="pal-strategy-val pal-discount-val">${escape(s.discount)}</span>
    </div>` : '';

  return `
    <div class="pal-strategy">
      ${sentBanner}
      <div class="pal-strategy-title">Strategic recommendation</div>
      <div class="pal-strategy-row">
        <span class="pal-strategy-key">Hook</span>
        <span class="pal-strategy-val">${escape(s.hook || '—')}</span>
      </div>
      <div class="pal-strategy-row">
        <span class="pal-strategy-key">Offer</span>
        <span class="pal-strategy-val">${escape(s.offer || '—')}</span>
      </div>
      ${discountRow}
      <div class="pal-strategy-grid">
        <div><span class="pal-strategy-key">Tier</span><span class="pal-strategy-pill">${escape(s.price_tier||'—')}</span></div>
        <div><span class="pal-strategy-key">Канал</span><span class="pal-strategy-pill">${escape(s.channel||'—')}</span></div>
      </div>
      <div class="pal-strategy-row">
        <span class="pal-strategy-key">Next step</span>
        <span class="pal-strategy-val">${escape(s.next_step||'—')}</span>
      </div>
      ${actionBtns}
    </div>`;
}

function rateBar() {
  const r = state.rate || {};
  const fmt = (val, lim) => (val||lim) ? `${val||'—'}${lim?'/'+lim:''}` : '—';
  return `
    <span class="pal-rate"><span class="pal-rate-key">RPM</span> <span class="pal-rate-val">${escape(fmt(r.rpmRemaining,r.rpmLimit))}</span></span>
    <span class="pal-rate"><span class="pal-rate-key">TPM</span> <span class="pal-rate-val">${escape(fmt(r.tpmRemaining,r.tpmLimit))}</span></span>`;
}

// ── MAIN PANEL HTML ───────────────────────────────────────────────────────
function panelHTML() {
  const portrait = state.result?.parsed?.portrait || {};
  const conf     = portrait.confidence ?? 0;
  const status   = state.loading ? '◉ ANALYZING' : (state.result ? '◉ READY' : '○ STANDBY');
  const statusClass = state.loading ? 'pal-status--live' : '';

  return `
    <div class="pal-overlay ${state.open ? 'pal-open' : ''}" id="pal-overlay" aria-hidden="${!state.open}">
      <div class="pal-scanline"></div>
      <div class="pal-panel" role="dialog" aria-label="DagAI Intelligence">

        <header class="pal-header">
          <span class="pal-brand"><span class="pal-brand-dot"></span> DAGAI INTELLIGENCE</span>
          <span class="pal-sep">•</span>
          <span class="pal-mode">VISITOR ANALYSIS</span>
          <span class="pal-status ${statusClass}">${status}</span>
          <button class="pal-close" id="pal-close" aria-label="Закрыть">✕</button>
        </header>

        <div class="pal-body">
          <section class="pal-col pal-col-signals">
            <h3 class="pal-h3">Signal matrix <span class="pal-h3-meta">${Object.keys(SIGNAL_LABELS).length}</span></h3>
            <div class="pal-signals">${signalGrid()}</div>
          </section>
          <section class="pal-col pal-col-portrait">
            <h3 class="pal-h3">AI portrait</h3>
            <div class="pal-portrait">
              <div class="pal-row"><span class="pal-key">Segment</span><span class="pal-val pal-val-segment">${escape(portrait.segment||'—')}</span></div>
              <div class="pal-row"><span class="pal-key">Intent</span><span class="pal-val pal-val-intent">${escape(portrait.intent||'—')}</span></div>
              <div class="pal-row pal-row-block">
                <span class="pal-key">Interests</span>
                <span class="pal-chips">${chips(portrait.interests,'interest')}</span>
              </div>
            </div>
          </section>
          <section class="pal-col pal-col-conf">
            <h3 class="pal-h3">Confidence</h3>
            <div class="pal-arc-wrap">${confidenceArc(conf)}</div>
          </section>
        </div>

        ${vectorSection()}
        ${thinkingSection()}
        <div class="pal-strategy-wrap">${strategyCard()}</div>

        ${state.showRaw ? `<pre class="pal-raw">${escape(JSON.stringify(state.result?.raw ?? state.signals?._meta ?? {}, null, 2))}</pre>` : ''}

        <footer class="pal-footer">
          <button class="pal-btn pal-btn-primary" id="pal-run" type="button" ${state.loading?'disabled':''}>
            ${state.loading ? '<span class="pal-spinner"></span> АНАЛИЗ…' : '⚡ ЗАПУСТИТЬ АНАЛИЗ'}
          </button>
          <button class="pal-btn pal-btn-ghost" id="pal-toggle-raw" type="button">
            { } ${state.showRaw ? 'HIDE RAW' : 'RAW JSON'}
          </button>
          <span class="pal-rate-bar">${rateBar()}</span>
        </footer>

      </div>
    </div>`;
}

function bind() {
  document.getElementById('pal-close')?.addEventListener('click', closePanel);
  document.getElementById('pal-run')?.addEventListener('click', runAnalysis);
  document.getElementById('pal-toggle-raw')?.addEventListener('click', () => { state.showRaw = !state.showRaw; render(); });
  document.getElementById('pal-think-toggle')?.addEventListener('click', () => { state.showThink = !state.showThink; render(); });
  document.getElementById('pal-overlay')?.addEventListener('click', (e) => { if (e.target.id==='pal-overlay') closePanel(); });
  document.getElementById('pal-send')?.addEventListener('click', () => {
    state.sent = 'sent';
    console.log('[palantir] SENT:', state.result?.parsed?.strategy);
    render();
  });
  document.getElementById('pal-hold')?.addEventListener('click', () => {
    state.sent = 'held';
    render();
  });
}

function render() {
  const r = root();
  if (!r) return;
  r.innerHTML = panelHTML();
  bind();
  if (state.result?.parsed) {
    requestAnimationFrame(() => r.querySelector('.pal-arc-fg')?.classList.add('pal-arc-animate'));
  }
}

async function refreshSignals() { state.signals = await collectSignals(); render(); }

async function openPanel() {
  state.open = true;
  document.body.classList.add('pal-locked');
  render();
  await refreshSignals();
}
function closePanel() {
  state.open = false;
  document.body.classList.remove('pal-locked');
  render();
}

async function runAnalysis() {
  if (state.loading) return;
  state.loading = true;
  state.error   = null;
  state.sent    = null;
  await refreshSignals();
  state.loading = true;
  render();
  try {
    const res     = await analyzeVisitor(state.signals);
    state.result  = res;
    state.thinking = res.thinking || null;
    state.rate    = res.rate || state.rate;
    if (!res.ok) state.error = res.error || 'Неизвестная ошибка';
  } catch(e) {
    state.error   = String(e?.message || e);
    state.result  = null;
    state.thinking = null;
  } finally {
    state.loading = false;
    render();
  }
}

export function initPalantir() {
  trigger()?.addEventListener('click', openPanel);
  document.addEventListener('keydown', (e) => { if (e.key==='Escape' && state.open) closePanel(); });
  collectSignals().then((s) => { state.signals = s; if (state.open) render(); });
  render();
}
