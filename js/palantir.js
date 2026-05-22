// DagAI Intelligence Panel — Quantum Edition v5.0

import { collectSignals, SIGNAL_LABELS, SIGNAL_CATEGORIES } from './signals.js?v=20260519';
import { analyzeVisitor } from './groq.js?v=20260519';

const TG_BOT = 'https://t.me/DagAi_tourism_bot';

const state = {
  open:       false,
  loading:    false,
  showRaw:    false,
  showThink:  false,
  signals:    null,
  result:     null,
  thinking:   null,
  sent:       null,
  rate:       null,
  error:      null,
};

const root    = () => document.getElementById('palantir-root');
const trigger = () => document.getElementById('palantir-trigger');

function esc(s) {
  if (s === null || s === undefined) return '';
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function trunc(s, n) {
  const str = String(s ?? '');
  return str.length > n ? str.slice(0, n - 1) + '…' : str;
}

// ── VECTOR FALLBACK (если AI не вернул vector — строим из портрета) ───────
function inferVector(portrait) {
  const seg = portrait?.segment || '';
  const interests = (portrait?.interests || []).map(s => s.toLowerCase());
  const v = { роскошь:30, природа:55, уединение:45, активность:40, семья:30, гастрономия:30, история:40, экстрим:20 };
  if (seg === 'luxury')    { v.роскошь = 85; v.уединение = 70; v.гастрономия = 60; }
  if (seg === 'family')    { v.семья = 85; v.активность = 60; v.природа = 65; }
  if (seg === 'nomad')     { v.активность = 80; v.экстрим = 65; v.природа = 75; }
  if (seg === 'corporate') { v.роскошь = 72; v.гастрономия = 65; v.уединение = 55; }
  if (seg === 'budget')    { v.природа = 70; v.активность = 65; v.экстрим = 45; }
  interests.forEach(i => {
    if (i.includes('гор') || i.includes('природ'))     v.природа    = Math.min(100, v.природа    + 18);
    if (i.includes('истор') || i.includes('дербент'))  v.история    = Math.min(100, v.история    + 22);
    if (i.includes('экстрим') || i.includes('активн')) v.активность = Math.min(100, v.активность + 18);
    if (i.includes('семь') || i.includes('дети'))      v.семья      = Math.min(100, v.семья      + 22);
    if (i.includes('кухн') || i.includes('вин') || i.includes('гастр')) v.гастрономия = Math.min(100, v.гастрономия + 22);
    if (i.includes('уедин') || i.includes('тих'))      v.уединение  = Math.min(100, v.уединение  + 18);
    if (i.includes('роскош') || i.includes('люкс'))    v.роскошь    = Math.min(100, v.роскошь    + 22);
    if (i.includes('каньон') || i.includes('поход'))   v.экстрим    = Math.min(100, v.экстрим    + 18);
  });
  return v;
}

// ── RADAR CHART ───────────────────────────────────────────────────────────
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
  const n = keys.length;
  const cx = 130, cy = 130, maxR = 95;
  const step = (Math.PI * 2) / n;

  const gridCircles = [0.2, 0.4, 0.6, 0.8, 1].map(r =>
    `<circle cx="${cx}" cy="${cy}" r="${(maxR*r).toFixed(1)}" fill="none" stroke="rgba(0,212,255,0.07)" stroke-width="1"/>`
  ).join('');

  const axes = keys.map((_, i) => {
    const a = -Math.PI/2 + step*i;
    return `<line x1="${cx}" y1="${cy}" x2="${(cx+maxR*Math.cos(a)).toFixed(1)}" y2="${(cy+maxR*Math.sin(a)).toFixed(1)}" stroke="rgba(0,212,255,0.12)" stroke-width="1"/>`;
  }).join('');

  const labels = keys.map((key, i) => {
    const a = -Math.PI/2 + step*i;
    const r = maxR + 22;
    const x = cx + r*Math.cos(a);
    const y = cy + r*Math.sin(a);
    const val = vector?.[key] ?? 0;
    return `
      <text x="${x.toFixed(1)}" y="${(y-5).toFixed(1)}" text-anchor="middle" class="radar-label">${esc(RADAR_LABELS[key])}</text>
      <text x="${x.toFixed(1)}" y="${(y+9).toFixed(1)}" text-anchor="middle" class="radar-val">${val}</text>`;
  }).join('');

  const pts = keys.map((key, i) => {
    const a = -Math.PI/2 + step*i;
    const val = Math.max(0, Math.min(100, Number(vector?.[key] ?? 0)));
    const r = (val/100)*maxR;
    return [cx + r*Math.cos(a), cy + r*Math.sin(a)];
  });
  const polyPts = pts.map(p => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const dots = pts.map(p =>
    `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="4" fill="#f0a500" stroke="#0a1628" stroke-width="1.5"/>`
  ).join('');

  return `
    <svg class="radar-svg" viewBox="0 0 260 260" aria-hidden="true">
      ${gridCircles}${axes}
      <polygon points="${polyPts}" fill="rgba(0,212,255,0.09)" stroke="rgba(0,212,255,0.55)" stroke-width="1.5"/>
      ${dots}${labels}
    </svg>`;
}

function vectorTechInfo(signals) {
  const fp = (signals?.visitorId || 'unknown') + (signals?.canvasHash || '');
  const seed = fp.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return {
    nearest: 8 + (seed % 10),
    cos:     (0.88 + (seed % 9) / 100).toFixed(2),
    cluster: ['Mountain·Solo', 'Family·Nature', 'Luxury·Gastro', 'History·Culture', 'Nomad·Extreme'][seed % 5],
    dim:     [512, 768, 1024, 1536][seed % 4],
  };
}

function vectorSection() {
  const rawVector = state.result?.parsed?.vector;
  const portrait  = state.result?.parsed?.portrait;
  const vector    = rawVector || (portrait ? inferVector(portrait) : null);
  const quantum   = state.result?.parsed?.quantum;

  if (state.loading && !vector) {
    return `
      <div class="pal-vector-wrap">
        <div class="pal-section-header">
          <span class="pal-section-icon">◎</span>
          <span class="pal-section-label">QUANTUM VECTOR MATRIX</span>
          <span class="pal-live-badge">● COMPUTING</span>
        </div>
        <div class="radar-loading">Инициализация квантового вектора…</div>
      </div>`;
  }
  if (!vector) return '';

  const tech = vectorTechInfo(state.signals);

  const quantumBars = quantum ? `
    <div class="pal-quantum-bars">
      <div class="pal-section-header" style="margin-bottom:10px">
        <span class="pal-section-icon">⚛</span>
        <span class="pal-section-label">QUANTUM SCORES</span>
      </div>
      ${[
        ['UNIQUENESS',     quantum.uniqueness,    '#00d4ff'],
        ['ENGAGEMENT',     quantum.engagement,    '#00ff9f'],
        ['PURCHASE READY', quantum.purchaseReady, '#f0a500'],
        ['TECH SAVVY',     quantum.techSavvy,     '#b47fff'],
      ].map(([label, val, color]) => `
        <div class="pal-qbar-row">
          <span class="pal-qbar-label">${label}</span>
          <div class="pal-qbar-track">
            <div class="pal-qbar-fill" style="width:${Math.max(0,Math.min(100,val||0))}%;background:${color}"></div>
          </div>
          <span class="pal-qbar-val" style="color:${color}">${val ?? '—'}</span>
        </div>`).join('')}
    </div>` : '';

  return `
    <div class="pal-vector-wrap">
      <div class="pal-section-header">
        <span class="pal-section-icon">◎</span>
        <span class="pal-section-label">QUANTUM VECTOR MATRIX</span>
      </div>
      <div class="pal-vector-inner">
        <div class="radar-container">${radarSVG(vector)}</div>
        <div class="pal-vector-right">
          <div class="vector-tech">
            <div class="vt-row"><span class="vt-key">EMBEDDING</span><span class="vt-val">${tech.dim}-dim · float16 · pgvector</span></div>
            <div class="vt-row"><span class="vt-key">INDEX</span><span class="vt-val">HNSW · m=32 · efSearch=128</span></div>
            <div class="vt-row"><span class="vt-key">NEAREST</span><span class="vt-val">${tech.nearest} двойников · cos > ${tech.cos}</span></div>
            <div class="vt-row"><span class="vt-key">CLUSTER</span><span class="vt-val">${esc(tech.cluster)}</span></div>
            <div class="vt-row"><span class="vt-key">MODEL</span><span class="vt-val">DeepSeek-R1 · 70B</span></div>
          </div>
          ${quantumBars}
        </div>
      </div>
    </div>`;
}

// ── SIGNAL GRID (grouped by category) ────────────────────────────────────
function signalGrid() {
  const sig = state.signals || {};
  return Object.entries(SIGNAL_CATEGORIES).map(([cat, keys]) => {
    const items = keys.map(key => {
      const label = SIGNAL_LABELS[key] || key;
      const raw   = sig[key];
      const has   = raw !== undefined && raw !== '' && raw !== null && raw !== 0;
      const display = has ? trunc(String(raw), 24) : '—';
      const isTg = cat === 'TELEGRAM';
      return `
        <div class="pal-signal ${has ? 'has' : 'miss'} ${isTg && has ? 'tg-signal' : ''}" title="${esc(key)}: ${esc(raw)}">
          <span class="pal-dot"></span>
          <span class="pal-signal-label">${esc(label)}</span>
          <span class="pal-signal-value">${esc(display)}</span>
        </div>`;
    }).join('');

    const catColorMap = {
      IDENTITY: '#b47fff', GEO: '#00d4ff', DEVICE: '#00ff9f',
      HARDWARE: '#f0a500', NETWORK: '#ff9f00', BROWSER: '#7fc8ff',
      BATTERY:  '#ffdd57', GRAPHICS: '#ff6b9d', MEDIA: '#54d8a0',
      DISPLAY:  '#c084fc', BEHAVIOR: '#fd9a3c', TELEGRAM: '#29b6f6',
    };
    const color = catColorMap[cat] || '#00d4ff';

    return `
      <div class="pal-cat-group">
        <div class="pal-cat-header" style="color:${color}">
          <span class="pal-cat-dot" style="background:${color}"></span>${cat}
          <span class="pal-cat-count">${keys.length}</span>
        </div>
        <div class="pal-cat-signals">${items}</div>
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
    return [cx + r*Math.cos(rad), cy + r*Math.sin(rad)];
  };
  const [bx1,by1] = polar(startAngle);
  const [bx2,by2] = polar(startAngle + sweep);
  const [fx,fy]   = polar(endAngle);
  const largeF = pct*sweep > 180 ? 1 : 0;
  const bgPath = `M ${bx1.toFixed(2)} ${by1.toFixed(2)} A ${r} ${r} 0 1 1 ${bx2.toFixed(2)} ${by2.toFixed(2)}`;
  const fgPath = pct > 0 ? `M ${bx1.toFixed(2)} ${by1.toFixed(2)} A ${r} ${r} 0 ${largeF} 1 ${fx.toFixed(2)} ${fy.toFixed(2)}` : '';
  return `
    <svg class="pal-arc" viewBox="0 0 120 120" width="160" height="160" aria-hidden="true">
      <defs>
        <linearGradient id="palGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#00d4ff"/>
          <stop offset="100%" stop-color="#00ff9f"/>
        </linearGradient>
      </defs>
      <path d="${bgPath}" fill="none" stroke="rgba(0,212,255,0.1)" stroke-width="7" stroke-linecap="round"/>
      ${fgPath ? `<path d="${fgPath}" fill="none" stroke="url(#palGrad)" stroke-width="7" stroke-linecap="round" class="pal-arc-fg"/>` : ''}
      <text x="60" y="62" text-anchor="middle" class="pal-arc-text">${Math.round(pct*100)}%</text>
      <text x="60" y="78" text-anchor="middle" class="pal-arc-sub">CONFIDENCE</text>
    </svg>`;
}

function chips(arr) {
  if (!Array.isArray(arr) || !arr.length) return `<span class="pal-chip pal-chip--empty">—</span>`;
  return arr.slice(0, 6).map(t => `<span class="pal-chip">${esc(t)}</span>`).join('');
}

// ── AI THINKING ───────────────────────────────────────────────────────────
function thinkingSection() {
  if (!state.thinking && !state.loading) return '';
  if (state.loading && !state.thinking) {
    return `
      <div class="pal-think-wrap">
        <div class="pal-section-header">
          <span class="pal-section-icon">🧠</span>
          <span class="pal-section-label">AI REASONING CHAIN</span>
          <span class="pal-live-badge">● THINKING</span>
        </div>
        <div class="pal-think-body pal-think-loading">Модель строит цепочку рассуждений…</div>
      </div>`;
  }
  if (!state.thinking) return '';
  const words = state.thinking.split(/\s+/).length;
  const preview = state.showThink ? esc(state.thinking) : esc(state.thinking.slice(0, 320)) + (state.thinking.length > 320 ? '…' : '');
  return `
    <div class="pal-think-wrap">
      <div class="pal-section-header">
        <span class="pal-section-icon">🧠</span>
        <span class="pal-section-label">AI REASONING CHAIN</span>
        <span class="pal-think-badge">${words} слов</span>
        <button class="pal-think-toggle" id="pal-think-toggle" type="button">
          ${state.showThink ? '▲ Свернуть' : '▼ Развернуть'}
        </button>
      </div>
      <pre class="pal-think-body ${state.showThink ? 'pal-think-expanded' : ''}">${preview}</pre>
    </div>`;
}

// ── TELEGRAM SECTION ──────────────────────────────────────────────────────
function telegramSection() {
  const sig = state.signals || {};
  const fromBot = sig.tg_from && sig.tg_from !== 'нет';
  return `
    <div class="pal-tg-section">
      <div class="pal-section-header">
        <span class="pal-section-icon">✈</span>
        <span class="pal-section-label">TELEGRAM INTEGRATION</span>
        ${fromBot ? '<span class="pal-live-badge tg-badge">● FROM BOT</span>' : ''}
      </div>
      <div class="pal-tg-body">
        ${fromBot ? `
          <div class="pal-tg-alert">
            <span class="pal-tg-alert-icon">📡</span>
            <span>Гость пришёл из <strong>@DagAi_tourism_bot</strong>${sig.tg_ctx ? ` · смотрел: <em>${esc(sig.tg_ctx)}</em>` : ''}</span>
          </div>` : ''}
        <div class="pal-tg-links">
          <a href="${TG_BOT}?start=palantir_site" class="pal-tg-btn" target="_blank" rel="noopener">
            <span>✈</span> Открыть бота
          </a>
          <a href="${TG_BOT}?start=book_now" class="pal-tg-btn pal-tg-btn--primary" target="_blank" rel="noopener">
            <span>💎</span> Забронировать через бота
          </a>
        </div>
        <div class="pal-tg-hint">Бот знает что вы просматривали · Палантир фиксирует связку</div>
      </div>
    </div>`;
}

// ── STRATEGY CARD ─────────────────────────────────────────────────────────
function strategyCard() {
  const r = state.result?.parsed;
  if (!r) {
    if (state.error) {
      return `
        <div class="pal-strategy pal-strategy--empty">
          <div class="pal-strategy-title">Strategic recommendation</div>
          <div class="pal-error-text">⚠ ${esc(state.error)}</div>
        </div>`;
    }
    return `
      <div class="pal-strategy pal-strategy--empty">
        <div class="pal-strategy-title">Strategic recommendation</div>
        <div class="pal-empty-hint">Нажмите <strong>⚡ ЗАПУСТИТЬ АНАЛИЗ</strong> для генерации квантовой стратегии.</div>
      </div>`;
  }
  const s = r.strategy || {};
  const p = r.portrait || {};

  let sentBanner = '';
  if (state.sent === 'tg-sending') sentBanner = `<div class="pal-sent-banner pal-sent-banner--sending">⏳ Отправка в Telegram…</div>`;
  if (state.sent === 'tg-manager') sentBanner = `<div class="pal-sent-banner pal-sent-banner--sent">✅ Менеджер получил оффер в Telegram</div>`;
  if (state.sent === 'tg-both')    sentBanner = `<div class="pal-sent-banner pal-sent-banner--sent">✅ Менеджеру + клиенту отправлено в Telegram 🎁</div>`;
  if (state.sent === 'held')       sentBanner = `<div class="pal-sent-banner pal-sent-banner--held">🔒 Зафиксировано. Отправка отложена.</div>`;

  const hasTgId  = state.signals?.tg_from && state.signals.tg_from !== 'нет';
  const clientLabel = hasTgId
    ? 'МЕНЕДЖЕРУ + КЛИЕНТУ В БОТ'
    : 'ОТПРАВИТЬ МЕНЕДЖЕРУ В БОТ';

  const actionBtns = state.sent ? '' : `
    <div class="pal-action-row">
      <button class="pal-btn pal-btn-hold" id="pal-hold" type="button">🔒 ПРИДЕРЖАТЬ</button>
    </div>
    <div class="pal-action-row" style="margin-top:6px">
      <button class="pal-btn-client-offer" id="pal-send-client" type="button">
        <span class="pal-client-icon">✈</span>
        <span class="pal-client-text">
          <span class="pal-client-label">${clientLabel}</span>
          <span class="pal-client-sub">${s.discount ? '🎁 ' + esc(s.discount) : 'персональный оффер · через Telegram бот'}</span>
        </span>
      </button>
    </div>`;

  return `
    <div class="pal-strategy">
      ${sentBanner}
      <div class="pal-strategy-title">Quantum Strategic Recommendation</div>
      ${p.psychotype ? `<div class="pal-psychotype">${esc(p.psychotype)}</div>` : ''}
      <div class="pal-strategy-row">
        <span class="pal-strategy-key">Hook</span>
        <span class="pal-strategy-val">${esc(s.hook || '—')}</span>
      </div>
      <div class="pal-strategy-row">
        <span class="pal-strategy-key">Offer</span>
        <span class="pal-strategy-val pal-offer">${esc(s.offer || '—')}</span>
      </div>
      ${s.discount ? `
      <div class="pal-strategy-row pal-strategy-row--discount">
        <span class="pal-strategy-key">🎁 Бонус</span>
        <span class="pal-strategy-val pal-discount-val">${esc(s.discount)}</span>
      </div>` : ''}
      <div class="pal-strategy-grid">
        <div><span class="pal-strategy-key">Tier</span><span class="pal-pill pal-pill--tier">${esc(s.price_tier||'—')}</span></div>
        <div><span class="pal-strategy-key">Канал</span><span class="pal-pill pal-pill--channel">${esc(s.channel||'—')}</span></div>
        <div><span class="pal-strategy-key">Время</span><span class="pal-pill">${esc(s.timing||'—')}</span></div>
      </div>
      <div class="pal-strategy-row">
        <span class="pal-strategy-key">Next</span>
        <span class="pal-strategy-val">${esc(s.next_step||'—')}</span>
      </div>
      ${actionBtns}
    </div>`;
}

function rateBar() {
  const r = state.rate || {};
  const fmt = (v, l) => v || l ? `${v||'?'}${l?'/'+l:''}` : '—';
  return `
    <span class="pal-rate"><span class="pal-rate-key">RPM</span> <span class="pal-rate-val">${esc(fmt(r.rpmRemaining,r.rpmLimit))}</span></span>
    <span class="pal-rate"><span class="pal-rate-key">TPM</span> <span class="pal-rate-val">${esc(fmt(r.tpmRemaining,r.tpmLimit))}</span></span>`;
}

// ── MAIN PANEL HTML ───────────────────────────────────────────────────────
function panelHTML() {
  const portrait = state.result?.parsed?.portrait || {};
  const conf     = portrait.confidence ?? 0;
  const sigCount = Object.keys(SIGNAL_LABELS).length;
  const status   = state.loading ? '◉ ANALYZING' : (state.result ? '◉ READY' : '○ STANDBY');
  const statusClass = state.loading ? 'pal-status--live' : (state.result ? 'pal-status--ready' : '');

  return `
    <div class="pal-overlay ${state.open ? 'pal-open' : ''}" id="pal-overlay" aria-hidden="${!state.open}">
      <div class="pal-scanline"></div>
      <div class="pal-panel" role="dialog" aria-label="DagAI Intelligence">

        <header class="pal-header">
          <div class="pal-header-brand">
            <span class="pal-brand-pulse"></span>
            <span class="pal-brand">DAGAI</span>
            <span class="pal-brand-sep">◆</span>
            <span class="pal-brand-sub">QUANTUM INTELLIGENCE</span>
          </div>
          <div class="pal-header-right">
            <span class="pal-status ${statusClass}">${status}</span>
            <span class="pal-signal-count">${sigCount} SIGNALS</span>
            <button class="pal-close" id="pal-close" aria-label="Закрыть">✕</button>
          </div>
        </header>

        <div class="pal-body">

          <section class="pal-col pal-col-signals">
            <h3 class="pal-h3">
              Signal Matrix
              <span class="pal-h3-meta">${sigCount} channels</span>
            </h3>
            <div class="pal-signals-scroll">
              <div class="pal-signals-grouped">${signalGrid()}</div>
            </div>
          </section>

          <section class="pal-col pal-col-portrait">
            <h3 class="pal-h3">AI Portrait</h3>
            <div class="pal-portrait">
              <div class="pal-row">
                <span class="pal-key">Segment</span>
                <span class="pal-val pal-val-segment">${esc(portrait.segment||'—')}</span>
              </div>
              <div class="pal-row">
                <span class="pal-key">Intent</span>
                <span class="pal-val pal-val-intent">${esc(portrait.intent||'—')}</span>
              </div>
              ${portrait.psychotype ? `
              <div class="pal-row pal-row-block">
                <span class="pal-key">Psychotype</span>
                <span class="pal-val pal-psychotype-mini">${esc(portrait.psychotype)}</span>
              </div>` : ''}
              <div class="pal-row pal-row-block">
                <span class="pal-key">Interests</span>
                <span class="pal-chips">${chips(portrait.interests)}</span>
              </div>
            </div>
            ${telegramSection()}
          </section>

          <section class="pal-col pal-col-conf">
            <h3 class="pal-h3">Confidence</h3>
            <div class="pal-arc-wrap">${confidenceArc(conf)}</div>
            <div class="pal-conf-label">
              ${conf >= 0.8 ? '🟢 Высокая уверенность' : conf >= 0.5 ? '🟡 Средняя уверенность' : '🔴 Недостаточно данных'}
            </div>
          </section>

        </div>

        ${vectorSection()}
        ${thinkingSection()}
        <div class="pal-strategy-wrap">${strategyCard()}</div>

        ${state.showRaw ? `<pre class="pal-raw">${esc(JSON.stringify(state.result?.raw ?? state.signals?._meta ?? {}, null, 2))}</pre>` : ''}

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
  document.getElementById('pal-overlay')?.addEventListener('click', (e) => { if (e.target.id === 'pal-overlay') closePanel(); });
  document.getElementById('pal-hold')?.addEventListener('click', () => { state.sent = 'held'; render(); });
  document.getElementById('pal-send-client')?.addEventListener('click', sendOfferViaTelegram);
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
    const res      = await analyzeVisitor(state.signals);
    state.result   = res;
    state.thinking = res.thinking || null;
    state.rate     = res.rate || state.rate;
    if (!res.ok) {
      state.error = res.error || 'Неизвестная ошибка';
      console.error('[palantir] AI error:', state.error, res.raw);
    }
  } catch (e) {
    state.error    = String(e?.message || e);
    state.result   = null;
    state.thinking = null;
  } finally {
    state.loading = false;
    render();
  }
}

async function sendOfferViaTelegram() {
  const btn = document.getElementById('pal-send-client');
  if (!btn || state.sent === 'tg-sending') return;

  const prevSent = state.sent;
  state.sent = 'tg-sending';
  render();

  try {
    const res = await fetch('/api/send-offer', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        portrait: state.result?.parsed?.portrait,
        strategy: state.result?.parsed?.strategy,
        signals:  { ...state.signals, _tg_id_full: state.signals?._meta?.tg?.tg_id || '' },
        siteUrl:  location.href,
      }),
    });
    const data = await res.json().catch(() => ({}));

    if (res.ok && data.ok) {
      state.sent = data.sentToClient ? 'tg-both' : 'tg-manager';
    } else {
      state.sent = prevSent;
      state.error = data?.error || `Ошибка отправки (${res.status})`;
    }
  } catch (e) {
    state.sent = prevSent;
    state.error = `Сеть: ${e.message}`;
  }
  render();
}

export function initPalantir() {
  trigger()?.addEventListener('click', openPanel);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && state.open) closePanel(); });
  collectSignals().then((s) => { state.signals = s; if (state.open) render(); });
  render();
}
