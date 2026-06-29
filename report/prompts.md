# Использованные промпты

Создай структуру MCP-сервера на Node.js

Требования:
- Используй context7
- Файлы которые нужно создать:
    - server.js — главный файл сервера
    - package.json — с зависимостями
    - .env.example — PROJECT_ROOT=./
    - .gitignore — node_modules, .env
    - README.md — с пустыми разделами: Setup, Tools, How to connect to IDE

Не пиши логику инструментов — только скелет проекта.

---

В файле mcp-server/src/server.ts создай минимальный рабочий MCP-сервер.

Требования:
- Использовать @modelcontextprotocol/sdk — Server + StdioServerTransport
- Транспорт: stdio
- Сервер должен стартовать и логировать в stderr: "MCP server started"
- Добавь базовую обработку ошибок (try/catch + process.exit(1))
- Пока без инструментов — просто скелет

Логи только в stderr (console.error), не в stdout.

---

В mcp-server/src/server.ts добавь 4 инструмента через server.tool(...).

Инструменты:

1. list_files
  - Описание: "List files in a directory within the project"
  - Параметры (zod): path (string, optional, default ".")
  - Логика: читает директорию через fs, возвращает массив { name, type }
  - Ограничение: только внутри PROJECT_ROOT (проверять через path.resolve)

2. read_file
  - Описание: "Read contents of a file within the project"
  - Параметры: path (string, required)
  - Логика: читает файл через fs.readFile
  - Ограничение: только внутри PROJECT_ROOT

3. search_in_files
  - Описание: "Search for a text pattern in project files"
  - Параметры: pattern (string), directory (string, optional, default ".")
  - Логика: рекурсивный поиск вхождений строки, возвращает { file, line, content }[]

4. run_command
  - Описание: "Run a whitelisted command in the project"
  - Параметры: command (string)
  - Whitelist команд: ["npm test", "npm run lint", "npx tsc --noEmit"]
  - Логика: execSync, возвращает { stdout, stderr, exitCode }

Каждый tool:
- Логирует в stderr: имя tool, входные параметры, статус (success/error)
- Возвращает JSON-объект (не просто текст)
- Обрабатывает ошибки и возвращает { error: string } при провале

---

В mcp-server/src/server.ts добавь логирование для каждого из 4 инструментов.

Логи через console.error, формат:

[MCP] tool=<имя> params=<JSON параметров> status=success
[MCP] tool=<имя> params=<JSON параметров> status=error error=<сообщение>
Лог должен быть:
- В начале каждого tool — входные параметры
- В конце — статус success или error
- При ошибке — текст ошибки

Также при старте сервера выводить список зарегистрированных tools:

[MCP] Registered tools: list_files, read_file, search_in_files, run_lint

---

Создай файлы конфигурации для подключения MCP-сервера к IDE.

### 1. mcp-server/.cursor/mcp.json

{
"mcpServers": {
"project-helper": {
"command": "node",
"args": ["./dist/server.js"],
"cwd": "/ЗАМЕНИ/НА/АБСОЛЮТНЫЙ/ПУТЬ/mcp-server",
"env": {
"PROJECT_ROOT": "./sandbox"
}
}
}
}
### 2. mcp-server/claude_desktop_config_example.json
Аналогичная структура для Claude Desktop.

Добавь комментарий в оба файла (в README, не в JSON) — где найти абсолютный путь командой

---
Создай `mcp-server/README.md` со следующей структурой:

1. **Что это** — 2-3 предложения о проекте
2. **Установка** — 3 шага: git clone / npm install / npm run build
3. **Настройка** — как заполнить .env (скопировать .env.example, прописать PROJECT_ROOT)
4. **Подключение к IDE**
  - Cursor: 4 шага (скопировать mcp.json, заменить путь, перезапустить, проверить)
  - Claude Desktop: аналогично
5. **Инструменты** — таблица: название | описание | параметры | пример ответа
6. **Tool outputs contract** — точный формат JSON для каждого tool (success и error случай)
7. **Security** — описание ограничений (только PROJECT_ROOT, whitelist команд)
8. **Логи** — пример вывода логов сервера
9. **Ссылки на код** — заглушки вида `server.ts:L1–L50`, заполним после финальной сборки

---

Проверь весь проект mcp-server/:

1. Запусти npm run build — должно компилироваться без ошибок TypeScript
2. Запусти node dist/server.js — должно появиться в stderr:
  - [MCP] Registered tools: list_files, read_file, search_in_files, run_lint
  - [MCP] Server started
3. Найди и исправь все TypeScript ошибки не меняя логику
4. Убедись что .gitignore содержит: node_modules, dist, .env
5. Убедись что .env нигде не импортируется напрямую в коде (только process.env)

После успешной сборки — обнови ссылки на строки кода в README.md (найди реальные номера строк для каждого tool и для старта сервера).

---
