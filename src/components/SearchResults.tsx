import { Link, useLocation } from 'react-router-dom';
import { toTreeUrl } from '../domain/nodePath';
import type { SearchOutcome } from '../domain/search';
import { NodeIcon } from './NodeIcon';

/**
 * Search hits, each with the full path from the root, as the brief asks. The
 * links keep the current query string, so picking a result does not lose the
 * search it came from.
 */
export function SearchResults({ outcome }: { outcome: SearchOutcome }) {
  const location = useLocation();

  if (outcome.hits.length === 0) {
    return (
      <p className="px-4 py-6 text-sm text-ink-faint">
        Nothing matches <span className="font-mono text-ink-muted">{outcome.query}</span>.
      </p>
    );
  }

  return (
    <ul className="py-1">
      {outcome.hits.map((hit) => (
        <li key={hit.path}>
          <Link
            to={{ pathname: toTreeUrl(hit.path), search: location.search }}
            className="flex items-start gap-2 px-3 py-2 hover:bg-panel-raised/70"
          >
            <NodeIcon
              kind={hit.kind}
              className={`mt-0.5 ${hit.kind === 'folder' ? 'text-accent' : 'text-ink-faint'}`}
            />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-mono text-sm text-ink">
                {hit.name.slice(0, hit.matchStart)}
                <mark className="bg-accent/30 text-ink">
                  {hit.name.slice(hit.matchStart, hit.matchEnd)}
                </mark>
                {hit.name.slice(hit.matchEnd)}
              </span>
              <span className="block truncate font-mono text-xs text-ink-faint">{hit.path}</span>
            </span>
          </Link>
        </li>
      ))}

      {outcome.truncated && (
        <li className="px-3 py-2 text-xs text-ink-faint">
          Showing the first {outcome.hits.length} of {outcome.totalMatches} matches.
        </li>
      )}
    </ul>
  );
}
