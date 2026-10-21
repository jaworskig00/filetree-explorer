import { joinPath, ROOT_PATH } from './nodePath';
import { childrenOf, isFile, isFolder, type NodeKind, type TreeNode } from './types';

/**
 * A flat index of the tree, built once per loaded document.
 *
 * Why not walk the tree on demand: the detail views need the total size of a
 * subtree and the search needs the full path of every node. Both are recursive
 * questions, and answering them during render would re-walk the tree for every
 * row on screen. Instead the tree is flattened once in O(n), subtree totals are
 * accumulated in a single reverse pass, and from then on a lookup is O(1) and a
 * search is one linear scan over data that already carries its own path.
 */

export interface IndexedNode {
  readonly node: TreeNode;
  readonly kind: NodeKind;
  /** `src/components/Button.tsx`; the root is the empty path. */
  readonly path: string;
  readonly name: string;
  readonly parentPath: string | null;
  /** 0 for the root. */
  readonly depth: number;
  readonly childPaths: readonly string[];
  readonly directChildCount: number;
  /** Total bytes of every file in this subtree; a file's own size for a file. */
  readonly subtreeFileSize: number;
  readonly subtreeFileCount: number;
  readonly subtreeFolderCount: number;
}

export interface TreeIndex {
  readonly root: IndexedNode;
  readonly byPath: ReadonlyMap<string, IndexedNode>;
  /** Document order (depth-first, pre-order), which is also the order search reports hits in. */
  readonly ordered: readonly IndexedNode[];
  readonly nodeCount: number;
}

interface MutableEntry {
  readonly node: TreeNode;
  readonly path: string;
  readonly name: string;
  readonly parentPath: string | null;
  readonly depth: number;
  childPaths: string[];
  subtreeFileSize: number;
  subtreeFileCount: number;
  subtreeFolderCount: number;
}

interface Frame {
  readonly node: TreeNode;
  readonly path: string;
  readonly parentPath: string | null;
  readonly depth: number;
}

export function buildTreeIndex(root: TreeNode): TreeIndex {
  const entries = collectEntries(root);
  const entriesByPath = new Map(entries.map((entry) => [entry.path, entry]));
  accumulateSubtreeTotals(entries, entriesByPath);

  const ordered: IndexedNode[] = [];
  const byPath = new Map<string, IndexedNode>();

  for (const entry of entries) {
    const indexed: IndexedNode = {
      node: entry.node,
      kind: entry.node.type,
      path: entry.path,
      name: entry.name,
      parentPath: entry.parentPath,
      depth: entry.depth,
      childPaths: entry.childPaths,
      directChildCount: entry.childPaths.length,
      subtreeFileSize: entry.subtreeFileSize,
      subtreeFileCount: entry.subtreeFileCount,
      subtreeFolderCount: entry.subtreeFolderCount,
    };
    ordered.push(indexed);
    byPath.set(indexed.path, indexed);
  }

  const indexedRoot = ordered[0];
  if (indexedRoot === undefined) {
    throw new Error('buildTreeIndex: the tree has no root node.');
  }

  return { root: indexedRoot, byPath, ordered, nodeCount: ordered.length };
}

/**
 * Depth-first pre-order walk with an explicit stack, so a pathological tree
 * cannot overflow the call stack. Children are pushed in reverse so they pop in
 * document order.
 */
function collectEntries(root: TreeNode): MutableEntry[] {
  const entries: MutableEntry[] = [];
  const claimedPaths = new Set<string>([ROOT_PATH]);
  const stack: Frame[] = [{ node: root, path: ROOT_PATH, parentPath: null, depth: 0 }];

  while (stack.length > 0) {
    const frame = stack.pop();
    if (frame === undefined) break;

    const entry: MutableEntry = {
      node: frame.node,
      path: frame.path,
      name: frame.node.name,
      parentPath: frame.parentPath,
      depth: frame.depth,
      childPaths: [],
      subtreeFileSize: 0,
      subtreeFileCount: 0,
      subtreeFolderCount: 0,
    };
    entries.push(entry);

    const kept: Frame[] = [];
    for (const child of childrenOf(frame.node)) {
      const childPath = joinPath(frame.path, child.name);
      // Two children with the same name would map to one path. The parser already
      // warns about it; here the first one wins so the index stays consistent.
      if (claimedPaths.has(childPath)) continue;
      claimedPaths.add(childPath);

      entry.childPaths.push(childPath);
      kept.push({
        node: child,
        path: childPath,
        parentPath: frame.path,
        depth: frame.depth + 1,
      });
    }

    for (let i = kept.length - 1; i >= 0; i -= 1) {
      const childFrame = kept[i];
      if (childFrame !== undefined) stack.push(childFrame);
    }
  }

  return entries;
}

/**
 * In pre-order every node precedes its descendants, so walking the list backwards
 * visits all children before their parent. Each node then adds its own totals to
 * its parent exactly once.
 */
function accumulateSubtreeTotals(
  entries: readonly MutableEntry[],
  entriesByPath: ReadonlyMap<string, MutableEntry>,
): void {
  for (let i = entries.length - 1; i >= 0; i -= 1) {
    const entry = entries[i];
    if (entry === undefined) continue;

    if (isFile(entry.node)) {
      entry.subtreeFileSize = entry.node.size ?? 0;
      entry.subtreeFileCount = 1;
    }

    if (entry.parentPath === null) continue;
    const parent = entriesByPath.get(entry.parentPath);
    if (parent === undefined) continue;

    parent.subtreeFileSize += entry.subtreeFileSize;
    parent.subtreeFileCount += entry.subtreeFileCount;
    parent.subtreeFolderCount += entry.subtreeFolderCount + (isFolder(entry.node) ? 1 : 0);
  }
}
