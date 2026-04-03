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
import { Info, PlayCircle, Cpu, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
import { detectCircularDependency } from '../utils/optimizer';

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
        stroke={isCycle ? '#ef4444' : '#0d9488'}
        strokeWidth={isCycle ? 4 : 3}
        strokeDasharray="4, 16"
        style={{
          filter: isCycle ? 'drop-shadow(0 0 5px #ef4444)' : 'none',
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
    <div style={{ 
      width: '240px', 
      height: '80px', 
      background: 'var(--card-bg)', 
      border: `1px solid ${isError ? 'var(--accent-danger)' : 'var(--border-color)'}`, 
      borderLeft: `5px solid ${isError ? 'var(--accent-danger)' : 'var(--accent-primary)'}`,
      borderRadius: '8px', 
      padding: '14px',
      display: 'flex',
      alignItems: 'center',
      gap: '14px',
      boxShadow: isError ? '0 0 15px rgba(239, 68, 68, 0.2)' : '0 4px 10px rgba(0,0,0,0.06)',
      cursor: 'grab',
      position: 'relative'
    }}>
      <Handle type="target" position={Position.Left} style={{ background: 'var(--accent-primary)' }} />
      
      <div style={{ 
        width: '45px', 
        height: '45px', 
        background: isError ? 'rgba(239, 68, 68, 0.1)' : 'var(--bg-tertiary)', 
        borderRadius: '6px', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        fontSize: '1.1rem', 
        fontWeight: 900, 
        color: isError ? 'var(--accent-danger)' : 'var(--accent-primary)',
        border: `1px solid ${isError ? 'rgba(239, 68, 68, 0.2)' : 'var(--border-color)'}`
      }}>
        {id}
      </div>
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <p style={{ margin: 0, fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-white)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textTransform: 'uppercase' }}>{name}</p>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 900, color: 'var(--text-sub)' }}>{time}</span>
          <span style={{ fontSize: '0.55rem', color: 'var(--text-sub)', opacity: 0.6, fontWeight: 800 }}>MINUTES</span>
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

const PrecedenceNetwork = ({ tasks }) => {
  const totalTime = tasks.reduce((sum, t) => sum + t.time, 0);
  const errors = useMemo(() => detectCircularDependency(tasks), [tasks]);

  const { initialNodes, initialEdges, layersCount } = useMemo(() => {
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

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        height: '100%', 
        background: 'var(--bg-main)',
        borderRadius: '12px',
        overflow: 'hidden',
        border: '1px solid var(--border-color)',
        boxShadow: '0 20px 50px rgba(0,0,0,0.1)',
        transition: 'all 0.3s ease'
      }}
    >
      <div style={{ padding: '1.5rem 2rem 0 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-sub)', fontSize: '0.65rem', fontWeight: 800, letterSpacing: '1px' }}>
            <Cpu size={12} />
            MODULE 03
          </div>
          <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900, color: 'var(--text-white)', letterSpacing: '1px' }}>PRECEDENCE NETWORK</h2>
        </div>
      </div>

      <div style={{ padding: '1.5rem', display: 'flex', gap: '1.5rem', flexShrink: 0, background: 'var(--card-bg)', borderBottom: '1px solid var(--border-color)' }}>
         <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.8rem 1.5rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '0.6rem', background: 'rgba(13, 148, 136, 0.1)', borderRadius: '8px' }}>
              <Info size={18} color="var(--accent-primary)" />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '0.55rem', color: 'var(--text-sub)', fontWeight: 800 }}>TOTAL PROCESS TIME</p>
              <p style={{ margin: 0, fontSize: '1.0rem', fontWeight: 900, color: 'var(--text-white)' }}>{totalTime} Minutes</p>
            </div>
         </div>
         <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.8rem 1.5rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '0.6rem', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '8px' }}>
              <PlayCircle size={18} color="var(--accent-secondary)" />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '0.55rem', color: 'var(--text-sub)', fontWeight: 800 }}>FLOW DEPTH</p>
              <p style={{ margin: 0, fontSize: '1.0rem', fontWeight: 900, color: 'var(--text-white)' }}>{layersCount} Logical Layers</p>
            </div>
         </div>
         
         {errors.length > 0 && (
           <div style={{ background: 'var(--accent-danger)20', border: '1px solid var(--accent-danger)', borderRadius: '8px', padding: '0.8rem 1.5rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <AlertTriangle size={18} color="var(--accent-danger)" />
              <div>
                <p style={{ margin: 0, fontSize: '0.55rem', color: 'var(--accent-danger)', fontWeight: 800 }}>LOGIC ERROR</p>
                <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: 900, color: 'var(--accent-danger)' }}>Circular Dependency Detected</p>
              </div>
           </div>
         )}

         <div style={{ marginLeft: 'auto', alignSelf: 'center', fontSize: '0.65rem', color: 'var(--text-sub)', fontWeight: 600, fontStyle: 'italic' }}>
            Nodes are draggable. Teal particles show logical flow, red indicates cycles.
         </div>
      </div>

      <div style={{ flex: 1, position: 'relative' }}>
        <ReactFlow
          nodes={initialNodes}
          edges={initialEdges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
        >
          <Background color="var(--border-color)" variant="dots" gap={20} />
          <Controls />
          <Panel position="bottom-right" style={{ background: 'var(--card-bg)', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'var(--accent-primary)' }} />
                <span style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--text-sub)' }}>VALID FLOW</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'var(--accent-danger)', boxShadow: '0 0 5px var(--accent-danger)' }} />
                <span style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--text-sub)' }}>CIRCULAR CYCLE</span>
              </div>
            </div>
          </Panel>
        </ReactFlow>
      </div>
    </motion.div>
  );
};

export default PrecedenceNetwork;
