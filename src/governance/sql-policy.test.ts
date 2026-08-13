import { describe, expect, it } from "vitest";

import { assertReadOnlySql } from "./sql-policy.js";

describe("assertReadOnlySql", () => {
  it.each(["SELECT * FROM users", "WITH recent AS (SELECT 1) SELECT * FROM recent", "EXPLAIN SELECT * FROM users"])("allows %s", (sql) => {
    expect(() => assertReadOnlySql(sql)).not.toThrow();
  });

  it.each(["DELETE FROM users", "SELECT 1; DROP TABLE users", "UPDATE users SET admin = true", "CALL rotate_keys()"])("rejects %s", (sql) => {
    expect(() => assertReadOnlySql(sql)).toThrow();
  });
});
