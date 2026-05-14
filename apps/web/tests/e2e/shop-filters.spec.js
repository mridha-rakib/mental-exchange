import { expect, test } from '@playwright/test';

const dynamicFilters = [
  {
    id: 'filter_product_type',
    key: 'product_type',
    labelDe: 'Produkttyp',
    labelEn: 'Product type',
    type: 'checkbox_group',
    parameterKey: 'productTypes',
    productField: 'product_type',
    operator: 'equals',
    active: true,
    sortOrder: 10,
    options: [
      { id: 'option_article', value: 'Article', labelDe: 'Artikel', labelEn: 'Article', active: true, sortOrder: 10 },
      { id: 'option_set', value: 'Set', labelDe: 'Set', labelEn: 'Set', active: true, sortOrder: 20 },
    ],
  },
  {
    id: 'filter_condition',
    key: 'condition',
    labelDe: 'Zustand',
    labelEn: 'Condition',
    type: 'checkbox_group',
    parameterKey: 'conditions',
    productField: 'condition',
    operator: 'equals',
    active: true,
    sortOrder: 20,
    options: [
      { id: 'option_new', value: 'Neu', labelDe: 'Neu', labelEn: 'New', active: true, sortOrder: 10 },
    ],
  },
];

test.describe('dynamic shop filters', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('language', 'DE');
    });
  });

  test('loads active filter definitions and sends dynamic query parameters', async ({ page }) => {
    const productRequestUrls = [];

    await page.route('**/hcgi/api/shop/products**', async (route) => {
      productRequestUrls.push(route.request().url());
      await route.fulfill({
        json: {
          items: [],
          total: 0,
          page: 1,
          perPage: 100,
          totalPages: 0,
          filters: dynamicFilters,
        },
      });
    });

    await page.goto('/shop');

    const visibleProductTypeLabel = page.locator('label:visible').filter({ hasText: 'Produkttyp' }).first();
    if (!(await visibleProductTypeLabel.isVisible())) {
      await page.getByRole('button', { name: /Filter/ }).first().click();
    }

    await expect(page.locator('label:visible').filter({ hasText: 'Produkttyp' }).first()).toBeVisible();
    await expect(page.locator('label:visible').filter({ hasText: 'Zustand' }).first()).toBeVisible();
    await expect(page.locator('label:visible').filter({ hasText: 'Fachbereich' })).toHaveCount(0);

    await page.locator('label:visible').filter({ hasText: 'Set' }).first().click();

    await expect.poll(() => productRequestUrls.some((url) => url.includes('productTypes=Set'))).toBe(true);
  });
});
