---
trigger: always_on
glob: "**/*.{js,jsx,css}"
description: OPTO-PROFIT Engineering Standards for Design & Architecture
---

# OPTO-PROFIT Project Standards

Always adhere to these architectural and design principles to maintain the "Industrial Engineering Toolkit" aesthetic.

## 1. Visual Identity & Design System

- **Tone**: Professional, data-dense, industrial-grade engineering software.
- **Color Palette**:
  - **Sidebar**: Dark Slate (`#0f172a`) with Teal (`#0d9488`) highlights.
  - **Background**: Light Slate (`#f8fafc`) for cards and (`#f1f5f9`) for the application shell.
  - **Accents**:
    - Secondary: Purple (`#a855f7`)
    - Warning: Amber (`#f59e0b`)
    - Danger: Red (`#ef4444`)
- **Typography**: Inter (primary). Use high weights (900) for section titles and labels. Letter-spacing: `2px` for headers.
- **Borders & Shadows**:
  - `radius-lg`: `16px` for main containers.
  - `shadow-glow`: `0 8px 30px rgba(14, 165, 233, 0.15)`.
  - **Glow Cards**: Use the `.glow-card` (border-gradient) pattern for interactive elements.

## 2. Component Architecture

- **Library**: Lucide-React for all iconography.
- **Animations**: Use Framer Motion (`framer-motion`) for layout transitions and hover effects.
  - Default transition: `smooth` (`0.4s cubic-bezier(0.16, 1, 0.3, 1)`).
- **Navigation**: Persistent 300px dark sidebar on the left. Main content in a 16px-radius card on the right.

## 3. Data Discipline

- **Metrics**: Standardize on metric units (mm, cm, m).
- **Financials**: Financial impacts must be derived from ROI calculations (e.g., productivity gain vs. cycle time reduction).
- **State**: Centralize state in the root `App.jsx` for `tasks` and `config` to ensure synchronization across "Industrial Modules" (Line Optimization, Floor Layout, etc.).

## 4. Development Principles

- **No Placeholders**: Use `generate_image` or actual data.
- **Glassmorphism**: Use `backdrop-filter: blur(12px)` for overlays and secondary containers.
- **Response**: The interface should feel "alive" with hover interactions and transitions.
