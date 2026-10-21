/**
 * Byte formatting. The brief asks for B / KB / MB; GB and TB are included so a
 * large tree cannot produce a six-digit MB value.
 */

const UNITS = ['B', 'KB', 'MB', 'GB', 'TB'] as const;
const STEP = 1024;

export function formatSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';

  let value = bytes;
  let unitIndex = 0;
  while (value >= STEP && unitIndex < UNITS.length - 1) {
    value /= STEP;
    unitIndex += 1;
  }

  const unit = UNITS[unitIndex] ?? 'B';
  // Bytes are whole units; everything above gets one decimal, with a bare `.0` trimmed.
  const rendered = unitIndex === 0 ? String(Math.round(value)) : trimTrailingZero(value.toFixed(1));
  return `${rendered} ${unit}`;
}

function trimTrailingZero(value: string): string {
  return value.endsWith('.0') ? value.slice(0, -2) : value;
}
