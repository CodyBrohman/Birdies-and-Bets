#!/usr/bin/env node
// Publish an over-the-air update, then upload its source maps to Sentry so crash reports show real file and line numbers.
//   npm run publish:preview -- "Fix the stepper"
//   npm run publish:production -- "Fix the stepper"
// The Sentry upload needs SENTRY_AUTH_TOKEN, SENTRY_ORG and SENTRY_PROJECT (in .env.local, which git ignores). Without
// them the update still publishes and the upload is skipped with a warning.
import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

const [branch, ...words] = process.argv.slice(2);
const message = words.join(' ').trim();
if (!['preview', 'production'].includes(branch) || !message) {
  console.error('Usage: npm run publish:<preview|production> -- "What changed"');
  process.exit(1);
}

// Load .env.local for the Sentry upload (eas update reads the EAS environment itself).
if (existsSync('.env.local')) {
  for (const line of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
    const m = /^\s*(SENTRY_[A-Z_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

const run = (cmd) => execSync(cmd, { stdio: 'inherit', env: process.env });

run(`npx eas update --branch ${branch} --platform ios --environment ${branch} --non-interactive --message ${JSON.stringify(message)}`);

if (process.env.SENTRY_AUTH_TOKEN && process.env.SENTRY_ORG && process.env.SENTRY_PROJECT) {
  run('npx sentry-expo-upload-sourcemaps dist');
} else {
  console.warn('\nSkipped the Sentry source-map upload: SENTRY_AUTH_TOKEN / SENTRY_ORG / SENTRY_PROJECT are not set.');
}
