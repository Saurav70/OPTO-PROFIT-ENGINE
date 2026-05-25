import {
  Activity,
  ArrowRight,
  CheckCircle2,
  Cpu,
  Layout,
  Monitor,
  Package,
  Star,
  Wind,
  Zap,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { calculateNmin, calculateTaktTime } from '../utils/optimizer';
import { getVariableValue } from '../utils/formulaEngine';
import EmptyState from './EmptyState';

const clampPercent = (value) => Math.min(Math.max(value, 0), 100);

const getStationIcon = (idx) => {
  const icons = [Cpu, Monitor, Wind, Zap, Package];
  return icons[idx % icons.length];
};

const ConceptualLayout = ({ tasks, config, optimization, onNavigate }) => {
  if (!tasks || tasks.length === 0) {
    return (
      <EmptyState
        icon={Layout}
        title="NO TASKS TO DISPLAY"
        description="The Conceptual Layout diagram is generated from your process tasks. Add tasks and production targets in Process Planning to see the station layout."
        actionText="GO TO PROCESS PLANNING"
        onAction={() => onNavigate?.('planning')}
      />
    );
  }

  const taktTime = calculateTaktTime(config);
  const nMin = calculateNmin(tasks, taktTime);
  const demand = getVariableValue(config?.variables || [], 'demand', 0);
  const stations = optimization?.stations || [];
  const totalTaskTime = optimization?.totalTaskTime ?? tasks.reduce((sum, task) => sum + (Number(task.time) || 0), 0);

  const summaryStats = [
    { label: 'Daily Demand', value: `${demand} units`, icon: Activity },
    { label: 'Cycle Time', value: `${(taktTime || 0).toFixed(1)} min`, icon: Zap },
    { label: 'Line Efficiency', value: `${optimization?.efficiency || '0.00'}%`, icon: CheckCircle2 },
    { label: 'Target Stations', value: nMin || 0, icon: Layout },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="conceptual-layout-screen"
    >
      <header className="conceptual-header">
        <div>
          <p className="conceptual-eyebrow">{(config?.productName || 'Line').toUpperCase()} ASSEMBLY LINE</p>
          <h2 className="header-title conceptual-title">Conceptual Layout Diagram</h2>
        </div>
        <div className="conceptual-total">
          <span>Total Work Content</span>
          <strong>{totalTaskTime.toFixed(1)} min</strong>
        </div>
      </header>

      <section className="conceptual-summary-grid" aria-label="Conceptual layout summary">
        {summaryStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="conceptual-stat-card">
              <div className="conceptual-stat-icon">
                <Icon size={16} />
              </div>
              <span>{stat.label}</span>
              <strong>{stat.value}</strong>
            </div>
          );
        })}
      </section>

      <section className="conceptual-flow-panel">
        <div className="conceptual-section-heading">
          <div>
            <h3>Manufacturing Cell Flow</h3>
            <p>Station sequence, processing load, and idle capacity by workstation.</p>
          </div>
          <div className="conceptual-legend">
            <span><i className="legend-processing" /> Processing</span>
            <span><i className="legend-idle" /> Idle</span>
          </div>
        </div>

        {stations.length === 0 ? (
          <div className="conceptual-empty-state">
            Add process tasks and production targets to generate the station layout.
          </div>
        ) : (
          <>
            <div className="conceptual-station-grid">
              {stations.map((station, idx) => {
                const Icon = getStationIcon(idx);
                const processMinutes = Number(station.time) || 0;
                const idleMinutes = Math.max(0, taktTime - processMinutes);
                const processPercent = taktTime > 0 ? clampPercent((processMinutes / taktTime) * 100) : 0;
                const idlePercent = taktTime > 0 ? clampPercent((idleMinutes / taktTime) * 100) : 0;
                const isLast = idx === stations.length - 1;

                return (
                  <motion.article
                    key={`station-${idx}`}
                    initial={{ y: 16, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: idx * 0.06 }}
                    className={`conceptual-station-card ${isLast ? 'final-station' : ''}`}
                  >
                    <div className="conceptual-station-top">
                      <div className="conceptual-station-id">
                        <Icon size={18} />
                        <span>Station {idx + 1}</span>
                      </div>
                      {isLast ? (
                        <span className="conceptual-final-badge">
                          <Star size={12} fill="currentColor" /> Final
                        </span>
                      ) : (
                        <ArrowRight size={16} className="conceptual-flow-icon" />
                      )}
                    </div>

                    <div className="conceptual-task-list">
                      {station.tasks.map((task) => (
                        <div key={task.id} className="conceptual-task-row">
                          <span>{task.id}</span>
                          <p>{task.name}</p>
                          <strong>{Number(task.time || 0).toFixed(1)}m</strong>
                        </div>
                      ))}
                    </div>

                    <div className="conceptual-load-block">
                      <div className="conceptual-load-meta">
                        <span>P: {processMinutes.toFixed(1)}m</span>
                        <span>I: {idleMinutes.toFixed(1)}m</span>
                      </div>
                      <div className="conceptual-load-bar" aria-label={`Station ${idx + 1} load`}>
                        <div className="processing" style={{ width: `${processPercent}%` }} />
                        <div className="idle" style={{ width: `${idlePercent}%` }} />
                      </div>
                    </div>
                  </motion.article>
                );
              })}
            </div>
            <footer className="conceptual-footer">
              <span>Optimized Flow</span>
              <span>Zero Waste</span>
              <span>Balanced Workload</span>
            </footer>
          </>
        )}
      </section>
    </motion.div>
  );
};

export default ConceptualLayout;
