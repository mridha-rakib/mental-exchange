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
    window.localStorage.setItem('language', 'DE');
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

test.describe('learning plan dashboard', () => {
  let dashboardMode = 'default';
  let recalculationRequests = 0;

  test.beforeEach(async ({ page }) => {
    dashboardMode = 'default';
    recalculationRequests = 0;
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
      const today = new Date().toISOString().slice(0, 10);
      const tomorrowDate = new Date(`${today}T00:00:00.000Z`);
      tomorrowDate.setUTCDate(tomorrowDate.getUTCDate() + 1);
      const tomorrow = tomorrowDate.toISOString().slice(0, 10);
      const longPause = dashboardMode === 'long_pause';

      await route.fulfill({
        json: {
          hasAccess: true,
          subscription: {
            id: 'sub_struktur',
            status: 'active',
            packageId: 'pkg_struktur',
            priceAmount: 39,
            currency: 'EUR',
            billingInterval: 'month',
            currentPeriodEnd: '2026-06-01T00:00:00.000Z',
          },
          package: {
            id: 'pkg_struktur',
            slug: 'z3-struktur',
            title: 'Z3 Struktur',
            subtitle: 'With an individual learning plan',
            priceAmount: 39,
            currency: 'EUR',
            billingInterval: 'month',
          },
          modules: [],
          recentlyOpened: [],
          progress: {
            completedLessons: 2,
            totalLessons: 10,
            percent: 20,
          },
          learningPlan: {
            enabled: true,
            requiredTierSlug: 'z3-struktur',
            hasPlan: true,
            plan: {
              id: 'plan_1',
              status: 'active',
              tierSlug: 'z3-struktur',
              dailyGoalMinutes: 45,
              weeklyGoalTopics: 5,
            },
            sections: {
              today: [{
                id: 'assignment_today',
                title: 'Road-to-Z3 Orientierung',
                description: 'Starte mit der aktuellen Tagesaufgabe.',
                status: 'open',
                assignmentType: 'lesson',
                assignedDate: today,
                dueDate: today,
                estimatedMinutes: 12,
                topic: {
                  id: 'module_orientation',
                  slug: 'z3-struktur-orientation',
                  title: 'Orientierung',
                },
                path: '/learning/topics/z3-struktur/z3-struktur-orientation/subtopics/start-here',
              }],
              catchUp: [{
                id: 'assignment_catch_up',
                title: 'Offene Grundlagen wiederholen',
                description: 'Nacharbeiten fuer verpasste Inhalte.',
                status: 'overdue',
                assignmentType: 'review',
                assignedDate: '2026-01-01',
                dueDate: '2026-01-01',
                estimatedMinutes: 18,
                topic: {
                  id: 'module_basics',
                  slug: 'z3-struktur-basics',
                  title: 'Grundlagen',
                },
                path: '/learning/topics/z3-struktur/z3-struktur-basics',
              }],
              preparation: [{
                id: 'assignment_prepare',
                title: 'Naechstes Thema vorbereiten',
                description: 'Vorarbeiten fuer den naechsten Lerntag.',
                status: 'open',
                assignmentType: 'preparation',
                assignedDate: tomorrow,
                dueDate: tomorrow,
                estimatedMinutes: 10,
                topic: {
                  id: 'module_next',
                  slug: 'z3-struktur-next',
                  title: 'Naechstes Thema',
                },
                path: '/learning/topics/z3-struktur/z3-struktur-next',
              }],
            },
            continueAssignment: {
              id: longPause ? 'assignment_catch_up' : 'assignment_today',
              title: longPause ? 'Offene Grundlagen wiederholen' : 'Road-to-Z3 Orientierung',
              description: longPause ? 'Nacharbeiten fuer verpasste Inhalte.' : 'Starte mit der aktuellen Tagesaufgabe.',
              path: longPause
                ? '/learning/topics/z3-struktur/z3-struktur-basics'
                : '/learning/topics/z3-struktur/z3-struktur-orientation/subtopics/start-here',
            },
            behindState: {
              status: longPause ? 'long_pause' : 'none',
              behindDays: longPause ? 8 : 0,
              overdueAssignments: longPause ? 1 : 0,
            },
            recalculation: {
              state: longPause ? 'long_pause' : 'none',
              canRecalculate: longPause,
              offeredAt: longPause ? '2026-05-01T00:00:00.000Z' : '',
              recalculatedAt: '',
            },
            feedback: longPause
              ? {
                code: 'long_pause',
                messageKey: 'learning.plan_feedback_long_pause',
                params: { days: 8 },
                tone: 'warning',
              }
              : {
                code: 'on_track',
                messageKey: 'learning.plan_feedback_on_track',
                params: {},
                tone: 'success',
              },
            weeklyProgress: {
              scope: 'weekly',
              completedAssignments: 3,
              totalAssignments: 5,
              completedMinutes: 70,
              targetMinutes: 120,
              percent: 60,
            },
            overallProgress: {
              scope: 'overall',
              completedAssignments: 8,
              totalAssignments: 20,
              completedMinutes: 240,
              targetMinutes: 600,
              percent: 40,
            },
            summary: {
              totalAssignments: 20,
              completedAssignments: 8,
              openAssignments: 10,
              overdueAssignments: 1,
              repeatAssignments: 1,
              totalTargetMinutes: 600,
              completedMinutes: 240,
              percent: 40,
            },
          },
          availablePackages: [],
        },
      });
    });

    await page.route('**/hcgi/api/learning/plan/recalculate', async (route) => {
      recalculationRequests += 1;
      const today = new Date().toISOString().slice(0, 10);

      await route.fulfill({
        json: {
          success: true,
          rescheduledAssignments: 3,
          learningPlan: {
            enabled: true,
            requiredTierSlug: 'z3-struktur',
            hasPlan: true,
            plan: {
              id: 'plan_1',
              status: 'active',
              tierSlug: 'z3-struktur',
              dailyGoalMinutes: 45,
              weeklyGoalTopics: 5,
              recalculationState: 'none',
              recalculatedAt: '2026-05-15T00:00:00.000Z',
            },
            sections: {
              today: [{
                id: 'assignment_today_recalculated',
                title: 'Offene Grundlagen wiederholen',
                description: 'Neu eingeplant fuer heute.',
                status: 'open',
                assignmentType: 'catch_up',
                assignedDate: today,
                dueDate: today,
                estimatedMinutes: 18,
                topic: {
                  id: 'module_basics',
                  slug: 'z3-struktur-basics',
                  title: 'Grundlagen',
                },
                path: '/learning/topics/z3-struktur/z3-struktur-basics',
              }],
              catchUp: [],
              preparation: [],
            },
            continueAssignment: {
              id: 'assignment_today_recalculated',
              title: 'Offene Grundlagen wiederholen',
              description: 'Neu eingeplant fuer heute.',
              path: '/learning/topics/z3-struktur/z3-struktur-basics',
            },
            behindState: {
              status: 'none',
              behindDays: 0,
              overdueAssignments: 0,
            },
            recalculation: {
              state: 'none',
              canRecalculate: false,
              offeredAt: '',
              recalculatedAt: '2026-05-15T00:00:00.000Z',
            },
            feedback: {
              code: 'on_track',
              messageKey: 'learning.plan_feedback_on_track',
              params: {},
              tone: 'success',
            },
            weeklyProgress: {
              scope: 'weekly',
              completedAssignments: 3,
              totalAssignments: 5,
              completedMinutes: 70,
              targetMinutes: 120,
              percent: 60,
            },
            overallProgress: {
              scope: 'overall',
              completedAssignments: 8,
              totalAssignments: 20,
              completedMinutes: 240,
              targetMinutes: 600,
              percent: 40,
            },
            summary: {
              totalAssignments: 20,
              completedAssignments: 8,
              openAssignments: 10,
              overdueAssignments: 0,
              repeatAssignments: 1,
              totalTargetMinutes: 600,
              completedMinutes: 240,
              percent: 40,
            },
          },
        },
      });
    });
  });

  test('shows the Z3 Struktur plan sections and direct continue link', async ({ page }) => {
    await page.goto('/learning/dashboard');

    const planSection = page.locator('section').filter({ hasText: 'Dein Lernplan' });
    await expect(planSection.getByRole('heading', { name: 'Dein Lernplan' })).toBeVisible();
    await expect(planSection.getByText('Heute').first()).toBeVisible();
    await expect(planSection.getByText('Nacharbeiten').first()).toBeVisible();
    await expect(planSection.getByText('Vorarbeiten').first()).toBeVisible();
    await expect(planSection.getByText('Wochenfortschritt')).toBeVisible();
    await expect(planSection.getByText('Gesamtfortschritt')).toBeVisible();
    await expect(planSection.getByRole('heading', { name: 'Road-to-Z3 Orientierung' }).first()).toBeVisible();
    await expect(planSection.getByRole('heading', { name: 'Offene Grundlagen wiederholen' })).toBeVisible();
    await expect(planSection.getByRole('heading', { name: 'Naechstes Thema vorbereiten' })).toBeVisible();

    await expect(planSection.getByRole('link', { name: /Weiterlernen/ })).toHaveAttribute(
      'href',
      '/learning/topics/z3-struktur/z3-struktur-orientation/subtopics/start-here',
    );
  });

  test('offers recalculation after a long pause and updates the plan state', async ({ page }) => {
    dashboardMode = 'long_pause';
    await page.goto('/learning/dashboard');

    const planSection = page.locator('section').filter({ hasText: 'Dein Lernplan' });
    await expect(planSection.getByText('Du bist 8 Tage im Rueckstand. Du kannst den Lernplan neu berechnen.')).toBeVisible();

    await planSection.getByRole('button', { name: 'Lernplan neu berechnen' }).click();

    expect(recalculationRequests).toBe(1);
    await expect(page.getByText('Lernplan wurde neu berechnet.')).toBeVisible();
    await expect(planSection.getByText('Du bist im Plan.')).toBeVisible();
    await expect(planSection.getByRole('button', { name: 'Lernplan neu berechnen' })).toHaveCount(0);
  });
});
