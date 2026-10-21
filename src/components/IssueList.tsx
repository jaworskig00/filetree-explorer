import type { ValidationIssue } from '../domain/parseTree';

/**
 * Validation feedback. Errors block loading, warnings do not, and both are shown
 * with the location they point at so the user can go straight to it.
 */
export function IssueList({
  issues,
  tone,
  title,
}: {
  issues: readonly ValidationIssue[];
  tone: 'error' | 'warning';
  title: string;
}) {
  if (issues.length === 0) return null;

  const isError = tone === 'error';
  const frame = isError
    ? 'border-danger/50 bg-danger/10 text-danger'
    : 'border-warning/40 bg-warning/10 text-warning';

  return (
    <div
      className={`rounded-md border px-4 py-3 ${frame}`}
      role={isError ? 'alert' : 'status'}
      aria-live="polite"
    >
      <p className="text-sm font-medium">{title}</p>
      <ul className="mt-2 space-y-1">
        {issues.map((issue, position) => (
          <li key={`${issue.at}-${String(position)}`} className="text-sm">
            <code className="font-mono text-xs opacity-80">{issue.at}</code>
            <span className="mx-1.5 opacity-50">·</span>
            <span className="text-ink-muted">{issue.message}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
