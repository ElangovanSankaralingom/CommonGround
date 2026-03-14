import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zone } from '../../core/models/types';

interface BoardOverlayProps {
  /** Zones that should be highlighted (e.g., affected by a challenge or event) */
  highlightedZoneIds: string[];
  /** Color of the highlight effect */
  highlightColor?: string;
  /** Standee movement animation: from zone to zone */
  standeeMovement: {
    fromZoneId: string;
    toZoneId: string;
    color: string;
    icon: string;
  } | null;
  /** Trigger tile reveal animation */
  triggerReveal: {
    zoneId: string;
    type: 'trap' | 'secret_door' | 'cascading_effect';
  } | null;
  /** All zones for coordinate lookup */
  zones: Zone[];
  /** Hex size for coordinate calculations */
  hexSize?: number;
}

const HEX_SIZE_DEFAULT = 60;

function axialToPixel(q: number, r: number, size: number): { x: number; y: number } {
  const x = size * (3 / 2 * q);
  const y = size * (Math.sqrt(3) / 2 * q + Math.sqrt(3) * r);
  return { x, y };
}

const TRIGGER_COLORS: Record<string, { bg: string; ring: string }> = {
  trap: { bg: '#E74C3C', ring: '#C0392B' },
  secret_door: { bg: '#F39C12', ring: '#E67E22' },
  cascading_effect: { bg: '#3498DB', ring: '#2980B9' },
};

export const BoardOverlay: React.FC<BoardOverlayProps> = React.memo(({
  highlightedZoneIds,
  highlightColor = '#FFFFFF',
  standeeMovement,
  triggerReveal,
  zones,
  hexSize = HEX_SIZE_DEFAULT,
}) => {
  // Build zone position lookup
  const zonePositions = useMemo(() => {
    const map: Record<string, { x: number; y: number }> = {};
    for (const zone of zones) {
      map[zone.id] = axialToPixel(zone.gridPosition.q, zone.gridPosition.r, hexSize);
    }
    return map;
  }, [zones, hexSize]);

  return (
    <g className="board-overlay" style={{ pointerEvents: 'none' }}>
      {/* Zone highlight effects */}
      <AnimatePresence>
        {highlightedZoneIds.map(zoneId => {
          const pos = zonePositions[zoneId];
          if (!pos) return null;

          return (
            <motion.circle
              key={`highlight-${zoneId}`}
              cx={pos.x}
              cy={pos.y}
              r={hexSize * 0.85}
              fill="none"
              stroke={highlightColor}
              strokeWidth={3}
              initial={{ opacity: 0, r: hexSize * 0.5 }}
              animate={{
                opacity: [0.3, 0.7, 0.3],
                r: [hexSize * 0.75, hexSize * 0.9, hexSize * 0.75],
              }}
              exit={{ opacity: 0, r: hexSize * 1.2 }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
          );
        })}
      </AnimatePresence>

      {/* Standee movement path */}
      <AnimatePresence>
        {standeeMovement && (() => {
          const from = zonePositions[standeeMovement.fromZoneId];
          const to = zonePositions[standeeMovement.toZoneId];
          if (!from || !to) return null;

          // Curved path between zones
          const midX = (from.x + to.x) / 2;
          const midY = (from.y + to.y) / 2 - hexSize * 0.5;

          return (
            <g key="standee-movement">
              {/* Path line */}
              <motion.path
                d={`M ${from.x} ${from.y} Q ${midX} ${midY} ${to.x} ${to.y}`}
                fill="none"
                stroke={standeeMovement.color}
                strokeWidth={2}
                strokeDasharray="6 4"
                strokeLinecap="round"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 0.6 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              />

              {/* Moving standee */}
              <motion.g
                initial={{ x: from.x, y: from.y, scale: 1.2 }}
                animate={{ x: to.x, y: to.y, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1, ease: 'easeInOut' }}
              >
                <circle
                  r={hexSize * 0.15}
                  fill={standeeMovement.color}
                  stroke="#1a1a2e"
                  strokeWidth={2}
                />
                <text
                  x={0}
                  y={0}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={hexSize * 0.15}
                >
                  {standeeMovement.icon}
                </text>
              </motion.g>

              {/* Destination pulse */}
              <motion.circle
                cx={to.x}
                cy={to.y}
                r={hexSize * 0.3}
                fill="none"
                stroke={standeeMovement.color}
                strokeWidth={1.5}
                initial={{ opacity: 0 }}
                animate={{
                  opacity: [0, 0.5, 0],
                  r: [hexSize * 0.3, hexSize * 0.6, hexSize * 0.3],
                }}
                transition={{
                  duration: 1.2,
                  repeat: 2,
                  ease: 'easeOut',
                  delay: 0.5,
                }}
              />
            </g>
          );
        })()}
      </AnimatePresence>

      {/* Trigger tile reveal */}
      <AnimatePresence>
        {triggerReveal && (() => {
          const pos = zonePositions[triggerReveal.zoneId];
          if (!pos) return null;

          const colors = TRIGGER_COLORS[triggerReveal.type];

          return (
            <g key={`trigger-${triggerReveal.zoneId}`}>
              {/* Expanding ring */}
              <motion.circle
                cx={pos.x}
                cy={pos.y}
                fill="none"
                stroke={colors.ring}
                strokeWidth={4}
                initial={{ r: 0, opacity: 1 }}
                animate={{ r: hexSize * 1.5, opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.2, ease: 'easeOut' }}
              />

              {/* Second ring with delay */}
              <motion.circle
                cx={pos.x}
                cy={pos.y}
                fill="none"
                stroke={colors.ring}
                strokeWidth={2}
                initial={{ r: 0, opacity: 0.8 }}
                animate={{ r: hexSize * 1.2, opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
              />

              {/* Central flash */}
              <motion.circle
                cx={pos.x}
                cy={pos.y}
                fill={colors.bg}
                initial={{ r: hexSize * 0.8, opacity: 0.6 }}
                animate={{ r: hexSize * 0.2, opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8, ease: 'easeIn', delay: 0.3 }}
              />

              {/* Icon burst */}
              <motion.text
                x={pos.x}
                y={pos.y}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={hexSize * 0.6}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: [0, 1, 1, 0], scale: [0.2, 1.2, 1, 0.8] }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.5, ease: 'easeOut' }}
              >
                {triggerReveal.type === 'trap' ? '!' :
                 triggerReveal.type === 'secret_door' ? '?' : '~'}
              </motion.text>
            </g>
          );
        })()}
      </AnimatePresence>
    </g>
  );
});

BoardOverlay.displayName = 'BoardOverlay';
