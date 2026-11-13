#!/usr/bin/env node
/*
 * Sets up login for the API by editing backend/.env in place.
 *
 *   node scripts/setup-auth.js                  asks: admin email, password, allowed website addresses
 *   node scripts/setup-auth.js --rotate-secret  same, plus a NEW JWT_SECRET (logs everyone out)
 *   node scripts/setup-auth.js --cors=<list>    only change the allowed website addresses (comma-separated)
 *
 * The password is typed hidden, only its bcrypt hash is written, and no secret is ever printed.
 * Restart afterwards:  pm2 restart alms
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const readline = require("readline");
const bcrypt = require("bcryptjs");

const ENV_PATH = path.join(__dirname, "..", ".env");
const args = process.argv.slice(2);
const flag = (name) => {
  const hit = args.find((a) => a === `--${name}` || a.startsWith(`--${name}=`));
  if (!hit) return undefined;
  return hit.includes("=") ? hit.slice(hit.indexOf("=") + 1) : true;
};

function readEnv() {
  return fs.existsSync(ENV_PATH) ? fs.readFileSync(ENV_PATH, "utf8") : "";
}

function getKey(text, key) {
  const m = new RegExp(`^${key}=(.*)$`, "m").exec(text);
  if (!m) return "";
  return m[1].trim().replace(/^['"]|['"]$/g, "");
}

function setKeys(updates) {
  let text = readEnv();
  if (text && !text.endsWith("\n")) text += "\n";
  for (const [key, value] of Object.entries(updates)) {
    const line = `${key}=${value}`;
    const re = new RegExp(`^${key}=.*$`, "m");
    text = re.test(text) ? text.replace(re, () => line) : text + line + "\n";
  }
  fs.writeFileSync(ENV_PATH, text, { mode: 0o600 });
  fs.chmodSync(ENV_PATH, 0o600);
}

async function main() {
  const cors = flag("cors");

  // ---- small, prompt-free update ----
  if (cors !== undefined) {
    if (cors === true || !String(cors).trim()) throw new Error("--cors needs a value, e.g. --cors=https://my-app.vercel.app");
    setKeys({ CORS_ORIGIN: String(cors).trim() });
    console.log("Updated in .env: CORS_ORIGIN");
    console.log("Now run: pm2 restart alms");
    return;
  }

  // ---- full setup ----
  const interactive = process.stdin.isTTY;
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: !!interactive });
  const lines = rl[Symbol.asyncIterator]();
  let muted = false;
  const origWrite = rl._writeToOutput;
  rl._writeToOutput = function (s) {
    if (!muted) origWrite.call(rl, s);
  };
  const ask = async (prompt, hidden = false) => {
    process.stdout.write(prompt);
    muted = hidden;
    const { value, done } = await lines.next();
    muted = false;
    if (hidden) process.stdout.write("\n");
    if (done) throw new Error("No input received");
    return String(value);
  };

  const existing = readEnv();
  const email = (await ask("Admin email (you will log in with this): ")).trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error("That does not look like an email address.");

  const pw1 = await ask("New admin password (min 6 characters): ", true);
  if (pw1.length < 6) throw new Error("Password must be at least 6 characters.");
  if (pw1.length > 72) throw new Error("Password must be at most 72 characters.");
  const pw2 = await ask("Type it again: ", true);
  const originsAnswer = (
    await ask("Your website address(es), comma-separated (e.g. https://my-app.vercel.app) - Enter to skip: ")
  ).trim();
  rl.close();
  if (pw1 !== pw2) throw new Error("Passwords did not match. Nothing was changed.");

  process.stdout.write("Hashing...\n");
  const hash = await bcrypt.hash(pw1, 12);

  const updates = {
    ADMIN_EMAIL: email,
    ADMIN_PASSWORD_HASH: `'${hash}'`, // single quotes: the hash contains "$"
  };
  if (originsAnswer) {
    // http://localhost:3001 is always allowed so your local frontend can use the hosted server
    const list = originsAnswer.split(",").map((o) => o.trim().replace(/\/+$/, "")).filter(Boolean);
    if (!list.includes("http://localhost:3001")) list.push("http://localhost:3001");
    updates.CORS_ORIGIN = list.join(",");
  }
  const keepSecret = getKey(existing, "JWT_SECRET").length >= 32 && !flag("rotate-secret");
  if (!keepSecret) updates.JWT_SECRET = crypto.randomBytes(48).toString("hex");

  setKeys(updates);
  console.log("\nSaved to .env:", Object.keys(updates).join(", "));
  console.log(keepSecret ? "(kept your existing JWT_SECRET)" : "(generated a new JWT_SECRET)");
  console.log("File permissions set to 600.");
  console.log("\nNext: pm2 restart alms");
}

main().catch((err) => {
  console.error("\nError:", err.message);
  process.exit(1);
});
