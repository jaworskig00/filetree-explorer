import type { FileNode, FolderNode, TreeNode } from './types';

/**
 * Validation of untrusted input.
 *
 * Two things matter here beyond "is this shape right":
 *
 * 1. Every error is collected with the place it happened, so a reviewer pasting a
 *    broken file sees all of them at once instead of fixing one per attempt.
 * 2. The result is rebuilt from scratch rather than cast. Nothing from the input
 *    object survives except the four known properties, so unknown keys and
 *    `__proto__`-style payloads cannot reach the rest of the app.
 */

export interface ValidationIssue {
  /** Location in JavaScript notation, e.g. `root.children[0].size`. */
  readonly at: string;
  readonly message: string;
}

export type ParseOutcome =
  | { readonly ok: true; readonly root: TreeNode; readonly warnings: readonly ValidationIssue[] }
  | { readonly ok: false; readonly errors: readonly ValidationIssue[] };

export const LIMITS = {
  /** Guards the UI against a file that would freeze the tab. */
  maxNodes: 200_000,
  /** Also caps recursion depth in this module. */
  maxDepth: 200,
  /** Beyond this, the remaining errors are summarised instead of listed. */
  maxReportedErrors: 25,
} as const;

/**
 * Every property the format defines. `size` on a folder and `children` on a file
 * are part of the format but in the wrong place, and both have their own message,
 * so they must not also be reported as unknown.
 */
const KNOWN_KEYS = new Set(['name', 'type', 'size', 'children']);

interface Context {
  readonly errors: ValidationIssue[];
  readonly warnings: ValidationIssue[];
  nodeCount: number;
  limitReported: boolean;
}

/** Parses JSON text and validates it in one step. */
export function parseTreeJson(text: string): ParseOutcome {
  if (text.trim() === '') {
    return { ok: false, errors: [{ at: 'root', message: 'Input is empty.' }] };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Unknown parsing error.';
    return { ok: false, errors: [{ at: 'root', message: `Not valid JSON: ${detail}` }] };
  }

  return validateTree(parsed);
}

export function validateTree(input: unknown): ParseOutcome {
  const context: Context = { errors: [], warnings: [], nodeCount: 0, limitReported: false };
  const root = validateNode(input, 'root', 0, context);

  if (root === null || context.errors.length > 0) {
    return { ok: false, errors: truncateErrors(context.errors) };
  }

  return { ok: true, root, warnings: context.warnings };
}

function validateNode(
  input: unknown,
  at: string,
  depth: number,
  context: Context,
): TreeNode | null {
  if (depth > LIMITS.maxDepth) {
    context.errors.push({
      at,
      message: `Tree is deeper than ${String(LIMITS.maxDepth)} levels, which this viewer does not support.`,
    });
    return null;
  }

  context.nodeCount += 1;
  if (context.nodeCount > LIMITS.maxNodes) {
    if (!context.limitReported) {
      context.limitReported = true;
      context.errors.push({
        at,
        message: `Tree has more than ${LIMITS.maxNodes.toLocaleString('en-US')} nodes, which this viewer does not support.`,
      });
    }
    return null;
  }

  if (!isPlainObject(input)) {
    context.errors.push({ at, message: `Expected an object, got ${describe(input)}.` });
    return null;
  }

  const name = validateName(input, at, context);
  const type = validateType(input, at, context);
  if (name === null || type === null) return null;

  return type === 'file'
    ? validateFile(input, name, at, context)
    : validateFolder(input, name, at, depth, context);
}

function validateName(input: Record<string, unknown>, at: string, context: Context): string | null {
  const name = input['name'];

  if (typeof name !== 'string') {
    context.errors.push({ at: `${at}.name`, message: `Expected a string, got ${describe(name)}.` });
    return null;
  }
  if (name === '') {
    context.errors.push({ at: `${at}.name`, message: 'Name must not be empty.' });
    return null;
  }
  // A slash would make the node path ambiguous, since paths join names with slashes.
  if (name.includes('/')) {
    context.errors.push({ at: `${at}.name`, message: 'Name must not contain a slash.' });
    return null;
  }

  return name;
}

function validateType(
  input: Record<string, unknown>,
  at: string,
  context: Context,
): TreeNode['type'] | null {
  const type = input['type'];

  if (type !== 'file' && type !== 'folder') {
    context.errors.push({
      at: `${at}.type`,
      message: `Expected "file" or "folder", got ${describe(type)}.`,
    });
    return null;
  }

  return type;
}

function validateFile(
  input: Record<string, unknown>,
  name: string,
  at: string,
  context: Context,
): FileNode | null {
  reportUnknownKeys(input, at, context);

  if ('children' in input) {
    context.errors.push({
      at: `${at}.children`,
      message: 'A file cannot have children. Did you mean "type": "folder"?',
    });
    return null;
  }

  if (!('size' in input) || input['size'] === null) {
    return { name, type: 'file' };
  }

  const size = input['size'];
  if (typeof size !== 'number' || !Number.isFinite(size)) {
    context.errors.push({
      at: `${at}.size`,
      message: `Expected a number, got ${describe(size)}.`,
    });
    return null;
  }
  if (size < 0) {
    context.errors.push({ at: `${at}.size`, message: 'Size must not be negative.' });
    return null;
  }
  if (!Number.isInteger(size)) {
    context.warnings.push({ at: `${at}.size`, message: 'Size is not a whole number of bytes.' });
  }

  return { name, type: 'file', size };
}

function validateFolder(
  input: Record<string, unknown>,
  name: string,
  at: string,
  depth: number,
  context: Context,
): FolderNode | null {
  reportUnknownKeys(input, at, context);

  if ('size' in input) {
    context.warnings.push({
      at: `${at}.size`,
      message: 'Size on a folder is ignored; folder size is computed from the files inside it.',
    });
  }

  if (!('children' in input) || input['children'] === null) {
    return { name, type: 'folder' };
  }

  const children = input['children'];
  if (!Array.isArray(children)) {
    context.errors.push({
      at: `${at}.children`,
      message: `Expected an array, got ${describe(children)}.`,
    });
    return null;
  }

  const seenNames = new Set<string>();
  const validated: TreeNode[] = [];

  children.forEach((child, childIndex) => {
    const childAt = `${at}.children[${String(childIndex)}]`;
    const node = validateNode(child, childAt, depth + 1, context);
    if (node === null) return;

    if (seenNames.has(node.name)) {
      context.warnings.push({
        at: `${childAt}.name`,
        message: `Duplicate name "${node.name}" in this folder; only the first one is reachable.`,
      });
    }
    seenNames.add(node.name);
    validated.push(node);
  });

  return { name, type: 'folder', children: validated };
}

function reportUnknownKeys(input: Record<string, unknown>, at: string, context: Context): void {
  for (const key of Object.keys(input)) {
    if (!KNOWN_KEYS.has(key)) {
      context.warnings.push({ at: `${at}.${key}`, message: `Unknown property is ignored.` });
    }
  }
}

function truncateErrors(errors: readonly ValidationIssue[]): readonly ValidationIssue[] {
  if (errors.length <= LIMITS.maxReportedErrors) return errors;

  const remaining = errors.length - LIMITS.maxReportedErrors;
  return [
    ...errors.slice(0, LIMITS.maxReportedErrors),
    { at: 'root', message: `… and ${String(remaining)} more problems.` },
  ];
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function describe(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'an array';
  if (value === undefined) return 'nothing';
  if (typeof value === 'string') return `a string ("${value}")`;
  return `a ${typeof value}`;
}
