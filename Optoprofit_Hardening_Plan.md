# Optoprofit Engine: UI/UX Hardening & Responsiveness Plan

This document outlines the step-by-step implementation plan for modernizing the responsiveness, mobile accessibility, and empty states of the industrial engine dashboard. All styling will strictly utilize the project's custom **Vanilla CSS** tokens inside `index.css`.

---

## Phase 1: Responsive Module Layout & Collapsible Parameters

### Objective
Ensure complex data-heavy modules adapt perfectly to laptops, tablets, and smartphones without crowding the visualization canvas. 

### Specifications
*   **Desktop (>= 1025px):** Standard side-by-side flex layout. Controls sidebar stays fixed at `320px` wide.
*   **Tablet (768px to 1024px):** Controls sidebar becomes a collapsible **Side Drawer** sliding in from the right/left.
*   **Smartphone (< 768px):** Controls sidebar becomes a collapsible **Bottom Sheet** sliding up from the bottom.
*   **Trigger:** A sticky control bar at the bottom of the screen labeled `⚙️ Adjust Parameters` or a floating action button (FAB) appears on tablet and mobile to toggle the drawer/bottom sheet.

### Proposed Vanilla CSS (`index.css` additions)
```css
/* Drawer & Bottom Sheet Shell */
.module-drawer {
  position: fixed;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  box-shadow: 0 -10px 30px rgba(0, 0, 0, 0.25);
  z-index: 1000;
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  display: flex;
  flex-direction: column;
  padding: 1.5rem;
}

/* Tablet Side Drawer */
@media (min-width: 768px) and (max-width: 1024px) {
  .module-drawer {
    top: 0;
    right: 0;
    width: 340px;
    height: 100vh;
    transform: translateX(100%);
  }
  .module-drawer.open {
    transform: translateX(0);
  }
}

/* Mobile Bottom Sheet */
@media (max-width: 767px) {
  .module-drawer {
    left: 0;
    right: 0;
    bottom: 0;
    height: 70vh;
    border-radius: 20px 20px 0 0;
    transform: translateY(100%);
  }
  .module-drawer.open {
    transform: translateY(0);
  }
}

/* Parameter Toggle FAB / Sticky Bar */
.drawer-toggle-bar {
  display: none;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: var(--sidebar-bg);
  border-top: 1px solid var(--border-color);
  padding: 0.85rem;
  text-align: center;
  z-index: 999;
}

@media (max-width: 1024px) {
  .drawer-toggle-bar {
    display: block;
  }
}
```

---

## Phase 2: Table Scrollability (Vanilla CSS)

### Objective
Prevent dense industrial tables from breaking containment or causing ugly layout compression on small screens.

### Implementation Steps
1.  Add a generic wrapping utility class in React:
    ```jsx
    <div className="table-responsive-wrapper">
      <table style={{ minWidth: '700px' }}>...</table>
    </div>
    ```
2.  Use the `.table-responsive-wrapper` defined in `index.css` (with `overflow-x: auto` and `-webkit-overflow-scrolling: touch`) to ensure butter-smooth independent touch scrolling.
3.  Target modules: `LineOptimization.jsx`, `ProcessPlanning.jsx`, `FinancialAnalytics.jsx`.

---

## Phase 3: Accessibility & Input Density

### Objective
Provide clean, screen-reader friendly layouts in parameter sidebars.

### Implementation Steps
1.  **Strict Label Coupling:** Ensure all label elements use `htmlFor` correctly bound to matching input `id` attributes.
2.  **Descriptive Placeholders & ARIA:** Add explicit `aria-label` tags to inputs lacking visible descriptive text.
3.  **Keyboard Navigability:** Ensure interactive lists and collapsible headers support `tabIndex={0}` and can be closed/toggled via the `Enter` or `Space` key.

---

## Phase 4: Industrial Empty State Architecture

### Objective
Replace blank screens with premium, actionable feedback when sections (like conceptual layouts or networks) are opened without first uploading/creating task data.

### Implementation Steps
1.  **Create Reusable Component:** Write `src/components/EmptyState.jsx`. The component should accept:
    *   `icon` (Lucide-React icon component)
    *   `title` (heading text)
    *   `description` (detailed helper description)
    *   `actionText` (e.g., "Add Tasks First")
    *   `onAction` (navigation callback back to Process Ingestion/Planning)
2.  **Target Modules:** Add conditional empty-state rendering checks to the following modules:
    *   `PrecedenceNetwork.jsx` (`if (tasks.length === 0)`)
    *   `ConceptualLayout.jsx` (`if (tasks.length === 0)`)
    *   `FloorLayout.jsx` (`if (tasks.length === 0 || !config.productName)`)
3.  **Visual Aesthetic:** Incorporate TEIRAC standard `.conceptual-empty-state` styling with a dashed border, muted teal highlights, and a clean primary CTA button.

---

## Phase 5: Verification & Quality Assurance

### Automated Checks
*   Verify successful compilation with no React syntax or linter warnings.
*   Ensure zero console errors when toggling states.

### Responsive Manual Testing
*   **Desktop:** Sidebar remains static and interactive.
*   **Tablet:** Resize to 800px width. Confirm parameters collapse, a sticky `⚙️ Adjust Parameters` bar appears, and tapping it pulls out the side drawer.
*   **Mobile:** Resize to 480px width. Confirm the controls sidebar turns into a bottom sheet that slides up smoothly when triggered.
*   **No Data Scenario:** Clear all localStorage profiles, navigate directly to "Precedence Network" or "Conceptual Layout", and verify that the clean `<EmptyState />` displays with a navigation link to go back.
