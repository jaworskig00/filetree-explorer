import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-20 text-center">
      <p className="font-mono text-sm text-ink-faint">404</p>
      <h1 className="mt-2 text-xl font-semibold text-ink">This page does not exist</h1>
      <p className="mt-2 text-sm text-ink-faint">
        The app has a home page for loading a tree and a tree view for browsing it.
      </p>
      <Link
        to="/"
        className="mt-6 inline-block rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-canvas hover:opacity-90"
      >
        Go to the home page
      </Link>
    </div>
  );
}
