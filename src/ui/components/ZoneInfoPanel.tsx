import React from 'react';
import { motion } from 'framer-motion';
import type { Zone, ResourceType, RoleId } from '../../core/models/types';
import { OBJECTIVE_ZONE_MAP, type ObjectiveId } from '../../core/models/constants';

interface ZoneInfoPanelProps {
  zone: Zone;
  players: { id: string; name: string; roleId: RoleId }[];
  adjacentZones: { id: string; name: string }[];
  onClose: () => void;
  onNavigate: (zoneId: string) => void;
}

const CONDITION_COLORS: Record<string, string> = {
  good: '#22C55E', fair: '#EAB308', poor: '#F97316', critical: '#EF4444', locked: '#6B7280',
};

const RESOURCE_ICONS: Record<ResourceType, string> = {
  budget: '\u{1F4B0}', influence: '\u{1F451}', volunteer: '\u{1F465}', material: '\u{1F9F1}', knowledge: '\u{1F4DA}',
};

const OBJECTIVE_LABELS: Record<ObjectiveId, string> = {
  safety: 'Safety', greenery: 'Greenery', access: 'Access', culture: 'Culture', revenue: 'Revenue', community: 'Community',
};

const ROLE_COLORS: Record<RoleId, string> = {
  administrator: '#C0392B', designer: '#2E86AB', citizen: '#27AE60', investor: '#E67E22', advocate: '#8E44AD',
};

export function ZoneInfoPanel({ zone, players, adjacentZones, onClose, onNavigate }: ZoneInfoPanelProps) {
  // Find which Büchi objectives this zone supports
  const supportedObjectives: ObjectiveId[] = [];
  for (const [objId, zoneIds] of Object.entries(OBJECTIVE_ZONE_MAP) as [ObjectiveId, string[]][]) {
    if (zoneIds.includes(zone.id)) supportedObjectives.push(objId);
  }

  const standeePlayerData = zone.playerStandees.map(pid => players.find(p => p.id === pid)).filter(Boolean);
  const conditionColor = CONDITION_COLORS[zone.condition] || '#6B7280';
  const resources = Object.entries(zone.resources).filter(([, v]) => v > 0) as [ResourceType, number][];

  return (
    <motion.div
      className="fixed top-0 right-0 h-full w-80 bg-stone-900/95 backdrop-blur-md border-l border-stone-700 z-40 overflow-y-auto shadow-2xl"
      initial={{ x: 320 }}
      animate={{ x: 0 }}
      exit={{ x: 320 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
    >
      {/* Header */}
      <div className="p-4 border-b border-stone-700" style={{ borderLeftColor: conditionColor, borderLeftWidth: 4 }}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-stone-100">{zone.name}</h3>
          <button className="w-8 h-8 rounded-full bg-stone-700 text-stone-400 hover:text-stone-200 hover:bg-stone-600 flex items-center justify-center text-sm" onClick={onClose}>
            {'\u2715'}
          </button>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs uppercase tracking-wider text-stone-500">{zone.zoneType}</span>
          {zone.poolType === 'common' && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-900/30 text-blue-400 border border-blue-700/50">Shared Pool</span>
          )}
        </div>
      </div>

      {/* Condition */}
      <div className="p-4 border-b border-stone-700/50">
        <h4 className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">Condition</h4>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full" style={{ backgroundColor: conditionColor }} />
          <span className="text-sm font-semibold capitalize" style={{ color: conditionColor }}>{zone.condition}</span>
          {zone.isLocked && <span className="text-xs text-stone-500 ml-2">(Locked)</span>}
        </div>
        <div className="flex items-center gap-3 mt-2 text-xs text-stone-400">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500" /> Progress: {zone.progressMarkers}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500" /> Problems: {zone.problemMarkers}
          </span>
        </div>
      </div>

      {/* Resources */}
      {resources.length > 0 && (
        <div className="p-4 border-b border-stone-700/50">
          <h4 className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">Resources</h4>
          <div className="flex flex-wrap gap-2">
            {resources.map(([type, count]) => (
              <div key={type} className="flex items-center gap-1.5 bg-stone-800 rounded-lg px-2.5 py-1.5">
                <span className="text-sm">{RESOURCE_ICONS[type]}</span>
                <span className="text-stone-300 text-xs capitalize">{type}</span>
                <span className="text-stone-100 text-xs font-bold">{count}</span>
              </div>
            ))}
          </div>
          {zone.commonPoolConfig && (
            <p className="text-xs text-blue-400 mt-2">
              Token: {zone.commonPoolConfig.tokenName} | Auto +{zone.commonPoolConfig.autoIncomePerRound}/round
              {!zone.investedThisRound && <span className="text-orange-400 ml-1">| Decay risk</span>}
            </p>
          )}
        </div>
      )}

      {/* Active Problems */}
      {zone.activeProblems.length > 0 && (
        <div className="p-4 border-b border-stone-700/50">
          <h4 className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">Active Problems</h4>
          <div className="space-y-1">
            {zone.activeProblems.map(prob => (
              <div key={prob} className="flex items-center gap-2 bg-red-900/20 rounded-lg px-3 py-1.5 border border-red-800/30">
                <span className="text-red-400 text-xs">{'\u26A0'}</span>
                <span className="text-red-300 text-xs capitalize">{prob.replace(/_/g, ' ')}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Büchi Objectives Supported */}
      <div className="p-4 border-b border-stone-700/50">
        <h4 className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">Supports Objectives</h4>
        <div className="flex flex-wrap gap-1.5">
          {supportedObjectives.map(obj => (
            <span key={obj} className={`px-2 py-1 rounded text-xs font-medium ${
              zone.condition === 'fair' || zone.condition === 'good'
                ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-700/50'
                : 'bg-stone-700/50 text-stone-500 border border-stone-600/50'
            }`}>
              {OBJECTIVE_LABELS[obj]} {zone.condition === 'fair' || zone.condition === 'good' ? '\u2713' : '\u2717'}
            </span>
          ))}
          {supportedObjectives.length === 0 && (
            <span className="text-stone-500 text-xs">No objectives linked</span>
          )}
        </div>
      </div>

      {/* Player Standees */}
      {standeePlayerData.length > 0 && (
        <div className="p-4 border-b border-stone-700/50">
          <h4 className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">Players Here</h4>
          <div className="flex flex-wrap gap-2">
            {standeePlayerData.map(p => p && (
              <div key={p.id} className="flex items-center gap-1.5 bg-stone-800 rounded-lg px-2.5 py-1.5">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: ROLE_COLORS[p.roleId] }} />
                <span className="text-stone-300 text-xs">{p.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Adjacent Zones */}
      <div className="p-4">
        <h4 className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">Adjacent Zones</h4>
        <div className="flex flex-wrap gap-1.5">
          {adjacentZones.map(adj => (
            <button key={adj.id} className="px-2.5 py-1 rounded-lg text-xs bg-stone-800 text-stone-400 hover:text-stone-200 hover:bg-stone-700 transition-colors border border-stone-700/50" onClick={() => onNavigate(adj.id)}>
              {adj.name}
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
