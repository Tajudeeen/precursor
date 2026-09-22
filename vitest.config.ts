import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['packages/**/tests/**/*.test.ts', 'apps/**/tests/**/*.test.ts', 'tests/**/*.test.ts'],
    deps: {
      optimizer: {
        web: { enabled: true },
      },
    },
  },
  resolve: {
    alias: {
      '@precursor/shared': path.resolve(__dirname, 'packages/shared/dist/index.js'),
      '@precursor/evm': path.resolve(__dirname, 'packages/evm/dist/index.js'),
      '@precursor/behavior-engine': path.resolve(__dirname, 'packages/behavior-engine/dist/index.js'),
      '@precursor/attack-analysis': path.resolve(__dirname, 'packages/attack-analysis/dist/index.js'),
      '@precursor/simulation': path.resolve(__dirname, 'packages/simulation/dist/index.js'),
      '@precursor/policy-engine': path.resolve(__dirname, 'packages/policy-engine/dist/index.js'),
    },
  },
});
