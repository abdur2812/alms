/**
 * Shared helpers for safe, memory-efficient queries on a 512 MB + Free Tier setup.
 * - Pagination is hard-capped to avoid OOM from limit=100000.
 * - Lean + projections used wherever possible.
 * - O(1) / O(n) aware helpers for batch de-duplication.
 */

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50; // hard cap for list endpoints
const MAX_EXPORT_LIMIT = 5000; // allow larger for explicit export routes
const ABSOLUTE_MAX_LIMIT = 5000;

function toInt(value, fallback) {
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Parse page/limit safely and clamp to MAX_LIMIT.
 * For export routes set allowLarge=true to allow up to 5000.
 */
function parsePagination(query, opts = {}) {
  const allowLarge = !!opts.allowLarge;
  const cap = allowLarge ? MAX_EXPORT_LIMIT : MAX_LIMIT;
  let page = toInt(query.page, DEFAULT_PAGE);
  let limit = toInt(query.limit, opts.defaultLimit ?? DEFAULT_LIMIT);
  if (page < 1 || !Number.isFinite(page)) page = 1;
  if (limit < 1 || !Number.isFinite(limit)) limit = opts.defaultLimit ?? DEFAULT_LIMIT;
  if (limit > cap) limit = cap;
  // Also cap page to avoid huge skip (skip = (page-1)*limit)
  // 10k pages * 50 = 500k skip would still scan; cap at 1000 pages
  if (page > 1000) page = 1000;
  const skip = (page - 1) * limit;
  return { page, limit, skip, cap };
}

/**
 * Build an inclusive Date range object for Mongo queries.
 * Returns null if neither bound is valid.
 */
function buildDateRange(startDate, endDate, field = "createdAt") {
  const range = {};
  if (startDate) {
    const s = new Date(startDate);
    if (!isNaN(s.getTime())) range.$gte = s;
  }
  if (endDate) {
    const e = new Date(endDate);
    if (!isNaN(e.getTime())) {
      // inclusive end-of-day if input is YYYY-MM-DD (no time)
      if (typeof endDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
        e.setHours(23, 59, 59, 999);
      }
      range.$lte = e;
    }
  }
  if (Object.keys(range).length === 0) return null;
  return { [field]: range };
}

function escapeRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

module.exports = {
  parsePagination,
  buildDateRange,
  escapeRegex,
  MAX_LIMIT,
  MAX_EXPORT_LIMIT,
  ABSOLUTE_MAX_LIMIT,
};
