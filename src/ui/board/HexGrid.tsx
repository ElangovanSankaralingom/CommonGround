import React, { useMemo, useState, useCallback } from 'react';
import { Zone, ZoneCondition } from '../../core/models/types';
import { HexTile } from './HexTile';
import { ZoneTooltip } from './ZoneTooltip';

export interface HexGridProps {
  zones: Zone[];
  selectedZoneId: string | null;
  onZoneClick: (zoneId: string) => void;
  playerStandees: Record<string, { roleId: string; color: string; icon: string }[]>;
}

// Hex math for flat-top hexagons
const HEX_SIZE = 60;

function axialToPixel(q: number, r: number): { x: number; y: number } {
  const x = HEX_SIZE * (3 / 2 * q);
  const y = HEX_SIZE * (Math.sqrt(3) / 2 * q + Math.sqrt(3) * r);
  return { x, y };
}

// SVG pattern definitions for colorblind accessibility
const HatchPatterns: React.FC = React.memo(() => (
  <defs>
    {/* Good: diagonal lines (/) */}
    <pattern id="pattern-good" patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(45)">
      <line x1="0" y1="0" x2="0" y2="8" stroke="#1a5e30" strokeWidth="1.5" />
    </pattern>

    {/* Fair: horizontal lines */}
    <pattern id="pattern-fair" patternUnits="userSpaceOnUse" width="8" height="8">
      <line x1="0" y1="4" x2="8" y2="4" stroke="#8a6e00" strokeWidth="1.5" />
    </pattern>

    {/* Poor: crosshatch */}
    <pattern id="pattern-poor" patternUnits="userSpaceOnUse" width="8" height="8">
      <line x1="0" y1="0" x2="8" y2="8" stroke="#8b4513" strokeWidth="1" />
      <line x1="8" y1="0" x2="0" y2="8" stroke="#8b4513" strokeWidth="1" />
    </pattern>

    {/* Critical: dense dots */}
    <pattern id="pattern-critical" patternUnits="userSpaceOnUse" width="6" height="6">
      <circle cx="3" cy="3" r="1.5" fill="#8b0000" />
    </pattern>

    {/* Locked: vertical lines */}
    <pattern id="pattern-locked" patternUnits="userSpaceOnUse" width="8" height="8">
      <line x1="4" y1="0" x2="4" y2="8" stroke="#555" strokeWidth="2" />
    </pattern>

    {/* Drop shadow filter */}
    <filter id="hex-shadow" x="-10%" y="-10%" width="130%" height="130%">
      <feDropShadow dx="1" dy="2" stdDeviation="2" floodOpacity="0.2" />
    </filter>

    {/* Glow filter for selected tiles */}
    <filter id="hex-glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="4" result="blur" />
      <feFlood floodColor="#FFFFFF" floodOpacity="0.5" result="color" />
      <feComposite in="color" in2="blur" operator="in" result="glow" />
      <feMerge>
        <feMergeNode in="glow" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  </defs>
));
HatchPatterns.displayName = 'HatchPatterns';

// Condition legend
const CONDITION_LEGEND: { condition: ZoneCondition; color: string; label: string }[] = [
  { condition: 'good', color: '#27AE60', label: 'Good' },
  { condition: 'fair', color: '#F1C40F', label: 'Fair' },
  { condition: 'poor', color: '#E67E22', label: 'Poor' },
  { condition: 'critical', color: '#E74C3C', label: 'Critical' },
  { condition: 'locked', color: '#95A5A6', label: 'Locked' },
];

export const HexGrid: React.FC<HexGridProps> = React.memo(({
  zones,
  selectedZoneId,
  onZoneClick,
  playerStandees,
}) => {
  const [hoveredZone, setHoveredZone] = useState<Zone | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Calculate pixel positions for all zones
  const zonePositions = useMemo(() => {
    return zones.map(zone => ({
      zone,
      ...axialToPixel(zone.gridPosition.q, zone.gridPosition.r),
    }));
  }, [zones]);

  // Calculate viewBox bounds
  const viewBox = useMemo(() => {
    if (zonePositions.length === 0) return '0 0 100 100';

    const padding = HEX_SIZE * 1.5;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    for (const pos of zonePositions) {
      minX = Math.min(minX, pos.x);
      minY = Math.min(minY, pos.y);
      maxX = Math.max(maxX, pos.x);
      maxY = Math.max(maxY, pos.y);
    }

    return `${minX - padding} ${minY - padding} ${maxX - minX + padding * 2} ${maxY - minY + padding * 2}`;
  }, [zonePositions]);

  const handleMouseEnter = useCallback((zone: Zone, event: React.MouseEvent) => {
    setHoveredZone(zone);
    const rect = (event.currentTarget as Element).closest('svg')?.getBoundingClientRect();
    if (rect) {
      setTooltipPos({
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      });
    }
  }, []);

  const handleMouseMove = useCallback((event: React.MouseEvent) => {
    const rect = (event.currentTarget as Element).closest('svg')?.getBoundingClientRect();
    if (rect) {
      setTooltipPos({
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      });
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHoveredZone(null);
  }, []);

  return (
    <div className="relative w-full h-full min-h-[400px] flex items-center justify-center">
      {/* Wood-grain background */}
      <div
        className="absolute inset-0 rounded-2xl overflow-hidden"
        style={{
          background: `
            linear-gradient(135deg, #8B6914 0%, #A0762C 20%, #8B6914 40%, #9E7B2F 60%, #7A5C10 80%, #8B6914 100%)
          `,
          boxShadow: 'inset 0 2px 20px rgba(0,0,0,0.3), 0 8px 32px rgba(0,0,0,0.2)',
        }}
      >
        {/* Wood grain texture lines */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `
              repeating-linear-gradient(
                90deg,
                transparent,
                transparent 10px,
                rgba(0,0,0,0.08) 10px,
                rgba(0,0,0,0.08) 11px
              ),
              repeating-linear-gradient(
                85deg,
                transparent,
                transparent 20px,
                rgba(0,0,0,0.05) 20px,
                rgba(0,0,0,0.05) 21px
              )
            `,
          }}
        />
      </div>

      {/* SVG board */}
      <svg
        className="relative w-full h-full"
        viewBox={viewBox}
        preserveAspectRatio="xMidYMid meet"
        style={{ maxHeight: '80vh' }}
      >
        <HatchPatterns />

        {/* Render hex tiles */}
        {zonePositions.map(({ zone, x, y }) => (
          <g
            key={zone.id}
            onMouseEnter={(e) => handleMouseEnter(zone, e)}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            filter="url(#hex-shadow)"
          >
            <HexTile
              zone={zone}
              x={x}
              y={y}
              size={HEX_SIZE}
              isSelected={selectedZoneId === zone.id}
              onClick={() => onZoneClick(zone.id)}
              standees={playerStandees[zone.id] || []}
            />
          </g>
        ))}
      </svg>

      {/* Tooltip */}
      {hoveredZone && (
        <ZoneTooltip
          zone={hoveredZone}
          x={tooltipPos.x}
          y={tooltipPos.y}
        />
      )}

      {/* Legend */}
      <div className="absolute bottom-3 right-3 flex gap-2 bg-black/40 backdrop-blur-sm rounded-lg px-3 py-2">
        {CONDITION_LEGEND.map(({ condition, color, label }) => (
          <div key={condition} className="flex items-center gap-1">
            <div
              className="w-3 h-3 rounded-sm border border-white/30"
              style={{ backgroundColor: color }}
            />
            <span className="text-white/80 text-xs font-medium">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
});

HexGrid.displayName = 'HexGrid';
