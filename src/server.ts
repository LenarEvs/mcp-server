import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";
import dotenv from "dotenv";

dotenv.config();

const DEFAULT_PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PROJECT_ROOT = process.env.PROJECT_ROOT
  ? path.resolve(process.env.PROJECT_ROOT)
  : DEFAULT_PROJECT_ROOT;

const ALLOWED_COMMANDS = ["npm test", "npm run lint", "npx tsc --noEmit"];

const SEARCH_SKIP_DIRS = new Set(["node_modules", ".git", "dist"]);

const REGISTERED_TOOLS = ["list_files", "read_file", "search_in_files", "run_command"];

function resolveInProject(relativePath: string): string {
  const resolved = path.resolve(PROJECT_ROOT, relativePath);
  if (resolved !== PROJECT_ROOT && !resolved.startsWith(PROJECT_ROOT + path.sep)) {
    throw new Error(`Path "${relativePath}" is outside of the project root`);
  }
  return resolved;
}

function logToolCall(name: string, params: unknown, status: "success" | "error", error?: string): void {
  const errorPart = status === "error" ? ` error=${error}` : "";
  console.error(`[MCP] tool=${name} params=${JSON.stringify(params)} status=${status}${errorPart}`);
}

function toolResult(data: unknown, isError = false) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data) }],
    ...(isError ? { isError: true } : {}),
  };
}

interface SearchMatch {
  file: string;
  line: number;
  content: string;
}

async function searchDirectory(dir: string, pattern: string, matches: SearchMatch[]): Promise<void> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (SEARCH_SKIP_DIRS.has(entry.name)) {
      continue;
    }
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await searchDirectory(fullPath, pattern, matches);
    } else if (entry.isFile()) {
      let content: string;
      try {
        content = await fs.readFile(fullPath, "utf-8");
      } catch {
        continue;
      }
      const lines = content.split("\n");
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes(pattern)) {
          matches.push({
            file: path.relative(PROJECT_ROOT, fullPath),
            line: i + 1,
            content: lines[i],
          });
        }
      }
    }
  }
}

async function main(): Promise<void> {
  const server = new McpServer({
    name: "mcp-server",
    version: "1.0.0",
  });

  server.tool(
    "list_files",
    "List files in a directory within the project",
    { path: z.string().optional().default(".") },
    async ({ path: relativePath }) => {
      try {
        const targetDir = resolveInProject(relativePath);
        const entries = await fs.readdir(targetDir, { withFileTypes: true });
        const files = entries.map((entry) => ({
          name: entry.name,
          type: entry.isDirectory() ? "directory" : "file",
        }));
        logToolCall("list_files", { path: relativePath }, "success");
        return toolResult(files);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logToolCall("list_files", { path: relativePath }, "error", message);
        return toolResult({ error: message }, true);
      }
    },
  );

  server.tool(
    "read_file",
    "Read contents of a file within the project",
    { path: z.string() },
    async ({ path: relativePath }) => {
      try {
        const targetFile = resolveInProject(relativePath);
        const content = await fs.readFile(targetFile, "utf-8");
        logToolCall("read_file", { path: relativePath }, "success");
        return toolResult({ content });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logToolCall("read_file", { path: relativePath }, "error", message);
        return toolResult({ error: message }, true);
      }
    },
  );

  server.tool(
    "search_in_files",
    "Search for a text pattern in project files",
    { pattern: z.string(), directory: z.string().optional().default(".") },
    async ({ pattern, directory }) => {
      try {
        const targetDir = resolveInProject(directory);
        const matches: SearchMatch[] = [];
        await searchDirectory(targetDir, pattern, matches);
        logToolCall("search_in_files", { pattern, directory }, "success");
        return toolResult(matches);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logToolCall("search_in_files", { pattern, directory }, "error", message);
        return toolResult({ error: message }, true);
      }
    },
  );

  server.tool(
    "run_command",
    "Run a whitelisted command in the project",
    { command: z.string() },
    async ({ command }) => {
      try {
        if (!ALLOWED_COMMANDS.includes(command)) {
          throw new Error(`Command "${command}" is not whitelisted`);
        }
        let stdout = "";
        let stderr = "";
        let exitCode = 0;
        try {
          stdout = execSync(command, { cwd: PROJECT_ROOT, encoding: "utf-8" });
        } catch (execError) {
          const err = execError as { stdout?: string; stderr?: string; status?: number };
          stdout = err.stdout ?? "";
          stderr = err.stderr ?? "";
          exitCode = err.status ?? 1;
        }
        logToolCall("run_command", { command }, "success");
        return toolResult({ stdout, stderr, exitCode });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logToolCall("run_command", { command }, "error", message);
        return toolResult({ error: message }, true);
      }
    },
  );

  console.error(`[MCP] Registered tools: ${REGISTERED_TOOLS.join(", ")}`);

  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error("MCP server started");
}

main().catch((error) => {
  console.error("Failed to start MCP server:", error);
  process.exit(1);
});
