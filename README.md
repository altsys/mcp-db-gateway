# MCP DB Gateway

**Governed database access for AI agents.**

MCP DB Gateway sits between MCP clients and your database. It gives agents enough context to work while keeping database access narrow, read-only, limited, and auditable.

The goal is not another universal SQL connector. The goal is a practical governance boundary for tools such as Cursor, Claude Code, and Claude Desktop.

> Early-stage software. Do not treat v0.1 as a complete security boundary without reviewing it for your environment.

## Why this exists

Giving an AI agent a database connection creates two opposing problems:

- Too little access forces developers to paste schemas and data into prompts.
- Too much access lets an agent explore or expose far more than the task requires.

MCP DB Gateway makes that boundary explicit through allowlists, read-only transactions, query limits, and audit events.

## v0.1 scope

- PostgreSQL
- MCP over stdio
- `list_tables`
- `describe_table`
- `execute_query`
- Schema and table allowlists
- Read-only SQL validation and transactions
- Row and statement-timeout limits
- JSON audit events written to stderr

MySQL, SQLite, PII masking, role-based access, and a remote gateway are intentionally deferred.

## Quick start

Requirements: Node.js 20+ and PostgreSQL.

```bash
git clone https://github.com/altsys/mcp-db-gateway.git
cd mcp-db-gateway
npm install
cp mcp-db-gateway.example.json mcp-db-gateway.json
```

Edit `mcp-db-gateway.json` so it contains only the schemas and tables the agent needs. Then build and run:

```bash
export DATABASE_URL="postgresql://user:password@localhost:5432/database"
npm run build
MCP_DB_GATEWAY_CONFIG=./mcp-db-gateway.json node dist/index.js
```

Example MCP client configuration:

```json
{
  "mcpServers": {
    "database": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-db-gateway/dist/index.js"],
      "env": {
        "DATABASE_URL": "postgresql://user:password@localhost:5432/database",
        "MCP_DB_GATEWAY_CONFIG": "/absolute/path/to/mcp-db-gateway/mcp-db-gateway.json"
      }
    }
  }
}
```

## Configuration

```json
{
  "databaseUrlEnv": "DATABASE_URL",
  "governance": {
    "allowedSchemas": ["public"],
    "allowedTables": ["public.customers", "public.orders"],
    "maxRows": 100,
    "statementTimeoutMs": 5000
  }
}
```

An empty `allowedTables` array permits every table inside `allowedSchemas`. For a real deployment, prefer an explicit table allowlist.

## Security model

The gateway provides defense in depth, not magic. Use a dedicated PostgreSQL role with `SELECT` access only. The application also validates SQL, opens a read-only transaction, limits execution time, and caps returned rows.

SQL parsing is deliberately conservative in v0.1. A proper PostgreSQL parser and table-level query enforcement belong on the near-term roadmap.

## Roadmap

- [ ] Enforce table policy inside arbitrary SQL queries
- [ ] Replace conservative string validation with an AST-based PostgreSQL policy engine
- [ ] Mask configured PII columns
- [ ] Add structured file or HTTP audit sinks
- [ ] Add MySQL and SQLite adapters behind a shared provider interface
- [ ] Add named context packs for task-specific access
- [ ] Add RBAC and remote transport

## Contributing

Issues and focused pull requests are welcome. Please keep changes aligned with the central idea: agents should receive the least database access necessary to complete the task.

## License

MIT
