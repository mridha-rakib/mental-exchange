import dotenv from 'dotenv';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const apiRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

dotenv.config({ path: resolve(process.cwd(), '.env') });
dotenv.config({ path: resolve(apiRoot, '.env') });
