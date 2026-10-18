import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function noAccessibilityViolations(page: Page) {
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(result.violations).toEqual([]);
}

test('real API supports search, one sort control, paging, keyboard links and returning to the same search', async ({
  page,
}, testInfo) => {
  await page.goto('/?limit=2');
  await expect(page.getByRole('heading', { name: '12 homes', exact: true })).toBeVisible();
  await expect(page.getByText('All locations', { exact: true })).toBeVisible();
  await page.getByRole('textbox', { name: 'City or ZIP code' }).fill('Pasadena');
  await expect(page.getByRole('heading', { name: '12 homes', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Search listings' }).click();
  await page.getByLabel('Sort listings').selectOption('price:ASC');
  await expect(page.getByText('Showing 1–2 of 3')).toBeVisible();
  await expect(page.getByRole('link', { name: 'View 202 Sample Terrace' })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('listings-desktop.png'), fullPage: true });
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page).toHaveURL(/offset=2/);
  await expect(page.getByRole('link', { name: 'View 10 Learning Road' })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('link', { name: 'View 101 Example Grove' })).toBeVisible();
  const listingUrl = page.url();
  await page.getByRole('link', { name: 'View 101 Example Grove' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: '101 Example Grove', exact: true })).toBeVisible();
  await expect(page.getByText('America/Los_Angeles')).toBeVisible();
  await page.getByRole('button', { name: 'Enlarge property photo 1' }).click();
  const dialog = page.getByRole('dialog', { name: 'Property photos' });
  await expect(dialog).toBeVisible();
  const close = dialog.getByRole('button', { name: 'Close photos' });
  await expect(close).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(dialog.getByRole('button', { name: 'Next photo' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(close).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(dialog.getByText('2 / 2')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await page.getByRole('button', { name: 'Back to listings', exact: true }).click();
  await expect(page).toHaveURL(listingUrl);
  await expect(page.getByRole('textbox', { name: 'City or ZIP code' })).toHaveValue('Pasadena');
  await page.reload();
  await expect(page.getByText('Showing 1–2 of 3')).toBeVisible();
});

test('desktop search and sort stay visible, preserve a location draft, and adapt the sidebar grid', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1100, height: 800 });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '12 homes', exact: true })).toBeVisible();
  const grid = page.locator('.property-grid');
  expect(
    await grid.evaluate(
      (element) => getComputedStyle(element).gridTemplateColumns.split(' ').length,
    ),
  ).toBe(2);
  await page.mouse.wheel(0, 1000);
  await expect(page.getByLabel('Sort listings')).toBeInViewport();
  await expect(page.getByRole('button', { name: 'Apply filters' })).toBeInViewport();
  const location = page.getByRole('textbox', { name: 'City or ZIP code' });
  await location.fill('Pasadena');
  await page.getByLabel('Sort listings').selectOption('price:ASC');
  await expect(location).toHaveValue('Pasadena');
  await expect(page).not.toHaveURL(/city=Pasadena/);
  await page.getByRole('button', { name: 'Filters', exact: true }).click();
  expect(
    await grid.evaluate(
      (element) => getComputedStyle(element).gridTemplateColumns.split(' ').length,
    ),
  ).toBe(3);
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(page.getByRole('button', { name: 'Filters', exact: true })).toHaveCount(0);
  await expect(page.getByRole('form', { name: 'Property filters' })).toBeVisible();
  expect(
    await grid.evaluate(
      (element) => getComputedStyle(element).gridTemplateColumns.split(' ').length,
    ),
  ).toBe(3);
});

test('phone filter sheet applies explicitly, cancels drafts and preserves detail scroll around quick photos', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/?city=Pasadena&sortBy=price&sortOrder=ASC');
  await expect(page.getByRole('heading', { name: '3 homes', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Search and filters' }).click();
  const sheet = page.getByRole('dialog', { name: 'Search & filters', exact: true });
  await expect(sheet.getByRole('button', { name: 'Cancel' })).toBeFocused();
  expect((await sheet.boundingBox())!.width).toBeCloseTo(390, 0);
  await sheet.getByRole('textbox', { name: 'City or ZIP code' }).fill('Irvine');
  await sheet.getByLabel('Sort', { exact: true }).selectOption('price:DESC');
  await sheet.getByRole('button', { name: 'Cancel' }).click();
  await expect(page).toHaveURL(/city=Pasadena/);
  await expect(page.getByRole('button', { name: 'Search and filters' })).toBeFocused();
  await page.getByRole('button', { name: 'Search and filters' }).click();
  await expect(sheet.getByRole('textbox', { name: 'City or ZIP code' })).toHaveValue('Pasadena');
  await sheet.getByRole('button', { name: 'Show homes' }).click();
  await page.getByRole('link', { name: 'View 101 Example Grove' }).click();
  const openHouse = page.getByRole('heading', { name: 'Open houses', exact: true });
  const description = page.getByRole('heading', { name: 'Take a closer look' });
  expect((await openHouse.boundingBox())!.y).toBeLessThan((await description.boundingBox())!.y);
  await page.getByRole('heading', { name: 'Property details' }).scrollIntoViewIfNeeded();
  const scrollBefore = await page.evaluate(() => window.scrollY);
  expect(scrollBefore).toBeGreaterThan(0);
  await page.getByRole('button', { name: 'Photos', exact: true }).click();
  const photos = page.getByRole('dialog', { name: 'Property photos' });
  await expect(photos.getByRole('button', { name: 'Close photos' })).toBeFocused();
  const viewerBounds = (await photos.boundingBox())!;
  const viewport = await page.evaluate(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
  }));
  expect(viewerBounds.x).toBeCloseTo(0, 0);
  expect(viewerBounds.y).toBeCloseTo(0, 0);
  expect(Math.abs(viewerBounds.width - viewport.width)).toBeLessThan(1);
  expect(Math.abs(viewerBounds.height - viewport.height)).toBeLessThan(1);
  await expect(photos.locator('.photo-rail-fullscreen').getByRole('button')).toHaveCount(0);
  await photos.getByRole('button', { name: 'Next photo' }).click();
  await expect(photos.getByText('2 / 2')).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('photos-mobile.png') });
  await photos.getByRole('button', { name: 'Close photos' }).click();
  await expect(page.getByRole('button', { name: 'Photos', exact: true })).toBeFocused();
  expect(Math.abs((await page.evaluate(() => window.scrollY)) - scrollBefore)).toBeLessThan(3);
  await page.screenshot({ path: testInfo.outputPath('detail-mobile.png'), fullPage: true });
  await page.getByRole('button', { name: 'Back to listings', exact: true }).click();
  await expect(page).toHaveURL(/city=Pasadena.*sortOrder=ASC/);
});

test('phone ZIP search, direct detail reload and 320px and landscape layouts remain usable', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '12 homes', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Search and filters' }).click();
  const sheet = page.getByRole('dialog', { name: 'Search & filters', exact: true });
  await sheet.getByRole('textbox', { name: 'City or ZIP code' }).fill('02108');
  await expect(sheet.getByRole('button', { name: 'Show homes' })).toBeInViewport();
  await sheet.getByRole('button', { name: 'Show homes' }).click();
  await expect(page.getByRole('heading', { name: '1 home', exact: true })).toBeVisible();
  await expect(page.getByText('in ZIP 02108')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.getByRole('link', { name: 'View 808 Example Street' }).click();
  await expect(page.getByText('America/New_York')).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole('heading', { name: '808 Example Street', exact: true }),
  ).toBeVisible();
  await page.setViewportSize({ width: 844, height: 390 });
  await expect(page.getByRole('button', { name: 'Photos', exact: true })).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});

test('invalid filters, zero results, individual chip removal and unavailable links are recoverable', async ({
  page,
}) => {
  await page.goto('/?minPrice=100&maxPrice=10');
  await expect(page.getByRole('heading', { name: 'Invalid search' })).toBeVisible();
  await page.getByRole('button', { name: 'Reset search' }).click();
  await page.getByRole('textbox', { name: 'City or ZIP code' }).fill('No Such Demo City');
  await page.getByRole('button', { name: 'Search listings' }).click();
  await expect(page.getByRole('heading', { name: 'No homes match this search.' })).toBeVisible();
  await page.getByRole('button', { name: 'Remove No Such Demo City filter' }).click();
  await expect(page.getByRole('heading', { name: '12 homes', exact: true })).toBeVisible();
  await page.goto('/property/00000000-0000-4000-8000-000000000000');
  await expect(page.getByRole('heading', { name: 'This listing is unavailable.' })).toBeVisible();
  await page.getByRole('button', { name: 'Back to listings', exact: true }).click();
  await expect(page.getByRole('heading', { name: '12 homes', exact: true })).toBeVisible();
});

test('network failure provides a retry without removing the search', async ({ page }) => {
  await page.route('**/api/v1/listings?**', (route) =>
    route.fulfill({
      status: 503,
      json: { error: { code: 'SERVICE_UNAVAILABLE', message: 'Please try again shortly.' } },
    }),
  );
  await page.goto('/?city=Pasadena');
  await expect(page.getByRole('heading', { name: "Listings couldn't load." })).toBeVisible();
  await page.unroute('**/api/v1/listings?**');
  await page.getByRole('button', { name: 'Try again', exact: true }).click();
  await expect(page.getByRole('heading', { name: '3 homes', exact: true })).toBeVisible();
  await expect(page.getByText('in Pasadena')).toBeVisible();
});

test('light and dark results, filter dialog and photo dialog pass automated accessibility checks', async ({
  page,
}) => {
  await page.goto('/?limit=2');
  await expect(page.getByRole('heading', { name: '12 homes', exact: true })).toBeVisible();
  await noAccessibilityViolations(page);
  await page.getByRole('switch', { name: 'Dark theme' }).click();
  await noAccessibilityViolations(page);
  await page.reload();
  await expect(page.getByRole('switch', { name: 'Dark theme' })).toHaveAttribute(
    'aria-checked',
    'true',
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Search and filters' }).click();
  await noAccessibilityViolations(page);
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.getByRole('link').filter({ hasText: '11 Example Walk' }).click();
  await page.getByRole('button', { name: 'Photos', exact: true }).click();
  await noAccessibilityViolations(page);
});
