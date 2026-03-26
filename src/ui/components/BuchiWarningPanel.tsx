import React from 'react';
import { motion } from 'framer-motion';
import type { Player, RoleId } from '../../core/models/types';
import { BUCHI_OBJECTIVES, OBJECTIVE_WEIGHTS, ROLE_COLORS, type ObjectiveId } from '../../core/models/constants';
import { calculateObjectiveSatisfaction } from '../../core/engine/nashEngine';
import type { Zone } from '../../core/models/types';

interface BuchiWarningPanelProps {
  players: Player[];
  zones: Record<string, Zone>;
  buchiHistory: Record<string, Record<string, number>>;
}

const ROLE_NAMES: Record<RoleId, string> = {
  administrator: 'Admin', investor: 'Investor', designer: 'Designer', citizen: 'Citizen', advocate: 'Advocate',
};

const OBJECTIVE_LABELS: Record<ObjectiveId, string> = {
  safety: 'Safety', greenery: 'Greenery', access: 'Access', culture: 'Culture', revenue: 'Revenue', community: 'Community',
};

export function BuchiWarningPanel({ players, zones, buchiHistory }: BuchiWarningPanelProps) {
  const satObjectives = calculateObjectiveSatisfaction(zones);

  const warnings: { roleId: RoleId; playerName: string; objective: ObjectiveId; roundsOut: number }[] = [];

  for (const player of players) {
    const buchiObjs = BUCHI_OBJECTIVES[player.roleId] || [];
    const history = buchiHistory[player.roleId] || {};

    for (const obj of buchiObjs) {
      if (!satObjectives[obj]) {
        const roundsOut = (history[obj] || 0) + 1; // +1 because current round is also out
        if (roundsOut >= 1) {
          warnings.push({
            roleId: player.roleId,
            playerName: player.name,
            objective: obj,
            roundsOut,
          });
        }
      }
    }
  }

  if (warnings.length === 0) return null;

  return (
    <motion.div
      className="bg-orange-900/20 border border-orange-700/40 rounded-xl p-3"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-orange-400 text-sm">{'\u26A0\uFE0F'}</span>
        <h4 className="text-xs font-bold text-orange-400 uppercase tracking-wider">Buchi Objective Warnings</h4>
      </div>
      <div className="space-y-1.5">
        {warnings.map((w, i) => (
          <motion.div
            key={`${w.roleId}-${w.objective}`}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs ${
              w.roundsOut >= 2
                ? 'bg-red-900/30 border border-red-700/40'
                : 'bg-orange-900/20 border border-orange-700/30'
            }`}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: ROLE_COLORS[w.roleId] }} />
            <span className="font-semibold" style={{ color: ROLE_COLORS[w.roleId] }}>{ROLE_NAMES[w.roleId]}</span>
            <span className="text-stone-400">
              {OBJECTIVE_LABELS[w.objective]} unsatisfied for {w.roundsOut} round{w.roundsOut > 1 ? 's' : ''}
            </span>
            {w.roundsOut >= 2 ? (
              <span className="ml-auto text-red-400 font-bold animate-pulse">COMMITMENT CONSEQUENCE</span>
            ) : (
              <span className="ml-auto text-orange-400">Commitment consequence next season if unresolved</span>
            )}
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
