/**
 * The input format accepted by the app. Kept deliberately narrow: anything that
 * reaches this type has already been through `validateTree`, so the rest of the
 * app never has to re-check shapes at runtime.
 */

export interface FileNode {
  readonly name: string;
  readonly type: 'file';
  /** Bytes. Optional in the input format; a missing size counts as 0. */
  readonly size?: number;
}

export interface FolderNode {
  readonly name: string;
  readonly type: 'folder';
  readonly children?: readonly TreeNode[];
}

export type TreeNode = FileNode | FolderNode;

export type NodeKind = TreeNode['type'];

export function isFolder(node: TreeNode): node is FolderNode {
  return node.type === 'folder';
}

export function isFile(node: TreeNode): node is FileNode {
  return node.type === 'file';
}

/** Direct children of a folder, or an empty list for files and empty folders. */
export function childrenOf(node: TreeNode): readonly TreeNode[] {
  return isFolder(node) ? (node.children ?? []) : [];
}
