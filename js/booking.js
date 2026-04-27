// Booking form: validates locally, shows toast, prefills room from card buttons.

function showToast(message, kind = 'success') {
  const t = document.createElement('div');
  t.className = `toast toast--${kind}`;
  t.textContent = message;
  document.body.appendChild(t);
  requestAnimationFrame(() => t.classList.add('toast--in'));
  setTimeout(() => {
    t.classList.remove('toast--in');
    setTimeout(() => t.remove(), 400);
  }, 4500);
}

export function initBooking() {
  const form = document.getElementById('booking-form');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());

    if (!data.name || !data.phone || !data.checkin || !data.checkout || !data.roomType) {
      showToast('Пожалуйста, заполните все поля.', 'error');
      return;
    }
    if (new Date(data.checkout) <= new Date(data.checkin)) {
      showToast('Дата отъезда должна быть позже даты заезда.', 'error');
      return;
    }

    console.log('[booking] submitted:', data);
    form.reset();
    showToast('✅ Заявка принята! Мы свяжемся с вами в течение часа.');
  });

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-book-room]');
    if (!btn) return;
    const roomId = btn.getAttribute('data-book-room');
    const select = form.querySelector('select[name="roomType"]');
    if (select && roomId) {
      const exists = [...select.options].some(o => o.value === roomId);
      if (exists) select.value = roomId;
    }
    document.getElementById('booking')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}
