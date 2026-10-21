/**
 * Session persistence.
 *
 * Only the raw JSON text is stored, never the parsed tree or the index. The index
 * is cheap to rebuild on boot (one O(n) pass) and storing derived data is the
 * usual source of stale state after a format change.
 *
 * The expanded folders live under a separate key on purpose: they change on every
 * click, and rewriting a multi-megabyte document each time a folder opens would
 * be wasteful.
 *
 * `sessionStorage` is per tab, which matches the lifetime of the thing being
 * inspected, and every access is guarded: private mode and blocked storage must
 * degrade to "no saved document", never to a crash.
 */

const DOCUMENT_KEY = 'filetree-explorer:v1:document';
const VIEW_KEY = 'filetree-explorer:v1:view';

export interface StoredDocument {
  readonly json: string;
  /** A file name, or a label for pasted input. */
  readonly sourceName: string;
  /** ISO timestamp of when it was loaded. */
  readonly loadedAt: string;
}

export function readStoredDocument(): StoredDocument | null {
  const raw = readKey(DOCUMENT_KEY);
  if (raw === null) return null;

  const parsed = parseJson(raw);
  if (
    !isRecord(parsed) ||
    typeof parsed['json'] !== 'string' ||
    typeof parsed['sourceName'] !== 'string' ||
    typeof parsed['loadedAt'] !== 'string'
  ) {
    // Someone or something else wrote this; treat it as absent.
    clearStoredDocument();
    return null;
  }

  return {
    json: parsed['json'],
    sourceName: parsed['sourceName'],
    loadedAt: parsed['loadedAt'],
  };
}

/** Returns false when storage refused the write, e.g. a document over the quota. */
export function writeStoredDocument(document: StoredDocument): boolean {
  return writeKey(DOCUMENT_KEY, JSON.stringify(document));
}

export function clearStoredDocument(): void {
  removeKey(DOCUMENT_KEY);
  removeKey(VIEW_KEY);
}

export function readExpandedPaths(): string[] {
  const raw = readKey(VIEW_KEY);
  if (raw === null) return [];

  const parsed = parseJson(raw);
  if (!Array.isArray(parsed)) return [];

  return parsed.filter((value): value is string => typeof value === 'string');
}

export function writeExpandedPaths(paths: Iterable<string>): void {
  writeKey(VIEW_KEY, JSON.stringify([...paths]));
}

function readKey(key: string): string | null {
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeKey(key: string, value: string): boolean {
  try {
    window.sessionStorage.setItem(key, value);
    return true;
  } catch {
    // Out of quota or storage disabled: the app keeps working for this view,
    // it just will not survive a reload.
    return false;
  }
}

function removeKey(key: string): void {
  try {
    window.sessionStorage.removeItem(key);
  } catch {
    // Nothing to do; see writeKey.
  }
}

function parseJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
