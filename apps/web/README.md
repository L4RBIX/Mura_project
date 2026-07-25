# Mura · Мұра web

Mobile-first интерфейс семейного архива на русском и казахском. Браузер сохраняет
оригинальное аудио локально и отправляет его в GigaAM только через server-side
proxy Next.js. Полученные ASR-сегменты передаются в отдельный Mura model service.
`SpeechRecognition` используется для live preview и как fallback, если временный
Kaggle worker недоступен.

## Архитектура интеграции

```text
MediaRecorder в браузере
  ├── audio Blob → IndexedDB этого устройства
  └── audio Blob → POST /api/mura/transcriptions (Next.js)
                         └── server-only Authorization
                                  ↓
                         POST /v1/transcribe (Kaggle GigaAM)
                                  ↓
                         verified transcript segments
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

Extraction backend не получает audio Blob: он принимает только проверенные
текстовые сегменты. Аудио отправляется только GigaAM worker и удаляется из его
временной директории после обработки; оригинал остаётся в IndexedDB устройства.
Interim-фразы `SpeechRecognition` никогда не отправляются в Mura.

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
MURA_ASR_API_URL=https://replace-with-current-tunnel.trycloudflare.com
MURA_ASR_API_KEY=replace_with_same_kaggle_secret
MURA_ASR_TIMEOUT_MS=295000
MURA_ASR_MAX_UPLOAD_MB=50
MURA_MODEL_API_URL=http://127.0.0.1:8000
MURA_MODEL_API_KEY=replace_with_same_backend_secret
MURA_MODEL_TIMEOUT_MS=300000
```

`MURA_ASR_API_KEY` должен совпадать с Kaggle Secret
`KAGGLE_ASR_API_KEY`. URL quick tunnel меняется при каждом перезапуске Kaggle,
поэтому `MURA_ASR_API_URL` нужно обновлять новым напечатанным адресом.
`MURA_MODEL_API_KEY` должен совпадать с отдельным `MURA_API_KEY` backend. Все
переменные остаются server-only: не добавляйте префикс `NEXT_PUBLIC_` и не
коммитьте `.env.local`. Frontend не содержит DeepSeek credentials.

## Контракты proxy

Браузер отправляет запись:

```http
POST /api/mura/transcriptions
Content-Type: multipart/form-data

file=<audio>
recording_id=rec_123
```

Proxy проверяет размер и расширение, добавляет
`Authorization: Bearer <MURA_ASR_API_KEY>` и пересылает файл в
`${MURA_ASR_API_URL}/v1/transcribe`. Ответ GigaAM строго валидируется до
использования в extraction pipeline.

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

1. После завершения записи audio Blob сразу сохраняется в IndexedDB до сетевого
   запроса.
2. GigaAM возвращает полный текст и временные сегменты с provenance модели.
3. Если Kaggle недоступен, завершённые browser-фразы используются как fallback;
   их время приблизительное, потому что Web Speech не даёт alignment.
4. Страница `/processing?memory=...` выполняет один синхронный extraction request.
5. При ошибке остаются аудио, transcript и исходный request. Кнопка «Повторить
   анализ» использует сохранённые сегменты без новой записи и без автоматического
   retry loop.
6. Старые записи localStorage нормализуются при чтении и продолжают открываться.

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

- Kaggle quick tunnel и GPU-сессия временные; после остановки notebook URL нужно
  обновить.
- Browser fallback зависит от поддержки `SpeechRecognition`; только его timestamps
  приблизительные.
- Аудио и archive metadata существуют только в текущем браузере/устройстве.
- Серверной базы данных, cloud audio storage и автоматической синхронизации пока
  нет.
