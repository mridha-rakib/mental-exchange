import { Buffer } from 'node:buffer';
import { expect, test } from '@playwright/test';

const cartItem = {
  id: 'cart_item_1',
  product_id: 'product_1',
  product_type: 'marketplace',
  quantity: 2,
};

const product = {
  id: 'product_1',
  collectionId: 'products',
  collectionName: 'products',
  name: 'Z3 Spiegel Set',
  description: 'Gebrauchtes Instrumentenset fuer die Vorbereitung.',
  price: 125,
  seller_username: 'Max Seller',
  image_url: 'https://example.test/product.jpg',
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
    id: 'cart_user',
    collectionId: '_pb_users_auth_',
    collectionName: 'users',
    email: 'cart@example.test',
    emailVisibility: true,
    verified: true,
    name: 'Cart User',
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

const setupCartMocks = async (page) => {
  await page.route('https://example.test/product.jpg', async (route) => {
    await route.fulfill({
      contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160"><rect width="160" height="160" fill="#eef0f3"/><circle cx="80" cy="80" r="38" fill="#0000ff"/></svg>',
    });
  });

  await page.route('**/hcgi/api/settings/fees', async (route) => {
    await route.fulfill({
      json: {
        shipping_fee: 4.99,
        service_fee: 1.99,
      },
    });
  });

  await page.route('**/hcgi/api/**', async (route) => {
    await route.fulfill({ json: {} });
  });

  await page.route('**/hcgi/platform/api/collections/cart_items/records**', async (route) => {
    const method = route.request().method();

    if (method === 'PATCH') {
      let payload = {};
      try {
        payload = route.request().postDataJSON();
      } catch {
        payload = {};
      }

      await route.fulfill({
        json: {
          ...cartItem,
          quantity: payload.quantity || cartItem.quantity,
        },
      });
      return;
    }

    if (method === 'DELETE') {
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

  await page.route('**/hcgi/platform/api/collections/products/records/product_1**', async (route) => {
    await route.fulfill({ json: product });
  });
};

const setupCartPage = async (page) => {
  await setupAuth(page);
  await setupCartMocks(page);
};

test.describe('cart page', () => {
  test('shows product cards with quantity controls, actions, and order summary', async ({ page }) => {
    await setupCartPage(page);

    await page.goto('/cart');

    await expect(page.getByRole('heading', { name: 'Warenkorb', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Produkte im Warenkorb' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Z3 Spiegel Set' }).first()).toBeVisible();
    const productCard = page.getByRole('article');
    await expect(page.getByText('von Max Seller')).toBeVisible();
    await expect(productCard.getByText('125,00', { exact: false })).toBeVisible();
    await expect(productCard.getByText('250,00', { exact: false })).toBeVisible();
    await expect(page.getByText('Versand').first()).toBeVisible();
    await expect(page.getByText('Servicegebühr').first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Bearbeiten/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Löschen/ })).toBeVisible();

    await page.getByRole('button', { name: 'Menge erhöhen' }).click();
    await expect(page.locator('[aria-label="Menge"]')).toHaveText('3');
    await expect(productCard.getByText('375,00', { exact: false })).toBeVisible();

    await page.getByRole('button', { name: /Löschen/ }).click();
    await expect(page.getByRole('heading', { name: 'Dein Warenkorb ist leer' })).toBeVisible();
  });

  test('continues to checkout from the summary CTA', async ({ page }) => {
    await setupCartPage(page);

    await page.goto('/cart');
    await page.getByRole('button', { name: /Zur Kasse/ }).click();

    await expect(page).toHaveURL(/\/checkout/);
  });
});
