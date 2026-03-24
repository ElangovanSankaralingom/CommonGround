import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Zone, ZoneCondition, ResourceType } from '../../core/models/types';

export interface HexTileProps {
  zone: Zone;
  x: number;
  y: number;
  size: number;
  isSelected: boolean;
  onClick: () => void;
  standees: { roleId: string; color: string; icon: string }[];
}

// Condition colors
const CONDITION_COLORS: Record<ZoneCondition, string> = {
  good: '#27AE60',
  fair: '#F1C40F',
  poor: '#E67E22',
  critical: '#E74C3C',
  locked: '#95A5A6',
};

// Colorblind-accessible hatch pattern IDs
const CONDITION_PATTERN: Record<ZoneCondition, string> = {
  good: 'pattern-good',
  fair: 'pattern-fair',
  poor: 'pattern-poor',
  critical: 'pattern-critical',
  locked: 'pattern-locked',
};

// Resource token colors
const RESOURCE_COLORS: Record<ResourceType, string> = {
  budget: '#F1C40F',
  influence: '#8E44AD',
  volunteer: '#27AE60',
  material: '#95A5A6',
  knowledge: '#3498DB',
};

const RESOURCE_LABELS: Record<ResourceType, string> = {
  budget: 'B',
  influence: 'I',
  volunteer: 'V',
  material: 'M',
  knowledge: 'K',
};

function getHexPoints(size: number): string {
  const points: string[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (60 * i);
    points.push(`${size * Math.cos(angle)},${size * Math.sin(angle)}`);
  }
  return points.join(' ');
}

export const HexTile: React.FC<HexTileProps> = React.memo(({
  zone,
  x,
  y,
  size,
  isSelected,
  onClick,
  standees,
}) => {
  const hexPoints = useMemo(() => getHexPoints(size), [size]);
  const innerHexPoints = useMemo(() => getHexPoints(size * 0.92), [size]);

  const condition = zone.isLocked ? 'locked' : zone.condition;
  const fillColor = CONDITION_COLORS[condition];
  const patternId = CONDITION_PATTERN[condition];

  // Collect non-zero resources
  const resourceEntries = useMemo(() => {
    const entries: { type: ResourceType; count: number }[] = [];
    const types: ResourceType[] = ['budget', 'influence', 'volunteer', 'material', 'knowledge'];
    for (const t of types) {
      if (zone.resources[t] > 0) {
        entries.push({ type: t, count: zone.resources[t] });
      }
    }
    return entries;
  }, [zone.resources]);

  // Truncate zone name for display
  const displayName = useMemo(() => {
    const name = zone.name;
    return name.length > 16 ? name.substring(0, 14) + '...' : name;
  }, [zone.name]);

  // Layout standees in a row inside the hex
  const standeeRadius = size * 0.12;
  const maxStandees = Math.min(standees.length, 5);

  return (
    <motion.g
      transform={`translate(${x}, ${y})`}
      onClick={onClick}
      style={{ cursor: 'pointer' }}
      whileHover={{ scale: 1.06 }}
      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
    >
      {/* Drop shadow */}
      <polygon
        points={hexPoints}
        fill="rgba(0,0,0,0.15)"
        transform="translate(2, 3)"
      />

      {/* Main hex fill */}
      <polygon
        points={hexPoints}
        fill={fillColor}
        opacity={0.85}
      />

      {/* Colorblind hatch overlay */}
      <polygon
        points={innerHexPoints}
        fill={`url(#${patternId})`}
        opacity={0.3}
      />

      {/* Border — dashed for Common Pool Zones (Fix 1) */}
      <motion.polygon
        points={hexPoints}
        fill="none"
        stroke={isSelected ? '#FFFFFF' : zone.poolType === 'common' ? '#60A5FA' : 'rgba(255,255,255,0.4)'}
        strokeWidth={isSelected ? 3 : zone.poolType === 'common' ? 2.5 : 1.5}
        strokeDasharray={zone.poolType === 'common' ? `${size * 0.15},${size * 0.08}` : 'none'}
        animate={{
          stroke: isSelected ? '#FFFFFF' : zone.poolType === 'common' ? '#60A5FA' : 'rgba(255,255,255,0.4)',
          strokeWidth: isSelected ? 3 : zone.poolType === 'common' ? 2.5 : 1.5,
        }}
        whileHover={{
          stroke: '#FFFFFF',
          strokeWidth: 2.5,
        }}
        transition={{ duration: 0.2 }}
      />

      {/* Selected glow */}
      {isSelected && (
        <polygon
          points={hexPoints}
          fill="none"
          stroke="#FFFFFF"
          strokeWidth={1}
          opacity={0.3}
          transform="scale(1.05)"
        />
      )}

      {/* Zone name */}
      <text
        x={0}
        y={-size * 0.38}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="#1a1a2e"
        fontSize={size * 0.17}
        fontWeight={600}
        style={{ pointerEvents: 'none', fontFamily: 'system-ui, sans-serif' }}
      >
        {displayName}
      </text>

      {/* Zone type label */}
      <text
        x={0}
        y={-size * 0.22}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="rgba(26,26,46,0.6)"
        fontSize={size * 0.12}
        style={{ pointerEvents: 'none', fontFamily: 'system-ui, sans-serif', textTransform: 'uppercase' }}
      >
        {zone.zoneType}
      </text>

      {/* Progress markers (top-left) */}
      {zone.progressMarkers > 0 && (
        <g transform={`translate(${-size * 0.55}, ${-size * 0.3})`}>
          {Array.from({ length: Math.min(zone.progressMarkers, 5) }).map((_, i) => (
            <circle
              key={`progress-${i}`}
              cx={i * size * 0.14}
              cy={0}
              r={size * 0.06}
              fill="#2ECC71"
              stroke="#1a1a2e"
              strokeWidth={0.5}
            />
          ))}
        </g>
      )}

      {/* Problem markers (top-right) */}
      {zone.problemMarkers > 0 && (
        <g transform={`translate(${size * 0.25}, ${-size * 0.3})`}>
          {Array.from({ length: Math.min(zone.problemMarkers, 5) }).map((_, i) => (
            <circle
              key={`problem-${i}`}
              cx={i * size * 0.14}
              cy={0}
              r={size * 0.06}
              fill="#E74C3C"
              stroke="#1a1a2e"
              strokeWidth={0.5}
            />
          ))}
        </g>
      )}

      {/* Active problems indicator */}
      {zone.activeProblems.length > 0 && (
        <g transform={`translate(${size * 0.5}, ${-size * 0.15})`}>
          <circle
            r={size * 0.1}
            fill="#E74C3C"
            stroke="#1a1a2e"
            strokeWidth={1}
          />
          <text
            x={0}
            y={0}
            textAnchor="middle"
            dominantBaseline="central"
            fill="white"
            fontSize={size * 0.12}
            fontWeight={700}
            style={{ pointerEvents: 'none' }}
          >
            {zone.activeProblems.length}
          </text>
        </g>
      )}

      {/* Player standees */}
      {maxStandees > 0 && (
        <g transform={`translate(0, ${size * 0.05})`}>
          {standees.slice(0, maxStandees).map((standee, i) => {
            const totalWidth = (maxStandees - 1) * standeeRadius * 2.5;
            const sx = -totalWidth / 2 + i * standeeRadius * 2.5;
            return (
              <g key={`standee-${standee.roleId}-${i}`} transform={`translate(${sx}, 0)`}>
                <circle
                  r={standeeRadius}
                  fill={standee.color}
                  stroke="#1a1a2e"
                  strokeWidth={1.5}
                />
                <text
                  x={0}
                  y={0}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={standeeRadius * 1.2}
                  style={{ pointerEvents: 'none' }}
                >
                  {standee.icon}
                </text>
              </g>
            );
          })}
        </g>
      )}

      {/* Resource tokens at bottom */}
      {resourceEntries.length > 0 && (
        <g transform={`translate(0, ${size * 0.38})`}>
          {resourceEntries.map((entry, i) => {
            const totalWidth = (resourceEntries.length - 1) * size * 0.18;
            const rx = -totalWidth / 2 + i * size * 0.18;
            return (
              <g key={`res-${entry.type}`} transform={`translate(${rx}, 0)`}>
                <circle
                  r={size * 0.07}
                  fill={RESOURCE_COLORS[entry.type]}
                  stroke="#1a1a2e"
                  strokeWidth={0.5}
                />
                <text
                  x={0}
                  y={0}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="#1a1a2e"
                  fontSize={size * 0.08}
                  fontWeight={700}
                  style={{ pointerEvents: 'none' }}
                >
                  {RESOURCE_LABELS[entry.type]}
                </text>
                {entry.count > 1 && (
                  <text
                    x={size * 0.08}
                    y={-size * 0.06}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill="#1a1a2e"
                    fontSize={size * 0.07}
                    fontWeight={700}
                    style={{ pointerEvents: 'none' }}
                  >
                    {entry.count}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      )}

      {/* Common Pool Zone indicator (Fix 1) */}
      {zone.poolType === 'common' && zone.commonPoolConfig && (
        <g transform={`translate(${-size * 0.52}, ${size * 0.18})`}>
          <circle r={size * 0.09} fill="#60A5FA" stroke="#1a1a2e" strokeWidth={0.5} opacity={0.9} />
          <text
            x={0}
            y={0}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={size * 0.09}
            style={{ pointerEvents: 'none' }}
          >
            🤝
          </text>
        </g>
      )}

      {/* Common Pool token name */}
      {zone.poolType === 'common' && zone.commonPoolConfig && (
        <text
          x={0}
          y={size * 0.55}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="#60A5FA"
          fontSize={size * 0.09}
          fontWeight={600}
          opacity={0.8}
          style={{ pointerEvents: 'none', fontFamily: 'system-ui, sans-serif' }}
        >
          {zone.commonPoolConfig.tokenName}
        </text>
      )}

      {/* Locked overlay */}
      {zone.isLocked && (
        <>
          <polygon
            points={hexPoints}
            fill="rgba(0,0,0,0.4)"
          />
          <text
            x={0}
            y={0}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={size * 0.4}
            style={{ pointerEvents: 'none' }}
          >
            🔒
          </text>
        </>
      )}

      {/* Trigger tile indicator */}
      {zone.revealedTrigger && (
        <g transform={`translate(${-size * 0.5}, ${size * 0.15})`}>
          <circle
            r={size * 0.08}
            fill={zone.revealedTrigger.type === 'trap' ? '#E74C3C' : '#F39C12'}
            stroke="#1a1a2e"
            strokeWidth={0.5}
          />
          <text
            x={0}
            y={0}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={size * 0.1}
            style={{ pointerEvents: 'none' }}
          >
            {zone.revealedTrigger.type === 'trap' ? '!' : '?'}
          </text>
        </g>
      )}
    </motion.g>
  );
});

HexTile.displayName = 'HexTile';
