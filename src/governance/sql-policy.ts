const READ_ONLY_START = /^(select|with|explain\s+(analyze\s+)?select)\b/i;
const FORBIDDEN = /\b(insert|update|delete|merge|alter|drop|truncate|create|grant|revoke|copy|call|do|vacuum|refresh|reindex|cluster)\b/i;

export function assertReadOnlySql(sql: string): void {
  const normalized = sql.trim().replace(/;+\s*$/, "");

  if (!READ_ONLY_START.test(normalized) || FORBIDDEN.test(normalized)) {
    throw new Error("Only read-only SELECT, WITH, and EXPLAIN SELECT statements are allowed.");
  }

  if (normalized.includes(";")) {
    throw new Error("Only one SQL statement is allowed per request.");
  }
}
