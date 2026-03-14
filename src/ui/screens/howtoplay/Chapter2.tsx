import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ROLES } from '../../../core/content';
import type { RoleId, RoleDefinition, AbilityScores } from '../../../core/models/types';
import { WELFARE_WEIGHTS } from '../../../core/models/constants';

const ABILITY_LABELS: Record<keyof AbilityScores, string> = {
  authority: 'Authority',
  resourcefulness: 'Resourcefulness',
  communityTrust: 'Community Trust',
  technicalKnowledge: 'Technical Knowledge',
  politicalLeverage: 'Political Leverage',
  adaptability: 'Adaptability',
};

const ABILITY_KEYS: (keyof AbilityScores)[] = [
  'authority',
  'resourcefulness',
  'communityTrust',
  'technicalKnowledge',
  'politicalLeverage',
  'adaptability',
];

const RESOURCE_ICONS: Record<string, { icon: string; color: string }> = {
  budget: { icon: '💰', color: '#F4D03F' },
  influence: { icon: '🔵', color: '#3498DB' },
  volunteer: { icon: '🤝', color: '#27AE60' },
  material: { icon: '🧱', color: '#95A5A6' },
  knowledge: { icon: '📚', color: '#8E44AD' },
};

const ROLE_ORDER: RoleId[] = ['administrator', 'designer', 'citizen', 'investor', 'advocate'];

interface ChapterProps {
  onNext: () => void;
  onBack: () => void;
}

// -- Radar Chart Component --
function RadarChart({
  abilities,
  color,
  size = 200,
  animate = true,
  overlayData,
}: {
  abilities: AbilityScores;
  color: string;
  size?: number;
  animate?: boolean;
  overlayData?: { abilities: AbilityScores; color: string; label: string }[];
}) {
  const cx = size / 2;
  const cy = size / 2;
  const maxVal = 20;
  const radius = size * 0.38;
  const labelRadius = size * 0.48;

  // Get point on axis
  const getPoint = (axisIndex: number, value: number) => {
    const angle = (axisIndex * 2 * Math.PI) / 6 - Math.PI / 2;
    const r = (value / maxVal) * radius;
    return {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
    };
  };

  // Hexagonal grid lines
  const gridLevels = [0.33, 0.66, 1.0];
  const gridPaths = gridLevels.map((level) => {
    const points = ABILITY_KEYS.map((_, i) => {
      const angle = (i * 2 * Math.PI) / 6 - Math.PI / 2;
      const r = level * radius;
      return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
    });
    return `M${points.join('L')}Z`;
  });

  // Axis lines
  const axisLines = ABILITY_KEYS.map((_, i) => {
    const angle = (i * 2 * Math.PI) / 6 - Math.PI / 2;
    return {
      x2: cx + radius * Math.cos(angle),
      y2: cy + radius * Math.sin(angle),
    };
  });

  // Data polygon
  const makePolygon = (abs: AbilityScores) => {
    const points = ABILITY_KEYS.map((key, i) => {
      const pt = getPoint(i, abs[key]);
      return `${pt.x},${pt.y}`;
    });
    return `M${points.join('L')}Z`;
  };

  const dataPath = makePolygon(abilities);

  // Label positions
  const labels = ABILITY_KEYS.map((key, i) => {
    const angle = (i * 2 * Math.PI) / 6 - Math.PI / 2;
    return {
      x: cx + labelRadius * Math.cos(angle),
      y: cy + labelRadius * Math.sin(angle),
      label: ABILITY_LABELS[key],
      value: abilities[key],
    };
  });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="overflow-visible">
      {/* Grid hexagons */}
      {gridPaths.map((d, i) => (
        <path
          key={`grid-${i}`}
          d={d}
          fill="none"
          stroke="rgba(139, 111, 71, 0.15)"
          strokeWidth={1}
        />
      ))}

      {/* Axis lines */}
      {axisLines.map((line, i) => (
        <line
          key={`axis-${i}`}
          x1={cx}
          y1={cy}
          x2={line.x2}
          y2={line.y2}
          stroke="rgba(139, 111, 71, 0.1)"
          strokeWidth={1}
        />
      ))}

      {/* Overlay polygons (compare mode) */}
      {overlayData?.map((overlay, idx) => (
        <motion.path
          key={`overlay-${idx}`}
          d={makePolygon(overlay.abilities)}
          fill={overlay.color}
          fillOpacity={0.08}
          stroke={overlay.color}
          strokeWidth={1.5}
          strokeOpacity={0.5}
          initial={animate ? { pathLength: 0, opacity: 0 } : undefined}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.8, delay: idx * 0.15 }}
        />
      ))}

      {/* Main data polygon */}
      <motion.path
        d={dataPath}
        fill={color}
        fillOpacity={0.3}
        stroke={color}
        strokeWidth={2}
        initial={animate ? { pathLength: 0, fillOpacity: 0 } : undefined}
        animate={{ pathLength: 1, fillOpacity: 0.3 }}
        transition={{ duration: 1, ease: 'easeOut' }}
      />

      {/* Data points */}
      {ABILITY_KEYS.map((key, i) => {
        const pt = getPoint(i, abilities[key]);
        return (
          <motion.circle
            key={`dot-${i}`}
            cx={pt.x}
            cy={pt.y}
            r={3}
            fill={color}
            initial={animate ? { opacity: 0, scale: 0 } : undefined}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.8 + i * 0.1, type: 'spring' }}
          />
        );
      })}

      {/* Labels */}
      {labels.map((item, i) => (
        <text
          key={`label-${i}`}
          x={item.x}
          y={item.y}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={size < 180 ? 7 : 9}
          fill="#8B6F47"
          fontWeight={500}
        >
          <tspan>{item.label}</tspan>
          <tspan x={item.x} dy={size < 180 ? 9 : 11} fontSize={size < 180 ? 7 : 8} fill={color} fontWeight={700}>
            {item.value}
          </tspan>
        </text>
      ))}
    </svg>
  );
}

// -- Role Card (collapsed) --
function RoleCard({
  role,
  onClick,
  index,
}: {
  role: RoleDefinition;
  onClick: () => void;
  index: number;
}) {
  return (
    <motion.button
      onClick={onClick}
      className="w-full text-left rounded-xl p-4 border-2 transition-shadow hover:shadow-lg"
      style={{
        borderColor: role.color + '40',
        background: `linear-gradient(135deg, ${role.color}08 0%, ${role.color}15 100%)`,
      }}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1, type: 'spring', stiffness: 200 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center text-2xl"
          style={{ background: role.color + '20', border: `2px solid ${role.color}` }}
        >
          {role.icon}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-base" style={{ color: role.color }}>
            {role.name}
          </h4>
          <p className="text-xs truncate" style={{ color: '#6B5744' }}>
            {role.subtitle}
          </p>
        </div>
        <div className="text-lg" style={{ color: role.color }}>
          →
        </div>
      </div>
    </motion.button>
  );
}

// -- Role Detail (expanded) --
function RoleDetail({
  role,
  onClose,
}: {
  role: RoleDefinition;
  onClose: () => void;
}) {
  const resources = role.startingResources;
  const resourceEntries = Object.entries(resources).filter(([, val]) => val > 0);
  const welfareWeight = WELFARE_WEIGHTS[role.id];

  return (
    <motion.div
      className="rounded-xl border-2 overflow-hidden"
      style={{ borderColor: role.color + '60' }}
      initial={{ opacity: 0, rotateY: 90 }}
      animate={{ opacity: 1, rotateY: 0 }}
      exit={{ opacity: 0, rotateY: -90 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      {/* Header */}
      <div
        className="px-5 py-4 flex items-center justify-between"
        style={{ background: `linear-gradient(135deg, ${role.color} 0%, ${role.color}DD 100%)` }}
      >
        <div className="flex items-center gap-3">
          <span className="text-3xl">{role.icon}</span>
          <div>
            <h4 className="font-bold text-xl" style={{ fontFamily: "'Playfair Display', serif", color: '#F5E6D3' }}>
              {role.name}
            </h4>
            <p className="text-xs" style={{ color: 'rgba(245, 230, 211, 0.7)' }}>{role.subtitle}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-white/10 transition-colors text-lg"
          style={{ color: '#F5E6D3' }}
        >
          ✕
        </button>
      </div>

      <div className="p-5" style={{ background: `${role.color}05` }}>
        {/* Description */}
        <p className="text-sm mb-4 italic" style={{ color: '#4A3728' }}>
          "{role.description}"
        </p>

        {/* Real-world analogue */}
        <div className="text-xs mb-5 px-3 py-2 rounded-lg" style={{ background: role.color + '10', color: '#6B5744' }}>
          <span className="font-semibold" style={{ color: role.color }}>Real-world:</span>{' '}
          {role.realWorldAnalogue}
        </div>

        {/* Radar Chart */}
        <div className="flex justify-center mb-5">
          <RadarChart abilities={role.startingAbilities} color={role.color} size={220} />
        </div>

        {/* Starting Resources */}
        <div className="mb-5">
          <h5 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#8B6F47' }}>
            Starting Resources
          </h5>
          <div className="flex flex-wrap gap-2">
            {resourceEntries.map(([key, val]) => {
              const info = RESOURCE_ICONS[key];
              return (
                <div key={key} className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs" style={{ background: info.color + '15' }}>
                  <span>{info.icon}</span>
                  <span className="font-medium capitalize" style={{ color: '#4A3728' }}>{key}</span>
                  <div className="flex gap-0.5 ml-1">
                    {Array.from({ length: val as number }).map((_, i) => (
                      <div
                        key={i}
                        className="w-2 h-2 rounded-full"
                        style={{ background: info.color }}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Unique Ability */}
        <div className="mb-5 p-3 rounded-xl border" style={{ borderColor: role.color + '30', background: role.color + '08' }}>
          <h5 className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: role.color }}>
            Unique Ability: {role.uniqueAbility.name}
          </h5>
          <p className="text-xs" style={{ color: '#4A3728' }}>
            {role.uniqueAbility.description}
          </p>
        </div>

        {/* Goal Tiers */}
        <div className="mb-4">
          <h5 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#8B6F47' }}>
            Goal Tiers
          </h5>
          <div className="space-y-2">
            {([
              { key: 'survival' as const, label: 'Survival', emoji: '🛡️' },
              { key: 'character' as const, label: 'Character', emoji: '🎭' },
              { key: 'mission' as const, label: 'Mission', emoji: '🎯' },
            ]).map((tier) => (
              <div
                key={tier.key}
                className="p-2.5 rounded-lg text-xs"
                style={{ background: 'rgba(139, 111, 71, 0.05)' }}
              >
                <div className="font-semibold mb-0.5" style={{ color: role.color }}>
                  {tier.emoji} {tier.label} (Weight: {role.goals[tier.key].totalWeight})
                </div>
                <div style={{ color: '#4A3728' }}>
                  {role.goals[tier.key].description}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Welfare Weight */}
        <div className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg" style={{ background: 'rgba(139, 111, 71, 0.06)' }}>
          <span className="font-semibold" style={{ color: '#8B6F47' }}>Welfare Weight:</span>
          <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(139, 111, 71, 0.1)' }}>
            <motion.div
              className="h-full rounded-full"
              style={{ background: role.color }}
              initial={{ width: 0 }}
              animate={{ width: `${(welfareWeight / 1.5) * 100}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          </div>
          <span className="font-bold" style={{ color: role.color }}>{welfareWeight}x</span>
        </div>
      </div>
    </motion.div>
  );
}

export default function Chapter2({ onNext }: ChapterProps) {
  const [selectedRole, setSelectedRole] = useState<RoleId | null>(null);
  const [compareMode, setCompareMode] = useState(false);

  const selectedRoleDef = selectedRole ? ROLES[selectedRole] : null;

  // Build overlay data for compare mode
  const overlayData = ROLE_ORDER.map((id) => ({
    abilities: ROLES[id].startingAbilities,
    color: ROLES[id].color,
    label: ROLES[id].name,
  }));

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-8 py-8 sm:py-12">
      <motion.div
        className="text-center mb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h3
          className="text-2xl font-bold mb-2"
          style={{ fontFamily: "'Playfair Display', serif", color: '#2E86AB' }}
        >
          Meet the Five Roles
        </h3>
        <p className="text-sm" style={{ color: '#6B5744' }}>
          Each role has unique abilities, resources, and motivations. Tap a role to explore it.
        </p>
      </motion.div>

      {/* Compare toggle */}
      <motion.div
        className="flex justify-center mb-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <button
          onClick={() => {
            setCompareMode(!compareMode);
            setSelectedRole(null);
          }}
          className="px-4 py-2 rounded-lg text-xs font-semibold transition-all border"
          style={{
            background: compareMode ? '#2E86AB' : 'transparent',
            color: compareMode ? '#F5E6D3' : '#2E86AB',
            borderColor: '#2E86AB',
          }}
        >
          {compareMode ? '✕ Exit Compare' : '📊 Compare All Roles'}
        </button>
      </motion.div>

      {/* Compare mode: overlaid radar charts */}
      {compareMode && (
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="flex justify-center mb-4">
            <RadarChart
              abilities={ROLES.administrator.startingAbilities}
              color="transparent"
              size={280}
              overlayData={overlayData}
            />
          </div>
          {/* Legend */}
          <div className="flex flex-wrap justify-center gap-3">
            {ROLE_ORDER.map((id) => (
              <div key={id} className="flex items-center gap-1.5 text-xs">
                <div className="w-3 h-3 rounded-full" style={{ background: ROLES[id].color }} />
                <span style={{ color: '#4A3728' }}>{ROLES[id].name}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Role cards / detail */}
      {!compareMode && (
        <AnimatePresence mode="wait">
          {selectedRoleDef ? (
            <RoleDetail
              key={selectedRoleDef.id}
              role={selectedRoleDef}
              onClose={() => setSelectedRole(null)}
            />
          ) : (
            <motion.div
              key="grid"
              className="grid grid-cols-1 sm:grid-cols-2 gap-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {ROLE_ORDER.map((id, i) => (
                <RoleCard
                  key={id}
                  role={ROLES[id]}
                  onClick={() => setSelectedRole(id)}
                  index={i}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
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
          style={{ background: '#2E86AB', color: '#F5E6D3' }}
        >
          Explore the Board →
        </button>
      </motion.div>
    </div>
  );
}
