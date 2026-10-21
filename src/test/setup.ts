import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Testing Library only auto-cleans when Vitest globals are enabled. They are not,
// so that each test file states what it imports; the cleanup is wired up here.
afterEach(() => {
  cleanup();
});
