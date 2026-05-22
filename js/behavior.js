// DagAI — Real Behavior Tracker
// Tracks what the user actually looked at: rooms, routes, sections, clicks.
// Data goes to AI as facts, not guesses.

const _viewed  = {};   // { itemId: seconds }
const _clicked = [];   // ['room_vip', 'route_sulak', ...]
const _sections = [];  // sections scrolled into view in order
const _roomClicks = new Set();
const _bookClicks = new Set();

let _activeItem = null;
let _activeStart = 0;

function _flush(id) {
  if (!id || !_activeStart) return;
  const spent = Math.round((Date.now() - _activeStart) / 1000);
  _viewed[id] = (_viewed[id] || 0) + spent;
  _activeStart = 0;
}

function _enter(id) {
  _flush(_activeItem);
  _activeItem = id;
  _activeStart = Date.now();
}

function _leave() {
  _flush(_activeItem);
  _activeItem = null;
}

// ── IntersectionObserver for room/route cards ─────────────────────────────
export function initBehaviorTracker() {
  // Track sections
  const sectionObs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      const id = e.target.id || e.target.dataset.track;
      if (id && e.isIntersecting && !_sections.includes(id)) {
        _sections.push(id);
      }
    });
  }, { threshold: 0.3 });

  document.querySelectorAll('section[id], header[id]').forEach(el => sectionObs.observe(el));

  // Track room/route cards via delegate (cards rendered later)
  const cardObs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      const id = e.target.dataset.trackId;
      if (!id) return;
      if (e.isIntersecting) {
        _enter(id);
      } else {
        if (_activeItem === id) _leave();
      }
    });
  }, { threshold: 0.5 });

  // Watch for dynamically added cards
  const mutObs = new MutationObserver(() => {
    document.querySelectorAll('[data-book-room], [data-route-id]').forEach(el => {
      const card = el.closest('article');
      if (!card || card.dataset.tracked) return;
      const rid = el.dataset.bookRoom || el.dataset.routeId;
      if (!rid) return;
      card.dataset.trackId = rid;
      card.dataset.tracked = '1';
      cardObs.observe(card);
    });
  });
  mutObs.observe(document.body, { childList: true, subtree: true });

  // Track book/detail clicks
  document.addEventListener('click', (e) => {
    const bookBtn = e.target.closest('[data-book-room]');
    if (bookBtn) {
      const id = bookBtn.dataset.bookRoom;
      _bookClicks.add(id);
      if (!_clicked.includes('room_' + id)) _clicked.push('room_' + id);
    }
    const routeBtn = e.target.closest('[data-route-id]');
    if (routeBtn) {
      const id = routeBtn.dataset.routeId;
      if (!_clicked.includes('route_' + id)) _clicked.push('route_' + id);
    }
  }, true);

  // Flush on page hide
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) _flush(_activeItem);
    else if (_activeItem) _activeStart = Date.now();
  });
}

export function getBehaviorSignals() {
  _flush(_activeItem);

  const sorted = Object.entries(_viewed)
    .sort(([,a],[,b]) => b - a)
    .slice(0, 8);

  const topItem   = sorted[0]?.[0] || '';
  const topSec    = Math.round(sorted[0]?.[1] || 0);
  const viewLog   = sorted.map(([id, s]) => `${id}:${s}с`).join(', ');
  const clickLog  = _clicked.slice(-12).join(', ');
  const secLog    = _sections.slice(-8).join(' → ');
  const bookedLog = [..._bookClicks].join(', ');

  return {
    topViewedItem:    topItem,
    topViewedSec:     topSec || '',
    viewedItemsLog:   viewLog || '',
    clickedItemsLog:  clickLog || '',
    sectionsPath:     secLog || '',
    bookedItems:      bookedLog || '',
    uniqueItemsSeen:  Object.keys(_viewed).length || '',
  };
}
