// Request-hardening middleware: headers, CORS allow-list, origin guard, write rate limit,
// Mongo-operator rejection and an audit log of write/blocked requests.

// ---- Security headers ----
function securityHeaders(req, res, next) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  next();
}

// ---- CORS allow-list ----
// CORS_ORIGIN = comma-separated origins (e.g. https://my-app.vercel.app).
// Unset or "*"  => allow any origin (old behaviour; origin guard is off).
function getAllowedOrigins() {
  const raw = (process.env.CORS_ORIGIN || "").trim();
  if (!raw || raw === "*") return null;
  const list = raw
    .split(",")
    .map((s) => s.trim().replace(/\/+$/, ""))
    .filter(Boolean);
  if (process.env.NODE_ENV !== "production") list.push("http://localhost:3001", "http://localhost:3000");
  return list;
}

const corsOrigin = (origin, cb) => {
  const allowed = getAllowedOrigins();
  if (!origin || !allowed) return cb(null, true); // non-browser clients send no Origin; auth covers them
  cb(null, allowed.includes(origin));
};

// Browsers always send Origin on cross-origin calls. Refuse anything outside the allow-list
// (e.g. someone running the frontend from localhost against the live API).
function originGuard(req, res, next) {
  const allowed = getAllowedOrigins();
  const origin = req.headers.origin;
  if (allowed && origin && !allowed.includes(origin)) {
    return res.status(403).json({ success: false, message: "Origin not allowed" });
  }
  next();
}

// ---- Stricter limit for write requests: 120/min per IP ----
const WRITE_WINDOW_MS = 60_000;
const WRITE_MAX = 120;
const writeMap = new Map();
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of writeMap) if (now - v.start > WRITE_WINDOW_MS) writeMap.delete(k);
}, WRITE_WINDOW_MS).unref();

function writeLimiter(req, res, next) {
  if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") return next();
  const ip = req.ip || "unknown";
  const now = Date.now();
  let entry = writeMap.get(ip);
  if (!entry || now - entry.start > WRITE_WINDOW_MS) {
    entry = { start: now, count: 0 };
    writeMap.set(ip, entry);
  }
  entry.count += 1;
  if (entry.count > WRITE_MAX) {
    return res.status(429).json({ success: false, message: "Too many write requests, please slow down" });
  }
  next();
}

// ---- Reject MongoDB operator keys ("$ne", "$gt", ...) anywhere in the JSON body ----
function hasOperatorKey(value, depth = 0) {
  if (depth > 20) return true; // absurdly deep payload
  if (Array.isArray(value)) return value.some((v) => hasOperatorKey(v, depth + 1));
  if (value && typeof value === "object") {
    for (const key of Object.keys(value)) {
      if (key.startsWith("$")) return true;
      if (hasOperatorKey(value[key], depth + 1)) return true;
    }
  }
  return false;
}

function rejectOperators(req, res, next) {
  if (req.body && hasOperatorKey(req.body)) {
    return res.status(400).json({ success: false, message: "Invalid request body" });
  }
  next();
}

// ---- Audit log: every write, plus anything that was refused (401/403/429) ----
function auditLog(req, res, next) {
  res.on("finish", () => {
    const isWrite = !["GET", "HEAD", "OPTIONS"].includes(req.method);
    const refused = res.statusCode === 401 || res.statusCode === 403 || res.statusCode === 429;
    if (!isWrite && !refused) return;
    const path = (req.originalUrl || req.url || "").split("?")[0];
    const ua = String(req.headers["user-agent"] || "-").slice(0, 100);
    const origin = req.headers.origin || "-";
    console.log(
      `[audit] ${new Date().toISOString()} ip=${req.ip} ${req.method} ${path} ${res.statusCode} ` +
        `user=${req.user ? req.user.email : "anon"} origin=${origin} ua="${ua}"`
    );
  });
  next();
}

module.exports = {
  securityHeaders,
  corsOrigin,
  originGuard,
  writeLimiter,
  rejectOperators,
  auditLog,
  getAllowedOrigins,
};
