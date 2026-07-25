# Mura · Мұра web

Mobile-first интерфейс семейного архива на русском и казахском. Браузер записывает
оригинальное аудио локально, получает только завершённые фразы через
`SpeechRecognition` и отправляет их в отдельный Mura model service через
server-side proxy Next.js.

## Архитектура интеграции

```text
MediaRecorder + SpeechRecognition в браузере
  ├── audio Blob → IndexedDB этого устройства
  └── final transcript phrases
          ↓
POST /api/mura/extractions (Next.js)
  └── server-only Authorization
          ↓
POST /v1/extractions (Mura model FastAPI)
          ↓
существующий ExtractionPipeline → ExtractionResult
          ↓
localStorage metadata + detail UI
```

Приложение не загружает audio Blob в Mura backend: model-only сервис принимает
сегменты текста, а оригинальная запись остаётся в IndexedDB. Реализация Web Speech
может использовать сервис производителя браузера, поэтому её privacy-поведение
зависит от выбранного браузера. Interim-фразы `SpeechRecognition` никогда не
отправляются в Mura.

## Локальный запуск

Сначала запустите отдельный backend модели:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -e ".[api,dev]"
cp .env.example .env
python -m uvicorn mura_model.api:create_app --factory --host 127.0.0.1 --port 8000
```

Затем frontend:

```bash
cd apps/web
npm install
cp .env.example .env.local
npm run dev
```

Откройте `http://localhost:3000`.

`apps/web/.env.local`:

```dotenv
MURA_MODEL_API_URL=http://127.0.0.1:8000
MURA_MODEL_API_KEY=replace_with_same_backend_secret
MURA_MODEL_TIMEOUT_MS=300000
```

`MURA_MODEL_API_KEY` должен совпадать с отдельным `MURA_API_KEY` backend. Все
переменные остаются server-only: не добавляйте префикс `NEXT_PUBLIC_` и не
коммитьте `.env.local`. Frontend не содержит DeepSeek credentials.

## Контракт proxy

Браузер вызывает только:

```http
POST /api/mura/extractions
Content-Type: application/json
```

Пример тела:

```json
{
  "recording_id": "rec_123",
  "speaker_id": "speaker_123",
  "speaker_name": "Айсұлу",
  "language_hints": ["kk", "ru"],
  "segments": [
    {
      "segment_id": "seg_001",
      "start": 0,
      "end": 4.2,
      "text": "Менің әкем Сабыр алма бағында жұмыс істеген."
    }
  ]
}
```

Proxy проверяет запрос, добавляет `Authorization: Bearer <MURA_MODEL_API_KEY>`
только на сервере и пересылает его в `${MURA_MODEL_API_URL}/v1/extractions`.
Успешный `ExtractionResult` содержит `languages`, `people`, `relationships`,
`events`, `stories` и `review_items` и сохраняется полностью.

Минимальный успешный ответ:

```json
{
  "schema_version": "simple-v1",
  "recording_id": "rec_123",
  "languages": ["kk", "ru"],
  "people": [],
  "relationships": [],
  "events": [],
  "stories": [],
  "review_items": []
}
```

Безопасные proxy-ошибки:

- `503 backend_not_configured`;
- `502 backend_unreachable`;
- `504 backend_timeout`;
- `401 unauthorized`;
- безопасные `provider_error`, `repair_failed`, `invalid_model_response` и
  `internal_error` без URL backend, токенов или stack trace.

## Запись, хранение и повторный анализ

1. После завершения записи audio Blob сразу сохраняется в IndexedDB.
2. Каждая final-фраза становится отдельным `seg_001`, `seg_002`, … .
3. Время фразы приблизительное: browser API не предоставляет ASR alignment, поэтому
   hook использует активное время записи и сохраняет порядок без пересечений.
4. Запрос и базовая память сохраняются до сетевого вызова.
5. Страница `/processing?memory=...` выполняет один синхронный model request.
6. При ошибке остаются аудио, transcript и исходный request. Кнопка «Повторить
   анализ» использует сохранённые сегменты без новой записи и без автоматического
   retry loop.
7. Старые записи localStorage нормализуются при чтении и продолжают открываться.

Если ни одной final-фразы нет, backend не вызывается: создаётся `audio_only`
память с понятным сообщением. Фейковая расшифровка не подставляется.

## Detail UI

Локальная страница воспоминания показывает:

- основной и дополнительные stories;
- всех людей, aliases, отношение к рассказчику и review status;
- связи с разрешёнными именами и ролями;
- события, даты, места и участников;
- review items;
- transcript по сегментам.

Evidence ID работает как ссылка: нажатие прокручивает страницу к нужной фразе и
временно подсвечивает её. Семейное дерево остаётся отдельной существующей
визуализацией и не изменяется этой интеграцией.

## Команды качества

```bash
npm test
npm run lint
npm run build
```

Focused Vitest suite проверяет final-only segment mapping, locale hints, выбор
основной story, полное сохранение результата, старый формат localStorage, retry
из сохранённого transcript, server-only Authorization, timeout и безопасную
нормализацию proxy-ошибок.

## Известные ограничения

- Поддержка `SpeechRecognition` и доступные языки зависят от браузера.
- Transcript timestamps приблизительные и не являются выравниванием по аудио.
- Аудио и archive metadata существуют только в текущем браузере/устройстве.
- Серверной базы данных, cloud audio storage и автоматической синхронизации пока
  нет.
