import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ADMINISTRATOR_CARDS, DESIGNER_CARDS, CITIZEN_CARDS, INVESTOR_CARDS, ADVOCATE_CARDS } from '../../../core/content';
import { hasCommonTag } from '../../../core/rules';
import type { ActionCard } from '../../../core/models/types';

const TAG_COLORS: Record<string, string> = {
  funding: '#F4D03F',
  design: '#2E86AB',
  approval: '#C0392B',
  community: '#27AE60',
  construction: '#95A5A6',
  ecological: '#8E44AD',
  assessment: '#3498DB',
  policy: '#1B3A5C',
  commercial: '#E67E22',
  maintenance: '#7BA05B',
  governance: '#8B6F47',
  regulatory: '#C0392B',
  coalition: '#2E86AB',
  communication: '#3498DB',
  negotiation: '#E67E22',
};

const POSITION_LABELS: Record<string, { letter: string; label: string; color: string }> = {
  starter: { letter: 'S', label: 'Starter', color: '#27AE60' },
  middle: { letter: 'M', label: 'Middle', color: '#3498DB' },
  closer: { letter: 'C', label: 'Closer', color: '#C0392B' },
  any: { letter: 'A', label: 'Any', color: '#8B6F47' },
};

const ROLE_COLORS: Record<string, string> = {
  administrator: '#C0392B',
  designer: '#2E86AB',
  citizen: '#27AE60',
  investor: '#E67E22',
  advocate: '#8E44AD',
};

const ROLE_ICONS: Record<string, string> = {
  administrator: '\u{1F3DB}\uFE0F',
  designer: '\u{1F4D0}',
  citizen: '\u{1F3D8}\uFE0F',
  investor: '\u{1F4BC}',
  advocate: '\u{1F33F}',
};

// Pick 6 cards from different roles that have overlapping tags for the puzzle
// Valid series: adm_01 (starter, funding/regulatory/governance) -> des_02 (middle, assessment/design/governance) -> adm_09 (closer, regulatory/maintenance/governance)
// Also: inv_01 (starter, commercial/funding/coalition) -> adv_02 (any, funding/ecological/community) -> cit_15 (closer, community/funding/commercial)
const PUZZLE_CARDS: ActionCard[] = [
  ADMINISTRATOR_CARDS.find(c => c.id === 'adm_01')!, // Budget Allocation - starter - regulatory/funding/governance
  DESIGNER_CARDS.find(c => c.id === 'des_02')!,      // Feasibility Study - middle - assessment/design/governance
  CITIZEN_CARDS.find(c => c.id === 'cit_15')!,        // Cookbook Fundraiser - closer - community/funding/commercial
  INVESTOR_CARDS.find(c => c.id === 'inv_01')!,       // Sponsorship Deal - starter - commercial/funding/coalition
  ADVOCATE_CARDS.find(c => c.id === 'adv_02')!,       // Grant Application - any - funding/ecological/community
  ADMINISTRATOR_CARDS.find(c => c.id === 'adm_09')!,  // Enforcement Action - closer - regulatory/maintenance/governance
];

// Example series for the diagram
const EXAMPLE_VALID: ActionCard[] = [
  ADMINISTRATOR_CARDS.find(c => c.id === 'adm_01')!, // starter - regulatory/funding/governance
  DESIGNER_CARDS.find(c => c.id === 'des_02')!,      // middle - assessment/design/governance
  ADMINISTRATOR_CARDS.find(c => c.id === 'adm_09')!, // closer - regulatory/maintenance/governance
];

interface ChapterProps {
  onNext: () => void;
  onBack: () => void;
}

function findSharedTags(card1: ActionCard, card2: ActionCard): string[] {
  return card1.tags.filter(tag => card2.tags.includes(tag));
}

function CardMini({ card, selected, onClick, disabled }: { card: ActionCard; selected: boolean; onClick: () => void; disabled: boolean }) {
  const roleColor = ROLE_COLORS[card.roleId] || '#8B6F47';
  const pos = POSITION_LABELS[card.seriesPosition];

  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      className="relative rounded-xl p-3 text-left transition-all border-2"
      style={{
        background: selected ? `${roleColor}15` : 'rgba(255,255,255,0.6)',
        borderColor: selected ? roleColor : 'rgba(139, 111, 71, 0.15)',
        opacity: disabled && !selected ? 0.4 : 1,
        cursor: disabled && !selected ? 'not-allowed' : 'pointer',
        minWidth: 140,
      }}
      whileHover={!disabled ? { scale: 1.03 } : {}}
      whileTap={!disabled ? { scale: 0.97 } : {}}
    >
      {/* Position badge */}
      <div
        className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
        style={{ background: pos.color }}
      >
        {pos.letter}
      </div>

      <div className="text-xs font-medium mb-1" style={{ color: roleColor }}>
        {ROLE_ICONS[card.roleId]} {card.roleId.charAt(0).toUpperCase() + card.roleId.slice(1)}
      </div>
      <div className="text-sm font-semibold mb-2" style={{ color: '#4A3728' }}>
        {card.name}
      </div>
      <div className="flex flex-wrap gap-1">
        {card.tags.map(tag => (
          <span
            key={tag}
            className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
            style={{
              background: (TAG_COLORS[tag] || '#8B6F47') + '25',
              color: TAG_COLORS[tag] || '#8B6F47',
            }}
          >
            {tag}
          </span>
        ))}
      </div>
    </motion.button>
  );
}

export default function Chapter6({ onNext, onBack }: ChapterProps) {
  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  const [validationResult, setValidationResult] = useState<{ valid: boolean; errors: string[] } | null>(null);

  const handleCardClick = useCallback((cardId: string) => {
    setValidationResult(null);
    setSelectedCards(prev => {
      if (prev.includes(cardId)) {
        return prev.filter(id => id !== cardId);
      }
      if (prev.length >= 3) return prev;
      return [...prev, cardId];
    });
  }, []);

  const validateSeries = useCallback(() => {
    if (selectedCards.length !== 3) {
      setValidationResult({ valid: false, errors: ['Select exactly 3 cards to form a series.'] });
      return;
    }

    const cards = selectedCards.map(id => PUZZLE_CARDS.find(c => c.id === id)!);
    const errors: string[] = [];

    // Check tag chaining
    for (let i = 0; i < cards.length - 1; i++) {
      if (!hasCommonTag(cards[i], cards[i + 1])) {
        errors.push(`No shared tag between "${cards[i].name}" and "${cards[i + 1].name}".`);
      }
    }

    // Check series positions
    const first = cards[0];
    if (first.seriesPosition !== 'starter' && first.seriesPosition !== 'any') {
      errors.push(`"${first.name}" cannot be the first card (needs Starter or Any position, has ${first.seriesPosition}).`);
    }

    const middle = cards[1];
    if (middle.seriesPosition !== 'middle' && middle.seriesPosition !== 'any') {
      errors.push(`"${middle.name}" cannot be in the middle (needs Middle or Any position, has ${middle.seriesPosition}).`);
    }

    const last = cards[2];
    if (last.seriesPosition !== 'closer' && last.seriesPosition !== 'any') {
      errors.push(`"${last.name}" cannot be the last card (needs Closer or Any position, has ${last.seriesPosition}).`);
    }

    setValidationResult({ valid: errors.length === 0, errors });
  }, [selectedCards]);

  const resetPuzzle = useCallback(() => {
    setSelectedCards([]);
    setValidationResult(null);
  }, []);

  // Find shared tags for the example
  const sharedTag01 = findSharedTags(EXAMPLE_VALID[0], EXAMPLE_VALID[1]);
  const sharedTag12 = findSharedTags(EXAMPLE_VALID[1], EXAMPLE_VALID[2]);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-8 py-8 sm:py-12">
      {/* Section 1: How a Series Works */}
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
          How a Series Works
        </h3>
        <p className="text-center mb-8 text-sm" style={{ color: '#6B5744' }}>
          A series is a chain of 2-4 action cards played in sequence. Consecutive cards must share at least one common tag.
        </p>

        {/* Valid series diagram */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-0">
            {EXAMPLE_VALID.map((card, i) => {
              const pos = POSITION_LABELS[card.seriesPosition];
              const roleColor = ROLE_COLORS[card.roleId];
              const sharedTags = i < EXAMPLE_VALID.length - 1
                ? findSharedTags(card, EXAMPLE_VALID[i + 1])
                : [];

              return (
                <div key={card.id} className="flex flex-col sm:flex-row items-center">
                  <motion.div
                    className="relative rounded-xl p-3 border-2 text-center"
                    style={{
                      borderColor: roleColor,
                      background: `${roleColor}10`,
                      minWidth: 130,
                    }}
                    initial={{ opacity: 0, scale: 0.8 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.2 + i * 0.2 }}
                  >
                    {/* Position badge */}
                    <div
                      className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                      style={{ background: pos.color }}
                      title={pos.label}
                    >
                      {pos.letter}
                    </div>
                    <div className="text-lg mb-1">{ROLE_ICONS[card.roleId]}</div>
                    <div className="text-xs font-semibold" style={{ color: '#4A3728' }}>{card.name}</div>
                    <div className="flex flex-wrap justify-center gap-1 mt-2">
                      {card.tags.map(tag => (
                        <span
                          key={tag}
                          className="text-[9px] px-1 py-0.5 rounded-full font-medium"
                          style={{
                            background: (TAG_COLORS[tag] || '#8B6F47') + '25',
                            color: TAG_COLORS[tag] || '#8B6F47',
                          }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </motion.div>

                  {/* Arrow with shared tag */}
                  {i < EXAMPLE_VALID.length - 1 && (
                    <motion.div
                      className="flex flex-col items-center mx-1 my-2 sm:my-0"
                      initial={{ opacity: 0 }}
                      whileInView={{ opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.5 + i * 0.2 }}
                    >
                      <div className="text-lg sm:block hidden" style={{ color: '#8B6F47' }}>
                        &rarr;
                      </div>
                      <div className="sm:hidden text-lg" style={{ color: '#8B6F47' }}>
                        &darr;
                      </div>
                      <div className="flex flex-wrap gap-0.5 justify-center max-w-[80px]">
                        {sharedTags.map(tag => (
                          <span
                            key={tag}
                            className="text-[9px] px-1 py-0.5 rounded font-bold"
                            style={{
                              background: TAG_COLORS[tag] || '#8B6F47',
                              color: 'white',
                            }}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </div>
              );
            })}
          </div>

          <motion.div
            className="flex items-center gap-2 mt-4 px-3 py-1.5 rounded-lg"
            style={{ background: 'rgba(39, 174, 96, 0.1)' }}
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 1 }}
          >
            <span className="text-lg">&#10003;</span>
            <span className="text-xs font-medium" style={{ color: '#27AE60' }}>
              Valid series: tags chain between consecutive cards, positions are correct (S &rarr; M &rarr; C)
            </span>
          </motion.div>
        </div>

        {/* Series position rules */}
        <motion.div
          className="rounded-xl p-4 mb-6"
          style={{ background: 'rgba(139, 111, 71, 0.06)' }}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
        >
          <div className="text-sm font-semibold mb-3" style={{ color: '#4A3728' }}>Series Position Rules</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Object.entries(POSITION_LABELS).map(([key, val]) => (
              <div key={key} className="flex items-center gap-2">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                  style={{ background: val.color }}
                >
                  {val.letter}
                </div>
                <div>
                  <div className="text-xs font-semibold" style={{ color: '#4A3728' }}>{val.label}</div>
                  <div className="text-[10px]" style={{ color: '#6B5744' }}>
                    {key === 'starter' && 'First card only'}
                    {key === 'middle' && 'Interior positions'}
                    {key === 'closer' && 'Last card only'}
                    {key === 'any' && 'Any position'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Invalid example */}
        <motion.div
          className="rounded-xl p-4 border-2"
          style={{ borderColor: 'rgba(231, 76, 60, 0.3)', background: 'rgba(231, 76, 60, 0.05)' }}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5 }}
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg text-red-500">&#10007;</span>
            <span className="text-sm font-semibold" style={{ color: '#E74C3C' }}>Invalid Series Example</span>
          </div>
          <div className="text-xs mb-2" style={{ color: '#6B5744' }}>
            Card positions must follow the pattern: the first card must be a <strong>Starter</strong> or <strong>Any</strong>,
            middle cards must be <strong>Middle</strong> or <strong>Any</strong>, and the last card must be a <strong>Closer</strong> or <strong>Any</strong>.
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="rounded-lg px-3 py-1.5 text-xs font-medium" style={{ background: '#E74C3C20', color: '#E74C3C' }}>
              Closer in position 1 &rarr; Invalid
            </div>
            <div className="rounded-lg px-3 py-1.5 text-xs font-medium" style={{ background: '#E74C3C20', color: '#E74C3C' }}>
              No shared tag between cards 2 and 3 &rarr; Chain broken
            </div>
          </div>
        </motion.div>
      </motion.section>

      {/* Section 2: How a Combination Works */}
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
          How a Combination Works
        </h3>
        <p className="text-center mb-8 text-sm" style={{ color: '#6B5744' }}>
          Multiple players pool resource tokens together to overcome a challenge collectively.
        </p>

        {/* Animated combination diagram */}
        <div className="flex justify-center mb-6">
          <svg width="320" height="240" viewBox="0 0 320 240" className="overflow-visible">
            {/* Player icons */}
            {[
              { x: 50, y: 50, icon: '\u{1F3DB}\uFE0F', color: '#C0392B', label: 'Admin' },
              { x: 270, y: 50, icon: '\u{1F33F}', color: '#8E44AD', label: 'Advocate' },
              { x: 160, y: 30, icon: '\u{1F3D8}\uFE0F', color: '#27AE60', label: 'Citizen' },
            ].map((player, i) => (
              <g key={player.label}>
                <motion.circle
                  cx={player.x}
                  cy={player.y}
                  r={24}
                  fill={player.color}
                  opacity={0.15}
                  initial={{ scale: 0 }}
                  whileInView={{ scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.1 + i * 0.15 }}
                />
                <motion.circle
                  cx={player.x}
                  cy={player.y}
                  r={24}
                  fill="none"
                  stroke={player.color}
                  strokeWidth={2}
                  initial={{ scale: 0 }}
                  whileInView={{ scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.1 + i * 0.15 }}
                />
                <motion.text
                  x={player.x}
                  y={player.y + 2}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={18}
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2 + i * 0.15 }}
                >
                  {player.icon}
                </motion.text>
                <motion.text
                  x={player.x}
                  y={player.y + 42}
                  textAnchor="middle"
                  fontSize={9}
                  fill={player.color}
                  fontWeight={600}
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.3 + i * 0.15 }}
                >
                  {player.label}
                </motion.text>
              </g>
            ))}

            {/* Resource tokens flowing to center */}
            {[
              { from: { x: 50, y: 75 }, color: '#F4D03F', delay: 0.6 },
              { from: { x: 50, y: 75 }, color: '#3498DB', delay: 0.7 },
              { from: { x: 270, y: 75 }, color: '#27AE60', delay: 0.8 },
              { from: { x: 270, y: 75 }, color: '#8E44AD', delay: 0.9 },
              { from: { x: 160, y: 55 }, color: '#F4D03F', delay: 1.0 },
              { from: { x: 160, y: 55 }, color: '#95A5A6', delay: 1.1 },
            ].map((token, i) => (
              <motion.circle
                key={i}
                r={5}
                fill={token.color}
                initial={{ cx: token.from.x + (i % 2 === 0 ? -8 : 8), cy: token.from.y, opacity: 0 }}
                whileInView={{
                  cx: 160,
                  cy: 160,
                  opacity: [0, 1, 1, 0.8],
                }}
                viewport={{ once: true }}
                transition={{ delay: token.delay, duration: 0.8, ease: 'easeInOut' }}
              />
            ))}

            {/* Central pool */}
            <motion.circle
              cx={160}
              cy={160}
              r={35}
              fill="rgba(244, 208, 63, 0.15)"
              stroke="#F4D03F"
              strokeWidth={2}
              initial={{ scale: 0 }}
              whileInView={{ scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 1.3, type: 'spring' }}
            />
            <motion.text
              x={160}
              y={157}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={14}
              fill="#4A3728"
              fontWeight={700}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 1.5 }}
            >
              6 tokens
            </motion.text>
            <motion.text
              x={160}
              y={172}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={10}
              fill="#8B6F47"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 1.5 }}
            >
              Pool
            </motion.text>

            {/* Multiplier badge */}
            <motion.g
              initial={{ scale: 0, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 2, type: 'spring', stiffness: 300 }}
            >
              <rect x={215} y={140} width={90} height={40} rx={10} fill="#C75B39" />
              <text x={260} y={155} textAnchor="middle" dominantBaseline="middle" fill="white" fontSize={11} fontWeight={700}>
                3+ players
              </text>
              <text x={260} y={170} textAnchor="middle" dominantBaseline="middle" fill="rgba(255,255,255,0.9)" fontSize={10}>
                Total x 1.5
              </text>
            </motion.g>

            {/* Result */}
            <motion.g
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 2.3 }}
            >
              <text x={160} y={220} textAnchor="middle" fontSize={13} fill="#4A3728" fontWeight={700}>
                = 9 total value (ceil)
              </text>
            </motion.g>
          </svg>
        </div>

        <motion.div
          className="rounded-xl p-4 text-center"
          style={{ background: 'rgba(199, 91, 57, 0.08)' }}
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
        >
          <p className="text-sm" style={{ color: '#6B5744' }}>
            <strong style={{ color: '#C75B39' }}>Cooperation multiplier:</strong> When 3 or more unique players
            contribute tokens, the total value is multiplied by 1.5 (rounded up).
            This rewards broad collaboration over individual hoarding.
          </p>
        </motion.div>
      </motion.section>

      {/* Section 3: Card Matching Mini-Puzzle */}
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
          Build a Series
        </h3>
        <p className="text-center mb-6 text-sm" style={{ color: '#6B5744' }}>
          Select 3 cards in order to form a valid series. Cards must chain by shared tags,
          and positions must be correct (Starter/Any first, Middle/Any in the middle, Closer/Any last).
        </p>

        {/* Selected slots */}
        <div className="flex justify-center gap-3 mb-6">
          {[0, 1, 2].map((slotIdx) => {
            const cardId = selectedCards[slotIdx];
            const card = cardId ? PUZZLE_CARDS.find(c => c.id === cardId) : null;
            const posLabel = slotIdx === 0 ? 'Starter' : slotIdx === 1 ? 'Middle' : 'Closer';
            const hasError = validationResult && !validationResult.valid;

            // Check if this specific slot has a tag chain error
            let slotValid = true;
            if (validationResult && !validationResult.valid && card) {
              if (slotIdx > 0 && selectedCards[slotIdx - 1]) {
                const prevCard = PUZZLE_CARDS.find(c => c.id === selectedCards[slotIdx - 1])!;
                if (!hasCommonTag(prevCard, card)) slotValid = false;
              }
            }

            return (
              <motion.div
                key={slotIdx}
                className="rounded-xl border-2 border-dashed p-3 text-center"
                style={{
                  borderColor: card
                    ? validationResult
                      ? validationResult.valid ? '#27AE60' : (slotValid ? 'rgba(139,111,71,0.3)' : '#E74C3C')
                      : ROLE_COLORS[card.roleId]
                    : 'rgba(139, 111, 71, 0.25)',
                  background: card ? `${ROLE_COLORS[card.roleId]}08` : 'rgba(255,255,255,0.3)',
                  minWidth: 100,
                  minHeight: 80,
                }}
                layout
              >
                {card ? (
                  <>
                    <div className="text-xs font-medium" style={{ color: ROLE_COLORS[card.roleId] }}>
                      {ROLE_ICONS[card.roleId]}
                    </div>
                    <div className="text-xs font-semibold mt-1" style={{ color: '#4A3728' }}>
                      {card.name}
                    </div>
                    <div className="flex flex-wrap justify-center gap-0.5 mt-1">
                      {card.tags.map(tag => (
                        <span
                          key={tag}
                          className="text-[8px] px-1 rounded-full"
                          style={{
                            background: (TAG_COLORS[tag] || '#8B6F47') + '25',
                            color: TAG_COLORS[tag] || '#8B6F47',
                          }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="text-xs font-medium pt-4" style={{ color: '#8B6F47' }}>
                    {posLabel}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Shared tags between selected cards */}
        {selectedCards.length >= 2 && !validationResult && (
          <div className="flex justify-center gap-8 mb-4">
            {selectedCards.slice(0, -1).map((cardId, i) => {
              const nextId = selectedCards[i + 1];
              if (!nextId) return null;
              const card = PUZZLE_CARDS.find(c => c.id === cardId)!;
              const nextCard = PUZZLE_CARDS.find(c => c.id === nextId)!;
              const shared = findSharedTags(card, nextCard);
              return (
                <div key={i} className="text-center">
                  <div className="text-[10px] font-medium mb-1" style={{ color: '#8B6F47' }}>
                    Link {i + 1} &rarr; {i + 2}
                  </div>
                  {shared.length > 0 ? (
                    <div className="flex gap-1 justify-center">
                      {shared.map(tag => (
                        <span
                          key={tag}
                          className="text-[9px] px-1.5 py-0.5 rounded-full font-bold text-white"
                          style={{ background: TAG_COLORS[tag] || '#8B6F47' }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-[10px] font-medium" style={{ color: '#E74C3C' }}>No shared tags</span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Card pool */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
          {PUZZLE_CARDS.map((card) => (
            <CardMini
              key={card.id}
              card={card}
              selected={selectedCards.includes(card.id)}
              onClick={() => handleCardClick(card.id)}
              disabled={selectedCards.length >= 3 && !selectedCards.includes(card.id)}
            />
          ))}
        </div>

        {/* Action buttons */}
        <div className="flex justify-center gap-3 mb-4">
          <button
            onClick={validateSeries}
            disabled={selectedCards.length !== 3}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:scale-105 disabled:opacity-40 disabled:hover:scale-100"
            style={{ background: '#C75B39', color: '#F5E6D3' }}
          >
            Check Series
          </button>
          <button
            onClick={resetPuzzle}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:scale-105 border"
            style={{ color: '#4A3728', borderColor: 'rgba(139,111,71,0.3)' }}
          >
            Try Again
          </button>
        </div>

        {/* Validation result */}
        <AnimatePresence>
          {validationResult && (
            <motion.div
              className="rounded-xl p-4 text-center"
              style={{
                background: validationResult.valid ? 'rgba(39, 174, 96, 0.1)' : 'rgba(231, 76, 60, 0.1)',
                borderColor: validationResult.valid ? '#27AE60' : '#E74C3C',
                border: '1px solid',
              }}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              {validationResult.valid ? (
                <div>
                  <div className="text-lg mb-1">&#10003;</div>
                  <div className="text-sm font-semibold" style={{ color: '#27AE60' }}>
                    Valid series! Tags chain correctly and positions are in order.
                  </div>
                </div>
              ) : (
                <div>
                  <div className="text-lg mb-1">&#10007;</div>
                  {validationResult.errors.map((err, i) => (
                    <div key={i} className="text-sm" style={{ color: '#E74C3C' }}>
                      {err}
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
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
          &larr; How a Season Works
        </button>
        <button
          onClick={onNext}
          className="px-6 py-3 rounded-xl text-sm font-semibold transition-all hover:scale-105"
          style={{ background: '#C75B39', color: '#F5E6D3' }}
        >
          Winning &amp; Losing &rarr;
        </button>
      </motion.div>
    </div>
  );
}
