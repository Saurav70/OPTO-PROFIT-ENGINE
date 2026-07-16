const { test, expect, _electron: electron } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

test.describe('OPTO-PROFIT Electron E2E', () => {
  let electronApp;
  let window;

  test.beforeAll(async () => {
    // We expect the app to be packed before tests via `npm run pack`
    // The executable is typically in dist/win-unpacked/OPTO-PROFIT.exe
    const executablePath = path.join(__dirname, '..', '..', 'dist', 'win-unpacked', 'OPTO-PROFIT.exe');
    
    // Fallback for development testing
    const args = fs.existsSync(executablePath) ? [] : ['.'];
    const execPath = fs.existsSync(executablePath) ? executablePath : undefined;

    // Launch Electron app with the E2E flag so the backend uses a test database
    electronApp = await electron.launch({ 
      executablePath: execPath,
      args: args,
      env: {
        ...process.env,
        OPTO_E2E_TEST: '1'
      }
    });

    window = await electronApp.firstWindow();
  });

  test.afterAll(async () => {
    if (electronApp) {
      await electronApp.close();
    }
  });

  test('Launches and displays correct window title', async () => {
    const title = await window.title();
    expect(title).toBe('OPTO-PROFIT — Industrial Engineering Toolkit');
  });

  test('Frontend connects to backend and renders UI', async () => {
    // Wait for the main UI to render (e.g. login screen or dashboard)
    // The backend might take a few seconds to start up inside Electron.
    
    // We can just wait for a generic root element or title
    await window.waitForSelector('#root', { state: 'attached', timeout: 20000 });
    
    // Wait for the app title or a specific text to appear
    const bodyText = await window.textContent('body');
    // We expect something to render in the DOM
    expect(bodyText.length).toBeGreaterThan(0);
  });
});
