"use client";

import { useRef, useState, useLayoutEffect, useEffect, useCallback } from "react";

// Size a list's page so the rows exactly fill the card: measures the card's
// height and the real height of a rendered row, then returns how many rows fit
// (rounded up so no empty strip is left under the last row).
//
// Usage:
//   const { ref, pageSize } = useFitRows({ deps: [items], resetKey: tab });
//   <ListPanel panelRef={ref}> ... <table><thead/><tbody><tr/>…
// Elements with data-fit="fixed" (toolbar, pagination bar) are subtracted.
const FALLBACK_ROW = 56; // px, used until a real row has been rendered
const FALLBACK_HEAD = 44;
const PAGER = 49; // reserved for the pagination bar so page counts don't loop

export default function useFitRows({
  deps = [],
  resetKey,
  min = 5,
  max = 50,
  initial = 10,
} = {}) {
  const ref = useRef(null);
  const rowH = useRef(null);
  const headH = useRef(null);
  const [pageSize, setPageSize] = useState(initial);
  const [ready, setReady] = useState(false);

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;

    if (rowH.current == null) {
      const rows = Array.from(el.querySelectorAll("tbody > tr"))
        .map((r) => r.offsetHeight)
        .filter((h) => h > 0)
        .sort((a, b) => a - b);
      if (rows.length) rowH.current = rows[Math.floor(rows.length / 2)];
      const th = el.querySelector("thead");
      if (th && th.offsetHeight) headH.current = th.offsetHeight;
    }

    let fixed = 0;
    el.querySelectorAll('[data-fit="fixed"]').forEach((n) => {
      fixed += n.offsetHeight;
    });
    const avail = el.clientHeight - fixed - PAGER - (headH.current ?? FALLBACK_HEAD);
    if (avail <= 0) return;
    const n = Math.ceil(avail / (rowH.current ?? FALLBACK_ROW));
    const next = Math.min(max, Math.max(min, n));
    setPageSize((cur) => (cur === next ? cur : next));
    setReady(true);
  }, [min, max]);

  // New content shape (e.g. tab switch) → forget cached row/head heights.
  useLayoutEffect(() => {
    rowH.current = null;
    headH.current = null;
  }, [resetKey]);

  // Re-measure when the card is resized (window resize, banners appearing...).
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(el);
    return () => ro.disconnect();
  }, [measure]);

  // After rows render, refine using their real height.
  useLayoutEffect(() => {
    measure();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [measure, resetKey, ...deps]);

  // `ready` flips once the first measurement is done — gate the first fetch on
  // it so the list is not requested twice (default size, then measured size).
  return { ref, pageSize, ready };
}
