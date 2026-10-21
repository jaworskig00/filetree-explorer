export const SEARCH_PARAM = 'q';

/**
 * The query lives in the URL and this input renders it directly: no local copy,
 * so there is nothing to keep in sync and the back button, a reload and a shared
 * link all behave on their own. Responsiveness on large trees comes from
 * `useDeferredValue` around the results, not from a debounce timer here.
 */
export function SearchBar({
  query,
  onQueryChange,
  resultSummary,
}: {
  query: string;
  onQueryChange: (next: string) => void;
  resultSummary: string | null;
}) {
  return (
    <div className="space-y-1.5 border-b border-edge px-3 py-3">
      <label htmlFor="tree-search" className="sr-only">
        Search the tree by name
      </label>
      <div className="flex items-center gap-2">
        <input
          id="tree-search"
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search by name…"
          autoComplete="off"
          spellCheck={false}
          className="min-w-0 flex-1 rounded-md border border-edge bg-canvas px-3 py-1.5 text-sm text-ink placeholder:text-ink-faint/70"
        />
        {query !== '' && (
          <button
            type="button"
            onClick={() => onQueryChange('')}
            className="shrink-0 rounded border border-edge px-2 py-1.5 text-xs text-ink-faint hover:bg-panel-raised hover:text-ink"
          >
            Clear
          </button>
        )}
      </div>
      {resultSummary !== null && (
        <p className="text-xs text-ink-faint" role="status" aria-live="polite">
          {resultSummary}
        </p>
      )}
    </div>
  );
}
