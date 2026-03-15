/** Tiny collision-resistant ID — no external dependency */
export function uid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function now(): string {
  return new Date().toISOString();
}
