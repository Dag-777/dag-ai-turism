// DagAI Tourism — Telegram Offer Sender v1.0
// Вариант 3: отправляет менеджеру всегда + клиенту если пришёл из бота (есть tg_id)

export const config = { runtime: 'edge' };

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

async function sendTelegram(botToken, chatId, text) {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id:    chatId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    }),
  });
  const data = await res.json();
  return { ok: res.ok, data };
}

function managerMessage({ portrait, strategy, signals, siteUrl }) {
  const p = portrait || {};
  const s = strategy || {};
  const tgFrom = signals?.tg_from || '';
  const fromBot = tgFrom && tgFrom !== 'нет';
  const tgCtx   = signals?.tg_ctx || '';
  const city    = signals?.city || '';
  const device  = signals?.device || '';
  const hour    = signals?.localHour ?? '';
  const scroll  = signals?.scrollDepth ?? '';
  const time    = signals?.timeOnPage ?? '';

  const discountLine = s.discount ? `\n🎁 <b>Скидка/бонус:</b> ${s.discount}` : '';
  const tgLine = fromBot
    ? `\n📡 <b>Из бота:</b> да${tgCtx ? ` · смотрел: <i>${tgCtx}</i>` : ''}`
    : '';

  return `💎 <b>DagAI Intelligence — Новый гость</b>

👤 <b>Сегмент:</b> ${p.segment || '—'} · <b>Intent:</b> ${p.intent || '—'}
${p.psychotype ? `🧠 <i>${p.psychotype}</i>` : ''}
🏷 <b>Интересы:</b> ${(p.interests || []).join(', ') || '—'}
📊 <b>Уверенность:</b> ${Math.round((p.confidence || 0) * 100)}%

🏨 <b>Оффер:</b> ${s.offer || '—'}${discountLine}
💰 <b>Tier:</b> ${s.price_tier || '—'} · <b>Канал:</b> ${s.channel || '—'}
⚡ <b>Следующий шаг:</b> ${s.next_step || '—'}
⏰ <b>Когда связаться:</b> ${s.timing || '—'}

📍 <b>Город:</b> ${city || '—'} · 📱 ${device || '—'} · ⏱ на сайте ${time}с
📜 <b>Скролл:</b> ${scroll}% · 🕐 час визита: ${hour}:00${tgLine}

🔗 <a href="${siteUrl || '#'}">Открыть сайт</a>`;
}

function clientMessage({ portrait, strategy, siteUrl }) {
  const p = portrait || {};
  const s = strategy || {};
  const discountLine = s.discount
    ? `\n\n🎁 <b>Специально для вас:</b> ${s.discount}`
    : '';

  return `✨ <b>DagAI Tourism — Горная Вилла Гуниб</b>

Мы подобрали для вас персональное предложение:

🏔 ${s.hook || 'Добро пожаловать в горный Дагестан!'}

🏨 <b>Рекомендуем:</b> ${s.offer || '—'}${discountLine}

Готовы ответить на любые вопросы и оформить бронь прямо здесь.

🔗 <a href="${siteUrl || 'https://dag-ai-turism.vercel.app'}">Посмотреть на сайте</a>`;
}

export default async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const botToken      = process.env.TELEGRAM_BOT_TOKEN;
  const managerChatId = process.env.TELEGRAM_MANAGER_CHAT_ID;

  if (!botToken)      return json({ error: "TELEGRAM_BOT_TOKEN не настроен" }, 500);
  if (!managerChatId) return json({ error: "TELEGRAM_MANAGER_CHAT_ID не настроен" }, 500);

  let body;
  try { body = await req.json(); }
  catch { return json({ error: "Invalid JSON" }, 400); }

  const { portrait, strategy, signals, siteUrl } = body || {};
  if (!strategy) return json({ error: "Missing strategy" }, 400);

  const results = { manager: null, client: null };

  // Всегда отправляем менеджеру
  const mText = managerMessage({ portrait, strategy, signals, siteUrl });
  results.manager = await sendTelegram(botToken, managerChatId, mText);

  // Отправляем клиенту если пришёл из бота и есть tg_id
  const rawTgId = signals?._tg_id_full || '';
  const tgFrom  = signals?.tg_from || '';
  const fromBot = tgFrom && tgFrom !== 'нет' && rawTgId;

  if (fromBot) {
    const cText = clientMessage({ portrait, strategy, siteUrl });
    results.client = await sendTelegram(botToken, rawTgId, cText);
  }

  const allOk = results.manager?.ok && (results.client === null || results.client?.ok);

  return json({
    ok: allOk,
    sentToManager: results.manager?.ok || false,
    sentToClient:  results.client?.ok  || false,
    results,
  });
};
