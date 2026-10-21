import { useCallback, useDeferredValue, useMemo } from 'react';
import { Outlet, useMatch, useSearchParams } from 'react-router-dom';
import { EmptyState } from '../components/EmptyState';
import { IssueList } from '../components/IssueList';
import { SEARCH_PARAM, SearchBar } from '../components/SearchBar';
import { SearchResults } from '../components/SearchResults';
import { TreeView } from '../components/TreeView';
import { pathFromSplat, ROOT_PATH } from '../domain/nodePath';
import { EMPTY_SEARCH, searchTree } from '../domain/search';
import { useTreeDocument } from '../state/treeDocument';

/**
 * Layout for the tree routes: the tree (or the search results) on the left, the
 * selected node on the right through the nested route's outlet.
 */
export default function TreePage() {
  const { document } = useTreeDocument();
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get(SEARCH_PARAM) ?? '';

  const setQuery = useCallback(
    (next: string) => {
      setSearchParams(
        (current) => {
          const params = new URLSearchParams(current);
          if (next.trim() === '') params.delete(SEARCH_PARAM);
          else params.set(SEARCH_PARAM, next);
          return params;
        },
        // Replace, so a single search does not leave one history entry per keystroke.
        { replace: true },
      );
    },
    [setSearchParams],
  );

  // `/tree` selects the root; `/tree/<path>` selects that node.
  const detailsMatch = useMatch('/tree/*');
  const selectedPath = detailsMatch === null ? ROOT_PATH : pathFromSplat(detailsMatch.params['*']);

  // The input stays on the current query while the result list catches up.
  const deferredQuery = useDeferredValue(query);
  const searchOutcome = useMemo(
    () => (document === null ? EMPTY_SEARCH : searchTree(document.index, deferredQuery)),
    [document, deferredQuery],
  );

  if (document === null) {
    return (
      <div className="mx-auto w-full max-w-2xl overflow-y-auto px-6 py-16">
        <EmptyState
          title="No tree is loaded"
          description="Paste or upload a JSON directory tree and it will show up here. Nothing is sent anywhere: the document stays in this tab."
        />
      </div>
    );
  }

  const isSearching = query.trim() !== '';
  const resultSummary = isSearching
    ? `${String(searchOutcome.totalMatches)} ${
        searchOutcome.totalMatches === 1 ? 'match' : 'matches'
      } for “${searchOutcome.query}”`
    : null;

  return (
    <div className="grid min-h-0 flex-1 md:grid-cols-[21rem_1fr]">
      <aside className="flex min-h-0 flex-col border-b border-edge md:border-r md:border-b-0">
        <SearchBar query={query} onQueryChange={setQuery} resultSummary={resultSummary} />
        <div className="min-h-0 flex-1 overflow-y-auto">
          {isSearching ? (
            <SearchResults outcome={searchOutcome} />
          ) : (
            <TreeView index={document.index} selectedPath={selectedPath} />
          )}
        </div>
      </aside>

      <section className="min-h-0 min-w-0 overflow-y-auto px-6 py-6">
        <div className="mx-auto max-w-3xl space-y-6">
          {document.warnings.length > 0 && (
            <IssueList
              issues={document.warnings}
              tone="warning"
              title="Loaded, with things worth knowing"
            />
          )}
          {!document.persisted && (
            <p className="rounded-md border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning">
              This document is too large for session storage, so a reload will lose it.
            </p>
          )}
          <Outlet />
        </div>
      </section>
    </div>
  );
}
