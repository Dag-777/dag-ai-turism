// Static data for rooms and routes, plus DOM rendering.

const ROOMS = [
  {
    id: 'standard',
    name: 'Стандарт «Горный воздух»',
    price: '7 900 ₽',
    image: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=900&q=80',
    features: ['Двуспальная кровать', 'Вид на горы', 'Завтрак включён'],
  },
  {
    id: 'family',
    name: 'Семейный Люкс',
    price: '11 400 ₽',
    image: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=900&q=80',
    features: ['Две комнаты', 'Камин', 'Балкон с видом'],
  },
  {
    id: 'panorama',
    name: 'Panorama Suite',
    price: '13 600 ₽',
    image: 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=900&q=80',
    features: ['Панорамные окна', 'Джакузи', 'Терраса'],
  },
  {
    id: 'sky',
    name: 'Sky Villa',
    price: '17 800 ₽',
    image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=900&q=80',
    features: ['Отдельная вилла', 'Приватный сад', 'Персональный консьерж'],
  },
];

const ROUTES = [
  {
    id: 'sulak',
    name: 'Сулакский каньон',
    type: 'Дневной тур',
    price: '2 500 ₽',
    image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=900&q=80',
    description: 'Самый глубокий каньон Европы. Катер по бирюзовой воде, обед у скал, обзорная площадка над пропастью.',
  },
  {
    id: 'gunib',
    name: 'Гуниб и окрестности',
    type: 'Пеший маршрут',
    price: '1 800 ₽',
    image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=900&q=80',
    description: 'Историческое плато, Салтинский водопад, аутентичные горные сёла с дегустацией кавказской кухни.',
  },
  {
    id: 'derbent',
    name: 'Древний Дербент',
    type: 'Исторический тур',
    price: '3 200 ₽',
    image: 'https://images.unsplash.com/photo-1564507592333-c60657eea523?w=900&q=80',
    description: 'Крепость Нарын-Кала, древнейший город России, прогулка по магалам и дегустация дербентских вин.',
  },
];

function escapeAttr(s) {
  return String(s).replace(/"/g, '&quot;');
}

function roomCardHTML(r) {
  return `
    <article class="room-card">
      <div class="room-card__image" style="background-image: url('${escapeAttr(r.image)}')"></div>
      <div class="room-card__body">
        <h3 class="room-card__name">${r.name}</h3>
        <ul class="room-card__features">
          ${r.features.map(f => `<li>${f}</li>`).join('')}
        </ul>
        <div class="room-card__foot">
          <span class="room-card__price">${r.price}<span class="room-card__price-unit"> / ночь</span></span>
          <button class="btn btn--gold" type="button" data-book-room="${r.id}">Забронировать</button>
        </div>
      </div>
    </article>
  `;
}

function routeCardHTML(r) {
  return `
    <article class="route-card">
      <div class="route-card__image" style="background-image: url('${escapeAttr(r.image)}')"></div>
      <div class="route-card__body">
        <span class="route-card__type">${r.type}</span>
        <h3 class="route-card__name">${r.name}</h3>
        <p class="route-card__desc">${r.description}</p>
        <div class="route-card__foot">
          <span class="route-card__price">${r.price}</span>
          <button class="btn btn--outline-gold" type="button" data-book-room="${r.id}">Подробнее</button>
        </div>
      </div>
    </article>
  `;
}

export function renderRooms() {
  const grid = document.getElementById('rooms-grid');
  if (grid) grid.innerHTML = ROOMS.map(roomCardHTML).join('');

  const select = document.querySelector('select[name="roomType"]');
  if (select) {
    select.innerHTML =
      '<option value="">— Выберите номер —</option>' +
      ROOMS.map(r => `<option value="${r.id}">${r.name} · ${r.price}</option>`).join('');
  }
}

export function renderRoutes() {
  const grid = document.getElementById('routes-grid');
  if (grid) grid.innerHTML = ROUTES.map(routeCardHTML).join('');
}

export { ROOMS, ROUTES };
