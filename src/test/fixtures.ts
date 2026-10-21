import type { FolderNode, TreeNode } from '../domain/types';

/** The exact example from the task brief, as text, so tests exercise real input. */
export const BRIEF_TREE_JSON = `{
  "name": "root",
  "type": "folder",
  "children": [
    {
      "name": "src",
      "type": "folder",
      "children": [
        { "name": "index.ts", "type": "file", "size": 1024 },
        {
          "name": "components",
          "type": "folder",
          "children": [
            { "name": "Button.tsx", "type": "file", "size": 512 }
          ]
        }
      ]
    },
    { "name": "package.json", "type": "file", "size": 300 }
  ]
}`;

/** The same tree as a validated value. Sizes: 1024 + 512 + 300 = 1836 bytes. */
export const briefTree: FolderNode = {
  name: 'root',
  type: 'folder',
  children: [
    {
      name: 'src',
      type: 'folder',
      children: [
        { name: 'index.ts', type: 'file', size: 1024 },
        {
          name: 'components',
          type: 'folder',
          children: [{ name: 'Button.tsx', type: 'file', size: 512 }],
        },
      ],
    },
    { name: 'package.json', type: 'file', size: 300 },
  ],
};

/** Builds a folder chain `level-1/level-2/...` with a single file at the bottom. */
export function deepChain(depth: number): FolderNode {
  let node: TreeNode = { name: 'bottom.txt', type: 'file', size: 1 };
  for (let level = depth; level >= 1; level -= 1) {
    node = { name: `level-${String(level)}`, type: 'folder', children: [node] };
  }
  return { name: 'root', type: 'folder', children: [node] };
}
