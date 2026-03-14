import React from 'react';
import { Zone, ZoneCondition, ResourceType } from '../../core/models/types';

interface ZoneTooltipProps {
  zone: Zone;
  x: number;
  y: number;
}

const CONDITION_LABELS: Record<ZoneCondition, { label: string; color: string }> = {
  good: { label: 'Good', color: '#27AE60' },
  fair: { label: 'Fair', color: '#F1C40F' },
  poor: { label: 'Poor', color: '#E67E22' },
  critical: { label: 'Critical', color: '#E74C3C' },
  locked: { label: 'Locked', color: '#95A5A6' },
};

const RESOURCE_NAMES: Record<ResourceType, string> = {
  budget: 'Budget',
  influence: 'Influence',
  volunteer: 'Volunteer',
  material: 'Material',
  knowledge: 'Knowledge',
};

const RESOURCE_ICONS: Record<ResourceType, string> = {
  budget: '$',
  influence: '*',
  volunteer: 'V',
  material: 'M',
  knowledge: 'K',
};

const ZONE_TYPE_LABELS: Record<string, string> = {
  recreation: 'Recreation',
  infrastructure: 'Infrastructure',
  commercial: 'Commercial',
  ecological: 'Ecological',
  cultural: 'Cultural',
  administrative: 'Administrative',
  development: 'Development',
  utility: 'Utility',
};

export const ZoneTooltip: React.FC<ZoneTooltipProps> = React.memo(({ zone, x, y }) => {
  const condition = zone.isLocked ? 'locked' : zone.condition;
  const conditionInfo = CONDITION_LABELS[condition];

  // Collect non-zero resources
  const resourceTypes: ResourceType[] = ['budget', 'influence', 'volunteer', 'material', 'knowledge'];
  const availableResources = resourceTypes.filter(t => zone.resources[t] > 0);

  // Position tooltip to avoid going off-screen
  const offsetX = 16;
  const offsetY = -8;

  return (
    <div
      className="absolute z-50 pointer-events-none"
      style={{
        left: x + offsetX,
        top: y + offsetY,
        transform: 'translateY(-100%)',
      }}
    >
      <div
        className="rounded-xl shadow-xl border border-white/20 min-w-[240px] max-w-[320px]"
        style={{
          background: 'linear-gradient(145deg, rgba(26,26,46,0.95), rgba(40,40,70,0.95))',
          backdropFilter: 'blur(12px)',
        }}
      >
        {/* Header */}
        <div className="px-4 pt-3 pb-2 border-b border-white/10">
          <h3 className="text-white font-bold text-sm leading-tight">{zone.name}</h3>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-white/50 text-xs uppercase tracking-wide">
              {ZONE_TYPE_LABELS[zone.zoneType] || zone.zoneType}
            </span>
            <span className="text-white/30">|</span>
            <span
              className="text-xs font-semibold px-2 py-0.5 rounded-full"
              style={{
                backgroundColor: conditionInfo.color + '30',
                color: conditionInfo.color,
              }}
            >
              {conditionInfo.label}
            </span>
          </div>
        </div>

        {/* Description */}
        <div className="px-4 py-2 border-b border-white/10">
          <p className="text-white/70 text-xs leading-relaxed">{zone.description}</p>
        </div>

        {/* Resources */}
        {availableResources.length > 0 && (
          <div className="px-4 py-2 border-b border-white/10">
            <div className="text-white/40 text-xs uppercase tracking-wide mb-1">Resources</div>
            <div className="flex flex-wrap gap-2">
              {availableResources.map(type => (
                <div
                  key={type}
                  className="flex items-center gap-1 bg-white/10 rounded-md px-2 py-0.5"
                >
                  <span className="text-xs font-mono font-bold" style={{ color: getResourceColor(type) }}>
                    {RESOURCE_ICONS[type]}
                  </span>
                  <span className="text-white/80 text-xs">
                    {zone.resources[type]} {RESOURCE_NAMES[type]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Active Problems */}
        {zone.activeProblems.length > 0 && (
          <div className="px-4 py-2 border-b border-white/10">
            <div className="text-white/40 text-xs uppercase tracking-wide mb-1">Active Problems</div>
            <div className="flex flex-col gap-1">
              {zone.activeProblems.map(problem => (
                <div key={problem} className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
                  <span className="text-red-300 text-xs">
                    {formatProblemName(problem)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Markers */}
        {(zone.progressMarkers > 0 || zone.problemMarkers > 0) && (
          <div className="px-4 py-2">
            <div className="flex gap-4">
              {zone.progressMarkers > 0 && (
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-green-400" />
                  <span className="text-green-300 text-xs">
                    {zone.progressMarkers} Progress
                  </span>
                </div>
              )}
              {zone.problemMarkers > 0 && (
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-red-400" />
                  <span className="text-red-300 text-xs">
                    {zone.problemMarkers} Problem{zone.problemMarkers !== 1 ? 's' : ''}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Revealed trigger */}
        {zone.revealedTrigger && (
          <div className="px-4 py-2 border-t border-white/10">
            <div className="flex items-center gap-1.5">
              <span className="text-yellow-400 text-xs font-bold">
                {zone.revealedTrigger.type === 'trap' ? '! Trap' :
                 zone.revealedTrigger.type === 'secret_door' ? '? Discovery' :
                 '~ Cascade'}
              </span>
            </div>
            <p className="text-yellow-200/70 text-xs mt-0.5">{zone.revealedTrigger.title}</p>
          </div>
        )}
      </div>
    </div>
  );
});

ZoneTooltip.displayName = 'ZoneTooltip';

function getResourceColor(type: ResourceType): string {
  const colors: Record<ResourceType, string> = {
    budget: '#F1C40F',
    influence: '#8E44AD',
    volunteer: '#27AE60',
    material: '#95A5A6',
    knowledge: '#3498DB',
  };
  return colors[type];
}

function formatProblemName(problem: string): string {
  return problem
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
