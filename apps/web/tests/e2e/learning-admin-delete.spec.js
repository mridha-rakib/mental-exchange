import { Buffer } from 'node:buffer';
import { expect, test } from '@playwright/test';

const createAuthToken = () => {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ exp: now + 60 * 60, type: 'auth' })).toString('base64url');
  return `${header}.${payload}.signature`;
};

const setupAdminAuth = async (page) => {
  await page.addInitScript((authToken) => {
    window.localStorage.setItem('language', 'EN');
    window.localStorage.setItem('pocketbase_auth', JSON.stringify({
      token: authToken,
      record: {
        id: 'admin_user',
        collectionId: '_pb_users_auth_',
        collectionName: 'users',
        email: 'admin@example.test',
        emailVisibility: true,
        verified: true,
        name: 'Admin User',
        is_seller: false,
        is_admin: true,
      },
    }));
  }, createAuthToken());
};

const createAdminContent = () => ({
  packages: [{
    id: 'package_1',
    slug: 'package-one',
    title: 'Package One',
    subtitle: 'Admin package',
    description: 'A package managed in the content builder.',
    status: 'draft',
    currency: 'EUR',
    priceAmount: 39,
    billingInterval: 'month',
    coverImageUrl: '',
    thumbnailUrl: '',
  }],
  modules: [{
    id: 'module_1',
    packageId: 'package_1',
    slug: 'module-one',
    title: 'Module One',
    description: 'A module inside the selected package.',
    status: 'draft',
    position: 1,
    estimatedDurationMinutes: 12,
    isPreview: false,
  }],
  lessons: [{
    id: 'lesson_1',
    packageId: 'package_1',
    moduleId: 'module_1',
    slug: 'lesson-one',
    title: 'Lesson One',
    description: 'A lesson inside the selected module.',
    status: 'draft',
    contentType: 'text',
    estimatedMinutes: 12,
    position: 1,
    isPreview: false,
  }],
  subscribers: [],
  events: [],
  invoices: [],
  coupons: [],
});

const setupAdminContentMocks = async (page) => {
  const deleteRequests = [];
  let content = createAdminContent();

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
      await route.fulfill({ json: content });
      return;
    }

    if (apiPath === '/learning/admin/lessons/lesson_1' && request.method() === 'DELETE') {
      deleteRequests.push(apiPath);
      content = {
        ...content,
        lessons: content.lessons.filter((lesson) => lesson.id !== 'lesson_1'),
      };
      await route.fulfill({ json: { success: true, deletedLessonId: 'lesson_1' } });
      return;
    }

    if (apiPath === '/learning/admin/modules/module_1' && request.method() === 'DELETE') {
      deleteRequests.push(apiPath);
      content = {
        ...content,
        modules: content.modules.filter((moduleRecord) => moduleRecord.id !== 'module_1'),
        lessons: content.lessons.filter((lesson) => lesson.moduleId !== 'module_1'),
      };
      await route.fulfill({ json: { success: true, deletedModuleId: 'module_1' } });
      return;
    }

    if (apiPath === '/learning/admin/packages/package_1' && request.method() === 'DELETE') {
      deleteRequests.push(apiPath);
      content = {
        ...content,
        packages: content.packages.filter((learningPackage) => learningPackage.id !== 'package_1'),
        modules: content.modules.filter((moduleRecord) => moduleRecord.packageId !== 'package_1'),
        lessons: content.lessons.filter((lesson) => lesson.packageId !== 'package_1'),
        coupons: content.coupons.filter((coupon) => coupon.packageId !== 'package_1'),
      };
      await route.fulfill({ json: { success: true, deletedPackageId: 'package_1' } });
      return;
    }

    await route.fulfill({ status: 404, json: { error: `Unexpected API route: ${apiPath}` } });
  });

  return deleteRequests;
};

test.describe('learning admin content builder delete functions', () => {
  test('confirms and deletes lessons, modules, and packages', async ({ page }) => {
    await setupAdminAuth(page);
    const deleteRequests = await setupAdminContentMocks(page);

    await page.goto('/admin/learning');
    await page.getByRole('tab', { name: 'Content builder' }).click();
    await expect(page.getByText('Curriculum map')).toBeVisible();

    await page.getByRole('button', { name: 'Delete lesson' }).click();
    await expect(page.getByRole('alertdialog')).toContainText('Are you sure you want to delete this lesson?');
    await page.getByRole('alertdialog').getByRole('button', { name: 'Cancel' }).click();
    expect(deleteRequests).toEqual([]);

    await page.getByRole('button', { name: 'Delete lesson' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Delete' }).click();
    await expect(page.getByText('Lesson One')).toHaveCount(0);
    expect(deleteRequests).toContain('/learning/admin/lessons/lesson_1');

    await page.getByRole('button', { name: 'Delete module' }).click();
    await expect(page.getByRole('alertdialog')).toContainText('Are you sure you want to delete this module?');
    await page.getByRole('alertdialog').getByRole('button', { name: 'Delete' }).click();
    await expect(page.getByText('Module One')).toHaveCount(0);
    expect(deleteRequests).toContain('/learning/admin/modules/module_1');

    await page.getByRole('button', { name: 'Delete package' }).first().click();
    await expect(page.getByRole('alertdialog')).toContainText('Are you sure you want to delete this package?');
    await page.getByRole('alertdialog').getByRole('button', { name: 'Delete' }).click();
    await expect(page.getByText('Package One')).toHaveCount(0);
    expect(deleteRequests).toContain('/learning/admin/packages/package_1');
  });
});
