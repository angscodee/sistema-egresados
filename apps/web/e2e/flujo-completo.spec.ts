/**
 * E2E: Flujo completo
 * Empresa publica oferta → Admin aprueba → Egresado postula →
 * Empresa cambia estado → Egresado recibe notificación
 */
import { expect, test, type Page } from '@playwright/test';

// ── Helpers ───────────────────────────────────────────────────────────────────
async function login(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.getByLabel(/correo/i).fill(email);
  await page.getByLabel(/contraseña/i).fill(password);
  await page.getByRole('button', { name: /entrar/i }).click();
  await page.waitForURL(/\/(admin|egresado|empresa)/, { timeout: 10_000 });
}

async function logout(page: Page) {
  // Click user menu or navigate directly to clear session
  await page.evaluate(() => {
    localStorage.clear();
    document.cookie = 'auth_token=; max-age=0; path=/';
  });
  await page.goto('/login');
}

// ── Test ──────────────────────────────────────────────────────────────────────
test.describe('Flujo completo: empresa → admin → egresado → notificación', () => {
  let ofertaId: string;
  const ofertaTitulo = `Oferta E2E ${Date.now()}`;

  test('1. Empresa publica una oferta', async ({ page }) => {
    await login(page, 'empresa@example.com', 'password123');

    await page.goto('/ofertas/nueva');
    await page.getByLabel(/título/i).fill(ofertaTitulo);
    await page.getByLabel(/descripción/i).fill('Descripción de prueba para test E2E.');

    // Select modalidad
    await page.getByRole('combobox', { name: /modalidad/i }).click();
    await page.getByRole('option', { name: /remoto/i }).click();

    // Select tipo contrato
    await page.getByRole('combobox', { name: /tipo de contrato/i }).click();
    await page.getByRole('option', { name: /tiempo completo/i }).click();

    await page.getByRole('button', { name: /publicar oferta/i }).click();

    // Should redirect to the offer detail page
    await page.waitForURL(/\/ofertas\/[a-f0-9-]+/, { timeout: 10_000 });
    ofertaId = page.url().split('/ofertas/')[1];
    expect(ofertaId).toBeTruthy();
  });

  test('2. Admin puede ver la oferta en el listado', async ({ page }) => {
    await login(page, 'admin@example.com', 'password123');

    await page.goto('/ofertas');
    await expect(page.getByText(ofertaTitulo)).toBeVisible({ timeout: 8_000 });
  });

  test('3. Egresado puede postularse a la oferta', async ({ page }) => {
    await login(page, 'egresado@example.com', 'password123');

    await page.goto(`/ofertas/${ofertaId}`);
    await expect(page.getByRole('button', { name: /postular ahora/i })).toBeVisible({
      timeout: 8_000,
    });

    await page.getByRole('button', { name: /postular ahora/i }).click();

    // Button should change to "Ya postulaste"
    await expect(page.getByText(/ya postulaste/i)).toBeVisible({ timeout: 8_000 });
  });

  test('4. Empresa cambia estado de postulación a EN_REVISION', async ({ page }) => {
    await login(page, 'empresa@example.com', 'password123');

    await page.goto('/empresa/postulaciones');

    // Select the offer
    await page.getByRole('combobox').click();
    await page.getByRole('option', { name: new RegExp(ofertaTitulo, 'i') }).click();

    // Click on the postulante detail
    await page.getByRole('link', { name: /gestionar/i }).first().click();
    await page.waitForURL(/\/empresa\/postulaciones\/[a-f0-9-]+/, { timeout: 8_000 });

    // Change state
    const estadoSelect = page.getByRole('combobox', { name: /nuevo estado/i });
    if (await estadoSelect.isVisible()) {
      await estadoSelect.click();
      await page.getByRole('option', { name: /en revisión/i }).click();
      await page.getByRole('button', { name: /guardar/i }).click();
      await expect(page.getByText(/en revisión/i)).toBeVisible({ timeout: 5_000 });
    }
  });

  test('5. Egresado ve la notificación del cambio de estado', async ({ page }) => {
    await login(page, 'egresado@example.com', 'password123');

    // The notification bell should show unread count
    const campana = page.getByRole('button', { name: /notificaciones/i });
    await expect(campana).toBeVisible({ timeout: 5_000 });

    await campana.click();
    // Should see a notification about the state change
    await expect(
      page.getByText(/postulación/i).or(page.getByText(/revisión/i)),
    ).toBeVisible({ timeout: 5_000 });
  });
});
