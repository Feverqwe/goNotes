# Карта проекта goNotes

## Поток выполнения

```text
React UI (`notes-ui/src`)
        |
        | HTTP `/api/*`, `/files/*`
        v
custom Router (`internal/router.go`)
        |
        +-- API и операции с файлами (`internal/api.go`, `internal/utils.go`)
        +-- SQLite (`db.sql`, `internal/migrations.go`)

Production: notes-ui/dist -> assets/www -> go:embed -> один Go-бинарник
Development: DEBUG_UI=1 -> backend читает notes-ui/dist с диска
```

## Backend

- `main.go` — загрузка конфигурации, открытие SQLite, миграции, регистрация
  маршрутов и раздача UI/файлов.
- `internal/api.go` — HTTP API заметок, тегов и вложений; здесь же основная
  работа с транзакциями и SQL.
- `internal/router.go` — небольшой собственный HTTP router. Префикс маршрута
  обозначается ведущим `^`, суффикс — завершающим `$`.
- `internal/types.go` — DTO backend.
- `internal/utils.go` и `internal/utils/` — обработка вложений и общие утилиты.
- `internal/cfg/config.go` — конфигурация и выбор каталога профиля через
  `PROFILE_PLACE`.
- `db.sql` — идемпотентная базовая схема для новых запусков.
- `internal/migrations.go` — последовательные обновления уже существующей БД.

Приложение использует SQLite в WAL-режиме с включенными foreign keys. Файлы
вложений находятся в каталоге профиля, обычно рядом с базой.

## Frontend

- `notes-ui/src/App.tsx` — корневой UI и композиция основных сценариев.
- `notes-ui/src/hooks/` — загрузка и изменение заметок/тегов через React Query.
- `notes-ui/src/tools/api.ts` и `apiRequest.ts` — контракт обращения к backend.
- `notes-ui/src/types.ts` и `src/tools/types.ts` — типы данных UI/API.
- `notes-ui/src/components/` — функциональные компоненты интерфейса.
- `notes-ui/src/ctx/` — контексты темы и уведомлений.
- `notes-ui/src/assets/` и `src/sw.js` — HTML-шаблон, PWA manifest, иконки и
  service worker.
- `notes-ui/rspack.config.ts` — production/development сборка в
  `notes-ui/dist`.

Состояние сервера кешируется через TanStack Query. Стили строятся на MUI и
общем `index.css`; существующие паттерны компонента предпочтительнее введения
нового слоя абстракций.

## Сборка и релиз

- `npm run build` создает `notes-ui/dist`.
- `npm run release` пересобирает UI и копирует его в `assets/www`.
- `go build` встраивает `assets/www` через `assets/embed.go`.
- `scripts/build.resources.sh` выбирает Node через локальный NVM и запускает
  frontend release.
- `scripts/build.sh` собирает бинарник `goNotes`.
- `scripts/release.sh` содержит полный release-процесс; изучи его перед
  изменением версий или упаковки.

`assets/www`, `notes-ui/dist`, бинарник, SQLite-файлы и `uploads/` являются
локальными/generated-данными и исключены через `.gitignore`.
