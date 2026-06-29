# mcp-server

## Что это

`mcp-server` — это MCP-сервер на Node.js/TypeScript, который через stdio предоставляет
IDE-ассистентам (Cursor, Claude Desktop и др.) безопасный набор инструментов для работы с
файлами проекта: листинг директорий, чтение файлов, поиск по содержимому и запуск
команд из ограниченного whitelist'а. Все операции с файловой системой ограничены
песочницей `PROJECT_ROOT`, выход за её пределы (`..`, абсолютные пути вне корня) запрещён.

## Установка

```bash
git clone <repo-url> mcp-server
cd mcp-server
npm install
npm run build
```

После `npm run build` появится файл `dist/server.js` — именно на него ссылаются конфиги
для Cursor и Claude Desktop.

## Настройка

1. Скопируйте `.env.example` в `.env`:
   ```bash
   cp .env.example .env
   ```
2. Откройте `.env` и при необходимости укажите `PROJECT_ROOT` — корень песочницы,
   за пределы которого `list_files` / `read_file` / `search_in_files` не смогут выйти:
   ```
   PROJECT_ROOT=./
   ```

`PROJECT_ROOT` читается через `dotenv` из `.env` (относительные пути резолвятся от
`process.cwd()`) и может быть переопределён полем `env.PROJECT_ROOT` в конфиге
IDE/Claude Desktop — оно имеет приоритет над `.env`. Если переменная не задана,
по умолчанию используется родительская папка `dist/server.js`, то есть сам `mcp-server`.

## Подключение к другому проекту

Чтобы сервер работал с файлами **другого** проекта (а не с самим `mcp-server`),
укажите в конфиге IDE/Claude Desktop:

- `args` — абсолютный путь до `dist/server.js` внутри `mcp-server` (не зависит от `cwd`);
- `env.PROJECT_ROOT` — абсолютный путь до корня того проекта, с которым должен работать сервер.

```json
{
  "mcpServers": {
    "project-helper": {
      "command": "node",
      "args": ["/абсолютный/путь/mcp-server/dist/server.js"],
      "env": {
        "PROJECT_ROOT": "/абсолютный/путь/до/другого/проекта"
      }
    }
  }
}
```

После изменения конфига полностью перезапустите IDE/Claude Desktop, чтобы он
переподключился к серверу с новым `PROJECT_ROOT`.

## Подключение к IDE

### Cursor

1. Скопируйте [.cursor/mcp.json](.cursor/mcp.json) в `.cursor/mcp.json` вашего проекта
   (если Cursor открыт не из папки `mcp-server`).
2. Замените значение `cwd` на абсолютный путь до папки `mcp-server` на вашей машине.
   Узнать путь можно, выполнив внутри `mcp-server`:
   - Windows (PowerShell): `(Get-Item .).FullName` или `pwd`
   - Windows (Git Bash / WSL) / Linux / macOS: `pwd`
3. Перезапустите Cursor (или перезагрузите MCP-серверы в настройках).
4. Проверьте подключение: в настройках MCP или в чате должны появиться инструменты
   `list_files`, `read_file`, `search_in_files`, `run_command` сервера `project-helper`.

### Claude Desktop

1. Скопируйте содержимое [claude_desktop_config_example.json](claude_desktop_config_example.json)
   в файл конфигурации Claude Desktop:
   - Windows: `%APPDATA%\Claude\claude_desktop_config.json`
   - macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
2. Замените значение `cwd` на абсолютный путь до папки `mcp-server` (см. команды выше).
3. Полностью перезапустите Claude Desktop (выйти из приложения, не просто закрыть окно).
4. Проверьте подключение: в списке MCP-серверов должен появиться `project-helper`
   с теми же 4 инструментами.

## Инструменты

| Название | Описание | Параметры | Пример ответа |
|---|---|---|---|
| `list_files` | Список файлов/папок в директории проекта | `path?: string` (по умолчанию `"."`) | `[{"name":"src","type":"directory"},{"name":"package.json","type":"file"}]` |
| `read_file` | Чтение содержимого файла | `path: string` | `{"content":"...текст файла..."}` |
| `search_in_files` | Рекурсивный поиск подстроки по файлам проекта | `pattern: string`, `directory?: string` (по умолчанию `"."`) | `[{"file":"src/server.ts","line":9,"content":"const PROJECT_ROOT = ..."}]` |
| `run_command` | Запуск команды из whitelist'а (`npm test`, `npm run lint`, `npx tsc --noEmit`) | `command: string` | `{"stdout":"...","stderr":"","exitCode":0}` |

## Tool outputs contract

Каждый tool возвращает стандартный MCP-конверт `content: [{ type: "text", text }]`, где
`text` — JSON-строка с payload'ом. При ошибке дополнительно выставляется `isError: true`.

**Успех (общий вид):**
```json
{
  "content": [
    { "type": "text", "text": "<JSON-строка с данными tool'а>" }
  ]
}
```

**Ошибка (общий вид, одинаков для всех 4 tools):**
```json
{
  "content": [
    { "type": "text", "text": "{\"error\":\"<сообщение об ошибке>\"}" }
  ],
  "isError": true
}
```

Содержимое `text` (после `JSON.parse`) по каждому tool в случае успеха:

- `list_files` → `Array<{ name: string; type: "file" | "directory" }>`
  ```json
  [{ "name": "src", "type": "directory" }, { "name": "package.json", "type": "file" }]
  ```
- `read_file` → `{ content: string }`
  ```json
  { "content": "export const x = 1;\n" }
  ```
- `search_in_files` → `Array<{ file: string; line: number; content: string }>`
  ```json
  [{ "file": "src/server.ts", "line": 9, "content": "const PROJECT_ROOT = ..." }]
  ```
- `run_command` → `{ stdout: string; stderr: string; exitCode: number }`
  ```json
  { "stdout": "", "stderr": "", "exitCode": 0 }
  ```

В случае ошибки (для любого из 4 tools) `text` всегда `{ "error": string }`, например:
```json
{ "error": "Path \"../outside\" is outside of the project root" }
{ "error": "Command \"rm -rf /\" is not whitelisted" }
{ "error": "ENOENT: no such file or directory, open 'C:\\path\\to\\mcp-server\\missing.txt'" }
```

> Сообщение `ENOENT` приходит из Node.js `fs` и содержит **резолвленный абсолютный путь**
> (результат `resolveInProject`), а не исходное значение параметра `path`.

## Security

- **Песочница по путям.** Все параметры `path`/`directory` прогоняются через
  `resolveInProject`, который резолвит путь относительно `PROJECT_ROOT` и отклоняет всё,
  что выходит за его пределы (защита от `../../etc/passwd` и абсолютных путей наружу).
- **Whitelist команд.** `run_command` выполняет команду через `execSync` только если она
  **точно совпадает** с одной из строк в `ALLOWED_COMMANDS` (`npm test`, `npm run lint`,
  `npx tsc --noEmit`). Произвольный shell-ввод исполняться не может.
- **Исключение системных директорий из поиска.** `search_in_files` пропускает
  `node_modules`, `.git`, `dist`, чтобы не сканировать гигабайты чужого кода и
  служебные файлы.
- **Логи только в stderr.** `console.error` используется для всех логов, stdout зарезервирован
  под протокол MCP (stdio transport) — это критично, иначе лог сломает протокол.

## Логи

Сервер пишет логи в stderr в формате `[MCP] tool=<имя> params=<JSON> status=<success|error>`.
Пример типичной сессии:

```
[MCP] Registered tools: list_files, read_file, search_in_files, run_command
MCP server started
[MCP] tool=list_files params={"path":"."} status=success
[MCP] tool=read_file params={"path":"src/server.ts"} status=success
[MCP] tool=read_file params={"path":"missing.txt"} status=error error=ENOENT: no such file or directory, open 'C:\path\to\mcp-server\missing.txt'
[MCP] tool=search_in_files params={"pattern":"PROJECT_ROOT","directory":"."} status=success
[MCP] tool=run_command params={"command":"npm test"} status=success
[MCP] tool=run_command params={"command":"rm -rf /"} status=error error=Command "rm -rf /" is not whitelisted
```

## Ссылки на код

> Номера строк соответствуют текущей версии `src/server.ts`. Если файл изменится,
> диапазоны нужно будет пересчитать.

- [report/demo.md](report/demo.md) — таблица с подтверждениями (логи/скрины) фактических
  вызовов тулов из IDE.

| Компонент | Ссылка |
|---|---|
| Импорты | `server.ts:L1–L8` |
| `dotenv.config()` и вычисление `PROJECT_ROOT` (из `env`/`.env` или дефолт) | `server.ts:L10–L15` |
| Константы и конфигурация (`ALLOWED_COMMANDS`, `SEARCH_SKIP_DIRS`, `REGISTERED_TOOLS`) | `server.ts:L17–L21` |
| `resolveInProject` (защита от выхода за пределы `PROJECT_ROOT`) | `server.ts:L23–L29` |
| `logToolCall` / `toolResult` (логирование и формат ответа) | `server.ts:L31–L41` |
| `SearchMatch` / `searchDirectory` (рекурсивный обход директорий) | `server.ts:L43–L77` |
| `main()`: инициализация `McpServer` | `server.ts:L79–L83` |
| tool `list_files` | `server.ts:L85–L105` |
| tool `read_file` | `server.ts:L107–L123` |
| tool `search_in_files` | `server.ts:L125–L142` |
| tool `run_command` | `server.ts:L144–L172` |
| Старт транспорта и лог `"MCP server started"` | `server.ts:L174–L180` |
| Точка входа и обработка фатальных ошибок | `server.ts:L182–L185` |
