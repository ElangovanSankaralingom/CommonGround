import React from 'react';
import { motion } from 'framer-motion';
import type {
  Player,
  RoleId,
  AbilityScores,
  ResourcePool,
  ResourceType,
  SkillId,
} from '../../core/models/types';
import { getAbilityModifier } from '../../core/models/types';

// ── Constants ──────────────────────────────────────────────────

const ROLE_COLORS: Record<RoleId, string> = {
  administrator: '#C0392B',
  designer: '#2E86AB',
  citizen: '#27AE60',
  investor: '#E67E22',
  advocate: '#8E44AD',
};

const ROLE_NAMES: Record<RoleId, string> = {
  administrator: 'City Administrator',
  designer: 'Urban Designer',
  citizen: 'Community Organizer',
  investor: 'Private Investor',
  advocate: 'Environmental Advocate',
};

const ROLE_ICONS: Record<RoleId, string> = {
  administrator: '\u{1F3DB}',
  designer: '\u{1F4D0}',
  citizen: '\u{1F91D}',
  investor: '\u{1F4B0}',
  advocate: '\u{1F33F}',
};

const ABILITY_LABELS: Record<keyof AbilityScores, string> = {
  authority: 'Authority',
  resourcefulness: 'Resourcefulness',
  communityTrust: 'Community Trust',
  technicalKnowledge: 'Technical Knowledge',
  politicalLeverage: 'Political Leverage',
  adaptability: 'Adaptability',
};

const ABILITY_SHORT: Record<keyof AbilityScores, string> = {
  authority: 'AUT',
  resourcefulness: 'RES',
  communityTrust: 'CTR',
  technicalKnowledge: 'TKN',
  politicalLeverage: 'PLV',
  adaptability: 'ADP',
};

const RESOURCE_LABELS: Record<keyof ResourcePool, string> = {
  budget: 'Budget',
  influence: 'Influence',
  volunteer: 'Volunteer',
  material: 'Material',
  knowledge: 'Knowledge',
};

const RESOURCE_COLORS: Record<ResourceType, string> = {
  budget: '#F59E0B',
  influence: '#8B5CF6',
  volunteer: '#10B981',
  material: '#6B7280',
  knowledge: '#3B82F6',
};

const RESOURCE_ICONS: Record<ResourceType, string> = {
  budget: '\u{1F4B0}',
  influence: '\u{1F451}',
  volunteer: '\u{1F465}',
  material: '\u{1F9F1}',
  knowledge: '\u{1F4DA}',
};

const SKILL_LABELS: Record<SkillId, string> = {
  negotiation: 'Negotiation',
  budgeting: 'Budgeting',
  designThinking: 'Design Thinking',
  publicSpeaking: 'Public Speaking',
  regulatoryNavigation: 'Regulatory Navigation',
  environmentalAssessment: 'Environmental Assessment',
  coalitionBuilding: 'Alliance Building',
  crisisManagement: 'Crisis Management',
};

const SKILL_ABILITY_MAP: Record<SkillId, keyof AbilityScores> = {
  negotiation: 'politicalLeverage',
  budgeting: 'resourcefulness',
  designThinking: 'technicalKnowledge',
  publicSpeaking: 'communityTrust',
  regulatoryNavigation: 'authority',
  environmentalAssessment: 'technicalKnowledge',
  coalitionBuilding: 'communityTrust',
  crisisManagement: 'adaptability',
};

const ALL_SKILLS: SkillId[] = [
  'negotiation',
  'budgeting',
  'designThinking',
  'publicSpeaking',
  'regulatoryNavigation',
  'environmentalAssessment',
  'coalitionBuilding',
  'crisisManagement',
];

// ── Helpers ────────────────────────────────────────────────────

function cpForLevel(level: number): number {
  const table = [0, 0, 10, 25, 50, 80];
  return table[level] || 80;
}

// ── Sub-components ─────────────────────────────────────────────

function AbilityHexagon({
  abilities,
  color,
}: {
  abilities: AbilityScores;
  color: string;
}) {
  const abilityKeys = Object.keys(abilities) as (keyof AbilityScores)[];
  const cx = 120;
  const cy = 120;
  const maxRadius = 90;

  // Calculate polygon points
  const points = abilityKeys.map((key, i) => {
    const angle = (Math.PI * 2 * i) / abilityKeys.length - Math.PI / 2;
    const value = abilities[key];
    const normalizedRadius = (value / 20) * maxRadius;
    const x = cx + normalizedRadius * Math.cos(angle);
    const y = cy + normalizedRadius * Math.sin(angle);
    return { x, y, key, value, angle };
  });

  const polygonPoints = points.map((p) => `${p.x},${p.y}`).join(' ');

  // Background grid rings
  const rings = [0.25, 0.5, 0.75, 1.0];

  return (
    <div className="relative">
      <svg width="240" height="240" viewBox="0 0 240 240">
        {/* Grid rings */}
        {rings.map((r) => {
          const ringPoints = abilityKeys
            .map((_, i) => {
              const angle = (Math.PI * 2 * i) / abilityKeys.length - Math.PI / 2;
              const radius = maxRadius * r;
              return `${cx + radius * Math.cos(angle)},${cy + radius * Math.sin(angle)}`;
            })
            .join(' ');
          return (
            <polygon
              key={r}
              points={ringPoints}
              fill="none"
              stroke="rgba(120,113,108,0.2)"
              strokeWidth="0.5"
            />
          );
        })}

        {/* Radial lines */}
        {abilityKeys.map((_, i) => {
          const angle = (Math.PI * 2 * i) / abilityKeys.length - Math.PI / 2;
          return (
            <line
              key={i}
              x1={cx}
              y1={cy}
              x2={cx + maxRadius * Math.cos(angle)}
              y2={cy + maxRadius * Math.sin(angle)}
              stroke="rgba(120,113,108,0.15)"
              strokeWidth="0.5"
            />
          );
        })}

        {/* Filled polygon */}
        <motion.polygon
          points={polygonPoints}
          fill={`${color}25`}
          stroke={color}
          strokeWidth="2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
        />

        {/* Data points and labels */}
        {points.map((p) => (
          <g key={p.key}>
            <motion.circle
              cx={p.x}
              cy={p.y}
              r="4"
              fill={color}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: 'spring' }}
            />
            <text
              x={cx + (maxRadius + 18) * Math.cos(p.angle)}
              y={cy + (maxRadius + 18) * Math.sin(p.angle)}
              textAnchor="middle"
              dominantBaseline="middle"
              className="text-[9px] font-bold"
              fill="#A8A29E"
            >
              {ABILITY_SHORT[p.key]}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────

interface CharacterSheetProps {
  player: Player;
  uniqueAbilityName?: string;
  uniqueAbilityDescription?: string;
  uniqueAbilityUses?: number;
  compact?: boolean;
}

export default function CharacterSheet({
  player,
  uniqueAbilityName,
  uniqueAbilityDescription,
  uniqueAbilityUses,
  compact = false,
}: CharacterSheetProps) {
  const roleColor = ROLE_COLORS[player.roleId];
  const roleName = ROLE_NAMES[player.roleId];
  const roleIcon = ROLE_ICONS[player.roleId];
  const nextLevelCP = cpForLevel(player.level + 1);
  const currentLevelCP = cpForLevel(player.level);
  const cpProgress =
    nextLevelCP > currentLevelCP
      ? ((player.collaborationPoints - currentLevelCP) / (nextLevelCP - currentLevelCP)) * 100
      : 100;

  return (
    <motion.div
      className={`bg-gradient-to-b from-stone-800 to-stone-850 rounded-2xl border-2 shadow-xl overflow-hidden ${
        compact ? 'max-w-sm' : 'max-w-2xl'
      }`}
      style={{
        borderColor: `${roleColor}66`,
        boxShadow: `0 0 30px ${roleColor}15`,
      }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header - Parchment style */}
      <div
        className="relative px-6 py-5"
        style={{
          background: `linear-gradient(135deg, ${roleColor}20 0%, transparent 60%)`,
          borderBottom: `2px solid ${roleColor}33`,
        }}
      >
        {/* Decorative corner flourishes */}
        <div className="absolute top-2 left-2 w-4 h-4 border-l-2 border-t-2" style={{ borderColor: `${roleColor}33` }} />
        <div className="absolute top-2 right-2 w-4 h-4 border-r-2 border-t-2" style={{ borderColor: `${roleColor}33` }} />

        <div className="flex items-center gap-4">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center text-2xl border-2 shadow-lg"
            style={{ backgroundColor: roleColor, borderColor: `${roleColor}88` }}
          >
            {roleIcon}
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-serif font-bold text-stone-100">{player.name}</h2>
            <p className="text-sm font-semibold" style={{ color: roleColor }}>
              {roleName}
            </p>
          </div>
          <div className="text-right">
            <div className="text-xs text-stone-500 uppercase tracking-wider">Level</div>
            <div className="text-2xl font-bold text-amber-300">{player.level}</div>
          </div>
        </div>

        {/* XP Bar */}
        <div className="mt-3">
          <div className="flex items-center justify-between text-[10px] text-stone-500 mb-1">
            <span>CP: {player.collaborationPoints}</span>
            <span>Next: {nextLevelCP}</span>
          </div>
          <div className="w-full h-2 bg-stone-700 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-amber-400"
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, cpProgress)}%` }}
              transition={{ duration: 1, delay: 0.3 }}
            />
          </div>
        </div>
      </div>

      <div className={`p-6 ${compact ? 'space-y-4' : 'grid grid-cols-2 gap-6'}`}>
        {/* Left column / top in compact */}
        <div className="space-y-4">
          {/* Ability Scores */}
          <div>
            <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <span className="w-4 h-px bg-stone-600" />
              Ability Scores
              <span className="flex-1 h-px bg-stone-600" />
            </h3>

            {compact ? (
              // Compact: list view
              <div className="space-y-2">
                {(Object.entries(player.abilities) as [keyof AbilityScores, number][]).map(
                  ([key, value]) => {
                    const mod = getAbilityModifier(value);
                    return (
                      <div key={key} className="flex items-center justify-between">
                        <span className="text-stone-400 text-xs">{ABILITY_LABELS[key]}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-stone-700 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${(value / 20) * 100}%`,
                                backgroundColor: roleColor,
                              }}
                            />
                          </div>
                          <span className="text-stone-200 font-bold text-xs w-5 text-right">
                            {value}
                          </span>
                          <span className="text-stone-500 text-[10px] w-6">
                            ({mod >= 0 ? '+' : ''}{mod})
                          </span>
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            ) : (
              // Full: hexagonal display
              <div className="flex justify-center">
                <AbilityHexagon abilities={player.abilities} color={roleColor} />
              </div>
            )}

            {/* Ability scores table (non-compact) */}
            {!compact && (
              <div className="grid grid-cols-3 gap-2 mt-2">
                {(Object.entries(player.abilities) as [keyof AbilityScores, number][]).map(
                  ([key, value]) => {
                    const mod = getAbilityModifier(value);
                    return (
                      <div
                        key={key}
                        className="bg-stone-700/30 rounded-lg p-2 text-center border border-stone-600/20"
                      >
                        <p className="text-[10px] text-stone-500 uppercase tracking-wider">
                          {ABILITY_SHORT[key]}
                        </p>
                        <p className="text-lg font-bold text-stone-200">{value}</p>
                        <p
                          className="text-xs font-semibold"
                          style={{ color: mod >= 0 ? '#10B981' : '#EF4444' }}
                        >
                          {mod >= 0 ? '+' : ''}{mod}
                        </p>
                      </div>
                    );
                  }
                )}
              </div>
            )}
          </div>

          {/* Resources */}
          <div>
            <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <span className="w-4 h-px bg-stone-600" />
              Resources
              <span className="flex-1 h-px bg-stone-600" />
            </h3>
            <div className={`grid ${compact ? 'grid-cols-5' : 'grid-cols-5'} gap-2`}>
              {(Object.entries(player.resources) as [ResourceType, number][]).map(([res, amt]) => (
                <motion.div
                  key={res}
                  className="bg-stone-700/30 rounded-lg p-2 text-center border border-stone-600/20"
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.1 }}
                >
                  <div className="text-lg mb-0.5">{RESOURCE_ICONS[res]}</div>
                  <p className="text-[10px] text-stone-500 capitalize">{res}</p>
                  <p className="text-sm font-bold text-stone-200">{amt}</p>
                  {/* Token dots */}
                  <div className="flex flex-wrap justify-center gap-0.5 mt-1">
                    {Array.from({ length: Math.min(amt, 10) }).map((_, t) => (
                      <div
                        key={t}
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: RESOURCE_COLORS[res] }}
                      />
                    ))}
                    {amt > 10 && (
                      <span className="text-[8px] text-stone-500">+{amt - 10}</span>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* Right column / bottom in compact */}
        <div className="space-y-4">
          {/* Skills */}
          <div>
            <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <span className="w-4 h-px bg-stone-600" />
              Skills
              <span className="flex-1 h-px bg-stone-600" />
            </h3>
            <div className="space-y-1.5">
              {ALL_SKILLS.map((skillId) => {
                const isProficient = player.proficientSkills.includes(skillId);
                const abilityKey = SKILL_ABILITY_MAP[skillId];
                const abilityMod = getAbilityModifier(player.abilities[abilityKey]);
                const bonus = isProficient ? abilityMod + player.proficiencyBonus : abilityMod;

                return (
                  <div
                    key={skillId}
                    className={`flex items-center justify-between rounded-lg px-3 py-1.5 text-xs transition-all ${
                      isProficient
                        ? 'bg-stone-600/40 border border-stone-500/30'
                        : 'bg-stone-700/20'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {isProficient && (
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: roleColor }}
                        />
                      )}
                      <span
                        className={`${
                          isProficient ? 'text-stone-200 font-semibold' : 'text-stone-500'
                        }`}
                      >
                        {SKILL_LABELS[skillId]}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-stone-600">
                        ({ABILITY_SHORT[abilityKey]})
                      </span>
                      <span
                        className={`font-bold ${
                          isProficient ? 'text-stone-200' : 'text-stone-500'
                        }`}
                      >
                        {bonus >= 0 ? '+' : ''}{bonus}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-2 text-[10px] text-stone-600 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: roleColor }} />
              <span>Proficiency Bonus: +{player.proficiencyBonus}</span>
            </div>
          </div>

          {/* Goals */}
          <div>
            <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <span className="w-4 h-px bg-stone-600" />
              Goals
              <span className="flex-1 h-px bg-stone-600" />
            </h3>
            <div className="space-y-2">
              {[
                { type: 'Character', goal: player.goals.character, color: '#3B82F6' },
                { type: 'Survival', goal: player.goals.survival, color: '#EF4444' },
                { type: 'Mission', goal: player.goals.mission, color: '#8B5CF6' },
              ].map(({ type, goal, color }) => {
                const satisfiedCount = goal.subGoals.filter((sg) => sg.satisfied).length;
                const totalSubGoals = goal.subGoals.length;
                const progress = totalSubGoals > 0 ? (satisfiedCount / totalSubGoals) * 100 : 0;

                return (
                  <div
                    key={type}
                    className="bg-stone-700/30 rounded-lg p-3 border border-stone-600/20"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold" style={{ color }}>
                        {type}
                      </span>
                      {totalSubGoals > 0 && (
                        <span className="text-[10px] text-stone-500">
                          {satisfiedCount}/{totalSubGoals}
                        </span>
                      )}
                    </div>
                    <p className="text-stone-400 text-xs">{goal.description}</p>
                    {totalSubGoals > 0 && (
                      <div className="w-full h-1.5 bg-stone-700 rounded-full mt-2 overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${progress}%`, backgroundColor: color }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Unique Ability */}
          {(uniqueAbilityName || player.uniqueAbilityUsesRemaining > 0) && (
            <div>
              <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <span className="w-4 h-px bg-stone-600" />
                Unique Ability
                <span className="flex-1 h-px bg-stone-600" />
              </h3>
              <div
                className="rounded-lg p-3 border"
                style={{
                  backgroundColor: `${roleColor}11`,
                  borderColor: `${roleColor}33`,
                }}
              >
                <div className="flex items-center justify-between mb-1">
                  <p className="font-semibold text-sm" style={{ color: roleColor }}>
                    {uniqueAbilityName || 'Special Ability'}
                  </p>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: uniqueAbilityUses || player.uniqueAbilityUsesRemaining }).map(
                      (_, i) => (
                        <div
                          key={i}
                          className={`w-3 h-3 rounded-full border ${
                            i < player.uniqueAbilityUsesRemaining
                              ? ''
                              : 'opacity-30'
                          }`}
                          style={{
                            backgroundColor:
                              i < player.uniqueAbilityUsesRemaining ? roleColor : 'transparent',
                            borderColor: roleColor,
                          }}
                        />
                      )
                    )}
                  </div>
                </div>
                {uniqueAbilityDescription && (
                  <p className="text-stone-400 text-xs">{uniqueAbilityDescription}</p>
                )}
              </div>
            </div>
          )}

          {/* Status Effects */}
          {player.statusEffects.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <span className="w-4 h-px bg-stone-600" />
                Status Effects
                <span className="flex-1 h-px bg-stone-600" />
              </h3>
              <div className="space-y-1.5">
                {player.statusEffects.map((effect) => (
                  <div
                    key={effect.id}
                    className="bg-purple-900/20 rounded-lg px-3 py-2 border border-purple-700/20"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-purple-300 text-xs font-semibold">{effect.name}</span>
                      <span className="text-purple-500/60 text-[10px]">
                        {effect.duration} round{effect.duration !== 1 ? 's' : ''} left
                      </span>
                    </div>
                    <p className="text-stone-500 text-[10px] mt-0.5">{effect.description}</p>
                    {/* Show modifiers */}
                    <div className="flex flex-wrap gap-1 mt-1">
                      {Object.entries(effect.abilityModifiers).map(([ability, mod]) => (
                        <span
                          key={ability}
                          className={`text-[9px] px-1.5 py-0.5 rounded ${
                            (mod as number) >= 0
                              ? 'bg-emerald-900/30 text-emerald-400'
                              : 'bg-red-900/30 text-red-400'
                          }`}
                        >
                          {ABILITY_SHORT[ability as keyof AbilityScores]}{' '}
                          {(mod as number) >= 0 ? '+' : ''}
                          {mod as number}
                        </span>
                      ))}
                      {Object.entries(effect.resourceModifiers).map(([res, mod]) => (
                        <span
                          key={res}
                          className={`text-[9px] px-1.5 py-0.5 rounded ${
                            (mod as number) >= 0
                              ? 'bg-emerald-900/30 text-emerald-400'
                              : 'bg-red-900/30 text-red-400'
                          }`}
                        >
                          {res} {(mod as number) >= 0 ? '+' : ''}
                          {mod as number}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer decorative bar */}
      <div
        className="h-1"
        style={{
          background: `linear-gradient(90deg, transparent, ${roleColor}, transparent)`,
        }}
      />
    </motion.div>
  );
}
