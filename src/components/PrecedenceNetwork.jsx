import React, { useMemo } from 'react';
import { Info } from 'lucide-react';

const PrecedenceNetwork = ({ tasks }) => {
  const totalTime = tasks.reduce((sum, t) => sum + t.time, 0);

  // Dynamic layout calculation
  const { nodes, edges, mapWidth, mapHeight } = useMemo(() => {
    // 1. Calculate depths
    const depths = {};
    const getDepth = (id, currentPath = new Set()) => {
      if (depths[id] !== undefined) return depths[id];
      if (currentPath.has(id)) return 0; // prevent circular dependency infinite loop here
      const task = tasks.find(t => t.id === id);
      if (!task || !task.predecessors || task.predecessors.length === 0 || task.predecessors[0] === 'None') {
        depths[id] = 0;
        return 0;
      }
      let maxPredDepth = -1;
      currentPath.add(id);
      for (const p of task.predecessors) {
        maxPredDepth = Math.max(maxPredDepth, getDepth(p, currentPath));
      }
      currentPath.delete(id);
      depths[id] = maxPredDepth + 1;
      return depths[id];
    };

    tasks.forEach(t => getDepth(t.id));

    // 2. Group by layers
    const layers = [];
    tasks.forEach(t => {
      const d = depths[t.id];
      if (!layers[d]) layers[d] = [];
      layers[d].push(t);
    });

    // 3. Assign coordinates
    const NODE_W = 220;
    const NODE_H = 80;
    const GAP_X = 100;
    const GAP_Y = 40;
    const MARGIN_X = 50;
    const MARGIN_Y = 50;

    const positionedNodes = [];
    let maxLayerHeight = 0;

    layers.forEach((layer) => {
      if (!layer) return;
      const layerNodes = layer.length;
      const layerH = layerNodes * NODE_H + (layerNodes - 1) * GAP_Y;
      maxLayerHeight = Math.max(maxLayerHeight, layerH);
    });

    layers.forEach((layer, layerIdx) => {
      if (!layer) return;
      const startX = MARGIN_X + layerIdx * (NODE_W + GAP_X);
      const layerNodes = layer.length;
      const layerH = layerNodes * NODE_H + (layerNodes - 1) * GAP_Y;
      const startY = MARGIN_Y + (maxLayerHeight - layerH) / 2; // Center vertically

      layer.forEach((task, idx) => {
        positionedNodes.push({
          ...task,
          x: startX,
          y: startY + idx * (NODE_H + GAP_Y),
          w: NODE_W,
          h: NODE_H
        });
      });
    });

    // 4. Create edges
    const calculatedEdges = [];
    tasks.forEach(t => {
      const targetNode = positionedNodes.find(n => n.id === t.id);
      if (!targetNode) return;
      t.predecessors.forEach(p => {
        const sourceNode = positionedNodes.find(n => n.id === p);
        if (sourceNode) {
          calculatedEdges.push({
            id: `${sourceNode.id}-${targetNode.id}`,
            x1: sourceNode.x + sourceNode.w,
            y1: sourceNode.y + sourceNode.h / 2,
            x2: targetNode.x,
            y2: targetNode.y + targetNode.h / 2
          });
        }
      });
    });

    const w = MARGIN_X * 2 + (layers.length) * NODE_W + (layers.length - 1) * GAP_X;
    const h = MARGIN_Y * 2 + maxLayerHeight;

    return { nodes: positionedNodes, edges: calculatedEdges, mapWidth: w, mapHeight: h };
  }, [tasks]);

  return (
    <div className="animate-fade" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexShrink: 0 }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800, margin: '0 0 0.5rem 0' }}>Precedence Network</h1>
          <p style={{ color: 'var(--text-sub)', fontSize: '1.1rem' }}>Visualization of **task dependencies** and assembly flow sequences.</p>
        </div>
        <div style={{ textAlign: 'right' }}>
            <p style={{ margin: 0, color: 'var(--text-sub)', fontSize: '0.9rem', fontWeight: 600 }}>TOTAL PROCESS TIME</p>
            <h2 style={{ margin: 0, fontSize: '2.2rem', color: 'var(--accent-primary)', fontWeight: 800 }}>{totalTime} Mins</h2>
        </div>
      </header>

      <div className="glass" style={{ flex: 1, position: 'relative', overflow: 'auto', padding: '1rem', minHeight: '500px', display: 'flex', alignItems: 'center' }}>
          
         <svg style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }} width={Math.max(mapWidth, 800)} height={Math.max(mapHeight, 500)}>
            {/* Draw connectors based on precedence logic */}
            <defs>
              <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="var(--accent-primary)" opacity="0.6"/>
              </marker>
            </defs>
            {edges.map(edge => {
                // simple curve calculation
                const cp1x = edge.x1 + (edge.x2 - edge.x1) / 2;
                const path = `M ${edge.x1} ${edge.y1} C ${cp1x} ${edge.y1}, ${cp1x} ${edge.y2}, ${edge.x2} ${edge.y2}`;
                return (
                    <path key={edge.id} d={path} fill="transparent" stroke="var(--accent-primary)" strokeWidth="2" markerEnd="url(#arrowhead)" opacity="0.6" />
                );
            })}
         </svg>

         {/* Nodes */}
         <div style={{ position: 'relative', width: Math.max(mapWidth, 800), height: Math.max(mapHeight, 500) }}>
             {nodes.map((node) => (
                 <div 
                    key={node.id} 
                    className="glass"
                    style={{
                        position: 'absolute',
                        left: node.x,
                        top: node.y,
                        width: node.w,
                        height: node.h,
                        border: '1px solid var(--glass-border)',
                        borderLeft: '4px solid var(--accent-primary)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        padding: '0.8rem 1rem',
                        boxSizing: 'border-box',
                        background: 'rgba(10, 25, 47, 0.8)', // slightly more opaque to block lines behind
                        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                    }}
                 >
                     <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-primary)', marginBottom: '4px', letterSpacing: '1px' }}>Task {node.id}</div>
                     <div style={{ fontSize: '0.85rem', color: 'var(--text-white)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 600 }} title={node.name}>{node.name}</div>
                     <div style={{ fontSize: '0.75rem', color: 'var(--text-sub)', marginTop: '4px' }}>{node.time} mins</div>
                 </div>
             ))}
         </div>
      </div>

      <div className="glass" style={{ marginTop: '2rem', padding: '1.2rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1.5rem', flexShrink: 0 }}>
          <div style={{ padding: '0.8rem', background: 'rgba(100, 255, 218, 0.05)', borderRadius: '8px' }}>
            <Info size={20} color="var(--accent-primary)" />
          </div>
          <p style={{ margin: 0, color: 'var(--text-sub)', fontSize: '0.9rem' }}> The diagram shows the critical path and the necessary task sequencing starting from the base components. Each node is placed dynamically based on its depth in the dependency tree. </p>
      </div>
    </div>
  );
};

export default PrecedenceNetwork;
