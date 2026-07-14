import type { SupabaseClient } from "@supabase/supabase-js";

/** In-memory PostgREST stub — just the chains src/server/audit + grid use.
 * Lives outside *.test.ts so vitest doesn't treat it as a suite. */

export type Row = Record<string, unknown>;

export class MiniQuery {
  private filters: Array<[string, unknown]> = [];
  private inFilters: Array<[string, unknown[]]> = [];
  private op: "select" | "insert" | "update" | "upsert" | "delete" = "select";
  private payload: Row | Row[] | null = null;
  private wantSingle = false;
  private conflictKeys: string[] | null = null;
  private orderBy: { col: string; ascending: boolean } | null = null;

  private wantCount = false;

  constructor(private table: Row[], private genId: () => string) {}

  select(_cols?: string, opts?: { count?: string; head?: boolean }) {
    if (opts?.count) this.wantCount = true;
    return this;
  }
  insert(payload: Row | Row[]) {
    this.op = "insert";
    this.payload = payload;
    return this;
  }
  update(payload: Row) {
    this.op = "update";
    this.payload = payload;
    return this;
  }
  upsert(payload: Row | Row[], opts?: { onConflict?: string }) {
    this.op = "upsert";
    this.payload = payload;
    this.conflictKeys = opts?.onConflict?.split(",").map((s) => s.trim()) ?? null;
    return this;
  }
  delete() {
    this.op = "delete";
    return this;
  }
  eq(col: string, value: unknown) {
    this.filters.push([col, value]);
    return this;
  }
  in(col: string, values: unknown[]) {
    this.inFilters.push([col, values]);
    return this;
  }
  gte() {
    return this;
  }
  lt() {
    return this;
  }
  order(col?: string, opts?: { ascending?: boolean }) {
    if (col) this.orderBy = { col, ascending: opts?.ascending !== false };
    return this;
  }
  limit() {
    return this;
  }
  single() {
    this.wantSingle = true;
    return this;
  }
  maybeSingle() {
    this.wantSingle = true;
    return this;
  }

  private matches(row: Row): boolean {
    return (
      this.filters.every(([col, value]) => row[col] === value) &&
      this.inFilters.every(([col, values]) => values.includes(row[col]))
    );
  }

  private execute(): {
    data: unknown;
    error: { code?: string; message: string } | null;
    count?: number;
  } {
    if (this.op === "select") {
      let rows = this.table.filter((r) => this.matches(r));
      if (this.orderBy) {
        const { col, ascending } = this.orderBy;
        rows = [...rows].sort((a, b) => {
          const av = String(a[col] ?? "");
          const bv = String(b[col] ?? "");
          return ascending ? av.localeCompare(bv) : bv.localeCompare(av);
        });
      }
      return {
        data: this.wantSingle ? (rows[0] ?? null) : rows,
        error: null,
        count: this.wantCount ? rows.length : undefined,
      };
    }
    if (this.op === "insert") {
      const rows = (Array.isArray(this.payload) ? this.payload : [this.payload]) as Row[];
      const inserted = rows.map((r) => ({ id: this.genId(), ...r }));
      this.table.push(...inserted);
      return { data: this.wantSingle ? inserted[0] : inserted, error: null };
    }
    if (this.op === "update") {
      const rows = this.table.filter((r) => this.matches(r));
      rows.forEach((r) => Object.assign(r, this.payload));
      return { data: this.wantSingle ? (rows[0] ?? null) : rows, error: null };
    }
    if (this.op === "upsert") {
      const rows = (Array.isArray(this.payload) ? this.payload : [this.payload]) as Row[];
      const results: Row[] = [];
      for (const r of rows) {
        const keys = this.conflictKeys;
        const existing = keys
          ? this.table.find((t) => keys.every((k) => t[k] === r[k] && r[k] != null))
          : undefined;
        if (existing) {
          Object.assign(existing, r);
          results.push(existing);
        } else {
          const inserted = { id: this.genId(), ...r };
          this.table.push(inserted);
          results.push(inserted);
        }
      }
      return { data: this.wantSingle ? results[0] : results, error: null };
    }
    for (let i = this.table.length - 1; i >= 0; i--) {
      if (this.matches(this.table[i])) this.table.splice(i, 1);
    }
    return { data: null, error: null };
  }

  then<T>(
    resolve: (v: { data: unknown; error: unknown; count?: number }) => T
  ): Promise<T> {
    return Promise.resolve(this.execute()).then(resolve);
  }
}

export function miniDb(tableNames: string[]) {
  let seq = 0;
  const genId = () =>
    `00000000-0000-4000-8000-${String(++seq).padStart(12, "0")}`;
  const tables: Record<string, Row[]> = {};
  for (const name of tableNames) tables[name] = [];
  const client = {
    from(name: string) {
      if (!tables[name]) throw new Error(`mini-db: unknown table ${name}`);
      return new MiniQuery(tables[name], genId);
    },
  };
  return { client: client as unknown as SupabaseClient, tables };
}

export const AUDIT_TABLES = [
  "businesses",
  "audits",
  "audit_scores",
  "reviews_cache",
  "posts_cache",
  "website_audits",
];

export const GRID_TABLES = ["businesses", "grid_scans", "grid_points"];
