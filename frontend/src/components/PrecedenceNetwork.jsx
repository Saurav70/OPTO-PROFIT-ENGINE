import React, { useMemo } from 'react';
import { 
  ReactFlow, 
  Background, 
  Controls, 
  Panel,
  Handle,
  Position,
  BaseEdge,
  getBezierPath,
} from '@xyflow/react';
import { Info, PlayCircle, Cpu, AlertTriangle, Network } from 'lucide-react';
import { motion } from 'framer-motion';
import { detectCircularDependency } from '../utils/optimizer';
import EmptyState from './EmptyState';

// Custom Edge Component with Flow Particles
const FlowEdge = ({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data
}) => {
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const isCycle = data?.isCycle;

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={{ ...style, strokeWidth: 2, opacity: 0.3 }} />
      {/* Animated Particle Path */}
      <path
        d={edgePath}
        fill="none"
        stroke={isCycle ? 'var(--accent-danger)' : 'var(--accent-primary)'}
        strokeWidth={isCycle ? 4 : 3}
        strokeDasharray="4, 16"
        style={{
          filter: isCycle ? 'drop-shadow(0 0 5px var(--accent-danger))' : 'none',
        }}
      >
        <animate
          attributeName="stroke-dashoffset"
          from="20"
          to="0"
          dur="1s"
          repeatCount="indefinite"
        />
      </path>
    </>
  );
};

// Custom Node Component
const TaskNode = ({ data }) => {
  const { id, name, time, isError } = data;
  return (
    <div className="glow-card" style={{ 
      width: '240px', 
      height: '80px', 
      borderLeft: `5px solid ${isError ? 'var(--accent-danger)' : 'var(--accent-primary)'}`,
      borderRadius: 'var(--radius-md)', 
      padding: '14px',
      display: 'flex',
      alignItems: 'center',
      gap: '14px',
      cursor: 'grab',
      position: 'relative'
    }}>
      <Handle type="target" position={Position.Left} style={{ background: 'var(--accent-primary)' }} />
      
      <div style={{ 
        width: '45px', 
        height: '45px', 
        background: isError ? 'rgba(239, 68, 68, 0.1)' : 'var(--bg-tertiary)', 
        borderRadius: 'var(--radius-sm)', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        fontSize: '1.2rem', 
        fontWeight: 900, 
        color: isError ? 'var(--accent-danger)' : 'var(--accent-primary)',
        border: `1px solid ${isError ? 'rgba(239, 68, 68, 0.2)' : 'var(--border-color)'}`,
        letterSpacing: '1px'
      }}>
        {id}
      </div>
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <p className="header-title" style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-white)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</p>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 900, color: 'var(--text-sub)' }}>{time}</span>
          <span style={{ fontSize: '0.55rem', color: 'var(--text-sub)', opacity: 0.6, fontWeight: 900, letterSpacing: '0.5px' }}>MIN</span>
        </div>
      </div>

      <Handle type="source" position={Position.Right} style={{ background: 'var(--accent-primary)' }} />
    </div>
  );
};

const nodeTypes = {
  task: TaskNode,
};

const edgeTypes = {
  flow: FlowEdge,
};

const PrecedenceNetwork = ({ tasks = [], onNavigate }) => {
  const totalTime = useMemo(() => (tasks || []).reduce((sum, t) => sum + (Number(t.time) || 0), 0), [tasks]);
  const errors = useMemo(() => detectCircularDependency(tasks || []), [tasks]);

  const { initialNodes, initialEdges, layersCount } = useMemo(() => {
    if (!tasks || tasks.length === 0) {
      return { initialNodes: [], initialEdges: [], layersCount: 0 };
    }
    const errorTaskIds = new Set(errors.flatMap(e => e.cycle || []));
    const depths = {};
    const getDepth = (id, currentPath = new Set()) => {
      if (depths[id] !== undefined) return depths[id];
      const task = tasks.find(t => t.id === id);
      if (!task || !task.predecessors || task.predecessors.length === 0 || task.predecessors[0] === 'None') {
        depths[id] = 0;
        return 0;
      }
      let maxPredDepth = -1;
      currentPath.add(id);
      for (const p of task.predecessors) {
        if (!currentPath.has(p)) {
          maxPredDepth = Math.max(maxPredDepth, getDepth(p, currentPath));
        }
      }
      currentPath.delete(id);
      depths[id] = maxPredDepth + 1;
      return depths[id];
    };

    tasks.forEach(t => getDepth(t.id));

    const layers = [];
    tasks.forEach(t => {
      const d = depths[t.id];
      if (layers[d] === undefined) layers[d] = [];
      layers[d].push(t);
    });

    const NODE_W = 240;
    const NODE_H = 80;
    const GAP_X = 140;
    const GAP_Y = 60;
    const MARGIN_X = 100;
    const MARGIN_Y = 100;

    const nodes = [];
    const edges = [];

    layers.forEach((layer, layerIdx) => {
      if (!layer) return;
      const startX = MARGIN_X + layerIdx * (NODE_W + GAP_X);
      layer.forEach((task, nodeIdx) => {
        const x = startX;
        const y = MARGIN_Y + nodeIdx * (NODE_H + GAP_Y);
        nodes.push({
          id: task.id,
          type: 'task',
          position: { x, y },
          data: { 
            id: task.id, 
            name: task.name, 
            time: task.time,
            isError: errorTaskIds.has(task.id)
          },
        });

        if (task.predecessors && task.predecessors.length > 0 && task.predecessors[0] !== 'None') {
          task.predecessors.forEach(pId => {
            const isCycleEdge = errors.some(e => 
              e.cycle && e.cycle.includes(pId) && e.cycle.includes(task.id) && 
              e.cycle.indexOf(task.id) === (e.cycle.indexOf(pId) + 1) % e.cycle.length
            );

            edges.push({
              id: `e${pId}-${task.id}`,
              source: pId,
              target: task.id,
              type: 'flow',
              data: { isCycle: isCycleEdge }
            });
          });
        }
      });
    });

    return { initialNodes: nodes, initialEdges: edges, layersCount: layers.length };
  }, [tasks, errors]);

  if (!tasks || tasks.length === 0) {
    return (
      <EmptyState
        icon={Network}
        title="NO TASKS DEFINED"
        description="The Precedence Network visualises the task dependency graph. Define at least one task in Process Planning before generating the network."
        actionText="GO TO PROCESS PLANNING"
        onAction={() => onNavigate?.('planning')}
      />
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="precedence-container"
    >
      <div style={{ padding: '1.5rem 2rem 0 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>

          <h2 className="header-title" style={{ margin: 0, fontSize: '1.4rem', color: 'var(--text-white)' }}>PRECEDENCE NETWORK</h2>
        </div>
      </div>

      <div className="precedence-stats-bar">
         <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.8rem 1.5rem', display: 'flex', alignItems: 'center', gap: '12px', transition: 'var(--transition-fast)' }}>
            <div style={{ padding: '0.6rem', background: 'rgba(13, 148, 136, 0.1)', borderRadius: 'var(--radius-sm)' }}>
              <Info size={18} color="var(--accent-primary)" />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '0.6rem', color: 'var(--text-sub)', fontWeight: 900, letterSpacing: '1px' }}>TOTAL PROCESS TIME</p>
              <p style={{ margin: 0, fontSize: '1.0rem', fontWeight: 900, color: 'var(--text-white)' }}>{totalTime} Minutes</p>
            </div>
         </div>
         <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.8rem 1.5rem', display: 'flex', alignItems: 'center', gap: '12px', transition: 'var(--transition-fast)' }}>
            <div style={{ padding: '0.6rem', background: 'rgba(139, 92, 246, 0.1)', borderRadius: 'var(--radius-sm)' }}>
              <PlayCircle size={18} color="var(--accent-secondary)" />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '0.6rem', color: 'var(--text-sub)', fontWeight: 900, letterSpacing: '1px' }}>FLOW DEPTH</p>
              <p style={{ margin: 0, fontSize: '1.0rem', fontWeight: 900, color: 'var(--text-white)' }}>{layersCount} Logical Layers</p>
            </div>
         </div>
         
         {errors.length > 0 && (
           <div style={{ background: 'var(--accent-danger)20', border: '1px solid var(--accent-danger)', borderRadius: 'var(--radius-md)', padding: '0.8rem 1.5rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <AlertTriangle size={18} color="var(--accent-danger)" />
              <div>
                <p style={{ margin: 0, fontSize: '0.6rem', color: 'var(--accent-danger)', fontWeight: 900, letterSpacing: '1px' }}>LOGIC ERROR</p>
                <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 900, color: 'var(--accent-danger)' }}>Circular Dependency Detected</p>
              </div>
           </div>
         )}


      </div>

      <div className="precedence-flow-wrapper">
        <ReactFlow
          nodes={initialNodes}
          edges={initialEdges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
        >
          <Background color="var(--border-color)" variant="dots" gap={20} />
          <Controls />
          <Panel position="bottom-right" className="glow-card" style={{ padding: '12px', margin: '12px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'var(--accent-primary)', boxShadow: '0 0 8px var(--accent-primary)60' }} />
                <span style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--text-sub)', letterSpacing: '1px' }}>VALID FLOW</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'var(--accent-danger)', boxShadow: '0 0 8px var(--accent-danger)60' }} />
                <span style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--text-sub)', letterSpacing: '1px' }}>CIRCULAR CYCLE</span>
              </div>
            </div>
          </Panel>
        </ReactFlow>
      </div>
    </motion.div>
  );
};

export default PrecedenceNetwork;
