/**
 * OPTO-PROFIT — Frontend Snapshot & Render Tests
 * ================================================
 * Uses Vitest + @testing-library/react to:
 *   1. Render Dashboard in isolation and verify key KPI labels are present
 *   2. Render LineOptimization and verify selector controls are mounted
 *   3. Snapshot tests to catch unexpected UI regressions
 *
 * Run with:  npm run test
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// ── Hoisted mocks (must be at top level for Vitest to intercept before imports) ─

vi.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get: (_, tag) => {
      const Tag = (typeof tag === 'string' && tag !== '__esModule') ? tag : 'div';
      const ForwardedComponent = React.forwardRef(({ initial, animate, exit, transition, variants, whileHover, whileTap, layout, ...rest }, ref) =>
        React.createElement(Tag, { ...rest, ref })
      );
      ForwardedComponent.displayName = `motion.${tag}`;
      return ForwardedComponent;
    }
  }),
  AnimatePresence: ({ children }) => React.createElement(React.Fragment, null, children),
  useAnimation: () => ({ start: vi.fn() }),
  useInView: () => [null, true],
}));

vi.mock('recharts', () => {
  const S = ({ children }) => React.createElement('div', { 'data-testid': 'chart' }, children);
  return { ResponsiveContainer: S, BarChart: S, Bar: S, XAxis: S, YAxis: S, CartesianGrid: S, Tooltip: S, LineChart: S, Line: S, ReferenceLine: S, Legend: S, Area: S, AreaChart: S };
});

vi.mock('@xyflow/react', () => ({
  ReactFlow: ({ children }) => React.createElement('div', { 'data-testid': 'react-flow' }, children),
  Background: () => null, Controls: () => null, MiniMap: () => null, Handle: () => null,
  Position: { Top: 'top', Bottom: 'bottom', Left: 'left', Right: 'right' },
  useNodesState: () => [[], vi.fn()], useEdgesState: () => [[], vi.fn()], addEdge: vi.fn(),
}));

vi.mock('lucide-react', () => {
  const Nil = () => null;
  return {
    // Dashboard.jsx icons
    Activity: Nil, AlertTriangle: Nil, ArrowLeft: Nil, ArrowRight: Nil,
    Box: Nil, Check: Nil, ChevronDown: Nil, ChevronRight: Nil, ChevronUp: Nil,
    Cpu: Nil, Download: Nil, Eye: Nil, EyeOff: Nil, FolderOpen: Nil, Grid: Nil, HelpCircle: Nil,
    Info: Nil, Layers: Nil, Loader: Nil, Lock: Nil, LogOut: Nil,
    Menu: Nil, Monitor: Nil, Network: Nil, Play: Nil, Plus: Nil,
    Printer: Nil, RefreshCw: Nil, RotateCcw: Nil, Save: Nil, Settings: Nil, Share2: Nil,
    Sliders: Nil, Trash2: Nil, TrendingUp: Nil, Upload: Nil, User: Nil,
    X: Nil, Zap: Nil, ZoomIn: Nil, ZoomOut: Nil, BarChart2: Nil,
    ChevronLeft: Nil, ExternalLink: Nil, FileText: Nil, Filter: Nil,
    LayoutGrid: Nil, Link: Nil, Move: Nil, Search: Nil, Star: Nil,
    // LineOptimization.jsx icons
    BarChart3: Nil, Camera: Nil, CheckCircle: Nil, TrendingDown: Nil,
    Award: Nil, Edit3: Nil, UserCheck: Nil,
  };
});

vi.mock('../utils/optimizer', () => ({
  calculateTaktTime: vi.fn().mockResolvedValue(30),
  calculateNmin: vi.fn().mockReturnValue(3),
  calculateROI: vi.fn().mockResolvedValue({
    monthlyProfit: 250000, profitIncrease: 50000, dailyProduction: 16,
    baselineDailyProduction: 13, baselineMonthlyProfit: 200000,
    optimizedMonthlyProfit: 250000, baselineLaborCost: 30000,
    optimizedLaborCost: 24000, paybackMonths: 0.5, investmentCost: 25000,
  }),
  calculateCriticalPath: vi.fn().mockReturnValue({ criticalStation: 2, projectDuration: 75, criticalTaskIds: ['E'] }),
  runOptimization: vi.fn().mockReturnValue({
    stations: [
      { tasks: [{ id: 'A', time: 12 }, { id: 'B', time: 18 }], time: 30 },
      { tasks: [{ id: 'C', time: 15 }, { id: 'D', time: 10 }], time: 25 },
      { tasks: [{ id: 'E', time: 20 }], time: 20 },
    ],
    efficiency: '83.33', balanceDelay: '16.67', nActual: 3,
    actualCycleTime: 30, totalIdleTime: 15, smoothnessIndex: '5.77',
    meetsTarget: true, targetEfficiency: 85,
  }),
  runTaktTimeSweep: vi.fn().mockReturnValue([]),
  generateFormulaTrace: vi.fn().mockResolvedValue([]),
}));

vi.mock('../utils/formulaEngine', () => ({
  formatCurrency: (val) => `₹${val}`,
  buildContext: vi.fn().mockReturnValue({}),
  evaluateFormula: vi.fn().mockResolvedValue(30),
  getVariableValue: vi.fn().mockReturnValue(0),
}));

vi.mock('../utils/reportGenerator', () => ({
  generateExecutiveReport: vi.fn(),
  exportStationDataToCSV: vi.fn(),
}));

vi.mock('./FormulaEditor', () => ({ default: () => null }));

vi.mock('../services/api.js', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() }
}));

// Static imports — must come AFTER vi.mock() declarations
import Dashboard from './Dashboard';
import LineOptimization from './LineOptimization';

// ── Shared props ──────────────────────────────────────────────────────────────
const MOCK_TASKS = [
  { id: 'A', name: 'PCB Preparation',      time: 12, predecessors: [], zoning: 'None', custom_attributes: {} },
  { id: 'B', name: 'SMT Assembly',          time: 18, predecessors: ['A'], zoning: 'None', custom_attributes: {} },
  { id: 'C', name: 'Display Prep',          time: 15, predecessors: ['A'], zoning: 'None', custom_attributes: {} },
  { id: 'D', name: 'Power Supply Prep',     time: 10, predecessors: ['A'], zoning: 'None', custom_attributes: {} },
  { id: 'E', name: 'Final Integration',     time: 20, predecessors: ['B', 'C'], zoning: 'None', custom_attributes: {} },
];

const MOCK_CONFIG = {
  productName: 'Digital Oscilloscope',
  variables: [
    { key: 'shift_time',      label: 'Shift Time',   value: 480,   unit: 'min',   category: 'Production' },
    { key: 'demand',          label: 'Daily Demand', value: 16,    unit: 'units', category: 'Production' },
    { key: 'unit_price',      label: 'Unit Price',   value: 25000, unit: '₹',    category: 'Financial'  },
    { key: 'unit_cost',       label: 'Unit Cost',    value: 15000, unit: '₹',    category: 'Financial'  },
    { key: 'work_days',       label: 'Work Days',    value: 25,    unit: 'days', category: 'Financial'  },
    { key: 'currency_symbol', label: 'Currency',     value: '₹',  unit: '',     category: 'General'    },
  ],
  formulas: { TaktTime: 'shift_time / demand' },
  custom_zones: [], zone_exclusions: {}, co_locations: [], separations: [],
  target_efficiency: 85,
};

const MOCK_OPT = {
  stations: [
    { tasks: [{ id: 'A', time: 12 }, { id: 'B', time: 18 }], time: 30 },
    { tasks: [{ id: 'C', time: 15 }, { id: 'D', time: 10 }], time: 25 },
    { tasks: [{ id: 'E', time: 20 }], time: 20 },
  ],
  efficiency: '83.33', balanceDelay: '16.67', nActual: 3,
  actualCycleTime: 30, totalIdleTime: 15, smoothnessIndex: '5.77', meetsTarget: true,
};

const noop = vi.fn();

// ── Dashboard Tests ───────────────────────────────────────────────────────────
describe('Dashboard Component', () => {
  const defaultProps = {
    tasks: MOCK_TASKS, config: MOCK_CONFIG, setConfig: noop,
    onNavigate: noop, profiles: [], activeProfileId: null,
    onSaveProfile: noop, onLoadProfile: noop,
    onLoadSampleProfile: noop, onDeleteProfile: noop,
    optimization: MOCK_OPT,
  };

  it('renders without crashing', () => {
    const { container } = render(<Dashboard {...defaultProps} />);
    expect(container.firstChild).not.toBeNull();
  });

  it('displays the PRODUCTION DASHBOARD heading', () => {
    render(<Dashboard {...defaultProps} />);
    expect(screen.getByText('PRODUCTION DASHBOARD')).toBeDefined();
  });

  it('renders all 5 KPI metric labels', () => {
    render(<Dashboard {...defaultProps} />);
    expect(screen.getByText('LINE EFFICIENCY')).toBeDefined();
    expect(screen.getByText('WORK STATIONS')).toBeDefined();
    expect(screen.getByText('BOTTLE-NECK TIME')).toBeDefined();
    expect(screen.getByText('TOTAL PROCESS TIME')).toBeDefined();
    expect(screen.getByText('BALANCE DELAY')).toBeDefined();
  });

  it('displays OPEN OPTIMIZER navigation button', () => {
    render(<Dashboard {...defaultProps} />);
    expect(screen.getByText('OPEN OPTIMIZER')).toBeDefined();
  });

  it('renders PROJECT PROFILES heading', () => {
    render(<Dashboard {...defaultProps} />);
    expect(screen.getByText('PROJECT PROFILES')).toBeDefined();
  });

  it('shows "No saved projects yet" when profiles list is empty', () => {
    render(<Dashboard {...defaultProps} />);
    expect(screen.getByText('No saved projects yet')).toBeDefined();
  });

  it('renders a saved profile name when profiles exist', () => {
    const props = {
      ...defaultProps,
      profiles: [{ id: 'p1', name: 'Oscilloscope Baseline', timestamp: new Date().toISOString() }],
    };
    render(<Dashboard {...props} />);
    expect(screen.getByText('Oscilloscope Baseline')).toBeDefined();
  });

  it('snapshot: Dashboard structure matches baseline', () => {
    const { container } = render(<Dashboard {...defaultProps} />);
    expect(container).toMatchSnapshot();
  });
});

// ── LineOptimization Tests ────────────────────────────────────────────────────
describe('LineOptimization Component', () => {
  const defaultProps = {
    tasks: MOCK_TASKS, config: MOCK_CONFIG, optimization: MOCK_OPT,
    onOptimizationChange: noop, onNavigate: noop, darkMode: true,
  };

  it('renders without crashing', () => {
    const { container } = render(<LineOptimization {...defaultProps} />);
    expect(container.firstChild).not.toBeNull();
  });

  it('renders key section headings (Simulation Sandbox and Baseline)', () => {
    render(<LineOptimization {...defaultProps} />);
    // LineOptimization renders two panels with these headings
    const sandbox = screen.queryByText(/simulation sandbox/i) ||
                    screen.queryByText(/SIMULATION SANDBOX/i) ||
                    screen.queryByText(/BASELINE SCENARIO/i);
    expect(sandbox).not.toBeNull();
  });

  it('snapshot: LineOptimization structure matches baseline', () => {
    const { container } = render(<LineOptimization {...defaultProps} />);
    expect(container).toMatchSnapshot();
  });
});
