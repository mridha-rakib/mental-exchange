import { Buffer } from 'node:buffer';
import { expect, test } from '@playwright/test';

const createAuthToken = () => {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ exp: now + 60 * 60, type: 'auth' })).toString('base64url');
  return `${header}.${payload}.signature`;
};

const testUser = {
  id: 'mobile_user',
  collectionId: '_pb_users_auth_',
  collectionName: 'users',
  email: 'mobile@example.test',
  emailVisibility: true,
  verified: true,
  name: 'Mobile Admin Seller',
  phone: '',
  university: '',
  seller_username: 'mobile-seller',
  is_seller: true,
  is_admin: true,
};

const product = {
  id: 'product_mobile',
  collectionId: 'products',
  collectionName: 'products',
  name: 'Mobile Test Product',
  description: 'A product used for mobile layout checks.',
  price: 49,
  condition: 'Gut',
  status: 'active',
  product_type: 'Article',
  fachbereich: ['Kons'],
  seller_id: testUser.id,
  seller_username: testUser.seller_username,
};

const learningPackage = {
  id: 'pkg_mobile',
  slug: 'z3-start',
  title: 'Z3 Start',
  subtitle: 'Mobile learning package',
  description: 'A learning package used for mobile layout checks.',
  priceAmount: 19,
  currency: 'eur',
  billingInterval: 'month',
  moduleCount: 1,
  lessonCount: 1,
  valuePoints: ['Mobile friendly lessons'],
  status: 'published',
};

const genericList = (items = []) => ({
  page: 1,
  perPage: 50,
  totalItems: items.length,
  totalPages: items.length ? 1 : 0,
  items,
});

const setupAuth = async (page) => {
  await page.addInitScript(({ authRecord, authToken }) => {
    window.localStorage.setItem('language', 'EN');
    window.localStorage.setItem('pocketbase_auth', JSON.stringify({
      token: authToken,
      record: authRecord,
    }));
  }, { authRecord: testUser, authToken: createAuthToken() });
};

const setupApiMocks = async (page) => {
  await page.route('**/hcgi/api/**', async (route) => {
    const url = new URL(route.request().url());
    const apiPath = url.pathname.replace('/hcgi/api', '');

    if (apiPath.startsWith('/marketplace/products')) {
      await route.fulfill({ json: { ...genericList([product]), filters: [] } });
      return;
    }

    if (apiPath.startsWith('/shop/products')) {
      await route.fulfill({ json: { ...genericList([{ ...product, source: 'shop' }]), filters: [] } });
      return;
    }

    if (apiPath.startsWith('/orders')) {
      await route.fulfill({ json: { items: [], summary: { total: 0, active: 0, completed: 0 } } });
      return;
    }

    if (apiPath === '/learning/packages' || apiPath === '/learning/package-selector') {
      await route.fulfill({ json: { items: [learningPackage], packages: [learningPackage] } });
      return;
    }

    if (apiPath === '/learning/dashboard') {
      await route.fulfill({
        json: {
          hasAccess: true,
          subscription: null,
          package: learningPackage,
          availablePackages: [learningPackage],
          modules: [],
          recentlyOpened: [],
          progress: { percent: 0 },
        },
      });
      return;
    }

    if (apiPath === '/learning/subscription-details') {
      await route.fulfill({ json: { subscription: null, package: learningPackage, invoices: [], paymentMethod: null } });
      return;
    }

    if (apiPath.startsWith('/seller/')) {
      await route.fulfill({
        json: {
          items: [],
          summary: {},
          available_amount: 0,
          pending_amount: 0,
          waiting_amount: 0,
          blocked_amount: 0,
          currency: 'EUR',
          onboarding_status: 'not_started',
          payouts_enabled: false,
        },
      });
      return;
    }

    await route.fulfill({ json: {} });
  });

  await page.route('**/hcgi/platform/api/collections/products/records/product_mobile**', async (route) => {
    await route.fulfill({ json: product });
  });

  await page.route('**/hcgi/platform/api/collections/shop_products/records/product_mobile**', async (route) => {
    await route.fulfill({ json: { ...product, collectionName: 'shop_products', source: 'shop' } });
  });

  await page.route('**/hcgi/platform/api/collections/**', async (route) => {
    const url = new URL(route.request().url());

    if (url.pathname.includes('/users/records/')) {
      await route.fulfill({ json: testUser });
      return;
    }

    if (url.pathname.includes('/products/records')) {
      await route.fulfill({ json: genericList([product]) });
      return;
    }

    await route.fulfill({ json: genericList([]) });
  });
};

const assertNoHorizontalOverflow = async (page, routePath) => {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(250);

  const metrics = await page.evaluate(() => {
    const root = document.documentElement;
    const body = document.body;
    const viewportWidth = Math.max(root.clientWidth, window.innerWidth);
    const scrollWidth = Math.max(root.scrollWidth, body.scrollWidth);
    const offenders = Array.from(body.querySelectorAll('*'))
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          tag: element.tagName.toLowerCase(),
          className: typeof element.className === 'string' ? element.className.slice(0, 160) : '',
          left: Math.round(rect.left),
          right: Math.round(rect.right),
          width: Math.round(rect.width),
        };
      })
      .filter((item) => item.width > 0 && (item.right > viewportWidth + 2 || item.left < -2))
      .slice(0, 5);

    return { viewportWidth, scrollWidth, offenders };
  });

  expect(
    metrics.scrollWidth,
    `${routePath} overflowed mobile viewport: ${JSON.stringify(metrics.offenders, null, 2)}`
  ).toBeLessThanOrEqual(metrics.viewportWidth + 2);
};

test.describe('mobile layout smoke', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
  });

  test('public pages fit within the mobile viewport', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('language', 'EN');
    });

    const routes = [
      '/',
      '/shop',
      '/marketplace',
      '/product/product_mobile',
      '/learning',
      '/learning/packages',
      '/auth',
      '/seller-info',
      '/faq',
      '/hilfe',
      '/about',
      '/contact',
    ];

    for (const routePath of routes) {
      await page.goto(routePath);
      await assertNoHorizontalOverflow(page, routePath);
    }
  });

  test('authenticated account, seller, and admin pages fit within the mobile viewport', async ({ page }) => {
    await setupAuth(page);

    const routes = [
      '/profile',
      '/favorites',
      '/my-orders',
      '/cart',
      '/checkout',
      '/learning/dashboard',
      '/learning/subscription',
      '/seller-dashboard',
      '/seller-products',
      '/seller/new-product',
      '/admin',
      '/admin/verifications',
      '/admin/learning',
      '/admin/filters',
    ];

    for (const routePath of routes) {
      await page.goto(routePath);
      await assertNoHorizontalOverflow(page, routePath);
    }
  });
});
