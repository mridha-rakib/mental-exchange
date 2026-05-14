#!/usr/bin/env node

import { spawnSync } from 'node:child_process';

const run = (command, args, options = {}) => spawnSync(command, args, {
	stdio: 'inherit',
	shell: process.platform === 'win32',
	...options
});

const llmsResult = run('node', ['tools/generate-llms.js']);

if (llmsResult.status !== 0) {
	console.warn('Skipping llms.txt generation; continuing with the Vite build.');
}

const viteResult = run('vite', ['build', '--outDir', '../../dist/apps/web']);

process.exit(viteResult.status ?? 1);
