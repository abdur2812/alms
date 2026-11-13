const jwt = require("jsonwebtoken");

// --- Config (read lazily so the env can be edited + pm2 restarted) ---
const getSecret = () => process.env.JWT_SECRET || "";
const secretIsUsable = () => getSecret().length >= 32;
const getExpiry = () => process.env.JWT_EXPIRES_IN || "12h";

function signToken(payload) {
  return jwt.sign(payload, getSecret(), { algorithm: "HS256", expiresIn: getExpiry() });
}

function readBearer(req) {
  const header = req.headers.authorization || "";
  const m = /^Bearer\s+(.+)$/i.exec(header);
  return m ? m[1].trim() : null;
}

// Returns the verified payload, or null. Never throws.
function verifyRequest(req) {
  if (!secretIsUsable()) return null;
  const token = readBearer(req);
  if (!token) return null;
  try {
    return jwt.verify(token, getSecret(), { algorithms: ["HS256"] });
  } catch (_) {
    return null;
  }
}

function attachUser(req, payload) {
  req.user = { id: payload.sub, email: payload.email };
}

// Gate for all /api routes: a missing, invalid or expired token gets 401 and nothing else runs.
const requireAuth = (req, res, next) => {
  if (req.method === "OPTIONS") return next(); // CORS preflight carries no token
  const payload = verifyRequest(req);
  if (!payload) return res.status(401).json({ success: false, message: "Authentication required" });
  attachUser(req, payload);
  next();
};

// Used by /api/auth/me.
const authenticate = (req, res, next) => {
  const payload = verifyRequest(req);
  if (!payload) return res.status(401).json({ success: false, message: "Authentication required" });
  attachUser(req, payload);
  next();
};

// Logged once at startup so misconfiguration is visible in pm2 logs.
function logAuthStatus() {
  const hasAdmin = !!(process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD_HASH);
  const secretOk = secretIsUsable();
  console.log(`[auth] login ${hasAdmin ? "configured" : "NOT configured"}, secret ${secretOk ? "ok" : "MISSING or too short (need 32+ chars)"}`);
  if (!hasAdmin || !secretOk) {
    console.error("[auth] Login is not set up: every /api request will be rejected (401). Run: node scripts/setup-auth.js");
  }
}

module.exports = {
  requireAuth,
  authenticate,
  verifyRequest,
  signToken,
  secretIsUsable,
  getExpiry,
  logAuthStatus,
};
