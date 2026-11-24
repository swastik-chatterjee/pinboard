import { createHash, createHmac, scryptSync, timingSafeEqual } from "node:crypto";
import { snap } from "./snap";

export { snap };
export const gridKey = (lat: number, lng: number) => `${lat}:${lng}`;
export const pepper = () => process.env.TOKEN_PEPPER ?? "dev-pepper-change-me";
export const sha = (s: string) => createHash("sha256").update(pepper() + s).digest("hex");

/** 128 bits of CSPRNG entropy, hex encoded. Shown once, stored only as a hash. */
export function newSecret() {
  const b = new Uint8Array(16);
  crypto.getRandomValues(b);
  return Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
}

const BAD = ["kill", "stab", "nigg", "fuck", "shit", "bitch", "cunt", "rape", "slut", "whore", "fag"];
const norm = (s: string) => s.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
export const hasBadWord = (s: string) => BAD.some((w) => norm(s).includes(w));

/** Returns a friendly error string, or null if the text is fine. */
export function checkText(message: string, firstName: string): string | null {
  if (/https?:|www\.|\w\.(com|in|org|net|io)\b/i.test(message)) return "Links aren't allowed here. Describe the kindness in words instead.";
  if (hasBadWord(message) || hasBadWord(firstName)) return "That doesn't sound very kind. Try rewording it.";
  const chars = [...message];
  const counts = new Map<string, number>();
  for (const c of chars) counts.set(c, (counts.get(c) ?? 0) + 1);
  const top = Math.max(...counts.values());
  const emoji = chars.filter((c) => /\p{Extended_Pictographic}/u.test(c));
  const emojiTop = emoji.length ? Math.max(...[...new Set(emoji)].map((e) => emoji.filter((x) => x === e).length)) : 0;
  if (top / chars.length > 0.6 || emojiTop / chars.length > 0.3) return "Please mix up the message a little. Too many repeated characters.";
  return null;
}

export const buckets = (d = new Date()) => {
  const p = (n: number) => String(n).padStart(2, "0");
  const day = `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}`;
  return { hour: day + p(d.getUTCHours()), day };
};

// Moderation: MOD_PASSPHRASE_HASH is "salt:hexhash" (see README); the session is a signed, expiring cookie value.
export function verifyPassphrase(pass: string) {
  const [salt, hash] = (process.env.MOD_PASSPHRASE_HASH ?? "").split(":");
  if (!salt || !hash) return false;
  const a = scryptSync(pass, salt, 32), b = Buffer.from(hash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}
const sign = (t: string) => createHmac("sha256", pepper()).update("mod:" + t).digest("hex");
export const makeModSession = () => { const t = String(Date.now()); return `${t}.${sign(t)}`; };
export function validModSession(v?: string) {
  const [t, sig] = (v ?? "").split(".");
  if (!t || !sig || Date.now() - Number(t) > 60 * 60 * 1000) return false;
  const a = Buffer.from(sig), b = Buffer.from(sign(t));
  return a.length === b.length && timingSafeEqual(a, b);
}
