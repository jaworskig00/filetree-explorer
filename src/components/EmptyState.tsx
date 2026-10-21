import { Link } from 'react-router-dom';

/** Shown on the tree routes when no document is loaded, e.g. a shared deep link. */
export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center gap-3 rounded-lg border border-edge border-dashed px-6 py-12 text-center">
      <h2 className="text-base font-medium text-ink">{title}</h2>
      <p className="max-w-md text-sm text-ink-faint">{description}</p>
      <Link
        to="/"
        className="mt-2 rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-canvas hover:opacity-90"
      >
        Load a tree
      </Link>
    </div>
  );
}
