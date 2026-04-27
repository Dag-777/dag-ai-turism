// DagAI Tourism — Strategist client v4.1
// Returns portrait + strategy + vector (radar dimensions for client fingerprint)

export const SYSTEM_PROMPT = `Ты — аналитик горной виллы DagAI Tourism (Гуниб, Дагестан, 1500м).
На входе — 14 сигналов о посетителе. Верни ТОЛЬКО валидный JSON без markdown, без \`\`\`json.

ДОСТУПНЫЕ НОМЕРА:
- "Стандарт «Горный воздух»" — 7900₽/ночь
- "Семейный Люкс" — 11400₽/ночь  
- "Panorama Suite" — 13600₽/ночь
- "Sky Villa" — 17800₽/ночь

ДОСТУПНЫЕ МАРШРУТЫ:
- "Сулакский каньон" — 2500₽
- "Гуниб и окрестности" — 1800₽
- "Древний Дербент" — 3200₽

JSON-схема ответа:
{
  "portrait": {
    "segment": "luxury" | "family" | "corporate" | "budget" | "unknown",
    "intent": "booking" | "research" | "comparison" | "random",
    "interests": ["до 5 тегов на русском"],
    "confidence": 0.0..1.0
  },
  "vector": {
    "роскошь": 0..100,
    "природа": 0..100,
    "уединение": 0..100,
    "активность": 0..100,
    "семья": 0..100,
    "гастрономия": 0..100,
    "история": 0..100,
    "экстрим": 0..100
  },
  "strategy": {
    "hook": "1 предложение — персональный зацеп для этого гостя",
    "offer": "конкретный номер из списка выше + маршрут если уместно",
    "discount": "скидка или бонус если уместно (например: -10% при бронировании сегодня), иначе пустая строка",
    "price_tier": "economy" | "standard" | "premium" | "vip",
    "channel": "whatsapp" | "telegram" | "call" | "email",
    "next_step": "что сделать менеджеру прямо сейчас — конкретное действие"
  }
}`;

function readRate(headers) {
  return {
    rpmRemaining: headers.get('x-rpm-remaining') || '',
    tpmRemaining: headers.get('x-tpm-remaining') || '',
    rpmLimit:     headers.get('x-rpm-limit')     || '',
    tpmLimit:     headers.get('x-tpm-limit')     || '',
  };
}

export async function analyzeVisitor(signals) {
  const userPayload = JSON.stringify(signals, null, 2);
  let res;
  try {
    res = await fetch('/api/strategist', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ system: SYSTEM_PROMPT, user: userPayload }),
    });
  } catch (e) {
    return { ok: false, error: `Сеть недоступна: ${e.message}`, rate: {}, raw: null, thinking: null };
  }

  const rate = readRate(res.headers);
  let data = null;
  try { data = await res.json(); } catch { /* keep null */ }

  if (!res.ok || !data) {
    return { ok: false, error: data?.error || `HTTP ${res.status}`, rate, raw: data, thinking: null };
  }

  const message  = data.choices?.[0]?.message;
  const thinking = message?.thinking || null;
  const content  = message?.content;

  let parsed = null;
  if (typeof content === 'string') {
    try { parsed = JSON.parse(content); }
    catch {
      const stripped = content.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
      try { parsed = JSON.parse(stripped); } catch { parsed = null; }
    }
  } else if (content && typeof content === 'object') {
    parsed = content;
  }

  if (!parsed) {
    return { ok: false, error: 'Не удалось распарсить ответ модели', rate, raw: data, thinking };
  }

  return { ok: true, parsed, thinking, raw: data, rate };
}
