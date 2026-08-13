#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import { loadConfig } from "./config.js";
import { PostgresProvider } from "./db/postgres.js";
import { writeAuditEvent } from "./governance/audit.js";
import { assertReadOnlySql } from "./governance/sql-policy.js";

function textResult(value: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }] };
}

async function main(): Promise<void> {
  const configPath = process.env.MCP_DB_GATEWAY_CONFIG ?? "mcp-db-gateway.json";
  const config = await loadConfig(configPath);
  const databaseUrl = process.env[config.databaseUrlEnv];
  if (!databaseUrl) {
    throw new Error(`Missing database URL environment variable: ${config.databaseUrlEnv}`);
  }

  const provider = new PostgresProvider(databaseUrl, config);
  const server = new McpServer({ name: "mcp-db-gateway", version: "0.1.0" });

  server.registerTool("list_tables", { description: "List tables allowed by gateway policy" }, async () => {
    return textResult(await provider.listTables());
  });

  server.registerTool(
    "describe_table",
    {
      description: "Describe an allowed table without exposing row data",
      inputSchema: { schema: z.string().min(1), table: z.string().min(1) }
    },
    async ({ schema, table }) => textResult(await provider.describeTable(schema, table))
  );

  server.registerTool(
    "execute_query",
    {
      description: "Execute one read-only SQL query under gateway limits",
      inputSchema: { sql: z.string().min(1) }
    },
    async ({ sql }) => {
      const started = Date.now();
      try {
        assertReadOnlySql(sql);
        const result = await provider.executeQuery(sql);
        writeAuditEvent({ timestamp: new Date().toISOString(), tool: "execute_query", outcome: "allowed", durationMs: Date.now() - started, details: { rowCount: result.rowCount } });
        return textResult(result);
      } catch (error) {
        writeAuditEvent({ timestamp: new Date().toISOString(), tool: "execute_query", outcome: "denied", durationMs: Date.now() - started, details: { message: error instanceof Error ? error.message : "Unknown error" } });
        throw error;
      }
    }
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);

  async function shutdown(): Promise<void> {
    await provider.close();
    process.exit(0);
  }

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exit(1);
});
