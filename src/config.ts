import { readFile } from "node:fs/promises";
import { z } from "zod";

const configSchema = z.object({
  databaseUrlEnv: z.string().min(1).default("DATABASE_URL"),
  governance: z.object({
    allowedSchemas: z.array(z.string().min(1)).min(1),
    allowedTables: z.array(z.string().min(1)).default([]),
    maxRows: z.number().int().positive().max(10_000).default(100),
    statementTimeoutMs: z.number().int().positive().max(60_000).default(5_000)
  })
});

export type GatewayConfig = z.infer<typeof configSchema>;

export async function loadConfig(path: string): Promise<GatewayConfig> {
  const raw = await readFile(path, "utf8");
  return configSchema.parse(JSON.parse(raw));
}
