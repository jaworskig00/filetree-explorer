/**
 * Node paths and their URL form.
 *
 * A path is the slash-joined chain of names from the root's children down to the
 * node, exactly as the brief writes it: `src/components/Button.tsx`. The root
 * itself is the empty path, so it needs no name in the URL and the tree can be
 * re-rooted without invalidating links.
 *
 * `validateTree` rejects names containing a slash, which is what makes the plain
 * join unambiguous and the path readable in the address bar.
 */

export const ROOT_PATH = '';

const SEPARATOR = '/';

export function isRootPath(path: string): boolean {
  return path === ROOT_PATH;
}

export function pathSegments(path: string): string[] {
  return isRootPath(path) ? [] : path.split(SEPARATOR);
}

export function joinPath(parentPath: string, name: string): string {
  return isRootPath(parentPath) ? name : `${parentPath}${SEPARATOR}${name}`;
}

export function nodeNameOf(path: string): string {
  const segments = pathSegments(path);
  return segments[segments.length - 1] ?? ROOT_PATH;
}

export function parentPathOf(path: string): string | null {
  if (isRootPath(path)) return null;
  const segments = pathSegments(path);
  segments.pop();
  return segments.join(SEPARATOR);
}

/**
 * Every ancestor of `path`, root first, excluding the node itself:
 * `src/components/Button.tsx` -> ['', 'src', 'src/components'].
 */
export function ancestorPathsOf(path: string): string[] {
  const ancestors: string[] = [];
  let current = parentPathOf(path);
  while (current !== null) {
    ancestors.push(current);
    current = parentPathOf(current);
  }
  return ancestors.reverse();
}

/**
 * Encodes a path for the address bar. Each segment is encoded on its own so the
 * separators stay real slashes and the URL remains readable, while characters
 * that would otherwise change the URL's meaning (`#`, `?`, `%`, backslash) do not
 * survive into the path.
 */
export function encodePathToUrl(path: string): string {
  return pathSegments(path).map(encodeURIComponent).join(SEPARATOR);
}

/** The router link for a node: `/tree` for the root, `/tree/<encoded path>` otherwise. */
export function toTreeUrl(path: string): string {
  const encoded = encodePathToUrl(path);
  return encoded === '' ? '/tree' : `/tree/${encoded}`;
}

/**
 * Turns the `*` param of the `/tree/*` route back into a path.
 *
 * React Router has already percent-decoded the splat, so decoding again here
 * would be wrong (it would turn an encoded `%2F` inside a name into a separator).
 * Empty segments from trailing or doubled slashes are dropped.
 */
export function pathFromSplat(splat: string | undefined): string {
  if (splat === undefined || splat === '') return ROOT_PATH;
  return splat
    .split(SEPARATOR)
    .filter((segment) => segment.length > 0)
    .join(SEPARATOR);
}
