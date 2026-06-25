import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

async function main(): Promise<void> {
  const server = new Server(
    {
      name: "mcp-server",
      version: "1.0.0",
    },
    {
      capabilities: {},
    },
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error("MCP server started");
}

main().catch((error) => {
  console.error("Failed to start MCP server:", error);
  process.exit(1);
});
