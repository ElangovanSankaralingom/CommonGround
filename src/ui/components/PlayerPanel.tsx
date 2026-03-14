import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import type {
  Player,
  AbilityScores,
  AbilityId,
  ResourcePool,
  ResourceType,
  SkillId,
} from '../../core/models/types';
import { getAbilityModifier } from '../../core/models/types';

interface PlayerPanelProps {
  player: Player;
  isCurrentTurn: boolean;
}

const ROLE_COLORS: Record<string, string> = {
  administrator: '#C0392B',
  designer: '#2E86AB',
  citizen: '#27AE60',
  investor: '#E67E22',
  advocate: '#8E44AD',
};

const ROLE_ICONS: Record<string, string> = {
  administrator: '🏛',
  designer: '📐',
  citizen: '🏘',
  investor: '💰',
  advocate: '📢',
};

const RESOURCE_COLORS: Record<ResourceType, string> = {
  budget: '#F4D03F',
  influence: '#3498DB',
  volunteer: '#27AE60',
  material: '#95A5A6',
  knowledge: '#8E44AD',
};

const RESOURCE_ICONS: Record<ResourceType, string> = {
  budget: '💰',
  influence: '🌟',
  volunteer: '🤝',
  material: '🔧',
  knowledge: '📚',
};

const ABILITY_LABELS: Record<AbilityId, string> = {
  authority: 'Authority',
  resourcefulness: 'Resourcefulness',
  communityTrust: 'Community Trust',
  technicalKnowledge: 'Technical Knowledge',
  politicalLeverage: 'Political Leverage',
  adaptability: 'Adaptability',
};

const ABILITY_SHORT: Record<AbilityId, string> = {
  authority: 'AUT',
  resourcefulness: 'RES',
  communityTrust: 'COM',
  technicalKnowledge: 'TEC',
  politicalLeverage: 'POL',
  adaptability: 'ADP',
};

const SKILL_LABELS: Record<SkillId, string> = {
  negotiation: 'Negotiation',
  budgeting: 'Budgeting',
  designThinking: 'Design Thinking',
  publicSpeaking: 'Public Speaking',
  regulatoryNavigation: 'Regulatory Navigation',
  environmentalAssessment: 'Environmental Assessment',
  coalitionBuilding: 'Coalition Building',
  crisisManagement: 'Crisis Management',
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

// CP thresholds per level (simplified)
const CP_PER_LEVEL = [0, 10, 25, 50, 80, 120];

type TabId = 'stats' | 'resources' | 'goals' | 'skills';

export function PlayerPanel({ player, isCurrentTurn }: PlayerPanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>('stats');
  const roleColor = ROLE_COLORS[player.roleId] || '#666';
  const roleIcon = ROLE_ICONS[player.roleId] || '?';

  const currentLevelCP = CP_PER_LEVEL[player.level - 1] ?? 0;
  const nextLevelCP = CP_PER_LEVEL[player.level] ?? CP_PER_LEVEL[CP_PER_LEVEL.length - 1];
  const cpProgress =
    nextLevelCP > currentLevelCP
      ? ((player.collaborationPoints - currentLevelCP) / (nextLevelCP - currentLevelCP)) * 100
      : 100;

  const tabs: { id: TabId; label: string }[] = [
    { id: 'stats', label: 'Stats' },
    { id: 'resources', label: 'Resources' },
    { id: 'goals', label: 'Goals' },
    { id: 'skills', label: 'Skills' },
  ];

  return (
    <div
      className="flex flex-col w-64 bg-stone-900/95 backdrop-blur-sm border border-stone-700/50 rounded-lg shadow-xl overflow-hidden"
      style={
        isCurrentTurn
          ? { borderColor: `${roleColor}88`, boxShadow: `0 0 16px ${roleColor}33` }
          : {}
      }
    >
      {/* Header: Player name, role, level */}
      <div
        className="px-4 py-3 flex items-center gap-3"
        style={{ background: `linear-gradient(135deg, ${roleColor}33, ${roleColor}11)` }}
      >
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-xl border-2"
          style={{ borderColor: roleColor, backgroundColor: `${roleColor}22` }}
        >
          {roleIcon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-white font-bold text-sm truncate">{player.name}</div>
          <div className="text-stone-400 text-xs capitalize">{player.roleId}</div>
        </div>
        {isCurrentTurn && (
          <motion.div
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: roleColor }}
            animate={{ scale: [1, 1.3, 1], opacity: [1, 0.6, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        )}
      </div>

      {/* Level & CP bar */}
      <div className="px-4 py-2 border-b border-stone-800">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-amber-400 font-semibold">Lv.{player.level}</span>
          <span className="text-stone-500">
            CP: {player.collaborationPoints}/{nextLevelCP}
          </span>
        </div>
        <div className="h-1.5 bg-stone-800 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-amber-500"
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(cpProgress, 100)}%` }}
            transition={{ type: 'spring', stiffness: 80, damping: 20 }}
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-stone-800">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2 text-xs font-semibold uppercase tracking-wider transition-colors ${
              activeTab === tab.id
                ? 'text-white border-b-2'
                : 'text-stone-500 hover:text-stone-300'
            }`}
            style={activeTab === tab.id ? { borderBottomColor: roleColor } : {}}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto px-3 py-2 min-h-[200px] max-h-[400px]">
        <AnimatePresence mode="wait">
          {activeTab === 'stats' && (
            <motion.div
              key="stats"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.15 }}
            >
              <StatsTab abilities={player.abilities} />
            </motion.div>
          )}
          {activeTab === 'resources' && (
            <motion.div
              key="resources"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.15 }}
            >
              <ResourcesTab resources={player.resources} />
            </motion.div>
          )}
          {activeTab === 'goals' && (
            <motion.div
              key="goals"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.15 }}
            >
              <GoalsTab goals={player.goals} />
            </motion.div>
          )}
          {activeTab === 'skills' && (
            <motion.div
              key="skills"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.15 }}
            >
              <SkillsTab
                proficientSkills={player.proficientSkills}
                proficiencyBonus={player.proficiencyBonus}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function StatsTab({ abilities }: { abilities: AbilityScores }) {
  const abilityKeys = Object.keys(ABILITY_LABELS) as AbilityId[];

  return (
    <div className="space-y-1.5">
      {abilityKeys.map((key) => {
        const score = abilities[key];
        const mod = getAbilityModifier(score);
        const modStr = mod >= 0 ? `+${mod}` : `${mod}`;

        return (
          <div
            key={key}
            className="flex items-center justify-between py-1 px-2 rounded bg-stone-800/50"
          >
            <div className="flex items-center gap-2">
              <span className="text-stone-500 text-[10px] font-mono w-6">
                {ABILITY_SHORT[key]}
              </span>
              <span className="text-stone-300 text-xs">{ABILITY_LABELS[key]}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-white text-sm font-bold tabular-nums w-5 text-center">
                {score}
              </span>
              <span
                className={`text-xs font-semibold tabular-nums w-6 text-right ${
                  mod > 0
                    ? 'text-emerald-400'
                    : mod < 0
                    ? 'text-red-400'
                    : 'text-stone-500'
                }`}
              >
                {modStr}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ResourcesTab({ resources }: { resources: ResourcePool }) {
  const resourceKeys = Object.keys(RESOURCE_COLORS) as ResourceType[];

  return (
    <div className="space-y-2">
      {resourceKeys.map((key) => {
        const count = resources[key];
        const color = RESOURCE_COLORS[key];
        const icon = RESOURCE_ICONS[key];

        return (
          <div key={key} className="flex items-center gap-2 py-1.5 px-2 rounded bg-stone-800/50">
            <span className="text-base">{icon}</span>
            <span className="text-stone-300 text-xs capitalize flex-1">{key}</span>
            <div className="flex items-center gap-1">
              {/* Token dots */}
              <div className="flex gap-0.5">
                {Array.from({ length: Math.min(count, 8) }).map((_, i) => (
                  <motion.div
                    key={i}
                    className="w-2.5 h-2.5 rounded-full border"
                    style={{
                      backgroundColor: `${color}88`,
                      borderColor: color,
                    }}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: i * 0.03 }}
                  />
                ))}
                {count > 8 && (
                  <span className="text-stone-400 text-[10px] ml-0.5">...</span>
                )}
              </div>
              <span
                className="text-sm font-bold tabular-nums ml-1 min-w-[16px] text-right"
                style={{ color }}
              >
                {count}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function GoalsTab({ goals }: { goals: Player['goals'] }) {
  const goalCategories: { key: keyof Player['goals']; label: string; color: string }[] = [
    { key: 'character', label: 'Character', color: '#3498DB' },
    { key: 'survival', label: 'Survival', color: '#E74C3C' },
    { key: 'mission', label: 'Mission', color: '#2ECC71' },
  ];

  return (
    <div className="space-y-3">
      {goalCategories.map(({ key, label, color }) => {
        const tier = goals[key];
        const satisfiedCount = tier.subGoals.filter((g) => g.satisfied).length;

        return (
          <div key={key}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color }}>
                {label}
              </span>
              <span className="text-stone-500 text-[10px]">
                {satisfiedCount}/{tier.subGoals.length}
              </span>
            </div>
            <p className="text-stone-400 text-[11px] mb-1 italic">{tier.description}</p>
            <div className="space-y-0.5">
              {tier.subGoals.map((subGoal) => (
                <div
                  key={subGoal.id}
                  className={`flex items-start gap-1.5 px-2 py-1 rounded text-[11px] ${
                    subGoal.satisfied
                      ? 'bg-emerald-900/30 text-emerald-300'
                      : 'bg-stone-800/50 text-stone-400'
                  }`}
                >
                  <span className="mt-0.5 flex-shrink-0">
                    {subGoal.satisfied ? '✓' : '○'}
                  </span>
                  <span className="leading-tight">{subGoal.description}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SkillsTab({
  proficientSkills,
  proficiencyBonus,
}: {
  proficientSkills: SkillId[];
  proficiencyBonus: number;
}) {
  return (
    <div className="space-y-1">
      <div className="text-stone-500 text-[10px] uppercase tracking-wider mb-2">
        Proficiency Bonus: +{proficiencyBonus}
      </div>
      {ALL_SKILLS.map((skill) => {
        const isProficient = proficientSkills.includes(skill);

        return (
          <div
            key={skill}
            className={`flex items-center justify-between px-2 py-1.5 rounded text-xs ${
              isProficient
                ? 'bg-amber-900/30 text-amber-200 border border-amber-800/40'
                : 'bg-stone-800/30 text-stone-600'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className={isProficient ? 'text-amber-400' : 'text-stone-700'}>
                {isProficient ? '◆' : '◇'}
              </span>
              <span>{SKILL_LABELS[skill]}</span>
            </div>
            {isProficient && (
              <span className="text-amber-500 text-[10px] font-semibold">
                +{proficiencyBonus}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
