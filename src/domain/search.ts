import { ROOT_PATH } from './nodePath';
import type { TreeIndex } from './buildIndex';
import type { NodeKind } from './types';

/**
 * Name search across the whole tree.
 *
 * The index already holds every node with its full path in document order, so a
 * search is a single linear scan with no tree walking and no sorting. Hits are
 * reported in document order, which keeps results stable while typing.
 */

export interface SearchHit {
  readonly path: string;
  readonly name: string;
  readonly kind: NodeKind;
  /** Offsets of the matched part of the name, for highlighting. */
  readonly matchStart: number;
  readonly matchEnd: number;
}

export interface SearchOutcome {
  /** The normalised query that produced these hits. */
  readonly query: string;
  readonly hits: readonly SearchHit[];
  readonly totalMatches: number;
  /** True when `totalMatches` exceeded the limit and `hits` is a prefix. */
  readonly truncated: boolean;
}

export const MAX_SEARCH_HITS = 200;

export const EMPTY_SEARCH: SearchOutcome = {
  query: '',
  hits: [],
  totalMatches: 0,
  truncated: false,
};

export function searchTree(
  index: TreeIndex,
  rawQuery: string,
  limit: number = MAX_SEARCH_HITS,
): SearchOutcome {
  const query = rawQuery.trim();
  if (query === '') return EMPTY_SEARCH;

  const needle = query.toLocaleLowerCase();
  const hits: SearchHit[] = [];
  let totalMatches = 0;

  for (const entry of index.ordered) {
    // The root is always one click away, so it is not a useful search result.
    if (entry.path === ROOT_PATH) continue;

    const matchStart = entry.name.toLocaleLowerCase().indexOf(needle);
    if (matchStart === -1) continue;

    totalMatches += 1;
    if (hits.length < limit) {
      hits.push({
        path: entry.path,
        name: entry.name,
        kind: entry.kind,
        matchStart,
        matchEnd: matchStart + needle.length,
      });
    }
  }

  return { query, hits, totalMatches, truncated: totalMatches > hits.length };
}
