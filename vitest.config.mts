import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';

const firestoreEmulatorAvailable = Boolean(process.env.FIRESTORE_EMULATOR_HOST);

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    exclude: firestoreEmulatorAvailable
      ? ['**/node_modules/**', '**/.git/**', '**/.next/**']
      : ['tests/firestore.rules.test.ts', '**/node_modules/**', '**/.git/**', '**/.next/**'],
  },
});
