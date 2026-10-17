import { test, expect } from '@playwright/test';
test('dashboard, navigation and responsive layout', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Lássuk, mi van ma a fókuszban.' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Mai feladatok 4/ })).toBeVisible();
  await page.screenshot({
    path: '/tmp/flow-dashboard.png',
    fullPage: true,
    animations: 'disabled',
  });
  for (const [nav, heading] of [
    ['Projektek', 'Projektek'],
    ['Feladatok', 'Feladatok'],
    ['Naptár', 'Naptár'],
    ['Csapat', 'A csapat'],
    ['Fájlok', 'Fájlok'],
    ['Beállítások', 'Beállítások'],
  ]) {
    await page
      .locator('.sidebar')
      .getByRole('button', { name: nav, exact: nav !== 'Feladatok' })
      .first()
      .click();
    await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Navigáció megnyitása' }).click();
  await page.locator('nav').getByRole('button', { name: 'Áttekintés' }).click();
  await expect(page.getByRole('heading', { name: 'Lássuk, mi van ma a fókuszban.' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.screenshot({ path: '/tmp/flow-mobile.png', fullPage: true, animations: 'disabled' });
  expect(errors).toEqual([]);
});
test('project and task lifecycle persists across reloads', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Új létrehozása' }).click();
  await page.getByRole('button', { name: 'Új projekt', exact: true }).last().click();
  let dialog = page.getByRole('dialog');
  await dialog.getByLabel('Projekt neve').fill('Teszt kampány');
  await dialog.getByLabel('Leírás').fill('Közös ötletből működő projekt.');
  await dialog.getByRole('button', { name: 'Projekt létrehozása' }).click();
  await expect(dialog).not.toBeVisible();
  await page.locator('nav').getByRole('button', { name: 'Projektek', exact: true }).click();
  await page.getByRole('button', { name: 'Teszt kampány', exact: true }).click();
  await page.getByRole('button', { name: 'Új feladat', exact: true }).click();
  dialog = page.getByRole('dialog');
  await dialog.getByLabel('Feladat neve').fill('Kreatív egyeztetés');
  await dialog
    .getByRole('combobox', { name: 'Felelős', exact: true })
    .selectOption({ label: 'Kiss Anna' });
  await dialog.getByRole('button', { name: 'Feladat létrehozása' }).click();
  await expect(page.getByRole('button', { name: 'Kreatív egyeztetés', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Kreatív egyeztetés', exact: true }).click();
  dialog = page.getByRole('dialog');
  await dialog.getByLabel('Új ellenőrzőpont').fill('Brief jóváhagyása');
  await dialog.getByRole('button', { name: 'Hozzáadás', exact: true }).click();
  await dialog.getByLabel('Brief jóváhagyása', { exact: true }).check();
  await dialog.getByRole('button', { name: /Hozzászólások/ }).click();
  await dialog.getByLabel('Új hozzászólás').fill('Kezdhetjük a munkát!');
  await dialog.getByRole('button', { name: 'Küldés', exact: true }).click();
  await expect(dialog.getByText('Kezdhetjük a munkát!', { exact: true })).toBeVisible();
  await dialog.getByRole('button', { name: /Csatolmányok/ }).click();
  await dialog.locator('input[type=file]').setInputFiles({
    name: 'brief.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('Flow kampánybrief'),
  });
  await expect(dialog.getByText('brief.txt', { exact: true })).toBeVisible();
  await dialog.getByRole('button', { name: 'Bezárás' }).click();
  await page.getByRole('button', { name: 'Befejezés: Kreatív egyeztetés' }).click();
  await expect(page.getByRole('button', { name: 'Újranyitás: Kreatív egyeztetés' })).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Keresés bárhol…' }).click();
  await page.getByLabel('Globális keresés').fill('Kreatív egyeztetés');
  await page.getByRole('button', { name: 'Kreatív egyeztetés', exact: true }).click();
  await expect(
    page.getByRole('dialog').getByRole('combobox', { name: 'Állapot', exact: true }),
  ).toHaveValue('done');
  await expect(
    page.getByRole('dialog').getByLabel('Brief jóváhagyása', { exact: true }),
  ).toBeChecked();
  await page.getByRole('button', { name: 'Bezárás' }).click();
  await page.locator('nav').getByRole('button', { name: 'Projektek', exact: true }).click();
  await page.getByRole('button', { name: 'Szerkesztés: Teszt kampány' }).click();
  await page.getByRole('button', { name: 'Archiválás', exact: true }).click();
  await page.getByRole('button', { name: 'Archívum', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Teszt kampány', exact: true })).toBeVisible();
});
test('kanban state changes, filtering and calendar navigation', async ({ page }) => {
  await page.goto('/');
  await page
    .locator('nav')
    .getByRole('button', { name: /Feladatok/ })
    .click();
  await page.getByRole('button', { name: 'Tábla', exact: true }).click();
  const select = page.getByLabel('Állapot: Közösségi média kreatívok véglegesítése');
  await select.selectOption('done');
  await expect(
    page
      .locator('.column-done')
      .getByRole('button', { name: 'Közösségi média kreatívok véglegesítése', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Lista', exact: true }).click();
  await page.getByRole('button', { name: 'Lejárt', exact: true }).click();
  await expect(page.locator('tbody tr')).toHaveCount(2);
  await page.getByRole('button', { name: 'Összes', exact: true }).click();
  await page.getByRole('button', { name: 'Idővonal', exact: true }).click();
  await expect(page.locator('.timeline-marker').first()).toBeVisible();
  await page.locator('nav').getByRole('button', { name: 'Naptár' }).click();
  const before = await page.locator('.calendar-panel h2').textContent();
  await page.getByRole('button', { name: 'Következő hónap' }).click();
  await expect(page.locator('.calendar-panel h2')).not.toHaveText(before!);
});
test('team assignments, notifications and workspace preferences', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Értesítések,/ }).click();
  await page.getByRole('button', { name: 'Mind olvasott' }).click();
  await expect(page.getByRole('button', { name: 'Értesítések, 0 olvasatlan' })).toBeVisible();
  await page.keyboard.press('Escape');
  await page.locator('nav').getByRole('button', { name: 'Csapat', exact: true }).click();
  await page
    .locator('tr')
    .filter({ hasText: 'Nagy Márk' })
    .getByRole('button', { name: /feladat/ })
    .click();
  await expect(page.locator('tbody tr')).toHaveCount(6);
  await expect(page.getByRole('combobox', { name: 'Felelős', exact: true })).toHaveValue(
    'demo-mark',
  );
  await page.locator('.sidebar').getByRole('button', { name: 'Beállítások', exact: true }).click();
  await page.getByLabel('Munkatér neve').fill('Közös Stúdió');
  await page.getByRole('button', { name: 'Munkatér mentése' }).click();
  await expect(page.locator('.workspace-switch')).toContainText('Közös Stúdió');
  await page.reload();
  await expect(page.locator('.workspace-switch')).toContainText('Közös Stúdió');
});
