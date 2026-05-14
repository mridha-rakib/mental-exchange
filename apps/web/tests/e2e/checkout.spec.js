import { Buffer } from 'node:buffer';
import { expect, test } from '@playwright/test';

const cartItem = {
  id: 'checkout_cart_item_1',
  product_id: 'checkout_product_1',
  product_type: 'marketplace',
  quantity: 1,
};

const product = {
  id: 'checkout_product_1',
  collectionId: 'products',
  collectionName: 'products',
  name: 'Z3 Sonde',
  description: 'Instrument fuer die praktische Vorbereitung.',
  price: 89,
  seller_id: 'seller_1',
  seller_username: 'Dr Seller',
  image_url: 'https://example.test/checkout-product.jpg',
};

const createAuthToken = () => {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ exp: now + 60 * 60, type: 'auth' })).toString('base64url');
  return `${header}.${payload}.signature`;
};

const setupAuth = async (page) => {
  const token = createAuthToken();
  const record = {
    id: 'checkout_user',
    collectionId: '_pb_users_auth_',
    collectionName: 'users',
    email: 'checkout@example.test',
    emailVisibility: true,
    verified: true,
    name: 'Checkout User',
    is_seller: false,
    is_admin: false,
  };

  await page.addInitScript(({ authRecord, authToken }) => {
    window.localStorage.setItem('language', 'DE');
    window.localStorage.setItem('pocketbase_auth', JSON.stringify({
      token: authToken,
      record: authRecord,
    }));
  }, { authRecord: record, authToken: token });
};

const setupCheckoutMocks = async (page) => {
  const checkoutRequests = [];

  await page.route('https://example.test/checkout-product.jpg', async (route) => {
    await route.fulfill({
      contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160"><rect width="160" height="160" fill="#eef0f3"/><path d="M40 92h80v20H40z" fill="#0000ff"/></svg>',
    });
  });

  await page.route('**/hcgi/api/**', async (route) => {
    const url = new URL(route.request().url());
    const apiPath = url.pathname.replace('/hcgi/api', '');

    if (apiPath === '/settings/fees') {
      await route.fulfill({
        json: {
          shipping_fee: 4.99,
          service_fee: 1.99,
        },
      });
      return;
    }

    if (apiPath === '/checkout/create-session') {
      checkoutRequests.push(route.request().postDataJSON());
      await route.fulfill({
        json: {
          success: true,
          sessionId: 'cs_checkout_test',
          url: `${url.origin}/success?session_id=cs_checkout_test`,
        },
      });
      return;
    }

    if (apiPath === '/checkout/session/cs_checkout_test') {
      await route.fulfill({
        json: {
          id: 'cs_checkout_test',
          status: 'paid',
          amountTotal: 9598,
          customerEmail: 'checkout@example.test',
          metadata: {},
          paymentIntentId: 'pi_checkout_test',
        },
      });
      return;
    }

    await route.fulfill({ json: {} });
  });

  await page.route('**/hcgi/platform/api/collections/cart_items/records**', async (route) => {
    if (route.request().method() === 'DELETE') {
      await route.fulfill({
        status: 204,
        body: '',
      });
      return;
    }

    await route.fulfill({
      json: {
        page: 1,
        perPage: 50,
        totalItems: 1,
        totalPages: 1,
        items: [cartItem],
      },
    });
  });

  await page.route('**/hcgi/platform/api/collections/products/records/checkout_product_1**', async (route) => {
    await route.fulfill({ json: product });
  });

  return checkoutRequests;
};

const setupCheckoutPage = async (page) => {
  await setupAuth(page);
  return setupCheckoutMocks(page);
};

test.describe('checkout page', () => {
  test('keeps legal confirmations in the summary and submits the correct checkout payload', async ({ page }) => {
    const checkoutRequests = await setupCheckoutPage(page);

    await page.goto('/checkout');

    await expect(page.getByRole('heading', { name: 'Zahlungspflichtig bestellen' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Lieferadresse' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Bestellübersicht' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Pflichtangaben' })).toBeVisible();
    const orderItems = page.getByLabel('Bestellte Artikel');
    await expect(orderItems.getByText('Z3 Sonde')).toBeVisible();
    await expect(orderItems.getByText('89,00', { exact: false })).toBeVisible();

    const submitButton = page.getByRole('button', { name: /Zahlungspflichtig bestellen/ });
    const termsCheckbox = page.getByRole('checkbox', { name: /AGB/ });
    const privacyCheckbox = page.getByRole('checkbox', { name: /Datenschutzerklärung/ });
    const newsletterCheckbox = page.getByRole('checkbox', { name: /Newsletter/ });

    await expect(termsCheckbox).not.toBeChecked();
    await expect(privacyCheckbox).not.toBeChecked();
    await expect(newsletterCheckbox).not.toBeChecked();
    await expect(submitButton).toBeDisabled();

    await page.locator('#street').fill('Musterstrasse 12');
    await page.locator('#postal_code').fill('10115');
    await page.locator('#city').fill('Berlin');

    await termsCheckbox.click();
    await privacyCheckbox.click();
    await expect(submitButton).toBeEnabled();

    await submitButton.click();
    await page.waitForURL(/\/success\?session_id=cs_checkout_test/);

    expect(checkoutRequests).toHaveLength(1);
    expect(checkoutRequests[0]).toMatchObject({
      buyer_id: 'checkout_user',
      buyer_name: 'Checkout User',
      buyer_email: 'checkout@example.test',
      acceptedTerms: true,
      acceptedPrivacy: true,
      newsletterOptIn: false,
      shipping_address: {
        name: 'Checkout User',
        email: 'checkout@example.test',
        street: 'Musterstrasse 12',
        city: 'Berlin',
        postal_code: '10115',
        country: 'DE',
      },
    });
    expect(checkoutRequests[0].cart_items[0].product).toMatchObject({
      id: 'checkout_product_1',
      name: 'Z3 Sonde',
      price: 89,
      seller_id: 'seller_1',
    });
  });

  test('sends newsletter opt-in only when the optional checkbox is selected', async ({ page }) => {
    const checkoutRequests = await setupCheckoutPage(page);

    await page.goto('/checkout');

    await page.locator('#street').fill('Musterstrasse 12');
    await page.locator('#postal_code').fill('10115');
    await page.locator('#city').fill('Berlin');
    await page.getByRole('checkbox', { name: /AGB/ }).click();
    await page.getByRole('checkbox', { name: /Datenschutzerklärung/ }).click();
    await page.getByRole('checkbox', { name: /Newsletter/ }).click();

    await page.getByRole('button', { name: /Zahlungspflichtig bestellen/ }).click();
    await page.waitForURL(/\/success\?session_id=cs_checkout_test/);

    expect(checkoutRequests).toHaveLength(1);
    expect(checkoutRequests[0].newsletterOptIn).toBe(true);
  });
});
