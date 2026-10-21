import { Link, NavLink, Outlet } from 'react-router-dom';
import { useTreeDocument } from '../state/treeDocument';

export function AppLayout() {
  const { document, clear } = useTreeDocument();

  return (
    <div className="flex h-dvh flex-col bg-canvas text-ink">
      <header className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2 border-b border-edge px-5 py-3">
        <Link to="/" className="font-semibold tracking-tight text-ink">
          FileTree Explorer
        </Link>

        <nav className="flex items-center gap-1 text-sm">
          <HeaderLink to="/">Load</HeaderLink>
          <HeaderLink to="/tree">Tree</HeaderLink>
        </nav>

        {document !== null && (
          <div className="ml-auto flex items-center gap-3 text-xs text-ink-faint">
            <span
              className="max-w-56 truncate font-mono text-ink-muted"
              title={document.sourceName}
            >
              {document.sourceName}
            </span>
            <span aria-hidden="true" className="opacity-40">
              |
            </span>
            <span className="tabular-nums">{document.index.nodeCount} nodes</span>
            <button
              type="button"
              onClick={clear}
              className="rounded border border-edge px-2 py-1 text-ink-faint hover:bg-panel-raised hover:text-ink"
            >
              Unload
            </button>
          </div>
        )}
      </header>

      <main className="flex min-h-0 flex-1 flex-col">
        <Outlet />
      </main>
    </div>
  );
}

function HeaderLink({ to, children }: { to: string; children: string }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        `rounded-md px-2 py-1 ${
          isActive ? 'bg-panel-raised text-ink' : 'text-ink-faint hover:text-ink'
        }`
      }
    >
      {children}
    </NavLink>
  );
}
