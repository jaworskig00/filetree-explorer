import { useMemo, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react';
import { Link, useLocation } from 'react-router-dom';
import type { IndexedNode, TreeIndex } from '../domain/buildIndex';
import { formatSize } from '../domain/formatSize';
import { ROOT_PATH, toTreeUrl } from '../domain/nodePath';
import { useTreeDocument } from '../state/treeDocument';
import { NodeIcon } from './NodeIcon';

/**
 * The tree, rendered as a flat list of the currently visible rows.
 *
 * Flat rather than nested because visibility is derived in one pass over the
 * pre-ordered index (a collapsed folder hides everything deeper than itself until
 * the next sibling), which keeps the work proportional to the tree rather than to
 * the nesting. ARIA levels carry the structure that the DOM no longer shows.
 */
export function TreeView({ index, selectedPath }: { index: TreeIndex; selectedPath: string }) {
  const { expandedPaths, toggleExpanded } = useTreeDocument();
  const location = useLocation();
  const rowRefs = useRef(new Map<string, HTMLAnchorElement>());
  const [focusedPath, setFocusedPath] = useState<string | null>(null);

  const isExpanded = (path: string) => path === ROOT_PATH || expandedPaths.has(path);

  const visibleNodes = useMemo(
    () => collectVisibleNodes(index, expandedPaths),
    [index, expandedPaths],
  );

  // Exactly one row is in the tab order; the arrow keys move it.
  const tabbablePath =
    focusedPath ??
    (visibleNodes.some((n) => n.path === selectedPath)
      ? selectedPath
      : (visibleNodes[0]?.path ?? ROOT_PATH));

  function focusRow(path: string | undefined) {
    if (path === undefined) return;
    setFocusedPath(path);
    rowRefs.current.get(path)?.focus();
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const position = visibleNodes.findIndex((node) => node.path === tabbablePath);
    const current = visibleNodes[position];
    if (current === undefined) return;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        focusRow(visibleNodes[position + 1]?.path);
        break;
      case 'ArrowUp':
        event.preventDefault();
        focusRow(visibleNodes[position - 1]?.path);
        break;
      case 'ArrowRight':
        event.preventDefault();
        if (current.directChildCount === 0) break;
        if (isExpanded(current.path)) {
          focusRow(visibleNodes[position + 1]?.path);
        } else {
          toggleExpanded(current.path);
        }
        break;
      case 'ArrowLeft':
        event.preventDefault();
        if (current.directChildCount > 0 && isExpanded(current.path)) {
          toggleExpanded(current.path);
        } else if (current.parentPath !== null) {
          focusRow(current.parentPath);
        }
        break;
      case 'Home':
        event.preventDefault();
        focusRow(visibleNodes[0]?.path);
        break;
      case 'End':
        event.preventDefault();
        focusRow(visibleNodes[visibleNodes.length - 1]?.path);
        break;
      default:
        break;
    }
  }

  return (
    <div
      role="tree"
      aria-label="Directory tree"
      onKeyDown={onKeyDown}
      className="py-1 font-mono text-sm"
    >
      {visibleNodes.map((node) => {
        const expandable = node.directChildCount > 0;
        const expanded = expandable && isExpanded(node.path);
        const isSelected = node.path === selectedPath;

        return (
          <Link
            key={node.path}
            ref={(element) => {
              if (element === null) rowRefs.current.delete(node.path);
              else rowRefs.current.set(node.path, element);
            }}
            to={{ pathname: toTreeUrl(node.path), search: location.search }}
            role="treeitem"
            aria-level={node.depth + 1}
            aria-selected={isSelected}
            {...(expandable ? { 'aria-expanded': expanded } : {})}
            tabIndex={node.path === tabbablePath ? 0 : -1}
            onFocus={() => setFocusedPath(node.path)}
            style={{ paddingLeft: `${String(0.5 + node.depth * 0.875)}rem` }}
            className={`flex items-center gap-1.5 py-1 pr-3 ${
              isSelected ? 'bg-accent-soft/50 text-ink' : 'text-ink-muted hover:bg-panel-raised/70'
            }`}
          >
            <Chevron
              visible={expandable}
              expanded={expanded}
              onToggle={(event) => {
                // Keep the row a real link, but let the chevron only open or close it.
                event.preventDefault();
                event.stopPropagation();
                toggleExpanded(node.path);
              }}
            />
            <NodeIcon kind={node.kind} className={node.kind === 'folder' ? 'text-accent' : ''} />
            <span className="truncate">{node.name}</span>
            <span className="ml-auto pl-3 text-xs text-ink-faint/80 tabular-nums">
              {node.kind === 'file'
                ? formatSize(node.subtreeFileSize)
                : expandable
                  ? node.directChildCount
                  : 'empty'}
            </span>
          </Link>
        );
      })}
    </div>
  );
}

function Chevron({
  visible,
  expanded,
  onToggle,
}: {
  visible: boolean;
  expanded: boolean;
  onToggle: (event: MouseEvent<HTMLSpanElement>) => void;
}) {
  if (!visible) return <span className="inline-block size-4 shrink-0" aria-hidden="true" />;

  return (
    <span
      onClick={onToggle}
      aria-hidden="true"
      className="inline-flex size-4 shrink-0 items-center justify-center rounded text-ink-faint hover:bg-edge hover:text-ink"
    >
      <svg viewBox="0 0 16 16" className="size-3" fill="none">
        <path
          d={expanded ? 'M3 6l5 5 5-5' : 'M6 3l5 5-5 5'}
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

/**
 * Walks the pre-ordered index once. When a collapsed folder is met, every node
 * deeper than it is skipped until the traversal comes back up to its level.
 */
function collectVisibleNodes(
  index: TreeIndex,
  expandedPaths: ReadonlySet<string>,
): readonly IndexedNode[] {
  const visible: IndexedNode[] = [];
  let hiddenBelowDepth: number | null = null;

  for (const node of index.ordered) {
    if (hiddenBelowDepth !== null) {
      if (node.depth > hiddenBelowDepth) continue;
      hiddenBelowDepth = null;
    }

    visible.push(node);

    const collapsed = node.path !== ROOT_PATH && !expandedPaths.has(node.path);
    if (node.kind === 'folder' && node.directChildCount > 0 && collapsed) {
      hiddenBelowDepth = node.depth;
    }
  }

  return visible;
}
