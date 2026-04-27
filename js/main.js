// Entry point: orchestrates rendering, navigation, scroll reveal, booking, panel.

import { renderRooms, renderRoutes } from './rooms.js?v=20260426b';
import { initBooking }                from './booking.js?v=20260426b';
import { initPalantir }               from './palantir.js?v=20260426b';

function initNav() {
  const nav = document.querySelector('.nav');
  if (!nav) return;
  const onScroll = () => {
    if (window.scrollY > 24) nav.classList.add('nav--scrolled');
    else nav.classList.remove('nav--scrolled');
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  const burger = document.querySelector('.nav__burger');
  const menu   = document.querySelector('.nav__menu');
  burger?.addEventListener('click', () => {
    menu?.classList.toggle('nav__menu--open');
    burger.classList.toggle('nav__burger--open');
  });
  document.querySelectorAll('.nav__menu a').forEach((a) => {
    a.addEventListener('click', () => {
      menu?.classList.remove('nav__menu--open');
      burger?.classList.remove('nav__burger--open');
    });
  });
}

function initReveal() {
  const els = document.querySelectorAll('[data-reveal]');
  if (!('IntersectionObserver' in window) || !els.length) {
    els.forEach((el) => el.classList.add('is-revealed'));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add('is-revealed');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  els.forEach((el) => io.observe(el));
}

function initYear() {
  const y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();
}

function initSmoothAnchors() {
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (!id || id === '#') return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  renderRooms();
  renderRoutes();
  initNav();
  initReveal();
  initSmoothAnchors();
  initBooking();
  initPalantir();
  initYear();
});
