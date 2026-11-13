const bcrypt = require("bcryptjs");
const { asyncHandler } = require("../middleware/errorHandler");
const { signToken, secretIsUsable, getExpiry } = require("../middleware/auth");

const ADMIN_NAME = "Al Ms Admin";

// --- Brute-force protection: 5 failed logins per IP => locked for 15 minutes ---
const MAX_FAILS = 5;
const LOCK_MS = 15 * 60 * 1000;
const FAIL_WINDOW_MS = 15 * 60 * 1000;
const attempts = new Map(); // ip -> { count, first, lockedUntil }

setInterval(() => {
  const now = Date.now();
  for (const [ip, a] of attempts) {
    if (a.lockedUntil < now && now - a.first > FAIL_WINDOW_MS) attempts.delete(ip);
  }
}, 60_000).unref();

// Compared against when the email is wrong, so response time doesn't reveal whether the email exists.
const DUMMY_HASH = bcrypt.hashSync("not-the-password", 12);

const invalid = (res) =>
  res.status(401).json({ success: false, message: "Invalid email or password" });

exports.login = asyncHandler(async (req, res) => {
  const adminEmail = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  const adminHash = process.env.ADMIN_PASSWORD_HASH || "";
  if (!adminEmail || !adminHash || !secretIsUsable()) {
    return res.status(503).json({ success: false, message: "Login is not configured on the server" });
  }

  const ip = req.ip || "unknown";
  const now = Date.now();
  let rec = attempts.get(ip);
  if (rec && rec.lockedUntil > now) {
    res.set("Retry-After", String(Math.ceil((rec.lockedUntil - now) / 1000)));
    return res.status(429).json({
      success: false,
      message: "Too many failed attempts. Try again in a few minutes.",
    });
  }

  const { email, password } = req.body || {};
  if (typeof email !== "string" || typeof password !== "string" || !email || !password || password.length > 256) {
    return invalid(res);
  }

  const emailOk = email.trim().toLowerCase() === adminEmail;
  const passwordOk = await bcrypt.compare(password, emailOk ? adminHash : DUMMY_HASH);

  if (!(emailOk && passwordOk)) {
    if (!rec || now - rec.first > FAIL_WINDOW_MS) rec = { count: 0, first: now, lockedUntil: 0 };
    rec.count += 1;
    if (rec.count >= MAX_FAILS) rec.lockedUntil = now + LOCK_MS;
    attempts.set(ip, rec);
    return invalid(res);
  }

  attempts.delete(ip);
  const token = signToken({ sub: "admin", email: adminEmail });
  res.json({
    success: true,
    token,
    expiresIn: getExpiry(),
    user: { id: "admin", email: adminEmail, name: ADMIN_NAME },
  });
});

exports.me = (req, res) => {
  res.json({
    success: true,
    user: { id: req.user.id, email: req.user.email, name: ADMIN_NAME },
  });
};
