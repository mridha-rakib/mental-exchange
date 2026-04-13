import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const appDir = resolve(scriptDir, '..');

loadEnv(resolve(appDir, '.env'));

const executable = process.platform === 'win32' ? 'pocketbase.exe' : 'pocketbase';
const binaryPath = resolve(appDir, executable);

if (!existsSync(binaryPath)) {
  const setupHint = process.platform === 'win32'
    ? 'Run "npm run setup:windows --prefix apps/pocketbase" to download pocketbase.exe.'
    : `Expected PocketBase binary at ${binaryPath}.`;

  console.error(setupHint);
  process.exit(1);
}

const child = spawn(binaryPath, process.argv.slice(2), {
  cwd: appDir,
  env: process.env,
  stdio: 'inherit',
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 1);
});

function loadEnv(filePath) {
  if (!existsSync(filePath)) {
    return;
  }

  const contents = readFileSync(filePath, 'utf8');

  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"'))
      || (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}
