import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['**/*.{test,spec}.{js,mjs,ts}'],
    // jsdom for DOM APIs
    environment: 'jsdom',
    mockReset: true,
  },
});
