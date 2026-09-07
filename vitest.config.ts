import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: [
      'lib/**/*.test.ts',
      'app/**/*.test.tsx',
      'components/**/*.test.tsx',
      'components/**/*.test.ts',
      'hooks/**/*.test.ts',
    ],
    setupFiles: ['./vitest.setup.ts'],
    // Prisma reads DATABASE_URL when the client is constructed at module import.
    // No test issues a query, so a dummy URL is enough (mirrors the CI check job).
    env: { DATABASE_URL: 'postgresql://ci:ci@localhost:5432/ci' },
    // Inline React and react-dom so all imports share one module instance.
    // Without this, @testing-library/react and component files may resolve to
    // separate copies of React, making the hooks dispatcher unavailable.
    server: {
      deps: {
        inline: ['react', 'react-dom', '@testing-library/react'],
      },
    },
  },
  resolve: {
    // Match the tsconfig `@/*` path alias so imported modules resolve.
    alias: { '@': fileURLToPath(new URL('.', import.meta.url)) },
  },
});
