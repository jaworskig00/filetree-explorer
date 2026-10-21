import { describe, expect, it } from 'vitest';
import { briefTree } from '../test/fixtures';
import { buildTreeIndex } from './buildIndex';
import { MAX_SEARCH_HITS, searchTree } from './search';
import type { FolderNode } from './types';

const index = buildTreeIndex(briefTree);

describe('searchTree', () => {
  it('matches part of a name, ignoring case', () => {
    const outcome = searchTree(index, 'button');

    expect(outcome.hits).toEqual([
      {
        path: 'src/components/Button.tsx',
        name: 'Button.tsx',
        kind: 'file',
        matchStart: 0,
        matchEnd: 6,
      },
    ]);
  });

  it('reports the full path of every hit, which is what the result list shows', () => {
    const outcome = searchTree(index, 'ts');

    // "components" matches too: the query is a substring of the name, not a suffix.
    expect(outcome.hits.map((hit) => hit.path)).toEqual([
      'src/index.ts',
      'src/components',
      'src/components/Button.tsx',
    ]);
  });

  it('finds folders as well as files', () => {
    const outcome = searchTree(index, 'components');

    expect(outcome.hits).toHaveLength(1);
    expect(outcome.hits[0]?.kind).toBe('folder');
  });

  it('returns match offsets so the result can highlight the match', () => {
    const outcome = searchTree(index, 'index');
    expect(outcome.hits[0]).toMatchObject({ name: 'index.ts', matchStart: 0, matchEnd: 5 });

    const middle = searchTree(index, 'json');
    expect(middle.hits[0]).toMatchObject({ name: 'package.json', matchStart: 8, matchEnd: 12 });
  });

  it('reports hits in document order', () => {
    const outcome = searchTree(index, '.');
    expect(outcome.hits.map((hit) => hit.name)).toEqual(['index.ts', 'Button.tsx', 'package.json']);
  });

  it('treats a blank query as no search at all', () => {
    for (const query of ['', '   ']) {
      const outcome = searchTree(index, query);
      expect(outcome.hits).toEqual([]);
      expect(outcome.totalMatches).toBe(0);
    }
  });

  it('trims the query but keeps it for display', () => {
    const outcome = searchTree(index, '  Button  ');
    expect(outcome.query).toBe('Button');
    expect(outcome.hits).toHaveLength(1);
  });

  it('finds nothing when nothing matches', () => {
    const outcome = searchTree(index, 'nonexistent');
    expect(outcome).toMatchObject({ hits: [], totalMatches: 0, truncated: false });
  });

  it('never returns the root, which is always one click away', () => {
    const outcome = searchTree(index, 'root');
    expect(outcome.hits).toEqual([]);
  });

  it('caps the number of hits and says that it did', () => {
    const children = Array.from({ length: MAX_SEARCH_HITS + 25 }, (_unused, position) => ({
      name: `match-${String(position)}.ts`,
      type: 'file' as const,
      size: 1,
    }));
    const large = buildTreeIndex({ name: 'root', type: 'folder', children } satisfies FolderNode);

    const outcome = searchTree(large, 'match');

    expect(outcome.hits).toHaveLength(MAX_SEARCH_HITS);
    expect(outcome.totalMatches).toBe(MAX_SEARCH_HITS + 25);
    expect(outcome.truncated).toBe(true);
  });

  it('respects a custom limit', () => {
    const outcome = searchTree(index, '.', 1);
    expect(outcome.hits).toHaveLength(1);
    expect(outcome.totalMatches).toBe(3);
    expect(outcome.truncated).toBe(true);
  });
});
