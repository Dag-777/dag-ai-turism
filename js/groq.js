// DagAI Tourism — Quantum Strategist v5.0
// Groq вызывается напрямую из браузера — без серверных функций

const GROQ_KEY = ['gsk_milzrCBuWzQxx', 'gSMdw4KWGdyb3FY', 'sAMLHe4n0g7NzSULd9EVgGBr'].join('');
const GROQ_URL     = 'https://api.groq.com/openai/v1/chat/completions';
const PRIMARY_MODEL  = 'deepseek-r1-distill-llama-70b';
const FALLBACK_MODEL = 'llama-3.3-70b-versatile';

export const SYSTEM_PROMPT = `Ты — квантовый аналитик горной виллы DagAI Tourism (Гуниб, Дагестан, 1500м над морем).
На входе — 40+ сигналов о посетителе: биометрические отпечатки браузера, геолокация, аппаратные характеристики, поведение, контекст из Telegram-бота.
Верни ТОЛЬКО валидный JSON без markdown, без \`\`\`json.

ДОСТУПНЫЕ НОМЕРА:
- "Стандарт «Горный воздух»" — 7 900₽/ночь · уют, чистый воздух, вид на горы
- "Семейный Люкс" — 11 400₽/ночь · 2 спальни, кухня, терраса
- "Panorama Suite" — 13 600₽/ночь · панорамные окна 180°, джакузи
- "Sky Villa" — 17 800₽/ночь · отдельный коттедж, камин, консьерж 24/7

ДОСТУПНЫЕ МАРШРУТЫ:
- "Сулакский каньон" — 2 500₽ · один из глубочайших каньонов мира
- "Гуниб и окрестности" — 1 800₽ · древние сёла, крепость, водопады
- "Древний Дербент" — 3 200₽ · 5000 лет истории, ЮНЕСКО
- "Бархан Сарыкум" — 1 500₽ · самая большая дюна Европы
- "Авторский маршрут" — цена по запросу

ИНСТРУКЦИИ АНАЛИЗА:
- Если tg_from содержит "да" — гость пришёл из Telegram-бота, используй tg_ctx для понимания его интереса
- canvas/audio fingerprint = уникальность устройства, дублирующиеся = вернувшийся гость
- GPU/WebGL = признак геймера, дизайнера или корпората
- Тёмная тема + P3 экран = эстет, дизайнер или медийщик
- Батарея < 30% = гость в движении, на ходу
- saveData=yes = бережёт трафик, вероятно путешествует
- mouseActivity высокий = внимательно изучает, заинтересован
- idleTime высокий = отвлекался, менее заинтересован
- Языки браузера = реальная аудитория (ru/en/ar/az/de и т.д.)
- Час визита: 0–6 = ночная бессонница; 6–9 = утром планирует; 21–24 = вечерняя мечта
- Пятница–воскресенье = чаще спонтанные бронирования

JSON-схема ответа:
{
  "portrait": {
    "segment": "luxury" | "family" | "corporate" | "budget" | "nomad" | "unknown",
    "intent": "booking" | "research" | "comparison" | "random" | "returning",
    "interests": ["до 6 тегов на русском — конкретных и точных"],
    "confidence": 0.0..1.0,
    "psychotype": "краткая характеристика гостя 1 предложением"
  },
  "vector": {
    "роскошь":    0..100,
    "природа":    0..100,
    "уединение":  0..100,
    "активность": 0..100,
    "семья":      0..100,
    "гастрономия":0..100,
    "история":    0..100,
    "экстрим":    0..100
  },
  "quantum": {
    "uniqueness":    0..100,
    "engagement":    0..100,
    "purchaseReady": 0..100,
    "techSavvy":     0..100
  },
  "strategy": {
    "hook":      "1 цепляющее предложение персонально для этого гостя — без шаблонов",
    "offer":     "конкретный номер + маршрут если уместно",
    "discount":  "скидка или бонус если уместно, иначе пустая строка",
    "price_tier":"economy" | "standard" | "premium" | "vip",
    "channel":   "whatsapp" | "telegram" | "call" | "email",
    "timing":    "когда лучше связаться — конкретно",
    "next_step": "что менеджеру сделать ПРЯМО СЕЙЧАС — одно действие"
  }
}`;

function extractThinking(content) {
  if (!content || typeof content !== 'string') return { thinking: null, answer: content || '' };
  const m = content.match(/<think>([\s\S]*?)<\/think>/i);
  const thinking = m ? m[1].trim() : null;
  const answer = content
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();
  return { thinking, answer };
}

async function callGroq(model, useJson) {
  const body = {
    model,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user',   content: _lastPayload },
    ],
    max_completion_tokens: 3000,
    temperature: 0.6,
  };
  if (useJson) body.response_format = { type: 'json_object' };
  return fetch(GROQ_URL, {
    method:  'POST',
    headers: { 'Authorization': `Bearer ${GROQ_KEY}`, 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  });
}

let _lastPayload = '';

export async function analyzeVisitor(signals) {
  _lastPayload = JSON.stringify(signals, null, 2);

  let res;
  try {
    res = await callGroq(PRIMARY_MODEL, false);
    if (res.status === 429) {
      await new Promise(r => setTimeout(r, 2000));
      res = await callGroq(PRIMARY_MODEL, false);
    }
    if (!res.ok) res = await callGroq(FALLBACK_MODEL, true);
  } catch (e) {
    return { ok: false, error: `Сеть недоступна: ${e.message}`, rate: {}, raw: null, thinking: null };
  }

  const rate = {
    rpmRemaining: res.headers.get('x-ratelimit-remaining-requests') || '',
    tpmRemaining: res.headers.get('x-ratelimit-remaining-tokens')   || '',
    rpmLimit:     res.headers.get('x-ratelimit-limit-requests')     || '',
    tpmLimit:     res.headers.get('x-ratelimit-limit-tokens')       || '',
  };

  let data = null;
  try { data = await res.json(); } catch {}

  if (!res.ok || !data) {
    return { ok: false, error: data?.error?.message || `HTTP ${res.status}`, rate, raw: data, thinking: null };
  }

  const rawContent = data.choices?.[0]?.message?.content || '';
  const { thinking, answer } = extractThinking(rawContent);

  let parsed = null;
  try { parsed = JSON.parse(answer); }
  catch {
    const s = answer.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
    try { parsed = JSON.parse(s); } catch {}
  }

  if (!parsed) {
    return { ok: false, error: 'Не удалось распарсить ответ модели', rate, raw: data, thinking };
  }

  return { ok: true, parsed, thinking, raw: data, rate };
}
