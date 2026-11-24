// Shared by client (preview) and server (authoritative). 0.0025 deg is about one city block.
export const STEP = 0.0025;
export const snap = (n: number) => Math.round(Math.round(n / STEP) * STEP * 10000) / 10000;
