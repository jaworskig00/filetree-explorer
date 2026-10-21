import { Link } from 'react-router-dom';
import { JsonInputPanel } from '../components/JsonInputPanel';
import { useTreeDocument } from '../state/treeDocument';

export default function HomePage() {
  const { document } = useTreeDocument();

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-xl font-semibold tracking-tight text-ink">Load a directory tree</h1>
      <p className="mt-2 max-w-2xl text-sm text-ink-faint">
        Every node needs a <code className="font-mono text-xs">name</code> and a{' '}
        <code className="font-mono text-xs">type</code> of{' '}
        <code className="font-mono text-xs">file</code> or{' '}
        <code className="font-mono text-xs">folder</code>. Files may carry a{' '}
        <code className="font-mono text-xs">size</code> in bytes, folders may carry{' '}
        <code className="font-mono text-xs">children</code>.
      </p>

      {document !== null && (
        <p className="mt-6 rounded-md border border-edge bg-panel/60 px-4 py-3 text-sm text-ink-muted">
          <span className="text-ink">{document.sourceName}</span> is still loaded.{' '}
          <Link to="/tree" className="text-accent underline-offset-4 hover:underline">
            Back to the tree
          </Link>
          , or load something else below.
        </p>
      )}

      <div className="mt-6">
        <JsonInputPanel />
      </div>
    </div>
  );
}
