export function formatMinutes(value: number): string {
  const absolute = Math.abs(value);
  return `${value < 0 ? '-' : ''}${Math.floor(absolute / 60)}:${String(absolute % 60).padStart(2, '0')}`;
}

export function parseMinutes(value: string): number | null {
  const match = /^(\d+):([0-5]\d)$/.exec(value.trim());
  if (!match) return null;
  const result = Number(match[1]) * 60 + Number(match[2]);
  return Number.isSafeInteger(result) ? result : null;
}
