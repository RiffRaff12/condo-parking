import { defineConfig } from 'vitest/config'
export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    env: { TZ: 'Asia/Kuala_Lumpur' },
    exclude: ['**/node_modules/**', '**/tests/integration/**'],
  },
})
