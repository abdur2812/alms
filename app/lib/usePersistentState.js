"use client";

import { useState, useCallback } from "react";

// Module-level store: lives for the lifetime of the page (client-side
// navigations keep it), and is wiped on a browser reload.
const store = new Map();

// useState that survives client-side navigation (e.g. list -> edit -> back)
// so users return to the page/filters they left. A browser reload resets it.
export default function usePersistentState(key, initial) {
  const [value, setValue] = useState(() =>
    store.has(key) ? store.get(key) : initial,
  );

  const set = useCallback(
    (next) => {
      setValue((prev) => {
        const resolved = typeof next === "function" ? next(prev) : next;
        store.set(key, resolved);
        return resolved;
      });
    },
    [key],
  );

  return [value, set];
}
