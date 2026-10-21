import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { buildTreeIndex } from '../domain/buildIndex';
import { parseTreeJson, type ParseOutcome } from '../domain/parseTree';
import {
  clearStoredDocument,
  readExpandedPaths,
  readStoredDocument,
  writeExpandedPaths,
  writeStoredDocument,
} from './persistence';
import { TreeDocumentContext, type LoadedDocument, type TreeDocumentValue } from './treeDocument';

/**
 * Owns the loaded document and the expanded folders.
 *
 * Both are restored from session storage on first render, which is what makes a
 * reload or a pasted deep link work: the tree comes back from the stored JSON and
 * the index is rebuilt rather than restored.
 */
export function TreeProvider({ children }: { children: ReactNode }) {
  const [document, setDocument] = useState<LoadedDocument | null>(restoreDocument);
  const [expandedPaths, setExpandedPaths] = useState<ReadonlySet<string>>(
    () => new Set(readExpandedPaths()),
  );

  const load = useCallback((text: string, sourceName: string): ParseOutcome => {
    const outcome = parseTreeJson(text);
    if (!outcome.ok) return outcome;

    const loadedAt = new Date();
    const persisted = writeStoredDocument({
      json: text,
      sourceName,
      loadedAt: loadedAt.toISOString(),
    });
    setDocument({
      root: outcome.root,
      index: buildTreeIndex(outcome.root),
      warnings: outcome.warnings,
      sourceName,
      loadedAt,
      persisted,
    });

    // A new document invalidates folders expanded in the previous one.
    setExpandedPaths(new Set());
    writeExpandedPaths([]);

    return outcome;
  }, []);

  const clear = useCallback(() => {
    setDocument(null);
    setExpandedPaths(new Set());
    clearStoredDocument();
  }, []);

  const toggleExpanded = useCallback((path: string) => {
    setExpandedPaths((current) => {
      const next = new Set(current);
      if (!next.delete(path)) next.add(path);
      writeExpandedPaths(next);
      return next;
    });
  }, []);

  const expandPaths = useCallback((paths: readonly string[]) => {
    setExpandedPaths((current) => {
      const missing = paths.filter((path) => !current.has(path));
      if (missing.length === 0) return current;

      const next = new Set(current);
      for (const path of missing) next.add(path);
      writeExpandedPaths(next);
      return next;
    });
  }, []);

  const value = useMemo<TreeDocumentValue>(
    () => ({ document, load, clear, expandedPaths, toggleExpanded, expandPaths }),
    [document, load, clear, expandedPaths, toggleExpanded, expandPaths],
  );

  return <TreeDocumentContext.Provider value={value}>{children}</TreeDocumentContext.Provider>;
}

/** Rebuilds the last document from session storage; ignores anything unusable. */
function restoreDocument(): LoadedDocument | null {
  const stored = readStoredDocument();
  if (stored === null) return null;

  const outcome = parseTreeJson(stored.json);
  if (!outcome.ok) {
    clearStoredDocument();
    return null;
  }

  return {
    root: outcome.root,
    index: buildTreeIndex(outcome.root),
    warnings: outcome.warnings,
    sourceName: stored.sourceName,
    loadedAt: new Date(stored.loadedAt),
    persisted: true,
  };
}
