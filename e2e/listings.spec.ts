import { test, expect } from '@playwright/test';

test('real API and database support filtering, sorting, paging, details, gallery and browser history', async ({
  page,
}, testInfo) => {
  await page.goto('/?limit=2');
  await expect(page.getByRole('heading', { name: 'Property Listings' })).toBeVisible();
  await page.getByRole('textbox', { name: 'City', exact: true }).fill('Pasadena');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await page.getByLabel('Sort by', { exact: true }).selectOption('price');
  await page.getByLabel('Order', { exact: true }).selectOption('ASC');
  await expect(page.getByText('Showing 1-2 of 3 properties')).toBeVisible();
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
  await expect(page).toHaveURL(/\/property\/[a-f0-9-]+/);
  await expect(page.getByText('101 Example Grove', { exact: true })).toBeVisible();
  await expect(page.getByText('America/Los_Angeles')).toBeVisible();
  await page.getByRole('button', { name: 'Open property photo viewer' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Next photo', exact: true }).click();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.getByRole('button', { name: /Back to Listings/ }).click();
  await expect(page).toHaveURL(listingUrl);
  await expect(page.getByRole('textbox', { name: 'City', exact: true })).toHaveValue('Pasadena');
  await page.reload();
  await expect(page.getByText('Showing 1-2 of 3 properties')).toBeVisible();
});

test('mobile layout and a direct detail reload preserve the listing and open-house information', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/?zipcode=02108');
  await expect(page.getByRole('link', { name: 'View 808 Example Street' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.getByRole('link', { name: 'View 808 Example Street' }).click();
  await expect(page.getByText('808 Example Street', { exact: true })).toBeVisible();
  await expect(page.getByText('America/New_York')).toBeVisible();
  await page.reload();
  await expect(page.getByText('808 Example Street', { exact: true })).toBeVisible();
  await expect(page.getByText('America/New_York')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.screenshot({ path: testInfo.outputPath('detail-mobile.png'), fullPage: true });
});

test('invalid searches, empty results and missing listings have recoverable states', async ({
  page,
}) => {
  await page.goto('/?minPrice=100&maxPrice=10');
  await expect(page.getByRole('heading', { name: 'Invalid search' })).toBeVisible();
  await page.getByRole('button', { name: 'Reset search' }).click();
  await page.getByRole('textbox', { name: 'City', exact: true }).fill('No Such Demo City');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'No properties found' })).toBeVisible();
  await page.goto('/property/00000000-0000-4000-8000-000000000000');
  await expect(page.getByRole('heading', { name: 'Unable to load property' })).toBeVisible();
  await page.getByRole('button', { name: /Back to Listings/ }).click();
  await expect(page.getByRole('heading', { name: 'Property Listings' })).toBeVisible();
});
