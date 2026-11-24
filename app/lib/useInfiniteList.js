"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export const PAGE_SIZE = 15;

// Infinite list: loads the first `pageSize` rows, then appends the next
// `pageSize` each time the user scrolls to the end (see <LoadMore/> in UI.js).
//
//   const { items, total, loading, loadingMore, error, hasMore, loadMore, reload } =
//     useInfiniteList({ fetcher: (page, limit) => api.getAll({ page, limit, search }), deps: [search] });
//
// - `fetcher(page, limit)` must return the axios response of a paginated endpoint
//   ({ data: { data: [...], total, totalPages } }).
// - Changing anything in `deps` (search, filters...) starts over from the first 15.
// - `reload()` refreshes what is already on screen (after a delete/edit) without
//   jumping back to the top.
export default function useInfiniteList({
  fetcher,
  deps = [],
  pageSize = PAGE_SIZE,
  enabled = true,
}) {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [hasMore, setHasMore] = useState(false);

  const pagesRef = useRef(0); // pages currently loaded
  const tokenRef = useRef(0); // bumped on every reset/reload to drop stale responses
  const busyRef = useRef(false);
  const fetcherRef = useRef(fetcher);
  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  const readPage = (res, page) => {
    const body = res?.data || {};
    const rows = Array.isArray(body.data) ? body.data : [];
    const totalPages = body.totalPages ?? (rows.length === pageSize ? page + 1 : page);
    return { rows, total: body.total ?? null, more: page < totalPages };
  };

  const dedupe = (rows) => {
    const seen = new Set();
    return rows.filter((r) => {
      const k = r?._id ?? r?.id;
      if (k === undefined) return true;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  };

  // Start over from the first page.
  const reset = useCallback(async () => {
    const token = ++tokenRef.current;
    busyRef.current = true;
    pagesRef.current = 0;
    setLoading(true);
    setLoadingMore(false);
    try {
      const res = await fetcherRef.current(1, pageSize);
      if (token !== tokenRef.current) return;
      const p = readPage(res, 1);
      setItems(dedupe(p.rows));
      setTotal(p.total);
      setHasMore(p.more);
      pagesRef.current = 1;
      setError("");
    } catch (err) {
      if (token !== tokenRef.current) return;
      console.error(err);
      setItems([]);
      setHasMore(false);
      setError("Failed to load data");
    } finally {
      if (token === tokenRef.current) {
        setLoading(false);
        busyRef.current = false;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageSize]);

  const loadMore = useCallback(async () => {
    if (busyRef.current || !hasMore) return;
    const token = tokenRef.current;
    const page = pagesRef.current + 1;
    busyRef.current = true;
    setLoadingMore(true);
    try {
      const res = await fetcherRef.current(page, pageSize);
      if (token !== tokenRef.current) return;
      const p = readPage(res, page);
      setItems((prev) => dedupe([...prev, ...p.rows]));
      if (p.total !== null) setTotal(p.total);
      setHasMore(p.more);
      pagesRef.current = page;
    } catch (err) {
      if (token !== tokenRef.current) return;
      console.error(err);
      setHasMore(false); // stop retrying in a loop; a refresh or new search starts again
      setError("Failed to load more");
    } finally {
      if (token === tokenRef.current) {
        setLoadingMore(false);
        busyRef.current = false;
      }
    }
  }, [hasMore, pageSize]);

  // Re-fetch everything already on screen (pages 1..n) and keep the scroll position.
  const reload = useCallback(async () => {
    const token = ++tokenRef.current;
    busyRef.current = true;
    const n = Math.max(1, pagesRef.current);
    try {
      let rows = [];
      let last = null;
      for (let start = 1; start <= n; start += 4) {
        const batch = [];
        for (let pg = start; pg < Math.min(n + 1, start + 4); pg++) {
          batch.push(fetcherRef.current(pg, pageSize));
        }
        const results = await Promise.all(batch);
        results.forEach((res, i) => {
          last = readPage(res, start + i);
          rows = rows.concat(last.rows);
        });
      }
      if (token !== tokenRef.current) return;
      setItems(dedupe(rows));
      setTotal(last.total);
      setHasMore(last.more);
      setError("");
    } catch (err) {
      if (token !== tokenRef.current) return;
      console.error(err);
      setError("Failed to refresh data");
    } finally {
      if (token === tokenRef.current) {
        busyRef.current = false;
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, [pageSize]);

  useEffect(() => {
    if (enabled) reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, reset, ...deps]);

  return { items, total, loading, loadingMore, error, hasMore, loadMore, reload, setItems };
}
