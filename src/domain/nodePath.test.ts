import { describe, expect, it } from 'vitest';
import {
  ancestorPathsOf,
  encodePathToUrl,
  isRootPath,
  joinPath,
  nodeNameOf,
  parentPathOf,
  pathFromSplat,
  pathSegments,
  ROOT_PATH,
  toTreeUrl,
} from './nodePath';

const BUTTON = 'src/components/Button.tsx';

describe('path building', () => {
  it('treats the empty path as the root', () => {
    expect(isRootPath(ROOT_PATH)).toBe(true);
    expect(pathSegments(ROOT_PATH)).toEqual([]);
    expect(parentPathOf(ROOT_PATH)).toBeNull();
  });

  it('joins names into the path format used by the brief', () => {
    const src = joinPath(ROOT_PATH, 'src');
    const components = joinPath(src, 'components');
    expect(joinPath(components, 'Button.tsx')).toBe(BUTTON);
  });

  it('splits a path into its parts', () => {
    expect(pathSegments(BUTTON)).toEqual(['src', 'components', 'Button.tsx']);
    expect(nodeNameOf(BUTTON)).toBe('Button.tsx');
    expect(parentPathOf(BUTTON)).toBe('src/components');
    expect(parentPathOf('src')).toBe(ROOT_PATH);
  });

  it('lists ancestors root first, excluding the node itself', () => {
    expect(ancestorPathsOf(BUTTON)).toEqual([ROOT_PATH, 'src', 'src/components']);
    expect(ancestorPathsOf('src')).toEqual([ROOT_PATH]);
    expect(ancestorPathsOf(ROOT_PATH)).toEqual([]);
  });
});

describe('url form', () => {
  it('keeps separators readable and the root at /tree', () => {
    expect(toTreeUrl(ROOT_PATH)).toBe('/tree');
    expect(toTreeUrl(BUTTON)).toBe('/tree/src/components/Button.tsx');
  });

  it('encodes each segment on its own', () => {
    expect(encodePathToUrl('src/my components')).toBe('src/my%20components');
    expect(encodePathToUrl('src/a#b')).toBe('src/a%23b');
    expect(encodePathToUrl('src/100%.css')).toBe('src/100%25.css');
    expect(encodePathToUrl('src/a?b=c')).toBe('src/a%3Fb%3Dc');
    // A backslash is what the open-redirect advisory against React Router v6
    // relies on; encoding it per segment keeps it inside the path.
    expect(encodePathToUrl('src/a\\b')).toBe('src/a%5Cb');
  });

  it('reads the router splat back into a path', () => {
    expect(pathFromSplat(undefined)).toBe(ROOT_PATH);
    expect(pathFromSplat('')).toBe(ROOT_PATH);
    expect(pathFromSplat(BUTTON)).toBe(BUTTON);
  });

  it('ignores stray separators in the splat', () => {
    expect(pathFromSplat('src//components/')).toBe('src/components');
    expect(pathFromSplat('/')).toBe(ROOT_PATH);
  });

  it('round-trips names that need encoding', () => {
    const path = joinPath(joinPath(ROOT_PATH, 'my dir'), '100% done#1.txt');
    const url = encodePathToUrl(path);
    // The router percent-decodes the splat before handing it over.
    expect(pathFromSplat(decodeURIComponent(url))).toBe(path);
  });
});
