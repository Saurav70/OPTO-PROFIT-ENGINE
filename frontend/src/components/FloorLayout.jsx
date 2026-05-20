import React, { useState, useEffect, useMemo } from 'react';
import {
  Activity,
  Box,
  Gauge,
  Play,
  Route,
  Settings2,
  SlidersHorizontal,
  Square,
  Workflow,
  Grid,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { calculateTaktTime, runOptimization } from '../utils/optimizer';
import EmptyState from './EmptyState';

const STATION_CARD_WIDTH = 158;
const STATION_CARD_HEIGHT = 132;
const DEFAULT_GRID = 20;
const PX_PER_METER = 42;
const CARD_COLLISION_PADDING = 18;
const FALLBACK_DRAG_STEP = 12;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const snapToGridValue = (value, gridSize) => Math.round(value / gridSize) * gridSize;

const createOffsetMap = (count) =>
  Object.fromEntries(Array.from({ length: count }, (_, idx) => [idx, { x: 0, y: 0 }]));

const getBaseLayoutPositions = (layoutType, total) => {
  if (layoutType === 'straight') {
    return Array.from({ length: total }, (_, idx) => ({
      x: 100 + idx * 250,
      y: 210,
    }));
  }

  if (layoutType === 'u-shape') {
    const topCount = Math.ceil(total / 2);
    return Array.from({ length: total }, (_, idx) => {
      if (idx < topCount) {
        return {
          x: 100 + idx * 250,
          y: 90,
        };
      }

      const reverseIdx = total - idx - 1;
      return {
        x: 100 + reverseIdx * 250,
        y: 370,
      };
    });
  }

  const scatterPresets = [
    { x: 110, y: 120 },
    { x: 430, y: 70 },
    { x: 760, y: 180 },
    { x: 550, y: 430 },
    { x: 180, y: 360 },
    { x: 910, y: 410 },
    { x: 1060, y: 170 },
  ];

  return Array.from({ length: total }, (_, idx) => {
    if (scatterPresets[idx]) return scatterPresets[idx];
    const overflowIdx = idx - scatterPresets.length;
    return {
      x: 180 + overflowIdx * 240,
      y: overflowIdx % 2 === 0 ? 520 : 130,
    };
  });
};

const getStationCenter = (station) => ({
  x: station.renderX + STATION_CARD_WIDTH / 2,
  y: station.renderY + STATION_CARD_HEIGHT / 2,
});

const buildConnectorPath = (fromCenter, toCenter) => {
  const horizontalGap = Math.abs(toCenter.x - fromCenter.x);
  const verticalGap = Math.abs(toCenter.y - fromCenter.y);

  if (verticalGap < 80 || horizontalGap < 120) {
    return `M ${fromCenter.x} ${fromCenter.y} L ${toCenter.x} ${toCenter.y}`;
  }

  const midX = (fromCenter.x + toCenter.x) / 2;
  return `M ${fromCenter.x} ${fromCenter.y} L ${midX} ${fromCenter.y} L ${midX} ${toCenter.y} L ${toCenter.x} ${toCenter.y}`;
};

const getStationRole = (idx, total) => {
  if (idx === 0) return 'Feed & preparation';
  if (idx === total - 1) return 'Final verification';
  return `Assembly cell ${idx + 1}`;
};

const FloorLayout = ({ tasks = [], config, onNavigate }) => {
  const taktTime = useMemo(
    () => calculateTaktTime(config || {}),
    [config]
  );
  const optimization = useMemo(() => runOptimization(tasks || [], taktTime, 'LTF', config || {}), [tasks, taktTime, config]);

  const [layoutType] = useState('u-shape');
  const [showArrows, setShowArrows] = useState(true);
  const [isSimulating, setIsSimulating] = useState(false);
  const [selectedStationIdx, setSelectedStationIdx] = useState(0);
  const [snapToGrid] = useState(true);
  const [gridSize] = useState(DEFAULT_GRID);
  const [simulationSpeed, setSimulationSpeed] = useState(1);
  const [viewportWidth, setViewportWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1440
  );
  const [stationOffsets, setStationOffsets] = useState(() =>
    createOffsetMap(optimization?.stations?.length || 0)
  );
  const [simulationState, setSimulationState] = useState({
    phase: 'idle',
    stationIdx: -1,
    nextStationIdx: -1,
    unitPosition: null,
    status: 'Layout idle',
    travelMeters: 0,
    cycle: 0,
  });
  const [draggingStationIdx, setDraggingStationIdx] = useState(-1);

  useEffect(() => {
    const handleResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isStacked = viewportWidth < 1180;
  const safeSelectedStationIdx =
    optimization.stations.length > 0
      ? Math.min(Math.max(selectedStationIdx, 0), optimization.stations.length - 1)
      : -1;

  const stationIndexByTaskId = useMemo(() => {
    const taskStationMap = {};
    optimization.stations.forEach((station, idx) => {
      station.tasks.forEach((task) => {
        taskStationMap[task.id] = idx;
      });
    });
    return taskStationMap;
  }, [optimization.stations]);

  const bottleneckTime = useMemo(
    () => Math.max(...optimization.stations.map((station) => station.time), 0),
    [optimization.stations]
  );

  const basePositions = useMemo(
    () => getBaseLayoutPositions(layoutType, optimization.stations.length),
    [layoutType, optimization.stations.length]
  );

  const placedStations = useMemo(
    () =>
      optimization.stations.map((station, idx) => {
        const base = basePositions[idx] || { x: 100 + idx * 250, y: 210 };
        const offset = stationOffsets[idx] || { x: 0, y: 0 };
        const uniqueZones = [...new Set(station.tasks.map((task) => task.zoning).filter(Boolean))];
        const externalHandoffs = station.tasks.reduce((sum, task) => {
          const handoffs = (task.predecessors || []).filter((predecessorId) => {
            if (!predecessorId || predecessorId === 'None') return false;
            const predecessorStation = stationIndexByTaskId[predecessorId];
            return predecessorStation !== undefined && predecessorStation !== idx;
          });
          return sum + handoffs.length;
        }, 0);
        const utilization = taktTime > 0 ? (station.time / taktTime) * 100 : 0;
        const idleTime = Math.max(0, taktTime - station.time);

        return {
          ...station,
          idx,
          role: getStationRole(idx, optimization.stations.length),
          x: base.x + offset.x,
          y: base.y + offset.y,
          utilization,
          idleTime,
          avgTaskTime: station.tasks.length > 0 ? station.time / station.tasks.length : 0,
          externalHandoffs,
          uniqueZones,
          isBottleneck: station.time === bottleneckTime && bottleneckTime > 0,
        };
      }),
    [basePositions, bottleneckTime, optimization.stations, stationIndexByTaskId, stationOffsets, taktTime]
  );

  const canvasMetrics = useMemo(() => {
    if (placedStations.length === 0) {
      return {
        renderStations: [],
        width: 960,
        height: 620,
        footprintArea: 0,
      };
    }

    const minX = Math.min(...placedStations.map((station) => station.x));
    const minY = Math.min(...placedStations.map((station) => station.y));
    const maxX = Math.max(...placedStations.map((station) => station.x + STATION_CARD_WIDTH));
    const maxY = Math.max(...placedStations.map((station) => station.y + STATION_CARD_HEIGHT));
    const padding = 100;
    const shiftX = padding - minX;
    const shiftY = padding - minY;

    const renderStations = placedStations.map((station) => ({
      ...station,
      renderX: station.x + shiftX,
      renderY: station.y + shiftY,
    }));

    const widthMeters = Math.max(0, (maxX - minX) / PX_PER_METER);
    const heightMeters = Math.max(0, (maxY - minY) / PX_PER_METER);

    return {
      renderStations,
      width: maxX - minX + padding * 2,
      height: maxY - minY + padding * 2,
      footprintArea: widthMeters * heightMeters,
    };
  }, [placedStations]);

  const connectors = useMemo(
    () =>
      canvasMetrics.renderStations.slice(0, -1).map((station, idx) => {
        const nextStation = canvasMetrics.renderStations[idx + 1];
        const fromCenter = getStationCenter(station);
        const toCenter = getStationCenter(nextStation);
        const distancePx = Math.hypot(toCenter.x - fromCenter.x, toCenter.y - fromCenter.y);
        const distanceMeters = distancePx / PX_PER_METER;

        return {
          idx,
          fromCenter,
          toCenter,
          distanceMeters,
          path: buildConnectorPath(fromCenter, toCenter),
        };
      }),
    [canvasMetrics.renderStations]
  );

  const totalTransferDistance = connectors.reduce((sum, connector) => sum + connector.distanceMeters, 0);
  const idleSimulationState = useMemo(
    () => ({
      phase: 'idle',
      stationIdx: -1,
      nextStationIdx: -1,
      unitPosition: canvasMetrics.renderStations[0] ? getStationCenter(canvasMetrics.renderStations[0]) : null,
      status: 'Layout ready for simulation',
      travelMeters: 0,
      cycle: 0,
    }),
    [canvasMetrics.renderStations]
  );
  const displaySimulationState = isSimulating ? simulationState : idleSimulationState;

  useEffect(() => {
    if (!isSimulating || canvasMetrics.renderStations.length === 0) return undefined;

    let cancelled = false;
    const timers = [];

    const schedule = (delay, callback) => {
      const timerId = setTimeout(() => {
        if (!cancelled) callback();
      }, delay);
      timers.push(timerId);
    };

    const runTransfer = (fromIdx, toIdx, cycle) => {
      const toStation = canvasMetrics.renderStations[toIdx];
      const connector = connectors[fromIdx];
      const transferMs = clamp((connector.distanceMeters * 260) / simulationSpeed, 380, 1650);

      setSimulationState({
        phase: 'transfer',
        stationIdx: fromIdx,
        nextStationIdx: toIdx,
        unitPosition: getStationCenter(toStation),
        status: `Transfer ${fromIdx + 1} -> ${toIdx + 1} | ${connector.distanceMeters.toFixed(1)} m material move`,
        travelMeters: connector.distanceMeters,
        cycle,
      });

      schedule(transferMs, () => runStation(toIdx, cycle));
    };

    const runStation = (idx, cycle) => {
      const station = canvasMetrics.renderStations[idx];
      const processMs = clamp((station.time * 180) / simulationSpeed, 700, 3200);

      setSimulationState({
        phase: 'processing',
        stationIdx: idx,
        nextStationIdx: -1,
        unitPosition: getStationCenter(station),
        status: `Processing at Station ${idx + 1} | ${station.time.toFixed(1)} min cycle load`,
        travelMeters: idx > 0 ? connectors[idx - 1]?.distanceMeters || 0 : 0,
        cycle,
      });

      if (idx === canvasMetrics.renderStations.length - 1) {
        schedule(processMs, () => {
          setSimulationState({
            phase: 'complete',
            stationIdx: idx,
            nextStationIdx: -1,
            unitPosition: getStationCenter(station),
            status: `Unit completed | total material travel ${totalTransferDistance.toFixed(1)} m`,
            travelMeters: totalTransferDistance,
            cycle,
          });
          schedule(950, () => setIsSimulating(false));
        });
        return;
      }

      schedule(processMs, () => runTransfer(idx, idx + 1, cycle));
    };

    runStation(0, 1);

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, [canvasMetrics.renderStations, connectors, isSimulating, simulationSpeed, totalTransferDistance]);

  if (!tasks || tasks.length === 0) {
    return (
      <EmptyState
        icon={Grid}
        title="NO FLOOR LAYOUT AVAILABLE"
        description="The Floor Layout canvas renders workstation positions based on your process tasks. Define tasks in Process Planning to generate the draggable floor plan."
        actionText="GO TO PROCESS PLANNING"
        onAction={() => onNavigate?.('planning')}
      />
    );
  }

  const getBasePosition = (idx) => basePositions[idx] || { x: 100 + idx * 250, y: 210 };

  const doCardsOverlap = (left, right) =>
    !(
      left.x + STATION_CARD_WIDTH + CARD_COLLISION_PADDING <= right.x ||
      right.x + STATION_CARD_WIDTH + CARD_COLLISION_PADDING <= left.x ||
      left.y + STATION_CARD_HEIGHT + CARD_COLLISION_PADDING <= right.y ||
      right.y + STATION_CARD_HEIGHT + CARD_COLLISION_PADDING <= left.y
    );

  const resolveStationOffset = (idx, candidateOffset, offsetMap) => {
    const base = getBasePosition(idx);
    const step = snapToGrid ? gridSize : FALLBACK_DRAG_STEP;
    const snappedOffset = {
      x: snapToGrid ? snapToGridValue(candidateOffset.x, gridSize) : candidateOffset.x,
      y: snapToGrid ? snapToGridValue(candidateOffset.y, gridSize) : candidateOffset.y,
    };

    const isOccupied = (offset) => {
      const candidateAbsolute = {
        x: base.x + offset.x,
        y: base.y + offset.y,
      };

      return optimization.stations.some((_, otherIdx) => {
        if (otherIdx === idx) return false;
        const otherBase = getBasePosition(otherIdx);
        const otherOffset = offsetMap[otherIdx] || { x: 0, y: 0 };
        const otherAbsolute = {
          x: otherBase.x + otherOffset.x,
          y: otherBase.y + otherOffset.y,
        };
        return doCardsOverlap(candidateAbsolute, otherAbsolute);
      });
    };

    if (!isOccupied(snappedOffset)) {
      return snappedOffset;
    }

    for (let ring = 1; ring <= 12; ring += 1) {
      for (let dx = -ring; dx <= ring; dx += 1) {
        for (let dy = -ring; dy <= ring; dy += 1) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== ring) continue;
          const shifted = {
            x: snappedOffset.x + dx * step,
            y: snappedOffset.y + dy * step,
          };
          if (!isOccupied(shifted)) {
            return shifted;
          }
        }
      }
    }

    return snappedOffset;
  };

  const applyStationOffsetDelta = (idx, deltaX, deltaY) => {
    setStationOffsets((previous) => {
      const current = previous[idx] || { x: 0, y: 0 };
      const nextOffset = resolveStationOffset(
        idx,
        {
          x: current.x + deltaX,
          y: current.y + deltaY,
        },
        previous
      );

      return {
        ...previous,
        [idx]: nextOffset,
      };
    });
  };

  const handleDragEnd = (idx, info) => {
    applyStationOffsetDelta(idx, info.offset.x, info.offset.y);
  };

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
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        border: '1px solid var(--border-color)',
        transition: 'var(--transition-smooth)',
      }}
    >

      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: 'grid',
          gridTemplateColumns: isStacked ? '1fr' : '360px minmax(0, 1fr)',
          gap: '1px',
          background: 'var(--border-color)',
        }}
      >
        <div
          style={{
            background: 'var(--card-bg)',
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{ padding: '1.1rem 1.1rem 0', overflowY: 'auto' }}>
            <div className="glow-card" style={{ padding: '1rem', marginBottom: '1rem' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '0.85rem',
                  fontSize: '0.76rem',
                  fontWeight: 900,
                  color: 'var(--text-white)',
                  letterSpacing: '1px',
                }}
              >
                <Route size={15} />
                FLOW SIMULATION
              </div>

              <button
                onClick={() => setIsSimulating((current) => !current)}
                style={{
                  width: '100%',
                  padding: '0.95rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid transparent',
                  background: isSimulating ? 'var(--accent-danger)' : 'var(--accent-primary)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  fontWeight: 900,
                  letterSpacing: '0.8px',
                  boxShadow: isSimulating ? '0 10px 30px rgba(239, 68, 68, 0.25)' : 'var(--shadow-glow)',
                }}
              >
                {isSimulating ? <Square size={15} fill="#fff" /> : <Play size={15} fill="#fff" />}
                {isSimulating ? 'STOP SIMULATION' : 'START SIMULATION'}
              </button>

              <div style={{ marginTop: '1rem', display: 'grid', gap: '0.85rem' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                    <span style={{ fontSize: '0.68rem', fontWeight: 900, color: 'var(--text-sub)' }}>SIMULATION SPEED</span>
                    <span style={{ fontSize: '0.68rem', fontWeight: 900, color: 'var(--text-white)' }}>
                      {simulationSpeed.toFixed(1)}x
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.7"
                    max="2"
                    step="0.1"
                    value={simulationSpeed}
                    onChange={(event) => setSimulationSpeed(Number(event.target.value))}
                    style={{ width: '100%', accentColor: 'var(--accent-primary)' }}
                  />
                </div>

                <label
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '0.68rem',
                    fontWeight: 900,
                    color: 'var(--text-sub)',
                  }}
                >
                  DRAW FLOW PATHS
                  <input
                    type="checkbox"
                    checked={showArrows}
                    onChange={(event) => setShowArrows(event.target.checked)}
                    style={{ accentColor: 'var(--accent-primary)' }}
                  />
                </label>

                <div
                  style={{
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                  }}
                >
                  <div style={{ fontSize: '0.62rem', fontWeight: 900, color: 'var(--text-sub)', letterSpacing: '0.8px' }}>
                    LIVE STATUS
                  </div>
                  <div style={{ marginTop: '0.35rem', fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-white)', lineHeight: 1.45 }}>
                    {displaySimulationState.status}
                  </div>
                </div>
              </div>
            </div>



            <div className="glow-card" style={{ padding: '1rem', marginBottom: '1rem' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '0.85rem',
                  fontSize: '0.76rem',
                  fontWeight: 900,
                  color: 'var(--text-white)',
                  letterSpacing: '1px',
                }}
              >
                <Workflow size={15} />
                ACTIVE STATIONS
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
                {canvasMetrics.renderStations.map((station) => (
                  <button
                    key={station.idx}
                    onClick={() => setSelectedStationIdx(station.idx)}
                    style={{
                      borderRadius: 'var(--radius-md)',
                      border: `1px solid ${
                        safeSelectedStationIdx === station.idx ? 'var(--accent-primary)' : 'var(--border-color)'
                      }`,
                      background:
                        safeSelectedStationIdx === station.idx ? 'rgba(13, 148, 136, 0.08)' : 'var(--bg-secondary)',
                      padding: '0.85rem',
                      textAlign: 'left',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: '0.63rem', fontWeight: 900, color: 'var(--text-sub)', letterSpacing: '0.8px' }}>
                          STATION {station.idx + 1}
                        </div>
                        <div style={{ marginTop: '0.2rem', fontSize: '0.84rem', fontWeight: 900, color: 'var(--text-white)' }}>
                          {station.role}
                        </div>
                      </div>
                      <div
                        style={{
                          fontSize: '0.68rem',
                          fontWeight: 900,
                          color: station.utilization > 95 ? 'var(--accent-warning)' : 'var(--accent-primary)',
                        }}
                      >
                        {station.utilization.toFixed(0)}%
                      </div>
                    </div>

                    <div style={{ marginTop: '0.65rem', display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '0.45rem' }}>
                      <div style={{ padding: '0.45rem', borderRadius: 'var(--radius-sm)', background: 'var(--card-bg)' }}>
                        <div style={{ fontSize: '0.55rem', fontWeight: 900, color: 'var(--text-sub)' }}>LOAD</div>
                        <div style={{ marginTop: '0.15rem', fontSize: '0.75rem', fontWeight: 900, color: 'var(--text-white)' }}>
                          {station.time.toFixed(1)}m
                        </div>
                      </div>
                      <div style={{ padding: '0.45rem', borderRadius: 'var(--radius-sm)', background: 'var(--card-bg)' }}>
                        <div style={{ fontSize: '0.55rem', fontWeight: 900, color: 'var(--text-sub)' }}>IDLE</div>
                        <div style={{ marginTop: '0.15rem', fontSize: '0.75rem', fontWeight: 900, color: 'var(--text-white)' }}>
                          {station.idleTime.toFixed(1)}m
                        </div>
                      </div>
                      <div style={{ padding: '0.45rem', borderRadius: 'var(--radius-sm)', background: 'var(--card-bg)' }}>
                        <div style={{ fontSize: '0.55rem', fontWeight: 900, color: 'var(--text-sub)' }}>TASKS</div>
                        <div style={{ marginTop: '0.15rem', fontSize: '0.75rem', fontWeight: 900, color: 'var(--text-white)' }}>
                          {station.tasks.length}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            background: 'var(--bg-main)',
          }}
        >
          <div
            style={{
              flex: 1,
              minHeight: 0,
              overflow: 'auto',
              padding: '1rem',
              background:
                'radial-gradient(circle at top left, rgba(13, 148, 136, 0.12), transparent 30%), var(--bg-main)',
            }}
          >
            <div
              style={{
                position: 'relative',
                minWidth: canvasMetrics.width,
                height: canvasMetrics.height,
                borderRadius: '20px',
                border: '1px solid var(--border-color)',
                overflow: 'hidden',
                backgroundColor: 'var(--bg-primary)',
                backgroundImage:
                  'linear-gradient(rgba(100, 116, 139, 0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(100, 116, 139, 0.08) 1px, transparent 1px)',
                backgroundSize: `${gridSize}px ${gridSize}px`,
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  inset: '1rem',
                  borderRadius: '16px',
                  border: '1px dashed rgba(100, 116, 139, 0.24)',
                  pointerEvents: 'none',
                }}
              />

              {showArrows && (
                <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
                  <defs>
                    <marker id="flowArrow" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                      <polygon points="0 0, 8 3, 0 6" fill="var(--accent-primary)" />
                    </marker>
                  </defs>
                  {connectors.map((connector) => {
                    const isActiveTransfer =
                      displaySimulationState.phase === 'transfer' &&
                      connector.idx === displaySimulationState.stationIdx &&
                      displaySimulationState.nextStationIdx === connector.idx + 1;

                    return (
                      <g key={`connector-${connector.idx}`}>
                        <path
                          d={connector.path}
                          stroke="rgba(100, 116, 139, 0.35)"
                          strokeWidth="3"
                          strokeDasharray="6 10"
                          fill="none"
                          markerEnd="url(#flowArrow)"
                        />
                        <motion.path
                          d={connector.path}
                          stroke={isActiveTransfer ? 'var(--accent-warning)' : 'var(--accent-primary)'}
                          strokeWidth={isActiveTransfer ? 4 : 3}
                          strokeDasharray={isActiveTransfer ? '8 12' : '5 18'}
                          fill="none"
                          animate={{ strokeDashoffset: [26, 0] }}
                          transition={{ repeat: Infinity, ease: 'linear', duration: isActiveTransfer ? 0.7 : 1.6 }}
                        />
                      </g>
                    );
                  })}
                </svg>
              )}

              {displaySimulationState.unitPosition && (
                <motion.div
                  animate={{
                    left: displaySimulationState.unitPosition.x - 19,
                    top: displaySimulationState.unitPosition.y - 19,
                    scale: displaySimulationState.phase === 'processing' ? [1, 1.08, 1] : 1,
                  }}
                  transition={{
                    left: {
                      type: displaySimulationState.phase === 'transfer' ? 'spring' : 'tween',
                      stiffness: 120,
                      damping: 22,
                      duration: displaySimulationState.phase === 'transfer' ? undefined : 0.35,
                    },
                    top: {
                      type: displaySimulationState.phase === 'transfer' ? 'spring' : 'tween',
                      stiffness: 120,
                      damping: 22,
                      duration: displaySimulationState.phase === 'transfer' ? undefined : 0.35,
                    },
                    scale: { repeat: displaySimulationState.phase === 'processing' ? Infinity : 0, duration: 1.1 },
                  }}
                  style={{
                    position: 'absolute',
                    width: '38px',
                    height: '38px',
                    borderRadius: '12px',
                    background:
                      displaySimulationState.phase === 'transfer' ? 'var(--accent-warning)' : 'var(--accent-primary)',
                    boxShadow:
                      displaySimulationState.phase === 'transfer'
                        ? '0 14px 40px rgba(245, 158, 11, 0.45)'
                        : '0 14px 40px rgba(13, 148, 136, 0.35)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 60,
                    border: '2px solid rgba(255,255,255,0.8)',
                  }}
                >
                  <Settings2 size={18} color="#fff" />
                </motion.div>
              )}

              {canvasMetrics.renderStations.map((station) => {
                const isSelected = station.idx === safeSelectedStationIdx;
                const isActive = station.idx === displaySimulationState.stationIdx;
                const nextDistance = connectors[station.idx]?.distanceMeters || 0;

                return (
                  <motion.div
                    key={`station-${station.idx}`}
                    layout
                    drag={!isSimulating}
                    dragMomentum={false}
                    dragElastic={snapToGrid ? 0.04 : 0.1}
                    onDragStart={() => {
                      setDraggingStationIdx(station.idx);
                      setSelectedStationIdx(station.idx);
                    }}
                    onDragEnd={(_, info) => {
                      setDraggingStationIdx(-1);
                      handleDragEnd(station.idx, info);
                    }}
                    whileDrag={{
                      scale: 1.03,
                      boxShadow: '0 24px 45px rgba(13, 148, 136, 0.28)',
                    }}
                    onClick={() => setSelectedStationIdx(station.idx)}
                    animate={{
                      left: station.renderX,
                      top: station.renderY,
                      borderColor: isActive ? 'var(--accent-primary)' : isSelected ? 'var(--accent-warning)' : 'var(--border-color)',
                    }}
                    transition={{ type: 'spring', stiffness: 340, damping: 32 }}
                    className="glow-card"
                    style={{
                      position: 'absolute',
                      width: `${STATION_CARD_WIDTH}px`,
                      height: `${STATION_CARD_HEIGHT}px`,
                      padding: 0,
                      overflow: 'hidden',
                      cursor: isSimulating ? 'default' : draggingStationIdx === station.idx ? 'grabbing' : 'grab',
                      zIndex: draggingStationIdx === station.idx ? 40 : isSelected ? 20 : 10,
                      boxShadow: isSelected
                        ? '0 20px 40px rgba(245, 158, 11, 0.16)'
                        : isActive
                          ? '0 20px 40px rgba(13, 148, 136, 0.18)'
                          : 'var(--shadow-glow)',
                    }}
                  >
                    <div
                      style={{
                        padding: '0.5rem 0.65rem',
                        background:
                          isActive
                            ? 'rgba(13, 148, 136, 0.12)'
                            : isSelected
                              ? 'rgba(245, 158, 11, 0.12)'
                              : 'var(--bg-secondary)',
                        borderBottom: '1px solid var(--border-color)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: '0.45rem',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '0.52rem', fontWeight: 900, color: 'var(--text-sub)', letterSpacing: '0.7px' }}>
                          STATION {station.idx + 1}
                        </div>
                        <div style={{ marginTop: '0.1rem', fontSize: '0.66rem', fontWeight: 900, color: 'var(--text-white)' }}>
                          {station.role}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        {station.isBottleneck && (
                          <div
                            style={{
                              padding: '0.16rem 0.3rem',
                              borderRadius: '999px',
                              background: 'rgba(239, 68, 68, 0.12)',
                              color: 'var(--accent-danger)',
                              fontSize: '0.44rem',
                              fontWeight: 900,
                              letterSpacing: '0.4px',
                            }}
                          >
                            BOT
                          </div>
                        )}
                        <Box size={14} color={isActive ? 'var(--accent-primary)' : 'var(--text-sub)'} />
                      </div>
                    </div>

                    <div style={{ padding: '0.55rem 0.65rem 0.6rem', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                        {station.tasks.slice(0, 2).map((task) => (
                          <div key={task.id} style={{ display: 'flex', gap: '0.3rem', fontSize: '0.58rem', color: 'var(--text-main)' }}>
                            <span style={{ minWidth: '16px', fontWeight: 900, color: 'var(--accent-primary)' }}>{task.id}</span>
                            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{task.name}</span>
                          </div>
                        ))}
                        {station.tasks.length > 2 && (
                          <div style={{ fontSize: '0.54rem', color: 'var(--text-sub)', fontWeight: 800 }}>
                            +{station.tasks.length - 2} more
                          </div>
                        )}
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '0.25rem' }}>
                        {[
                          { label: 'UTIL', value: `${station.utilization.toFixed(0)}%`, icon: Gauge },
                          { label: 'IDLE', value: `${station.idleTime.toFixed(1)}m`, icon: Activity },
                          {
                            label: 'NEXT',
                            value: station.idx < canvasMetrics.renderStations.length - 1 ? `${nextDistance.toFixed(1)}m` : 'END',
                            icon: SlidersHorizontal,
                          },
                        ].map((item) => {
                          const Icon = item.icon;
                          return (
                            <div
                              key={item.label}
                              style={{
                                background: 'var(--bg-secondary)',
                                borderRadius: 'var(--radius-sm)',
                                border: '1px solid var(--border-color)',
                                padding: '0.32rem 0.36rem',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '0.44rem', fontWeight: 900, color: 'var(--text-sub)' }}>
                                <Icon size={9} />
                                {item.label}
                              </div>
                              <div style={{ marginTop: '0.16rem', fontSize: '0.58rem', fontWeight: 900, color: 'var(--text-white)' }}>
                                {item.value}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.5rem', fontWeight: 900, color: 'var(--text-sub)' }}>
                          <span>Load / takt</span>
                          <span>{station.time.toFixed(1)}/{taktTime.toFixed(1)}m</span>
                        </div>
                        <div
                          style={{
                            marginTop: '0.22rem',
                            height: '6px',
                            borderRadius: '999px',
                            background: 'var(--bg-tertiary)',
                            overflow: 'hidden',
                          }}
                        >
                          <div
                            style={{
                              height: '100%',
                              width: `${Math.min(station.utilization, 100)}%`,
                              background: station.utilization > 95 ? 'var(--accent-warning)' : 'var(--accent-primary)',
                            }}
                          />
                        </div>
                        <div style={{ marginTop: '0.28rem', fontSize: '0.48rem', color: 'var(--text-sub)' }}>
                          {station.uniqueZones.length > 0 ? `${station.uniqueZones.length} zone rule(s)` : 'No zone restriction'}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>


        </div>
      </div>
    </motion.div>
  );
};

export default FloorLayout;
