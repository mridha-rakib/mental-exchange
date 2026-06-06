import { Buffer } from 'node:buffer';
import { expect, test } from '@playwright/test';

const createAuthToken = () => {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ exp: now + 60 * 60, type: 'auth' })).toString('base64url');
  return `${header}.${payload}.signature`;
};

const packagePayload = {
  id: 'pkg_start',
  slug: 'z3-start',
  title: 'Z3 Start',
  subtitle: 'Start package',
  description: 'A package for generated coupon tests.',
  status: 'published',
  priceAmount: 19,
  yearlyPriceAmount: 89,
  currency: 'EUR',
  billingInterval: 'month',
  checkoutEnabled: true,
  couponsEnabled: true,
  billingOptions: [
    { id: 'month', interval: 'month', priceAmount: 19 },
    { id: 'year', interval: 'year', priceAmount: 89 },
  ],
  valuePoints: [],
  includedContent: [],
  faq: [],
  modules: [],
};

const setupAuth = async (page, { isAdmin = false } = {}) => {
  await page.addInitScript(({ authRecord, authToken }) => {
    window.localStorage.setItem('language', 'EN');
    window.localStorage.setItem('pocketbase_auth', JSON.stringify({
      token: authToken,
      record: authRecord,
    }));
  }, {
    authToken: createAuthToken(),
    authRecord: {
      id: isAdmin ? 'admin_user' : 'coupon_user',
      collectionId: '_pb_users_auth_',
      collectionName: 'users',
      email: isAdmin ? 'admin@example.test' : 'coupon@example.test',
      emailVisibility: true,
      verified: true,
      name: isAdmin ? 'Admin User' : 'Coupon User',
      is_seller: false,
      is_admin: isAdmin,
    },
  });
};

test.describe('learning coupon generation', () => {
  test('generated admin coupon can be applied for a free checkout', async ({ page }) => {
    await setupAuth(page, { isAdmin: true });

    const generatedCode = 'ZB-FREE100';
    let createdCoupon = null;
    let freeSubscriptionActivated = false;
    const validationRequests = [];
    const checkoutRequests = [];

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

    await page.route('**/hcgi/api/**', async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      const apiPath = url.pathname.replace('/hcgi/api', '');

      if (apiPath === '/learning/admin/content' && request.method() === 'GET') {
        await route.fulfill({
          json: {
            packages: [packagePayload],
            modules: [],
            lessons: [],
            subscribers: [],
            events: [],
            invoices: [],
            coupons: createdCoupon ? [createdCoupon] : [],
          },
        });
        return;
      }

      if (apiPath === '/learning/admin/coupons/generate-code' && request.method() === 'POST') {
        await route.fulfill({ json: { success: true, code: generatedCode } });
        return;
      }

      if (apiPath === '/learning/admin/coupons' && request.method() === 'POST') {
        const body = request.postDataJSON();
        createdCoupon = {
          id: 'coupon_generated',
          code: body.code,
          title: body.title,
          description: body.description || '',
          packageId: body.packageId || '',
          bundleKey: body.bundleKey || '',
          status: body.status,
          discountType: body.discountType,
          percentOff: Number(body.percentOff || 0),
          amountOff: Number(body.amountOff || 0),
          currency: body.currency || 'EUR',
          duration: body.duration || 'once',
          durationInMonths: Number(body.durationInMonths || 0),
          startsAt: body.startsAt || '',
          expiresAt: body.expiresAt || '',
          maxRedemptions: Number(body.maxRedemptions || 0),
          redemptionCount: 0,
          promotionText: body.promotionText || '',
        };
        await route.fulfill({ status: 201, json: createdCoupon });
        return;
      }

      if (apiPath === '/learning/packages/z3-start' && request.method() === 'GET') {
        await route.fulfill({ json: packagePayload });
        return;
      }

      if (apiPath === '/learning/dashboard' && request.method() === 'GET') {
        await route.fulfill({
          json: freeSubscriptionActivated
            ? {
              hasAccess: true,
              subscription: {
                id: 'sub_free',
                packageId: 'pkg_start',
                status: 'active',
                priceAmount: 0,
                currency: 'EUR',
                billingInterval: 'month',
                currentPeriodStart: '2026-06-05T00:00:00.000Z',
                currentPeriodEnd: '2026-07-05T00:00:00.000Z',
                accessEndsAt: '2026-07-05T00:00:00.000Z',
                effectiveAccessEndsAt: '2026-07-05T00:00:00.000Z',
                hasAccess: true,
              },
              package: packagePayload,
              modules: [],
              recentlyOpened: [],
              progress: { percent: 0 },
              availablePackages: [packagePayload],
            }
            : {
              hasAccess: false,
              subscription: null,
              package: null,
              modules: [],
              recentlyOpened: [],
              progress: { percent: 0 },
              availablePackages: [packagePayload],
            },
        });
        return;
      }

      if (apiPath === '/learning/coupons/validate' && request.method() === 'POST') {
        validationRequests.push(request.postDataJSON());
        await route.fulfill({
          json: {
            success: true,
            coupon: createdCoupon,
            billingCycle: 'month',
            currency: 'EUR',
            originalAmount: 19,
            discountAmount: 19,
            finalAmount: 0,
            isFree: true,
          },
        });
        return;
      }

      if (apiPath === '/learning/checkout' && request.method() === 'POST') {
        checkoutRequests.push(request.postDataJSON());
        freeSubscriptionActivated = true;
        await route.fulfill({
          status: 201,
          json: {
            success: true,
            freeSubscription: true,
            coupon: createdCoupon,
            finalAmount: 0,
            subscription: {
              id: 'sub_free',
              packageId: 'pkg_start',
              status: 'active',
              priceAmount: 0,
              currency: 'EUR',
              billingInterval: 'month',
              hasAccess: true,
            },
          },
        });
        return;
      }

      await route.fulfill({ status: 404, json: { error: `Unexpected API route: ${apiPath}` } });
    });

    await page.goto('/admin/learning');
    await page.getByRole('tab', { name: 'Billing' }).click();
    await page.getByRole('button', { name: 'Generate coupon code' }).click();
    await expect(page.getByPlaceholder('Coupon code')).toHaveValue(generatedCode);

    await page.getByPlaceholder('Coupon title').fill('Free generated coupon');
    await page.locator('select').nth(0).selectOption('pkg_start');
    await page.locator('select').nth(2).selectOption('active');
    await page.getByPlaceholder('Percent').fill('100');
    await page.getByRole('button', { name: 'Save' }).click();

    await expect(page.getByText(generatedCode)).toBeVisible();
    expect(createdCoupon).toMatchObject({
      code: generatedCode,
      title: 'Free generated coupon',
      packageId: 'pkg_start',
      status: 'active',
      discountType: 'percent',
      percentOff: 100,
    });

    await page.goto('/learning/subscribe/z3-start');
    await page.getByPlaceholder('Enter code').fill(generatedCode);
    await page.getByRole('button', { name: 'Apply' }).click();
    await expect(page.getByRole('complementary').getByText('Coupon code applied. The price is now 0.00.')).toBeVisible();

    await page.getByRole('button', { name: /Complete free subscription/ }).click();

    await expect(page).toHaveURL(/\/learning\/dashboard\?payment=free-coupon/);
    await expect(page.getByRole('main').getByText('Your free subscription is active. You can start right away.')).toBeVisible();
    expect(validationRequests).toEqual([{
      packageSlug: 'z3-start',
      billingCycle: 'month',
      couponCode: generatedCode,
    }]);
    expect(checkoutRequests).toEqual([{
      packageSlug: 'z3-start',
      billingCycle: 'month',
      couponCode: generatedCode,
    }]);
  });
});
