import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';

// Single project ID across all test files — `firebase emulators:exec`
// scopes us to the same emulator instance, so sharing the project keeps
// things simple. `clearFirestore()` between tests isolates state.
const PROJECT_ID = 'demo-animelegacy';

export const newTestEnv = () =>
  initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync(resolve('firestore.rules'), 'utf8'),
      host: '127.0.0.1',
      port: 8080,
    },
  });
