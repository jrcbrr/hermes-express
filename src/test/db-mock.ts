// Test helper: a stand-in for Drizzle. Any chain of query calls resolves to the
// rows queued for it, and writes are recorded so tests can check them.

/** Every method returns the chain again; awaiting it gives `rows`. */
export function chainable(rows: unknown[]): unknown {
  const chain: unknown = new Proxy(() => undefined, {
    get: (_target, prop) =>
      prop === "then"
        ? (resolve: (value: unknown[]) => void) => resolve(rows)
        : () => chain,
  });
  return chain;
}

export function mockDb() {
  const state = {
    /** One list of rows per select, in call order. */
    selects: [] as unknown[][],
    updateRows: [{ id: "updated" }] as unknown[],
    insertRows: [{ id: "inserted" }] as unknown[],
    sets: [] as Record<string, unknown>[],
    inserted: [] as Record<string, unknown>[],
    deleteRows: [{ id: "deleted" }] as unknown[],
    executeRows: [{ id: "executed" }] as unknown[],
    executed: [] as unknown[],
  };
  const db = {
    delete: () => chainable(state.deleteRows),
    execute: async (query: unknown) => {
      state.executed.push(query);
      return { rows: state.executeRows };
    },
    select: () => chainable(state.selects.shift() ?? []),
    update: () => ({
      set: (values: Record<string, unknown>) => {
        state.sets.push(values);
        return chainable(state.updateRows);
      },
    }),
    insert: () => ({
      values: (values: Record<string, unknown>) => {
        state.inserted.push(values);
        return chainable(state.insertRows);
      },
    }),
  };
  const reset = () => {
    state.selects = [];
    state.updateRows = [{ id: "updated" }];
    state.insertRows = [{ id: "inserted" }];
    state.sets = [];
    state.inserted = [];
    state.deleteRows = [{ id: "deleted" }];
    state.executeRows = [{ id: "executed" }];
    state.executed = [];
  };
  return { db, state, reset };
}

/** A FormData from plain fields; arrays become repeated fields. */
export function form(fields: Record<string, string | string[]>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    for (const item of Array.isArray(value) ? value : [value]) {
      data.append(key, item);
    }
  }
  return data;
}
