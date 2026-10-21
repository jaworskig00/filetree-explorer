import type { NodeKind } from '../domain/types';

/** Folder or file glyph. Decorative: the row text already says what the node is. */
export function NodeIcon({ kind, className = '' }: { kind: NodeKind; className?: string }) {
  const shared = `size-4 shrink-0 ${className}`;

  if (kind === 'folder') {
    return (
      <svg className={shared} viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path
          d="M1.5 4.25A1.75 1.75 0 0 1 3.25 2.5h2.6c.46 0 .9.18 1.23.5l.84.84h5.08c.97 0 1.75.78 1.75 1.75v6.16c0 .97-.78 1.75-1.75 1.75H3.25c-.97 0-1.75-.78-1.75-1.75V4.25Z"
          fill="currentColor"
          opacity="0.85"
        />
      </svg>
    );
  }

  return (
    <svg className={shared} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M3.5 2.5c0-.55.45-1 1-1h4.3c.27 0 .52.1.71.29l3.2 3.2c.19.19.29.44.29.7v7.81c0 .55-.45 1-1 1h-7.5c-.55 0-1-.45-1-1V2.5Z"
        fill="currentColor"
        opacity="0.75"
      />
      <path d="M8.75 1.75V5.5c0 .28.22.5.5.5h3.75" stroke="var(--color-canvas)" strokeWidth="1" />
    </svg>
  );
}
