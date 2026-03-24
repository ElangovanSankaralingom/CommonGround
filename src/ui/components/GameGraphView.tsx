import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { GameGraph, GameVertex, GameEdge, ZoneCondition } from '../../core/models/types';
import { CONDITION_TO_WELFARE } from '../../core/models/constants';

interface GameGraphViewProps {
  graph: GameGraph;
  currentRound: number;
  onClose: () => void;
}

const CONDITION_COLORS: Record<ZoneCondition, string> = {
  good: '#27AE60',
  fair: '#F1C40F',
  poor: '#E67E22',
  critical: '#E74C3C',
  locked: '#95A5A6',
};

const EDGE_TYPE_COLORS: Record<string, string> = {
  negotiation: '#3B82F6',
  crisis_propagation: '#EF4444',
  resource_dependency: '#6B7280',
  stakeholder_shared: '#8B5CF6',
};

// Simple force-directed layout positions for 14 zones
const ZONE_POSITIONS: Record<string, { x: number; y: number }> = {
  main_entrance: { x: 100, y: 80 },
  fountain_plaza: { x: 220, y: 60 },
  boating_pond: { x: 340, y: 80 },
  playground: { x: 460, y: 60 },
  walking_track: { x: 560, y: 100 },
  herbal_garden: { x: 80, y: 200 },
  open_lawn: { x: 200, y: 180 },
  exercise_zone: { x: 340, y: 200 },
  sculpture_garden: { x: 460, y: 180 },
  vendor_hub: { x: 560, y: 220 },
  restroom_block: { x: 100, y: 320 },
  fiber_optic_lane: { x: 220, y: 300 },
  ppp_zone: { x: 340, y: 320 },
  maintenance_depot: { x: 460, y: 300 },
};

export const GameGraphView: React.FC<GameGraphViewProps> = ({ graph, currentRound, onClose }) => {
  const [selectedRound, setSelectedRound] = useState(currentRound);

  const snapshot = useMemo(() => {
    return graph.snapshots.find(s => s.round === selectedRound) || graph.snapshots[graph.snapshots.length - 1];
  }, [graph.snapshots, selectedRound]);

  const vertices = snapshot?.vertices || [];
  const edges = snapshot?.edges || [];
  const vo = graph.objectiveFunction;

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="bg-stone-900 rounded-2xl border border-stone-600 shadow-2xl w-[90vw] h-[85vh] flex flex-col overflow-hidden"
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-700">
          <div>
            <h2 className="text-xl font-bold text-amber-300">Game Graph</h2>
            <p className="text-stone-400 text-xs mt-1">
              V={vertices.length} vertices, E={edges.length} edges
            </p>
          </div>

          {/* VO Display */}
          <div className="text-center">
            <p className="text-stone-500 text-xs uppercase tracking-wider">Collective Welfare (VO)</p>
            <p className="text-2xl font-bold text-amber-400">
              {vo.currentVO.toFixed(1)}
              <span className="text-stone-500 text-sm font-normal"> / {vo.maxPossibleVO.toFixed(1)}</span>
            </p>
            <p className="text-stone-500 text-[10px]">{vo.formula}</p>
          </div>

          {/* Round slider */}
          <div className="flex items-center gap-3">
            <span className="text-stone-400 text-xs">Round</span>
            <input
              type="range"
              min={1}
              max={currentRound}
              value={selectedRound}
              onChange={(e) => setSelectedRound(parseInt(e.target.value))}
              className="w-32 accent-amber-400"
            />
            <span className="text-amber-400 font-bold text-sm">{selectedRound}</span>
            <button
              className="px-3 py-1.5 rounded-lg bg-stone-700 text-stone-300 text-sm hover:bg-stone-600"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>

        {/* Graph SVG */}
        <div className="flex-1 overflow-hidden p-4">
          <svg width="100%" height="100%" viewBox="0 0 660 400">
            {/* Edges */}
            {edges.map((edge) => {
              const fromVertex = vertices.find(v => v.id === edge.fromVertexId);
              const toVertex = vertices.find(v => v.id === edge.toVertexId);
              if (!fromVertex || !toVertex) return null;

              const fromPos = ZONE_POSITIONS[fromVertex.zoneId] || { x: 300, y: 200 };
              const toPos = ZONE_POSITIONS[toVertex.zoneId] || { x: 300, y: 200 };

              return (
                <line
                  key={edge.id}
                  x1={fromPos.x}
                  y1={fromPos.y}
                  x2={toPos.x}
                  y2={toPos.y}
                  stroke={EDGE_TYPE_COLORS[edge.edgeType] || '#444'}
                  strokeWidth={Math.max(1, edge.weight * 1.5)}
                  opacity={edge.wasActivated ? 0.8 : 0.2}
                  strokeDasharray={edge.wasActivated ? 'none' : '4,4'}
                />
              );
            })}

            {/* Vertices (Zones) */}
            {vertices.map((vertex) => {
              const pos = ZONE_POSITIONS[vertex.zoneId] || { x: 300, y: 200 };
              const color = CONDITION_COLORS[vertex.configuration.condition] || '#666';
              const welfare = vertex.configuration.welfareScore;
              const isCommonPool = vertex.configuration.isCommonPool;

              return (
                <g key={vertex.id} transform={`translate(${pos.x}, ${pos.y})`}>
                  {/* Glow for activated nodes */}
                  {vertex.configuration.resourcesInvested > 0 && (
                    <circle r={24} fill={color} opacity={0.15} />
                  )}
                  {/* Common pool indicator */}
                  {isCommonPool && (
                    <circle r={20} fill="none" stroke="#60A5FA" strokeWidth={1.5} strokeDasharray="3,2" />
                  )}
                  {/* Node */}
                  <circle r={16} fill={color} stroke="#1a1a2e" strokeWidth={2} />
                  {/* Welfare score */}
                  <text
                    x={0}
                    y={1}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill="#1a1a2e"
                    fontSize={11}
                    fontWeight={700}
                  >
                    {welfare}
                  </text>
                  {/* Zone name */}
                  <text
                    x={0}
                    y={28}
                    textAnchor="middle"
                    fill="#9CA3AF"
                    fontSize={8}
                    style={{ fontFamily: 'system-ui' }}
                  >
                    {vertex.zoneId.replace(/_/g, ' ')}
                  </text>
                  {/* Crisis indicator */}
                  {vertex.configuration.activeCrisis && (
                    <circle cx={12} cy={-12} r={5} fill="#EF4444" stroke="#1a1a2e" strokeWidth={1} />
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        {/* Zone Contributions Table */}
        <div className="px-6 py-3 border-t border-stone-700 bg-stone-800/50">
          <div className="flex gap-2 overflow-x-auto">
            {vo.zoneContributions.map((zc) => (
              <div key={zc.zoneId} className="flex-shrink-0 bg-stone-700/50 rounded-lg px-3 py-1.5 text-center">
                <p className="text-stone-400 text-[9px] uppercase">{zc.zoneId.replace(/_/g, ' ')}</p>
                <p className="text-amber-300 text-sm font-bold">{zc.contribution.toFixed(1)}</p>
                <p className="text-stone-500 text-[8px]">W={zc.weight.toFixed(1)} S={zc.welfareScore}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="px-6 py-2 border-t border-stone-700/50 flex items-center gap-4 text-[10px] text-stone-500">
          <span>Edge types:</span>
          {Object.entries(EDGE_TYPE_COLORS).map(([type, color]) => (
            <span key={type} className="flex items-center gap-1">
              <span className="w-3 h-0.5 inline-block" style={{ backgroundColor: color }} />
              {type.replace(/_/g, ' ')}
            </span>
          ))}
          <span className="ml-4">Node color = zone condition</span>
          <span>| Number = welfare score (0-4)</span>
        </div>
      </motion.div>
    </motion.div>
  );
};
