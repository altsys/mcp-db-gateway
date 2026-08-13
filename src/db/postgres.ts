import pg from "pg";

import type { GatewayConfig } from "../config.js";

const { Pool } = pg;

export class PostgresProvider {
  private readonly pool: pg.Pool;

  public constructor(databaseUrl: string, private readonly config: GatewayConfig) {
    this.pool = new Pool({ connectionString: databaseUrl });
  }

  public async listTables(): Promise<unknown[]> {
    const result = await this.pool.query(
      `SELECT table_schema, table_name
       FROM information_schema.tables
       WHERE table_type = 'BASE TABLE'
         AND table_schema = ANY($1::text[])
       ORDER BY table_schema, table_name`,
      [this.config.governance.allowedSchemas]
    );

    return result.rows.filter((row) => this.isTableAllowed(row.table_schema, row.table_name));
  }

  public async describeTable(schema: string, table: string): Promise<unknown[]> {
    this.assertTableAllowed(schema, table);
    const result = await this.pool.query(
      `SELECT column_name, data_type, is_nullable
       FROM information_schema.columns
       WHERE table_schema = $1 AND table_name = $2
       ORDER BY ordinal_position`,
      [schema, table]
    );
    return result.rows;
  }

  public async executeQuery(sql: string): Promise<{ rows: unknown[]; rowCount: number }> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN READ ONLY");
      await client.query(`SET LOCAL statement_timeout = ${this.config.governance.statementTimeoutMs}`);
      const result = await client.query(sql);
      await client.query("ROLLBACK");
      const rows = result.rows.slice(0, this.config.governance.maxRows);
      return { rows, rowCount: rows.length };
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }

  public async close(): Promise<void> {
    await this.pool.end();
  }

  private isTableAllowed(schema: string, table: string): boolean {
    const allowlist = this.config.governance.allowedTables;
    return allowlist.length === 0 || allowlist.includes(`${schema}.${table}`);
  }

  private assertTableAllowed(schema: string, table: string): void {
    if (!this.config.governance.allowedSchemas.includes(schema) || !this.isTableAllowed(schema, table)) {
      throw new Error(`Table ${schema}.${table} is not allowed by the gateway policy.`);
    }
  }
}
