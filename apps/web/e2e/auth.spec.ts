/**
 * E2E: Authentication flows
 * - Login redirects to the correct dashboard per role
 * - Invalid credentials show error
 * - Logout clears session
 */
import { expect, test } from '@playwright/test';

// Credentials seeded by prisma/seed.ts
const USERS = {
  admin: { email: 'admin@example.com', password: 'password123', dashboard: '/admin' },
  egresado: { email: 'egresado@example.com', password: 'password123', dashboard: '/egresado' },
  empresa: { email: 'empresa@example.com', password: 'password123', dashboard: '/empresa' },
};

test.describe('Login → dashboard redirect por rol', () => {
  for (const [role, creds] of Object.entries(USERS)) {
    test(`${role} es redirigido a ${creds.dashboard}`, async ({ page }) => {
      await page.goto('/login');

      await page.getByLabel(/correo/i).fill(creds.email);
      await page.getByLabel(/contraseña/i).fill(creds.password);
      await page.getByRole('button', { name: /entrar/i }).click();

      await page.waitForURL(`**${creds.dashboard}**`, { timeout: 10_000 });
      expect(page.url()).toContain(creds.dashboard);
    });
  }
});

test('credenciales inválidas muestran mensaje de error', async ({ page }) => {
  await page.goto('/login');

  await page.getByLabel(/correo/i).fill('noexiste@example.com');
  await page.getByLabel(/contraseña/i).fill('wrongpassword');
  await page.getByRole('button', { name: /entrar/i }).click();

  await expect(page.getByText(/credenciales inválidas/i)).toBeVisible({ timeout: 5_000 });
});

test('ruta protegida redirige a login si no hay sesión', async ({ page }) => {
  await page.goto('/admin');
  await page.waitForURL('**/login**', { timeout: 5_000 });
  expect(page.url()).toContain('/login');
});
