import { expect, test } from '@playwright/test';

const lessonPayload = {
  viewer: {
    isAuthenticated: false,
    isAdmin: false,
    hasFullAccess: false,
    canSaveProgress: false,
    isPreviewOnly: true,
  },
  package: {
    id: 'pkg_start',
    slug: 'z3-start',
    title: 'Z3 Start',
  },
  module: {
    id: 'module_r2z_orientation',
    slug: 'z3-start-road-to-z3-orientation',
    title: 'Road-to-Z3 Orientation',
    position: 10,
  },
  lesson: {
    id: 'lesson_r2z_start',
    packageId: 'pkg_start',
    moduleId: 'module_r2z_orientation',
    moduleSlug: 'z3-start-road-to-z3-orientation',
    slug: 'z3-start-road-to-z3-orientation-start-here',
    title: 'Start with Road-to-Z3',
    description: 'The first web lesson for imported Road-to-Z3 content.',
    status: 'published',
    contentType: 'text',
    textContent: [
      'Road-to-Z3 is built as a web-based learning path. Students open clear learning pages instead of working through disconnected PDF files.',
      'Each page keeps the learning sequence readable: orientation, core points, review, and the next step.',
      'Cover and edition metadata must stay out of learner-facing pages.',
    ].join('\n\n'),
    hasText: true,
    hasVideo: false,
    hasPdf: false,
    hasDownload: false,
    attachments: [],
    attachmentCount: 0,
    isPreview: true,
    position: 10,
    estimatedMinutes: 12,
    progress: {
      status: 'not_started',
      progressPercentage: 0,
    },
  },
  previousLesson: null,
  nextLesson: null,
};

test.describe('Road-to-Z3 web learning pages', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('language', 'EN');
    });

    await page.route('**/hcgi/api/learning/lessons/lesson_r2z_start', async (route) => {
      await route.fulfill({ json: lessonPayload });
    });

    await page.route('**/hcgi/api/learning/topics/z3-start/z3-start-road-to-z3-orientation/subtopics/z3-start-road-to-z3-orientation-start-here', async (route) => {
      await route.fulfill({ json: lessonPayload });
    });

    await page.route('**/hcgi/api/learning/topics/z3-start/z3-start-road-to-z3-orientation', async (route) => {
      await route.fulfill({
        json: {
          viewer: lessonPayload.viewer,
          package: lessonPayload.package,
          module: {
            ...lessonPayload.module,
            description: 'Einstieg in die Z3 Vorbereitung mit Lernlogik.',
            lessons: [{
              ...lessonPayload.lesson,
              unlocked: true,
              isPreviewAccessible: true,
            }],
            progress: {
              completedLessons: 0,
              totalLessons: 1,
              percent: 0,
            },
          },
          modules: [{
            id: 'module_r2z_orientation',
            slug: 'z3-start-road-to-z3-orientation',
            title: 'Road-to-Z3 Orientation',
            position: 10,
          }],
        },
      });
    });
  });

  test('renders imported text content as a web lesson page', async ({ page }) => {
    await page.goto('/learning/lessons/lesson_r2z_start');

    await expect(page.getByRole('heading', { name: 'Start with Road-to-Z3' })).toBeVisible();
    await expect(page.getByText('Web learning page')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Learning content' })).toBeVisible();
    await expect(page.getByText('Road-to-Z3 is built as a web-based learning path.')).toBeVisible();
    await expect(page.getByText('Each page keeps the learning sequence readable')).toBeVisible();
    await expect(page.getByText('3 sections')).toBeVisible();
    await expect(page.getByText('Lesson notes')).toHaveCount(0);
    await expect(page.getByText('Made by')).toHaveCount(0);
    await expect(page.getByText('1. Auflage 2026')).toHaveCount(0);
  });

  test('opens a direct topic URL and links to the direct subtopic URL', async ({ page }) => {
    await page.goto('/learning/topics/z3-start/z3-start-road-to-z3-orientation');

    await expect(page.getByRole('heading', { name: 'Road-to-Z3 Orientation' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Start with Road-to-Z3' })).toBeVisible();
    await expect(page.getByRole('link', { name: /Open preview|Open lesson/ })).toHaveAttribute(
      'href',
      '/learning/topics/z3-start/z3-start-road-to-z3-orientation/subtopics/z3-start-road-to-z3-orientation-start-here',
    );
  });

  test('opens a direct subtopic URL as a web lesson page', async ({ page }) => {
    await page.goto('/learning/topics/z3-start/z3-start-road-to-z3-orientation/subtopics/z3-start-road-to-z3-orientation-start-here');

    await expect(page.getByRole('heading', { name: 'Start with Road-to-Z3' })).toBeVisible();
    await expect(page.getByText('Web learning page')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Road-to-Z3 Orientation' })).toHaveAttribute(
      'href',
      '/learning/topics/z3-start/z3-start-road-to-z3-orientation',
    );
  });
});
