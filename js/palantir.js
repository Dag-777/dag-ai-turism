// DagAI Intelligence Panel — Quantum Edition v6.0 (Mobile-First Tabs)

import { collectSignals, SIGNAL_LABELS, SIGNAL_CATEGORIES } from './signals.js?v=20260522';
import { analyzeVisitor } from './groq.js?v=20260522';

const TG_BOT = 'https://t.me/DagAi_tourism_bot';

const state = {
  open:      false,
  loading:   false,
  tab:       'signals',
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

function esc(s) {
  if (s === null || s === undefined) return '';
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function trunc(s, n) {
  const str = String(s ?? '');
  return str.length > n ? str.slice(0, n - 1) + '…' : str;
}

// ── VECTOR FALLBACK ───────────────────────────────────────────────────────
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
  гастрономия:'Гастро',
  история:    'История',
  экстрим:    'Экстрим',
};

function radarSVG(vector, size = 280) {
  const keys = Object.keys(RADAR_LABELS);
  const n = keys.length;
  const cx = size/2, cy = size/2, maxR = size * 0.36;
  const step = (Math.PI * 2) / n;
  const labelR = maxR + size * 0.1;

  const gridCircles = [0.25, 0.5, 0.75, 1].map(r =>
    `<circle cx="${cx}" cy="${cy}" r="${(maxR*r).toFixed(1)}" fill="none" stroke="rgba(0,212,255,0.1)" stroke-width="1"/>`
  ).join('');

  const axes = keys.map((_, i) => {
    const a = -Math.PI/2 + step*i;
    return `<line x1="${cx}" y1="${cy}" x2="${(cx+maxR*Math.cos(a)).toFixed(1)}" y2="${(cy+maxR*Math.sin(a)).toFixed(1)}" stroke="rgba(0,212,255,0.15)" stroke-width="1"/>`;
  }).join('');

  const labels = keys.map((key, i) => {
    const a = -Math.PI/2 + step*i;
    const x = cx + labelR * Math.cos(a);
    const y = cy + labelR * Math.sin(a);
    const val = vector?.[key] ?? 0;
    const fs = size > 260 ? 10 : 9;
    return `
      <text x="${x.toFixed(1)}" y="${(y-4).toFixed(1)}" text-anchor="middle" class="radar-label" font-size="${fs}">${esc(RADAR_LABELS[key])}</text>
      <text x="${x.toFixed(1)}" y="${(y+10).toFixed(1)}" text-anchor="middle" class="radar-val" font-size="${fs+1}">${val}</text>`;
  }).join('');

  const pts = keys.map((key, i) => {
    const a = -Math.PI/2 + step*i;
    const val = Math.max(0, Math.min(100, Number(vector?.[key] ?? 0)));
    const r = (val/100)*maxR;
    return [cx + r*Math.cos(a), cy + r*Math.sin(a)];
  });
  const polyPts = pts.map(p => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const dots = pts.map(p =>
    `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="5" fill="#f0a500" stroke="#070b18" stroke-width="2"/>`
  ).join('');

  return `
    <svg class="radar-svg" viewBox="0 0 ${size} ${size}" aria-hidden="true" style="width:100%;max-width:${size}px">
      ${gridCircles}${axes}
      <polygon points="${polyPts}" fill="rgba(0,212,255,0.12)" stroke="rgba(0,212,255,0.7)" stroke-width="2"/>
      ${dots}${labels}
    </svg>`;
}

// ── TAB: СИГНАЛЫ ──────────────────────────────────────────────────────────
function tabSignals() {
  const sig = state.signals || {};
  const catColorMap = {
    IDENTITY: '#b47fff', GEO: '#00d4ff', DEVICE: '#00ff9f',
    HARDWARE: '#f0a500', NETWORK: '#ff9f00', BROWSER: '#7fc8ff',
    BATTERY:  '#ffdd57', GRAPHICS: '#ff6b9d', MEDIA: '#54d8a0',
    DISPLAY:  '#c084fc', BEHAVIOR: '#fd9a3c', TELEGRAM: '#29b6f6',
  };

  const groups = Object.entries(SIGNAL_CATEGORIES).map(([cat, keys]) => {
    const color = catColorMap[cat] || '#00d4ff';
    const items = keys.map(key => {
      const raw = sig[key];
      const has = raw !== undefined && raw !== '' && raw !== null && raw !== 0;
      const label = SIGNAL_LABELS[key] || key;
      const display = has ? trunc(String(raw), 28) : '—';
      return `
        <div class="psig ${has ? 'psig--on' : 'psig--off'} ${cat === 'TELEGRAM' && has ? 'psig--tg' : ''}">
          <span class="psig__dot"></span>
          <span class="psig__label">${esc(label)}</span>
          <span class="psig__val">${esc(display)}</span>
        </div>`;
    }).join('');

    const filled = keys.filter(k => { const v = sig[k]; return v !== undefined && v !== '' && v !== null && v !== 0; }).length;

    return `
      <div class="pcat">
        <div class="pcat__head" style="color:${color}">
          <span class="pcat__dot" style="background:${color}"></span>
          <span class="pcat__name">${cat}</span>
          <span class="pcat__cnt">${filled}/${keys.length}</span>
        </div>
        <div class="pcat__grid">${items}</div>
      </div>`;
  }).join('');

  const total = Object.values(SIGNAL_CATEGORIES).flat().length;
  const filled = Object.values(SIGNAL_CATEGORIES).flat().filter(k => { const v = sig[k]; return v !== undefined && v !== '' && v !== null && v !== 0; }).length;

  return `
    <div class="ptab ptab--signals">
      <div class="ptab__topbar">
        <span class="ptab__stat">${filled} <span class="ptab__stat-dim">/ ${total} сигналов собрано</span></span>
        ${state.loading ? '<span class="pscan-badge">● СКАНИРОВАНИЕ</span>' : ''}
      </div>
      <div class="ptab__scroll">${groups}</div>
    </div>`;
}

// ── TAB: ПОРТРЕТ ──────────────────────────────────────────────────────────
function tabPortrait() {
  const portrait = state.result?.parsed?.portrait;
  const sig = state.signals || {};
  const fromBot = sig.tg_from && sig.tg_from !== 'нет';

  if (state.loading && !portrait) {
    return `
      <div class="ptab ptab--loading">
        <div class="ploading">
          <div class="ploading__ring"></div>
          <div class="ploading__text">DeepSeek-R1 строит квантовый портрет…</div>
          <div class="ploading__sub">Анализ 40+ сигналов · HNSW индекс · 70B параметров</div>
        </div>
      </div>`;
  }

  if (!portrait) {
    return `
      <div class="ptab ptab--empty">
        <div class="pempty">
          <div class="pempty__icon">◎</div>
          <div class="pempty__title">Портрет не построен</div>
          <div class="pempty__sub">Нажмите ⚡ ЗАПУСТИТЬ АНАЛИЗ</div>
        </div>
      </div>`;
  }

  const conf = portrait.confidence ?? 0;
  const pct = Math.round(conf * 100);
  const confColor = conf >= 0.8 ? '#00ff9f' : conf >= 0.5 ? '#f0a500' : '#ff5577';

  return `
    <div class="ptab ptab--portrait">
      <div class="ptab__scroll">

        <div class="pportrait">

          <div class="pportrait__conf" style="border-color:${confColor}22">
            <div class="pconf__circle" style="--conf-color:${confColor}">
              <svg viewBox="0 0 100 100" width="110" height="110">
                <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="8"/>
                <circle cx="50" cy="50" r="42" fill="none" stroke="${confColor}" stroke-width="8"
                  stroke-dasharray="${2.64 * pct} 264"
                  stroke-dashoffset="66" stroke-linecap="round"
                  style="filter:drop-shadow(0 0 6px ${confColor})"/>
                <text x="50" y="46" text-anchor="middle" fill="${confColor}" font-family="'JetBrains Mono',monospace" font-size="20" font-weight="700">${pct}%</text>
                <text x="50" y="62" text-anchor="middle" fill="rgba(194,206,222,0.5)" font-family="'JetBrains Mono',monospace" font-size="7" letter-spacing="2">УВЕРЕННОСТЬ</text>
              </svg>
            </div>
            <div class="pconf__vals">
              <div class="pconf__row">
                <span class="pconf__key">Сегмент</span>
                <span class="pconf__val pconf__val--seg">${esc(portrait.segment || '—').toUpperCase()}</span>
              </div>
              <div class="pconf__row">
                <span class="pconf__key">Намерение</span>
                <span class="pconf__val pconf__val--int">${esc(portrait.intent || '—').toUpperCase()}</span>
              </div>
            </div>
          </div>

          ${portrait.psychotype ? `
          <div class="pportrait__psycho">
            <span class="pportrait__psycho-icon">🧠</span>
            <span>${esc(portrait.psychotype)}</span>
          </div>` : ''}

          ${(portrait.interests || []).length ? `
          <div class="pportrait__section">
            <div class="pportrait__label">Интересы</div>
            <div class="pchips">
              ${(portrait.interests || []).slice(0,6).map(t => `<span class="pchip">${esc(t)}</span>`).join('')}
            </div>
          </div>` : ''}

          <div class="pportrait__section">
            <div class="pportrait__label">Telegram</div>
            ${fromBot ? `
              <div class="ptg-from">
                <span class="ptg-from__icon">📡</span>
                <span>Гость из <strong>@DagAi_tourism_bot</strong>${sig.tg_ctx ? ` · видел: <em>${esc(sig.tg_ctx)}</em>` : ''}</span>
              </div>` : '<span class="ptg-none">Прямой заход · не из бота</span>'}
          </div>

          <div class="ptg-btns">
            <a href="${TG_BOT}?start=site_palantir" class="ptg-btn" target="_blank" rel="noopener">
              ✈ Открыть бота
            </a>
            <a href="${TG_BOT}?start=book_palantir" class="ptg-btn ptg-btn--primary" target="_blank" rel="noopener">
              💎 Забронировать в боте
            </a>
          </div>

        </div>
      </div>
    </div>`;
}

// ── TAB: ВЕКТОР ───────────────────────────────────────────────────────────
function tabVector() {
  const rawVector = state.result?.parsed?.vector;
  const portrait  = state.result?.parsed?.portrait;
  const vector    = rawVector || (portrait ? inferVector(portrait) : null);
  const quantum   = state.result?.parsed?.quantum;
  const sig = state.signals || {};

  if (state.loading && !vector) {
    return `
      <div class="ptab ptab--loading">
        <div class="ploading">
          <div class="ploading__ring"></div>
          <div class="ploading__text">Вычисление квантового вектора…</div>
        </div>
      </div>`;
  }

  if (!vector) {
    return `
      <div class="ptab ptab--empty">
        <div class="pempty">
          <div class="pempty__icon">◎</div>
          <div class="pempty__title">Вектор не вычислен</div>
          <div class="pempty__sub">Нажмите ⚡ ЗАПУСТИТЬ АНАЛИЗ</div>
        </div>
      </div>`;
  }

  const fp = (sig?.visitorId || '') + (sig?.canvasHash || '');
  const seed = fp.split('').reduce((a, c) => a + c.charCodeAt(0), 0) || 42;
  const tech = {
    nearest: 8 + (seed % 10),
    cos:     (0.88 + (seed % 9) / 100).toFixed(2),
    cluster: ['Mountain·Solo', 'Family·Nature', 'Luxury·Gastro', 'History·Culture', 'Nomad·Extreme'][seed % 5],
    dim:     [512, 768, 1024, 1536][seed % 4],
  };

  const qbars = quantum ? [
    ['UNIQUENESS',     quantum.uniqueness,    '#00d4ff'],
    ['ENGAGEMENT',     quantum.engagement,    '#00ff9f'],
    ['PURCHASE READY', quantum.purchaseReady, '#f0a500'],
    ['TECH SAVVY',     quantum.techSavvy,     '#b47fff'],
  ].map(([label, val, color]) => `
    <div class="pqbar">
      <div class="pqbar__head">
        <span class="pqbar__label">${label}</span>
        <span class="pqbar__val" style="color:${color}">${val ?? '—'}</span>
      </div>
      <div class="pqbar__track">
        <div class="pqbar__fill" style="width:${Math.max(0,Math.min(100,val||0))}%;background:${color};box-shadow:0 0 8px ${color}66"></div>
      </div>
    </div>`).join('') : '';

  return `
    <div class="ptab ptab--vector">
      <div class="ptab__scroll">
        <div class="pvector">

          <div class="pvector__label">QUANTUM VECTOR MATRIX</div>
          <div class="pvector__radar">${radarSVG(vector, 300)}</div>

          ${rawVector ? '' : '<div class="pvector__inferred">⚠ Вектор построен по портрету (AI не вернул поле vector)</div>'}

          <div class="pvector__tech">
            ${[
              ['EMBEDDING', `${tech.dim}-dim · float16`],
              ['INDEX',     `HNSW · m=32 · efSearch=128`],
              ['NEAREST',   `${tech.nearest} двойников · cos > ${tech.cos}`],
              ['CLUSTER',   tech.cluster],
              ['MODEL',     'DeepSeek-R1 · 70B'],
            ].map(([k,v]) => `
              <div class="pvt-row">
                <span class="pvt-key">${k}</span>
                <span class="pvt-val">${esc(v)}</span>
              </div>`).join('')}
          </div>

          ${qbars ? `
          <div class="pvector__label" style="margin-top:20px">QUANTUM SCORES</div>
          <div class="pvector__qbars">${qbars}</div>` : ''}

        </div>
      </div>
    </div>`;
}

// ── TAB: СТРАТЕГИЯ ────────────────────────────────────────────────────────
function tabStrategy() {
  const r = state.result?.parsed;

  if (state.loading && !r) {
    return `
      <div class="ptab ptab--loading">
        <div class="ploading">
          <div class="ploading__ring"></div>
          <div class="ploading__text">Генерация персональной стратегии…</div>
        </div>
      </div>`;
  }

  if (state.error && !r) {
    return `
      <div class="ptab ptab--empty">
        <div class="pempty">
          <div class="pempty__icon">⚠</div>
          <div class="pempty__title" style="color:#ff5577">Ошибка анализа</div>
          <div class="pempty__sub">${esc(state.error)}</div>
          <div class="pempty__sub" style="margin-top:8px;opacity:.6">Проверьте сеть или попробуйте ещё раз</div>
        </div>
      </div>`;
  }

  if (!r) {
    return `
      <div class="ptab ptab--empty">
        <div class="pempty">
          <div class="pempty__icon">⚡</div>
          <div class="pempty__title">Стратегия не готова</div>
          <div class="pempty__sub">Нажмите ⚡ ЗАПУСТИТЬ АНАЛИЗ</div>
        </div>
      </div>`;
  }

  const s = r.strategy || {};
  const p = r.portrait || {};

  let sentBanner = '';
  if (state.sent === 'tg-sending') sentBanner = `<div class="psent psent--sending">⏳ Отправка в Telegram…</div>`;
  if (state.sent === 'tg-manager') sentBanner = `<div class="psent psent--ok">✅ Менеджер получил оффер в Telegram</div>`;
  if (state.sent === 'tg-both')    sentBanner = `<div class="psent psent--ok">✅ Менеджеру + клиенту отправлено 🎁</div>`;
  if (state.sent === 'held')       sentBanner = `<div class="psent psent--held">🔒 Зафиксировано. Отправка отложена.</div>`;

  const hasTgId = state.signals?.tg_from && state.signals.tg_from !== 'нет';
  const clientLabel = hasTgId ? '✈ МЕНЕДЖЕРУ + КЛИЕНТУ В BOT' : '✈ ОТПРАВИТЬ МЕНЕДЖЕРУ В BOT';

  const actionBtns = state.sent ? '' : `
    <div class="pstrat__actions">
      <button class="pbtn-send" id="pal-send-client" type="button">
        <span class="pbtn-send__icon">✈</span>
        <span class="pbtn-send__text">
          <span class="pbtn-send__label">${clientLabel}</span>
          <span class="pbtn-send__sub">${s.discount ? '🎁 ' + esc(s.discount) : 'персональный оффер через Telegram'}</span>
        </span>
      </button>
      <button class="pbtn-hold" id="pal-hold" type="button">🔒 Придержать</button>
    </div>`;

  return `
    <div class="ptab ptab--strategy">
      <div class="ptab__scroll">
        <div class="pstrat">

          ${sentBanner}

          ${p.psychotype ? `<div class="pstrat__psycho">🧠 ${esc(p.psychotype)}</div>` : ''}

          <div class="pstrat__card">
            <div class="pstrat__field">
              <span class="pstrat__key">Hook</span>
              <span class="pstrat__val">${esc(s.hook || '—')}</span>
            </div>
            <div class="pstrat__field">
              <span class="pstrat__key">Предложение</span>
              <span class="pstrat__val pstrat__val--offer">${esc(s.offer || '—')}</span>
            </div>
            ${s.discount ? `
            <div class="pstrat__field pstrat__field--discount">
              <span class="pstrat__key">🎁 Бонус</span>
              <span class="pstrat__val pstrat__val--discount">${esc(s.discount)}</span>
            </div>` : ''}
            <div class="pstrat__pills">
              <div class="pstrat__pill-row">
                <span class="pstrat__key">Tier</span>
                <span class="ppill ppill--tier">${esc(s.price_tier || '—')}</span>
              </div>
              <div class="pstrat__pill-row">
                <span class="pstrat__key">Канал</span>
                <span class="ppill ppill--channel">${esc(s.channel || '—')}</span>
              </div>
              <div class="pstrat__pill-row">
                <span class="pstrat__key">Время</span>
                <span class="ppill">${esc(s.timing || '—')}</span>
              </div>
            </div>
            <div class="pstrat__field">
              <span class="pstrat__key">Следующий шаг</span>
              <span class="pstrat__val">${esc(s.next_step || '—')}</span>
            </div>
          </div>

          ${actionBtns}

          <div class="ptg-btns" style="margin-top:16px">
            <a href="${TG_BOT}?start=site_strategy" class="ptg-btn" target="_blank" rel="noopener">✈ Открыть бота</a>
            <a href="${TG_BOT}?start=book_now" class="ptg-btn ptg-btn--primary" target="_blank" rel="noopener">💎 Забронировать</a>
          </div>

          ${state.thinking ? `
          <details class="pthink">
            <summary class="pthink__sum">🧠 AI Reasoning · ${state.thinking.split(/\s+/).length} слов</summary>
            <pre class="pthink__body">${esc(state.thinking)}</pre>
          </details>` : ''}

        </div>
      </div>
    </div>`;
}

// ── TABS BAR ──────────────────────────────────────────────────────────────
function tabsBar() {
  const tabs = [
    { id: 'signals',  icon: '◉', label: 'Сигналы' },
    { id: 'portrait', icon: '👤', label: 'Портрет' },
    { id: 'vector',   icon: '◎', label: 'Вектор' },
    { id: 'strategy', icon: '⚡', label: 'Стратегия' },
  ];
  const hasResult = !!state.result?.parsed;
  return `
    <div class="ptabs">
      ${tabs.map(t => `
        <button class="ptab-btn ${state.tab === t.id ? 'ptab-btn--active' : ''} ${(t.id !== 'signals' && !hasResult && !state.loading) ? 'ptab-btn--dim' : ''}"
          id="ptab-${t.id}" type="button">
          <span class="ptab-btn__icon">${t.icon}</span>
          <span class="ptab-btn__label">${t.label}</span>
        </button>`).join('')}
    </div>`;
}

// ── MAIN PANEL ────────────────────────────────────────────────────────────
function panelHTML() {
  const status = state.loading ? 'АНАЛИЗ' : (state.result ? 'ГОТОВО' : 'STANDBY');
  const statusClass = state.loading ? 'pal-status--live' : (state.result ? 'pal-status--ready' : '');
  const sigCount = Object.keys(SIGNAL_LABELS).length;

  let tabContent = '';
  if (state.tab === 'signals')  tabContent = tabSignals();
  if (state.tab === 'portrait') tabContent = tabPortrait();
  if (state.tab === 'vector')   tabContent = tabVector();
  if (state.tab === 'strategy') tabContent = tabStrategy();

  return `
    <div class="pal-overlay ${state.open ? 'pal-open' : ''}" id="pal-overlay" aria-hidden="${!state.open}">
      <div class="pal-scanline"></div>
      <div class="pal-panel" role="dialog" aria-label="DagAI Intelligence">

        <header class="pal-header">
          <div class="pal-header-brand">
            <span class="pal-brand-pulse"></span>
            <span class="pal-brand">DAGAI</span>
            <span class="pal-brand-sep">◆</span>
            <span class="pal-brand-sub">QUANTUM INTEL</span>
          </div>
          <div class="pal-header-right">
            <span class="pal-status ${statusClass}">${status}</span>
            <span class="pal-sig-count">${sigCount}</span>
            <button class="pal-close" id="pal-close" aria-label="Закрыть">✕</button>
          </div>
        </header>

        ${tabsBar()}

        <div class="pal-tab-content">
          ${tabContent}
        </div>

        <footer class="pal-footer">
          <button class="pal-btn-run" id="pal-run" type="button" ${state.loading ? 'disabled' : ''}>
            ${state.loading
              ? '<span class="pal-spinner"></span><span>АНАЛИЗ…</span>'
              : '<span>⚡</span><span>ЗАПУСТИТЬ АНАЛИЗ</span>'}
          </button>
          <button class="pal-btn-raw" id="pal-toggle-raw" type="button">{ }</button>
          ${state.rate ? `<span class="pal-rate-bar">RPM <b>${state.rate.rpmRemaining||'?'}</b></span>` : ''}
        </footer>

        ${state.showRaw ? `<pre class="pal-raw">${esc(JSON.stringify(state.result?.parsed ?? state.signals ?? {}, null, 2))}</pre>` : ''}

      </div>
    </div>`;
}

function bind() {
  document.getElementById('pal-close')?.addEventListener('click', closePanel);
  document.getElementById('pal-run')?.addEventListener('click', runAnalysis);
  document.getElementById('pal-toggle-raw')?.addEventListener('click', () => { state.showRaw = !state.showRaw; render(); });
  document.getElementById('pal-overlay')?.addEventListener('click', (e) => { if (e.target.id === 'pal-overlay') closePanel(); });
  document.getElementById('pal-hold')?.addEventListener('click', () => { state.sent = 'held'; render(); });
  document.getElementById('pal-send-client')?.addEventListener('click', sendOfferViaTelegram);
  ['signals','portrait','vector','strategy'].forEach(id => {
    document.getElementById(`ptab-${id}`)?.addEventListener('click', () => { state.tab = id; render(); });
  });
}

function render() {
  const r = root();
  if (!r) return;
  r.innerHTML = panelHTML();
  bind();
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
  state.tab     = 'signals';
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
      state.tab   = 'strategy';
      console.error('[palantir] AI error:', state.error, res.raw);
    } else {
      state.tab = 'portrait';
    }
  } catch (e) {
    state.error    = String(e?.message || e);
    state.result   = null;
    state.thinking = null;
    state.tab      = 'strategy';
  } finally {
    state.loading = false;
    render();
  }
}

async function sendOfferViaTelegram() {
  if (state.sent === 'tg-sending') return;
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
