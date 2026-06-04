import { Buffer } from 'node:buffer';
import { expect, test } from '@playwright/test';

const createAuthToken = () => {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ exp: now + 60 * 60, type: 'auth' })).toString('base64url');
  return `${header}.${payload}.signature`;
};

const setupSellerAuth = async (page) => {
  await page.addInitScript((authToken) => {
    window.localStorage.setItem('language', 'EN');
    window.localStorage.setItem('pocketbase_auth', JSON.stringify({
      token: authToken,
      record: {
        id: 'seller_user',
        collectionId: '_pb_users_auth_',
        collectionName: 'users',
        email: 'seller@example.test',
        emailVisibility: true,
        verified: true,
        name: 'Seller User',
        seller_username: 'seller-user',
        is_seller: true,
        is_admin: false,
      },
    }));
  }, createAuthToken());
};

const uploadProductImage = async (page, name) => {
  await page.locator('input[type="file"]').setInputFiles({
    name,
    mimeType: 'image/png',
    buffer: Buffer.from('89504e470d0a1a0a', 'hex'),
  });
};

const selectCondition = async (page, condition) => {
  await page.locator('button[role="combobox"]').first().click();
  await page.getByRole('option', { name: condition, exact: true }).click();
};

const fillVerificationItem = async (page, { title, condition }) => {
  await uploadProductImage(page, `${title.toLowerCase().replace(/\s+/g, '-')}.png`);
  await page.getByLabel('Title *').fill(title);
  await page.getByLabel('Price (EUR) *').fill('25');
  await selectCondition(page, condition);
  await page.getByLabel('Shipping weight (g) *').fill('250');
  await page.getByLabel('Description *').fill(`${title} is ready for quality verification.`);
};

test.describe('seller paid verification workflow', () => {
  test('queues multiple new items until submitting paid verification', async ({ page }) => {
    await setupSellerAuth(page);

    const createRequests = [];
    const paidVerificationRequests = [];

    await page.route('**/hcgi/platform/api/collections/products/records', async (route) => {
      createRequests.push(route.request().postData() || '');
      const index = createRequests.length;
      await route.fulfill({
        json: {
          id: `product_${index}`,
          collectionId: 'products',
          collectionName: 'products',
          product_type: 'Article',
          name: `Verification Item ${index}`,
          condition: index === 1 ? 'Neu' : 'Wie neu',
          price: 25,
          status: 'draft',
          seller_id: 'seller_user',
        },
      });
    });

    await page.route('**/hcgi/api/verification/pay-fee', async (route) => {
      paidVerificationRequests.push(route.request().postDataJSON());
      await route.fulfill({
        json: {
          checkoutUrl: 'https://checkout.example.test/session',
          sessionId: 'cs_test_verification',
          productIds: ['product_1', 'product_2'],
          productCount: 2,
        },
      });
    });

    await page.route('https://checkout.example.test/**', async (route) => {
      await route.fulfill({ body: '<html><body>Checkout</body></html>' });
    });

    await page.goto('/seller/new-product');
    await page.getByRole('button', { name: /^Item\b/ }).click();

    await fillVerificationItem(page, { title: 'Verification Item 1', condition: 'New' });
    await page.getByRole('button', { name: 'Add to paid verification' }).click();

    await expect(page.getByRole('button', { name: 'Verify More Items' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Submit for Paid Verification' })).toBeVisible();
    await expect(page.getByText('1 product(s) for verification')).toBeVisible();

    await page.getByRole('button', { name: 'Verify More Items' }).click();
    await fillVerificationItem(page, { title: 'Verification Item 2', condition: 'Like new' });
    await page.getByRole('button', { name: 'Add to paid verification' }).click();

    await expect(page.getByText('2 product(s) for verification')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Verify More Items' })).toBeVisible();

    await page.getByRole('button', { name: 'Submit for Paid Verification' }).click();
    await expect(page).toHaveURL('https://checkout.example.test/session');

    expect(createRequests).toHaveLength(2);
    expect(createRequests.every((body) => body.includes('name="status"') && body.includes('draft'))).toBe(true);
    expect(paidVerificationRequests).toEqual([{
      productIds: ['product_1', 'product_2'],
      productName: '',
      sellerId: 'seller_user',
      userEmail: 'seller@example.test',
    }]);
  });

  test('uses the consumable-specific verify-more action', async ({ page }) => {
    await setupSellerAuth(page);

    const createRequests = [];
    const paidVerificationRequests = [];

    await page.route('**/hcgi/platform/api/collections/products/records', async (route) => {
      createRequests.push(route.request().postData() || '');
      await route.fulfill({
        json: {
          id: 'consumable_1',
          collectionId: 'products',
          collectionName: 'products',
          product_type: 'Consumable',
          name: 'Verification Consumable',
          condition: 'Neu',
          price: 25,
          status: 'draft',
          seller_id: 'seller_user',
        },
      });
    });

    await page.route('**/hcgi/api/verification/pay-fee', async (route) => {
      paidVerificationRequests.push(route.request().postDataJSON());
      await route.fulfill({
        json: {
          checkoutUrl: 'https://checkout.example.test/consumable-session',
          sessionId: 'cs_test_consumable_verification',
          productIds: ['consumable_1'],
          productCount: 1,
        },
      });
    });

    await page.route('https://checkout.example.test/**', async (route) => {
      await route.fulfill({ body: '<html><body>Checkout</body></html>' });
    });

    await page.goto('/seller/new-product');
    await page.getByRole('button', { name: /^Consumables\b/ }).click();

    await fillVerificationItem(page, { title: 'Verification Consumable', condition: 'New' });
    await page.getByRole('button', { name: 'Add to paid verification' }).click();

    await expect(page.getByRole('button', { name: 'Verify More Consumables' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Verify More Items' })).toHaveCount(0);

    await page.getByRole('button', { name: 'Submit for Paid Verification' }).click();
    await expect(page).toHaveURL('https://checkout.example.test/consumable-session');

    expect(createRequests).toHaveLength(1);
    expect(createRequests[0]).toContain('name="product_type"');
    expect(createRequests[0]).toContain('Consumable');
    expect(createRequests[0]).toContain('name="status"');
    expect(createRequests[0]).toContain('draft');
    expect(paidVerificationRequests).toEqual([{
      productIds: ['consumable_1'],
      productName: 'Verification Consumable',
      sellerId: 'seller_user',
      userEmail: 'seller@example.test',
    }]);
  });
});
