# Карта проекта goNotes

## Поток выполнения

```text
React UI (`notes-ui/src`)
        |
        | HTTP `/api/*`, `/files/*`
        v
custom Router (`internal/router.go`)
        |
        +-- JSON/multipart API (`internal/api.go`)
        +-- Streamable HTTP MCP `/mcp` (`internal/mcp.go`)
        +-- вложения и превью (`internal/utils.go`, `internal/utils/`)
        +-- SQLite (`db.sql`, `internal/migrations.go`)

Production: notes-ui/dist -> assets/www -> go:embed -> один Go-бинарник
Development: DEBUG_UI=1 -> backend читает notes-ui/dist с диска
```

## Backend

- `main.go` — загрузка конфигурации, открытие SQLite, миграции, регистрация
  маршрутов и раздача UI/файлов.
- `internal/api.go` — тонкие HTTP-адаптеры заметок, тегов и вложений; переводят
  query/JSON/multipart в вызовы общего сервиса и сохраняют клиентский контракт.
- `internal/mcp.go` — защищенный Bearer-токеном Streamable HTTP MCP endpoint;
  набор инструментов агента для полного управления заметками.
- `internal/notes_service.go` — единый доменный сервис для HTTP API и MCP;
  владеет SQL, транзакциями, синхронизацией тегов и файлами вложений.
- `internal/router.go` — небольшой собственный HTTP router. Префикс маршрута
  обозначается ведущим `^`, суффикс — завершающим `$`.
- `internal/types.go` — DTO backend.
- `internal/utils.go` и `internal/utils/` — обработка вложений и общие утилиты.
- `internal/cfg/config.go` — конфигурация и выбор каталога профиля через
  `PROFILE_PLACE`.
- `db.sql` — идемпотентная базовая схема для новых запусков.
- `internal/migrations.go` — последовательные обновления уже существующей БД.

Приложение использует SQLite в WAL-режиме с включенными foreign keys. Файлы
вложений и их превью находятся в `<профиль>/uploads`; БД — в
`<профиль>/notes.db`, конфигурация — в `<профиль>/config.json`. Профиль по
умолчанию расположен в `~/Library/Application Support/com.rndnm.gonotes` на
macOS, рядом с бинарником на Linux и в текущем рабочем каталоге на Windows.
`PROFILE_PLACE` переопределяет этот выбор.

Поле `UploadsDir` читается из конфигурации, но текущие обработчики загрузки,
раздачи и удаления используют жестко заданный `<профиль>/uploads`. Считать
настраиваемый каталог рабочим нельзя, пока все эти пути не переведены на
`Config.GetUploadsPath()`.

## Данные и поведение API

- Все API-ответы оборачиваются в `{"result": ...}`; ошибки возвращаются как
  `{"error": "..."}` с HTTP 500. Необработанный `/api/*` получает 404.
- Создание и обновление заметок используют `multipart/form-data`: текст,
  новые вложения и список удаляемых вложений обрабатываются одной транзакцией.
  Остальные мутации используют JSON, а `GET`/`DELETE` — query parameters.
- Хештеги извлекаются из текста заметки на backend, хранятся в `tags` и
  `message_tags` и пересобираются при обновлении содержимого. Массовое добавление
  тегов дописывает отсутствующие хештеги в `content`, синхронно обновляет
  `content_lower` и `updated_at`, затем добавляет связи в `message_tags`.
- `content_lower` поддерживается вместе с `content` и используется для
  регистронезависимого поиска по всем словам запроса.
- Лента сортируется по убыванию `sort_order`; пагинация передает
  `last_order`. В представлении тега текущие заметки идут первыми, архивные —
  следом; составной курсор дополнительно передает `last_archived`. Фильтр по
  нескольким тегам использует AND-семантику.
- Архив (`is_archived`) и корзина (`is_deleted`) — разные состояния. Раздел
  заметок исключает архивные записи, а отдельный раздел архива показывает все
  архивные записи. Поиск глобальный по обычным и архивным заметкам; в корзине
  он ограничен корзиной. Тег показывает оба состояния, группируя архивные
  заметки после текущих. Корзина может содержать заметки из обоих состояний.
- Delete — двухэтапная операция: активная заметка сначала попадает в корзину;
  заметка, уже находящаяся в корзине, удаляется из БД вместе с физическими
  файлами. Restore сбрасывает `is_deleted`.
- `used_at` меняется при использовании/копировании заметки, `updated_at` — при
  редактировании, `is_expanded` хранит пользовательское состояние раскрытия.

Точки синхронизации контракта: обработчики в `internal/api.go`, backend DTO в
`internal/types.go`, методы клиента в `notes-ui/src/tools/api.ts`, типы запросов
в `notes-ui/src/tools/types.ts` и модель `Note` в `notes-ui/src/types.ts`.

## Frontend

- `notes-ui/src/App.tsx` — корневой UI и композиция основных сценариев.
- `notes-ui/src/hooks/` — загрузка заметок с infinite query и загрузка тегов
  через TanStack Query.
- `notes-ui/src/tools/api.ts` — Axios-клиент API.
- `notes-ui/src/types.ts` и `src/tools/types.ts` — типы данных UI/API.
- `notes-ui/src/components/NotesHeader/` — поиск и сброс фильтров.
- `notes-ui/src/components/NavigationDrawer/` — постоянная desktop- или
  выдвижная mobile-навигация, создание заметки, архив, корзина и выбор темы.
- `notes-ui/src/components/TagsNavigation/` и `TagsNavigationList/` — раздел
  заметок, категории, их выбор и ручная сортировка.
- `notes-ui/src/components/NotesFeed/` и `NoteCard/` — состояния ленты,
  карточки заметок, infinite-scroll trigger и DnD-контекст сортировки.
- `notes-ui/src/components/NoteBulkActionsBar/` и `NoteReorderBar/` — панели
  массовых действий и сохранения ручного порядка.
- `notes-ui/src/ctx/` — контексты темы и уведомлений.
- `notes-ui/src/assets/` и `src/sw.js` — HTML-шаблон, PWA manifest, иконки и
  service worker.
- `notes-ui/rspack.config.cts` — production/development сборка в
  `notes-ui/dist`.

Состояние сервера кешируется через TanStack Query. Стили строятся на MUI и
общем `index.css`; существующие паттерны компонента предпочтительнее введения
нового слоя абстракций.

`App.tsx` синхронизирует фильтры `id`, `q`, `tags`, `archived` и `deleted` с
query string, обрабатывает `popstate` и координирует меню заметки, удаление,
выбор и сортировку. Глобальный поиск сбрасывает категорию и архив, поиск в
корзине остается внутри корзины. Архив — отдельный пункт навигации, а выбранная
категория одновременно показывает текущие и архивные заметки.

Создание/редактирование координирует `NoteEditor`: на мобильных экранах он
показывает встроенный `CompactNoteEditor`, на desktop —
`CompactNoteEditorDialog` с переходом в `AdvancedNoteEditorDialog`. Общие
изменения текста, вложений, Web Share Target или горячих клавиш необходимо
проверить в обеих ветках.

## Сборка и релиз

- `npm run build` создает `notes-ui/dist`.
- `npm run release` пересобирает UI и копирует его в `assets/www`.
- `go build` встраивает `assets/www` через `assets/embed.go`.
- `scripts/build.ui.sh` очищает `assets/www` и запускает frontend release.
- `scripts/build.sh` собирает бинарник `goNotes` и передает версию из
  `scripts/_variables.sh` через `-ldflags`.
- `scripts/run.sh dev` включает `DEBUG_UI=1`, собирает backend и запускает его;
  UI при этом нужно отдельно собирать/watch-ить командой `npm run dev`.
- `scripts/run.sh` без аргумента сначала собирает встроенный UI, затем backend.
- `scripts/release.sh` интерактивно повышает версию, создает commit, push, тег и
  push тега. Это изменяющий удаленный репозиторий сценарий, а не локальная
  проверка; не запускай его без явного запроса пользователя.

`assets/www`, `notes-ui/dist`, бинарник, SQLite-файлы и `uploads/` являются
локальными/generated-данными и исключены через `.gitignore`.
