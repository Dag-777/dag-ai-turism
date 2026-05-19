// Данные синхронизированы с @DagAi_tourism_bot

const TG_BOT = 'https://t.me/DagAi_tourism_bot';

const ROOMS = [
  {
    id: 'standard',
    name: 'Стандарт',
    guests: 'До 2 чел.',
    price: '3 500 ₽',
    image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=900&q=80',
    features: ['До 2 гостей', 'Вид на горы', 'Уютный интерьер'],
    description: 'Уютный номер с видом на горы',
  },
  {
    id: 'deluxe',
    name: 'Делюкс',
    guests: 'До 3 чел.',
    price: '5 000 ₽',
    image: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=900&q=80',
    features: ['До 3 гостей', 'Балкон', 'Просторный номер'],
    description: 'Просторный номер с балконом',
  },
  {
    id: 'family',
    name: 'Семейный',
    guests: 'До 5 чел.',
    price: '7 000 ₽',
    image: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=900&q=80',
    features: ['До 5 гостей', 'Целый этаж', 'Кухня и гостиная'],
    description: 'Целый этаж для всей семьи',
  },
  {
    id: 'vip',
    name: 'VIP Люкс',
    guests: 'До 4 чел.',
    price: '9 000 ₽',
    image: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=900&q=80',
    features: ['До 4 гостей', 'Джакузи', 'Панорамные окна'],
    description: 'Джакузи, панорамные окна',
  },
];

const ROUTES = [
  {
    id: 'sulak',
    name: 'Сулакский каньон',
    type: 'Дневной тур',
    price: '2 500 ₽',
    image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=900&q=80',
    description: 'Самый глубокий каньон Европы. Катер по бирюзовой воде, обед у скал, обзорная площадка.',
    tgStart: 'route_sulak',
  },
  {
    id: 'gunib',
    name: 'Гуниб и окрестности',
    type: 'Пеший маршрут',
    price: '1 800 ₽',
    image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=900&q=80',
    description: 'Историческое плато, Салтинский водопад, горные сёла с дегустацией кавказской кухни.',
    tgStart: 'route_gunib',
  },
  {
    id: 'derbent',
    name: 'Древний Дербент',
    type: 'Исторический тур',
    price: '3 200 ₽',
    image: 'https://images.unsplash.com/photo-1564507592333-c60657eea523?w=900&q=80',
    description: 'Крепость Нарын-Кала, магалы, дегустация дербентских вин. ЮНЕСКО.',
    tgStart: 'route_derbent',
  },
  {
    id: 'sarykum',
    name: 'Бархан Сарыкум',
    type: 'Экскурсия',
    price: '1 500 ₽',
    image: 'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=900&q=80',
    description: 'Самая большая дюна Европы среди кавказских гор — уникальное природное явление.',
    tgStart: 'route_sarykum',
  },
];

function esc(s) { return String(s).replace(/"/g, '&quot;'); }

function roomCardHTML(r) {
  return `
    <article class="room-card">
      <div class="room-card__image" style="background-image:url('${esc(r.image)}')">
        <span class="room-card__guests">${r.guests}</span>
      </div>
      <div class="room-card__body">
        <h3 class="room-card__name">${r.name}</h3>
        <p class="room-card__desc">${r.description}</p>
        <ul class="room-card__features">
          ${r.features.map(f => `<li>${f}</li>`).join('')}
        </ul>
        <div class="room-card__foot">
          <span class="room-card__price">${r.price}<span class="room-card__price-unit"> / ночь</span></span>
          <div class="room-card__btns">
            <button class="btn btn--gold" type="button" data-book-room="${r.id}">Забронировать</button>
            <a href="${TG_BOT}?start=room_${r.id}" class="btn btn--tg-icon" target="_blank" rel="noopener" title="В боте">✈</a>
          </div>
        </div>
      </div>
    </article>`;
}

function routeCardHTML(r) {
  return `
    <article class="route-card">
      <div class="route-card__image" style="background-image:url('${esc(r.image)}')"></div>
      <div class="route-card__body">
        <span class="route-card__type">${r.type}</span>
        <h3 class="route-card__name">${r.name}</h3>
        <p class="route-card__desc">${r.description}</p>
        <div class="route-card__foot">
          <span class="route-card__price">${r.price}</span>
          <a href="${TG_BOT}?start=${r.tgStart}" class="btn btn--outline-gold" target="_blank" rel="noopener">Подробнее ✈</a>
        </div>
      </div>
    </article>`;
}

export function renderRooms() {
  const grid = document.getElementById('rooms-grid');
  if (grid) {
    grid.innerHTML = ROOMS.map(roomCardHTML).join('');
    grid.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-book-room]');
      if (!btn) return;
      const sel = document.querySelector('select[name="roomType"]');
      if (sel) { sel.value = btn.dataset.bookRoom; }
      document.getElementById('booking')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  const select = document.querySelector('select[name="roomType"]');
  if (select) {
    select.innerHTML =
      '<option value="">— Выберите номер —</option>' +
      ROOMS.map(r => `<option value="${r.id}">${r.name} · ${r.price} / ночь · ${r.guests}</option>`).join('');
  }
}

export function renderRoutes() {
  const grid = document.getElementById('routes-grid');
  if (grid) grid.innerHTML = ROUTES.map(routeCardHTML).join('');
}

export { ROOMS, ROUTES };
