import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { routes } from './router';
import { TreeProvider } from './state/TreeProvider';
import { writeStoredDocument } from './state/persistence';
import { BRIEF_TREE_JSON } from './test/fixtures';

/**
 * These exercise the real router and the real session storage, because the
 * behaviour worth proving here is exactly the part that spans them: a deep link
 * that survives a reload, and a search that does the same.
 */

function renderApp(initialEntries: string[] = ['/']) {
  const router = createMemoryRouter(routes, { initialEntries });
  const view = render(
    <TreeProvider>
      <RouterProvider router={router} />
    </TreeProvider>,
  );
  return { router, ...view };
}

/** Puts a document in storage the way a previous visit would have left it. */
function seedStoredDocument() {
  writeStoredDocument({
    json: BRIEF_TREE_JSON,
    sourceName: 'brief.json',
    loadedAt: new Date('2026-01-01T10:00:00Z').toISOString(),
  });
}

function tree() {
  return screen.getByRole('tree');
}

/** The details panel, so assertions do not also match the tree on the left. */
function details() {
  return screen.getByRole('article');
}

beforeEach(() => {
  window.sessionStorage.clear();
});

describe('loading a document', () => {
  it('validates pasted JSON and moves to the tree', async () => {
    const user = userEvent.setup();
    const { router } = renderApp();

    await user.click(screen.getByLabelText('Directory tree as JSON'));
    await user.paste(BRIEF_TREE_JSON);
    await user.click(screen.getByRole('button', { name: 'Visualise tree' }));

    expect(router.state.location.pathname).toBe('/tree');
    expect(within(tree()).getByRole('treeitem', { name: /^root/ })).toBeInTheDocument();
    expect(within(tree()).getByRole('treeitem', { name: /^src/ })).toBeInTheDocument();
    expect(within(tree()).getByRole('treeitem', { name: /^package\.json/ })).toBeInTheDocument();
  });

  it('keeps the user on the form and explains why when the JSON is wrong', async () => {
    const user = userEvent.setup();
    const { router } = renderApp();

    await user.click(screen.getByLabelText('Directory tree as JSON'));
    await user.paste('{ "name": "root", "type": "archive" }');
    await user.click(screen.getByRole('button', { name: 'Visualise tree' }));

    expect(router.state.location.pathname).toBe('/');
    expect(screen.getByRole('alert')).toHaveTextContent('root.type');
    expect(screen.getByRole('alert')).toHaveTextContent('Expected "file" or "folder"');
  });

  it('loads the bundled sample without touching the network', async () => {
    const user = userEvent.setup();
    const { router } = renderApp();

    await user.click(screen.getByRole('button', { name: 'Load a sample tree' }));

    expect(router.state.location.pathname).toBe('/tree');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('acme-dashboard');
  });
});

describe('node details by URL', () => {
  it('opens a file deep link, with the tree expanded down to it', () => {
    seedStoredDocument();
    renderApp(['/tree/src/components/Button.tsx']);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Button.tsx');
    expect(within(details()).getByText('512 B')).toBeInTheDocument();
    expect(screen.getByText('root/src/components/Button.tsx')).toBeInTheDocument();

    // The ancestors were opened, so the node is visible in the tree as well.
    const selected = within(tree()).getByRole('treeitem', { name: /^Button\.tsx/ });
    expect(selected).toHaveAttribute('aria-selected', 'true');
  });

  it('shows folder details: direct children and the size of the whole subtree', () => {
    seedStoredDocument();
    renderApp(['/tree/src']);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('src');
    expect(screen.getByText('Direct children').nextSibling).toHaveTextContent('2');
    expect(screen.getByText('Total size of all files').nextSibling).toHaveTextContent('1.5 KB');

    expect(within(details()).getByRole('link', { name: /index\.ts/ })).toHaveAttribute(
      'href',
      '/tree/src/index.ts',
    );
    expect(within(details()).getByRole('link', { name: /components/ })).toHaveAttribute(
      'href',
      '/tree/src/components',
    );
  });

  it('treats the root as a folder with details of its own', () => {
    seedStoredDocument();
    renderApp(['/tree']);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('root');
    // 1024 + 512 + 300 bytes across the whole tree.
    expect(within(details()).getByText('1.8 KB')).toBeInTheDocument();
  });

  it('says so when the path matches no node, instead of rendering nothing', () => {
    seedStoredDocument();
    renderApp(['/tree/src/does/not/exist.ts']);

    expect(screen.getByRole('heading', { name: 'No such node' })).toBeInTheDocument();
    expect(screen.getByText(/src\/does\/not\/exist\.ts/)).toBeInTheDocument();
  });

  it('explains an orphaned deep link when nothing is loaded in this tab', () => {
    renderApp(['/tree/src/components/Button.tsx']);

    expect(screen.getByRole('heading', { name: 'No tree is loaded' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Load a tree' })).toHaveAttribute('href', '/');
  });

  it('follows a path whose names need encoding', async () => {
    const user = userEvent.setup();
    const first = renderApp(['/']);

    // The sample tree contains a folder named "data table".
    await user.click(screen.getByRole('button', { name: 'Load a sample tree' }));
    first.unmount();

    const { router } = renderApp(['/tree/src/components/data table/DataTable.tsx']);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('DataTable.tsx');
    expect(
      screen.getByText('acme-dashboard/src/components/data table/DataTable.tsx'),
    ).toBeInTheDocument();
    // The link the tree builds for that node encodes the space, and resolves back.
    expect(within(tree()).getByRole('treeitem', { name: /^DataTable\.tsx/ })).toHaveAttribute(
      'href',
      '/tree/src/components/data%20table/DataTable.tsx',
    );
    expect(router.state.location.pathname).toBe('/tree/src/components/data table/DataTable.tsx');
  });
});

describe('surviving a reload', () => {
  it('restores the document and the selected node from session storage', () => {
    seedStoredDocument();

    const first = renderApp(['/tree/src/components/Button.tsx']);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Button.tsx');

    // A reload: everything in memory is gone, the URL and session storage remain.
    first.unmount();
    renderApp(['/tree/src/components/Button.tsx']);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Button.tsx');
    expect(screen.getByText('root/src/components/Button.tsx')).toBeInTheDocument();
  });

  it('keeps search results, because the query is part of the URL', async () => {
    const user = userEvent.setup();
    seedStoredDocument();

    const first = renderApp(['/tree']);
    await user.type(screen.getByLabelText('Search the tree by name'), 'button');

    const results = await screen.findByRole('link', { name: /Button\.tsx/ });
    expect(results).toBeInTheDocument();
    expect(screen.getByText('src/components/Button.tsx')).toBeInTheDocument();

    first.unmount();
    renderApp(['/tree?q=button']);

    expect(screen.getByLabelText('Search the tree by name')).toHaveValue('button');
    expect(screen.getByText('src/components/Button.tsx')).toBeInTheDocument();
    expect(screen.getByText('1 match for “button”')).toBeInTheDocument();
  });

  it('forgets a document that was explicitly unloaded', async () => {
    const user = userEvent.setup();
    seedStoredDocument();

    const first = renderApp(['/tree']);
    await user.click(screen.getByRole('button', { name: 'Unload' }));
    first.unmount();

    renderApp(['/tree']);
    expect(screen.getByRole('heading', { name: 'No tree is loaded' })).toBeInTheDocument();
  });
});

describe('keyboard navigation', () => {
  it('opens and closes folders with the arrow keys', async () => {
    const user = userEvent.setup();
    seedStoredDocument();
    renderApp(['/tree']);

    const src = within(tree()).getByRole('treeitem', { name: /^src/ });
    src.focus();
    expect(src).toHaveAttribute('aria-expanded', 'false');

    await user.keyboard('{ArrowRight}');
    expect(within(tree()).getByRole('treeitem', { name: /^src/ })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(within(tree()).getByRole('treeitem', { name: /^index\.ts/ })).toBeInTheDocument();

    await user.keyboard('{ArrowLeft}');
    expect(within(tree()).getByRole('treeitem', { name: /^src/ })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    expect(within(tree()).queryByRole('treeitem', { name: /^index\.ts/ })).not.toBeInTheDocument();
  });
});

describe('unknown routes', () => {
  it('shows a 404 page with a way back', () => {
    renderApp(['/nope']);

    expect(screen.getByRole('heading', { name: 'This page does not exist' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to the home page' })).toHaveAttribute('href', '/');
  });
});
