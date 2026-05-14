import { expect, test } from '@playwright/test';

const packages = [
  {
    id: 'pkg_start',
    slug: 'z3-start',
    title: 'Z3 Start',
    priceAmount: 19,
    currency: 'EUR',
    billingInterval: 'month',
  },
  {
    id: 'pkg_struktur',
    slug: 'z3-struktur',
    title: 'Z3 Struktur',
    priceAmount: 39,
    currency: 'EUR',
    billingInterval: 'month',
  },
  {
    id: 'pkg_pruefung',
    slug: 'z3-pruefungstrainer',
    title: 'Z3 Prüfungstrainer',
    priceAmount: 59,
    currency: 'EUR',
    billingInterval: 'month',
  },
];

test.describe('Z3 learning package selector', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('language', 'EN');
    });

    await page.route('**/hcgi/api/learning/packages/z3-pruefungstrainer', async (route) => {
      await route.fulfill({
        json: {
          ...packages[2],
          checkoutEnabled: false,
          billingOptions: [
            {
              id: 'month',
              interval: 'month',
              priceAmount: 59,
            },
            {
              id: 'year',
              interval: 'year',
              priceAmount: 299,
            },
          ],
          valuePoints: [],
          includedContent: [],
          faq: [],
          modules: [],
        },
      });
    });

    await page.route('**/hcgi/api/learning/packages', async (route) => {
      await route.fulfill({ json: { items: packages } });
    });
  });

  test('shows the three subscription packages and excludes removed trainer promises', async ({ page }) => {
    await page.goto('/learning/packages');

    await expect(page.getByRole('heading', { name: 'Choose your Z3 learning package' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Z3 Start' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Z3 Struktur' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Z3 Prüfungstrainer' })).toBeVisible();
    await expect(page.getByText('Popular')).toBeVisible();

    await expect(page.getByText('Prioritized review topics')).toBeVisible();
    await expect(page.getByText('Deep-dive High-Yield learning pages')).toBeVisible();
    await expect(page.getByText('Multiple-choice questions for every topic')).toHaveCount(0);
    await expect(page.getByText('Answer explanations')).toHaveCount(0);
    await expect(page.getByText('Mistake analysis & weakness tracking')).toHaveCount(0);
    await expect(page.getByText('Exam simulation')).toHaveCount(0);

    await expect(page.getByRole('link', { name: 'Choose Z3 Start' })).toHaveAttribute('href', '/learning/subscribe/z3-start?cycle=month');
    await expect(page.getByRole('link', { name: 'Choose Z3 Struktur' })).toHaveAttribute('href', '/learning/subscribe/z3-struktur?cycle=month');
    await expect(page.getByRole('link', { name: 'Choose Prüfungstrainer' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Currently unavailable' })).toBeDisabled();
  });

  test('keeps the direct Prüfungstrainer checkout page visible but blocks checkout', async ({ page }) => {
    await page.goto('/learning/subscribe/z3-pruefungstrainer');

    await expect(page.getByRole('heading', { name: 'Z3 Prüfungstrainer' })).toBeVisible();
    await expect(page.getByText('This learning package remains visible, but subscription checkout is currently disabled.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Currently unavailable' })).toBeDisabled();
    await expect(page.getByRole('link', { name: 'Register to subscribe' })).toHaveCount(0);
  });
});
