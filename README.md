# DagAI_tourism.com

Готовый одностраничный демо-сайт **DagAI_tourism.com** на `HTML5 + Tailwind CDN + Vanilla JS`.

## Структура проекта

- `index.html`
- `styles.css`
- `script.js`
- `_headers`
- `README.md`

## Как открыть локально

1. Перейдите в папку проекта:
   ```bash
   cd DagAI_tourism.com
   ```
2. Запустите простой статический сервер:
   ```bash
   python3 -m http.server 8080
   ```
3. Откройте в браузере:
   `http://localhost:8080`

## Деплой на Netlify (Drag & Drop)

1. Зайдите в Netlify: `https://app.netlify.com/drop`
2. Перетащите папку **DagAI_tourism.com** (или её zip).
3. После публикации получите временный URL вида `https://***.netlify.app`.

## Подключение домена DagAI_tourism.com

1. В Netlify откройте: `Site settings` → `Domain management` → `Add custom domain`.
2. Укажите домен: `DagAI_tourism.com`.
3. На стороне регистратора домена добавьте DNS-записи, которые покажет Netlify (обычно `A`/`CNAME`).
4. Дождитесь выпуска SSL (обычно автоматически).

## Где менять тексты и фото

Весь контент вынесен в переменные в начале файла:

- `script.js` → объект `CONFIG`
  - `CONFIG.rooms` — карточки номеров
  - `CONFIG.routes` — маршруты и фото
  - `CONFIG.telegramBotUrl` — ссылка на Telegram-бота
  - `CONFIG.prepaymentRate` — размер предоплаты

Hero-фон задан в `script.js` в `init()` и дублирован в `index.html` для fallback.

## Telegram-бот

Измените ссылку на вашего бота в:

- `script.js` → `CONFIG.telegramBotUrl`

Пример:
```js
telegramBotUrl: 'https://t.me/your_real_bot_username'
```

## Источники изображений

### По маршрутам (запрошенные источники)
- Сулакский каньон (аэро):
  `https://www.pexels.com/photo/aerial-view-of-sulak-canyon-dagestan-russia-9675972/`
- Сулакский каньон (вид сверху):
  `https://www.pexels.com/photo/view-from-the-top-of-the-sulak-canyon-13380531/`

### Дополнительные изображения (free stock, аналоги)
- Unsplash (hero, номера, Гуниб/Дербент аналоги):
  `https://unsplash.com`
- Pexels (direct image delivery):
  `https://images.pexels.com`

## Примечание

Проект **DagAI_tourism.com** полностью статический, без npm и сборщиков, готов к быстрому запуску и демонстрации.

## Анти-кэш для повторных заходов

- Добавлен файл `_headers` для Netlify с `Cache-Control: no-cache` для `index.html`, `script.js`, `styles.css`.
- В `script.js` добавлена очистка старых `service worker`/`caches`, чтобы исключить проблему устаревшего HTML после обновлений.
