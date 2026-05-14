import { Buffer } from 'node:buffer';
import { expect, test } from '@playwright/test';

const createAuthToken = () => {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ exp: now + 60 * 60, type: 'auth' })).toString('base64url');
  return `${header}.${payload}.signature`;
};

const createUserRecord = (overrides = {}) => ({
  id: 'test_user',
  collectionId: '_pb_users_auth_',
  collectionName: 'users',
  email: 'test@example.test',
  emailVisibility: true,
  verified: true,
  name: 'Test User',
  phone: '',
  university: '',
  is_seller: false,
  is_admin: false,
  seller_username: 'test-seller',
  ...overrides,
});

const setupAuth = async (page, recordOverrides = {}) => {
  const record = createUserRecord(recordOverrides);
  const token = createAuthToken();

  await page.addInitScript(({ authRecord, authToken }) => {
    window.localStorage.setItem('language', 'DE');
    window.localStorage.setItem('pocketbase_auth', JSON.stringify({
      token: authToken,
      record: authRecord,
    }));
  }, { authRecord: record, authToken: token });
};

const setupApiMocks = async (page) => {
  await page.route('**/hcgi/api/**', async (route) => {
    const url = new URL(route.request().url());
    const apiPath = url.pathname.replace('/hcgi/api', '');

    if (apiPath.startsWith('/orders')) {
      await route.fulfill({
        json: {
          items: [],
          summary: {
            total: 0,
            active: 0,
            completed: 0,
          },
        },
      });
      return;
    }

    if (apiPath === '/learning/dashboard') {
      await route.fulfill({
        json: {
          hasAccess: false,
          subscription: null,
          package: null,
          availablePackages: [{
            id: 'pkg_start',
            slug: 'z3-start',
            title: 'Z3 Start',
            subtitle: 'Für selbstständiges Lernen',
            description: 'Demo package',
            priceAmount: 19,
            currency: 'eur',
            billingInterval: 'month',
          }],
          modules: [],
          recentlyOpened: [],
          progress: {
            percent: 0,
          },
        },
      });
      return;
    }

    if (apiPath === '/learning/subscription-details') {
      await route.fulfill({
        json: {
          subscription: null,
          package: null,
          invoices: [],
          paymentMethod: null,
        },
      });
      return;
    }

    await route.fulfill({ json: {} });
  });

  await page.route('**/hcgi/platform/api/collections/**', async (route) => {
    await route.fulfill({
      json: {
        page: 1,
        perPage: 50,
        totalItems: 0,
        totalPages: 0,
        items: [],
      },
    });
  });
};

const setupAuthenticatedPage = async (page, recordOverrides = {}) => {
  await setupApiMocks(page);
  await setupAuth(page, recordOverrides);
};

const accountNav = (page) => page.getByRole('navigation', { name: 'Konto' });

test.describe('account area navigation', () => {
  test('buyer pages share the account navigation and hide seller-only entries', async ({ page }) => {
    await setupAuthenticatedPage(page);

    await page.goto('/profile');

    const nav = accountNav(page);
    await expect(nav.getByRole('link', { name: 'Profil' })).toHaveAttribute('aria-current', 'page');
    await expect(nav.getByRole('link', { name: 'Bestellungen' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Abos' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'E-Learning' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Verkäufe' })).toHaveCount(0);
    await expect(nav.getByRole('link', { name: 'Einnahmen' })).toHaveCount(0);
    await expect(nav.getByRole('link', { name: 'Auszahlungen' })).toHaveCount(0);

    await nav.getByRole('link', { name: 'Bestellungen' }).click();

    await expect(page).toHaveURL(/\/my-orders/);
    await expect(page.getByRole('heading', { name: 'Meine Bestellungen' })).toBeVisible();
    await expect(accountNav(page).getByRole('link', { name: 'Bestellungen' })).toHaveAttribute('aria-current', 'page');
  });

  test('seller account links open the correct sales, revenue, and payout dashboard tabs', async ({ page }) => {
    await setupAuthenticatedPage(page, { is_seller: true });

    await page.goto('/seller-dashboard?tab=orders&account=sales');

    let nav = accountNav(page);
    await expect(nav.getByRole('link', { name: 'Verkäufe' })).toHaveAttribute('aria-current', 'page');
    await expect(page.getByRole('tab', { name: /Meine Bestellungen/ })).toHaveAttribute('aria-selected', 'true');

    await nav.getByRole('link', { name: 'Einnahmen' }).click();

    await expect(page).toHaveURL(/account=revenue/);
    nav = accountNav(page);
    await expect(nav.getByRole('link', { name: 'Einnahmen' })).toHaveAttribute('aria-current', 'page');
    await expect(page.getByRole('tab', { name: 'Einnahmen' })).toHaveAttribute('aria-selected', 'true');

    await nav.getByRole('link', { name: 'Auszahlungen' }).click();

    await expect(page).toHaveURL(/account=payouts/);
    await expect(accountNav(page).getByRole('link', { name: 'Auszahlungen' })).toHaveAttribute('aria-current', 'page');
    await expect(page.getByRole('tab', { name: 'Einnahmen' })).toHaveAttribute('aria-selected', 'true');
  });

  test('learning and subscription pages stay inside the same account area', async ({ page }) => {
    await setupAuthenticatedPage(page);

    await page.goto('/learning/dashboard');

    let nav = accountNav(page);
    await expect(nav.getByRole('link', { name: 'E-Learning' })).toHaveAttribute('aria-current', 'page');

    await nav.getByRole('link', { name: 'Abos' }).click();

    await expect(page).toHaveURL(/\/learning\/subscription/);
    nav = accountNav(page);
    await expect(nav.getByRole('link', { name: 'Abos' })).toHaveAttribute('aria-current', 'page');
    await expect(nav.getByRole('link', { name: 'Profil' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Bestellungen' })).toBeVisible();
  });
});
