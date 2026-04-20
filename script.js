// Основная кастомизация контента проекта DagAI_tourism.com
const CONFIG = {
  siteName: 'DagAI Tourism',
  domain: 'DagAI_tourism.com',
  telegramBotUrl: 'https://t.me/DagAI_tourism_bot',
  prepaymentRate: 0.3,
  calendarMonthsAhead: 3,
  calendarBusyRate: 0.26,
  rooms: [
    {
      id: 'standard',
      title: 'Стандарт «Горный воздух»',
      description: 'Уютный номер с балконом, видом на ущелье и авторским завтраком.',
      price: 7900,
      image:
        'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80'
    },
    {
      id: 'family',
      title: 'Семейный Люкс',
      description: 'Две спальни, просторная гостиная и терраса для закатных ужинов.',
      price: 11400,
      image:
        'https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=1200&q=80'
    },
    {
      id: 'panorama',
      title: 'Panorama Suite',
      description: 'Панорамные окна в пол, премиум-отделка и персональный сервис.',
      price: 13600,
      image:
        'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=1200&q=80'
    },
    {
      id: 'sky-villa',
      title: 'Sky Villa',
      description: 'Приватная зона отдыха, лучший вид на Гуниб и индивидуальный консьерж.',
      price: 17800,
      image:
        'https://images.unsplash.com/photo-1601918774946-25832a4be0d6?auto=format&fit=crop&w=1200&q=80'
    }
  ],
  routes: [
    {
      title: 'Сулакский каньон',
      description:
        'Самый глубокий каньон Европы: бирюзовая вода, смотровые площадки и эффектные аэро-панорамы.',
      images: [
        'https://images.pexels.com/photos/9675972/pexels-photo-9675972.jpeg?auto=compress&cs=tinysrgb&w=1200',
        'https://images.pexels.com/photos/13380531/pexels-photo-13380531.jpeg?auto=compress&cs=tinysrgb&w=1200'
      ]
    },
    {
      title: 'Гуниб и окрестности',
      description:
        'Аул в сердце гор, крепость имама Шамиля и смотровые точки с историей Кавказской войны.',
      images: [
        'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80'
      ]
    },
    {
      title: 'Древний Дербент',
      description:
        'Нарын-Кала, статус ЮНЕСКО и прогулка к Каспию через старейшие кварталы города.',
      images: [
        'https://images.unsplash.com/photo-1560717789-0ac7c58ac90a?auto=format&fit=crop&w=1200&q=80'
      ]
    }
  ]
};

const state = {
  selectedRoomId: CONFIG.rooms[0].id,
  checkIn: null,
  checkOut: null,
  isPaid: false,
  availability: new Map(),
  paymentTimeouts: []
};

const dom = {
  heroImage: document.getElementById('heroImage'),
  roomCards: document.getElementById('roomCards'),
  routeCards: document.getElementById('routeCards'),
  calendarContainer: document.getElementById('calendarContainer'),
  calendarLegend: document.getElementById('calendarLegend'),
  calendarHint: document.getElementById('calendarHint'),
  summaryRoom: document.getElementById('summaryRoom'),
  summaryCheckin: document.getElementById('summaryCheckin'),
  summaryCheckout: document.getElementById('summaryCheckout'),
  summaryNights: document.getElementById('summaryNights'),
  summaryTotal: document.getElementById('summaryTotal'),
  bookNowBtn: document.getElementById('bookNowBtn'),
  payBtn: document.getElementById('payBtn'),
  paymentInlineStatus: document.getElementById('paymentInlineStatus'),
  telegramBtn: document.getElementById('telegramBtn'),
  bookingModal: document.getElementById('bookingModal'),
  modalRoom: document.getElementById('modalRoom'),
  modalDates: document.getElementById('modalDates'),
  modalNights: document.getElementById('modalNights'),
  modalTotal: document.getElementById('modalTotal'),
  proceedToPay: document.getElementById('proceedToPay'),
  paymentModal: document.getElementById('paymentModal'),
  paymentBar: document.getElementById('paymentBar'),
  paymentText: document.getElementById('paymentText'),
  paymentResult: document.getElementById('paymentResult'),
  receiptRoom: document.getElementById('receiptRoom'),
  receiptDates: document.getElementById('receiptDates'),
  receiptTotal: document.getElementById('receiptTotal'),
  receiptTime: document.getElementById('receiptTime')
};

function preventStalePwaCache() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker
      .getRegistrations()
      .then((registrations) => {
        registrations.forEach((registration) => {
          registration.unregister();
        });
      })
      .catch(() => {});
  }

  if ('caches' in window) {
    caches
      .keys()
      .then((cacheKeys) => Promise.all(cacheKeys.map((key) => caches.delete(key))))
      .catch(() => {});
  }
}

function formatMoney(amount) {
  return `${new Intl.NumberFormat('ru-RU').format(Math.round(amount))} ₽`;
}

function toISO(date) {
  return date.toISOString().split('T')[0];
}

function parseISO(value) {
  return new Date(`${value}T00:00:00`);
}

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function diffDays(fromISO, toISODate) {
  if (!fromISO || !toISODate) return 0;
  const diff = parseISO(toISODate) - parseISO(fromISO);
  return Math.max(0, Math.round(diff / 86400000));
}

function formatDate(iso) {
  if (!iso) return '—';
  return parseISO(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: 'long' });
}

function getSelectedRoom() {
  return CONFIG.rooms.find((room) => room.id === state.selectedRoomId) || CONFIG.rooms[0];
}

function getBookingTotals() {
  const nights = diffDays(state.checkIn, state.checkOut);
  const room = getSelectedRoom();
  const total = nights * room.price;
  const prepayment = total * CONFIG.prepaymentRate;
  return { nights, total, prepayment };
}

function seededValueFromDate(iso) {
  const numeric = Number(iso.replaceAll('-', ''));
  const raw = Math.sin(numeric * 12.9898) * 43758.5453;
  return raw - Math.floor(raw);
}

function generateAvailability() {
  state.availability.clear();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let monthOffset = 0; monthOffset < CONFIG.calendarMonthsAhead; monthOffset += 1) {
    const currentMonth = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
    const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();

    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
      if (date < today) continue;

      const iso = toISO(date);
      const rand = seededValueFromDate(iso);
      const busy = rand < CONFIG.calendarBusyRate;
      state.availability.set(iso, { busy });
    }
  }
}

function isBusy(iso) {
  return Boolean(state.availability.get(iso)?.busy);
}

function isInRange(iso) {
  if (!state.checkIn || !state.checkOut) return false;
  return iso > state.checkIn && iso < state.checkOut;
}

function isDateSelectable(date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date >= today;
}

function hasBusyInsideRange(startISO, endISO) {
  const nights = diffDays(startISO, endISO);
  for (let i = 0; i < nights; i += 1) {
    const iso = toISO(addDays(parseISO(startISO), i));
    if (isBusy(iso)) return true;
  }
  return false;
}

function renderRooms() {
  dom.roomCards.innerHTML = CONFIG.rooms
    .map((room) => {
      const active = room.id === state.selectedRoomId;
      return `
        <article class="room-card overflow-hidden rounded-2xl border ${
          active ? 'border-dag-gold shadow-lg shadow-dag-gold/20' : 'border-dag-green/15'
        } bg-white">
          <img src="${room.image}" alt="${room.title}" class="h-44 w-full object-cover" />
          <div class="p-4">
            <h3 class="text-xl font-bold text-dag-green">${room.title}</h3>
            <p class="mt-2 text-sm text-[#3f4b42]">${room.description}</p>
            <div class="mt-4 flex items-center justify-between gap-3">
              <p class="text-lg font-extrabold text-dag-red">${formatMoney(room.price)} <span class="text-xs font-semibold text-[#5e6a61]">/ сутки</span></p>
              <button
                data-room-id="${room.id}"
                class="rounded-lg px-3 py-2 text-xs font-bold transition ${
                  active
                    ? 'bg-dag-gold text-dag-green'
                    : 'bg-dag-green text-white hover:bg-[#145229]'
                }"
                aria-label="Выбрать номер ${room.title}"
              >
                ${active ? 'Выбрано' : 'Выбрать'}
              </button>
            </div>
          </div>
        </article>
      `;
    })
    .join('');
}

function renderRoutes() {
  dom.routeCards.innerHTML = CONFIG.routes
    .map((route) => {
      const imageBlock =
        route.images.length > 1
          ? `
            <div class="grid grid-cols-2 gap-2">
              ${route.images
                .map(
                  (img, index) =>
                    `<img src="${img}" alt="${route.title} фото ${index + 1}" class="h-36 w-full rounded-xl object-cover" />`
                )
                .join('')}
            </div>
          `
          : `<img src="${route.images[0]}" alt="${route.title}" class="h-44 w-full rounded-xl object-cover" />`;

      return `
        <article class="route-card rounded-2xl border border-dag-green/15 bg-white p-4">
          ${imageBlock}
          <h3 class="mt-4 text-xl font-bold text-dag-green">${route.title}</h3>
          <p class="mt-2 text-sm text-[#3f4b42]">${route.description}</p>
        </article>
      `;
    })
    .join('');
}

function renderCalendar() {
  const weekdayLabels = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const monthCards = [];

  for (let monthOffset = 0; monthOffset < CONFIG.calendarMonthsAhead; monthOffset += 1) {
    const monthDate = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
    const monthName = monthDate.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
    const firstWeekday = (monthDate.getDay() + 6) % 7;
    const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();

    const daysMarkup = [];

    for (let i = 0; i < firstWeekday; i += 1) {
      daysMarkup.push('<div class="calendar-empty"></div>');
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = new Date(monthDate.getFullYear(), monthDate.getMonth(), day);
      const iso = toISO(date);
      const selectable = isDateSelectable(date);
      const busy = selectable ? isBusy(iso) : false;
      const selected = iso === state.checkIn || iso === state.checkOut;
      const inRange = isInRange(iso);

      const classes = ['calendar-day'];
      if (busy) classes.push('busy');
      if (selected) classes.push('selected');
      if (inRange) classes.push('in-range');

      const statusText = !selectable ? '' : busy ? 'Занято' : 'Свободно';
      const disabled = !selectable || busy;

      daysMarkup.push(`
        <button
          type="button"
          class="${classes.join(' ')}"
          data-date-iso="${iso}"
          ${disabled ? 'disabled' : ''}
          aria-label="${date.toLocaleDateString('ru-RU')} ${statusText}"
        >
          <span class="block text-left text-sm font-bold">${day}</span>
          <span class="mt-1 block text-left text-[10px] opacity-85">${statusText}</span>
        </button>
      `);
    }

    monthCards.push(`
      <div class="rounded-xl border border-white/20 bg-white/5 p-3 sm:p-4">
        <h3 class="mb-3 text-sm font-bold uppercase tracking-[0.08em] text-dag-gold">${monthName}</h3>
        <div class="mb-2 grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase text-white/70 sm:text-xs">
          ${weekdayLabels.map((label) => `<span>${label}</span>`).join('')}
        </div>
        <div class="grid grid-cols-7 gap-1.5">${daysMarkup.join('')}</div>
      </div>
    `);
  }

  dom.calendarContainer.innerHTML = monthCards.join('');
}

function updateSummary() {
  const room = getSelectedRoom();
  const { nights, total } = getBookingTotals();
  const isValid = Boolean(room && state.checkIn && state.checkOut && nights > 0);

  dom.summaryRoom.textContent = room.title;
  dom.summaryCheckin.textContent = formatDate(state.checkIn);
  dom.summaryCheckout.textContent = formatDate(state.checkOut);
  dom.summaryNights.textContent = String(nights);
  dom.summaryTotal.textContent = formatMoney(total);

  dom.bookNowBtn.disabled = !isValid;
  dom.payBtn.disabled = !isValid;

  if (!isValid) {
    dom.paymentInlineStatus.textContent = 'Оплата будет доступна после выбора дат и номера.';
  } else if (state.isPaid) {
    dom.paymentInlineStatus.textContent = 'Предоплата внесена. Уведомление хозяину отправлено.';
    dom.payBtn.textContent = 'ОПЛАЧЕНО';
  } else {
    dom.paymentInlineStatus.textContent = 'Бронь готова. Внесите предоплату в demo-режиме.';
    dom.payBtn.textContent = 'Оплатить предоплату';
  }

  dom.calendarLegend.textContent = state.checkIn
    ? state.checkOut
      ? `Выбрано: ${formatDate(state.checkIn)} — ${formatDate(state.checkOut)}`
      : `Check-in: ${formatDate(state.checkIn)}`
    : 'Выбор дат';

  if (!state.checkIn || state.checkOut) {
    dom.calendarHint.textContent = 'Нажмите сначала дату заезда, затем дату выезда';
  }
}

function openModal(modal) {
  modal.classList.remove('hidden');
  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function closeModal(modal) {
  modal.classList.add('hidden');
  modal.setAttribute('aria-hidden', 'true');
  if (dom.bookingModal.classList.contains('hidden') && dom.paymentModal.classList.contains('hidden')) {
    document.body.style.overflow = '';
  }
}

function fillBookingModal() {
  const room = getSelectedRoom();
  const { nights, total } = getBookingTotals();

  dom.modalRoom.textContent = room.title;
  dom.modalDates.textContent = `${formatDate(state.checkIn)} — ${formatDate(state.checkOut)}`;
  dom.modalNights.textContent = String(nights);
  dom.modalTotal.textContent = formatMoney(total);
}

function clearPaymentFlowTimers() {
  state.paymentTimeouts.forEach((id) => window.clearTimeout(id));
  state.paymentTimeouts = [];
}

function startPaymentFlow() {
  clearPaymentFlowTimers();

  const room = getSelectedRoom();
  const { prepayment } = getBookingTotals();

  dom.paymentResult.classList.add('hidden');
  dom.paymentBar.style.width = '0%';
  dom.paymentText.textContent = 'Инициализация платежа...';

  const step1 = window.setTimeout(() => {
    dom.paymentBar.style.width = '35%';
    dom.paymentText.textContent = 'Проверка данных бронирования...';
  }, 200);

  const step2 = window.setTimeout(() => {
    dom.paymentBar.style.width = '72%';
    dom.paymentText.textContent = 'Подтверждение перевода...';
  }, 700);

  const step3 = window.setTimeout(() => {
    dom.paymentBar.style.width = '100%';
    dom.paymentText.textContent = 'Платёж завершён.';

    dom.receiptRoom.textContent = room.title;
    dom.receiptDates.textContent = `${formatDate(state.checkIn)} — ${formatDate(state.checkOut)}`;
    dom.receiptTotal.textContent = formatMoney(prepayment);
    dom.receiptTime.textContent = new Date().toLocaleString('ru-RU');

    dom.paymentResult.classList.remove('hidden');
    state.isPaid = true;
    updateSummary();
  }, 1300);

  state.paymentTimeouts.push(step1, step2, step3);
}

function bindEvents() {
  document.addEventListener('click', (event) => {
    const roomButton = event.target.closest('[data-room-id]');
    if (roomButton) {
      state.selectedRoomId = roomButton.dataset.roomId;
      state.isPaid = false;
      renderRooms();
      updateSummary();
      return;
    }

    const dayButton = event.target.closest('[data-date-iso]');
    if (dayButton) {
      const iso = dayButton.dataset.dateIso;
      state.isPaid = false;

      if (!state.checkIn || (state.checkIn && state.checkOut)) {
        state.checkIn = iso;
        state.checkOut = null;
      } else if (state.checkIn && !state.checkOut) {
        if (iso <= state.checkIn) {
          state.checkIn = iso;
        } else if (hasBusyInsideRange(state.checkIn, iso)) {
          dom.calendarHint.textContent = 'В диапазоне есть занятые даты. Выберите другой период.';
        } else {
          state.checkOut = iso;
        }
      }

      renderCalendar();
      updateSummary();
      return;
    }

    const closeButton = event.target.closest('[data-close]');
    if (closeButton) {
      const target = closeButton.dataset.close;
      if (target === 'booking') closeModal(dom.bookingModal);
      if (target === 'payment') closeModal(dom.paymentModal);
    }
  });

  dom.bookNowBtn.addEventListener('click', () => {
    fillBookingModal();
    openModal(dom.bookingModal);
  });

  dom.proceedToPay.addEventListener('click', () => {
    closeModal(dom.bookingModal);
    document.getElementById('payBtn').scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  dom.payBtn.addEventListener('click', () => {
    openModal(dom.paymentModal);
    startPaymentFlow();
  });

  dom.telegramBtn.href = CONFIG.telegramBotUrl;
}

function initRevealAnimation() {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.18 }
  );

  document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));
}

function init() {
  preventStalePwaCache();

  dom.heroImage.src =
    'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1800&q=80';

  generateAvailability();
  renderRooms();
  renderRoutes();
  renderCalendar();
  updateSummary();
  bindEvents();
  initRevealAnimation();
}

init();
