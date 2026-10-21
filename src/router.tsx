import { createBrowserRouter } from 'react-router-dom';
import { AppLayout } from './components/AppLayout';
import HomePage from './pages/HomePage';
import NodeDetailsPage from './pages/NodeDetailsPage';
import NotFoundPage from './pages/NotFoundPage';
import TreePage from './pages/TreePage';

/**
 * Routes from the brief:
 *
 *   /                 load a tree
 *   /tree             the tree, with the root selected
 *   /tree/<path>      the tree, with that node selected
 *
 * `/tree/*` is a splat rather than `:nodePath` because a node path contains
 * slashes, which a dynamic segment does not match.
 */
export const routes = [
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <HomePage /> },
      {
        path: 'tree',
        element: <TreePage />,
        children: [
          { index: true, element: <NodeDetailsPage /> },
          { path: '*', element: <NodeDetailsPage /> },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];

export const router = createBrowserRouter(routes, {
  // '/' in development, '/filetree-explorer/' when built for GitHub Pages.
  basename: import.meta.env.BASE_URL,
});
