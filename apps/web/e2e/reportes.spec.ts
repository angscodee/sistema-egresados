/**
 * E2E: Generación de reporte → polling → descarga PDF
 */
import { expect, test, type Page } from '@playwright/test';

async function loginAdmin(page: Page) {
  await page.goto('/login');
  await page.getByLabel(/correo/i).fill('admin@example.com');
  await page.getByLabel(/contraseña/i).fill('password123');
  await page.getByRole('button', { name: /entrar/i }).click();
  await page.waitForURL(/\/admin/, { timeout: 10_000 });
}

test.describe('Panel de reportes', () => {
  test('Admin puede generar un reporte y verlo en el historial', async ({ page }) => {
    await loginAdmin(page);
    await page.goto('/reportes');

    // Select report type
    await page.getByRole('combobox', { name: /tipo de reporte/i }).click();
    await page.getByRole('option', { name: /resumen de empleabilidad/i }).click();

    // Click generate
    await page.getByRole('button', { name: /generar pdf/i }).click();

    // Button should show loading state briefly
    // Then the history table should show a new row
    await expect(
      page.getByRole('cell', { name: /empleabilidad/i }).first(),
    ).toBeVisible({ timeout: 15_000 });
  });

  test('El reporte aparece en el historial con estado Pendiente o Listo', async ({ page }) => {
    await loginAdmin(page);
    await page.goto('/reportes');

    // Generate a report
    await page.getByRole('button', { name: /generar pdf/i }).click();

    // Wait for the row to appear
    await expect(
      page.getByRole('cell', { name: /pendiente|listo/i }).first(),
    ).toBeVisible({ timeout: 15_000 });
  });

  test('El botón de descarga se habilita cuando el reporte está Listo', async ({ page }) => {
    await loginAdmin(page);
    await page.goto('/reportes');

    // Generate
    await page.getByRole('button', { name: /generar pdf/i }).click();

    // Poll until COMPLETADO (max 30s — worker must be running)
    await expect(async () => {
      const badge = page.getByText('Listo').first();
      await expect(badge).toBeVisible();
    }).toPass({ timeout: 30_000, intervals: [3_000] });

    // Download button should be enabled
    const downloadBtn = page.getByRole('button', { name: /descargar/i }).first();
    await expect(downloadBtn).toBeEnabled({ timeout: 5_000 });
  });
});
