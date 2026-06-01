/* ======================================================
   ПУЭР ТОЧКА — слайд-шоу + неоновая пыль (стиль liberté)
   ====================================================== */
(function () {
  'use strict';

  var SLIDE_MS = 6000;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------- Неоновая звёздная пыль ---------------- */
  var canvas = document.getElementById('dust');
  var ctx = canvas.getContext('2d');
  var HUES = [198, 42, 330]; // циан, золото, роза
  var W = window.innerWidth, H = window.innerHeight;
  function rsz() { W = window.innerWidth; H = window.innerHeight; canvas.width = W; canvas.height = H; }
  rsz();

  var N = reduce ? 30 : 60;
  var amb = Array.from({ length: N }, function (_, i) {
    return {
      x: Math.random() * W, y: Math.random() * H,
      r: Math.random() * 1.4 + 0.2,
      vx: (Math.random() - 0.5) * 0.18,
      vy: -(Math.random() * 0.22 + 0.05),
      alpha: Math.random() * 0.3 + 0.05,
      hue: HUES[i % 3], phase: Math.random() * Math.PI * 2
    };
  });
  var bursts = [];
  function burst(x, y, hue, n) {
    if (reduce) n = Math.min(n, 24);
    for (var i = 0; i < n; i++) {
      var a = Math.random() * Math.PI * 2, s = Math.random() * 8 + 2;
      bursts.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 3, r: Math.random() * 3.2 + 0.5, alpha: 1, hue: hue, decay: Math.random() * 0.01 + 0.011, grav: 0.14 });
    }
  }

  var rafDust = null;
  function draw() {
    ctx.clearRect(0, 0, W, H);
    amb.forEach(function (p) {
      p.phase += 0.015; p.x += p.vx + Math.sin(p.phase) * 0.18; p.y += p.vy;
      if (p.y < -10) { p.y = H + 10; p.x = Math.random() * W; }
      if (p.x < -10 || p.x > W + 10) { p.x = Math.random() * W; p.y = H + 10; }
      ctx.save(); ctx.shadowBlur = 10; ctx.shadowColor = 'hsl(' + p.hue + ',88%,70%)';
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = 'hsla(' + p.hue + ',88%,75%,' + p.alpha + ')'; ctx.fill(); ctx.restore();
    });
    bursts = bursts.filter(function (p) { return p.alpha > 0.01; });
    bursts.forEach(function (p) {
      p.x += p.vx; p.y += p.vy; p.vy += p.grav; p.vx *= 0.968; p.alpha -= p.decay; p.r *= 0.983;
      ctx.save(); ctx.shadowBlur = 20; ctx.shadowColor = 'hsl(' + p.hue + ',95%,65%)';
      ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(0.1, p.r), 0, Math.PI * 2);
      ctx.fillStyle = 'hsla(' + p.hue + ',95%,80%,' + p.alpha + ')'; ctx.fill(); ctx.restore();
    });
    rafDust = requestAnimationFrame(draw);
  }
  draw();

  /* ---------------- Авто-подгон размера (не выйдет за рамки) ---------------- */
  function fit() {
    var maxw = window.innerWidth * 0.9;
    document.querySelectorAll('.fit').forEach(function (el) {
      el.style.fontSize = '';
      var cur = parseFloat(getComputedStyle(el).fontSize);
      // временно показать для измерения скрытого слайда
      var sw = el.scrollWidth;
      if (sw > maxw && sw > 0) el.style.fontSize = (cur * (maxw / sw)) + 'px';
    });
  }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit); else setTimeout(fit, 300);
  setTimeout(fit, 120);
  window.addEventListener('resize', function () { rsz(); fit(); });

  /* ---------------- Слайды ---------------- */
  var slides = Array.prototype.slice.call(document.querySelectorAll('[data-slide]'));
  var dotsWrap = document.getElementById('dots');
  var bar = document.getElementById('progressBar');
  var current = 0, timer = null, rafBar = null, startTs = 0;

  slides.forEach(function (_, i) {
    var d = document.createElement('button');
    d.className = 'dot' + (i === 0 ? ' is-on' : ''); d.type = 'button';
    d.setAttribute('aria-label', 'Слайд ' + (i + 1));
    d.addEventListener('click', function () { go(i); });
    dotsWrap.appendChild(d);
  });
  var dots = Array.prototype.slice.call(dotsWrap.children);

  function fireBurst() {
    var hue = parseInt(slides[current].getAttribute('data-hue'), 10) || 198;
    var cx = window.innerWidth / 2, cy = window.innerHeight / 2;
    setTimeout(function () { burst(cx, cy - window.innerHeight * 0.04, hue, 90); }, 560);
  }

  function paint() {
    slides.forEach(function (s, i) { s.classList.toggle('is-active', i === current); });
    dots.forEach(function (d, i) { d.classList.toggle('is-on', i === current); });
    fit();
    fireBurst();
  }
  function go(i) { current = (i + slides.length) % slides.length; paint(); restart(); }
  function next() { go(current + 1); }
  function prev() { go(current - 1); }

  function restart() {
    if (timer) clearTimeout(timer);
    if (rafBar) cancelAnimationFrame(rafBar);
    bar.style.width = '0%'; startTs = performance.now();
    timer = setTimeout(next, SLIDE_MS);
    rafBar = requestAnimationFrame(function loop(now) {
      var p = Math.min(1, (now - startTs) / SLIDE_MS);
      bar.style.width = (p * 100).toFixed(2) + '%';
      if (p < 1) rafBar = requestAnimationFrame(loop);
    });
  }

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { if (timer) clearTimeout(timer); if (rafBar) cancelAnimationFrame(rafBar); if (rafDust) cancelAnimationFrame(rafDust); }
    else { restart(); rafDust = requestAnimationFrame(draw); }
  });

  /* ---------------- Управление ---------------- */
  var pn = document.querySelector('.tapzone--next'), pp = document.querySelector('.tapzone--prev');
  if (pn) pn.addEventListener('click', next);
  if (pp) pp.addEventListener('click', prev);

  var x0 = null, y0 = null, t0 = 0;
  var slider = document.getElementById('slider');
  slider.addEventListener('touchstart', function (e) { var t = e.changedTouches[0]; x0 = t.clientX; y0 = t.clientY; t0 = Date.now(); }, { passive: true });
  slider.addEventListener('touchend', function (e) {
    if (x0 === null) return; var t = e.changedTouches[0];
    var dx = t.clientX - x0, dy = t.clientY - y0, dt = Date.now() - t0; x0 = null;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.4 && dt < 800) { if (dx < 0) next(); else prev(); }
  }, { passive: true });

  window.addEventListener('keydown', function (e) { if (e.key === 'ArrowRight') next(); else if (e.key === 'ArrowLeft') prev(); });

  /* ---------------- Старт ---------------- */
  paint(); restart();

  /* ---------------- PWA: установка ---------------- */
  var installBtn = document.getElementById('installBtn');
  var iosHint = document.getElementById('iosHint');
  var iosClose = document.getElementById('iosClose');
  var deferred = null;
  var isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  var ua = window.navigator.userAgent || '';
  var isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); deferred = e; if (!isStandalone) installBtn.hidden = false; });
  if (isIOS && !isStandalone) installBtn.hidden = false;

  installBtn.addEventListener('click', function () {
    if (deferred) { deferred.prompt(); deferred.userChoice.then(function () { deferred = null; installBtn.hidden = true; }); }
    else if (isIOS) { iosHint.hidden = false; }
  });
  if (iosClose) iosClose.addEventListener('click', function () { iosHint.hidden = true; });
  if (iosHint) iosHint.addEventListener('click', function (e) { if (e.target === iosHint) iosHint.hidden = true; });
  window.addEventListener('appinstalled', function () { installBtn.hidden = true; });

  /* ---------------- Service Worker ---------------- */
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () {}); });
  }
})();
