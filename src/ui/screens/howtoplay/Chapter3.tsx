import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ZONES, ADJACENCY, TRIGGER_TILES } from '../../../core/content';
import type { Zone, ZoneCondition } from '../../../core/models/types';

interface ChapterProps {
  onNext: () => void;
  onBack: () => void;
}

const CONDITION_COLORS: Record<ZoneCondition, string> = {
  good: '#27AE60',
  fair: '#F1C40F',
  poor: '#E67E22',
  critical: '#E74C3C',
  locked: '#95A5A6',
};

const CONDITION_LABELS: Record<ZoneCondition, string> = {
  good: 'Good',
  fair: 'Fair',
  poor: 'Poor',
  critical: 'Critical',
  locked: 'Locked',
};

const ZONE_TYPE_ICONS: Record<string, string> = {
  recreation: '🏃',
  infrastructure: '🏗️',
  commercial: '🏪',
  ecological: '🌿',
  cultural: '🎨',
  administrative: '🏛️',
  development: '🔨',
  utility: '🔧',
};

const RESOURCE_ICONS: Record<string, string> = {
  budget: '💰',
  influence: '🔵',
  volunteer: '🤝',
  material: '🧱',
  knowledge: '📚',
};

// Hex math: flat-top hexagons
const HEX_SIZE = 50;
const SQRT3 = Math.sqrt(3);

function hexToPixel(q: number, r: number): { x: number; y: number } {
  const x = HEX_SIZE * (3 / 2) * q;
  const y = HEX_SIZE * ((SQRT3 / 2) * q + SQRT3 * r);
  return { x, y };
}

function hexPoints(cx: number, cy: number, size: number): string {
  const points: string[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i;
    points.push(`${cx + size * Math.cos(angle)},${cy + size * Math.sin(angle)}`);
  }
  return points.join(' ');
}

// Zone detail panel
function ZoneDetailPanel({
  zone,
  onClose,
  showProblems,
  showResources,
}: {
  zone: Zone;
  onClose: () => void;
  showProblems: boolean;
  showResources: boolean;
}) {
  const condColor = CONDITION_COLORS[zone.condition];
  const typeIcon = ZONE_TYPE_ICONS[zone.zoneType] || '📍';
  const resourceEntries = Object.entries(zone.resources).filter(([, val]) => val > 0);
  const trigger = Object.values(TRIGGER_TILES).find((t) => t.zoneId === zone.id);

  return (
    <motion.div
      className="rounded-xl border overflow-hidden"
      style={{ borderColor: condColor + '40' }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ type: 'spring', damping: 25 }}
    >
      <div className="px-4 py-3 flex items-center justify-between" style={{ background: condColor + '15' }}>
        <div className="flex items-center gap-2">
          <span className="text-xl">{typeIcon}</span>
          <div>
            <h4 className="font-bold text-sm" style={{ color: '#4A3728' }}>{zone.name}</h4>
            <div className="flex items-center gap-2 mt-0.5">
              <span
                className="px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase"
                style={{ background: condColor, color: '#fff' }}
              >
                {zone.condition}
              </span>
              <span className="text-[10px] capitalize" style={{ color: '#8B6F47' }}>
                {zone.zoneType}
              </span>
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-black/5 text-sm"
          style={{ color: '#8B6F47' }}
        >
          ✕
        </button>
      </div>

      <div className="px-4 py-3 space-y-3">
        <p className="text-xs" style={{ color: '#4A3728' }}>{zone.description}</p>

        {/* Resources */}
        {(showResources || resourceEntries.length > 0) && (
          <div>
            <h5 className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: '#8B6F47' }}>
              Resources
            </h5>
            {resourceEntries.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {resourceEntries.map(([key, val]) => (
                  <span key={key} className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'rgba(139,111,71,0.08)' }}>
                    {RESOURCE_ICONS[key]} {key}: {val}
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-xs italic" style={{ color: '#8B6F47' }}>No resources available</span>
            )}
          </div>
        )}

        {/* Problems */}
        {showProblems && zone.activeProblems.length > 0 && (
          <div>
            <h5 className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: '#E74C3C' }}>
              Active Problems
            </h5>
            <div className="flex flex-wrap gap-1.5">
              {zone.activeProblems.map((p) => (
                <span
                  key={p}
                  className="text-xs px-2 py-0.5 rounded-full"
                  style={{ background: '#E74C3C15', color: '#E74C3C' }}
                >
                  ⚠️ {p.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Trigger tile */}
        {trigger && (
          <div className="p-2 rounded-lg text-xs" style={{ background: 'rgba(139,111,71,0.06)' }}>
            <span className="font-semibold" style={{ color: '#8B6F47' }}>Hidden Trigger:</span>{' '}
            <span style={{ color: '#4A3728' }}>{trigger.type === 'trap' ? '⚠️' : trigger.type === 'secret_door' ? '🚪' : '🔗'} {trigger.title}</span>
          </div>
        )}

        {/* Adjacency */}
        <div>
          <h5 className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: '#8B6F47' }}>
            Adjacent Zones
          </h5>
          <div className="flex flex-wrap gap-1">
            {(ADJACENCY[zone.id] || []).map((adjId) => {
              const adjZone = ZONES[adjId];
              return (
                <span
                  key={adjId}
                  className="text-[10px] px-1.5 py-0.5 rounded"
                  style={{ background: CONDITION_COLORS[adjZone.condition] + '15', color: '#4A3728' }}
                >
                  {adjZone.name}
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function Chapter3({ onNext }: ChapterProps) {
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [showProblems, setShowProblems] = useState(false);
  const [showResources, setShowResources] = useState(false);
  const [showTriggers, setShowTriggers] = useState(false);

  const zoneEntries = useMemo(() => Object.values(ZONES), []);

  // Calculate bounding box for all hex positions
  const positions = useMemo(() => {
    const posMap: Record<string, { x: number; y: number }> = {};
    for (const zone of zoneEntries) {
      posMap[zone.id] = hexToPixel(zone.gridPosition.q, zone.gridPosition.r);
    }
    return posMap;
  }, [zoneEntries]);

  const bounds = useMemo(() => {
    const xs = Object.values(positions).map((p) => p.x);
    const ys = Object.values(positions).map((p) => p.y);
    return {
      minX: Math.min(...xs) - HEX_SIZE - 10,
      maxX: Math.max(...xs) + HEX_SIZE + 10,
      minY: Math.min(...ys) - HEX_SIZE - 10,
      maxY: Math.max(...ys) + HEX_SIZE + 10,
    };
  }, [positions]);

  const svgWidth = bounds.maxX - bounds.minX;
  const svgHeight = bounds.maxY - bounds.minY;

  const adjacentZoneIds = useMemo(() => {
    if (!selectedZoneId) return new Set<string>();
    return new Set(ADJACENCY[selectedZoneId] || []);
  }, [selectedZoneId]);

  // Trigger zone IDs
  const triggerZoneIds = useMemo(() => {
    return new Set(Object.values(TRIGGER_TILES).map((t) => t.zoneId));
  }, []);

  const selectedZone = selectedZoneId ? ZONES[selectedZoneId] : null;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-8 py-8 sm:py-12">
      <motion.div
        className="text-center mb-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h3
          className="text-2xl font-bold mb-2"
          style={{ fontFamily: "'Playfair Display', serif", color: '#7BA05B' }}
        >
          The Eco-Park Board
        </h3>
        <p className="text-sm" style={{ color: '#6B5744' }}>
          14 interconnected zones form the shared space. Tap any zone to explore it.
        </p>
      </motion.div>

      {/* Toggle buttons */}
      <motion.div
        className="flex flex-wrap justify-center gap-2 mb-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        {[
          { key: 'problems', label: 'Show Problems', active: showProblems, toggle: () => setShowProblems(!showProblems), icon: '⚠️' },
          { key: 'resources', label: 'Show Resources', active: showResources, toggle: () => setShowResources(!showResources), icon: '💎' },
          { key: 'triggers', label: 'Show Triggers', active: showTriggers, toggle: () => setShowTriggers(!showTriggers), icon: '🔮' },
        ].map((btn) => (
          <button
            key={btn.key}
            onClick={btn.toggle}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all border"
            style={{
              background: btn.active ? '#7BA05B' : 'transparent',
              color: btn.active ? '#F5E6D3' : '#7BA05B',
              borderColor: '#7BA05B',
            }}
          >
            {btn.icon} {btn.label}
          </button>
        ))}
      </motion.div>

      {/* Legend */}
      <motion.div
        className="flex flex-wrap justify-center gap-3 mb-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        {(Object.keys(CONDITION_COLORS) as ZoneCondition[]).map((cond) => (
          <div key={cond} className="flex items-center gap-1.5 text-xs">
            <div className="w-3 h-3 rounded-sm" style={{ background: CONDITION_COLORS[cond] }} />
            <span style={{ color: '#4A3728' }}>{CONDITION_LABELS[cond]}</span>
          </div>
        ))}
      </motion.div>

      {/* Hex Board SVG */}
      <motion.div
        className="flex justify-center mb-6 overflow-x-auto"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2, duration: 0.6 }}
      >
        <svg
          width="100%"
          viewBox={`${bounds.minX} ${bounds.minY} ${svgWidth} ${svgHeight}`}
          className="max-w-full"
          style={{ maxHeight: 450 }}
        >
          {/* Adjacency lines */}
          {Object.entries(ADJACENCY).map(([zoneId, neighbors]) =>
            neighbors.map((nId) => {
              if (zoneId > nId) return null; // avoid duplicates
              const p1 = positions[zoneId];
              const p2 = positions[nId];
              if (!p1 || !p2) return null;
              const isHighlighted =
                selectedZoneId &&
                ((zoneId === selectedZoneId && adjacentZoneIds.has(nId)) ||
                  (nId === selectedZoneId && adjacentZoneIds.has(zoneId)));
              return (
                <line
                  key={`edge-${zoneId}-${nId}`}
                  x1={p1.x}
                  y1={p1.y}
                  x2={p2.x}
                  y2={p2.y}
                  stroke={isHighlighted ? '#7BA05B' : 'rgba(139, 111, 71, 0.1)'}
                  strokeWidth={isHighlighted ? 2 : 1}
                  strokeDasharray={isHighlighted ? undefined : '4,4'}
                />
              );
            })
          )}

          {/* Hexagons */}
          {zoneEntries.map((zone, idx) => {
            const pos = positions[zone.id];
            const condColor = CONDITION_COLORS[zone.condition];
            const isSelected = zone.id === selectedZoneId;
            const isAdjacent = adjacentZoneIds.has(zone.id);
            const hasTrigger = triggerZoneIds.has(zone.id);
            const dimmed = selectedZoneId && !isSelected && !isAdjacent;

            return (
              <motion.g
                key={zone.id}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: dimmed ? 0.35 : 1, scale: 1 }}
                transition={{
                  delay: 0.5 + idx * 0.06,
                  type: 'spring',
                  stiffness: 200,
                  damping: 15,
                }}
                style={{ cursor: 'pointer' }}
                onClick={() => setSelectedZoneId(isSelected ? null : zone.id)}
              >
                {/* Hex shape */}
                <polygon
                  points={hexPoints(pos.x, pos.y, HEX_SIZE * 0.92)}
                  fill={condColor + (isSelected ? '40' : '18')}
                  stroke={isSelected ? condColor : isAdjacent ? '#7BA05B' : condColor + '50'}
                  strokeWidth={isSelected ? 3 : isAdjacent ? 2 : 1.5}
                />

                {/* Zone type icon */}
                <text
                  x={pos.x}
                  y={pos.y - 8}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={16}
                >
                  {ZONE_TYPE_ICONS[zone.zoneType] || '📍'}
                </text>

                {/* Zone name */}
                <text
                  x={pos.x}
                  y={pos.y + 10}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={7}
                  fill="#4A3728"
                  fontWeight={600}
                >
                  {zone.name.length > 16 ? zone.name.slice(0, 14) + '...' : zone.name}
                </text>

                {/* Condition dot */}
                <circle
                  cx={pos.x + HEX_SIZE * 0.55}
                  cy={pos.y - HEX_SIZE * 0.55}
                  r={5}
                  fill={condColor}
                />

                {/* Problem indicators */}
                {showProblems && zone.activeProblems.length > 0 && (
                  <text
                    x={pos.x - HEX_SIZE * 0.55}
                    y={pos.y - HEX_SIZE * 0.5}
                    textAnchor="middle"
                    fontSize={10}
                  >
                    ⚠️
                  </text>
                )}

                {/* Resource indicators */}
                {showResources && (
                  <text
                    x={pos.x}
                    y={pos.y + 22}
                    textAnchor="middle"
                    fontSize={6}
                    fill="#8B6F47"
                  >
                    {Object.entries(zone.resources)
                      .filter(([, v]) => v > 0)
                      .map(([k, v]) => `${RESOURCE_ICONS[k]}${v}`)
                      .join(' ')}
                  </text>
                )}

                {/* Trigger indicator */}
                {showTriggers && hasTrigger && (
                  <text
                    x={pos.x + HEX_SIZE * 0.55}
                    y={pos.y + HEX_SIZE * 0.55}
                    textAnchor="middle"
                    fontSize={10}
                  >
                    🔮
                  </text>
                )}
              </motion.g>
            );
          })}
        </svg>
      </motion.div>

      {/* Selected Zone Detail */}
      <AnimatePresence>
        {selectedZone && (
          <ZoneDetailPanel
            key={selectedZone.id}
            zone={selectedZone}
            onClose={() => setSelectedZoneId(null)}
            showProblems={showProblems}
            showResources={showResources}
          />
        )}
      </AnimatePresence>

      {/* Info card about hex interaction */}
      {!selectedZone && (
        <motion.div
          className="text-center p-4 rounded-xl text-sm"
          style={{ background: 'rgba(123, 160, 91, 0.08)', color: '#6B5744' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
        >
          <strong style={{ color: '#7BA05B' }}>Tap any hex</strong> to see its details, resources,
          and connections. Zones degrade if neglected and improve when players invest actions and resources.
        </motion.div>
      )}

      {/* Continue */}
      <motion.div
        className="text-center pt-10 pb-6"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.3 }}
      >
        <button
          onClick={onNext}
          className="px-6 py-3 rounded-xl text-sm font-semibold transition-all hover:scale-105"
          style={{ background: '#7BA05B', color: '#F5E6D3' }}
        >
          Learn About the Cards →
        </button>
      </motion.div>
    </div>
  );
}
