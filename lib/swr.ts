type Hit<T> = { at: number; value: T };

export function createSWR<T>(freshMs: number, staleMs: number) {
  const store = new Map<string, Hit<T>>();
  const inflight = new Map<string, Promise<T>>();

  async function getOrLoad(key: string, nowMs: number, load: () => Promise<T>): Promise<T> {
    const hit = store.get(key);
    if (hit && nowMs - hit.at < freshMs) return hit.value;

    if (hit && nowMs - hit.at < staleMs) {
      if (!inflight.has(key)) {
        const refresh = load()
          .then((value) => {
            store.set(key, { at: Date.now(), value });
            return value;
          })
          .finally(() => inflight.delete(key));
        inflight.set(key, refresh);
      }
      return hit.value;
    }

    const pending = inflight.get(key);
    if (pending) return pending;

    const run = load()
      .then((value) => {
        store.set(key, { at: Date.now(), value });
        return value;
      })
      .finally(() => inflight.delete(key));
    inflight.set(key, run);
    return run;
  }

  return { getOrLoad, peek: (key: string) => store.get(key) };
}

export function createTtlCache<T>(ttlMs: number) {
  const store = new Map<string, Hit<T>>();
  const inflight = new Map<string, Promise<T>>();

  async function getOrLoad(key: string, nowMs: number, load: () => Promise<T>): Promise<T> {
    const hit = store.get(key);
    if (hit && nowMs - hit.at < ttlMs) return hit.value;
    const pending = inflight.get(key);
    if (pending) return pending;
    const run = load()
      .then((value) => {
        store.set(key, { at: nowMs, value });
        return value;
      })
      .finally(() => inflight.delete(key));
    inflight.set(key, run);
    return run;
  }

  return { getOrLoad };
}
