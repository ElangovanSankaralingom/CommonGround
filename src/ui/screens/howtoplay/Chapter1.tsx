import { motion } from 'framer-motion';

const ROLE_ICONS = [
  { icon: '\u{1F3DB}\uFE0F', color: '#C0392B', label: 'Administrator' },
  { icon: '\u{1F4D0}', color: '#2E86AB', label: 'Designer' },
  { icon: '\u{1F3D8}\uFE0F', color: '#27AE60', label: 'Citizen' },
  { icon: '\u{1F4BC}', color: '#E67E22', label: 'Investor' },
  { icon: '\u{1F33F}', color: '#8E44AD', label: 'Advocate' },
];

interface ChapterProps {
  onNext: () => void;
  onBack: () => void;
}

export default function Chapter1({ onNext }: ChapterProps) {
  // Position 5 icons in a circle
  const circleRadius = 100;
  const iconPositions = ROLE_ICONS.map((_, i) => {
    const angle = (i * 2 * Math.PI) / 5 - Math.PI / 2;
    return {
      x: circleRadius * Math.cos(angle),
      y: circleRadius * Math.sin(angle),
    };
  });

  // Generate connecting lines between all pairs
  const connections: { x1: number; y1: number; x2: number; y2: number }[] = [];
  for (let i = 0; i < 5; i++) {
    for (let j = i + 1; j < 5; j++) {
      connections.push({
        x1: iconPositions[i].x,
        y1: iconPositions[i].y,
        x2: iconPositions[j].x,
        y2: iconPositions[j].y,
      });
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-8 py-8 sm:py-12">
      {/* Animated park intro */}
      <motion.div
        className="relative w-full h-48 sm:h-64 rounded-2xl overflow-hidden mb-12"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
      >
        {/* Grey/neglected state fading to colorful */}
        <motion.div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(135deg, #9E9E9E 0%, #757575 30%, #BDBDBD 60%, #8D8D8D 100%)',
          }}
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 2, delay: 0.5 }}
        />
        <motion.div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(135deg, #7BA05B 0%, #4CAF50 20%, #81C784 40%, #AED581 55%, #C8E6C9 70%, #F4D03F 85%, #FFB74D 100%)',
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 2, delay: 0.5 }}
        />
        {/* Tree silhouettes */}
        <motion.div
          className="absolute bottom-0 left-0 right-0 flex justify-around items-end"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 0.3, y: 0 }}
          transition={{ duration: 1.5, delay: 1 }}
        >
          {[40, 60, 50, 70, 45, 55, 65].map((h, i) => (
            <div
              key={i}
              className="rounded-full"
              style={{
                width: h * 0.6,
                height: h,
                background: 'rgba(46, 80, 30, 0.5)',
                marginBottom: -h * 0.15,
              }}
            />
          ))}
        </motion.div>
        {/* Title overlay */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 1.5 }}
        >
          <div className="text-center">
            <h1
              className="text-3xl sm:text-4xl font-bold text-white drop-shadow-lg"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              CommonGround
            </h1>
            <p className="text-white/80 text-sm mt-1 drop-shadow">A game of collaborative placemaking</p>
          </div>
        </motion.div>
      </motion.div>

      {/* Panel 1: 5 Stakeholders, 1 Shared Space */}
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
          5 Stakeholders, 1 Shared Space
        </h3>
        <p className="text-center mb-8 text-sm" style={{ color: '#6B5744' }}>
          Each player takes on a real-world role with unique powers, resources, and goals.
        </p>

        {/* Circle of roles with connecting lines */}
        <div className="flex justify-center">
          <svg
            width="280"
            height="280"
            viewBox="-140 -140 280 280"
            className="overflow-visible"
          >
            {/* Connecting lines */}
            {connections.map((line, i) => (
              <motion.line
                key={`line-${i}`}
                x1={line.x1}
                y1={line.y1}
                x2={line.x2}
                y2={line.y2}
                stroke="rgba(139, 111, 71, 0.2)"
                strokeWidth={1.5}
                initial={{ pathLength: 0, opacity: 0 }}
                whileInView={{ pathLength: 1, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.8 + i * 0.05 }}
              />
            ))}
            {/* Role icons */}
            {ROLE_ICONS.map((role, i) => (
              <motion.g
                key={role.label}
                initial={{ opacity: 0, scale: 0 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ type: 'spring', delay: 0.2 + i * 0.15, stiffness: 200 }}
              >
                <circle
                  cx={iconPositions[i].x}
                  cy={iconPositions[i].y}
                  r={28}
                  fill={role.color}
                  opacity={0.15}
                />
                <circle
                  cx={iconPositions[i].x}
                  cy={iconPositions[i].y}
                  r={28}
                  fill="none"
                  stroke={role.color}
                  strokeWidth={2}
                />
                <text
                  x={iconPositions[i].x}
                  y={iconPositions[i].y + 2}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={22}
                >
                  {role.icon}
                </text>
                <text
                  x={iconPositions[i].x}
                  y={iconPositions[i].y + 46}
                  textAnchor="middle"
                  fontSize={10}
                  fill={role.color}
                  fontWeight={600}
                >
                  {role.label}
                </text>
              </motion.g>
            ))}
            {/* Center label */}
            <motion.text
              x={0}
              y={0}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={11}
              fill="#8B6F47"
              fontWeight={600}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 1.5 }}
            >
              Shared Space
            </motion.text>
          </svg>
        </div>
      </motion.section>

      {/* Panel 2: No Winner, No Loser */}
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
          No Winner, No Loser
        </h3>
        <p className="text-center mb-8 text-sm" style={{ color: '#6B5744' }}>
          CommonGround is cooperative -- you all share one collective score.
          But each role has personal goals that create natural tension.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-8">
          {/* Crossed-out trophy */}
          <motion.div
            className="relative flex flex-col items-center"
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <div className="relative">
              <span className="text-6xl opacity-30">🏆</span>
              <motion.div
                className="absolute inset-0 flex items-center justify-center"
                initial={{ scale: 0, rotate: -45 }}
                whileInView={{ scale: 1, rotate: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.5, type: 'spring' }}
              >
                <div
                  className="w-16 h-1 rounded-full"
                  style={{ background: '#E74C3C', transform: 'rotate(-45deg)' }}
                />
              </motion.div>
            </div>
            <span className="text-xs mt-2 font-medium" style={{ color: '#E74C3C' }}>
              No single winner
            </span>
          </motion.div>

          {/* Arrow */}
          <motion.div
            className="text-2xl"
            style={{ color: '#8B6F47' }}
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.8 }}
          >
            →
          </motion.div>

          {/* Group concept */}
          <motion.div
            className="flex flex-col items-center"
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <div className="flex -space-x-3">
              {ROLE_ICONS.map((role, i) => (
                <motion.div
                  key={role.label}
                  className="w-12 h-12 rounded-full flex items-center justify-center text-xl border-2"
                  style={{ background: role.color + '20', borderColor: role.color, zIndex: 5 - i }}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 1 + i * 0.1 }}
                >
                  {role.icon}
                </motion.div>
              ))}
            </div>
            <span className="text-xs mt-2 font-medium" style={{ color: '#27AE60' }}>
              Everyone rises or falls together
            </span>
          </motion.div>
        </div>

        <motion.div
          className="mt-8 p-4 rounded-xl text-center text-sm"
          style={{ background: 'rgba(199, 91, 57, 0.08)', color: '#6B5744' }}
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.6 }}
        >
          <strong style={{ color: '#C75B39' }}>The Shared Vision Score (SVS)</strong> tracks how well the
          entire community is doing. If it hits the target, everyone succeeds.
          But neglecting any one role's needs drags down the whole group.
        </motion.div>
      </motion.section>

      {/* Panel 3: Real Problems, Real Roles */}
      <motion.section
        className="mb-12"
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-50px' }}
        transition={{ duration: 0.6 }}
      >
        <h3
          className="text-2xl font-bold mb-2 text-center"
          style={{ fontFamily: "'Playfair Display', serif", color: '#C75B39' }}
        >
          Real Problems, Real Roles
        </h3>
        <p className="text-center mb-8 text-sm" style={{ color: '#6B5744' }}>
          Every challenge in CommonGround mirrors real urban issues.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Real challenges */}
          {[
            { challenge: 'Broken playground equipment', card: 'Safety Inspection', icon: '⚠️' },
            { challenge: 'Polluted boating pond', card: 'Ecological Assessment', icon: '🏞️' },
            { challenge: 'Budget disputes', card: 'Budget Allocation', icon: '💰' },
            { challenge: 'Community neglect', card: 'Community Rally', icon: '📢' },
          ].map((item, i) => (
            <motion.div
              key={item.challenge}
              className="flex items-stretch rounded-xl overflow-hidden border"
              style={{ borderColor: 'rgba(139, 111, 71, 0.15)' }}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 + i * 0.1 }}
            >
              <div
                className="flex-1 p-3"
                style={{ background: 'rgba(139, 111, 71, 0.05)' }}
              >
                <div className="text-xs font-medium uppercase tracking-wider mb-1" style={{ color: '#8B6F47' }}>
                  Real Challenge
                </div>
                <div className="text-sm font-semibold" style={{ color: '#4A3728' }}>
                  {item.icon} {item.challenge}
                </div>
              </div>
              <div className="w-px" style={{ background: 'rgba(139, 111, 71, 0.15)' }} />
              <div
                className="flex-1 p-3"
                style={{ background: 'rgba(199, 91, 57, 0.05)' }}
              >
                <div className="text-xs font-medium uppercase tracking-wider mb-1" style={{ color: '#C75B39' }}>
                  Game Card
                </div>
                <div className="text-sm font-semibold" style={{ color: '#C75B39' }}>
                  🃏 {item.card}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.p
          className="text-center text-sm mt-6 italic"
          style={{ color: '#8B6F47' }}
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.8 }}
        >
          "The game is a sandbox for exploring how cities actually work -- the
          trade-offs, the politics, the collaboration."
        </motion.p>
      </motion.section>

      {/* Continue prompt */}
      <motion.div
        className="text-center pb-8"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.3 }}
      >
        <button
          onClick={onNext}
          className="px-6 py-3 rounded-xl text-sm font-semibold transition-all hover:scale-105"
          style={{ background: '#C75B39', color: '#F5E6D3' }}
        >
          Meet the Roles →
        </button>
      </motion.div>
    </div>
  );
}
