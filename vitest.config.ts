import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['packages/**/tests/**/*.test.ts', 'apps/**/tests/**/*.test.ts'],
    deps: {
      optimizer: {
        web: { enabled: true },
      },
    },
  },
  resolve: {
    alias: {
      '@precursor/shared': './packages/shared/dist/index.js',
      '@precursor/evm': './packages/evm/dist/index.js',
      '@precursor/behavior-engine': './packages/behavior-engine/dist/index.js',
      '@precursor/attack-analysis': './packages/attack-analysis/dist/index.js',
      '@precursor/simulation': './packages/simulation/dist/index.js',
      '@precursor/policy-engine': './packages/policy-engine/dist/index.js',
    },
  },
});
