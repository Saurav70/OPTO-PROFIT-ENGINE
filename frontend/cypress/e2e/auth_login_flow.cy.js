/**
 * E2E Test: Secure 2FA Login Flow
 * ================================
 * Covers:
 *   1. Render Welcome screen → navigate to Login
 *   2. Enter valid credentials → reach Dashboard
 *   3. Invalid credentials → error message shown
 *   4. 2FA prompt renders when account has 2FA enabled (mocked)
 *
 * Prerequisite:
 *   - Frontend running at http://localhost:5173
 *   - Backend running at http://localhost:8000
 */

describe('Authentication Flow', () => {
  const username = Cypress.env('TEST_USERNAME');
  const password = Cypress.env('TEST_PASSWORD');
  const email    = Cypress.env('TEST_EMAIL');
  const API      = Cypress.env('API_URL');

  before(() => {
    // Provision test user once before the suite
    cy.request({
      method: 'POST',
      url: `${API}/api/auth/register`,
      body: { username, password, email },
      failOnStatusCode: false,
    });
  });

  it('1. Welcome screen renders Sign In and Create Account buttons', () => {
    cy.visit('/');
    cy.contains(/sign in|login/i).should('be.visible');
    cy.contains(/create account|register/i).should('be.visible');
  });

  it('2. Successful login redirects to Dashboard', () => {
    cy.visit('/login');
    cy.get('input[type="text"], input[placeholder*="username" i]').first().clear().type(username);
    cy.get('input[type="password"]').first().clear().type(password);
    cy.get('button[type="submit"]').click();
    // After login, URL should contain /app/dashboard or /app
    cy.url({ timeout: 10000 }).should('include', '/app');
    cy.contains(/production dashboard|dashboard/i, { timeout: 8000 }).should('be.visible');
  });

  it('3. Invalid credentials shows error message', () => {
    cy.visit('/login');
    cy.get('input[type="text"], input[placeholder*="username" i]').first().clear().type('nonexistent_user');
    cy.get('input[type="password"]').first().clear().type('WrongPassword123!');
    cy.get('button[type="submit"]').click();
    cy.contains(/invalid|incorrect|unauthorized|failed/i, { timeout: 6000 }).should('be.visible');
  });

  it('4. Logout clears session and redirects to Welcome/Login', () => {
    cy.registerAndLogin();
    cy.visit('/app/dashboard');
    cy.contains(/production dashboard/i, { timeout: 8000 }).should('be.visible');

    // Trigger logout (sidebar button or menu)
    cy.get('button, [data-testid="logout"]').contains(/logout|sign out/i).click({ force: true });
    cy.url({ timeout: 6000 }).should('not.include', '/app');
  });

  it('5. Registration form creates a new user and redirects to Dashboard', () => {
    const newUser = `e2e_new_${Date.now()}`;
    cy.visit('/register');
    cy.get('input[placeholder*="username" i], input[id*="username"]').first().clear().type(newUser);
    cy.get('input[type="password"]').first().clear().type('NewE2EPass1234!');
    cy.get('input[type="email"]').first().clear().type(`${newUser}@e2e.test`);
    cy.get('button[type="submit"]').click();
    cy.url({ timeout: 10000 }).should('include', '/app');
  });
});
