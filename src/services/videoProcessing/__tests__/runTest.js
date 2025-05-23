/**
 * Simple script to run the Instagram service tests
 */

import { execSync } from 'child_process';

console.log('Running Instagram Service Tests...');

try {
  // Execute the TypeScript file directly using ts-node
  execSync('npx ts-node --esm src/services/videoProcessing/__tests__/instagramService.test.ts', { 
    stdio: 'inherit',
    env: { ...process.env }
  });
} catch (error) {
  console.error('Error running tests:', error.message);
  process.exit(1);
}
