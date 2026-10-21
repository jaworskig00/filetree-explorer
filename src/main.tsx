import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import './index.css';
import { router } from './router';
import { TreeProvider } from './state/TreeProvider';

const container = document.getElementById('root');
if (container === null) throw new Error('Missing #root element.');

createRoot(container).render(
  <StrictMode>
    <TreeProvider>
      <RouterProvider router={router} />
    </TreeProvider>
  </StrictMode>,
);
