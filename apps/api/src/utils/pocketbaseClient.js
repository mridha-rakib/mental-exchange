import dotenv from 'dotenv';
dotenv.config();
import Pocketbase from 'pocketbase';
import logger from './logger.js';

const rawPocketBaseHost = process.env.POCKETBASE_URL
    || (process.env.WEBSITE_DOMAIN
        ? `https://${process.env.WEBSITE_DOMAIN}/hcgi/platform`
        : 'http://127.0.0.1:8090');

const normalizePocketBaseHost = (host) => {
    try {
        const url = new URL(host);
        if (url.hostname === 'localhost') {
            url.hostname = '127.0.0.1';
        }
        return url.toString().replace(/\/$/, '');
    } catch {
        return host;
    }
};

const POCKETBASE_HOST = normalizePocketBaseHost(rawPocketBaseHost);

async function waitForHealth({ retries = 30, delayMs = 1000 } = {}) {
    for (let i = 1; i <= retries; i++) {
        try {
            const response = await fetch(`${POCKETBASE_HOST}/api/health`, { method: 'GET' });
            if (response.ok) {
                return;
            }
        } catch (err) {
            const message = err?.message || String(err);
            logger.warn(`PocketBase not ready (${message}), retrying (${i}/${retries})...`);
        }

        await new Promise((r) => setTimeout(r, delayMs));
    }

    throw new Error(`PocketBase health check failed after ${retries} retries`);
}

const pocketbaseClient = new Pocketbase(POCKETBASE_HOST);

pocketbaseClient.autoCancellation(false);

let authPromise = null;

pocketbaseClient.beforeSend = async function (url, options) {
    if (url.includes('/api/collections/_superusers/auth-with-password')) {
        return { url, options };
    }

    if (!pocketbaseClient.authStore.isValid && !authPromise) {
        authPromise = pocketbaseClient.collection('_superusers').authWithPassword(
            process.env.PB_SUPERUSER_EMAIL,
            process.env.PB_SUPERUSER_PASSWORD,
        ).finally(() => {
            authPromise = null;
        });
    }

    if (authPromise) {
        await authPromise;
    }

    if (pocketbaseClient.authStore.isValid && pocketbaseClient.authStore.token) {
        options.headers = options.headers || {};
        options.headers['Authorization'] = pocketbaseClient.authStore.token;
    }

    return { url, options };
};

(async () => {
    try {
        logger.info(`Connecting to PocketBase at ${POCKETBASE_HOST}`);
        await waitForHealth();

        if (!pocketbaseClient.authStore.isValid && !authPromise) {
            authPromise = pocketbaseClient.collection('_superusers').authWithPassword(
                process.env.PB_SUPERUSER_EMAIL,
                process.env.PB_SUPERUSER_PASSWORD,
            ).finally(() => {
                authPromise = null;
            });
        }
        
        if (authPromise) {
            await authPromise;
        }
        
        logger.info('PocketBase client initialized successfully');
    } catch (err) {
        logger.error('Failed to initialize PocketBase client:', err);

        process.exit(1);
    }
})();

export default pocketbaseClient;
export { POCKETBASE_HOST, pocketbaseClient };
