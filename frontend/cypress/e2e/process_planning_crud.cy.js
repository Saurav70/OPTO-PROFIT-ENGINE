/**
 * E2E Test: Process Planning CRUD
 * ================================
 * Covers:
 *   1. Process Planning table renders with default seeded tasks
 *   2. Add a new task via the "Add Task" button and form
 *   3. Edit an existing task inline and verify the change persists
 *   4. Delete a task and verify it disappears from the table
 *   5. Export CSV button is clickable
 *
 * Prerequisite:
 *   - Frontend at http://localhost:5173
 *   - Backend at http://localhost:8000 (serves /api/tasks with 10 seeded tasks)
 */

describe('Process Planning CRUD', () => {
  beforeEach(() => {
    // Bypass UI login — use custom command to provision session token
    cy.registerAndLogin();
    cy.navigateToModule('planning');
    // Wait for the task table to load
    cy.contains(/process planning|assembly tasks/i, { timeout: 10000 }).should('be.visible');
  });

  it('1. Default seeded tasks are visible in the table', () => {
    // The default seed contains "PCB Preparation & Kitting" as Task A
    cy.contains('PCB Preparation', { timeout: 8000 }).should('be.visible');
  });

  it('2. Add Task — new task appears in the table', () => {
    const newTaskName = `E2E Task ${Date.now()}`;

    // Click the "Add Task" or "+" button
    cy.get('button').contains(/add task|\+|new task/i).first().click();

    // Fill in the task form (modal or inline row)
    cy.get('input[placeholder*="task name" i], input[placeholder*="name" i]')
      .last().clear().type(newTaskName);
    cy.get('input[type="number"], input[placeholder*="time" i]')
      .last().clear().type('25');

    // Save
    cy.get('button').contains(/save|add|confirm/i).last().click();

    // Verify the new task appears
    cy.contains(newTaskName, { timeout: 6000 }).should('be.visible');
  });

  it('3. Edit a task — updated name persists after save', () => {
    const updatedName = `Updated PCB ${Date.now()}`;

    // Click edit on the first task row
    cy.get('table tbody tr').first().within(() => {
      cy.get('button').contains(/edit|pencil/i).click({ force: true });
    });

    // Update task name
    cy.get('input[value*="PCB" i], input').first().clear().type(updatedName);
    cy.get('button').contains(/save|update|confirm/i).last().click();

    cy.contains(updatedName, { timeout: 6000 }).should('be.visible');
  });

  it('4. Delete a task — task disappears from the table', () => {
    // Count rows before delete
    cy.get('table tbody tr').then(($rows) => {
      const countBefore = $rows.length;

      // Click delete on the last row
      cy.get('table tbody tr').last().within(() => {
        cy.get('button').contains(/delete|trash|remove/i).click({ force: true });
      });

      // Confirm deletion if modal appears
      cy.get('body').then(($body) => {
        if ($body.text().match(/confirm|are you sure/i)) {
          cy.get('button').contains(/yes|confirm|delete/i).click();
        }
      });

      // Verify row count decreased
      cy.get('table tbody tr', { timeout: 6000 }).should('have.length.lessThan', countBefore);
    });
  });

  it('5. Export CSV button is present and clickable', () => {
    cy.get('button').contains(/export csv|download csv|csv/i).should('be.visible').click({ force: true });
    // No assertion on file download — just verify no crash/error
  });
});
