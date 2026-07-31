// Frontend-only license system for Hotel Manager.
// - 90-day free trial from first launch
// - After trial: user must enter an activation key issued by admin
// - Admin generates keys with the same secret + expiry date
//
// NOTE: This is client-side only. The secret is embedded in the bundle,
// so a determined user could crack it. The user (product owner) is aware
// of this and plans to move the check to a backend later.

const SECRET = 'HBM-9v2K7pL3xQ8nR4mA6sT1yZ0uEbF5wC-hotel-manager-v1';
const STORAGE_KEY = 'hotel_license_v1';
const TRIAL_DAYS = 90;

export type LicenseState = {
  trialStart: string; // ISO
  activationKey?: string;
  activatedAt?: string; // ISO
  expiresAt?: string;   // ISO (from activation key)
};

export type LicenseStatus =
  | { kind: 'trial'; daysLeft: number; expiresAt: Date }
  | { kind: 'active'; daysLeft: number; expiresAt: Date; key: string }
  | { kind: 'expired'; expiredAt: Date; wasActivated: boolean };

// ---------- Storage ----------

function read(): LicenseState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as LicenseState) : null;
  } catch {
    return null;
  }
}

function write(state: LicenseState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function getOrInitLicense(): LicenseState {
  let s = read();
  if (!s) {
    s = { trialStart: new Date().toISOString() };
    write(s);
  }
  return s;
}

// ---------- Key format ----------
// HBM-YYYYMMDD-XXXXXX
//   YYYYMMDD = expiry date (UTC)
//   XXXXXX   = 6-char uppercase base36 hash of (YYYYMMDD + SECRET)

function simpleHash(input: string): string {
  // FNV-1a-ish, 53-bit
  let h1 = 0xdeadbeef ^ 0;
  let h2 = 0x41c6ce57 ^ 0;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const combined = 4294967296 * (2097151 & h2) + (h1 >>> 0);
  return combined.toString(36).toUpperCase().padStart(11, '0').slice(0, 6);
}

function pad(n: number, w = 2) {
  return n.toString().padStart(w, '0');
}

function toYMD(d: Date): string {
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`;
}

function parseYMD(ymd: string): Date | null {
  if (!/^\d{8}$/.test(ymd)) return null;
  const y = +ymd.slice(0, 4);
  const m = +ymd.slice(4, 6);
  const d = +ymd.slice(6, 8);
  const date = new Date(Date.UTC(y, m - 1, d, 23, 59, 59));
  if (isNaN(date.getTime())) return null;
  return date;
}

export function generateKey(expiry: Date): string {
  const ymd = toYMD(expiry);
  const sig = simpleHash(ymd + SECRET);
  return `HBM-${ymd}-${sig}`;
}

export function validateKey(key: string): { ok: true; expiresAt: Date } | { ok: false; reason: string } {
  const clean = key.trim().toUpperCase();
  const m = /^HBM-(\d{8})-([A-Z0-9]{6})$/.exec(clean);
  if (!m) return { ok: false, reason: 'Invalid key format' };
  const expiry = parseYMD(m[1]);
  if (!expiry) return { ok: false, reason: 'Invalid expiry date in key' };
  const expected = simpleHash(m[1] + SECRET);
  if (expected !== m[2]) return { ok: false, reason: 'Key signature does not match' };
  if (expiry.getTime() < Date.now()) return { ok: false, reason: 'This key has already expired' };
  return { ok: true, expiresAt: expiry };
}

// ---------- Status ----------

export function getStatus(now: Date = new Date()): LicenseStatus {
  const s = getOrInitLicense();
  const msPerDay = 86400000;

  if (s.activationKey && s.expiresAt) {
    const exp = new Date(s.expiresAt);
    if (exp.getTime() > now.getTime()) {
      const daysLeft = Math.ceil((exp.getTime() - now.getTime()) / msPerDay);
      return { kind: 'active', daysLeft, expiresAt: exp, key: s.activationKey };
    }
    return { kind: 'expired', expiredAt: exp, wasActivated: true };
  }

  const trialStart = new Date(s.trialStart);
  const trialExp = new Date(trialStart.getTime() + TRIAL_DAYS * msPerDay);
  if (trialExp.getTime() > now.getTime()) {
    const daysLeft = Math.ceil((trialExp.getTime() - now.getTime()) / msPerDay);
    return { kind: 'trial', daysLeft, expiresAt: trialExp };
  }
  return { kind: 'expired', expiredAt: trialExp, wasActivated: false };
}

export function activate(key: string): { ok: true; expiresAt: Date } | { ok: false; reason: string } {
  const res = validateKey(key);
  if (!res.ok) return res;
  const s = getOrInitLicense();
  write({
    ...s,
    activationKey: key.trim().toUpperCase(),
    activatedAt: new Date().toISOString(),
    expiresAt: res.expiresAt.toISOString(),
  });
  return { ok: true, expiresAt: res.expiresAt };
}

// ---------- Config ----------

export const LICENSE_CONFIG = {
  priceInr: 3699,
  trialDays: TRIAL_DAYS,
  upiId: 'yourname@upi', // change this to your real UPI ID
  payeeName: 'Hotel Manager',
  supportEmail: 'support@example.com',
};
