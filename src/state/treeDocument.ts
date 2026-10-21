import { createContext, useContext } from 'react';
import type { TreeIndex } from '../domain/buildIndex';
import type { ParseOutcome, ValidationIssue } from '../domain/parseTree';
import type { TreeNode } from '../domain/types';

export interface LoadedDocument {
  readonly root: TreeNode;
  readonly index: TreeIndex;
  /** Problems that did not prevent loading, surfaced in the UI. */
  readonly warnings: readonly ValidationIssue[];
  readonly sourceName: string;
  readonly loadedAt: Date;
}

export interface TreeDocumentValue {
  /** The tree currently being inspected, or null when nothing is loaded. */
  readonly document: LoadedDocument | null;
  /**
   * Validates and loads `text`. Returns the outcome so the caller can render
   * errors; nothing is stored when validation fails.
   */
  readonly load: (text: string, sourceName: string) => ParseOutcome;
  readonly clear: () => void;
  readonly expandedPaths: ReadonlySet<string>;
  readonly toggleExpanded: (path: string) => void;
  /** Opens folders without closing anything, used for deep links. */
  readonly expandPaths: (paths: readonly string[]) => void;
}

export const TreeDocumentContext = createContext<TreeDocumentValue | null>(null);

export function useTreeDocument(): TreeDocumentValue {
  const value = useContext(TreeDocumentContext);
  if (value === null) {
    throw new Error('useTreeDocument must be used inside a TreeProvider.');
  }
  return value;
}
