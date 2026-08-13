export type AuditEvent = {
  timestamp: string;
  tool: string;
  outcome: "allowed" | "denied" | "error";
  durationMs: number;
  details?: Record<string, unknown>;
};

export function writeAuditEvent(event: AuditEvent): void {
  process.stderr.write(`${JSON.stringify({ type: "mcp-db-gateway.audit", ...event })}\n`);
}
