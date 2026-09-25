// HTTP contracts validate IDs first; adapters also guard non-HTTP callers from a
// PostgreSQL cast error and treat a malformed ID as an absent row.
export const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
