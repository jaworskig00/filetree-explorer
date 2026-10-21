import { Link, useLocation } from 'react-router-dom';
import { joinPath, pathSegments, ROOT_PATH, toTreeUrl } from '../domain/nodePath';

/**
 * The chain from the root down to the current node. Path segments are the node
 * names themselves, so the trail needs no extra lookups.
 */
export function Breadcrumbs({ path, rootName }: { path: string; rootName: string }) {
  const location = useLocation();
  const segments = pathSegments(path);

  const trail = segments.map((name, position) => ({
    name,
    path: segments.slice(0, position + 1).reduce((acc, part) => joinPath(acc, part), ROOT_PATH),
  }));

  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-1 font-mono text-xs text-ink-faint">
        <li>
          {path === ROOT_PATH ? (
            <span className="text-ink-muted">{rootName}</span>
          ) : (
            <Link
              to={{ pathname: toTreeUrl(ROOT_PATH), search: location.search }}
              className="hover:text-accent hover:underline"
            >
              {rootName}
            </Link>
          )}
        </li>
        {trail.map((step, position) => {
          const isLast = position === trail.length - 1;
          return (
            <li key={step.path} className="flex items-center gap-1">
              <span aria-hidden="true" className="opacity-50">
                /
              </span>
              {isLast ? (
                <span aria-current="page" className="text-ink-muted">
                  {step.name}
                </span>
              ) : (
                <Link
                  to={{ pathname: toTreeUrl(step.path), search: location.search }}
                  className="hover:text-accent hover:underline"
                >
                  {step.name}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
