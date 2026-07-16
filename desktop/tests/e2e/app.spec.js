const { test, expect, _electron: electron } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

// ── Test Config ────────────────────────────────────────────────────
const EXEC_PATH = path.join(__dirname, '..', '..', 'dist', 'win-unpacked', 'OPTO-PROFIT.exe');
const DEV_MODE = !fs.existsSync(EXEC_PATH);

const TEST_USER = {
  username: `e2e_user_${Date.now()}`,
  password: 'TestPassword123!',
  company: 'E2E Test Corp',
};


// ── Suite ─────────────────────────────────────────────────────────
test.describe('OPTO-PROFIT Electron E2E', () => {
  let electronApp;
  let page;

  test.beforeAll(async () => {
    electronApp = await electron.launch({
      executablePath: DEV_MODE ? undefined : EXEC_PATH,
      args: DEV_MODE ? ['.'] : [],
      env: {
        ...process.env,
        OPTO_E2E_TEST: '1',
      },
    });
    page = await electronApp.firstWindow();
    // Give the backend sidecar time to start
    await page.waitForTimeout(4000);
  });

  test.afterAll(async () => {
    if (electronApp) await electronApp.close();
  });


  // ── Smoke Tests ─────────────────────────────────────────────────
  test('window title is correct', async () => {
    const title = await page.title();
    expect(title).toBe('OPTO-PROFIT — Industrial Engineering Toolkit');
  });

  test('root element mounts', async () => {
    await page.waitForSelector('#root', { state: 'attached', timeout: 20000 });
    const html = await page.innerHTML('#root');
    expect(html.length).toBeGreaterThan(100);
  });


  // ── License Gate ────────────────────────────────────────────────
  test('license screen appears when no license is activated', async () => {
    // In E2E mode with a fresh test DB, no license should be present
    // The app should show the license activation screen
    const bodyText = await page.textContent('body');
    // Check for either login screen or license screen
    const hasLoginOrLicense =
      bodyText.includes('Sign In') ||
      bodyText.includes('Login') ||
      bodyText.includes('License') ||
      bodyText.includes('Activate');
    expect(hasLoginOrLicense).toBeTruthy();
  });


  // ── Backend Health ───────────────────────────────────────────────
  test('backend /api/status returns ok', async () => {
    // Evaluate a fetch in the Electron renderer process
    const result = await page.evaluate(async () => {
      try {
        const res = await fetch('http://localhost:8000/api/status');
        return await res.json();
      } catch (e) {
        return { error: e.message };
      }
    });
    expect(result.status).toBe('ok');
  });

  test('backend /api/health returns healthy', async () => {
    const result = await page.evaluate(async () => {
      try {
        const res = await fetch('http://localhost:8000/api/health');
        return await res.json();
      } catch (e) {
        return { error: e.message };
      }
    });
    // Health endpoint should return a status field
    expect(result).toHaveProperty('status');
  });


  // ── Migration Gate ──────────────────────────────────────────────
  test('api returns 503 MIGRATION_REQUIRED or normal response (not 500)', async () => {
    const result = await page.evaluate(async () => {
      const res = await fetch('http://localhost:8000/api/tasks', {
        headers: { Authorization: 'Bearer invalid_token' },
      });
      return { status: res.status };
    });
    // Should be 401 (unauthorized), 403 (no license), or 503 (migration) — never 500
    expect([401, 403, 503]).toContain(result.status);
  });


  // ── Window Controls ─────────────────────────────────────────────
  test('window is visible and not minimized', async () => {
    const isVisible = await electronApp.evaluate(({ BrowserWindow }) => {
      const win = BrowserWindow.getAllWindows()[0];
      return win && win.isVisible() && !win.isMinimized();
    });
    expect(isVisible).toBeTruthy();
  });

  test('window has minimum dimensions (800x600)', async () => {
    const bounds = await electronApp.evaluate(({ BrowserWindow }) => {
      const win = BrowserWindow.getAllWindows()[0];
      return win.getBounds();
    });
    expect(bounds.width).toBeGreaterThanOrEqual(800);
    expect(bounds.height).toBeGreaterThanOrEqual(600);
  });
});
