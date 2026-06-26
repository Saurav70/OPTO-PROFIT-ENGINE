/**
 * Custom Cypress Commands for OPTO-PROFIT
 * =========================================
 * Reusable helpers to avoid duplication across specs.
 *
 * Usage in specs:
 *   cy.registerAndLogin()
 *   cy.loginWith(username, password)
 *   cy.navigateToModule('planning')
 */

const API = Cypress.env('API_URL') || 'http://localhost:8000';

// ── cy.registerAndLogin() ─────────────────────────────────────────────────────
// Registers a fresh test user via API and sets the Bearer token in localStorage.
// This bypasses the UI login form for specs that don't need to test auth itself.
Cypress.Commands.add('registerAndLogin', () => {
  const username = Cypress.env('TEST_USERNAME');
  const password = Cypress.env('TEST_PASSWORD');
  const email    = Cypress.env('TEST_EMAIL');

  // Try register — ignore 400 (user already exists)
  cy.request({
    method: 'POST',
    url: `${API}/api/auth/register`,
    body: { username, password, email },
    failOnStatusCode: false,
  });

  // Login and persist token
  cy.request('POST', `${API}/api/auth/login`, { username, password })
    .then((res) => {
      const token = res.body.access_token;
      window.localStorage.setItem('opto_auth_token', token);
      // Also store in the format the Zustand auth store expects
      window.localStorage.setItem(
        'opto-auth-storage',
        JSON.stringify({ state: { token, isAuthenticated: true }, version: 0 })
      );
    });
});

// ── cy.loginWith(username, password) ─────────────────────────────────────────
// Fills and submits the login form — use when testing the auth UI itself.
Cypress.Commands.add('loginWith', (username, password) => {
  cy.visit('/login');
  cy.get('input[type="text"], input[id*="username"], input[placeholder*="username" i]')
    .first().clear().type(username);
  cy.get('input[type="password"]').first().clear().type(password);
  cy.get('button[type="submit"], button').contains(/sign in|login/i).click();
});

// ── cy.navigateToModule(module) ───────────────────────────────────────────────
// Clicks the sidebar link for the given module name.
Cypress.Commands.add('navigateToModule', (module) => {
  const routeMap = {
    dashboard:    '/app/dashboard',
    planning:     '/app/process-planning',
    optimization: '/app/line-optimization',
    financials:   '/app/financial-analytics',
    precedence:   '/app/precedence-network',
    layout:       '/app/floor-layout',
  };
  cy.visit(routeMap[module] || `/app/${module}`);
});
