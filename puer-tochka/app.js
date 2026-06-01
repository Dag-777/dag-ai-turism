/* ======================================================
   ПУЭР ТОЧКА — логика слайд-шоу, неоновая пыль, PWA
   ====================================================== */
(function () {
  'use strict';

  var SLIDE_MS = 6000; // синхронизировано с --slide-time в CSS
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------- Слайды ---------------- */
  var slides = Array.prototype.slice.call(document.querySelectorAll('[data-slide]'));
  var dotsWrap = document.getElementById('dots');
  var bar = document.getElementById('progressBar');
  var current = 0;
  var timer = null;
  var rafId = null;
  var startTs = 0;

  // точки
  slides.forEach(function (_, i) {
    var d = document.createElement('button');
    d.className = 'dot' + (i === 0 ? ' is-on' : '');
    d.type = 'button';
    d.setAttribute('aria-label', 'Слайд ' + (i + 1));
    d.addEventListener('click', function () { go(i, true); });
    dotsWrap.appendChild(d);
  });
  var dots = Array.prototype.slice.call(dotsWrap.children);

  function paint() {
    slides.forEach(function (s, i) { s.classList.toggle('is-active', i === current); });
    dots.forEach(function (d, i) { d.classList.toggle('is-on', i === current); });
  }

  function go(i, user) {
    current = (i + slides.length) % slides.length;
    paint();
    restartTimer();
    if (user) {/* перезапуск таймера уже выполнен */}
  }
  function next() { go(current + 1); }
  function prev() { go(current - 1); }

  /* ---------------- Авто-переход + прогресс ---------------- */
  function restartTimer() {
    if (timer) clearTimeout(timer);
    if (rafId) cancelAnimationFrame(rafId);
    bar.style.width = '0%';
    startTs = performance.now();
    timer = setTimeout(next, SLIDE_MS);
    tickBar();
  }
  function tickBar() {
    rafId = requestAnimationFrame(function loop(now) {
      var p = Math.min(1, (now - startTs) / SLIDE_MS);
      bar.style.width = (p * 100).toFixed(2) + '%';
      if (p < 1) rafId = requestAnimationFrame(loop);
    });
  }
  function pause() { if (timer) clearTimeout(timer); if (rafId) cancelAnimationFrame(rafId); }
  function resume() { restartTimer(); }

  // пауза, когда вкладка скрыта
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) pause(); else resume();
  });

  /* ---------------- Управление ---------------- */
  var pn = document.querySelector('.tapzone--next');
  var pp = document.querySelector('.tapzone--prev');
  if (pn) pn.addEventListener('click', next);
  if (pp) pp.addEventListener('click', prev);

  // свайпы
  var x0 = null, y0 = null, t0 = 0;
  var slider = document.getElementById('slider');
  slider.addEventListener('touchstart', function (e) {
    var t = e.changedTouches[0]; x0 = t.clientX; y0 = t.clientY; t0 = Date.now();
  }, { passive: true });
  slider.addEventListener('touchend', function (e) {
    if (x0 === null) return;
    var t = e.changedTouches[0];
    var dx = t.clientX - x0, dy = t.clientY - y0, dt = Date.now() - t0;
    x0 = null;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.4 && dt < 800) {
      if (dx < 0) next(); else prev();
    }
  }, { passive: true });

  // клавиатура (для теста на десктопе)
  window.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowRight') next();
    else if (e.key === 'ArrowLeft') prev();
  });

  /* ---------------- Неоновая звёздная пыль ---------------- */
  var canvas = document.getElementById('dust');
  var ctx = canvas.getContext('2d');
  var DPR = Math.min(window.devicePixelRatio || 1, 2);
  var W = 0, H = 0, parts = [];

  function resize() {
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = W * DPR; canvas.height = H * DPR;
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    spawn();
  }
  function spawn() {
    // «в пределах разумного»: плотность ограничена, чтобы текст читался
    var base = (W * H) / 26000;
    var count = Math.max(28, Math.min(reduce ? 26 : 78, Math.round(base)));
    parts = [];
    for (var i = 0; i < count; i++) parts.push(makeP(true));
  }
  function makeP(any) {
    var gold = Math.random() < 0.42;
    return {
      x: Math.random() * W,
      y: any ? Math.random() * H : H + 10,
      r: Math.random() * 1.7 + 0.5,
      vy: -(Math.random() * 0.28 + 0.06),
      vx: (Math.random() - 0.5) * 0.18,
      a: Math.random() * Math.PI * 2,         // фаза мерцания
      av: Math.random() * 0.045 + 0.012,
      hue: gold ? '255,216,122' : '120,240,255'
    };
  }
  var dustOn = !reduce;
  function draw() {
    ctx.clearRect(0, 0, W, H);
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i];
      p.y += p.vy; p.x += p.vx; p.a += p.av;
      if (p.y < -10) { parts[i] = makeP(false); continue; }
      if (p.x < -10) p.x = W + 10; else if (p.x > W + 10) p.x = -10;
      var tw = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(p.a));   // мерцание/подмигивание
      var rr = p.r * (2.6 + tw * 1.4);
      var g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, rr);
      g.addColorStop(0, 'rgba(' + p.hue + ',' + (0.85 * tw).toFixed(3) + ')');
      g.addColorStop(0.4, 'rgba(' + p.hue + ',' + (0.30 * tw).toFixed(3) + ')');
      g.addColorStop(1, 'rgba(' + p.hue + ',0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(p.x, p.y, rr, 0, Math.PI * 2); ctx.fill();
      // яркое ядро
      ctx.fillStyle = 'rgba(255,255,255,' + (0.7 * tw).toFixed(3) + ')';
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 0.6, 0, Math.PI * 2); ctx.fill();
    }
    if (dustOn) rafDust = requestAnimationFrame(draw);
  }
  var rafDust = null;
  window.addEventListener('resize', resize);
  resize();
  if (dustOn) draw();
  else { // статичная лёгкая пыль для reduce-motion
    for (var k = 0; k < parts.length; k++) { parts[k].a = Math.random() * 6; }
    var pm = parts; ctx.clearRect(0, 0, W, H);
    pm.forEach(function (p) {
      ctx.fillStyle = 'rgba(' + p.hue + ',.5)';
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
    });
  }
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { if (rafDust) cancelAnimationFrame(rafDust); }
    else if (dustOn) { rafDust = requestAnimationFrame(draw); }
  });

  /* ---------------- Старт ---------------- */
  paint();
  restartTimer();

  /* ---------------- PWA: установка ---------------- */
  var installBtn = document.getElementById('installBtn');
  var iosHint = document.getElementById('iosHint');
  var iosClose = document.getElementById('iosClose');
  var deferred = null;

  var isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true;
  var ua = window.navigator.userAgent || '';
  var isIOS = /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferred = e;
    if (!isStandalone) installBtn.hidden = false;
  });

  if (isIOS && !isStandalone) {
    installBtn.hidden = false; // на iOS показываем подсказку
  }

  installBtn.addEventListener('click', function () {
    if (deferred) {
      deferred.prompt();
      deferred.userChoice.then(function () { deferred = null; installBtn.hidden = true; });
    } else if (isIOS) {
      iosHint.hidden = false;
    }
  });
  if (iosClose) iosClose.addEventListener('click', function () { iosHint.hidden = true; });
  if (iosHint) iosHint.addEventListener('click', function (e) { if (e.target === iosHint) iosHint.hidden = true; });

  window.addEventListener('appinstalled', function () { installBtn.hidden = true; });

  /* ---------------- Service Worker ---------------- */
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function () {});
    });
  }
})();
