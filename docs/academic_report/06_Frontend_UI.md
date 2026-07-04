# 6. Frontend Implementation & Spatial Rendering

## 6.1 React SPA & Core State
The OPTO-PROFIT client tier is a heavily optimized React 19 Single Page Application. It leverages a centralized, asynchronous data flow orchestrated by `Zustand`. By abandoning the rigid provider wrappers required by Redux, Zustand enables decoupled components (e.g., the 3D Floor Layout and the Financial Dashboard) to subscribe to discrete slices of state, preventing unnecessary global re-renders.

## 6.2 Precedence Network Mapping (DAGs)
Assembly line algorithms mandate strict sequencing constraints. To visualize these constraints, OPTO-PROFIT utilizes the `@xyflow/react` library to render Directed Acyclic Graphs (DAGs) in the `PrecedenceNetwork.jsx` component.

Tasks are represented as draggable SVG nodes, and dependencies are drawn as Bézier curves connecting the source and target nodes. If a user attempts to draw a cyclic dependency (e.g., Task A relies on Task B, which relies on Task A), a local BFS cycle-detection algorithm instantly blocks the action and flags a topological error, preventing infinite loops in the optimizer.

## 6.3 Dynamic Spatial Rendering (FloorLayout.jsx)
A cornerstone of the OPTO-PROFIT UX is the `FloorLayout.jsx` component—a high-fidelity, interactive 2D floor plan visualizer. 

Rather than merely outputting lists of assigned stations, the engine dynamically renders SVG machine representations (e.g., robots, CNC machines, conveyors) on an interactive HTML5 Canvas grid. The canvas supports:
- **Pan and Zoom Engine**: Native mouse wheel listeners combined with React `useRef` states handle granular zooming without triggering heavy DOM repaints, ensuring a solid 60 FPS spatial navigation experience.
- **Drag-and-Drop Repositioning**: Users can drag station cards across the grid. The component's matrix collision detection algorithm dynamically re-routes material transport paths and prevents physical overlap.
- **Clearance Validation**: The spatial engine computes Euclidean distances between station bounds. If two stations are placed within a critical 2.2-meter radius, a CSS `opto-collision-pulse` animation highlights the constraint violation, allowing engineers to physically validate safety regulations in parallel with mathematical efficiency.

## 6.4 The UI Design Language
To achieve a "wow" factor suitable for modern enterprise software, the application eschews plain styling in favor of high-contrast, industrial-grade aesthetics. 

**Visual Tokens:**
- Deep `var(--bg-main)` contrasting with glowing `var(--accent-primary)` and `var(--teirac-teal)` highlights.
- Glassmorphism techniques (`backdrop-filter: blur(10px)`) applied to floating bottom-sheet panels and overlay drawers.
- Subtle `framer-motion` micro-animations (e.g., `<AnimatePresence>` on success banners) provide immediate tactile feedback during drag-and-drop actions.
