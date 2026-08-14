# goNotes

Небольшое self-hosted приложение для личных заметок. goNotes хранит данные в
SQLite, поддерживает Markdown и вложения, работает как PWA и собирается в один
Go-бинарник вместе с веб-интерфейсом.

## Возможности

- Markdown с поддержкой GFM, подсветкой синтаксиса и копированием блоков кода.
- Хештеги прямо в тексте заметки и фильтрация сразу по нескольким тегам.
- Поиск по содержимому, архив и корзина с восстановлением заметок.
- Изображения, видео, аудио и обычные файлы во вложениях; для изображений
  автоматически создаются превью.
- Цвета, ручная сортировка заметок и категорий, массовые действия.
- Адаптивный интерфейс, тёмная тема, установка как PWA и Web Share Target.
- MCP endpoint для управления заметками из совместимого AI-клиента.
- Переносимое хранение: база, конфигурация и вложения находятся в одном профиле.

## Быстрый запуск из исходников

Понадобятся:

- Go 1.25.5 или новее;
- Node.js 24 и npm;
- Git и Bash.

Версия Node.js закреплена в `.nvmrc`. Если Node установлен не через nvm,
пропустите `nvm use` в командах ниже и убедитесь, что используется версия 24.

Клонируйте репозиторий и установите frontend-зависимости:

```bash
git clone https://github.com/Feverqwe/goNotes.git
cd goNotes
nvm use
cd notes-ui
npm ci
npm run release
cd ..
bash scripts/build.sh
```

Создайте отдельный каталог профиля:

```bash
mkdir -p "$HOME/.gonotes"
```

Добавьте в `$HOME/.gonotes/config.json` минимальную конфигурацию:

```json
{
  "Port": 8080,
  "Address": "127.0.0.1",
  "Name": "goNotes",
  "UploadsDir": "uploads"
}
```

Запустите приложение:

```bash
PROFILE_PLACE="$HOME/.gonotes" ./goNotes
```

После запуска откройте <http://127.0.0.1:8080>.

`npm run release` собирает production-версию интерфейса и переносит её в
`assets/www`, после чего `scripts/build.sh` встраивает интерфейс в бинарник
`goNotes`.

Версию бинарника выводит команда `./goNotes -version`.

## Конфигурация и данные

При первом запуске goNotes создаёт `config.json`, если файла ещё нет. Доступные
параметры:

| Поле         | Значение по умолчанию | Назначение                                                       |
| ------------ | --------------------- | ---------------------------------------------------------------- |
| `Port`       | `80`                  | TCP-порт HTTP-сервера                                            |
| `Address`    | `""`                  | Адрес для прослушивания; пустое значение означает все интерфейсы |
| `Name`       | `"Notes"`             | Название приложения во вкладке и интерфейсе                      |
| `UploadsDir` | `"uploads"`           | Зарезервированная настройка каталога вложений                    |

Каталог профиля можно явно задать переменной `PROFILE_PLACE`. Без неё
используется:

- macOS: `~/Library/Application Support/com.rndnm.gonotes`;
- Linux: каталог рядом с исполняемым файлом;
- Windows: текущий рабочий каталог.

В профиле находятся:

```text
config.json   настройки
notes.db      база SQLite
notes.db-wal  журнал SQLite, пока приложение запущено
notes.db-shm  служебный файл SQLite, пока приложение запущено
uploads/      вложения и их превью
```

Фактический путь вложений в текущей версии всегда `<PROFILE_PLACE>/uploads`.
Изменение `UploadsDir` пока не переносит каталог вложений.

Для простой консистентной резервной копии остановите goNotes и скопируйте весь
каталог профиля. Восстановление выполняется заменой профиля из такой копии при
остановленном приложении.

## Развёртывание

Для production-сборки выполните:

```bash
nvm use
cd notes-ui
npm ci
npm run release
cd ..
bash scripts/build.sh
```

Результат — бинарник `goNotes` со встроенным интерфейсом. Для запуска ему нужен
только доступ на запись к каталогу профиля:

```bash
PROFILE_PLACE=/var/lib/gonotes ./goNotes
```

Перед первым запуском создайте `/var/lib/gonotes/config.json` и выдайте каталог
пользователю, от имени которого будет работать процесс.

> [!WARNING]
> Веб-интерфейс и HTTP API goNotes не имеют встроенной авторизации. Не
> публикуйте приложение напрямую в интернете. Ограничьте сетевой доступ либо
> поставьте перед ним reverse proxy с HTTPS и аутентификацией.

## Управление через MCP и голос

Запущенный goNotes может предоставить агенту удалённый MCP endpoint по адресу
`/mcp`. Он работает внутри основного процесса и использует те же соединение с
SQLite, транзакции и каталог вложений, что и HTTP API приложения.

MCP отключён по умолчанию. Чтобы включить его, задайте на сервере секретный
Bearer-токен и перезапустите goNotes:

```bash
export MCP_TOKEN="$(openssl rand -hex 32)"
PROFILE_PLACE="$HOME/.gonotes" ./goNotes
```

При запуске через systemd передайте `MCP_TOKEN` через механизм секретов
окружения. Не публикуйте endpoint без HTTPS: токен даёт полный доступ к заметкам.
Для доступа из интернета направьте `https://notes.example.com/mcp` через тот же
reverse proxy, который обслуживает goNotes.

Пример подключения Codex или ChatGPT desktop через `~/.codex/config.toml`:

```toml
[mcp_servers.gonotes]
url = "https://notes.example.com/mcp"
bearer_token_env_var = "GONOTES_MCP_TOKEN"
default_tools_approval_mode = "writes"
```

На компьютере с агентом задайте тот же токен в `GONOTES_MCP_TOKEN`, затем
перезапустите клиент. В ChatGPT desktop сервер также можно добавить через
`Settings → MCP servers → Add server`, выбрав `Streamable HTTP`.

Токен также можно указать прямо в `config.toml` через статический HTTP-заголовок:

```toml
[mcp_servers.gonotes]
url = "https://notes.example.com/mcp"
http_headers = { Authorization = "Bearer замените-на-свой-токен" }
default_tools_approval_mode = "writes"
```

В этом варианте секрет хранится в файле открытым текстом. Не коммитьте и не
передавайте `config.toml`; для постоянной установки предпочтительнее вариант с
`bearer_token_env_var`.

MCP предоставляет поиск и чтение, создание и редактирование Markdown-заметок,
вложения, теги, цвет и порядок, архив, корзину, восстановление и окончательное
удаление. Вложения передаются в base64; суммарный лимит одного вызова — 32 MiB.
Окончательное удаление работает только для заметок, уже находящихся в корзине,
и помечено для агента как необратимое действие, требующее подтверждения.

После подключения можно начать голосовой чат в ChatGPT desktop и сказать,
например: «Создай в goNotes заметку со списком покупок и тегом дела» или
«Найди заметку про отпуск и допиши, что билеты уже куплены».

Чтобы агент воспринимал слова «заметка» и «заметки» как обращение к goNotes,
установите готовый [skill goNotes](skills/gonotes/SKILL.md):

```bash
mkdir -p ~/.agents/skills/gonotes
curl -fsSL https://raw.githubusercontent.com/Feverqwe/goNotes/master/skills/gonotes/SKILL.md \
  -o ~/.agents/skills/gonotes/SKILL.md
```

Codex обнаруживает пользовательские skills автоматически. Если новый skill не
появился, перезапустите клиент. Его также можно вызвать явно как `$gonotes`.

## Разработка

Backend в development-режиме читает интерфейс из `notes-ui/dist`, поэтому после
первичной сборки backend и watcher frontend запускаются отдельно:

```bash
# Терминал 1
bash scripts/build.sh
DEBUG_UI=1 PROFILE_PLACE="$HOME/.gonotes" ./goNotes
```

```bash
# Терминал 2
cd notes-ui
npm run dev
```

Основные проверки перед отправкой изменений:

```bash
# Backend
go test ./...
go vet ./...
go build ./...

# Frontend
nvm use
cd notes-ui
npm run tsc
npm run lint
npm run build
```

Краткая структура проекта:

```text
internal/       HTTP API, MCP, бизнес-логика, SQLite и миграции
notes-ui/       React/TypeScript frontend
assets/         встраивание собранного frontend в Go-бинарник
scripts/        сборка, локальный запуск и выпуск версии
db.sql          схема новой базы данных
main.go         конфигурация, маршруты и запуск HTTP-сервера
```

Production-сборка проходит по цепочке
`notes-ui/dist → assets/www → go:embed → goNotes`. Каталоги `notes-ui/dist` и
`assets/www`, локальный бинарник, базы и вложения не должны попадать в Git.

## Лицензия

[MIT](LICENSE)
