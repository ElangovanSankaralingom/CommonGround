import { motion } from 'framer-motion';
import { WELFARE_WEIGHTS } from '../../../core/models/constants';
import type { RoleId } from '../../../core/models/types';

const ROLE_ICONS: Record<RoleId, { icon: string; color: string; label: string }> = {
  administrator: { icon: '\u{1F3DB}\uFE0F', color: '#C0392B', label: 'Administrator' },
  designer: { icon: '\u{1F4D0}', color: '#2E86AB', label: 'Designer' },
  citizen: { icon: '\u{1F3D8}\uFE0F', color: '#27AE60', label: 'Citizen' },
  investor: { icon: '\u{1F4BC}', color: '#E67E22', label: 'Investor' },
  advocate: { icon: '\u{1F33F}', color: '#8E44AD', label: 'Advocate' },
};

const ROLES_ORDER: RoleId[] = ['citizen', 'advocate', 'designer', 'investor', 'administrator'];

interface ChapterProps {
  onNext: () => void;
  onBack: () => void;
}

function CWSBar({ percent, color, delay }: { percent: number; color: string; delay: number }) {
  return (
    <div className="w-full h-5 rounded-full overflow-hidden" style={{ background: 'rgba(139,111,71,0.15)' }}>
      <motion.div
        className="h-full rounded-full"
        style={{ background: color }}
        initial={{ width: 0 }}
        whileInView={{ width: `${percent}%` }}
        viewport={{ once: true }}
        transition={{ delay, duration: 1.2, ease: 'easeOut' }}
      />
    </div>
  );
}

// Simple confetti particle
function ConfettiParticle({ delay, color, x }: { delay: number; color: string; x: number }) {
  return (
    <motion.div
      className="absolute w-2 h-2 rounded-sm"
      style={{ background: color, left: `${x}%`, top: '30%' }}
      initial={{ opacity: 0, y: 0, rotate: 0 }}
      whileInView={{
        opacity: [0, 1, 1, 0],
        y: [0, -30, -20, 60],
        rotate: [0, 180, 360, 540],
        x: [0, (Math.random() - 0.5) * 40, (Math.random() - 0.5) * 60],
      }}
      viewport={{ once: true }}
      transition={{ delay, duration: 2, ease: 'easeOut' }}
    />
  );
}

export default function Chapter7({ onNext, onBack }: ChapterProps) {
  const confettiColors = ['#F4D03F', '#27AE60', '#2E86AB', '#E67E22', '#8E44AD', '#C0392B'];

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-8 py-8 sm:py-12">
      {/* Full Success */}
      <motion.section
        className="mb-16"
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-50px' }}
        transition={{ duration: 0.6 }}
      >
        <h3
          className="text-2xl font-bold mb-2 text-center"
          style={{ fontFamily: "'Playfair Display', serif", color: '#27AE60' }}
        >
          Full Success
        </h3>

        {/* Animated scene */}
        <div className="relative flex justify-center mb-6 overflow-hidden rounded-2xl py-10"
          style={{ background: 'linear-gradient(135deg, rgba(39,174,96,0.08), rgba(244,208,63,0.08))' }}
        >
          {/* Confetti */}
          {confettiColors.flatMap((color, ci) => [
            <ConfettiParticle key={`c-${ci}-0`} delay={1.5 + ci * 0.1} color={color} x={10 + ci * 15} />,
            <ConfettiParticle key={`c-${ci}-1`} delay={1.7 + ci * 0.1} color={color} x={15 + ci * 14} />,
          ])}

          <svg width="260" height="180" viewBox="-130 -90 260 180" className="overflow-visible">
            {/* Golden connecting lines */}
            {ROLES_ORDER.map((_, i) => {
              const angle1 = (i * 2 * Math.PI) / 5 - Math.PI / 2;
              const angle2 = (((i + 1) % 5) * 2 * Math.PI) / 5 - Math.PI / 2;
              const r = 70;
              return (
                <motion.line
                  key={`gold-${i}`}
                  x1={r * Math.cos(angle1)}
                  y1={r * Math.sin(angle1)}
                  x2={r * Math.cos(angle2)}
                  y2={r * Math.sin(angle2)}
                  stroke="#F4D03F"
                  strokeWidth={2}
                  initial={{ pathLength: 0, opacity: 0 }}
                  whileInView={{ pathLength: 1, opacity: 0.7 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.5 + i * 0.1, duration: 0.5 }}
                />
              );
            })}

            {/* Role icons in circle - all glowing */}
            {ROLES_ORDER.map((roleId, i) => {
              const angle = (i * 2 * Math.PI) / 5 - Math.PI / 2;
              const r = 70;
              const x = r * Math.cos(angle);
              const y = r * Math.sin(angle);
              const role = ROLE_ICONS[roleId];

              return (
                <motion.g
                  key={roleId}
                  initial={{ opacity: 0, scale: 0 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2 + i * 0.15, type: 'spring' }}
                >
                  <circle cx={x} cy={y} r={22} fill={role.color} opacity={0.25} />
                  <circle cx={x} cy={y} r={22} fill="none" stroke={role.color} strokeWidth={2.5} />
                  <motion.circle
                    cx={x}
                    cy={y}
                    r={26}
                    fill="none"
                    stroke="#F4D03F"
                    strokeWidth={1.5}
                    initial={{ scale: 1, opacity: 0 }}
                    whileInView={{ scale: [1, 1.3, 1], opacity: [0, 0.6, 0] }}
                    viewport={{ once: true }}
                    transition={{ delay: 1.2 + i * 0.1, duration: 1.5, repeat: Infinity, repeatDelay: 2 }}
                  />
                  <text x={x} y={y + 2} textAnchor="middle" dominantBaseline="middle" fontSize={18}>
                    {role.icon}
                  </text>
                </motion.g>
              );
            })}
          </svg>
        </div>

        {/* CWS bar */}
        <div className="mb-4">
          <div className="flex justify-between text-xs font-medium mb-1" style={{ color: '#8B6F47' }}>
            <span>SVS</span>
            <span>100%</span>
          </div>
          <CWSBar percent={100} color="linear-gradient(90deg, #27AE60, #2ECC71)" delay={0.8} />
        </div>

        <motion.div
          className="rounded-xl p-4"
          style={{ background: 'rgba(39, 174, 96, 0.08)' }}
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5 }}
        >
          <p className="text-sm font-semibold text-center mb-3" style={{ color: '#27AE60' }}>
            SVS reached the target! All players' survival goals met. The park thrives!
          </p>
          <div className="space-y-1.5">
            {[
              'SVS meets or exceeds the target score',
              'All 5 players achieved their survival goals',
              'Zone conditions improved across the board',
              'Equity bonus maximized through balanced outcomes',
            ].map((item, i) => (
              <motion.div
                key={i}
                className="flex items-start gap-2 text-xs"
                style={{ color: '#4A3728' }}
                initial={{ opacity: 0, x: -10 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.7 + i * 0.1 }}
              >
                <span style={{ color: '#27AE60' }}>&#10003;</span>
                <span>{item}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </motion.section>

      {/* Partial Success */}
      <motion.section
        className="mb-16"
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-50px' }}
        transition={{ duration: 0.6 }}
      >
        <h3
          className="text-2xl font-bold mb-2 text-center"
          style={{ fontFamily: "'Playfair Display', serif", color: '#E67E22' }}
        >
          Partial Success
        </h3>

        <div className="relative flex justify-center mb-6 rounded-2xl py-10"
          style={{ background: 'rgba(230, 126, 34, 0.06)' }}
        >
          <svg width="260" height="180" viewBox="-130 -90 260 180" className="overflow-visible">
            {ROLES_ORDER.map((roleId, i) => {
              const angle = (i * 2 * Math.PI) / 5 - Math.PI / 2;
              const r = 70;
              const x = r * Math.cos(angle);
              const y = r * Math.sin(angle);
              const role = ROLE_ICONS[roleId];
              // Citizen, Advocate, Designer glow; Investor and Admin are dimmer
              const isGlowing = i < 3;

              return (
                <motion.g
                  key={roleId}
                  initial={{ opacity: 0, scale: 0 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2 + i * 0.1, type: 'spring' }}
                >
                  <circle cx={x} cy={y} r={22} fill={role.color} opacity={isGlowing ? 0.25 : 0.08} />
                  <circle
                    cx={x}
                    cy={y}
                    r={22}
                    fill="none"
                    stroke={role.color}
                    strokeWidth={isGlowing ? 2.5 : 1}
                    opacity={isGlowing ? 1 : 0.4}
                  />
                  <text
                    x={x}
                    y={y + 2}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={18}
                    opacity={isGlowing ? 1 : 0.4}
                  >
                    {role.icon}
                  </text>
                </motion.g>
              );
            })}
          </svg>
        </div>

        {/* CWS bar at ~70% */}
        <div className="mb-4">
          <div className="flex justify-between text-xs font-medium mb-1" style={{ color: '#8B6F47' }}>
            <span>SVS</span>
            <span>~72%</span>
          </div>
          <CWSBar percent={72} color="#E67E22" delay={0.5} />
        </div>

        <motion.div
          className="rounded-xl p-4"
          style={{ background: 'rgba(230, 126, 34, 0.08)' }}
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
        >
          <p className="text-sm font-semibold text-center" style={{ color: '#E67E22' }}>
            SVS reached the target, but some players' survival goals were not met.
            Progress was made, but inequitably.
          </p>
        </motion.div>
      </motion.section>

      {/* Failure */}
      <motion.section
        className="mb-16"
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-50px' }}
        transition={{ duration: 0.6 }}
      >
        <h3
          className="text-2xl font-bold mb-2 text-center"
          style={{ fontFamily: "'Playfair Display', serif", color: '#8B6F47' }}
        >
          Failure
        </h3>

        <div className="relative flex justify-center mb-6 rounded-2xl py-10"
          style={{ background: 'rgba(139, 111, 71, 0.04)' }}
        >
          <svg width="260" height="180" viewBox="-130 -90 260 180" className="overflow-visible">
            {ROLES_ORDER.map((roleId, i) => {
              const angle = (i * 2 * Math.PI) / 5 - Math.PI / 2;
              const r = 70;
              const x = r * Math.cos(angle);
              const y = r * Math.sin(angle);
              const role = ROLE_ICONS[roleId];

              return (
                <motion.g
                  key={roleId}
                  initial={{ opacity: 0, scale: 0 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2 + i * 0.1, type: 'spring' }}
                >
                  <circle cx={x} cy={y} r={22} fill={role.color} opacity={0.06} />
                  <circle
                    cx={x}
                    cy={y}
                    r={22}
                    fill="none"
                    stroke={role.color}
                    strokeWidth={1}
                    opacity={0.3}
                  />
                  <text
                    x={x}
                    y={y + 2}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={18}
                    opacity={0.3}
                  >
                    {role.icon}
                  </text>
                </motion.g>
              );
            })}
          </svg>
        </div>

        {/* CWS bar at ~30% */}
        <div className="mb-4">
          <div className="flex justify-between text-xs font-medium mb-1" style={{ color: '#8B6F47' }}>
            <span>SVS</span>
            <span>~30%</span>
          </div>
          <CWSBar percent={30} color="#95A5A6" delay={0.5} />
        </div>

        <motion.div
          className="rounded-xl p-4"
          style={{ background: 'rgba(139, 111, 71, 0.06)' }}
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
        >
          <p className="text-sm font-semibold text-center" style={{ color: '#8B6F47' }}>
            SVS fell short. But this outcome provides valuable research data
            about what barriers prevented collaboration.
          </p>
        </motion.div>
      </motion.section>

      {/* CWS Formula Breakdown */}
      <motion.section
        className="mb-16"
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-50px' }}
        transition={{ duration: 0.6 }}
      >
        <h3
          className="text-2xl font-bold mb-2 text-center"
          style={{ fontFamily: "'Playfair Display', serif", color: '#C75B39' }}
        >
          SVS Formula Breakdown
        </h3>
        <p className="text-center mb-8 text-sm" style={{ color: '#6B5744' }}>
          The Shared Vision Score is computed step by step:
        </p>

        <div className="space-y-4">
          {/* Step 1: Utility */}
          <motion.div
            className="rounded-xl p-4 border"
            style={{ borderColor: 'rgba(139,111,71,0.15)', background: 'rgba(255,255,255,0.5)' }}
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                style={{ background: '#3498DB' }}
              >
                1
              </div>
              <div>
                <div className="text-sm font-semibold" style={{ color: '#4A3728' }}>
                  Each player's utility = sum of satisfied goal weights
                </div>
                <div className="text-xs mt-1" style={{ color: '#6B5744' }}>
                  Players earn utility for meeting character, survival, and mission goals.
                </div>
              </div>
            </div>
          </motion.div>

          {/* Step 2: Welfare Weights */}
          <motion.div
            className="rounded-xl p-4 border"
            style={{ borderColor: 'rgba(139,111,71,0.15)', background: 'rgba(255,255,255,0.5)' }}
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                style={{ background: '#8E44AD' }}
              >
                2
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold" style={{ color: '#4A3728' }}>
                  Weighted by equity
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {ROLES_ORDER.map(roleId => {
                    const role = ROLE_ICONS[roleId];
                    const weight = WELFARE_WEIGHTS[roleId];
                    return (
                      <motion.div
                        key={roleId}
                        className="flex items-center gap-1.5 rounded-lg px-2 py-1"
                        style={{ background: `${role.color}12` }}
                        initial={{ opacity: 0, scale: 0.8 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.4 + ROLES_ORDER.indexOf(roleId) * 0.1 }}
                      >
                        <span className="text-sm">{role.icon}</span>
                        <span className="text-xs font-semibold" style={{ color: role.color }}>
                          &times;{weight}
                        </span>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Step 3: Equity bonus */}
          <motion.div
            className="rounded-xl p-4 border"
            style={{ borderColor: 'rgba(139,111,71,0.15)', background: 'rgba(255,255,255,0.5)' }}
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                style={{ background: '#27AE60' }}
              >
                3
              </div>
              <div>
                <div className="text-sm font-semibold" style={{ color: '#4A3728' }}>
                  Equity bonus rewards equal utility distribution (max +10)
                </div>
                <div className="text-xs mt-1" style={{ color: '#6B5744' }}>
                  The more evenly distributed utility is among players, the higher the bonus.
                </div>
              </div>
            </div>
          </motion.div>

          {/* Step 4: Collaboration bonus */}
          <motion.div
            className="rounded-xl p-4 border"
            style={{ borderColor: 'rgba(139,111,71,0.15)', background: 'rgba(255,255,255,0.5)' }}
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                style={{ background: '#E67E22' }}
              >
                4
              </div>
              <div>
                <div className="text-sm font-semibold" style={{ color: '#4A3728' }}>
                  Collaboration bonus = total CP earned by all players
                </div>
                <div className="text-xs mt-1" style={{ color: '#6B5744' }}>
                  Every collaboration point earned throughout the game adds directly to SVS.
                </div>
              </div>
            </div>
          </motion.div>

          {/* Step 5: Final formula */}
          <motion.div
            className="rounded-xl p-4 border-2"
            style={{ borderColor: '#C75B39', background: 'rgba(199, 91, 57, 0.06)' }}
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.5 }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                style={{ background: '#C75B39' }}
              >
                5
              </div>
              <div>
                <div className="text-sm font-semibold" style={{ color: '#C75B39' }}>
                  SVS = Weighted Sum + Equity Bonus + Collaboration Bonus
                </div>
                <motion.div
                  className="mt-2 rounded-lg px-3 py-2 font-mono text-xs"
                  style={{ background: '#4A3728', color: '#F5E6D3' }}
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.8 }}
                >
                  SVS = &Sigma;(weight<sub>i</sub> &times; utility<sub>i</sub>) + equityBonus + collaborationBonus
                </motion.div>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.section>

      {/* Closing emphasis */}
      <motion.section
        className="mb-12"
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-50px' }}
        transition={{ duration: 0.6 }}
      >
        <motion.blockquote
          className="text-center rounded-2xl p-8"
          style={{
            background: 'linear-gradient(135deg, rgba(199,91,57,0.08), rgba(139,111,71,0.06))',
            borderLeft: '4px solid #C75B39',
          }}
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3, duration: 0.6 }}
        >
          <p
            className="text-xl sm:text-2xl font-bold italic leading-relaxed"
            style={{
              fontFamily: "'Playfair Display', serif",
              color: '#4A3728',
            }}
          >
            &ldquo;The real win is understanding how power dynamics shape collaborative outcomes.&rdquo;
          </p>
        </motion.blockquote>
      </motion.section>

      {/* Navigation */}
      <motion.div
        className="flex justify-between items-center pb-8"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.3 }}
      >
        <button
          onClick={onBack}
          className="px-6 py-3 rounded-xl text-sm font-semibold transition-all hover:scale-105"
          style={{ color: '#4A3728', border: '1px solid rgba(139,111,71,0.3)' }}
        >
          &larr; Series &amp; Combinations
        </button>
        <button
          onClick={onNext}
          className="px-6 py-3 rounded-xl text-sm font-semibold transition-all hover:scale-105"
          style={{ background: '#C75B39', color: '#F5E6D3' }}
        >
          Quick Reference &rarr;
        </button>
      </motion.div>
    </div>
  );
}
