import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../../store';
import type { Player, RoleId, ResourceType } from '../../core/models/types';
import { ROLE_COLORS } from '../../core/models/constants';
import { STARTING_TOKENS } from '../../core/content/featureTiles';
import { sounds } from '../../utils/sounds';

// ─── Resource metadata ─────────────────────────────────────────

const RES_META: Record<ResourceType, { label: string; icon: string; color: string }> = {
  budget:    { label: 'Budget',    icon: '\u{1F4B0}', color: '#185FA5' },
  knowledge: { label: 'Knowledge', icon: '\u{1F4DA}', color: '#534AB7' },
  volunteer: { label: 'Volunteer', icon: '\u{1F465}', color: '#3B6D11' },
  material:  { label: 'Material',  icon: '\u{1F9F1}', color: '#BA7517' },
  influence: { label: 'Influence', icon: '\u{1F451}', color: '#D85A30' },
};

const RES_TYPES: ResourceType[] = ['budget', 'knowledge', 'volunteer', 'material', 'influence'];

interface PaymentDayProps {
  onContinue: () => void;
}

export default function PaymentDay({ onContinue }: PaymentDayProps) {
  const session = useGameStore(s => s.session);
  const playerEffectiveness = useGameStore(s => s.playerEffectiveness);

  const players = useMemo(() => session ? Object.values(session.players) : [], [session]);
  const round = session?.currentRound ?? 1;

  // Build per-player resource data
  const playerCards = useMemo(() => {
    return players.map(p => {
      const eff = playerEffectiveness?.[p.id] ?? {};
      const tokens = p.resources;
      const rows = RES_TYPES.map(rt => {
        const pct = eff[rt] ?? 50;
        const count = tokens[rt] ?? 0;
        const ptsEach = Math.round((pct / 100) * 5 * 100) / 100;
        return { type: rt, ...RES_META[rt], pct, count, ptsEach };
      });
      const strongest = rows.reduce((best, r) => r.pct > best.pct ? r : best, rows[0]);
      const weakest = rows.reduce((worst, r) => r.pct < worst.pct ? r : worst, rows[0]);
      const totalTokens = rows.reduce((s, r) => s + r.count, 0);
      return { player: p, rows, strongest, weakest, totalTokens };
    });
  }, [players, playerEffectiveness]);

  // Comparison insight: Admin vs Citizen budget
  const comparisonInsight = useMemo(() => {
    const admin = playerCards.find(c => c.player.roleId === 'administrator');
    const citizen = playerCards.find(c => c.player.roleId === 'citizen');
    if (!admin || !citizen) return null;
    const adminBudget = admin.rows.find(r => r.type === 'budget');
    const citizenBudget = citizen.rows.find(r => r.type === 'budget');
    if (!adminBudget || !citizenBudget || citizenBudget.ptsEach === 0) return null;
    const ratio = (adminBudget.ptsEach / citizenBudget.ptsEach).toFixed(1);
    return `The Administrator\u2019s Budget token is worth ${adminBudget.ptsEach} pts. The Citizen\u2019s Budget token is worth ${citizenBudget.ptsEach} pts. Same token, ${ratio}\u00D7 difference. This is the power asymmetry the game studies.`;
  }, [playerCards]);

  if (!session) return null;

  return (
    <div className="w-full min-h-screen bg-gradient-to-b from-stone-900 to-stone-950 text-white p-6 overflow-y-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <h1 className="text-3xl font-serif font-bold text-amber-400">
          Payment Day \u2014 Season {round}
        </h1>
        <p className="text-stone-400 mt-1">Review your resources before the season begins</p>
      </motion.div>

      {/* Player cards grid */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {playerCards.map((card, idx) => (
          <motion.div
            key={card.player.id}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.15 }}
            className="bg-stone-800/60 rounded-xl border border-stone-700/50 p-4"
          >
            {/* Player header */}
            <div className="flex items-center gap-3 mb-3 pb-3 border-b border-stone-700/30">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
                style={{ backgroundColor: ROLE_COLORS[card.player.roleId] }}
              >
                {card.player.name.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="text-white font-semibold text-sm">{card.player.name}</div>
                <div className="text-xs capitalize" style={{ color: ROLE_COLORS[card.player.roleId] }}>
                  {card.player.roleId}
                </div>
              </div>
              <div className="ml-auto text-xs text-stone-500">{card.totalTokens} tokens</div>
            </div>

            {/* Resource rows */}
            <div className="space-y-2">
              {card.rows.map(row => {
                const isStrongest = row.type === card.strongest.type;
                const isWeakest = row.type === card.weakest.type;
                return (
                  <div key={row.type} className={`flex items-center gap-2 text-xs ${isWeakest ? 'opacity-50' : ''}`}>
                    {/* Icon + label */}
                    <span className="w-5 text-center">{row.icon}</span>
                    <span className="w-16 text-stone-300 truncate">{row.label}</span>

                    {/* Token dots */}
                    <div className="flex gap-0.5 w-16">
                      {Array.from({ length: row.count }).map((_, i) => (
                        <div
                          key={i}
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: row.color }}
                        />
                      ))}
                    </div>

                    {/* Effectiveness bar */}
                    <div className="flex-1 h-3 bg-stone-700 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${row.pct}%` }}
                        transition={{ delay: idx * 0.15 + 0.3, duration: 0.6 }}
                        className="h-full rounded-full"
                        style={{ backgroundColor: row.color }}
                      />
                    </div>

                    {/* Percentage + points */}
                    <span className="w-8 text-right text-stone-400">{row.pct}%</span>
                    <span className="w-14 text-right font-mono text-stone-300">{row.ptsEach} pts</span>

                    {/* Strength badge */}
                    {isStrongest && (
                      <span className="px-1.5 py-0.5 bg-emerald-900/50 text-emerald-400 text-[9px] font-bold rounded uppercase">
                        Strength
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Insight */}
            <div className="mt-3 pt-3 border-t border-stone-700/30">
              <p className="text-[10px] text-stone-500 leading-relaxed italic">
                Your {card.strongest.label} produces {card.strongest.ptsEach} pts per token.
                Your {card.weakest.label} produces {card.weakest.ptsEach} pts.
                That&apos;s a {card.strongest.ptsEach > 0 && card.weakest.ptsEach > 0
                  ? (card.strongest.ptsEach / card.weakest.ptsEach).toFixed(1)
                  : '\u221E'}\u00D7 difference.
                Trading weak tokens to strong players makes everyone more effective.
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Comparison insight */}
      {comparisonInsight && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="max-w-4xl mx-auto bg-amber-900/20 border border-amber-700/30 rounded-xl p-4 mb-8 text-center"
        >
          <p className="text-amber-300/80 text-sm italic">{comparisonInsight}</p>
        </motion.div>
      )}

      {/* Continue button */}
      <div className="text-center pb-8">
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2 }}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => {
            sounds.playButtonClick();
            onContinue();
          }}
          className="px-10 py-3 rounded-xl text-lg font-bold bg-gradient-to-r from-amber-500 to-amber-600 text-stone-900 shadow-lg shadow-amber-500/25 hover:from-amber-400 hover:to-amber-500 transition-colors"
        >
          Continue to Mission Briefing {'\u2192'}
        </motion.button>
      </div>
    </div>
  );
}
