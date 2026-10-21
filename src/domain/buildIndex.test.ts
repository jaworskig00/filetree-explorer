import { describe, expect, it } from 'vitest';
import { briefTree, deepChain } from '../test/fixtures';
import { buildTreeIndex } from './buildIndex';
import { ROOT_PATH } from './nodePath';
import type { FolderNode } from './types';

const index = buildTreeIndex(briefTree);

function entry(path: string) {
  const found = index.byPath.get(path);
  if (found === undefined) throw new Error(`no indexed node at "${path}"`);
  return found;
}

describe('indexing', () => {
  it('addresses the root by the empty path and keeps its name', () => {
    expect(index.root.path).toBe(ROOT_PATH);
    expect(index.root.name).toBe('root');
    expect(index.root.parentPath).toBeNull();
    expect(index.root.depth).toBe(0);
  });

  it('indexes every node under the path format from the brief', () => {
    expect([...index.byPath.keys()]).toEqual([
      ROOT_PATH,
      'src',
      'src/index.ts',
      'src/components',
      'src/components/Button.tsx',
      'package.json',
    ]);
    expect(index.nodeCount).toBe(6);
  });

  it('keeps nodes in document order', () => {
    expect(index.ordered.map((node) => node.name)).toEqual([
      'root',
      'src',
      'index.ts',
      'components',
      'Button.tsx',
      'package.json',
    ]);
  });

  it('records parent, depth and children for each node', () => {
    const button = entry('src/components/Button.tsx');
    expect(button.parentPath).toBe('src/components');
    expect(button.depth).toBe(3);
    expect(button.kind).toBe('file');
    expect(button.childPaths).toEqual([]);

    const src = entry('src');
    expect(src.childPaths).toEqual(['src/index.ts', 'src/components']);
    expect(src.directChildCount).toBe(2);
  });
});

describe('subtree totals', () => {
  it('sums file sizes across the whole subtree', () => {
    expect(index.root.subtreeFileSize).toBe(1836);
    expect(entry('src').subtreeFileSize).toBe(1536);
    expect(entry('src/components').subtreeFileSize).toBe(512);
  });

  it('reports a file′s own size as its subtree size', () => {
    expect(entry('package.json').subtreeFileSize).toBe(300);
  });

  it('counts files and folders inside a subtree', () => {
    expect(index.root.subtreeFileCount).toBe(3);
    expect(index.root.subtreeFolderCount).toBe(2);
    expect(entry('src').subtreeFileCount).toBe(2);
    expect(entry('src').subtreeFolderCount).toBe(1);
  });

  it('counts a file without a size as zero bytes', () => {
    const tree: FolderNode = {
      name: 'root',
      type: 'folder',
      children: [
        { name: 'known.ts', type: 'file', size: 100 },
        { name: 'unknown.ts', type: 'file' },
      ],
    };

    expect(buildTreeIndex(tree).root.subtreeFileSize).toBe(100);
  });

  it('reports an empty folder as empty rather than unknown', () => {
    const tree: FolderNode = {
      name: 'root',
      type: 'folder',
      children: [{ name: 'empty', type: 'folder', children: [] }],
    };
    const emptyFolder = buildTreeIndex(tree).byPath.get('empty');

    expect(emptyFolder?.directChildCount).toBe(0);
    expect(emptyFolder?.subtreeFileSize).toBe(0);
    expect(emptyFolder?.subtreeFileCount).toBe(0);
  });
});

describe('edge cases', () => {
  it('keeps the first of two children sharing a name, so paths stay unique', () => {
    const tree: FolderNode = {
      name: 'root',
      type: 'folder',
      children: [
        { name: 'a.ts', type: 'file', size: 10 },
        { name: 'a.ts', type: 'file', size: 999 },
      ],
    };
    const duplicated = buildTreeIndex(tree);

    expect(duplicated.nodeCount).toBe(2);
    expect(duplicated.root.childPaths).toEqual(['a.ts']);
    expect(duplicated.byPath.get('a.ts')?.subtreeFileSize).toBe(10);
    expect(duplicated.root.subtreeFileSize).toBe(10);
  });

  it('walks a tree far deeper than the call stack would allow', () => {
    const deep = buildTreeIndex(deepChain(10_000));

    expect(deep.nodeCount).toBe(10_002);
    expect(deep.root.subtreeFileSize).toBe(1);
    expect(deep.root.subtreeFolderCount).toBe(10_000);
    expect(deep.ordered[deep.ordered.length - 1]?.depth).toBe(10_001);
  });
});
