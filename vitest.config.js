import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
    testTimeout: 15000,
    hookTimeout: 30000,
    // All integration tests share one Firestore emulator. Running files in
    // parallel would let one file's clearFirestore() wipe another file's
    // mid-test state. Serial execution also keeps the emulator's log output
    // legible when debugging.
    fileParallelism: false,
  },
});
