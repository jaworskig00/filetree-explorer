import { useEffect, useState, type ReactNode } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { EmptyState } from '../components/EmptyState';
import { NodeIcon } from '../components/NodeIcon';
import type { IndexedNode, TreeIndex } from '../domain/buildIndex';
import { formatSize } from '../domain/formatSize';
import { ancestorPathsOf, pathFromSplat, ROOT_PATH, toTreeUrl } from '../domain/nodePath';
import { useTreeDocument } from '../state/treeDocument';

/**
 * Details of one node, addressed by the `/tree/*` splat.
 *
 * The brief writes the route as `/tree/:nodePath` with a value like
 * `src/components/Button.tsx`. A plain dynamic segment cannot hold the slashes,
 * so the route is a splat and the path is rebuilt from it; see `nodePath.ts`.
 */
export default function NodeDetailsPage() {
  const { document, expandPaths } = useTreeDocument();
  const params = useParams();
  const path = pathFromSplat(params['*']);

  // A deep link should arrive with the tree already opened down to the node.
  useEffect(() => {
    expandPaths(ancestorPathsOf(path));
  }, [path, expandPaths]);

  if (document === null) {
    return (
      <EmptyState
        title="No tree is loaded"
        description="This link points at a node inside a tree, but nothing is loaded in this tab. Load the JSON again to follow it."
      />
    );
  }

  const entry = document.index.byPath.get(path);
  if (entry === undefined) {
    return (
      <div className="space-y-3">
        <h2 className="text-base font-medium text-ink">No such node</h2>
        <p className="text-sm text-ink-faint">
          Nothing in <span className="text-ink-muted">{document.sourceName}</span> is at{' '}
          <code className="font-mono text-xs text-ink-muted">{path}</code>.
        </p>
        <Link
          to={toTreeUrl(ROOT_PATH)}
          className="inline-block text-sm text-accent underline-offset-4 hover:underline"
        >
          Back to the root
        </Link>
      </div>
    );
  }

  const rootName = document.root.name;
  const fullPath = path === ROOT_PATH ? rootName : `${rootName}/${path}`;

  return (
    <article className="space-y-6">
      <header className="space-y-3">
        <Breadcrumbs path={path} rootName={rootName} />
        <div className="flex items-center gap-2.5">
          <NodeIcon
            kind={entry.kind}
            className={`size-5 ${entry.kind === 'folder' ? 'text-accent' : 'text-ink-muted'}`}
          />
          <h1 className="font-mono text-lg font-medium break-all text-ink">{entry.name}</h1>
          <span className="rounded border border-edge px-1.5 py-0.5 text-xs text-ink-faint">
            {entry.kind}
          </span>
        </div>
        <FullPath value={fullPath} />
      </header>

      {entry.kind === 'file' ? (
        <FileDetails entry={entry} />
      ) : (
        <FolderDetails entry={entry} index={document.index} />
      )}

      {entry.parentPath !== null && (
        <footer className="border-t border-edge pt-4">
          <Link
            to={toTreeUrl(entry.parentPath)}
            className="font-mono text-sm text-accent underline-offset-4 hover:underline"
          >
            ← {entry.parentPath === ROOT_PATH ? rootName : entry.parentPath}
          </Link>
        </footer>
      )}
    </article>
  );
}

function FileDetails({ entry }: { entry: IndexedNode }) {
  const size = entry.subtreeFileSize;
  const hasDeclaredSize = entry.node.type === 'file' && entry.node.size !== undefined;

  return (
    <dl className="grid gap-4 sm:grid-cols-2">
      <Stat label="Size">
        <span className="text-ink">{formatSize(size)}</span>
        {size >= 1024 && (
          <span className="ml-2 text-sm text-ink-faint tabular-nums">
            {size.toLocaleString('en-US')} bytes
          </span>
        )}
        {!hasDeclaredSize && (
          <span className="ml-2 text-sm text-ink-faint">(no size in the input)</span>
        )}
      </Stat>
      <Stat label="Depth">
        <span className="text-ink tabular-nums">{entry.depth}</span>
        <span className="ml-2 text-sm text-ink-faint">levels below the root</span>
      </Stat>
    </dl>
  );
}

function FolderDetails({ entry, index }: { entry: IndexedNode; index: TreeIndex }) {
  const location = useLocation();
  const children = entry.childPaths
    .map((childPath) => index.byPath.get(childPath))
    .filter((child): child is IndexedNode => child !== undefined);

  return (
    <div className="space-y-6">
      <dl className="grid gap-4 sm:grid-cols-3">
        <Stat label="Direct children">
          <span className="text-ink tabular-nums">{entry.directChildCount}</span>
        </Stat>
        <Stat label="Total size of all files">
          <span className="text-ink">{formatSize(entry.subtreeFileSize)}</span>
        </Stat>
        <Stat label="In this subtree">
          <span className="text-ink tabular-nums">{entry.subtreeFileCount}</span>
          <span className="ml-1 text-sm text-ink-faint">
            {entry.subtreeFileCount === 1 ? 'file' : 'files'}
          </span>
          <span className="mx-1.5 text-ink-faint">·</span>
          <span className="text-ink tabular-nums">{entry.subtreeFolderCount}</span>
          <span className="ml-1 text-sm text-ink-faint">
            {entry.subtreeFolderCount === 1 ? 'folder' : 'folders'}
          </span>
        </Stat>
      </dl>

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-ink">Contents</h2>
        {children.length === 0 ? (
          <p className="rounded-md border border-edge border-dashed px-4 py-6 text-sm text-ink-faint">
            This folder is empty.
          </p>
        ) : (
          <ul className="divide-y divide-edge/70 overflow-hidden rounded-md border border-edge">
            {children.map((child) => (
              <li key={child.path}>
                <Link
                  to={{ pathname: toTreeUrl(child.path), search: location.search }}
                  className="flex items-center gap-2 px-3 py-2 hover:bg-panel-raised/70"
                >
                  <NodeIcon
                    kind={child.kind}
                    className={child.kind === 'folder' ? 'text-accent' : 'text-ink-faint'}
                  />
                  <span className="truncate font-mono text-sm text-ink">{child.name}</span>
                  <span className="ml-auto pl-3 text-xs text-ink-faint tabular-nums">
                    {child.kind === 'file'
                      ? formatSize(child.subtreeFileSize)
                      : `${String(child.directChildCount)} ${
                          child.directChildCount === 1 ? 'item' : 'items'
                        }`}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rounded-md border border-edge bg-panel/50 px-4 py-3">
      <dt className="text-xs tracking-wide text-ink-faint uppercase">{label}</dt>
      <dd className="mt-1 text-base">{children}</dd>
    </div>
  );
}

/** The full path from the root, with a copy action since paths are what gets pasted. */
function FullPath({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard access can be denied; the path is selectable either way.
    }
  }

  return (
    <div className="flex items-start gap-2">
      <code className="min-w-0 flex-1 rounded border border-edge bg-canvas px-2.5 py-1.5 font-mono text-xs break-all text-ink-muted">
        {value}
      </code>
      <button
        type="button"
        onClick={() => void copy()}
        className="shrink-0 rounded border border-edge px-2 py-1.5 text-xs text-ink-faint hover:bg-panel-raised hover:text-ink"
      >
        {copied ? 'Copied' : 'Copy path'}
      </button>
    </div>
  );
}
