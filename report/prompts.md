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

