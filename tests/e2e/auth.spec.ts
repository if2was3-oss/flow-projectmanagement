import { test, expect } from '@playwright/test';
test('authentication gates real data and handles invalid credentials in Hungarian', async ({
  page,
}) => {
  await page.route('http://127.0.0.1:54321/**', async (route) => {
    if (route.request().url().includes('/auth/v1/token'))
      return route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ code: 'invalid_credentials', msg: 'Invalid login credentials' }),
      });
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Jó újra itt látni.' })).toBeVisible();
  await expect(page.locator('.app-shell')).not.toBeVisible();
  await page.getByLabel('E-mail-cím').fill('teszt@flow.test');
  await page.getByLabel('Jelszó', { exact: true }).fill('hibas-jelszo');
  await page.getByRole('button', { name: 'Bejelentkezés', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText('Hibás e-mail-cím vagy jelszó.');
  await page.getByRole('button', { name: 'Mintakörnyezet megnyitása' }).click();
  await expect(page.getByRole('heading', { name: 'Lássuk, mi van ma a fókuszban.' })).toBeVisible();
});
test('registration and password recovery show confirmation instructions', async ({ page }) => {
  await page.route('http://127.0.0.1:54321/**', async (route) => {
    const url = route.request().url();
    if (url.includes('/auth/v1/signup'))
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: '00000000-0000-4000-8000-000000000099',
          email: 'teszt@flow.test',
          aud: 'authenticated',
          created_at: new Date().toISOString(),
          identities: [],
        }),
      });
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Új vagy itt? Hozz létre egy fiókot' }).click();
  await page.getByLabel('Teljes név').fill('Teszt Anna');
  await page.getByLabel('E-mail-cím').fill('teszt@flow.test');
  await page.getByLabel('Jelszó', { exact: true }).fill('teszt-jelszo-123');
  await page.getByRole('button', { name: 'Fiók létrehozása', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('erősítsd meg a regisztrációt');
  await page.getByRole('button', { name: 'Már van fiókod? Jelentkezz be' }).click();
  await page.getByRole('button', { name: 'Elfelejtetted a jelszavad?' }).click();
  await page.getByRole('button', { name: 'Helyreállítási levél küldése' }).click();
  await expect(page.getByRole('status')).toContainText('elküldtük a helyreállítási levelet');
});
