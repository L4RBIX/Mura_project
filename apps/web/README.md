# Mura · Мұра

> Отбасылық дауыстарды сақтаймыз. Сохраняем голоса семьи.

Mobile-first веб-приложение для семейных воспоминаний: пользователь записывает историю, Mura отправляет аудио в Core API, показывает реальный прогресс обработки и сохраняет готовый ML-результат для интерфейса семейного архива.

Интерфейс полностью работает на русском и казахском; язык можно переключить в приложении.

## Что уже работает

- Настоящая запись микрофона через `MediaRecorder`.
- Загрузка аудио в Mura Core и polling статуса задания.
- Серверный Next.js proxy: адрес backend и bearer-токен не попадают в браузер.
- Русский и казахский UI для onboarding, записи, обработки, дерева, персон и историй.
- Интерактивное семейное дерево с pan, zoom, сменой центрального человека и раскрытием ветвей.
- Адаптивный mobile-first интерфейс и анимации с поддержкой `prefers-reduced-motion`.

## Как это связано

```text
Browser
  │  audio + form data
  ▼
Next.js /api/mura/*
  │  server-only Authorization header
  ▼
Mura FastAPI Core
  ├── Kaggle GPU ASR
  ├── DeepSeek cleanup + extraction
  └── PostgreSQL jobs and archive
```

## Быстрый запуск

```bash
npm install
cp .env.example .env.local
npm run dev
```

Заполните `.env.local`:

```dotenv
MURA_API_URL=http://127.0.0.1:8001
MURA_CORE_API_KEY=your-core-api-bearer-token
```

Откройте `http://localhost:3000`. Backend должен быть запущен отдельно на адресе из `MURA_API_URL`.

> Эти переменные должны оставаться server-only. Не добавляйте к ним префикс `NEXT_PUBLIC_` и не коммитьте `.env.local`.

## Пользовательский путь

```text
/ → /home → /record → /processing → /tree
                                      ├── /person/[id]
                                      └── /story/[id]
```

На странице записи приложение запрашивает микрофон, собирает аудио и отправляет его в `/api/mura/v1/recordings`. Страница обработки получает состояние `/v1/jobs/{job_id}`, загружает готовый результат и сохраняет его в `sessionStorage`. Текущая визуализация дерева использует демонстрационный семейный набор; привязка сохранённого результата к карточкам дерева остаётся отдельным UI-шагом.

## Команды качества

```bash
npm run lint
npm run build
```

## Стек

Next.js 15 · React 19 · TypeScript · Tailwind CSS v4 · Framer Motion · Lucide

## Структура

```text
src/app/          маршруты и серверный API proxy
src/components/   экраны и UI-компоненты
src/data/         демонстрационные люди и истории
src/hooks/        запись аудио, transcript и pan/zoom
src/lib/          i18n, типы и форматирование
```

## Деплой

Frontend рассчитан на Vercel. В настройках проекта добавьте `MURA_API_URL` с публичным HTTPS-адресом Core API и `MURA_CORE_API_KEY` с тем же секретом, который ожидает backend. Сам Core API требует постоянный Python-хостинг и PostgreSQL; localhost из Vercel недоступен.
