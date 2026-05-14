import { Buffer } from 'node:buffer';
import { expect, test } from '@playwright/test';

const createAuthToken = () => {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ exp: now + 60 * 60, type: 'auth' })).toString('base64url');
  return `${header}.${payload}.signature`;
};

const setupAuth = async (page) => {
  await page.addInitScript((authToken) => {
    window.localStorage.setItem('language', 'EN');
    window.localStorage.setItem('pocketbase_auth', JSON.stringify({
      token: authToken,
      record: {
        id: 'test_user',
        collectionId: '_pb_users_auth_',
        collectionName: 'users',
        email: 'test@example.test',
        emailVisibility: true,
        verified: true,
        name: 'Test User',
        is_seller: false,
        is_admin: false,
      },
    }));
  }, createAuthToken());
};

test.describe('learning search', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);

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

    await page.route('**/hcgi/api/learning/dashboard', async (route) => {
      await route.fulfill({
        json: {
          hasAccess: true,
          subscription: {
            id: 'sub_active',
            status: 'active',
            packageId: 'pkg_start',
            priceAmount: 19,
            currency: 'EUR',
            billingInterval: 'month',
            currentPeriodEnd: '2026-06-01T00:00:00.000Z',
          },
          package: {
            id: 'pkg_start',
            slug: 'z3-start',
            title: 'Z3 Start',
            subtitle: 'For independent learning',
            priceAmount: 19,
            currency: 'EUR',
            billingInterval: 'month',
          },
          modules: [
            {
              id: 'module_r2z_orientation',
              slug: 'z3-start-road-to-z3-orientation',
              title: 'Road-to-Z3 Orientation',
              description: 'Learning orientation',
              lessons: [{
                id: 'lesson_r2z_start',
                moduleSlug: 'z3-start-road-to-z3-orientation',
                slug: 'z3-start-road-to-z3-orientation-start-here',
                title: 'Start with Road-to-Z3',
                description: 'The first web lesson for imported Road-to-Z3 content.',
                estimatedMinutes: 12,
                progress: {
                  status: 'not_started',
                  progressPercentage: 0,
                },
              }],
              progress: {
                completedLessons: 0,
                startedLessons: 0,
                totalLessons: 1,
                percent: 0,
                status: 'not_started',
                topicStatus: 'not_started',
              },
            },
            {
              id: 'module_started',
              slug: 'z3-start-started-topic',
              title: 'Started topic',
              description: 'Started status topic',
              lessons: [],
              progress: { status: 'in_progress', topicStatus: 'in_progress', totalLessons: 1, startedLessons: 1, completedLessons: 0, percent: 0 },
            },
            {
              id: 'module_completed',
              slug: 'z3-start-completed-topic',
              title: 'Completed topic',
              description: 'Completed status topic',
              lessons: [],
              progress: { status: 'completed', topicStatus: 'completed', totalLessons: 1, startedLessons: 1, completedLessons: 1, percent: 100 },
            },
            {
              id: 'module_repeat',
              slug: 'z3-start-repeat-topic',
              title: 'Repeat topic',
              description: 'Repeat status topic',
              lessons: [],
              progress: { status: 'to_repeat', topicStatus: 'to_repeat', totalLessons: 1, startedLessons: 1, completedLessons: 0, repeatLessons: 1, percent: 0 },
            },
            {
              id: 'module_overdue',
              slug: 'z3-start-overdue-topic',
              title: 'Overdue topic',
              description: 'Overdue status topic',
              lessons: [],
              progress: { status: 'overdue', topicStatus: 'overdue', totalLessons: 1, startedLessons: 1, completedLessons: 0, overdueLessons: 1, percent: 0 },
            },
          ],
          recentlyOpened: [],
          progress: {
            completedLessons: 0,
            totalLessons: 1,
            percent: 0,
          },
          availablePackages: [],
        },
      });
    });

    await page.route('**/hcgi/api/learning/search**', async (route) => {
      await route.fulfill({
        json: {
          query: 'high',
          count: 1,
          items: [{
            id: 'lesson_r2z_high_yield',
            type: 'subtopic',
            title: 'High-Yield Markings',
            description: 'How to identify high-yield content.',
            excerpt: 'High-Yield markings show the content that should be repeated first.',
            package: {
              id: 'pkg_start',
              slug: 'z3-start',
              title: 'Z3 Start',
            },
            topic: {
              id: 'module_r2z_high_yield',
              slug: 'z3-start-road-to-z3-high-yield',
              title: 'High-Yield Review',
            },
            subtopic: {
              id: 'lesson_r2z_high_yield',
              slug: 'z3-start-road-to-z3-high-yield-high-yield-marker',
              title: 'High-Yield Markings',
            },
            path: '/learning/topics/z3-start/z3-start-road-to-z3-high-yield/subtopics/z3-start-road-to-z3-high-yield-high-yield-marker',
            estimatedMinutes: 14,
          }],
        },
      });
    });
  });

  test('searches active learning content and links to the direct subtopic URL', async ({ page }) => {
    await page.goto('/learning/dashboard');

    const searchInput = page.getByRole('searchbox', { name: 'Search learning content' });
    await expect(searchInput).toBeVisible();
    await searchInput.fill('high');

    await expect(page.getByRole('heading', { name: 'High-Yield Markings' })).toBeVisible();
    await expect(page.getByText('High-Yield markings show the content')).toBeVisible();
    await expect(page.getByRole('link', { name: /Subtopic High-Yield Review High-Yield Markings/ })).toHaveAttribute(
      'href',
      '/learning/topics/z3-start/z3-start-road-to-z3-high-yield/subtopics/z3-start-road-to-z3-high-yield-high-yield-marker',
    );
  });

  test('shows the required topic status values on the dashboard', async ({ page }) => {
    await page.goto('/learning/dashboard');

    await expect(page.getByText('Open', { exact: true })).toBeVisible();
    await expect(page.getByText('Started', { exact: true })).toBeVisible();
    await expect(page.getByText('Completed', { exact: true })).toBeVisible();
    await expect(page.getByText('To repeat', { exact: true })).toBeVisible();
    await expect(page.getByText('Overdue', { exact: true })).toBeVisible();
  });
});
