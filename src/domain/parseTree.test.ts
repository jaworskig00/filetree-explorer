import { describe, expect, it } from 'vitest';
import { BRIEF_TREE_JSON } from '../test/fixtures';
import { LIMITS, parseTreeJson, validateTree, type ValidationIssue } from './parseTree';
import { childrenOf, isFolder } from './types';

function errorsOf(input: unknown): readonly ValidationIssue[] {
  const outcome = validateTree(input);
  if (outcome.ok) throw new Error('expected validation to fail');
  return outcome.errors;
}

function warningsOf(input: unknown): readonly ValidationIssue[] {
  const outcome = validateTree(input);
  if (!outcome.ok)
    throw new Error(`expected validation to pass: ${JSON.stringify(outcome.errors)}`);
  return outcome.warnings;
}

describe('parseTreeJson', () => {
  it('accepts the example from the brief without complaints', () => {
    const outcome = parseTreeJson(BRIEF_TREE_JSON);

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.warnings).toEqual([]);
    expect(outcome.root.name).toBe('root');
    expect(childrenOf(outcome.root).map((child) => child.name)).toEqual(['src', 'package.json']);
  });

  it('reports empty input', () => {
    const outcome = parseTreeJson('   ');
    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.errors[0]?.message).toBe('Input is empty.');
  });

  it('reports malformed JSON instead of throwing', () => {
    const outcome = parseTreeJson('{ "name": "root", ');
    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.errors[0]?.message).toMatch(/^Not valid JSON/);
  });
});

describe('shape errors', () => {
  it('rejects anything that is not an object at the root', () => {
    expect(errorsOf([])).toEqual([{ at: 'root', message: 'Expected an object, got an array.' }]);
    expect(errorsOf(null)).toEqual([{ at: 'root', message: 'Expected an object, got null.' }]);
    expect(errorsOf('root')).toEqual([
      { at: 'root', message: 'Expected an object, got a string ("root").' },
    ]);
  });

  it('requires a usable name', () => {
    expect(errorsOf({ type: 'folder' })).toEqual([
      { at: 'root.name', message: 'Expected a string, got nothing.' },
    ]);
    expect(errorsOf({ name: '', type: 'folder' })).toEqual([
      { at: 'root.name', message: 'Name must not be empty.' },
    ]);
  });

  it('rejects a name with a slash, because paths join names with slashes', () => {
    expect(errorsOf({ name: 'src/index.ts', type: 'file' })).toEqual([
      { at: 'root.name', message: 'Name must not contain a slash.' },
    ]);
  });

  it('requires type to be exactly file or folder', () => {
    expect(errorsOf({ name: 'root', type: 'directory' })).toEqual([
      { at: 'root.type', message: 'Expected "file" or "folder", got a string ("directory").' },
    ]);
  });

  it('rejects a file that carries children', () => {
    expect(errorsOf({ name: 'index.ts', type: 'file', children: [] })).toEqual([
      {
        at: 'root.children',
        message: 'A file cannot have children. Did you mean "type": "folder"?',
      },
    ]);
  });

  it('rejects sizes that are not usable byte counts', () => {
    expect(errorsOf({ name: 'a.ts', type: 'file', size: -1 })).toEqual([
      { at: 'root.size', message: 'Size must not be negative.' },
    ]);
    expect(errorsOf({ name: 'a.ts', type: 'file', size: '1024' })).toEqual([
      { at: 'root.size', message: 'Expected a number, got a string ("1024").' },
    ]);
  });

  it('requires children to be an array', () => {
    expect(errorsOf({ name: 'src', type: 'folder', children: {} })).toEqual([
      { at: 'root.children', message: 'Expected an array, got a object.' },
    ]);
  });

  it('collects every problem in one pass, with its location', () => {
    const errors = errorsOf({
      name: 'root',
      type: 'folder',
      children: [
        { name: 'ok.ts', type: 'file', size: 1 },
        { name: 'bad.ts', type: 'file', size: -5 },
        { name: 42, type: 'file' },
        { name: 'nested', type: 'folder', children: [{ name: 'deep.ts', type: 'archive' }] },
      ],
    });

    expect(errors.map((issue) => issue.at)).toEqual([
      'root.children[1].size',
      'root.children[2].name',
      'root.children[3].children[0].type',
    ]);
  });

  it('summarises the tail when there are too many problems', () => {
    const children = Array.from({ length: LIMITS.maxReportedErrors + 5 }, () => ({
      name: 'x.ts',
      type: 'file',
      size: -1,
    }));

    const errors = errorsOf({ name: 'root', type: 'folder', children });

    expect(errors).toHaveLength(LIMITS.maxReportedErrors + 1);
    expect(errors[errors.length - 1]?.message).toBe('… and 5 more problems.');
  });
});

describe('tolerated input, reported as warnings', () => {
  it('accepts a file without a size', () => {
    expect(warningsOf({ name: 'a.ts', type: 'file' })).toEqual([]);
  });

  it('treats an explicit null size or null children as absent', () => {
    expect(warningsOf({ name: 'a.ts', type: 'file', size: null })).toEqual([]);
    expect(warningsOf({ name: 'src', type: 'folder', children: null })).toEqual([]);
  });

  it('ignores a size on a folder', () => {
    expect(warningsOf({ name: 'src', type: 'folder', size: 10 })).toEqual([
      {
        at: 'root.size',
        message: 'Size on a folder is ignored; folder size is computed from the files inside it.',
      },
    ]);
  });

  it('ignores unknown properties', () => {
    expect(warningsOf({ name: 'a.ts', type: 'file', modified: '2026-01-01' })).toEqual([
      { at: 'root.modified', message: 'Unknown property is ignored.' },
    ]);
  });

  it('warns when two children of one folder share a name', () => {
    const warnings = warningsOf({
      name: 'root',
      type: 'folder',
      children: [
        { name: 'a.ts', type: 'file', size: 1 },
        { name: 'a.ts', type: 'file', size: 2 },
      ],
    });

    expect(warnings).toEqual([
      {
        at: 'root.children[1].name',
        message: 'Duplicate name "a.ts" in this folder; only the first one is reachable.',
      },
    ]);
  });

  it('warns about a fractional size but keeps it', () => {
    expect(warningsOf({ name: 'a.ts', type: 'file', size: 1.5 })).toEqual([
      { at: 'root.size', message: 'Size is not a whole number of bytes.' },
    ]);
  });
});

describe('hardening', () => {
  it('rebuilds nodes, so a __proto__ payload cannot escape the parser', () => {
    const outcome = parseTreeJson('{"name":"root","type":"folder","__proto__":{"polluted":true}}');

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(Object.keys(outcome.root)).toEqual(['name', 'type']);
    expect(({} as Record<string, unknown>)['polluted']).toBeUndefined();
  });

  it('refuses a tree deeper than the supported limit', () => {
    let node: unknown = { name: 'bottom.txt', type: 'file', size: 1 };
    for (let level = 0; level <= LIMITS.maxDepth; level += 1) {
      node = { name: `level-${String(level)}`, type: 'folder', children: [node] };
    }

    const errors = errorsOf(node);
    expect(errors[0]?.message).toMatch(/deeper than 200 levels/);
  });

  it('refuses a tree with more nodes than the supported limit', () => {
    const children = Array.from({ length: LIMITS.maxNodes + 1 }, (_unused, index) => ({
      name: `file-${String(index)}.ts`,
      type: 'file',
      size: 1,
    }));

    const errors = errorsOf({ name: 'root', type: 'folder', children });
    expect(errors[0]?.message).toMatch(/more than 200,000 nodes/);
  });

  it('keeps a folder usable when one of its children is broken', () => {
    const outcome = validateTree({
      name: 'root',
      type: 'folder',
      children: [{ name: 'good.ts', type: 'file', size: 1 }, { type: 'file' }],
    });

    // The whole document is still rejected, but the error points at the child only.
    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.errors).toEqual([
      { at: 'root.children[1].name', message: 'Expected a string, got nothing.' },
    ]);
  });

  it('keeps folders as folders even when empty', () => {
    const outcome = validateTree({ name: 'empty', type: 'folder' });
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(isFolder(outcome.root)).toBe(true);
    expect(childrenOf(outcome.root)).toEqual([]);
  });
});
